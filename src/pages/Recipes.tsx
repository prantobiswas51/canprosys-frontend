import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';
import { getApiErrorMessage } from '../utils/apiError';

const API_URL = import.meta.env.VITE_API_URL;

interface TaskOption {
  id: number;
  name: string;
}

interface RawMaterialOption {
  id: number;
  name: string;
  unit: string;
}

// Admin-managed grouping for recipes (Canvas, Easel, ...) -- CRUD lives at
// the top of this page, not hardcoded here, so new categories can be added
// later without a code change. See RecipeCategory on the backend.
interface CategoryOption {
  id: number;
  name: string;
  // Whether recipes in this category go through a multi-stage pipeline
  // (Step numbers required, per-stage WIP tracked) or finish in one step
  // (any configured task directly completes a unit). See DailyEntryService.
  hasSteps: boolean;
}

interface RecipeTaskRate {
  id: number;
  taskId: number;
  taskName: string;
  rate: number;
  sequence?: number | null;
}

interface RecipeMaterialUsage {
  id: number;
  rawMaterialId: number;
  rawMaterialName: string;
  rawMaterialUnit: string;
  quantity: number;
  // Which pipeline stage consumes this material -- null means "not yet
  // assigned", which blocks Daily Entry from being logged for this recipe
  // at all until every material row (and every task rate's sequence) is
  // set. See DailyEntryService's migration guard.
  taskId?: number | null;
  taskName?: string | null;
}

interface Recipe {
  id: number;
  product: string;
  sku: string;
  category?: CategoryOption | null;
  taskRates: RecipeTaskRate[];
  materialUsages: RecipeMaterialUsage[];
}

// Form-only row shapes -- ids/values stay as strings while being edited so
// an empty input isn't forced to "0".
interface TaskRateFormRow {
  taskId: string;
  rate: string;
  // Pipeline step number (1 = first, 2 = next, ...) -- optional, string
  // while editing so an empty box isn't forced to "0".
  sequence: string;
}

interface MaterialUsageFormRow {
  rawMaterialId: string;
  quantity: string;
  // Which task consumes this material -- empty string means "not yet
  // assigned" (see RecipeMaterialUsage.taskId on the backend).
  taskId: string;
}

interface RecipeFormState {
  product: string;
  sku: string;
  categoryId: string;
  taskRates: TaskRateFormRow[];
  materialUsages: MaterialUsageFormRow[];
}

// Export/import shape -- keyed by task/material NAME rather than id, so a
// file exported from one environment (or before a reseed) still resolves
// correctly against whatever ids the current database happens to have.
interface ImportedTaskRate {
  taskName: string;
  rate: number;
  sequence?: number | null;
}

interface ImportedMaterialUsage {
  rawMaterialName: string;
  quantity: number;
  taskName?: string | null;
}

interface ImportedRecipe {
  product: string;
  sku: string;
  categoryName?: string | null;
  taskRates?: ImportedTaskRate[];
  materialUsages?: ImportedMaterialUsage[];
}

const emptyForm: RecipeFormState = {
  product: '',
  sku: '',
  categoryId: '',
  taskRates: [],
  materialUsages: [],
};

// Rows with no sequence set sort after every numbered one (instead of
// first, which would be misleading), and ties/unset-vs-unset keep whatever
// order they already had (Array.sort is stable).
function sortBySequence<T extends { sequence?: number | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const aSeq = a.sequence ?? Infinity;
    const bSeq = b.sequence ?? Infinity;
    return aSeq - bSeq;
  });
}

const inputClass =
  'w-full bg-white border border-[#e8e8e8] text-[#1E1E1E] px-[0.85rem] py-[0.65rem] rounded-lg text-[0.875rem] font-medium transition-all duration-200 outline-none focus:border-[#e21e53] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] disabled:opacity-60 disabled:cursor-not-allowed';

const cardClass =
  'bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]';

const primaryBtnClass =
  'h-10 px-4 flex items-center gap-2 rounded-lg bg-[#e21e53] text-white font-bold text-[0.875rem] transition-all duration-200 hover:bg-[#c01745] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer';

