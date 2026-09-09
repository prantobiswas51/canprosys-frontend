import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getApiErrorMessage } from '../utils/apiError';
import { formatQty } from '../utils/formatNumber';

const API_URL = import.meta.env.VITE_API_URL;

// TEMPORARY page -- see the backend's StockBackfillService for why this
// exists. Delete this file (and its route/sidebar entry) once every
// recipe's real starting stock has been entered.

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

interface StageStock {
  id: number;
  recipeId: number;
  taskId: number;
  taskName: string;
  quantity: number;
}

interface ProductOption {
  id: number;
  name: string;
  sku: string;
  stock: number;
}

// Sentinel used in the Stage dropdown for "this recipe's finished goods
// count (Product.stock)" rather than one of its in-progress task stages.
const FINISHED_STAGE_VALUE = 'finished';

const inputClass =
  'w-full bg-white border border-[#e8e8e8] text-[#1E1E1E] px-[0.85rem] py-[0.65rem] rounded-lg text-[0.875rem] font-medium transition-all duration-200 outline-none focus:border-[#e21e53] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] disabled:opacity-60 disabled:cursor-not-allowed';

const cardClass =
  'bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]';

const primaryBtnClass =
  'h-10 px-4 flex items-center gap-2 rounded-lg bg-[#e21e53] text-white font-bold text-[0.875rem] transition-all duration-200 hover:bg-[#c01745] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer';

function sortBySequence(rows: RecipeTaskRate[]) {
  return [...rows].sort((a, b) => (a.sequence ?? Infinity) - (b.sequence ?? Infinity));
}

export default function StockBackfill() {
  const [recipes, setRecipes] = useState<RecipeOption[]>([]);
  const [stageStocks, setStageStocks] = useState<StageStock[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [recipeId, setRecipeId] = useState('');
  const [stage, setStage] = useState(''); // taskId as string, or FINISHED_STAGE_VALUE
  const [quantity, setQuantity] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [recipesRes, stageStockRes, productsRes] = await Promise.all([
        axios.get<RecipeOption[]>(`${API_URL}/recipes`),
        axios.get<StageStock[]>(`${API_URL}/recipes/stage-stock`),
        axios.get<ProductOption[]>(`${API_URL}/products`),
      ]);
      setRecipes(recipesRes.data);
      setStageStocks(stageStockRes.data);
      setProducts(productsRes.data);
    } catch (err) {
      setLoadError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to load recipes/stock', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const selectedRecipe = recipes.find((r) => String(r.id) === recipeId);

  const handleRecipeChange = (value: string) => {
    setRecipeId(value);
    setStage('');
    setQuantity('');
    setFormError(null);
    setSuccess(null);
  };

  // Whatever's currently recorded for the picked recipe + stage, so the
  // person doing the backfill has a reference point instead of guessing.
  const currentValue = (() => {
    if (!selectedRecipe || !stage) return null;
    if (stage === FINISHED_STAGE_VALUE) {
      const product = products.find((p) => p.sku === selectedRecipe.sku);
      return product?.stock ?? 0;
    }
    const row = stageStocks.find(
      (s) => s.recipeId === selectedRecipe.id && String(s.taskId) === stage,
    );
    return row?.quantity ?? 0;
  })();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);

    if (!selectedRecipe) {
      setFormError('Select a recipe.');
      return;
    }
    if (!stage) {
      setFormError('Select a stage.');
      return;
    }
    const quantityNum = Number(quantity);
    if (quantity.trim() === '' || Number.isNaN(quantityNum) || quantityNum <= 0) {
      setFormError('Enter a quantity greater than zero.');
      return;
    }

    setSubmitting(true);
    try {
      if (stage === FINISHED_STAGE_VALUE) {
        await axios.put(`${API_URL}/stock-backfill/recipes/${selectedRecipe.id}/finished-stock`, {
          quantity: quantityNum,
        });
      } else {
        await axios.put(
          `${API_URL}/stock-backfill/recipes/${selectedRecipe.id}/stage-stock/${stage}`,
          { quantity: quantityNum },
        );
      }
      const stageLabel =
        stage === FINISHED_STAGE_VALUE
          ? 'Finished Goods'
          : selectedRecipe.taskRates.find((tr) => String(tr.taskId) === stage)?.taskName ?? 'that stage';
      const newTotal = (currentValue ?? 0) + quantityNum;
      setSuccess(
        `${selectedRecipe.product} -- ${stageLabel}: +${formatQty(quantityNum)} added, new total ${formatQty(newTotal)}.`,
      );
      setQuantity('');
      loadAll();
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to backfill stock', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="pb-4">
        <h2 className="text-[1.4rem] font-extrabold text-[#1E1E1E] mb-2">Stock Backfill</h2>
        <p className="text-[0.9rem] text-[#545454]">
          Temporary tool for entering stock that already exists mid-production -- pick a recipe and a stage (or
          Finished Goods), then add however much is physically sitting there that isn't recorded yet. This only
          adds to whatever's already on record (no artisan, no payout, no consuming from a previous stage, and it
          never overwrites or deducts anything) -- it isn't for logging new work, that's what Daily Entry is for.
        </p>
      </div>

      {loadError && <p className="mb-3 text-[0.8rem] font-semibold text-[#ef4444]">{loadError}</p>}

      <div className={cardClass}>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 md:items-end">
          <div className="flex flex-col gap-[0.4rem] flex-1 min-w-[220px]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Recipe</label>
            <select
              value={recipeId}
              onChange={(e) => handleRecipeChange(e.target.value)}
              required
              disabled={loading || submitting}
              className={inputClass}
            >
              <option value="" disabled>
                Select a recipe...
              </option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.product} ({r.sku})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-[0.4rem] flex-1 min-w-[220px]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Stage</label>
            <select
              value={stage}
              onChange={(e) => {
                setStage(e.target.value);
                setFormError(null);
                setSuccess(null);
              }}
              required
              disabled={!selectedRecipe || submitting}
              className={inputClass}
            >
              <option value="" disabled>
                {selectedRecipe ? 'Select a stage...' : 'Pick a recipe first'}
              </option>
              {selectedRecipe &&
                sortBySequence(selectedRecipe.taskRates).map((tr) => (
                  <option key={tr.taskId} value={tr.taskId}>
                    {tr.taskName}
                  </option>
                ))}
              {selectedRecipe && <option value={FINISHED_STAGE_VALUE}>Finished Goods</option>}
            </select>
          </div>

          <div className="flex flex-col gap-[0.4rem] w-full sm:w-[160px]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">
              Quantity to Add{currentValue != null && ` (current: ${formatQty(currentValue)})`}
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 24"
              required
              disabled={!stage || submitting}
              className={inputClass}
            />
          </div>

          <button type="submit" disabled={submitting || loading || !stage} className={primaryBtnClass}>
            <i className={`fa-solid ${submitting ? 'fa-spinner fa-spin' : 'fa-save'}`} />
            {submitting ? 'Saving...' : 'Add to Stock'}
          </button>
        </form>

        {formError && <p className="mt-3 text-[0.8rem] font-semibold text-[#ef4444]">{formError}</p>}
        {success && <p className="mt-3 text-[0.8rem] font-semibold text-[#10b981]">{success}</p>}
      </div>
    </div>
  );
}
