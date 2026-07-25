import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const inputClass =
  'w-full bg-white border border-[#e8e8e8] text-[#1E1E1E] px-[0.85rem] py-[0.65rem] rounded-lg text-[0.875rem] font-medium transition-all duration-200 outline-none focus:border-[#e21e53] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] disabled:opacity-60 disabled:cursor-not-allowed';

const cardClass =
  'bg-white backdrop-blur-md border border-[#e8e8e8] rounded-xl p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)]';

const API_URL = import.meta.env.VITE_API_URL;

interface SavedTask {
  id?: string;
  _id?: string;
  name: string;
  pricePerUnit: number;
}

export default function Task() {
  // ---- Create form state ----
  const [taskName, setName] = useState('');
  const [PricePerUnit, setPricePerUnit] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ---- Task View (list) state ----
  const [tasks, setTasks] = useState<SavedTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    setListError(null);
    try {
      const res = await axios.get<SavedTask[]>(`${API_URL}/tasks`);
      setTasks(res.data);
    } catch (err) {
      setListError(
        axios.isAxiosError(err) && err.response
          ? `Failed to load tasks: ${err.response.status}`
          : 'Could not reach the server. Check the console.'
      );
      console.error('Failed to load tasks', err);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const saveTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    try {
      await axios.post(`${API_URL}/tasks`, {
        name: taskName,
        pricePerUnit: Number(PricePerUnit),
      });
      setSuccess(true);
      setName('');
      setPricePerUnit('');
      fetchTasks();
    } catch (err) {
      setError(
        axios.isAxiosError(err) && err.response
          ? `Failed to create task: ${err.response.status}`
          : 'Could not reach the server. Check the console.'
      );
      console.error('Failed to create task', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="pb-4">
        <h2 className="text-[1.4rem] font-extrabold text-[#1E1E1E] mb-2">Tasks</h2>
        <p className="text-[0.9rem] text-[#545454]">Manage Tasks of Production House</p>
      </div>

      <div className="flex w-full gap-6 items-start">
        {/* Left: Task View - 60% */}
        <div className={`${cardClass} w-[60%] min-w-0 flex flex-col gap-4`}>
          <h3 className="text-base font-extrabold border-b border-[#e8e8e8] pb-2 m-0 text-[#1E1E1E]">
            <i className="fa-solid fa-layer-group mr-[0.4rem] text-[#161138]" />
            All Tasks
          </h3>

          {loadingTasks && (
            <p className="text-[0.8rem] font-semibold text-[#545454]">Loading tasks...</p>
          )}

          {!loadingTasks && listError && (
            <p className="text-[0.8rem] font-semibold text-[#ef4444]">{listError}</p>
          )}

          {!loadingTasks && !listError && tasks.length === 0 && (
            <p className="text-[0.8rem] font-semibold text-[#545454]">No tasks saved yet.</p>
          )}

          {!loadingTasks && !listError && tasks.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-[0.875rem]">
              {tasks.map((task) => (
                <div
                  key={task.id ?? task._id ?? task.name}
                  className="flex flex-col items-center justify-center gap-2 py-5 px-4 rounded-lg border-[1.5px] border-[#e8e8e8] bg-white shadow-none transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-[1.2rem] bg-[#f8fafc] text-[#545454] transition-all duration-200">
                    <i className="fa-solid fa-briefcase" />
                  </div>
                  <span className="text-[0.8rem] font-extrabold text-[#1E1E1E] text-center">
                    {task.name}
                  </span>
                  <span className="text-[0.7rem] font-bold text-[#545454]">
                    <span className="text-xl font-bold">৳</span> {task.pricePerUnit} / unit
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Create Task form - 40% */}
        <div className={`${cardClass} w-[40%] min-w-0`}>
          <div className="border-b border-[#e8e8e8] pb-2 mb-4">
            <h3 className="text-base font-extrabold flex items-center gap-2 text-[#1E1E1E]">
              <i className="fa-solid fa-square-plus text-[#e21e53]" />
              Create New Task
            </h3>
          </div>

          <form onSubmit={saveTask} className="flex flex-col gap-4">
            <div className="flex flex-col gap-[0.4rem]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Task Name</label>
              <input
                type="text"
                value={taskName}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Wood Slicing"
                required
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-[0.4rem]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Price Per Unit</label>
              <input
                type="number"
                step="any"
                value={PricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                placeholder="e.g. 30"
                required
                className={inputClass}
              />
            </div>

            {error && (
              <p className="text-[0.8rem] font-semibold text-[#ef4444]">{error}</p>
            )}
            {success && (
              <p className="text-[0.8rem] font-semibold text-[#10b981]">Task created successfully.</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-10 mt-2 flex items-center justify-center gap-2 rounded-lg bg-[#e21e53] text-white font-bold text-[0.875rem] transition-all duration-200 hover:bg-[#c01745] hover:-translate-y-px hover:shadow-[0_6px_14px_rgba(226,30,83,0.25)] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              <i className={`fa-solid ${submitting ? 'fa-spinner fa-spin' : 'fa-save'}`} />
              {submitting ? 'Saving...' : 'Save Task'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