export default function Recipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [tasksError, setTasksError] = useState<string | null>(null);

  const [rawMaterials, setRawMaterials] = useState<RawMaterialOption[]>([]);
  const [rawMaterialsError, setRawMaterialsError] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  // -- Category CRUD (lives here since it's Recipes' own admin-managed
  // grouping field) --
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryHasSteps, setNewCategoryHasSteps] = useState(true);
  const [addingCategory, setAddingCategory] = useState(false);
  const [addCategoryError, setAddCategoryError] = useState<string | null>(null);

  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryHasSteps, setEditingCategoryHasSteps] = useState(true);
  const [savingCategoryId, setSavingCategoryId] = useState<number | null>(null);
  const [editCategoryError, setEditCategoryError] = useState<string | null>(null);

  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<RecipeFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTaskId, setFilterTaskId] = useState('');
  const [filterRawMaterialId, setFilterRawMaterialId] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const res = await axios.get<Recipe[]>(`${API_URL}/recipes`);
      setRecipes(res.data);
    } catch (err) {
      setListError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to load recipes', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    setTasksError(null);
    try {
      const res = await axios.get<TaskOption[]>(`${API_URL}/tasks`);
      setTasks(res.data);
    } catch (err) {
      setTasksError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to load tasks', err);
    }
  }, []);

  const fetchRawMaterials = useCallback(async () => {
    setRawMaterialsError(null);
    try {
      const res = await axios.get<RawMaterialOption[]>(`${API_URL}/raw-materials`);
      setRawMaterials(res.data);
    } catch (err) {
      setRawMaterialsError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to load raw materials', err);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const res = await axios.get<CategoryOption[]>(`${API_URL}/recipe-categories`);
      setCategories(res.data);
    } catch (err) {
      setCategoriesError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to load categories', err);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecipes();
    fetchTasks();
    fetchRawMaterials();
    fetchCategories();
  }, [fetchRecipes, fetchTasks, fetchRawMaterials, fetchCategories]);

  const handleAddCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddCategoryError(null);
    const name = newCategoryName.trim();
    if (!name) return;

    setAddingCategory(true);
    try {
      await axios.post(`${API_URL}/recipe-categories`, { name, hasSteps: newCategoryHasSteps });
      setNewCategoryName('');
      setNewCategoryHasSteps(true);
      await fetchCategories();
    } catch (err) {
      setAddCategoryError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to create category', err);
    } finally {
      setAddingCategory(false);
    }
  };

  const openEditCategory = (category: CategoryOption) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
    setEditingCategoryHasSteps(category.hasSteps);
    setEditCategoryError(null);
  };

  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditingCategoryName('');
    setEditingCategoryHasSteps(true);
    setEditCategoryError(null);
  };

  const handleSaveCategory = async (id: number) => {
    const name = editingCategoryName.trim();
    if (!name) {
      setEditCategoryError('Name cannot be empty.');
      return;
    }
    setSavingCategoryId(id);
    setEditCategoryError(null);
    try {
      await axios.patch(`${API_URL}/recipe-categories/${id}`, { name, hasSteps: editingCategoryHasSteps });
      cancelEditCategory();
      await Promise.all([fetchCategories(), fetchRecipes()]);
    } catch (err) {
      setEditCategoryError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to update category', err);
    } finally {
      setSavingCategoryId(null);
    }
  };

  const handleDeleteCategory = async (category: CategoryOption) => {
    if (!window.confirm(`Delete the "${category.name}" category?`)) return;
    setDeletingCategoryId(category.id);
    try {
      await axios.delete(`${API_URL}/recipe-categories/${category.id}`);
      if (filterCategoryId === String(category.id)) setFilterCategoryId('');
      await fetchCategories();
    } catch (err) {
      window.alert(getApiErrorMessage(err, 'Failed to delete category. Check the console.'));
      console.error('Failed to delete category', err);
    } finally {
      setDeletingCategoryId(null);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (recipe: Recipe) => {
    setEditingId(recipe.id);
    setForm({
      product: recipe.product,
      sku: recipe.sku,
      categoryId: recipe.category?.id != null ? String(recipe.category.id) : '',
      taskRates: sortBySequence(recipe.taskRates).map((tr) => ({
        taskId: String(tr.taskId),
        rate: String(tr.rate),
        sequence: tr.sequence != null ? String(tr.sequence) : '',
      })),
      materialUsages: recipe.materialUsages.map((mu) => ({
        rawMaterialId: String(mu.rawMaterialId),
        quantity: String(mu.quantity),
        taskId: mu.taskId != null ? String(mu.taskId) : '',
      })),
    });
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
  };

  const handleChange = (field: keyof Pick<RecipeFormState, 'product' | 'sku' | 'categoryId'>, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addTaskRateRow = () => {
    setForm((prev) => ({ ...prev, taskRates: [...prev.taskRates, { taskId: '', rate: '', sequence: '' }] }));
  };

  const removeTaskRateRow = (index: number) => {
    setForm((prev) => ({ ...prev, taskRates: prev.taskRates.filter((_, i) => i !== index) }));
  };

  const updateTaskRateRow = (index: number, field: keyof TaskRateFormRow, value: string) => {
    setForm((prev) => ({
      ...prev,
      taskRates: prev.taskRates.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    }));
  };

  // Tasks already picked in another row -- excluded from the options in a
  // given row's dropdown so the same task can't be added twice.
  const usedTaskIds = (excludeIndex: number) =>
    new Set(
      form.taskRates
        .filter((_, i) => i !== excludeIndex)
        .map((row) => row.taskId)
        .filter(Boolean),
    );

  const addMaterialUsageRow = () => {
    setForm((prev) => ({
      ...prev,
      materialUsages: [...prev.materialUsages, { rawMaterialId: '', quantity: '', taskId: '' }],
    }));
  };

  const removeMaterialUsageRow = (index: number) => {
    setForm((prev) => ({ ...prev, materialUsages: prev.materialUsages.filter((_, i) => i !== index) }));
  };

  const updateMaterialUsageRow = (index: number, field: keyof MaterialUsageFormRow, value: string) => {
    setForm((prev) => ({
      ...prev,
      materialUsages: prev.materialUsages.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    }));
  };

  // Raw materials already picked in another row -- excluded from the
  // options in a given row's dropdown so the same material can't be added
  // twice (e.g. the two separate "Poly" piece/yard catalog rows are still
  // distinct materials and can both be picked, just not the same one twice).
  const usedRawMaterialIds = (excludeIndex: number) =>
    new Set(
      form.materialUsages
        .filter((_, i) => i !== excludeIndex)
        .map((row) => row.rawMaterialId)
        .filter(Boolean),
    );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (form.taskRates.some((row) => !row.taskId || row.rate.trim() === '')) {
      setFormError('Every Artisan Wages row needs a task and a rate -- remove any incomplete rows.');
      return;
    }

    if (form.materialUsages.some((row) => !row.rawMaterialId || row.quantity.trim() === '')) {
      setFormError('Every Materials (BOM) row needs a material and a quantity -- remove any incomplete rows.');
      return;
    }

    const payload = {
      ...form,
      categoryId: form.categoryId.trim() === '' ? undefined : Number(form.categoryId),
      taskRates: form.taskRates.map((row) => ({
        taskId: Number(row.taskId),
        rate: Number(row.rate),
        sequence: row.sequence.trim() === '' ? undefined : Number(row.sequence),
      })),
      materialUsages: form.materialUsages.map((row) => ({
        rawMaterialId: Number(row.rawMaterialId),
        quantity: Number(row.quantity),
        taskId: row.taskId.trim() === '' ? undefined : Number(row.taskId),
      })),
    };

    setSubmitting(true);
    try {
      if (editingId != null) {
        await axios.patch(`${API_URL}/recipes/${editingId}`, payload);
      } else {
        await axios.post(`${API_URL}/recipes`, payload);
      }
      setModalOpen(false);
      fetchRecipes();
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to save recipe', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Client-side -- the recipe catalog is small enough that fetching once and
  // filtering here is simpler than a backend search endpoint, and keeps the
  // three filters (text, task, material) instantly combinable.
  const filtersActive =
    searchQuery.trim() !== '' || filterTaskId !== '' || filterRawMaterialId !== '' || filterCategoryId !== '';

  const clearFilters = () => {
    setSearchQuery('');
    setFilterTaskId('');
    setFilterRawMaterialId('');
    setFilterCategoryId('');
  };

  const filteredRecipes = recipes.filter((recipe) => {
    const q = searchQuery.trim().toLowerCase();
    if (q && !recipe.product.toLowerCase().includes(q) && !recipe.sku.toLowerCase().includes(q)) {
      return false;
    }
    if (filterTaskId && !recipe.taskRates.some((tr) => String(tr.taskId) === filterTaskId)) {
      return false;
    }
    if (filterRawMaterialId && !recipe.materialUsages.some((mu) => String(mu.rawMaterialId) === filterRawMaterialId)) {
      return false;
    }
    if (filterCategoryId && String(recipe.category?.id ?? '') !== filterCategoryId) {
      return false;
    }
    return true;
  });

  // Exports keyed by name, not id -- see ImportedRecipe comment above.
  const handleExport = () => {
    const exportData: ImportedRecipe[] = recipes.map((r) => ({
      product: r.product,
      sku: r.sku,
      categoryName: r.category?.name ?? undefined,
      taskRates: r.taskRates.map((tr) => ({ taskName: tr.taskName, rate: tr.rate, sequence: tr.sequence ?? undefined })),
      materialUsages: r.materialUsages.map((mu) => ({
        rawMaterialName: mu.rawMaterialName,
        quantity: mu.quantity,
        taskName: mu.taskName ?? undefined,
      })),
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recipes-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const triggerImport = () => {
    setImportSummary(null);
    fileInputRef.current?.click();
  };

  // Row-by-row: matches each task/material by name against what's currently
  // in the database, and matches each recipe by SKU against what already
  // exists -- update in place if the SKU is already a recipe here, create
  // otherwise. That makes the same file safe to re-import (e.g. after
  // fixing a typo) without creating duplicates.
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImporting(true);
    setImportSummary(null);

    let rows: ImportedRecipe[];
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      rows = Array.isArray(json) ? json : [json];
    } catch {
      setImportSummary("Could not read that file -- make sure it's a valid recipe export (.json).");
      setImporting(false);
      return;
    }

    let created = 0;
    let updated = 0;
    const errors: string[] = [];
    // Local working copy so multiple rows in the same file can target the
    // same SKU (a later row updates what an earlier row in this same
    // import just created) without a server round-trip in between.
    let knownRecipes = [...recipes];

    for (const row of rows) {
      const label = row.sku || row.product || 'row';
      try {
        if (!row.product?.trim() || !row.sku?.trim()) {
          throw new Error('missing product or sku');
        }

        const taskRates = (row.taskRates ?? []).map((tr) => {
          const task = tasks.find(
            (t) => t.name.trim().toLowerCase() === tr.taskName?.trim().toLowerCase(),
          );
          if (!task) throw new Error(`unknown task "${tr.taskName}"`);
          return {
            taskId: task.id,
            rate: Number(tr.rate),
            sequence: tr.sequence != null ? Number(tr.sequence) : undefined,
          };
        });

        const materialUsages = (row.materialUsages ?? []).map((mu) => {
          const material = rawMaterials.find(
            (m) => m.name.trim().toLowerCase() === mu.rawMaterialName?.trim().toLowerCase(),
          );
          if (!material) throw new Error(`unknown raw material "${mu.rawMaterialName}"`);
          let taskId: number | undefined;
          if (mu.taskName?.trim()) {
            const task = tasks.find((t) => t.name.trim().toLowerCase() === mu.taskName!.trim().toLowerCase());
            if (!task) throw new Error(`unknown task "${mu.taskName}"`);
            taskId = task.id;
          }
          return { rawMaterialId: material.id, quantity: Number(mu.quantity), taskId };
        });

        let categoryId: number | undefined;
        if (row.categoryName?.trim()) {
          const category = categories.find(
            (c) => c.name.trim().toLowerCase() === row.categoryName!.trim().toLowerCase(),
          );
          if (!category) throw new Error(`unknown category "${row.categoryName}"`);
          categoryId = category.id;
        }

        const payload = { product: row.product.trim(), sku: row.sku.trim(), categoryId, taskRates, materialUsages };
        const existing = knownRecipes.find(
          (r) => r.sku.trim().toLowerCase() === row.sku.trim().toLowerCase(),
        );

        if (existing) {
          const res = await axios.patch<Recipe>(`${API_URL}/recipes/${existing.id}`, payload);
          knownRecipes = knownRecipes.map((r) => (r.id === existing.id ? res.data : r));
          updated++;
        } else {
          const res = await axios.post<Recipe>(`${API_URL}/recipes`, payload);
          knownRecipes = [...knownRecipes, res.data];
          created++;
        }
      } catch (err) {
        const message =
          err instanceof Error && !axios.isAxiosError(err)
            ? err.message
            : getApiErrorMessage(err, 'failed');
        errors.push(`${label}: ${message}`);
      }
    }

    setImportSummary(
      `Imported: ${created} created, ${updated} updated` +
        (errors.length > 0 ? `, ${errors.length} failed -- ${errors.join('; ')}` : '.'),
    );
    setImporting(false);
    fetchRecipes();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this recipe? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await axios.delete(`${API_URL}/recipes/${id}`);
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Failed to delete recipe', err);
      window.alert(getApiErrorMessage(err, 'Failed to delete recipe. Check the console.'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between pb-4">
        <div>
          <h2 className="text-[1.4rem] font-extrabold text-[#1E1E1E] mb-2">Recipes</h2>
          <p className="text-[0.9rem] text-[#545454]">Material recipes and production formulas.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={triggerImport}
            disabled={importing}
            title="Import recipes from a .json file"
            className="h-10 px-4 flex items-center gap-2 rounded-lg border border-[#e8e8e8] text-[#545454] font-bold text-[0.875rem] hover:bg-[#f8fafc] hover:text-[#1E1E1E] transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            <i className={`fa-solid ${importing ? 'fa-spinner fa-spin' : 'fa-file-import'}`} />
            {importing ? 'Importing...' : 'Import'}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={recipes.length === 0}
            title="Export all recipes as .json"
            className="h-10 px-4 flex items-center gap-2 rounded-lg border border-[#e8e8e8] text-[#545454] font-bold text-[0.875rem] hover:bg-[#f8fafc] hover:text-[#1E1E1E] transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            <i className="fa-solid fa-file-export" />
            Export
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="h-10 px-4 flex items-center gap-2 rounded-lg bg-[#e21e53] text-white font-bold text-[0.875rem] transition-all duration-200 hover:bg-[#c01745] hover:-translate-y-px hover:shadow-[0_6px_14px_rgba(226,30,83,0.25)] cursor-pointer"
          >
            <i className="fa-solid fa-flask" />
            Add Recipe
          </button>
        </div>
      </div>

      {/* Category CRUD -- admin-managed groupings (Canvas, Easel, ...) used
          by the Category field below and by the Unfinished Items page. */}
      <div className={`${cardClass} mb-4`}>
        <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3 mb-4">
          <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E]">
            <i className="fa-solid fa-tags mr-2 text-[#e21e53]" />
            Recipe Categories
          </h3>
          <span className="rounded-full bg-[rgba(59,130,246,0.1)] text-[#3b82f6] text-[0.7rem] font-bold px-3 py-1">
            {categories.length} {categories.length === 1 ? 'category' : 'categories'}
          </span>
        </div>

        <form onSubmit={handleAddCategory} className="flex flex-wrap gap-2 items-center mb-4">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="e.g. Canvas, Easel"
            disabled={addingCategory}
            className={`${inputClass} flex-1 min-w-[200px]`}
          />
          <label className="flex items-center gap-2 text-[0.8rem] font-semibold text-[#545454] whitespace-nowrap">
            <input
              type="checkbox"
              checked={newCategoryHasSteps}
              onChange={(e) => setNewCategoryHasSteps(e.target.checked)}
              disabled={addingCategory}
              className="h-4 w-4 accent-[#e21e53] cursor-pointer"
            />
            Has multiple production steps
          </label>
          <button type="submit" disabled={addingCategory || !newCategoryName.trim()} className={primaryBtnClass}>
            <i className={`fa-solid ${addingCategory ? 'fa-spinner fa-spin' : 'fa-plus'}`} />
            {addingCategory ? 'Adding...' : 'Add Category'}
          </button>
        </form>
        <p className="mb-4 text-[0.72rem] font-medium text-[#545454]">
          Multi-step categories require a Step number on each recipe's tasks and track WIP between stages (see
          Unfinished Items). Single-step categories finish in one task -- no Step numbers, no WIP tracking.
        </p>
        {addCategoryError && <p className="mb-3 text-[0.8rem] font-semibold text-[#ef4444]">{addCategoryError}</p>}

        {categoriesError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{categoriesError}</p>}
        {categoriesLoading && <p className="text-[0.8rem] font-semibold text-[#545454]">Loading categories...</p>}

        {!categoriesLoading && !categoriesError && categories.length === 0 && (
          <p className="text-[0.8rem] font-medium text-[#545454]">
            No categories yet -- add one above (e.g. "Canvas" or "Easel").
          </p>
        )}

        {!categoriesLoading && categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-2 rounded-lg border border-[#e8e8e8] bg-[#f8fafc] px-3 py-2"
              >
                {editingCategoryId === category.id ? (
                  <>
                    <input
                      type="text"
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      disabled={savingCategoryId === category.id}
                      autoFocus
                      className={`${inputClass.replace('w-full ', '')} h-8 w-[160px] !py-1 !text-[0.8rem]`}
                    />
                    <label className="flex items-center gap-1 text-[0.72rem] font-semibold text-[#545454] whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={editingCategoryHasSteps}
                        onChange={(e) => setEditingCategoryHasSteps(e.target.checked)}
                        disabled={savingCategoryId === category.id}
                        className="h-3.5 w-3.5 accent-[#e21e53] cursor-pointer"
                      />
                      Multi-step
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSaveCategory(category.id)}
                      disabled={savingCategoryId === category.id}
                      title="Save"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-[#16a34a] hover:bg-[rgba(34,197,94,0.1)] disabled:opacity-50 cursor-pointer"
                    >
                      <i className={`fa-solid ${savingCategoryId === category.id ? 'fa-spinner fa-spin' : 'fa-check'}`} />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditCategory}
                      disabled={savingCategoryId === category.id}
                      title="Cancel"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-[#545454] hover:bg-[#eef0f2] disabled:opacity-50 cursor-pointer"
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-[0.85rem] font-semibold text-[#1E1E1E]">{category.name}</span>
                    <span
                      className={`rounded-full text-[0.62rem] font-bold uppercase tracking-[0.03em] px-2 py-0.5 ${
                        category.hasSteps
                          ? 'bg-[rgba(59,130,246,0.1)] text-[#3b82f6]'
                          : 'bg-[rgba(107,114,128,0.12)] text-[#6b7280]'
                      }`}
                    >
                      {category.hasSteps ? 'Multi-step' : 'Single-step'}
                    </span>
                    <button
                      type="button"
                      onClick={() => openEditCategory(category)}
                      title="Rename"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-[#545454] hover:bg-[#eef0f2] cursor-pointer"
                    >
                      <i className="fa-solid fa-pen text-[0.75rem]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(category)}
                      disabled={deletingCategoryId === category.id}
                      title="Delete"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] disabled:opacity-50 cursor-pointer"
                    >
                      <i
                        className={`fa-solid text-[0.75rem] ${deletingCategoryId === category.id ? 'fa-spinner fa-spin' : 'fa-trash'}`}
                      />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        {editCategoryError && <p className="mt-2 text-[0.8rem] font-semibold text-[#ef4444]">{editCategoryError}</p>}
      </div>

      {importSummary && (
        <p className="mb-4 rounded-lg border border-[#e8e8e8] bg-[#f8fafc] px-4 py-3 text-[0.8rem] font-semibold text-[#1E1E1E]">
          {importSummary}
        </p>
      )}

      {!loading && !listError && recipes.length > 0 && (
        <div className={`${cardClass} mb-4 flex flex-wrap gap-3 items-end`}>
          <div className="flex flex-col gap-[0.4rem] flex-1 min-w-[200px]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product or SKU..."
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-[0.4rem] w-full sm:w-[200px]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Filter by Task</label>
            <select value={filterTaskId} onChange={(e) => setFilterTaskId(e.target.value)} className={inputClass}>
              <option value="">All tasks</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-[0.4rem] w-full sm:w-[200px]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Filter by Material</label>
            <select
              value={filterRawMaterialId}
              onChange={(e) => setFilterRawMaterialId(e.target.value)}
              className={inputClass}
            >
              <option value="">All materials</option>
              {rawMaterials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.unit})
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-[0.4rem] w-full sm:w-[200px]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Filter by Category</label>
            <select
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
              className={inputClass}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="h-10 px-4 rounded-lg border border-[#e8e8e8] text-[#545454] font-bold text-[0.8rem] hover:bg-[#f8fafc] hover:text-[#1E1E1E] transition-colors duration-200 cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {loading && <p className="text-[0.8rem] font-semibold text-[#545454]">Loading recipes...</p>}

      {!loading && listError && (
        <p className="text-[0.8rem] font-semibold text-[#ef4444]">{listError}</p>
      )}

      {!loading && !listError && recipes.length === 0 && (
        <p className="text-[0.8rem] font-semibold text-[#545454]">No recipes yet. Add your first one.</p>
      )}

      {!loading && !listError && recipes.length > 0 && filteredRecipes.length === 0 && (
        <p className="text-[0.8rem] font-semibold text-[#545454]">
          No recipes match your filters.{' '}
          <button type="button" onClick={clearFilters} className="font-bold text-[#e21e53] cursor-pointer underline">
            Clear filters
          </button>
        </p>
      )}

      {!loading && !listError && filteredRecipes.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
          {filteredRecipes.map((recipe) => (
            <div key={recipe.id} className={`${cardClass} flex flex-col justify-between`}>
              <div>
                <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3 mb-3">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-[1.15rem] font-bold text-[#e21e53]">{recipe.product}</h3>
                    {recipe.category && (
                      <span className="w-fit rounded-full bg-[rgba(16,185,129,0.1)] text-[#10b981] text-[0.65rem] font-bold px-2 py-0.5">
                        {recipe.category.name}
                      </span>
                    )}
                  </div>
                  <span className="rounded-full bg-[rgba(59,130,246,0.1)] text-[#3b82f6] text-[0.7rem] font-bold px-3 py-1">
                    SKU: {recipe.sku}
                  </span>
                </div>

                <p className="text-[0.72rem] font-bold uppercase tracking-[0.05em] text-[#545454] mt-3 mb-2">
                  Material Consumption (BOM)
                </p>
                {recipe.materialUsages.length === 0 ? (
                  <p className="text-[0.8rem] font-medium text-[#545454]">No materials assigned yet.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {recipe.materialUsages.map((mu) => (
                      <div
                        key={mu.id}
                        className="flex flex-col gap-0.5 rounded-lg border border-[#e8e8e8] bg-[#f8fafc] px-2 py-2 text-[0.8rem] font-semibold text-[#1E1E1E]"
                      >
                        <span className="flex items-center gap-[0.35rem]">
                          <i className="fa-solid fa-cube w-4 text-center text-[#545454]" />
                          {mu.rawMaterialName}: {mu.quantity} {mu.rawMaterialUnit}
                        </span>
                        <span
                          className={`pl-5 text-[0.68rem] font-bold uppercase tracking-[0.03em] ${
                            mu.taskName ? 'text-[#545454]' : 'text-[#ef4444]'
                          }`}
                        >
                          {mu.taskName ? `at: ${mu.taskName}` : 'not assigned'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-[0.72rem] font-bold uppercase tracking-[0.05em] text-[#545454] mt-4 mb-2">
                  Artisan Wages (Payout — ৳{' '}
                  {recipe.taskRates.reduce((sum, tr) => sum + tr.rate, 0).toFixed(2)})
                </p>
                {recipe.taskRates.length === 0 ? (
                  <p className="text-[0.8rem] font-medium text-[#545454]">No tasks assigned yet.</p>
                ) : (
                  <div className="flex flex-col gap-[0.35rem]">
                    {sortBySequence(recipe.taskRates).map((tr, i, sorted) => (
                      <div
                        key={tr.id}
                        className={`flex items-center justify-between text-[0.85rem] ${
                          i < sorted.length - 1 ? 'border-b border-dashed border-[#e8e8e8] pb-1' : ''
                        }`}
                      >
                        <span className="flex items-center gap-1.5 text-[#545454]">
                          {tr.sequence != null && (
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[rgba(226,30,83,0.1)] text-[0.62rem] font-bold text-[#e21e53]">
                              {tr.sequence}
                            </span>
                          )}
                          {tr.taskName}
                        </span>
                        <span className="font-bold text-[#1E1E1E]">৳ {tr.rate}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2 border-t border-[#e8e8e8] pt-3">
                <button
                  type="button"
                  onClick={() => openEditModal(recipe)}
                  className="flex-1 h-9 flex items-center justify-center gap-2 rounded-lg border border-[#e8e8e8] text-[#545454] font-bold text-[0.8rem] hover:bg-[#f8fafc] hover:text-[#1E1E1E] transition-colors duration-200 cursor-pointer"
                >
                  <i className="fa-solid fa-pen" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(recipe.id)}
                  disabled={deletingId === recipe.id}
                  className="h-9 w-9 flex items-center justify-center rounded-lg border border-[rgba(239,68,68,0.25)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors duration-200 disabled:opacity-60 cursor-pointer"
                  title="Delete"
                >
                  <i className={`fa-solid ${deletingId === recipe.id ? 'fa-spinner fa-spin' : 'fa-trash'}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editingId != null ? 'Edit Recipe' : 'Add Recipe'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <h4 className="text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] mb-2">
              Basic Info
            </h4>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-[0.4rem]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Product</label>
                <input
                  type="text"
                  value={form.product}
                  onChange={(e) => handleChange('product', e.target.value)}
                  placeholder="e.g. Whiteboard"
                  required
                  disabled={submitting}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-[0.4rem]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">SKU</label>
                <input
                  type="text"
                  value={form.sku}
                  onChange={(e) => handleChange('sku', e.target.value)}
                  placeholder="e.g. WB-3X4"
                  required
                  disabled={submitting}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-[0.4rem]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Category</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => handleChange('categoryId', e.target.value)}
                  disabled={submitting}
                  className={inputClass}
                >
                  <option value="">None</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {categoriesError && (
                  <p className="text-[0.72rem] font-semibold text-[#ef4444]">{categoriesError}</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454]">
                Materials (BOM)
              </h4>
              <button
                type="button"
                onClick={addMaterialUsageRow}
                disabled={submitting || rawMaterials.length === 0}
                className="h-7 px-2 flex items-center gap-1 rounded-lg border border-[#e8e8e8] text-[#545454] font-bold text-[0.72rem] hover:bg-[#f8fafc] hover:text-[#1E1E1E] transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                <i className="fa-solid fa-plus" />
                Add Material
              </button>
            </div>

            {rawMaterialsError && <p className="text-[0.8rem] font-semibold text-[#ef4444] mb-2">{rawMaterialsError}</p>}

            {form.materialUsages.length === 0 ? (
              <p className="text-[0.8rem] font-medium text-[#545454]">
                No materials assigned yet -- click "Add Material" to define this recipe's BOM.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {form.materialUsages.map((row, index) => {
                  const excluded = usedRawMaterialIds(index);
                  const selectedUnit = rawMaterials.find((m) => String(m.id) === row.rawMaterialId)?.unit;
                  return (
                    <div key={index} className="flex flex-col gap-1.5 rounded-lg border border-[#e8e8e8] p-2">
                      <div className="flex gap-2 items-center">
                        <select
                          value={row.rawMaterialId}
                          onChange={(e) => updateMaterialUsageRow(index, 'rawMaterialId', e.target.value)}
                          required
                          disabled={submitting}
                          className={`${inputClass.replace('w-full ', '')} flex-1 min-w-0`}
                        >
                          <option value="" disabled>
                            Select material...
                          </option>
                          {rawMaterials
                            .filter((m) => !excluded.has(String(m.id)) || String(m.id) === row.rawMaterialId)
                            .map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.unit})
                              </option>
                            ))}
                        </select>
                        <span className="w-14 shrink-0 text-center text-[0.72rem] font-bold uppercase tracking-[0.03em] text-[#545454]">
                          {selectedUnit ?? '—'}
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={row.quantity}
                          onChange={(e) => updateMaterialUsageRow(index, 'quantity', e.target.value)}
                          placeholder="e.g. 2.8"
                          required
                          disabled={submitting}
                          className={`${inputClass.replace('w-full ', '')} w-[90px] shrink-0`}
                        />
                        <button
                          type="button"
                          onClick={() => removeMaterialUsageRow(index)}
                          disabled={submitting}
                          className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border border-[rgba(239,68,68,0.25)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors duration-200 disabled:opacity-60 cursor-pointer"
                          title="Remove"
                        >
                          <i className="fa-solid fa-trash" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 pl-1">
                        <span className="text-[0.68rem] font-bold uppercase tracking-[0.03em] text-[#545454] shrink-0">
                          Consumed at:
                        </span>
                        <select
                          value={row.taskId}
                          onChange={(e) => updateMaterialUsageRow(index, 'taskId', e.target.value)}
                          disabled={submitting}
                          className={`${inputClass.replace('w-full ', '')} flex-1 min-w-0 !py-1 !text-[0.78rem]`}
                        >
                          <option value="">Not assigned yet</option>
                          {tasks.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454]">
                Artisan Wages (Payout — ৳)
              </h4>
              <button
                type="button"
                onClick={addTaskRateRow}
                disabled={submitting || tasks.length === 0}
                className="h-7 px-2 flex items-center gap-1 rounded-lg border border-[#e8e8e8] text-[#545454] font-bold text-[0.72rem] hover:bg-[#f8fafc] hover:text-[#1E1E1E] transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                <i className="fa-solid fa-plus" />
                Add Task
              </button>
            </div>

            {tasksError && <p className="text-[0.8rem] font-semibold text-[#ef4444] mb-2">{tasksError}</p>}

            {form.taskRates.length === 0 ? (
              <p className="text-[0.8rem] font-medium text-[#545454]">
                No tasks assigned yet -- click "Add Task" to pay artisans for a step on this recipe.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {form.taskRates.map((row, index) => {
                  const excluded = usedTaskIds(index);
                  return (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={row.sequence}
                        onChange={(e) => updateTaskRateRow(index, 'sequence', e.target.value)}
                        placeholder="Step"
                        title="Pipeline step number (optional) -- e.g. 1 = first step"
                        disabled={submitting}
                        className={`${inputClass.replace('w-full ', '')} w-[64px] shrink-0`}
                      />
                      <select
                        value={row.taskId}
                        onChange={(e) => updateTaskRateRow(index, 'taskId', e.target.value)}
                        required
                        disabled={submitting}
                        className={`${inputClass.replace('w-full ', '')} flex-1 min-w-0`}
                      >
                        <option value="" disabled>
                          Select task...
                        </option>
                        {tasks
                          .filter((t) => !excluded.has(String(t.id)) || String(t.id) === row.taskId)
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                      </select>
                      <input
                        type="number"
                        step="any"
                        value={row.rate}
                        onChange={(e) => updateTaskRateRow(index, 'rate', e.target.value)}
                        placeholder="e.g. 55"
                        required
                        disabled={submitting}
                        className={`${inputClass.replace('w-full ', '')} w-[110px] shrink-0`}
                      />
                      <button
                        type="button"
                        onClick={() => removeTaskRateRow(index)}
                        disabled={submitting}
                        className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border border-[rgba(239,68,68,0.25)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors duration-200 disabled:opacity-60 cursor-pointer"
                        title="Remove"
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {formError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{formError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeModal}
              disabled={submitting}
              className="h-10 px-4 rounded-lg border border-[#e8e8e8] text-[#545454] font-bold text-[0.875rem] hover:bg-[#f8fafc] transition-colors duration-200 disabled:opacity-60 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 px-4 flex items-center gap-2 rounded-lg bg-[#e21e53] text-white font-bold text-[0.875rem] transition-all duration-200 hover:bg-[#c01745] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              <i className={`fa-solid ${submitting ? 'fa-spinner fa-spin' : 'fa-save'}`} />
              {submitting ? 'Saving...' : editingId != null ? 'Save Changes' : 'Create Recipe'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
