import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';
import { getApiErrorMessage } from '../utils/apiError';

const API_URL = import.meta.env.VITE_API_URL;

type EmployeeStatus = 'active' | 'inactive';

interface Employee {
  id: number;
  name: string;
  phone?: string;
  status: EmployeeStatus;
  pin?: number;
  balance: number;
  createdAt?: string;
}

interface EmployeeFormState {
  name: string;
  phone: string;
  status: EmployeeStatus;
  pin: string;
}

interface Payout {
  id: number;
  taskName: string;
  weightShare: number;
  ratePerUnit: number;
  amount: number;
  periodMonth: string;
  createdAt: string;
}

interface Loan {
  id: number;
  amount: number;
  givenDate: string;
  note?: string;
}

const emptyForm: EmployeeFormState = {
  name: '',
  phone: '',
  status: 'active',
  pin: '',
};

const inputClass =
  'w-full bg-white border border-[#e8e8e8] text-[#1E1E1E] px-[0.85rem] py-[0.65rem] rounded-lg text-[0.875rem] font-medium transition-all duration-200 outline-none focus:border-[#e21e53] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] disabled:opacity-60 disabled:cursor-not-allowed';

const cardClass =
  'bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]';

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EmployeeFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Detail popup -- payout + loan history for whichever employee row was
  // clicked.
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);
  const [detailPayouts, setDetailPayouts] = useState<Payout[]>([]);
  const [detailLoans, setDetailLoans] = useState<Loan[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async (search: string) => {
    setLoading(true);
    setListError(null);
    try {
      const res = await axios.get<Employee[]>(`${API_URL}/employees`, {
        params: search.trim() ? { search: search.trim() } : undefined,
      });
      setEmployees(res.data);
    } catch (err) {
      setListError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to load employees', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced so every keystroke doesn't fire a request.
  useEffect(() => {
    const handle = setTimeout(() => {
      fetchEmployees(searchQuery);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchQuery, fetchEmployees]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (employee: Employee) => {
    setEditingId(employee.id);
    setForm({
      name: employee.name,
      phone: employee.phone ?? '',
      status: employee.status,
      pin: employee.pin != null ? String(employee.pin) : '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
  };

  const handleChange = (field: keyof EmployeeFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const payload = {
      name: form.name,
      phone: form.phone || undefined,
      status: form.status,
      pin: form.pin ? Number(form.pin) : undefined,
    };

    try {
      if (editingId != null) {
        await axios.patch(`${API_URL}/employees/${editingId}`, payload);
      } else {
        await axios.post(`${API_URL}/employees`, payload);
      }
      setModalOpen(false);
      fetchEmployees(searchQuery);
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to save employee', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this employee? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await axios.delete(`${API_URL}/employees/${id}`);
      setEmployees((prev) => prev.filter((emp) => emp.id !== id));
    } catch (err) {
      console.error('Failed to delete employee', err);
      window.alert(getApiErrorMessage(err, 'Failed to delete employee. Check the console.'));
    } finally {
      setDeletingId(null);
    }
  };

  const openDetailModal = async (employee: Employee) => {
    setDetailEmployee(employee);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const [payoutsRes, loansRes] = await Promise.all([
        axios.get<Payout[]>(`${API_URL}/payouts`, { params: { employeeId: employee.id } }),
        axios.get<Loan[]>(`${API_URL}/loans`, { params: { employeeId: employee.id } }),
      ]);
      setDetailPayouts(payoutsRes.data);
      setDetailLoans(loansRes.data);
    } catch (err) {
      setDetailError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to load employee history', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setDetailEmployee(null);
    setDetailPayouts([]);
    setDetailLoans([]);
    setDetailError(null);
  };

  const totalPayouts = detailPayouts.reduce((sum, p) => sum + p.amount, 0);
  const totalLoans = detailLoans.reduce((sum, l) => sum + l.amount, 0);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4">
        <div>
          <h2 className="text-[1.4rem] font-extrabold text-[#1E1E1E] mb-2">Employees</h2>
          <p className="text-[0.9rem] text-[#545454]">Manage employee records and roles.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[0.8rem] text-[#545454]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or phone..."
              className="h-10 w-[240px] rounded-lg border border-[#e8e8e8] bg-white pl-9 pr-3 text-[0.85rem] font-medium text-[#1E1E1E] outline-none transition-all duration-200 focus:border-[#e21e53] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)]"
            />
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="h-10 px-4 flex items-center gap-2 rounded-lg bg-[#e21e53] text-white font-bold text-[0.875rem] transition-all duration-200 hover:bg-[#c01745] hover:-translate-y-px hover:shadow-[0_6px_14px_rgba(226,30,83,0.25)] cursor-pointer"
          >
            <i className="fa-solid fa-user-plus" />
            Add Employee
          </button>
        </div>
      </div>

      <div className={cardClass}>
        {loading && <p className="text-[0.8rem] font-semibold text-[#545454]">Loading employees...</p>}

        {!loading && listError && (
          <p className="text-[0.8rem] font-semibold text-[#ef4444]">{listError}</p>
        )}

        {!loading && !listError && employees.length === 0 && (
          <p className="text-[0.8rem] font-semibold text-[#545454]">
            {searchQuery.trim() ? `No employees match "${searchQuery.trim()}".` : 'No employees yet. Add your first one.'}
          </p>
        )}

        {!loading && !listError && employees.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[0.85rem]">
              <thead>
                <tr className="border-b border-[#e8e8e8] text-[0.72rem] uppercase tracking-[0.05em] text-[#545454]">
                  <th className="py-2 pr-4 font-bold">Name</th>
                  <th className="py-2 pr-4 font-bold">Phone</th>
                  <th className="py-2 pr-4 font-bold">Pin</th>
                  <th className="py-2 pr-4 font-bold">Status</th>
                  <th className="py-2 pr-4 font-bold text-right">Balance (৳)</th>
                  <th className="py-2 pr-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr
                    key={employee.id}
                    onClick={() => openDetailModal(employee)}
                    className="cursor-pointer border-b border-[#f1f1f1] last:border-0 hover:bg-[rgba(226,30,83,0.03)] transition-colors duration-150"
                  >
                    <td className="py-3 pr-4 font-bold text-[#1E1E1E]">{employee.name}</td>
                    <td className="py-3 pr-4 text-[#545454]">
                      {employee.phone ? (
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-[#1E1E1E]">{employee.phone}</span>
                          <a
                            href={`tel:${employee.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            title={`Call ${employee.name}`}
                            className="inline-flex items-center gap-[0.4rem] rounded-full bg-[rgba(16,185,129,0.1)] px-3 py-[0.35rem] text-[0.78rem] font-bold text-[#10b981] hover:bg-[#10b981] hover:text-white transition-colors duration-150"
                          >
                            <i className="fa-solid fa-phone text-[0.8rem]" />
                            Call
                          </a>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 pr-4 text-[#545454]">{employee.pin ?? '—'}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-[0.6rem] py-[0.2rem] text-[0.7rem] font-bold ${
                          employee.status === 'active'
                            ? 'bg-[rgba(16,185,129,0.1)] text-[#10b981]'
                            : 'bg-[rgba(239,68,68,0.1)] text-[#ef4444]'
                        }`}
                      >
                        <span
                          className={`h-[6px] w-[6px] rounded-full ${
                            employee.status === 'active' ? 'bg-[#10b981]' : 'bg-[#ef4444]'
                          }`}
                        />
                        {employee.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right font-bold text-[#1E1E1E]">
                      ৳ {employee.balance.toFixed(2)}
                    </td>
                    <td className="py-3 pr-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(employee);
                        }}
                        className="mr-2 h-8 w-8 rounded-lg text-[#545454] hover:bg-[rgba(22,17,56,0.06)] hover:text-[#1E1E1E] transition-colors duration-200 cursor-pointer"
                        title="Edit"
                      >
                        <i className="fa-solid fa-pen" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(employee.id);
                        }}
                        disabled={deletingId === employee.id}
                        className="h-8 w-8 rounded-lg text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors duration-200 disabled:opacity-60 cursor-pointer"
                        title="Delete"
                      >
                        <i className={`fa-solid ${deletingId === employee.id ? 'fa-spinner fa-spin' : 'fa-trash'}`} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={editingId != null ? 'Edit Employee' : 'Add Employee'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. Jane Smith"
              required
              disabled={submitting}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-[0.4rem]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="e.g. 017xxxxxxxx"
                disabled={submitting}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-[0.4rem]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Pin</label>
              <input
                type="number"
                value={form.pin}
                onChange={(e) => handleChange('pin', e.target.value)}
                placeholder="e.g. 1234"
                required
                disabled={submitting}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Status</label>
            <select
              value={form.status}
              onChange={(e) => handleChange('status', e.target.value as EmployeeStatus)}
              disabled={submitting}
              className={inputClass}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
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
              {submitting ? 'Saving...' : editingId != null ? 'Save Changes' : 'Create Employee'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={detailEmployee != null}
        onClose={closeDetailModal}
        title={detailEmployee ? detailEmployee.name : 'Employee'}
      >
        {detailEmployee && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#e8e8e8] bg-[#f8fafc] p-4">
              <div>
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.05em] text-[#545454] m-0">Phone</p>
                {detailEmployee.phone ? (
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[0.875rem] font-bold text-[#1E1E1E]">{detailEmployee.phone}</span>
                    <a
                      href={`tel:${detailEmployee.phone}`}
                      className="inline-flex items-center gap-[0.4rem] rounded-full bg-[rgba(16,185,129,0.1)] px-3 py-[0.35rem] text-[0.78rem] font-bold text-[#10b981] hover:bg-[#10b981] hover:text-white transition-colors duration-150"
                    >
                      <i className="fa-solid fa-phone text-[0.8rem]" />
                      Call
                    </a>
                  </div>
                ) : (
                  <p className="text-[0.875rem] font-bold text-[#1E1E1E] m-0">—</p>
                )}
              </div>
              <div>
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.05em] text-[#545454] m-0">Pin</p>
                <p className="text-[0.875rem] font-bold text-[#1E1E1E] m-0">{detailEmployee.pin ?? '—'}</p>
              </div>
              <div>
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.05em] text-[#545454] m-0">Status</p>
                <span
                  className={`inline-flex items-center gap-1 mt-1 rounded-full px-[0.6rem] py-[0.15rem] text-[0.7rem] font-bold ${
                    detailEmployee.status === 'active'
                      ? 'bg-[rgba(16,185,129,0.1)] text-[#10b981]'
                      : 'bg-[rgba(239,68,68,0.1)] text-[#ef4444]'
                  }`}
                >
                  {detailEmployee.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.05em] text-[#545454] m-0">Current Balance</p>
                <p className="text-[0.95rem] font-extrabold text-[#e21e53] m-0">৳ {detailEmployee.balance.toFixed(2)}</p>
              </div>
            </div>

            {detailLoading && <p className="text-[0.8rem] font-semibold text-[#545454]">Loading history...</p>}
            {!detailLoading && detailError && (
              <p className="text-[0.8rem] font-semibold text-[#ef4444]">{detailError}</p>
            )}

            {!detailLoading && !detailError && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[0.85rem] font-extrabold text-[#1E1E1E]">
                      <i className="fa-solid fa-wallet mr-1 text-[#e21e53]" />
                      Payout History
                    </h4>
                    <span className="text-[0.8rem] font-bold text-[#10b981]">৳ {totalPayouts.toFixed(2)} total</span>
                  </div>
                  {detailPayouts.length === 0 ? (
                    <p className="text-[0.78rem] text-[#545454]">No payouts recorded yet.</p>
                  ) : (
                    <div className="max-h-[220px] overflow-y-auto rounded-lg border border-[#e8e8e8]">
                      <table className="w-full text-left text-[0.78rem]">
                        <thead className="sticky top-0 bg-[#f8fafc]">
                          <tr className="text-[0.65rem] uppercase tracking-[0.05em] text-[#545454]">
                            <th className="py-2 px-3 font-bold">Task</th>
                            <th className="py-2 px-3 font-bold text-right">Weight</th>
                            <th className="py-2 px-3 font-bold text-right">Amount</th>
                            <th className="py-2 px-3 font-bold">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailPayouts.map((p) => (
                            <tr key={p.id} className="border-t border-[#f1f1f1]">
                              <td className="py-2 px-3 font-semibold text-[#1E1E1E]">{p.taskName}</td>
                              <td className="py-2 px-3 text-right text-[#545454]">{p.weightShare.toFixed(2)}</td>
                              <td className="py-2 px-3 text-right font-bold text-[#10b981]">৳{p.amount.toFixed(2)}</td>
                              <td className="py-2 px-3 text-[#545454]">
                                {new Date(p.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[0.85rem] font-extrabold text-[#1E1E1E]">
                      <i className="fa-solid fa-hand-holding-dollar mr-1 text-[#e21e53]" />
                      Loan History
                    </h4>
                    <span className="text-[0.8rem] font-bold text-[#ef4444]">৳ {totalLoans.toFixed(2)} total</span>
                  </div>
                  {detailLoans.length === 0 ? (
                    <p className="text-[0.78rem] text-[#545454]">No loans recorded yet.</p>
                  ) : (
                    <div className="max-h-[180px] overflow-y-auto rounded-lg border border-[#e8e8e8]">
                      <table className="w-full text-left text-[0.78rem]">
                        <thead className="sticky top-0 bg-[#f8fafc]">
                          <tr className="text-[0.65rem] uppercase tracking-[0.05em] text-[#545454]">
                            <th className="py-2 px-3 font-bold">Date</th>
                            <th className="py-2 px-3 font-bold text-right">Amount</th>
                            <th className="py-2 px-3 font-bold">Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailLoans.map((l) => (
                            <tr key={l.id} className="border-t border-[#f1f1f1]">
                              <td className="py-2 px-3 text-[#545454]">
                                {new Date(l.givenDate).toLocaleDateString()}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-[#ef4444]">৳{l.amount.toFixed(2)}</td>
                              <td className="py-2 px-3 text-[#545454]">{l.note || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
