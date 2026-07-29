import { useState, useEffect, useCallback } from 'react';
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

interface RecipeTaskRate {
  id: number;
  taskId: number;
  taskName: string;
  rate: number;
}

interface RecipeMaterialUsage {
  id: number;
  rawMaterialId: number;
  rawMaterialName: string;
  rawMaterialUnit: string;
  quantity: number;
}

interface Recipe {
  id: number;
  product: string;
  sku: string;
  taskRates: RecipeTaskRate[];
  materialUsages: RecipeMaterialUsage[];
}

// Form-only row shapes -- ids/values stay as strings while being edited so
// an empty input isn't forced to "0".
interface TaskRateFormRow {
  taskId: string;
  rate: string;
}

interface MaterialUsageFormRow {
  rawMaterialId: string;
  quantity: string;
}

interface RecipeFormState {
  product: string;
  sku: string;
  taskRates: TaskRateFormRow[];
  materialUsages: MaterialUsageFormRow[];
}

const emptyForm: RecipeFormState = {
  product: '',
  sku: '',
  taskRates: [],
  materialUsages: [],
};

const inputClass =
  'w-full bg-white border border-[#e8e8e8] text-[#1E1E1E] px-[0.85rem] py-[0.65rem] rounded-lg text-[0.875rem] font-medium transition-all duration-200 outline-none focus:border-[#e21e53] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] disabled:opacity-60 disabled:cursor-not-allowed';

const cardClass =
  'bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]';

export default function Recipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [tasksError, setTasksError] = useState<string | null>(null);

  const [rawMaterials, setRawMaterials] = useState<RawMaterialOption[]>([]);
  const [rawMaterialsError, setRawMaterialsError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<RecipeFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  useEffect(() => {
    fetchRecipes();
    fetchTasks();
    fetchRawMaterials();
  }, [fetchRecipes, fetchTasks, fetchRawMaterials]);

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
      taskRates: recipe.taskRates.map((tr) => ({
        taskId: String(tr.taskId),
        rate: String(tr.rate),
      })),
      materialUsages: recipe.materialUsages.map((mu) => ({
        rawMaterialId: String(mu.rawMaterialId),
        quantity: String(mu.quantity),
      })),
    });
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
  };

  const handleChange = (field: keyof Pick<RecipeFormState, 'product' | 'sku'>, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addTaskRateRow = () => {
    setForm((prev) => ({ ...prev, taskRates: [...prev.taskRates, { taskId: '', rate: '' }] }));
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
      materialUsages: [...prev.materialUsages, { rawMaterialId: '', quantity: '' }],
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
      taskRates: form.taskRates.map((row) => ({
        taskId: Number(row.taskId),
        rate: Number(row.rate),
      })),
      materialUsages: form.materialUsages.map((row) => ({
        rawMaterialId: Number(row.rawMaterialId),
        quantity: Number(row.quantity),
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
        <button
          type="button"
          onClick={openCreateModal}
          className="h-10 px-4 flex items-center gap-2 rounded-lg bg-[#e21e53] text-white font-bold text-[0.875rem] transition-all duration-200 hover:bg-[#c01745] hover:-translate-y-px hover:shadow-[0_6px_14px_rgba(226,30,83,0.25)] cursor-pointer"
        >
          <i className="fa-solid fa-flask" />
          Add Recipe
        </button>
      </div>

      {loading && <p className="text-[0.8rem] font-semibold text-[#545454]">Loading recipes...</p>}

      {!loading && listError && (
        <p className="text-[0.8rem] font-semibold text-[#ef4444]">{listError}</p>
      )}

      {!loading && !listError && recipes.length === 0 && (
        <p className="text-[0.8rem] font-semibold text-[#545454]">No recipes yet. Add your first one.</p>
      )}

      {!loading && !listError && recipes.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
          {recipes.map((recipe) => (
            <div key={recipe.id} className={`${cardClass} flex flex-col justify-between`}>
              <div>
                <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3 mb-3">
                  <h3 className="text-[1.15rem] font-bold text-[#e21e53]">{recipe.product}</h3>
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
                        className="flex items-center gap-[0.35rem] rounded-lg border border-[#e8e8e8] bg-[#f8fafc] px-2 py-2 text-[0.8rem] font-semibold text-[#1E1E1E]"
                      >
                        <i className="fa-solid fa-cube w-4 text-center text-[#545454]" />
                        <span>
                          {mu.rawMaterialName}: {mu.quantity} {mu.rawMaterialUnit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-[0.72rem] font-bold uppercase tracking-[0.05em] text-[#545454] mt-4 mb-2">
                  Artisan Wages (Payout — ৳)
                </p>
                {recipe.taskRates.length === 0 ? (
                  <p className="text-[0.8rem] font-medium text-[#545454]">No tasks assigned yet.</p>
                ) : (
                  <div className="flex flex-col gap-[0.35rem]">
                    {recipe.taskRates.map((tr, i) => (
                      <div
                        key={tr.id}
                        className={`flex justify-between text-[0.85rem] ${
                          i < recipe.taskRates.length - 1 ? 'border-b border-dashed border-[#e8e8e8] pb-1' : ''
                        }`}
                      >
                        <span className="text-[#545454]">{tr.taskName}</span>
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
                    <div key={index} className="flex gap-2 items-center">
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
