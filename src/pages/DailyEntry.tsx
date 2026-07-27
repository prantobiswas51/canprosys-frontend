import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import MultiSelect from '../components/MultiSelect';

const API_URL = import.meta.env.VITE_API_URL;

interface TaskOption {
  id: number;
  name: string;
  slug: string;
  pricePerUnit: number;
}

interface EmployeeOption {
  id: number;
  name: string;
}

interface RecipeOption {
  id: number;
  product: string;
  sizeNameEnglish: string;
}

interface DailyEntryRecord {
  id: number;
  task: TaskOption;
  employees: EmployeeOption[];
  weightKg: number;
  productName?: string;
  createdAt: string;
}

// Raw material prep tasks -- no product has been chosen yet at this stage,
// so the Product Name field doesn't apply to them.
const PRODUCT_NOT_APPLICABLE_SLUGS = ['wood_slicing', 'corner_cutting'];

const inputClass =
  'w-full bg-white border border-[#e8e8e8] text-[#1E1E1E] px-[0.85rem] py-[0.65rem] rounded-lg text-[0.875rem] font-medium transition-all duration-200 outline-none focus:border-[#e21e53] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] disabled:opacity-60 disabled:cursor-not-allowed';

const cardClass =
  'bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]';

export default function DailyEntry() {
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [recipes, setRecipes] = useState<RecipeOption[]>([]);
  const [entries, setEntries] = useState<DailyEntryRecord[]>([]);

  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const [taskId, setTaskId] = useState('');
  const [employeeIds, setEmployeeIds] = useState<number[]>([]);
  const [weightKg, setWeightKg] = useState('');
  const [recipeId, setRecipeId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true);
    setOptionsError(null);
    try {
      const [tasksRes, employeesRes, recipesRes] = await Promise.all([
        axios.get<TaskOption[]>(`${API_URL}/tasks`),
        axios.get<EmployeeOption[]>(`${API_URL}/employees`),
        axios.get<RecipeOption[]>(`${API_URL}/recipes`),
      ]);
      setTasks(tasksRes.data);
      setEmployees(employeesRes.data);
      setRecipes(recipesRes.data);
    } catch (err) {
      setOptionsError(
        axios.isAxiosError(err) && err.response
          ? `Failed to load tasks/employees: ${err.response.status}`
          : 'Could not reach the server. Check the console.'
      );
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
      setListError(
        axios.isAxiosError(err) && err.response
          ? `Failed to load daily entries: ${err.response.status}`
          : 'Could not reach the server. Check the console.'
      );
      console.error('Failed to load daily entries', err);
    } finally {
      setLoadingEntries(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
    loadEntries();
  }, [loadOptions, loadEntries]);

  const selectedTask = tasks.find((t) => String(t.id) === taskId);
  const isProductApplicable = !!selectedTask && !PRODUCT_NOT_APPLICABLE_SLUGS.includes(selectedTask.slug);

  const handleTaskChange = (value: string) => {
    setTaskId(value);
    setRecipeId('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setSuccess(false);

    if (employeeIds.length === 0) {
      setFormError('Select at least one artisan.');
      return;
    }

    if (isProductApplicable && !recipeId) {
      setFormError('Select a product for this task.');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/daily-entries`, {
        taskId: Number(taskId),
        employeeIds,
        weightKg: Number(weightKg),
        recipeId: isProductApplicable ? Number(recipeId) : undefined,
      });
      setSuccess(true);
      setTaskId('');
      setEmployeeIds([]);
      setWeightKg('');
      setRecipeId('');
      loadEntries();
    } catch (err) {
      setFormError(
        axios.isAxiosError(err) && err.response
          ? `Failed to save entry: ${err.response.status}`
          : 'Could not reach the server. Check the console.'
      );
      console.error('Failed to save daily entry', err);
    } finally {
      setSubmitting(false);
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
        <h3 className="text-base font-extrabold border-b border-[#e8e8e8] pb-2 mb-4 text-[#1E1E1E]">
          <i className="fa-solid fa-square-plus mr-[0.4rem] text-[#e21e53]" />
          New Daily Entry
        </h3>

        {optionsError && <p className="mb-3 text-[0.8rem] font-semibold text-[#ef4444]">{optionsError}</p>}

        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 md:items-end">
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

          {isProductApplicable && (
            <div className="flex flex-col gap-[0.4rem] flex-1 min-w-[180px]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Product Name</label>
              <select
                value={recipeId}
                onChange={(e) => setRecipeId(e.target.value)}
                required
                disabled={loadingOptions || submitting}
                className={inputClass}
              >
                <option value="" disabled>
                  Select a product...
                </option>
                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.product} ({recipe.sizeNameEnglish})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-[0.4rem] flex-1 min-w-[180px]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Select Artisan</label>
            <MultiSelect
              options={employees.map((employee) => ({ id: employee.id, label: employee.name }))}
              selectedIds={employeeIds}
              onChange={setEmployeeIds}
              placeholder="Select artisan(s)..."
              disabled={loadingOptions || submitting}
            />
          </div>

          <div className="flex flex-col gap-[0.4rem] w-full sm:w-[160px]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Unit (kg/Pieces)</label>
            <input
              type="number"
              step="any"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="e.g. 12.5"
              required
              disabled={submitting}
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || loadingOptions}
            className="h-10 w-full sm:w-[140px] flex items-center justify-center gap-2 rounded-lg bg-[#e21e53] text-white font-bold text-[0.875rem] transition-all duration-200 hover:bg-[#c01745] hover:-translate-y-px hover:shadow-[0_6px_14px_rgba(226,30,83,0.25)] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none cursor-pointer"
          >
            <i className={`fa-solid ${submitting ? 'fa-spinner fa-spin' : 'fa-save'}`} />
            {submitting ? 'Saving...' : 'Add Entry'}
          </button>
        </form>

        {formError && <p className="mt-3 text-[0.8rem] font-semibold text-[#ef4444]">{formError}</p>}
        {success && <p className="mt-3 text-[0.8rem] font-semibold text-[#10b981]">Daily entry saved.</p>}
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
                  <th className="py-2 pr-4 font-bold">Created At</th>
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
                    <td className="py-3 pr-4 text-[#545454] text-center">{entry.weightKg}</td>
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
