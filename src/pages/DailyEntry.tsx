import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import MultiSelect from '../components/MultiSelect';
import Modal from '../components/Modal';
import { getApiErrorMessage } from '../utils/apiError';
import { formatQty } from '../utils/formatNumber';

const API_URL = import.meta.env.VITE_API_URL;

interface TaskOption {
  id: number;
  name: string;
  slug: string;
  pricePerUnit: number | null;
  requiresProduct: boolean;
}

interface EmployeeOption {
  id: number;
  name: string;
  status: 'active' | 'inactive';
}

interface RecipeOption {
  id: number;
  product: string;
  sku: string;
}

// One row in the "New Daily Entry" form -- kept as an array so the form can
// hold as many rows as needed and save them all in one go, instead of one
// entry at a time (same "form is an array of rows" pattern already used for
// Recipes' Artisan Wages/Materials rows). Task, artisan(s), and date are
// picked ONCE for the whole form (state below) -- only product + unit vary
// row to row, e.g. logging several different products finished by the same
// artisan(s) doing the same task on the same day.
interface EntryRow {
  weightKg: string;
  recipeId: string;
}

const emptyEntryRow: EntryRow = { weightKg: '', recipeId: '' };

interface DailyEntryRecord {
  id: number;
  task: TaskOption;
  employees: EmployeeOption[];
  weightKg: number;
  recipeId?: number;
  productName?: string;
  entryDate?: string;
  createdAt: string;
}

// -- Wood Processing Entry (moved here from the Wood Processing page so
// artisans can log either kind of daily work from one screen; stock,
// purchases, and stage configuration still live on Wood Processing) --
interface WoodTypeOption {
  id: number;
  name: string;
  unit: string;
}

interface WasteTypeOption {
  id: number;
  name: string;
}

interface WoodStageOption {
  id: number;
  name: string;
  inputTypeId: number;
  inputType: WoodTypeOption;
  outputTypeId: number;
  outputType: WoodTypeOption;
  wageRatePerUnit: number;
  sequence: number;
  mirrorToRawMaterialId?: number;
  defaultWasteTypeId?: number;
  defaultWasteType?: WasteTypeOption;
  active: boolean;
}

