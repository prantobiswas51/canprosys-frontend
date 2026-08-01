import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getApiErrorMessage } from '../utils/apiError';
import Modal from '../components/Modal';

const API_URL = import.meta.env.VITE_API_URL;

interface EmployeeOption {
  id: number;
  name: string;
  balance: number;
}

interface Loan {
  id: number;
  employeeId: number;
  employeeName: string;
  amount: number;
  givenDate: string;
  note?: string;
  createdAt: string;
}

interface LoanFormState {
  employeeId: string;
  amount: string;
  givenDate: string;
  note: string;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

const emptyLoanForm: LoanFormState = {
  employeeId: '',
  amount: '',
  givenDate: today(),
  note: '',
};

const cardClass =
  'bg-white border border-[#e8e8e8] rounded-xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]';

const inputClass =
  'w-full bg-white border border-[#e8e8e8] text-[#1E1E1E] px-[0.85rem] py-[0.65rem] rounded-lg text-[0.875rem] font-medium transition-all duration-200 outline-none focus:border-[#e21e53] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] disabled:opacity-60 disabled:cursor-not-allowed';

export default function Loans() {
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth());
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeesError, setEmployeesError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<LoanFormState>(emptyLoanForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchLoans = useCallback(async (month: string) => {
    setLoading(true);
    setListError(null);
    try {
      const res = await axios.get<Loan[]>(`${API_URL}/loans`, { params: { month } });
      setLoans(res.data);
    } catch (err) {
      setListError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to load loans', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    setEmployeesError(null);
    try {
      const res = await axios.get<EmployeeOption[]>(`${API_URL}/employees`);
      setEmployees(res.data);
    } catch (err) {
      setEmployeesError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to load employees', err);
    }
  }, []);

  useEffect(() => {
    fetchLoans(selectedMonth);
  }, [selectedMonth, fetchLoans]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const openModal = () => {
    setForm(emptyLoanForm);
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
  };

  const handleChange = (field: keyof LoanFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (!form.employeeId) {
      setFormError('Select an employee.');
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setFormError('Enter a loan amount greater than zero.');
      return;
    }
    if (!form.givenDate) {
      setFormError('Select the date the loan was given.');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/loans`, {
        employeeId: Number(form.employeeId),
        amount: Number(form.amount),
        givenDate: form.givenDate,
        note: form.note.trim() === '' ? undefined : form.note,
      });
      setModalOpen(false);
      fetchEmployees();
      // If the loan was given in a different month than the one currently
      // being viewed, jump to that month so the new row is actually visible.
      const loanMonth = form.givenDate.slice(0, 7);
      if (loanMonth !== selectedMonth) {
        setSelectedMonth(loanMonth);
      } else {
        fetchLoans(selectedMonth);
      }
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to create loan', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (loan: Loan) => {
    if (!window.confirm(`Delete this ৳${loan.amount.toFixed(2)} loan for ${loan.employeeName}? This restores the amount to their balance.`)) {
      return;
    }
    setDeletingId(loan.id);
    try {
      await axios.delete(`${API_URL}/loans/${loan.id}`);
      fetchLoans(selectedMonth);
      fetchEmployees();
    } catch (err) {
      alert(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to delete loan', err);
    } finally {
      setDeletingId(null);
    }
  };

  const totalLoaned = loans.reduce((sum, l) => sum + l.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between border-b border-[#e8e8e8] pb-4">
        <div>
          <h2 className="text-[1.4rem] font-extrabold text-[#1E1E1E] mb-2">Loans</h2>
          <p className="text-[0.9rem] text-[#545454]">Cash advances given to employees against future wages.</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-[#e8e8e8] rounded-lg px-3 py-2 text-[0.85rem] font-semibold text-[#1E1E1E] outline-none focus:border-[#e21e53] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)]"
          />
          <button
            type="button"
            onClick={openModal}
            className="h-10 px-4 flex items-center gap-2 rounded-lg bg-[#e21e53] text-white font-bold text-[0.875rem] transition-all duration-200 hover:bg-[#c01745] hover:-translate-y-px hover:shadow-[0_6px_14px_rgba(226,30,83,0.25)] cursor-pointer"
          >
            <i className="fa-solid fa-hand-holding-dollar" />
            New Loan
          </button>
        </div>
      </div>

      {employeesError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{employeesError}</p>}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <div className={`${cardClass} p-5 flex items-center gap-3`}>
          <div className="w-10 h-10 rounded-lg bg-[rgba(226,30,83,0.08)] text-[#e21e53] flex items-center justify-center shrink-0">
            <i className="fa-solid fa-hand-holding-dollar" />
          </div>
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.05em] text-[#545454] m-0">Loans This Month</p>
            <p className="text-[1.1rem] font-extrabold text-[#1E1E1E] m-0">{loans.length}</p>
          </div>
        </div>
        <div className={`${cardClass} p-5 flex items-center gap-3`}>
          <div className="w-10 h-10 rounded-lg bg-[rgba(245,158,11,0.08)] text-[#f59e0b] flex items-center justify-center shrink-0">
            <i className="fa-solid fa-sack-dollar" />
          </div>
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.05em] text-[#545454] m-0">Total Loaned</p>
            <p className="text-[1.1rem] font-extrabold text-[#1E1E1E] m-0">৳ {totalLoaned.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {loading && <p className="text-[0.8rem] font-semibold text-[#545454]">Loading loans...</p>}
      {!loading && listError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{listError}</p>}
      {!loading && !listError && loans.length === 0 && (
        <p className="text-[0.8rem] font-semibold text-[#545454]">
          No loans recorded for {selectedMonth}. Click "New Loan" to add one.
        </p>
      )}

      {!loading && !listError && loans.length > 0 && (
        <div className={`${cardClass} overflow-x-auto`}>
          <table className="w-full text-left text-[0.85rem]">
            <thead>
              <tr className="bg-[rgba(226,30,83,0.03)] text-[0.72rem] uppercase tracking-[0.05em] text-[#545454]">
                <th className="py-3 px-4 font-bold">Employee</th>
                <th className="py-3 px-4 font-bold">Date Given</th>
                <th className="py-3 px-4 font-bold text-right">Amount</th>
                <th className="py-3 px-4 font-bold">Note</th>
                <th className="py-3 px-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id} className="border-t border-[#f1f1f1]">
                  <td className="py-3 px-4 font-bold text-[#1E1E1E]">{loan.employeeName}</td>
                  <td className="py-3 px-4 font-semibold text-[#545454]">
                    {new Date(loan.givenDate).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-[#e21e53] text-[1.05rem]">
                    ৳ {loan.amount.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 font-medium text-[#545454] max-w-[240px]">{loan.note || '—'}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(loan)}
                      disabled={deletingId === loan.id}
                      className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-[#e8e8e8] text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors duration-200 disabled:opacity-60 cursor-pointer"
                    >
                      <i className={`fa-solid ${deletingId === loan.id ? 'fa-spinner fa-spin' : 'fa-trash'} text-[0.8rem]`} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-[rgba(226,30,83,0.05)] border-t-2 border-[#e8e8e8] font-extrabold">
              <tr>
                <td colSpan={2} className="text-right py-4 px-4 text-[#1E1E1E]">
                  Total:
                </td>
                <td className="text-right py-4 px-4 text-[#e21e53] text-[1.15rem]">৳ {totalLoaned.toFixed(2)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="rounded-xl border border-dashed border-[rgba(226,30,83,0.3)] bg-[rgba(226,30,83,0.02)] p-4 text-[0.8rem] text-[#545454]">
        <p className="font-bold text-[#1E1E1E] mb-1">
          <i className="fa-solid fa-circle-info mr-1 text-[#e21e53]" />
          How this works
        </p>
        <p>
          Recording a loan immediately deducts that amount from the employee's balance on the Employees page --
          a loan is treated as an advance against wages they've already earned or will earn. Deleting a loan
          restores the amount.
        </p>
      </div>

      <Modal open={modalOpen} onClose={closeModal} title="New Loan">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] mb-1">
              Employee
            </label>
            <select
              value={form.employeeId}
              onChange={(e) => handleChange('employeeId', e.target.value)}
              className={inputClass}
            >
              <option value="">Select employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} (balance ৳{emp.balance.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] mb-1">
                Amount (৳)
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                className={inputClass}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] mb-1">
                Date Given
              </label>
              <input
                type="date"
                value={form.givenDate}
                onChange={(e) => handleChange('givenDate', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] mb-1">
              Note (optional)
            </label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => handleChange('note', e.target.value)}
              className={inputClass}
              placeholder="Reason, or any other detail"
            />
          </div>

          {formError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{formError}</p>}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#e8e8e8]">
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
              className="h-10 px-4 rounded-lg bg-[#e21e53] text-white font-bold text-[0.875rem] hover:bg-[#c81a49] transition-colors duration-200 disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Create Loan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
