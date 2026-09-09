import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getApiErrorMessage } from '../utils/apiError';
import { formatQty } from '../utils/formatNumber';

const API_URL = import.meta.env.VITE_API_URL;

interface RawMaterialOption {
  id: number;
  name: string;
  unit: string;
}

interface StockRow {
  rawMaterialId: number;
  quantityRemaining: number;
}

// A saved "combine A and B at this ratio into this output" config -- once
// created, buying more of either input automatically runs an auto-mix at
// this ratio (see the backend's MaterialBatchesService.createBatch).
interface MixRecipeRecord {
  id: number;
  materialAId: number;
  materialAName: string;
  materialAUnit?: string;
  ratioA: number;
  materialBId: number;
  materialBName: string;
  materialBUnit?: string;
  ratioB: number;
  outputMaterialId: number;
  outputMaterialName: string;
  outputUnit?: string;
  active: boolean;
}

interface MixRecord {
  id: number;
  materialAName: string;
  materialAUnit?: string;
  quantityA: number;
  materialBName: string;
  materialBUnit?: string;
  quantityB: number;
  outputMaterialName: string;
  outputUnit?: string;
  outputQuantity: number;
  mixDate?: string;
  createdAt: string;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

type MixMode = 'auto' | 'manual';

// Auto mode: pick materials + a ratio, and it uses however much of A and B
// is currently in stock (see AutoMixFormState). Manual mode: type the exact
// quantities yourself, same as before.
interface AutoMixFormState {
  materialAId: string;
  materialBId: string;
  outputMaterialId: string;
  ratioA: string;
  ratioB: string;
  mixDate: string;
}

interface ManualMixFormState {
  materialAId: string;
  quantityA: string;
  materialBId: string;
  quantityB: string;
  outputMaterialId: string;
  mixDate: string;
}

const emptyAutoForm: AutoMixFormState = {
  materialAId: '',
  materialBId: '',
  outputMaterialId: '',
  ratioA: '',
  ratioB: '',
  mixDate: today(),
};

const emptyManualForm: ManualMixFormState = {
  materialAId: '',
  quantityA: '',
  materialBId: '',
  quantityB: '',
  outputMaterialId: '',
  mixDate: today(),
};

interface RecipeFormState {
  materialAId: string;
  ratioA: string;
  materialBId: string;
  ratioB: string;
  outputMaterialId: string;
}

const emptyRecipeForm: RecipeFormState = {
  materialAId: '',
  ratioA: '',
  materialBId: '',
  ratioB: '',
  outputMaterialId: '',
};

const inputClass =
  'w-full bg-white border border-[#e8e8e8] text-[#1E1E1E] px-[0.85rem] py-[0.65rem] rounded-lg text-[0.875rem] font-medium transition-all duration-200 outline-none focus:border-[#e21e53] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] disabled:opacity-60 disabled:cursor-not-allowed';

const cardClass =
  'bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]';

const primaryBtnClass =
  'h-10 px-4 flex items-center gap-2 rounded-lg bg-[#e21e53] text-white font-bold text-[0.875rem] transition-all duration-200 hover:bg-[#c01745] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer';

export default function MaterialMixing() {
  const [rawMaterials, setRawMaterials] = useState<RawMaterialOption[]>([]);
  const [stockRows, setStockRows] = useState<StockRow[]>([]);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [mixes, setMixes] = useState<MixRecord[]>([]);
  const [loadingMixes, setLoadingMixes] = useState(false);
  const [mixesError, setMixesError] = useState<string | null>(null);

  const [mixRecipes, setMixRecipes] = useState<MixRecipeRecord[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [recipesError, setRecipesError] = useState<string | null>(null);
  const [recipeForm, setRecipeForm] = useState<RecipeFormState>(emptyRecipeForm);
  const [addingRecipe, setAddingRecipe] = useState(false);
  const [addRecipeError, setAddRecipeError] = useState<string | null>(null);
  const [togglingRecipeId, setTogglingRecipeId] = useState<number | null>(null);
  const [deletingRecipeId, setDeletingRecipeId] = useState<number | null>(null);
  const [runningRecipeId, setRunningRecipeId] = useState<number | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const [mode, setMode] = useState<MixMode>('auto');
  const [autoForm, setAutoForm] = useState<AutoMixFormState>(emptyAutoForm);
  const [manualForm, setManualForm] = useState<ManualMixFormState>(emptyManualForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchOptions = useCallback(async () => {
    setLoadingOptions(true);
    setOptionsError(null);
    try {
      const [materialsRes, stockRes] = await Promise.all([
        axios.get<RawMaterialOption[]>(`${API_URL}/raw-materials`),
        axios.get<StockRow[]>(`${API_URL}/material-batches/stock-summary`),
      ]);
      setRawMaterials(materialsRes.data);
      setStockRows(stockRes.data);
    } catch (err) {
      setOptionsError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to load raw materials/stock', err);
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  const fetchMixes = useCallback(async () => {
    setLoadingMixes(true);
    setMixesError(null);
    try {
      const res = await axios.get<MixRecord[]>(`${API_URL}/material-mixes`);
      setMixes(res.data);
    } catch (err) {
      setMixesError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to load material mixes', err);
    } finally {
      setLoadingMixes(false);
    }
  }, []);

  const fetchMixRecipes = useCallback(async () => {
    setLoadingRecipes(true);
    setRecipesError(null);
    try {
      const res = await axios.get<MixRecipeRecord[]>(`${API_URL}/mix-recipes`);
      setMixRecipes(res.data);
    } catch (err) {
      setRecipesError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to load mix recipes', err);
    } finally {
      setLoadingRecipes(false);
    }
  }, []);

  useEffect(() => {
    fetchOptions();
    fetchMixes();
    fetchMixRecipes();
  }, [fetchOptions, fetchMixes, fetchMixRecipes]);

  const stockOf = (rawMaterialId: number | undefined) =>
    rawMaterialId != null ? stockRows.find((s) => s.rawMaterialId === rawMaterialId)?.quantityRemaining ?? 0 : 0;

  const switchMode = (next: MixMode) => {
    setMode(next);
    setFormError(null);
    setSuccess(null);
  };

  /* ───────────── Mix Recipes (saved ratio, auto-runs on purchase) ───────────── */

  const handleRecipeFormChange = (field: keyof RecipeFormState, value: string) => {
    setRecipeForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddRecipe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddRecipeError(null);

    const ratioA = Number(recipeForm.ratioA);
    const ratioB = Number(recipeForm.ratioB);

    if (!recipeForm.materialAId || !recipeForm.materialBId || !recipeForm.outputMaterialId) {
      setAddRecipeError('Select both input materials and the output material.');
      return;
    }
    if (recipeForm.materialAId === recipeForm.materialBId) {
      setAddRecipeError('Pick two different materials to mix.');
      return;
    }
    if (recipeForm.outputMaterialId === recipeForm.materialAId || recipeForm.outputMaterialId === recipeForm.materialBId) {
      setAddRecipeError('The output material must be different from the two inputs.');
      return;
    }
    if (!ratioA || ratioA <= 0 || !ratioB || ratioB <= 0) {
      setAddRecipeError('Enter both ratio parts, greater than zero.');
      return;
    }

    setAddingRecipe(true);
    try {
      await axios.post(`${API_URL}/mix-recipes`, {
        materialAId: Number(recipeForm.materialAId),
        ratioA,
        materialBId: Number(recipeForm.materialBId),
        ratioB,
        outputMaterialId: Number(recipeForm.outputMaterialId),
      });
      setRecipeForm(emptyRecipeForm);
      fetchMixRecipes();
    } catch (err) {
      setAddRecipeError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to create mix recipe', err);
    } finally {
      setAddingRecipe(false);
    }
  };

  const handleToggleRecipeActive = async (recipe: MixRecipeRecord) => {
    setTogglingRecipeId(recipe.id);
    try {
      await axios.patch(`${API_URL}/mix-recipes/${recipe.id}`, { active: !recipe.active });
      fetchMixRecipes();
    } catch (err) {
      window.alert(getApiErrorMessage(err, 'Failed to update mix recipe. Check the console.'));
      console.error('Failed to toggle mix recipe', err);
    } finally {
      setTogglingRecipeId(null);
    }
  };

  const handleDeleteRecipe = async (recipe: MixRecipeRecord) => {
    if (
      !window.confirm(
        `Delete the ${recipe.materialAName} + ${recipe.materialBName} -> ${recipe.outputMaterialName} mix recipe? This only removes the saved config -- it doesn't undo any mixes it already ran.`,
      )
    ) {
      return;
    }
    setDeletingRecipeId(recipe.id);
    try {
      await axios.delete(`${API_URL}/mix-recipes/${recipe.id}`);
      fetchMixRecipes();
    } catch (err) {
      window.alert(getApiErrorMessage(err, 'Failed to delete mix recipe. Check the console.'));
      console.error('Failed to delete mix recipe', err);
    } finally {
      setDeletingRecipeId(null);
    }
  };

  // Runs the recipe's ratio against whatever's in stock right now, without
  // needing to record a new purchase first -- useful for stock that was
  // already there before the recipe was saved.
  const handleRunRecipeNow = async (recipe: MixRecipeRecord) => {
    setRunError(null);
    setRunningRecipeId(recipe.id);
    try {
      await axios.post(`${API_URL}/material-mixes/auto`, {
        materialAId: recipe.materialAId,
        materialBId: recipe.materialBId,
        outputMaterialId: recipe.outputMaterialId,
        ratioA: recipe.ratioA,
        ratioB: recipe.ratioB,
        mixDate: today(),
      });
      fetchOptions();
      fetchMixes();
    } catch (err) {
      setRunError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to run mix recipe', err);
    } finally {
      setRunningRecipeId(null);
    }
  };

  /* ───────────── Auto (ratio) mode ───────────── */

  const handleAutoChange = (field: keyof AutoMixFormState, value: string) => {
    setAutoForm((prev) => ({ ...prev, [field]: value }));
  };

  const autoMaterialA = rawMaterials.find((m) => String(m.id) === autoForm.materialAId);
  const autoMaterialB = rawMaterials.find((m) => String(m.id) === autoForm.materialBId);
  const autoOutputMaterial = rawMaterials.find((m) => String(m.id) === autoForm.outputMaterialId);
  const availableA = stockOf(autoMaterialA?.id);
  const availableB = stockOf(autoMaterialB?.id);
  const ratioANum = Number(autoForm.ratioA) || 0;
  const ratioBNum = Number(autoForm.ratioB) || 0;

  // Live preview of what "use everything the ratio allows" actually means
  // right now -- same math the backend does inside the transaction (it
  // recomputes there too, since stock can move between this preview and
  // submit; this is just so the person isn't guessing beforehand).
  let previewQuantityA = 0;
  let previewQuantityB = 0;
  if (ratioANum > 0 && ratioBNum > 0 && autoMaterialA && autoMaterialB) {
    const unitsFromA = availableA / ratioANum;
    const unitsFromB = availableB / ratioBNum;
    const limitingUnits = Math.min(unitsFromA, unitsFromB);
    if (limitingUnits > 0) {
      previewQuantityA = limitingUnits * ratioANum;
      previewQuantityB = limitingUnits * ratioBNum;
    }
  }
  const previewOutput = previewQuantityA + previewQuantityB;
  const previewLeftoverA = availableA - previewQuantityA;
  const previewLeftoverB = availableB - previewQuantityB;

  const handleAutoSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);

    if (!autoForm.materialAId || !autoForm.materialBId || !autoForm.outputMaterialId) {
      setFormError('Select both input materials and the output material.');
      return;
    }
    if (autoForm.materialAId === autoForm.materialBId) {
      setFormError('Pick two different materials to mix.');
      return;
    }
    if (autoForm.outputMaterialId === autoForm.materialAId || autoForm.outputMaterialId === autoForm.materialBId) {
      setFormError('The output material must be different from the two inputs.');
      return;
    }
    if (ratioANum <= 0 || ratioBNum <= 0) {
      setFormError('Enter both ratio parts, greater than zero.');
      return;
    }
    if (previewOutput <= 0) {
      setFormError(
        `Not enough stock to mix at a ${autoForm.ratioA}:${autoForm.ratioB} ratio -- ${autoMaterialA?.name ?? 'Material A'} has ${formatQty(availableA)}, ${autoMaterialB?.name ?? 'Material B'} has ${formatQty(availableB)} available.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/material-mixes/auto`, {
        materialAId: Number(autoForm.materialAId),
        materialBId: Number(autoForm.materialBId),
        outputMaterialId: Number(autoForm.outputMaterialId),
        ratioA: ratioANum,
        ratioB: ratioBNum,
        mixDate: autoForm.mixDate,
      });
      setSuccess(
        `Mixed ${formatQty(previewQuantityA)} ${autoMaterialA?.unit ?? ''} ${autoMaterialA?.name} + ${formatQty(previewQuantityB)} ${autoMaterialB?.unit ?? ''} ${autoMaterialB?.name} into ${formatQty(previewOutput)} ${autoOutputMaterial?.unit ?? ''} ${autoOutputMaterial?.name}.`,
      );
      setAutoForm({ ...emptyAutoForm, mixDate: autoForm.mixDate });
      fetchOptions();
      fetchMixes();
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to record auto mix', err);
    } finally {
      setSubmitting(false);
    }
  };

  /* ───────────── Manual (exact quantities) mode ───────────── */

  const handleManualChange = (field: keyof ManualMixFormState, value: string) => {
    setManualForm((prev) => ({ ...prev, [field]: value }));
  };

  const manualMaterialA = rawMaterials.find((m) => String(m.id) === manualForm.materialAId);
  const manualMaterialB = rawMaterials.find((m) => String(m.id) === manualForm.materialBId);
  const manualOutputMaterial = rawMaterials.find((m) => String(m.id) === manualForm.outputMaterialId);
  const manualQuantityA = Number(manualForm.quantityA) || 0;
  const manualQuantityB = Number(manualForm.quantityB) || 0;
  const manualCombined = manualQuantityA + manualQuantityB;

  const handleManualSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);

    if (!manualForm.materialAId || !manualForm.materialBId || !manualForm.outputMaterialId) {
      setFormError('Select both input materials and the output material.');
      return;
    }
    if (manualForm.materialAId === manualForm.materialBId) {
      setFormError('Pick two different materials to mix.');
      return;
    }
    if (manualForm.outputMaterialId === manualForm.materialAId || manualForm.outputMaterialId === manualForm.materialBId) {
      setFormError('The output material must be different from the two inputs.');
      return;
    }
    if (manualQuantityA <= 0 || manualQuantityB <= 0) {
      setFormError('Enter a quantity greater than zero for both materials.');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/material-mixes`, {
        materialAId: Number(manualForm.materialAId),
        quantityA: manualQuantityA,
        materialBId: Number(manualForm.materialBId),
        quantityB: manualQuantityB,
        outputMaterialId: Number(manualForm.outputMaterialId),
        mixDate: manualForm.mixDate,
      });
      setSuccess(
        `Mixed ${formatQty(manualCombined)} ${manualOutputMaterial?.unit ?? ''} of ${manualOutputMaterial?.name} and added it to stock.`,
      );
      setManualForm({ ...emptyManualForm, mixDate: manualForm.mixDate });
      fetchOptions();
      fetchMixes();
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to record material mix', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (mix: MixRecord) => {
    if (
      !window.confirm(
        `Delete this mix? This removes the ${mix.outputMaterialName} stock it produced and restores ${mix.materialAName}/${mix.materialBName} back to stock.`,
      )
    ) {
      return;
    }
    setDeletingId(mix.id);
    try {
      await axios.delete(`${API_URL}/material-mixes/${mix.id}`);
      fetchOptions();
      fetchMixes();
    } catch (err) {
      window.alert(getApiErrorMessage(err, 'Failed to delete mix. Check the console.'));
      console.error('Failed to delete material mix', err);
    } finally {
      setDeletingId(null);
    }
  };

  const modeBtnBase = 'h-9 px-4 rounded-lg text-[0.8rem] font-bold transition-colors duration-200 cursor-pointer';
  const modeBtnActive = 'bg-[#e21e53] text-white';
  const modeBtnInactive = 'bg-[#f8fafc] text-[#545454] border border-[#e8e8e8] hover:text-[#1E1E1E]';

  return (
    <div>
      <div className="pb-4">
        <h2 className="text-[1.4rem] font-extrabold text-[#1E1E1E] mb-2">Material Mixing</h2>
        <p className="text-[0.9rem] text-[#545454]">
          Combine two raw materials into a third -- e.g. Color + Ayca into Gesso. Add stock of the inputs first on
          the Raw Materials Inventory page, then mix here; the output shows up as stock there too.
        </p>
      </div>

      {optionsError && <p className="mb-3 text-[0.8rem] font-semibold text-[#ef4444]">{optionsError}</p>}

      {/* Saved ratio configs -- once one exists, buying more of either
          input (Raw Materials Inventory -> Record a Purchase) automatically
          runs an auto-mix at this ratio. No need to visit this page again
          for that combo. */}
      <div className={`${cardClass} mb-6`}>
        <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3 mb-4">
          <h3 className="text-base font-extrabold text-[#1E1E1E]">
            <i className="fa-solid fa-repeat mr-[0.4rem] text-[#e21e53]" />
            Mix Recipes
          </h3>
          <span className="rounded-full bg-[rgba(59,130,246,0.1)] text-[#3b82f6] text-[0.7rem] font-bold px-3 py-1">
            {mixRecipes.length} {mixRecipes.length === 1 ? 'recipe' : 'recipes'}
          </span>
        </div>
        <p className="text-[0.8rem] text-[#545454] mb-4">
          Save a material A + material B ratio here once. From then on, every time you record a purchase of either
          input on the Raw Materials Inventory page, it automatically mixes as much as that ratio allows and tops
          up the output's stock -- no need to come back here.
        </p>

        <form onSubmit={handleAddRecipe} className="flex flex-wrap gap-3 md:items-end mb-4">
          <div className="flex flex-col gap-[0.4rem] flex-1 min-w-[180px]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Material A</label>
            <select
              value={recipeForm.materialAId}
              onChange={(e) => handleRecipeFormChange('materialAId', e.target.value)}
              required
              disabled={loadingOptions || addingRecipe}
              className={inputClass}
            >
              <option value="" disabled>
                Select a material...
              </option>
              {rawMaterials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.unit})
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-[0.4rem] w-full sm:w-[90px]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Ratio</label>
            <input
              type="number"
              step="any"
              min="0"
              value={recipeForm.ratioA}
              onChange={(e) => handleRecipeFormChange('ratioA', e.target.value)}
              placeholder="9"
              required
              disabled={addingRecipe}
              className={inputClass}
            />
          </div>
          <div className="flex items-center justify-center px-1 pb-2 text-[#545454]">
            <i className="fa-solid fa-plus" />
          </div>
          <div className="flex flex-col gap-[0.4rem] flex-1 min-w-[180px]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Material B</label>
            <select
              value={recipeForm.materialBId}
              onChange={(e) => handleRecipeFormChange('materialBId', e.target.value)}
              required
              disabled={loadingOptions || addingRecipe}
              className={inputClass}
            >
              <option value="" disabled>
                Select a material...
              </option>
              {rawMaterials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.unit})
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-[0.4rem] w-full sm:w-[90px]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Ratio</label>
            <input
              type="number"
              step="any"
              min="0"
              value={recipeForm.ratioB}
              onChange={(e) => handleRecipeFormChange('ratioB', e.target.value)}
              placeholder="1"
              required
              disabled={addingRecipe}
              className={inputClass}
            />
          </div>
          <div className="flex items-center justify-center px-1 pb-2 text-[#545454]">
            <i className="fa-solid fa-arrow-right" />
          </div>
          <div className="flex flex-col gap-[0.4rem] flex-1 min-w-[180px]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Output Material</label>
            <select
              value={recipeForm.outputMaterialId}
              onChange={(e) => handleRecipeFormChange('outputMaterialId', e.target.value)}
              required
              disabled={loadingOptions || addingRecipe}
              className={inputClass}
            >
              <option value="" disabled>
                Select the resulting material...
              </option>
              {rawMaterials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.unit})
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={addingRecipe || loadingOptions} className={primaryBtnClass}>
            <i className={`fa-solid ${addingRecipe ? 'fa-spinner fa-spin' : 'fa-plus'}`} />
            {addingRecipe ? 'Adding...' : 'Add Mix Recipe'}
          </button>
        </form>
        {addRecipeError && <p className="mb-3 text-[0.8rem] font-semibold text-[#ef4444]">{addRecipeError}</p>}
        {runError && <p className="mb-3 text-[0.8rem] font-semibold text-[#ef4444]">{runError}</p>}

        {loadingRecipes && <p className="text-[0.8rem] font-semibold text-[#545454]">Loading mix recipes...</p>}
        {!loadingRecipes && recipesError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{recipesError}</p>}
        {!loadingRecipes && !recipesError && mixRecipes.length === 0 && (
          <p className="text-[0.8rem] font-medium text-[#545454]">No mix recipes yet -- add one above.</p>
        )}

        {!loadingRecipes && mixRecipes.length > 0 && (
          <div className="flex flex-col gap-2">
            {mixRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                  recipe.active ? 'border-[#e8e8e8] bg-[#f8fafc]' : 'border-[#e8e8e8] bg-white opacity-60'
                }`}
              >
                <span className="text-[0.85rem] font-semibold text-[#1E1E1E]">
                  {recipe.ratioA} {recipe.materialAName} : {recipe.ratioB} {recipe.materialBName}{' '}
                  <i className="fa-solid fa-arrow-right mx-1 text-[#545454] text-[0.75rem]" />
                  {recipe.outputMaterialName}
                  {!recipe.active && (
                    <span className="ml-2 rounded-full bg-[rgba(107,114,128,0.12)] text-[#6b7280] text-[0.62rem] font-bold uppercase tracking-[0.03em] px-2 py-0.5">
                      Paused
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRunRecipeNow(recipe)}
                    disabled={runningRecipeId === recipe.id || !recipe.active}
                    title="Mix as much as current stock allows, right now"
                    className="h-8 px-3 flex items-center gap-1 rounded-md border border-[#e8e8e8] text-[#545454] text-[0.75rem] font-bold hover:bg-white hover:text-[#1E1E1E] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <i className={`fa-solid ${runningRecipeId === recipe.id ? 'fa-spinner fa-spin' : 'fa-play'}`} />
                    Run Now
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleRecipeActive(recipe)}
                    disabled={togglingRecipeId === recipe.id}
                    title={recipe.active ? 'Pause' : 'Resume'}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e8e8e8] text-[#545454] hover:bg-white hover:text-[#1E1E1E] transition-colors duration-200 disabled:opacity-50 cursor-pointer"
                  >
                    <i
                      className={`fa-solid ${togglingRecipeId === recipe.id ? 'fa-spinner fa-spin' : recipe.active ? 'fa-pause' : 'fa-play'}`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRecipe(recipe)}
                    disabled={deletingRecipeId === recipe.id}
                    title="Delete"
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-[rgba(239,68,68,0.25)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors duration-200 disabled:opacity-50 cursor-pointer"
                  >
                    <i
                      className={`fa-solid ${deletingRecipeId === recipe.id ? 'fa-spinner fa-spin' : 'fa-trash'}`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`${cardClass} mb-6`}>
        <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3 mb-4">
          <h3 className="text-base font-extrabold text-[#1E1E1E]">
            <i className="fa-solid fa-flask mr-[0.4rem] text-[#e21e53]" />
            Mix Materials
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => switchMode('auto')}
              className={`${modeBtnBase} ${mode === 'auto' ? modeBtnActive : modeBtnInactive}`}
            >
              Auto (by ratio)
            </button>
            <button
              type="button"
              onClick={() => switchMode('manual')}
              className={`${modeBtnBase} ${mode === 'manual' ? modeBtnActive : modeBtnInactive}`}
            >
              Manual (exact qty)
            </button>
          </div>
        </div>

        {mode === 'auto' && (
          <form onSubmit={handleAutoSubmit} className="flex flex-col gap-4">
            <p className="text-[0.8rem] text-[#545454]">
              Pick the ratio between the two materials (e.g. 9:1) and it uses as much of your current stock as that
              ratio allows -- consuming everything it can from whichever material runs out first, leaving the rest
              as leftover.
            </p>

            <div className="flex flex-wrap gap-4 md:items-end">
              <div className="flex flex-col gap-[0.4rem] flex-1 min-w-[200px]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Material A</label>
                <select
                  value={autoForm.materialAId}
                  onChange={(e) => handleAutoChange('materialAId', e.target.value)}
                  required
                  disabled={loadingOptions || submitting}
                  className={inputClass}
                >
                  <option value="" disabled>
                    Select a material...
                  </option>
                  {rawMaterials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.unit}) -- {formatQty(stockOf(m.id))} available
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-[0.4rem] w-full sm:w-[100px]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Ratio</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={autoForm.ratioA}
                  onChange={(e) => handleAutoChange('ratioA', e.target.value)}
                  placeholder="9"
                  required
                  disabled={submitting}
                  className={inputClass}
                />
              </div>

              <div className="flex items-center justify-center px-1 pb-2 text-[#545454]">
                <i className="fa-solid fa-plus" />
              </div>

              <div className="flex flex-col gap-[0.4rem] flex-1 min-w-[200px]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Material B</label>
                <select
                  value={autoForm.materialBId}
                  onChange={(e) => handleAutoChange('materialBId', e.target.value)}
                  required
                  disabled={loadingOptions || submitting}
                  className={inputClass}
                >
                  <option value="" disabled>
                    Select a material...
                  </option>
                  {rawMaterials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.unit}) -- {formatQty(stockOf(m.id))} available
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-[0.4rem] w-full sm:w-[100px]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Ratio</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={autoForm.ratioB}
                  onChange={(e) => handleAutoChange('ratioB', e.target.value)}
                  placeholder="1"
                  required
                  disabled={submitting}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 md:items-end rounded-lg border border-dashed border-[#e8e8e8] bg-[#f8fafc] p-3">
              <div className="flex items-center justify-center px-1 text-[#545454]">
                <i className="fa-solid fa-arrow-right" />
              </div>
              <div className="flex flex-col gap-[0.4rem] flex-1 min-w-[200px]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Output Material (becomes stock)</label>
                <select
                  value={autoForm.outputMaterialId}
                  onChange={(e) => handleAutoChange('outputMaterialId', e.target.value)}
                  required
                  disabled={loadingOptions || submitting}
                  className={inputClass}
                >
                  <option value="" disabled>
                    Select the resulting material...
                  </option>
                  {rawMaterials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-[0.4rem] w-full sm:w-[160px]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Date</label>
                <input
                  type="date"
                  value={autoForm.mixDate}
                  onChange={(e) => handleAutoChange('mixDate', e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </div>
            </div>

            {previewOutput > 0 && autoMaterialA && autoMaterialB && (
              <p className="text-[0.8rem] font-semibold text-[#1E1E1E] bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.25)] rounded-lg px-3 py-2">
                Will consume {formatQty(previewQuantityA)} {autoMaterialA.unit} {autoMaterialA.name} (
                {formatQty(previewLeftoverA)} {autoMaterialA.unit} left over) + {formatQty(previewQuantityB)}{' '}
                {autoMaterialB.unit} {autoMaterialB.name} ({formatQty(previewLeftoverB)} {autoMaterialB.unit} left
                over) → {formatQty(previewOutput)} {autoOutputMaterial?.unit} {autoOutputMaterial?.name}.
              </p>
            )}

            <div>
              <button type="submit" disabled={submitting || loadingOptions} className={primaryBtnClass}>
                <i className={`fa-solid ${submitting ? 'fa-spinner fa-spin' : 'fa-flask'}`} />
                {submitting ? 'Mixing...' : 'Mix & Add to Stock'}
              </button>
            </div>
          </form>
        )}

        {mode === 'manual' && (
          <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-4 md:items-end">
              <div className="flex flex-col gap-[0.4rem] flex-1 min-w-[200px]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Material A</label>
                <select
                  value={manualForm.materialAId}
                  onChange={(e) => handleManualChange('materialAId', e.target.value)}
                  required
                  disabled={loadingOptions || submitting}
                  className={inputClass}
                >
                  <option value="" disabled>
                    Select a material...
                  </option>
                  {rawMaterials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-[0.4rem] w-full sm:w-[150px]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">
                  Quantity {manualMaterialA ? `(${manualMaterialA.unit})` : ''}
                </label>
                <input
                  type="number"
                  step="any"
                  value={manualForm.quantityA}
                  onChange={(e) => handleManualChange('quantityA', e.target.value)}
                  placeholder="e.g. 5"
                  required
                  disabled={submitting}
                  className={inputClass}
                />
              </div>

              <div className="flex items-center justify-center px-1 pb-2 text-[#545454]">
                <i className="fa-solid fa-plus" />
              </div>

              <div className="flex flex-col gap-[0.4rem] flex-1 min-w-[200px]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Material B</label>
                <select
                  value={manualForm.materialBId}
                  onChange={(e) => handleManualChange('materialBId', e.target.value)}
                  required
                  disabled={loadingOptions || submitting}
                  className={inputClass}
                >
                  <option value="" disabled>
                    Select a material...
                  </option>
                  {rawMaterials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-[0.4rem] w-full sm:w-[150px]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">
                  Quantity {manualMaterialB ? `(${manualMaterialB.unit})` : ''}
                </label>
                <input
                  type="number"
                  step="any"
                  value={manualForm.quantityB}
                  onChange={(e) => handleManualChange('quantityB', e.target.value)}
                  placeholder="e.g. 2"
                  required
                  disabled={submitting}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 md:items-end rounded-lg border border-dashed border-[#e8e8e8] bg-[#f8fafc] p-3">
              <div className="flex items-center justify-center px-1 text-[#545454]">
                <i className="fa-solid fa-arrow-right" />
              </div>
              <div className="flex flex-col gap-[0.4rem] flex-1 min-w-[200px]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Output Material (becomes stock)</label>
                <select
                  value={manualForm.outputMaterialId}
                  onChange={(e) => handleManualChange('outputMaterialId', e.target.value)}
                  required
                  disabled={loadingOptions || submitting}
                  className={inputClass}
                >
                  <option value="" disabled>
                    Select the resulting material...
                  </option>
                  {rawMaterials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-[0.4rem] w-full sm:w-[170px]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Output Qty (auto)</label>
                <div className={`${inputClass} bg-white text-[#545454] flex items-center`}>
                  {manualCombined > 0 ? `${formatQty(manualCombined)} ${manualOutputMaterial?.unit ?? ''}` : '—'}
                </div>
              </div>
              <div className="flex flex-col gap-[0.4rem] w-full sm:w-[160px]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Date</label>
                <input
                  type="date"
                  value={manualForm.mixDate}
                  onChange={(e) => handleManualChange('mixDate', e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <button type="submit" disabled={submitting || loadingOptions} className={primaryBtnClass}>
                <i className={`fa-solid ${submitting ? 'fa-spinner fa-spin' : 'fa-flask'}`} />
                {submitting ? 'Mixing...' : 'Mix & Add to Stock'}
              </button>
            </div>
          </form>
        )}

        {formError && <p className="mt-3 text-[0.8rem] font-semibold text-[#ef4444]">{formError}</p>}
        {success && <p className="mt-3 text-[0.8rem] font-semibold text-[#10b981]">{success}</p>}
      </div>

      <div className={cardClass}>
        <h3 className="text-base font-extrabold border-b border-[#e8e8e8] pb-2 mb-4 text-[#1E1E1E]">
          <i className="fa-solid fa-clock-rotate-left mr-[0.4rem] text-[#161138]" />
          Mix History
        </h3>

        {loadingMixes && <p className="text-[0.8rem] font-semibold text-[#545454]">Loading mixes...</p>}
        {!loadingMixes && mixesError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{mixesError}</p>}
        {!loadingMixes && !mixesError && mixes.length === 0 && (
          <p className="text-[0.8rem] font-semibold text-[#545454]">No mixes recorded yet.</p>
        )}

        {!loadingMixes && !mixesError && mixes.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[0.85rem]">
              <thead>
                <tr className="border-b border-[#e8e8e8] text-[0.72rem] uppercase tracking-[0.05em] text-[#545454]">
                  <th className="py-2 pr-4 font-bold">Date</th>
                  <th className="py-2 pr-4 font-bold">Input A</th>
                  <th className="py-2 pr-4 font-bold">Input B</th>
                  <th className="py-2 pr-4 font-bold">Output</th>
                  <th className="py-2 pr-4 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mixes.map((mix) => (
                  <tr key={mix.id} className="border-b border-[#f1f1f1] last:border-0">
                    <td className="py-3 pr-4 text-[#545454]">{mix.mixDate || '—'}</td>
                    <td className="py-3 pr-4 text-[#545454]">
                      {formatQty(mix.quantityA)} {mix.materialAUnit} {mix.materialAName}
                    </td>
                    <td className="py-3 pr-4 text-[#545454]">
                      {formatQty(mix.quantityB)} {mix.materialBUnit} {mix.materialBName}
                    </td>
                    <td className="py-3 pr-4 font-bold text-[#1E1E1E]">
                      {formatQty(mix.outputQuantity)} {mix.outputUnit} {mix.outputMaterialName}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => handleDelete(mix)}
                          disabled={deletingId === mix.id}
                          title="Delete mix"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e8e8e8] text-[#545454] transition-colors duration-200 hover:border-[#ef4444] hover:text-[#ef4444] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <i className={`fa-solid ${deletingId === mix.id ? 'fa-spinner fa-spin' : 'fa-trash'}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
