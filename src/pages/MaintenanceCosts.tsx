import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getApiErrorMessage } from '../utils/apiError';

const API_URL = import.meta.env.VITE_API_URL;

interface MaintenanceCategory {
  id: number;
  name: string;
  icon: string;
}

interface MaintenanceCost {
  id: number;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  amount: number;
  costDate: string;
  remarks?: string;
  loggedByName?: string;
  createdAt: string;
}

interface CostFormState {
  categoryId: string;
  amount: string;
  costDate: string;
  remarks: string;
}

interface CategoryFormState {
  name: string;
  icon: string;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const emptyCostForm: CostFormState = {
  categoryId: '',
  amount: '',
  costDate: today(),
  remarks: '',
};

const emptyCategoryForm: CategoryFormState = {
  name: '',
  icon: '',
};

const cardClass =
  'bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]';

const inputClass =
  'w-full bg-white border border-[#e8e8e8] text-[#1E1E1E] px-[0.85rem] py-[0.65rem] rounded-lg text-[0.875rem] font-medium transition-all duration-200 outline-none focus:border-[#e21e53] focus:shadow-[0_0_0_3px_rgba(226,30,83,0.15)] disabled:opacity-60 disabled:cursor-not-allowed';

const primaryBtnClass =
  'h-10 px-4 flex items-center justify-center gap-2 rounded-lg bg-[#e21e53] text-white font-bold text-[0.875rem] transition-all duration-200 hover:bg-[#c01745] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer';

export default function MaintenanceCosts() {
  const [categories, setCategories] = useState<MaintenanceCategory[]>([]);
  const [costs, setCosts] = useState<MaintenanceCost[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [costForm, setCostForm] = useState<CostFormState>(emptyCostForm);
  const [costSubmitting, setCostSubmitting] = useState(false);
  const [costFormError, setCostFormError] = useState<string | null>(null);
  const [deletingCostId, setDeletingCostId] = useState<number | null>(null);

  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm);
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [categoryFormError, setCategoryFormError] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const [categoriesRes, costsRes] = await Promise.all([
        axios.get<MaintenanceCategory[]>(`${API_URL}/maintenance-categories`),
        axios.get<MaintenanceCost[]>(`${API_URL}/maintenance-costs`),
      ]);
      setCategories(categoriesRes.data);
      setCosts(costsRes.data);
    } catch (err) {
      setListError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to load maintenance costs', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Totals -- computed client-side from the full cost list, same approach
  // as Loans.tsx's totalLoaned, instead of a dedicated summary endpoint.
  const now = new Date();
  const currentMonthCosts = costs.filter((c) => {
    const d = new Date(c.costDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthTotal = currentMonthCosts.reduce((sum, c) => sum + c.amount, 0);
  const lifetimeTotal = costs.reduce((sum, c) => sum + c.amount, 0);

  const handleCostChange = (field: keyof CostFormState, value: string) => {
    setCostForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCostSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCostFormError(null);

    if (!costForm.categoryId) {
      setCostFormError('Select a cost category.');
      return;
    }
    if (!costForm.amount || Number(costForm.amount) <= 0) {
      setCostFormError('Enter an amount greater than zero.');
      return;
    }

    setCostSubmitting(true);
    try {
      await axios.post(`${API_URL}/maintenance-costs`, {
        categoryId: Number(costForm.categoryId),
        amount: Number(costForm.amount),
        costDate: costForm.costDate || undefined,
        remarks: costForm.remarks.trim() === '' ? undefined : costForm.remarks,
      });
      setCostForm({ ...emptyCostForm, categoryId: costForm.categoryId });
      loadAll();
    } catch (err) {
      setCostFormError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to save maintenance cost', err);
    } finally {
      setCostSubmitting(false);
    }
  };

  const handleCostDelete = async (cost: MaintenanceCost) => {
    if (!window.confirm(`Delete this ৳${cost.amount.toFixed(2)} "${cost.categoryName}" entry?`)) return;
    setDeletingCostId(cost.id);
    try {
      await axios.delete(`${API_URL}/maintenance-costs/${cost.id}`);
      loadAll();
    } catch (err) {
      alert(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to delete maintenance cost', err);
    } finally {
      setDeletingCostId(null);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCategoryFormError(null);

    if (!categoryForm.name.trim()) {
      setCategoryFormError('Category name is required.');
      return;
    }

    setCategorySubmitting(true);
    try {
      await axios.post(`${API_URL}/maintenance-categories`, {
        name: categoryForm.name.trim(),
        icon: categoryForm.icon.trim() || undefined,
      });
      setCategoryForm(emptyCategoryForm);
      loadAll();
    } catch (err) {
      setCategoryFormError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to save cost category', err);
    } finally {
      setCategorySubmitting(false);
    }
  };

  const handleCategoryDelete = async (category: MaintenanceCategory) => {
    if (!window.confirm(`Delete category "${category.name}"?`)) return;
    setDeletingCategoryId(category.id);
    try {
      await axios.delete(`${API_URL}/maintenance-categories/${category.id}`);
      loadAll();
    } catch (err) {
      alert(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to delete cost category', err);
    } finally {
      setDeletingCategoryId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-[1.4rem] font-extrabold text-[#1E1E1E] mb-2">
          <i className="fa-solid fa-money-bill-transfer mr-2 text-[#10b981]" />
          Maintenance Costs
        </h2>
        <p className="text-[0.9rem] text-[#545454]">
          Track factory operating expenses -- electricity, internet, snacks & meals, and anything else.
        </p>
      </div>

      {listError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{listError}</p>}

      {/* ══════════ STATS ══════════ */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
        <div className={`${cardClass} flex items-center gap-3`}>
          <div className="w-11 h-11 rounded-lg bg-[rgba(59,130,246,0.08)] text-[#3b82f6] flex items-center justify-center shrink-0">
            <i className="fa-solid fa-calendar-days" />
          </div>
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.05em] text-[#545454] m-0">Total Cost This Month</p>
            <p className="text-[1.3rem] font-extrabold text-[#1E1E1E] m-0">৳{monthTotal.toFixed(2)}</p>
          </div>
        </div>
        <div className={`${cardClass} flex items-center gap-3`}>
          <div className="w-11 h-11 rounded-lg bg-[rgba(16,185,129,0.08)] text-[#10b981] flex items-center justify-center shrink-0">
            <i className="fa-solid fa-vault" />
          </div>
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.05em] text-[#545454] m-0">Lifetime Total Cost</p>
            <p className="text-[1.3rem] font-extrabold text-[#1E1E1E] m-0">৳{lifetimeTotal.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* ══════════ LOGS + NEW ENTRY FORM ══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className={`${cardClass} lg:col-span-2`}>
          <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3 mb-4">
            <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E]">
              <i className="fa-solid fa-list mr-2 text-[#e21e53]" />
              Cost Logs History
            </h3>
            <span className="rounded-full bg-[rgba(59,130,246,0.1)] text-[#3b82f6] text-[0.72rem] font-extrabold px-3 py-1">
              Total: {costs.length}
            </span>
          </div>

          {loading && <p className="text-[0.8rem] font-semibold text-[#545454]">Loading...</p>}

          {!loading && costs.length === 0 && (
            <p className="text-[0.8rem] font-semibold text-[#545454]">No maintenance costs logged yet.</p>
          )}

          {!loading && costs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[0.85rem]">
                <thead>
                  <tr className="border-b border-[#e8e8e8] text-[0.72rem] uppercase tracking-[0.05em] text-[#545454]">
                    <th className="py-2 pr-3 font-bold">Date</th>
                    <th className="py-2 pr-3 font-bold">Category</th>
                    <th className="py-2 pr-3 font-bold">Remarks</th>
                    <th className="py-2 pr-3 font-bold text-right">Amount (৳)</th>
                    <th className="py-2 pr-3 font-bold">Logged By</th>
                    <th className="py-2 pr-3 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {costs.map((cost) => (
                    <tr key={cost.id} className="border-b border-[#f1f1f1] last:border-0">
                      <td className="py-3 pr-3 whitespace-nowrap font-semibold text-[#545454]">
                        {new Date(cost.costDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-3 font-bold text-[#1E1E1E]">
                        <span className="inline-flex items-center gap-2">
                          <i className={`fa-solid ${cost.categoryIcon} text-[#e21e53]`} />
                          {cost.categoryName}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-[#545454]">{cost.remarks || '—'}</td>
                      <td className="py-3 pr-3 text-right font-bold text-[#ef4444]">৳{cost.amount.toFixed(2)}</td>
                      <td className="py-3 pr-3">
                        <span className="rounded-full bg-[#f8fafc] border border-[#e8e8e8] text-[0.72rem] font-bold text-[#545454] px-2 py-[0.15rem]">
                          {cost.loggedByName || '—'}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleCostDelete(cost)}
                          disabled={deletingCostId === cost.id}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-[#e8e8e8] text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors duration-200 disabled:opacity-60 cursor-pointer"
                          title="Delete"
                        >
                          <i className={`fa-solid ${deletingCostId === cost.id ? 'fa-spinner fa-spin' : 'fa-trash'} text-[0.8rem]`} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={`${cardClass} lg:sticky lg:top-6`}>
          <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E] border-b border-[#e8e8e8] pb-3 mb-4">
            <i className="fa-solid fa-square-plus mr-2 text-[#e21e53]" />
            New Cost Entry
          </h3>
          <form onSubmit={handleCostSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-[0.4rem]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Date</label>
              <input
                type="date"
                value={costForm.costDate}
                onChange={(e) => handleCostChange('costDate', e.target.value)}
                disabled={costSubmitting}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-[0.4rem]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Cost Category</label>
              <select
                value={costForm.categoryId}
                onChange={(e) => handleCostChange('categoryId', e.target.value)}
                disabled={costSubmitting}
                className={inputClass}
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {categories.length === 0 && (
                <p className="text-[0.72rem] text-[#545454]">
                  No categories yet -- add one below first.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-[0.4rem]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Amount (৳)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={costForm.amount}
                onChange={(e) => handleCostChange('amount', e.target.value)}
                placeholder="e.g. 500"
                disabled={costSubmitting}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-[0.4rem]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Remarks (optional)</label>
              <input
                type="text"
                value={costForm.remarks}
                onChange={(e) => handleCostChange('remarks', e.target.value)}
                placeholder="What was this for?"
                disabled={costSubmitting}
                className={inputClass}
              />
            </div>
            <button type="submit" disabled={costSubmitting} className={`${primaryBtnClass} mt-1`}>
              <i className={`fa-solid ${costSubmitting ? 'fa-spinner fa-spin' : 'fa-save'}`} />
              {costSubmitting ? 'Saving...' : 'Save Entry'}
            </button>
            {costFormError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{costFormError}</p>}
          </form>
        </div>
      </div>

      {/* ══════════ CATEGORIES ══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cardClass}>
          <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E] border-b border-[#e8e8e8] pb-3 mb-4">
            <i className="fa-solid fa-tags mr-2 text-[#e21e53]" />
            Add Cost Category
          </h3>
          <p className="text-[0.75rem] text-[#545454] mb-3">
            e.g. Electricity Bill, Internet Bill, Snacks & Meals, Generator Fuel.
          </p>
          <form onSubmit={handleCategorySubmit} className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-[0.4rem] flex-1 min-w-[160px]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Name</label>
              <input
                type="text"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Electricity Bill"
                disabled={categorySubmitting}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-[0.4rem] w-[160px]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">
                Icon <span className="font-normal text-[#545454]">(optional)</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="flex h-[2.6rem] w-[2.6rem] shrink-0 items-center justify-center rounded-lg border border-[#e8e8e8] bg-[#f8fafc] text-[#e21e53]">
                  <i className={`fa-solid ${categoryForm.icon.trim() || 'fa-money-bill-wave'}`} />
                </span>
                <input
                  type="text"
                  value={categoryForm.icon}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, icon: e.target.value }))}
                  placeholder="fa-bolt"
                  disabled={categorySubmitting}
                  className={inputClass}
                />
              </div>
            </div>
            <button type="submit" disabled={categorySubmitting} className={primaryBtnClass}>
              <i className={`fa-solid ${categorySubmitting ? 'fa-spinner fa-spin' : 'fa-plus'}`} />
              Add
            </button>
          </form>
          {categoryFormError && <p className="text-[0.8rem] font-semibold text-[#ef4444] mt-3">{categoryFormError}</p>}
          <p className="text-[0.68rem] text-[#545454] mt-2">
            Icon is any <a href="https://fontawesome.com/search?o=r&s=solid" target="_blank" rel="noreferrer" className="text-[#e21e53] hover:underline">Font Awesome</a> solid-style class name, e.g. "fa-bolt" for electricity or "fa-wifi" for internet. Leave blank for a generic money icon.
          </p>
        </div>

        <div className={cardClass}>
          <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E] border-b border-[#e8e8e8] pb-3 mb-4">
            <i className="fa-solid fa-layer-group mr-2 text-[#e21e53]" />
            Categories
          </h3>
          {categories.length === 0 ? (
            <p className="text-[0.8rem] font-semibold text-[#545454]">No categories yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {categories.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-[#e8e8e8] px-3 py-2">
                  <span className="inline-flex items-center gap-2 text-[0.85rem] font-bold text-[#1E1E1E]">
                    <i className={`fa-solid ${c.icon} text-[#e21e53]`} />
                    {c.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCategoryDelete(c)}
                    disabled={deletingCategoryId === c.id}
                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-[#e8e8e8] text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors duration-200 disabled:opacity-60 cursor-pointer"
                    title="Delete"
                  >
                    <i className={`fa-solid ${deletingCategoryId === c.id ? 'fa-spinner fa-spin' : 'fa-trash'} text-[0.75rem]`} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
