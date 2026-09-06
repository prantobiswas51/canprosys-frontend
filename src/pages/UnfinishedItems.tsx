import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getApiErrorMessage } from '../utils/apiError';
import { formatQty } from '../utils/formatNumber';

const API_URL = import.meta.env.VITE_API_URL;

interface RecipeTaskRate {
  id: number;
  taskId: number;
  taskName: string;
  sequence?: number | null;
}

interface RecipeOption {
  id: number;
  product: string;
  sku: string;
  taskRates: RecipeTaskRate[];
}

// Current WIP sitting after each stage of a recipe's pipeline -- written by
// DailyEntryService as entries are logged/reversed (see recipe-stage-stock
// entity on the backend). Zero-quantity rows are kept, not deleted, so "this
// stage exists but currently has nothing sitting in it" is still visible.
interface StageStock {
  id: number;
  recipeId: number;
  taskId: number;
  taskName: string;
  quantity: number;
}

const cardClass =
  'bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]';

const inputClass =
  'w-full bg-white border border-[#e8e8e8] text-[#1E1E1E] px-[0.85rem] py-[0.65rem] rounded-lg text-[0.875rem] font-medium transition-all duration-200 outline-none focus:border-[#e21e53] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] disabled:opacity-60 disabled:cursor-not-allowed';

export default function UnfinishedItems() {
  const [recipes, setRecipes] = useState<RecipeOption[]>([]);
  const [stageStocks, setStageStocks] = useState<StageStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [filterRecipeId, setFilterRecipeId] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [recipesRes, stageStockRes] = await Promise.all([
        axios.get<RecipeOption[]>(`${API_URL}/recipes`),
        axios.get<StageStock[]>(`${API_URL}/recipes/stage-stock`),
      ]);
      setRecipes(recipesRes.data);
      setStageStocks(stageStockRes.data);
    } catch (err) {
      setLoadError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to load unfinished items', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Only recipes that actually have some stage stock recorded -- a recipe
  // that's never had a Daily Entry logged against it has nothing to show
  // here yet.
  const recipesWithStock = recipes.filter((recipe) =>
    stageStocks.some((s) => s.recipeId === recipe.id),
  );

  const visibleRecipes = filterRecipeId
    ? recipesWithStock.filter((r) => String(r.id) === filterRecipeId)
    : recipesWithStock;

  return (
    <div>
      <div className="pb-4">
        <h2 className="text-[1.4rem] font-extrabold text-[#1E1E1E] mb-2">Unfinished Items</h2>
        <p className="text-[0.9rem] text-[#545454]">
          Work-in-progress sitting at each stage of a recipe's pipeline, right now.
        </p>
      </div>

      {loadError && <p className="mb-4 text-[0.8rem] font-semibold text-[#ef4444]">{loadError}</p>}

      {!loading && !loadError && recipesWithStock.length > 0 && (
        <div className={`${cardClass} mb-4 flex flex-wrap gap-3 items-end`}>
          <div className="flex flex-col gap-[0.4rem] w-full sm:w-[260px]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Filter by Recipe</label>
            <select
              value={filterRecipeId}
              onChange={(e) => setFilterRecipeId(e.target.value)}
              className={inputClass}
            >
              <option value="">All recipes</option>
              {recipesWithStock.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.product} ({r.sku})
                </option>
              ))}
            </select>
          </div>
          {filterRecipeId && (
            <button
              type="button"
              onClick={() => setFilterRecipeId('')}
              className="h-10 px-4 rounded-lg border border-[#e8e8e8] text-[#545454] font-bold text-[0.8rem] hover:bg-[#f8fafc] hover:text-[#1E1E1E] transition-colors duration-200 cursor-pointer"
            >
              Clear Filter
            </button>
          )}
        </div>
      )}

      {loading && <p className="text-[0.8rem] font-semibold text-[#545454]">Loading...</p>}

      {!loading && !loadError && recipesWithStock.length === 0 && (
        <p className="text-[0.8rem] font-semibold text-[#545454]">
          No work-in-progress yet -- it shows up here once Daily Entries are logged against a recipe's stages.
        </p>
      )}

      {!loading && !loadError && recipesWithStock.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
          {visibleRecipes.map((recipe) => {
            const rows = stageStocks.filter((s) => s.recipeId === recipe.id);
            const sequenceByTaskId = new Map(recipe.taskRates.map((tr) => [tr.taskId, tr.sequence ?? Infinity]));
            const sorted = [...rows].sort(
              (a, b) => (sequenceByTaskId.get(a.taskId) ?? Infinity) - (sequenceByTaskId.get(b.taskId) ?? Infinity),
            );
            return (
              <div key={recipe.id} className={cardClass}>
                <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3 mb-3">
                  <h3 className="text-[1.15rem] font-bold text-[#e21e53]">{recipe.product}</h3>
                  <span className="rounded-full bg-[rgba(59,130,246,0.1)] text-[#3b82f6] text-[0.7rem] font-bold px-3 py-1">
                    SKU: {recipe.sku}
                  </span>
                </div>
                <div className="flex flex-col gap-[0.5rem]">
                  {sorted.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-[0.9rem]">
                      <span className="text-[#545454]">{s.taskName}</span>
                      <span className="font-bold text-[#1E1E1E]">{formatQty(s.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
