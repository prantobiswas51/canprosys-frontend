import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

interface PayoutSummaryRow {
  employeeId: number;
  employeeName: string;
  totalWeight: number;
  entryCount: number;
  totalPayout: number;
}

const cardClass =
  'bg-white border border-[#e8e8e8] rounded-xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]';

function currentMonth() {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

export default function Payouts() {
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth());
  const [rows, setRows] = useState<PayoutSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);

  const fetchSummary = useCallback(async (month: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<PayoutSummaryRow[]>(`${API_URL}/payouts/summary`, {
        params: { month },
      });
      setRows(res.data);
    } catch (err) {
      setError(
        axios.isAxiosError(err) && err.response
          ? `Failed to load payouts: ${err.response.status}`
          : 'Could not reach the server. Check the console.'
      );
      console.error('Failed to load payout summary', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary(selectedMonth);
  }, [selectedMonth, fetchSummary]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateMessage(null);
    try {
      const res = await axios.post<{ entriesProcessed: number; created: number; skipped: number }>(
        `${API_URL}/payouts/generate`,
        { month: selectedMonth }
      );
      setGenerateMessage(
        `Processed ${res.data.entriesProcessed} entries — ${res.data.created} payout(s) created, ${res.data.skipped} already existed.`
      );
      fetchSummary(selectedMonth);
    } catch (err) {
      setGenerateMessage(
        axios.isAxiosError(err) && err.response
          ? `Failed to generate: ${err.response.status}`
          : 'Could not reach the server. Check the console.'
      );
      console.error('Failed to generate payouts', err);
    } finally {
      setGenerating(false);
    }
  };

  const grandTotal = rows.reduce((acc, row) => acc + row.totalPayout, 0);

  const exportToCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `Employee Name,Weight Processed (kg),Entries,Payout for ${selectedMonth} (TK)\n`;
    rows.forEach((row) => {
      csvContent += `"${row.employeeName}",${row.totalWeight.toFixed(2)},${row.entryCount},${row.totalPayout.toFixed(2)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `payouts_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between border-b border-[#e8e8e8] pb-4">
        <div>
          <h2 className="text-[1.4rem] font-extrabold text-[#1E1E1E] mb-2">Payouts</h2>
          <p className="text-[0.9rem] text-[#545454]">Piece-rate artisan payouts, generated from daily entries.</p>
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
            onClick={handleGenerate}
            disabled={generating}
            className="h-10 px-4 flex items-center gap-2 rounded-lg bg-[#e21e53] text-white font-bold text-[0.875rem] transition-all duration-200 hover:bg-[#c01745] hover:-translate-y-px hover:shadow-[0_6px_14px_rgba(226,30,83,0.25)] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            <i className={`fa-solid ${generating ? 'fa-spinner fa-spin' : 'fa-calculator'}`} />
            {generating ? 'Generating...' : 'Generate Payouts'}
          </button>
          <button
            type="button"
            onClick={exportToCSV}
            disabled={rows.length === 0}
            className="h-10 px-4 flex items-center gap-2 rounded-lg border border-[#e8e8e8] text-[#545454] font-bold text-[0.875rem] hover:bg-[#f8fafc] hover:text-[#1E1E1E] transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            <i className="fa-solid fa-file-csv" />
            Export CSV
          </button>
        </div>
      </div>

      {generateMessage && (
        <p className="text-[0.8rem] font-semibold text-[#545454]">{generateMessage}</p>
      )}

      {loading && <p className="text-[0.8rem] font-semibold text-[#545454]">Loading payouts...</p>}

      {!loading && error && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{error}</p>}

      {!loading && !error && rows.length === 0 && (
        <p className="text-[0.8rem] font-semibold text-[#545454]">
          No payouts for {selectedMonth} yet. Click "Generate Payouts" to compute them from that month's daily entries.
        </p>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className={`${cardClass} overflow-x-auto`}>
          <table className="w-full text-left text-[0.85rem]">
            <thead>
              <tr className="bg-[rgba(226,30,83,0.03)] text-[0.72rem] uppercase tracking-[0.05em] text-[#545454]">
                <th className="py-3 px-4 font-bold">Employee Name</th>
                <th className="py-3 px-4 font-bold text-center">Weight Processed</th>
                <th className="py-3 px-4 font-bold text-center">Entries</th>
                <th className="py-3 px-4 font-bold text-right">Monthly Payout</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.employeeId} className="border-t border-[#f1f1f1]">
                  <td className="py-3 px-4 font-bold text-[#1E1E1E]">{row.employeeName}</td>
                  <td className="py-3 px-4 text-center font-semibold text-[#545454]">
                    {row.totalWeight.toFixed(2)} kg
                  </td>
                  <td className="py-3 px-4 text-center font-semibold text-[#545454]">{row.entryCount}</td>
                  <td className="py-3 px-4 text-right font-bold text-[#e21e53] text-[1.1rem]">
                    ৳ {row.totalPayout.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-[rgba(226,30,83,0.05)] border-t-2 border-[#e8e8e8] font-extrabold">
              <tr>
                <td colSpan={3} className="text-right py-4 px-4 text-[#1E1E1E]">
                  Grand Total:
                </td>
                <td className="text-right py-4 px-4 text-[#e21e53] text-[1.25rem]">
                  ৳ {grandTotal.toFixed(2)}
                </td>
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
          Payouts are generated from that month's Daily Entries. If an entry has more than one artisan, the
          entry's weight — and its payout — is split equally between them.
        </p>
        <p>Generating again for a month you've already generated only adds entries that weren't included before.</p>
      </div>
    </div>
  );
}