interface WoodEntryFormState {
  stageId: string;
  employeeIds: number[];
  consumedQuantity: string;
  wasteQuantity: string;
  wasteTypeId: string;
  entryDate: string;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const emptyWoodEntryForm: WoodEntryFormState = {
  stageId: '',
  employeeIds: [],
  consumedQuantity: '',
  wasteQuantity: '',
  wasteTypeId: '',
  entryDate: today(),
};

const inputClass =
  'w-full bg-white border border-[#e8e8e8] text-[#1E1E1E] px-[0.85rem] py-[0.65rem] rounded-lg text-[0.875rem] font-medium transition-all duration-200 outline-none focus:border-[#e21e53] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] disabled:opacity-60 disabled:cursor-not-allowed';

const cardClass =
  'bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]';

const primaryBtnClass =
  'h-10 px-4 flex items-center gap-2 rounded-lg bg-[#e21e53] text-white font-bold text-[0.875rem] transition-all duration-200 hover:bg-[#c01745] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer';

export default function DailyEntry() {
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [recipes, setRecipes] = useState<RecipeOption[]>([]);
  const [entries, setEntries] = useState<DailyEntryRecord[]>([]);

  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  // Task, artisan(s), and date are picked once for the whole form -- every
  // row saved together shares these same three values.
  const [taskId, setTaskId] = useState('');
  const [employeeIds, setEmployeeIds] = useState<number[]>([]);
  const [entryDate, setEntryDate] = useState(today());

  const [entryRows, setEntryRows] = useState<EntryRow[]>([emptyEntryRow]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit modal state -- separate from the create form above so editing one
  // entry can't accidentally clobber whatever's half-typed into "New Daily
  // Entry" (or vice versa).
  const [editingEntry, setEditingEntry] = useState<DailyEntryRecord | null>(null);
  const [editTaskId, setEditTaskId] = useState('');
  const [editEmployeeIds, setEditEmployeeIds] = useState<number[]>([]);
  const [editWeightKg, setEditWeightKg] = useState('');
  const [editRecipeId, setEditRecipeId] = useState('');
  const [editEntryDate, setEditEntryDate] = useState(today());
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // -- Wood Processing Entry state (see interfaces above) --
  const [woodStages, setWoodStages] = useState<WoodStageOption[]>([]);
  const [wasteTypes, setWasteTypes] = useState<WasteTypeOption[]>([]);
  const [woodEntryForm, setWoodEntryForm] = useState<WoodEntryFormState>(emptyWoodEntryForm);
  const [woodEntrySubmitting, setWoodEntrySubmitting] = useState(false);
  const [woodEntryFormError, setWoodEntryFormError] = useState<string | null>(null);
  const [woodEntrySuccess, setWoodEntrySuccess] = useState(false);

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true);
    setOptionsError(null);
    try {
      const [tasksRes, employeesRes, recipesRes, woodStagesRes, wasteTypesRes] = await Promise.all([
        axios.get<TaskOption[]>(`${API_URL}/tasks`),
        axios.get<EmployeeOption[]>(`${API_URL}/employees`),
        axios.get<RecipeOption[]>(`${API_URL}/recipes`),
        axios.get<WoodStageOption[]>(`${API_URL}/wood-stages`),
        axios.get<WasteTypeOption[]>(`${API_URL}/waste-types`),
      ]);
      setTasks(tasksRes.data);
      setEmployees(employeesRes.data);
      setRecipes(recipesRes.data);
      setWoodStages(woodStagesRes.data);
      setWasteTypes(wasteTypesRes.data);
    } catch (err) {
      setOptionsError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to load tasks/employees', err);
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  const loadEntries = useCallback(async () => {
    setLoadingEntries(true);
    setListError(null);
    try {
      const res = await axios.get<DailyEntryRecord[]>(`${API_URL}/daily-entries`);
      setEntries(res.data);
    } catch (err) {
      setListError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to load daily entries', err);
    } finally {
      setLoadingEntries(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
    loadEntries();
  }, [loadOptions, loadEntries]);

  // Inactive employees can't be assigned new work -- filtered out of the
  // picker here as well as rejected server-side, so there's no dead-end
  // where someone picks an inactive artisan and only finds out on submit.
  const activeEmployees = employees.filter((e) => e.status === 'active');

  // Whether the form's single selected task needs a product/recipe picked --
  // one answer for the whole form now, not per row.
  const selectedTask = tasks.find((t) => String(t.id) === taskId);
  const productApplicable = !!selectedTask && selectedTask.requiresProduct;

  const handleTaskChange = (value: string) => {
    // Changing the task can change whether a product applies at all --
    // clear whatever every row had picked so a stale recipe never gets
    // submitted for a task that no longer needs one.
    setTaskId(value);
    setEntryRows((prev) => prev.map((row) => ({ ...row, recipeId: '' })));
  };

  const updateRow = (index: number, field: keyof EntryRow, value: string) => {
    setEntryRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const addRow = () => {
    setEntryRows((prev) => [...prev, emptyEntryRow]);
  };

  const removeRow = (index: number) => {
    setEntryRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);

    if (!taskId) {
      setFormError('Select a task.');
      return;
    }
    if (employeeIds.length === 0) {
      setFormError('Select at least one artisan.');
      return;
    }
    if (!entryDate) {
      setFormError('Select a date.');
      return;
    }
    for (let i = 0; i < entryRows.length; i++) {
      const row = entryRows[i];
      if (!row.weightKg) {
        setFormError(`Row ${i + 1}: enter a quantity.`);
        return;
      }
      if (productApplicable && !row.recipeId) {
        setFormError(`Row ${i + 1}: select a product.`);
        return;
      }
    }

    setSubmitting(true);
    // Sequential, not Promise.all -- rows can draw from/credit the same
    // recipe stage's WIP stock, so they need to apply one at a time in the
    // order entered rather than racing each other.
    const failures: string[] = [];
    const failedRows: EntryRow[] = [];
    let savedCount = 0;
    for (let i = 0; i < entryRows.length; i++) {
      const row = entryRows[i];
      try {
        await axios.post(`${API_URL}/daily-entries`, {
          taskId: Number(taskId),
          employeeIds,
          weightKg: Number(row.weightKg),
          recipeId: productApplicable ? Number(row.recipeId) : undefined,
          entryDate,
        });
        savedCount++;
      } catch (err) {
        failures.push(`Row ${i + 1}: ${getApiErrorMessage(err, 'failed')}`);
        failedRows.push(row);
        console.error(`Failed to save daily entry row ${i + 1}`, err);
      }
    }

    if (failures.length === 0) {
      setSuccess(`${savedCount} ${savedCount === 1 ? 'entry' : 'entries'} saved.`);
      setEntryRows([emptyEntryRow]);
    } else {
      // Leave only the rows that failed in the form (renumbered) so
      // whatever already saved doesn't need to be re-entered -- just fix
      // and resubmit what's left.
      setEntryRows(failedRows);
      setFormError(`${savedCount} of ${entryRows.length} saved. ${failures.join(' ')}`);
    }
    loadEntries();
    setSubmitting(false);
  };

  // -- Wood Processing Entry handlers --
  const woodSelectedStage = woodStages.find((s) => String(s.id) === woodEntryForm.stageId);
  const woodConsumedNum = Number(woodEntryForm.consumedQuantity) || 0;
  const woodWasteNum = Number(woodEntryForm.wasteQuantity) || 0;
  const woodDerivedOutput = woodConsumedNum - woodWasteNum;
  const woodNeedsWasteType =
    woodWasteNum > 0 && !woodSelectedStage?.defaultWasteTypeId && !woodEntryForm.wasteTypeId;

  const handleWoodEntryChange = (field: keyof WoodEntryFormState, value: string) => {
    setWoodEntryForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleWoodEntrySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setWoodEntryFormError(null);
    setWoodEntrySuccess(false);

    if (!woodEntryForm.stageId) {
      setWoodEntryFormError('Select a processing stage.');
      return;
    }
    if (woodEntryForm.employeeIds.length === 0) {
      setWoodEntryFormError('Select at least one artisan.');
      return;
    }
    if (!woodConsumedNum || woodConsumedNum <= 0) {
      setWoodEntryFormError('Enter how much was taken from stock (weight before processing).');
      return;
    }
    if (woodWasteNum >= woodConsumedNum) {
      setWoodEntryFormError('Waste must be less than the quantity taken -- there has to be some good output.');
      return;
    }
    if (woodNeedsWasteType) {
      setWoodEntryFormError('This stage has no default waste type -- pick one for the waste produced.');
      return;
    }

    setWoodEntrySubmitting(true);
    try {
      await axios.post(`${API_URL}/wood-processing-entries`, {
        stageId: Number(woodEntryForm.stageId),
        employeeIds: woodEntryForm.employeeIds,
        consumedQuantity: woodConsumedNum,
        wasteQuantity: woodWasteNum,
        wasteTypeId: woodEntryForm.wasteTypeId ? Number(woodEntryForm.wasteTypeId) : undefined,
        entryDate: woodEntryForm.entryDate,
      });
      setWoodEntrySuccess(true);
      setWoodEntryForm({ ...emptyWoodEntryForm, entryDate: woodEntryForm.entryDate });
    } catch (err) {
      setWoodEntryFormError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to save wood processing entry', err);
    } finally {
      setWoodEntrySubmitting(false);
    }
  };

  const openEdit = (entry: DailyEntryRecord) => {
    setEditingEntry(entry);
    setEditTaskId(String(entry.task.id));
    setEditEmployeeIds(entry.employees.map((e) => e.id));
    setEditWeightKg(String(entry.weightKg));
    setEditRecipeId(entry.recipeId ? String(entry.recipeId) : '');
    // Fall back to the entry's real createdAt date -- NOT today() -- for old
    // entries saved before entryDate existed. Defaulting to today here would
    // silently move an old entry's payout into the current month the moment
    // someone opens and saves an unrelated edit (e.g. fixing a typo).
    setEditEntryDate(entry.entryDate ? entry.entryDate.slice(0, 10) : entry.createdAt.slice(0, 10));
    setEditError(null);
  };

  const closeEdit = () => {
    setEditingEntry(null);
    setEditError(null);
  };

  const editSelectedTask = tasks.find((t) => String(t.id) === editTaskId);
  const editIsProductApplicable = !!editSelectedTask && editSelectedTask.requiresProduct;

  const handleEditTaskChange = (value: string) => {
    setEditTaskId(value);
    setEditRecipeId('');
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingEntry) return;
    setEditError(null);

    if (editEmployeeIds.length === 0) {
      setEditError('Select at least one artisan.');
      return;
    }
    if (editIsProductApplicable && !editRecipeId) {
      setEditError('Select a product for this task.');
      return;
    }

    setEditSubmitting(true);
    try {
      await axios.patch(`${API_URL}/daily-entries/${editingEntry.id}`, {
        taskId: Number(editTaskId),
        employeeIds: editEmployeeIds,
        weightKg: Number(editWeightKg),
        recipeId: editIsProductApplicable ? Number(editRecipeId) : undefined,
        entryDate: editEntryDate,
      });
      closeEdit();
      loadEntries();
    } catch (err) {
      setEditError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to update daily entry', err);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (entry: DailyEntryRecord) => {
    if (!window.confirm(`Delete this "${entry.task?.name ?? 'entry'}" entry? This reverses any stock and payout changes it made.`)) {
      return;
    }
    setDeleteError(null);
    setDeletingId(entry.id);
    try {
      await axios.delete(`${API_URL}/daily-entries/${entry.id}`);
      loadEntries();
    } catch (err) {
      setDeleteError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to delete daily entry', err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="pb-4">
        <h2 className="text-[1.4rem] font-extrabold text-[#1E1E1E] mb-2">Daily Entry</h2>
        <p className="text-[0.9rem] text-[#545454]">Log today's production, slicing and cutting entries here.</p>
      </div>

      {/* New entry form -- full width */}
      <div className={`${cardClass} w-full mb-6`}>
        <div className="flex items-center justify-between gap-3 border-b border-[#e8e8e8] pb-2 mb-4">
          <h3 className="text-base font-extrabold text-[#1E1E1E]">
            <i className="fa-solid fa-square-plus mr-[0.4rem] text-[#e21e53]" />
            New Daily Entry
          </h3>
        </div>

        {optionsError && <p className="mb-3 text-[0.8rem] font-semibold text-[#ef4444]">{optionsError}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Picked once for the whole batch of rows below */}
          <div className="flex flex-wrap gap-4 md:items-end rounded-lg border border-[#e8e8e8] bg-[#f8fafc] p-3">
            <div className="flex flex-col gap-[0.4rem] flex-1 min-w-[180px]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Task Name</label>
              <select
                value={taskId}
                onChange={(e) => handleTaskChange(e.target.value)}
                required
                disabled={loadingOptions || submitting}
                className={inputClass}
              >
                <option value="" disabled>
                  Select a task...
                </option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-[0.4rem] flex-1 min-w-[220px]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Select Artisan</label>
              <MultiSelect
                options={activeEmployees.map((employee) => ({ id: employee.id, label: employee.name }))}
                selectedIds={employeeIds}
                onChange={setEmployeeIds}
                placeholder="Select artisan(s)..."
                disabled={loadingOptions || submitting}
              />
            </div>

            <div className="flex flex-col gap-[0.4rem] w-full sm:w-[160px]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Date</label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                disabled={submitting}
                className={inputClass}
              />
            </div>
          </div>

          {/* One row per product -- only these two vary */}
          <div className="flex flex-col gap-3">
            {entryRows.map((row, index) => (
              <div
                key={index}
                className="flex flex-wrap gap-4 md:items-end rounded-lg border border-[#e8e8e8] bg-[#f8fafc] p-3"
              >
                {productApplicable && (
                  <div className="flex flex-col gap-[0.4rem] flex-1 min-w-[220px]">
                    {index === 0 && <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Product Name</label>}
                    <select
                      value={row.recipeId}
                      onChange={(e) => updateRow(index, 'recipeId', e.target.value)}
                      required
                      disabled={loadingOptions || submitting}
                      className={inputClass}
                    >
                      <option value="" disabled>
                        Select a product...
                      </option>
                      {recipes.map((recipe) => (
                        <option key={recipe.id} value={recipe.id}>
                          {recipe.product} ({recipe.sku})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex flex-col gap-[0.4rem] flex-1 min-w-[160px]">
                  {index === 0 && <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Unit (kg/Pieces)</label>}
                  <input
                    type="number"
                    step="any"
                    value={row.weightKg}
                    onChange={(e) => updateRow(index, 'weightKg', e.target.value)}
                    placeholder="e.g. 12.5"
                    required
                    disabled={submitting}
                    className={inputClass}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  disabled={submitting || entryRows.length === 1}
                  title="Remove row"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e8e8e8] text-[#545454] transition-colors duration-200 hover:border-[#ef4444] hover:text-[#ef4444] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <i className="fa-solid fa-trash" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={addRow}
              disabled={submitting}
              title="Add another row"
              className="h-10 px-4 flex items-center gap-2 rounded-lg border border-dashed border-[#e21e53] text-[#e21e53] font-bold text-[0.875rem] transition-colors duration-200 hover:bg-[rgba(226,30,83,0.06)] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              <i className="fa-solid fa-plus" />
              Add Row
            </button>

            <button
              type="submit"
              disabled={submitting || loadingOptions}
              className="h-10 px-5 flex items-center justify-center gap-2 rounded-lg bg-[#e21e53] text-white font-bold text-[0.875rem] transition-all duration-200 hover:bg-[#c01745] hover:-translate-y-px hover:shadow-[0_6px_14px_rgba(226,30,83,0.25)] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none cursor-pointer"
            >
              <i className={`fa-solid ${submitting ? 'fa-spinner fa-spin' : 'fa-save'}`} />
              {submitting
                ? 'Saving...'
                : `Save ${entryRows.length > 1 ? `${entryRows.length} Entries` : 'Entry'}`}
            </button>
          </div>
        </form>

        {formError && <p className="mt-3 text-[0.8rem] font-semibold text-[#ef4444]">{formError}</p>}
        {success && <p className="mt-3 text-[0.8rem] font-semibold text-[#10b981]">{success}</p>}
      </div>

      {/* New wood processing entry -- moved here from the Wood Processing
          page so artisans can log raw-wood slicing/cutting work alongside
          regular task entries in one place. Stock, purchases, and stage
          configuration still live on the Wood Processing page. */}
      <div className={`${cardClass} w-full mb-6`}>
        <h3 className="text-base font-extrabold border-b border-[#e8e8e8] pb-2 mb-4 text-[#1E1E1E]">
          <i className="fa-solid fa-square-plus mr-[0.4rem] text-[#e21e53]" />
          New Wood Processing Entry
        </h3>

        <form onSubmit={handleWoodEntrySubmit} className="flex flex-wrap gap-4 md:items-end">
          <div className="flex flex-col gap-[0.4rem] flex-1 min-w-[220px]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Stage</label>
            <select
              value={woodEntryForm.stageId}
              onChange={(e) => handleWoodEntryChange('stageId', e.target.value)}
              required
              disabled={loadingOptions || woodEntrySubmitting}
              className={inputClass}
            >
              <option value="">Select a stage...</option>
              {woodStages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name} ({stage.inputType?.name} → {stage.outputType?.name})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-[0.4rem] flex-1 min-w-[200px]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Artisan(s)</label>
            <MultiSelect
              options={activeEmployees.map((employee) => ({ id: employee.id, label: employee.name }))}
              selectedIds={woodEntryForm.employeeIds}
              onChange={(ids) => setWoodEntryForm((prev) => ({ ...prev, employeeIds: ids }))}
              placeholder="Select artisan(s)..."
              disabled={loadingOptions || woodEntrySubmitting}
            />
          </div>

          <div className="flex flex-col gap-[0.4rem] w-full sm:w-[190px]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Quantity Taken (before processing)</label>
            <input
              type="number"
              step="any"
              value={woodEntryForm.consumedQuantity}
              onChange={(e) => handleWoodEntryChange('consumedQuantity', e.target.value)}
              placeholder="e.g. 10"
              required
              disabled={woodEntrySubmitting}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-[0.4rem] w-full sm:w-[150px]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Waste Qty</label>
            <input
              type="number"
              step="any"
              value={woodEntryForm.wasteQuantity}
              onChange={(e) => handleWoodEntryChange('wasteQuantity', e.target.value)}
              placeholder="e.g. 1"
              disabled={woodEntrySubmitting}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-[0.4rem] w-full sm:w-[150px]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Output (auto)</label>
            <div className={`${inputClass} bg-[#f8fafc] text-[#545454] flex items-center`}>
              {woodConsumedNum > 0 ? formatQty(Math.max(woodDerivedOutput, 0)) : '—'}
            </div>
          </div>

          {woodWasteNum > 0 && (
            <div className="flex flex-col gap-[0.4rem] w-full sm:w-[180px]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">
                Waste Type {woodSelectedStage?.defaultWasteTypeId ? '(override)' : ''}
              </label>
              <select
                value={woodEntryForm.wasteTypeId}
                onChange={(e) => handleWoodEntryChange('wasteTypeId', e.target.value)}
                disabled={woodEntrySubmitting}
                className={inputClass}
              >
                <option value="">
                  {woodSelectedStage?.defaultWasteType?.name
                    ? `Default: ${woodSelectedStage.defaultWasteType.name}`
                    : 'Select waste type'}
                </option>
                {wasteTypes.map((wt) => (
                  <option key={wt.id} value={wt.id}>
                    {wt.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-[0.4rem] w-full sm:w-[160px]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Date</label>
            <input
              type="date"
              value={woodEntryForm.entryDate}
              onChange={(e) => handleWoodEntryChange('entryDate', e.target.value)}
              disabled={woodEntrySubmitting}
              className={inputClass}
            />
          </div>

          <button type="submit" disabled={woodEntrySubmitting || loadingOptions} className={primaryBtnClass}>
            <i className={`fa-solid ${woodEntrySubmitting ? 'fa-spinner fa-spin' : 'fa-save'}`} />
            {woodEntrySubmitting ? 'Saving...' : 'Add Entry'}
          </button>
        </form>

        {woodEntryFormError && <p className="mt-3 text-[0.8rem] font-semibold text-[#ef4444]">{woodEntryFormError}</p>}
        {woodEntrySuccess && (
          <p className="mt-3 text-[0.8rem] font-semibold text-[#10b981]">Wood processing entry saved.</p>
        )}
      </div>

      {/* Created entries list */}
      <div className={cardClass}>
        <h3 className="text-base font-extrabold border-b border-[#e8e8e8] pb-2 mb-4 text-[#1E1E1E]">
          <i className="fa-solid fa-layer-group mr-[0.4rem] text-[#161138]" />
          Daily Entries
        </h3>

        {loadingEntries && <p className="text-[0.8rem] font-semibold text-[#545454]">Loading entries...</p>}

        {!loadingEntries && listError && (
          <p className="text-[0.8rem] font-semibold text-[#ef4444]">{listError}</p>
        )}

        {!loadingEntries && !listError && entries.length === 0 && (
          <p className="text-[0.8rem] font-semibold text-[#545454]">No daily entries yet.</p>
        )}

        {!loadingEntries && !listError && entries.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[0.85rem]">
              <thead>
                <tr className="border-b border-[#e8e8e8] text-[0.72rem] uppercase tracking-[0.05em] text-[#545454]">
                  <th className="py-2 pr-4 font-bold">Task Name</th>
                  <th className="py-2 pr-4 font-bold">Recipe</th>
                  <th className="py-2 pr-4 font-bold">Artisan(s)</th>
                  <th className="py-2 pr-4 font-bold text-center">Unit (Kg/Pieces)</th>
                  <th className="py-2 pr-4 font-bold">Date</th>
                  <th className="py-2 pr-4 font-bold">Created At</th>
                  <th className="py-2 pr-4 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-[#f1f1f1] last:border-0">
                    <td className="py-3 pr-4 font-bold text-[#1E1E1E]">{entry.task?.name ?? '—'}</td>
                    <td className="py-3 pr-4 text-[#545454]">{entry.productName ?? '—'}</td>
                    <td className="py-3 pr-4 text-[#545454]">
                      {entry.employees?.map((emp) => emp.name).join(', ') || '—'}
                    </td>
                    <td className="py-3 pr-4 text-[#545454] text-center">{formatQty(entry.weightKg)}</td>
                    <td className="py-3 pr-4 text-[#545454] whitespace-nowrap">
                      {entry.entryDate
                        ? new Date(entry.entryDate).toLocaleDateString('en-US', {
                            timeZone: 'UTC',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="py-3 pr-4 text-[#545454]">
                      {new Date(entry.createdAt).toLocaleString('en-US', {
                        timeZone: 'Asia/Dhaka',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(entry)}
                          title="Edit entry"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e8e8e8] text-[#545454] transition-colors duration-200 hover:border-[#e21e53] hover:text-[#e21e53] cursor-pointer"
                        >
                          <i className="fa-solid fa-pen" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(entry)}
                          disabled={deletingId === entry.id}
                          title="Delete entry"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e8e8e8] text-[#545454] transition-colors duration-200 hover:border-[#ef4444] hover:text-[#ef4444] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <i className={`fa-solid ${deletingId === entry.id ? 'fa-spinner fa-spin' : 'fa-trash'}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {deleteError && <p className="mt-3 text-[0.8rem] font-semibold text-[#ef4444]">{deleteError}</p>}
      </div>

      <Modal open={!!editingEntry} onClose={closeEdit} title="Edit Daily Entry">
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Task Name</label>
            <select
              value={editTaskId}
              onChange={(e) => handleEditTaskChange(e.target.value)}
              required
              disabled={editSubmitting}
              className={inputClass}
            >
              <option value="" disabled>
                Select a task...
              </option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.name}
                </option>
              ))}
            </select>
          </div>

          {editIsProductApplicable && (
            <div className="flex flex-col gap-[0.4rem]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Product Name</label>
              <select
                value={editRecipeId}
                onChange={(e) => setEditRecipeId(e.target.value)}
                required
                disabled={editSubmitting}
                className={inputClass}
              >
                <option value="" disabled>
                  Select a product...
                </option>
                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.product} ({recipe.sku})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Select Artisan</label>
            <MultiSelect
              options={activeEmployees.map((employee) => ({ id: employee.id, label: employee.name }))}
              selectedIds={editEmployeeIds}
              onChange={setEditEmployeeIds}
              placeholder="Select artisan(s)..."
              disabled={editSubmitting}
            />
          </div>

          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Unit (kg/Pieces)</label>
            <input
              type="number"
              step="any"
              value={editWeightKg}
              onChange={(e) => setEditWeightKg(e.target.value)}
              required
              disabled={editSubmitting}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Date</label>
            <input
              type="date"
              value={editEntryDate}
              onChange={(e) => setEditEntryDate(e.target.value)}
              disabled={editSubmitting}
              className={inputClass}
            />
          </div>

          {editError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{editError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeEdit}
              disabled={editSubmitting}
              className="h-10 px-4 rounded-lg border border-[#e8e8e8] text-[#545454] font-bold text-[0.875rem] transition-colors duration-200 hover:text-[#1E1E1E] disabled:opacity-60 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSubmitting}
              className="h-10 px-5 flex items-center justify-center gap-2 rounded-lg bg-[#e21e53] text-white font-bold text-[0.875rem] transition-all duration-200 hover:bg-[#c01745] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              <i className={`fa-solid ${editSubmitting ? 'fa-spinner fa-spin' : 'fa-save'}`} />
              {editSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
