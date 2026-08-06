import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { getApiErrorMessage } from '../utils/apiError';
import { formatQty } from '../utils/formatNumber';

const API_URL = import.meta.env.VITE_API_URL;

interface WasteType {
  id: number;
  name: string;
}

interface WasteBatch {
  id: number;
  wasteTypeId: number;
  wasteTypeName: string;
  quantity: number;
  quantityRemaining: number;
  sourceEntryId?: number;
  collectedDate: string;
  note?: string;
}

interface WasteSale {
  id: number;
  wasteTypeId: number;
  wasteTypeName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  saleDate: string;
  buyer?: string;
  note?: string;
}

interface WasteStockRow {
  wasteTypeId: number;
  wasteTypeName: string;
  quantityRemaining: number;
}

type RangePreset = 'today' | '3' | '7' | '15' | 'month' | 'custom' | 'all';

const inputClass =
  'w-full bg-white border border-[#e8e8e8] text-[#1E1E1E] px-[0.85rem] py-[0.65rem] rounded-lg text-[0.875rem] font-medium transition-all duration-200 outline-none focus:border-[#e21e53] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] disabled:opacity-60 disabled:cursor-not-allowed';

const cardClass =
  'bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]';

const primaryBtnClass =
  'h-10 px-4 flex items-center gap-2 rounded-lg bg-[#e21e53] text-white font-bold text-[0.875rem] transition-all duration-200 hover:bg-[#c01745] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function startOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

const RANGE_OPTIONS: { key: RangePreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '3', label: '3 Days' },
  { key: '7', label: '7 Days' },
  { key: '15', label: '15 Days' },
  { key: 'month', label: 'This Month' },
  { key: 'custom', label: 'Custom' },
  { key: 'all', label: 'All' },
];

export default function WasteManagement() {
  const [wasteTypes, setWasteTypes] = useState<WasteType[]>([]);
  const [batches, setBatches] = useState<WasteBatch[]>([]);
  const [sales, setSales] = useState<WasteSale[]>([]);
  const [stock, setStock] = useState<WasteStockRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [range, setRange] = useState<RangePreset>('7');
  const [customFrom, setCustomFrom] = useState(todayStr());
  const [customTo, setCustomTo] = useState(todayStr());

  const [newTypeName, setNewTypeName] = useState('');
  const [typeSubmitting, setTypeSubmitting] = useState(false);
  const [typeFormError, setTypeFormError] = useState<string | null>(null);

  const [batchForm, setBatchForm] = useState({ wasteTypeId: '', quantity: '', collectedDate: todayStr(), note: '' });
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchFormError, setBatchFormError] = useState<string | null>(null);

  const [saleForm, setSaleForm] = useState({
    wasteTypeId: '',
    quantity: '',
    unitPrice: '',
    saleDate: todayStr(),
    buyer: '',
  });
  const [saleSubmitting, setSaleSubmitting] = useState(false);
  const [saleFormError, setSaleFormError] = useState<string | null>(null);

  const { from, to } = useMemo(() => {
    switch (range) {
      case 'today':
        return { from: todayStr(), to: todayStr() };
      case '3':
        return { from: daysAgo(2), to: todayStr() };
      case '7':
        return { from: daysAgo(6), to: todayStr() };
      case '15':
        return { from: daysAgo(14), to: todayStr() };
      case 'month':
        return { from: startOfMonth(), to: todayStr() };
      case 'custom':
        return { from: customFrom, to: customTo };
      case 'all':
      default:
        return { from: undefined, to: undefined };
    }
  }, [range, customFrom, customTo]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = from && to ? { from, to } : {};
      const [typesRes, batchesRes, salesRes, stockRes] = await Promise.all([
        axios.get<WasteType[]>(`${API_URL}/waste-types`),
        axios.get<WasteBatch[]>(`${API_URL}/waste-batches`, { params }),
        axios.get<WasteSale[]>(`${API_URL}/waste-sales`, { params }),
        axios.get<WasteStockRow[]>(`${API_URL}/waste-batches/stock`),
      ]);
      setWasteTypes(typesRes.data);
      setBatches(batchesRes.data);
      setSales(salesRes.data);
      setStock(stockRes.data);
    } catch (err) {
      setLoadError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to load waste management data', err);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleAddType = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTypeFormError(null);
    if (!newTypeName.trim()) {
      setTypeFormError('Enter a waste type name.');
      return;
    }
    setTypeSubmitting(true);
    try {
      await axios.post(`${API_URL}/waste-types`, { name: newTypeName.trim() });
      setNewTypeName('');
      loadAll();
    } catch (err) {
      setTypeFormError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to create waste type', err);
    } finally {
      setTypeSubmitting(false);
    }
  };

  const handleAddBatch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBatchFormError(null);
    const quantity = Number(batchForm.quantity);
    if (!batchForm.wasteTypeId || !quantity || quantity <= 0) {
      setBatchFormError('Pick a waste type and enter a valid quantity.');
      return;
    }
    setBatchSubmitting(true);
    try {
      await axios.post(`${API_URL}/waste-batches`, {
        wasteTypeId: Number(batchForm.wasteTypeId),
        quantity,
        collectedDate: batchForm.collectedDate,
        note: batchForm.note.trim() || undefined,
      });
      setBatchForm({ wasteTypeId: '', quantity: '', collectedDate: batchForm.collectedDate, note: '' });
      loadAll();
    } catch (err) {
      setBatchFormError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to add waste', err);
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleAddSale = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaleFormError(null);
    const quantity = Number(saleForm.quantity);
    const unitPrice = Number(saleForm.unitPrice);
    if (!saleForm.wasteTypeId || !quantity || quantity <= 0 || isNaN(unitPrice) || unitPrice < 0) {
      setSaleFormError('Pick a waste type and enter a valid quantity and unit price.');
      return;
    }
    setSaleSubmitting(true);
    try {
      await axios.post(`${API_URL}/waste-sales`, {
        wasteTypeId: Number(saleForm.wasteTypeId),
        quantity,
        unitPrice,
        saleDate: saleForm.saleDate,
        buyer: saleForm.buyer.trim() || undefined,
      });
      setSaleForm({ wasteTypeId: '', quantity: '', unitPrice: '', saleDate: saleForm.saleDate, buyer: '' });
      loadAll();
    } catch (err) {
      setSaleFormError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to record waste sale', err);
    } finally {
      setSaleSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-[1.4rem] font-extrabold text-[#1E1E1E] mb-2">Waste Management</h2>
        <p className="text-[0.9rem] text-[#545454]">
          Track waste collected during wood processing and sales of that waste. No cost basis on waste --
          its share of material cost is absorbed into the good output's price.
        </p>
      </div>

      {loadError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{loadError}</p>}

      {/* Current stock */}
      <div className={cardClass}>
        <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E] border-b border-[#e8e8e8] pb-3 mb-4">
          <i className="fa-solid fa-boxes-stacked mr-2 text-[#e21e53]" />
          Current Waste Stock
        </h3>
        {stock.length === 0 && !loading && (
          <p className="text-[0.8rem] font-semibold text-[#545454]">No waste in stock.</p>
        )}
        {stock.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
            {stock.map((row) => (
              <div key={row.wasteTypeId} className="rounded-lg border border-[#e8e8e8] p-4">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.05em] text-[#545454] m-0">
                  {row.wasteTypeName}
                </p>
                <p className="text-[1.1rem] font-extrabold text-[#1E1E1E] m-0 mt-1">{formatQty(row.quantityRemaining)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Waste types */}
      <div className={cardClass}>
        <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E] border-b border-[#e8e8e8] pb-3 mb-4">
          <i className="fa-solid fa-tags mr-2 text-[#e21e53]" />
          Waste Types
        </h3>
        <form onSubmit={handleAddType} className="flex gap-3 items-end mb-3">
          <div className="flex flex-col gap-[0.4rem] flex-1 max-w-[280px]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">New Waste Type</label>
            <input
              type="text"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder="e.g. Wood Shavings"
              disabled={typeSubmitting}
              className={inputClass}
            />
          </div>
          <button type="submit" disabled={typeSubmitting} className={primaryBtnClass}>
            <i className={`fa-solid ${typeSubmitting ? 'fa-spinner fa-spin' : 'fa-plus'}`} />
            Add
          </button>
        </form>
        {typeFormError && <p className="text-[0.8rem] font-semibold text-[#ef4444] mb-2">{typeFormError}</p>}
        <div className="flex flex-wrap gap-2">
          {wasteTypes.map((wt) => (
            <span
              key={wt.id}
              className="rounded-full bg-[rgba(226,30,83,0.06)] text-[#e21e53] text-[0.78rem] font-bold px-3 py-1"
            >
              {wt.name}
            </span>
          ))}
          {wasteTypes.length === 0 && (
            <span className="text-[0.8rem] font-semibold text-[#545454]">No waste types yet.</span>
          )}
        </div>
      </div>

      {/* Add waste / Sell waste */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cardClass}>
          <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E] border-b border-[#e8e8e8] pb-3 mb-4">
            <i className="fa-solid fa-plus mr-2 text-[#e21e53]" />
            Add Waste
          </h3>
          <form onSubmit={handleAddBatch} className="flex flex-col gap-3">
            <div className="flex flex-col gap-[0.4rem]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Type</label>
              <select
                value={batchForm.wasteTypeId}
                onChange={(e) => setBatchForm((prev) => ({ ...prev, wasteTypeId: e.target.value }))}
                required
                disabled={batchSubmitting}
                className={inputClass}
              >
                <option value="">Select waste type</option>
                {wasteTypes.map((wt) => (
                  <option key={wt.id} value={wt.id}>
                    {wt.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-[0.4rem]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Amount</label>
                <input
                  type="number"
                  step="any"
                  value={batchForm.quantity}
                  onChange={(e) => setBatchForm((prev) => ({ ...prev, quantity: e.target.value }))}
                  required
                  disabled={batchSubmitting}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-[0.4rem]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Date</label>
                <input
                  type="date"
                  value={batchForm.collectedDate}
                  onChange={(e) => setBatchForm((prev) => ({ ...prev, collectedDate: e.target.value }))}
                  disabled={batchSubmitting}
                  className={inputClass}
                />
              </div>
            </div>
            <button type="submit" disabled={batchSubmitting} className={primaryBtnClass}>
              <i className={`fa-solid ${batchSubmitting ? 'fa-spinner fa-spin' : 'fa-save'}`} />
              {batchSubmitting ? 'Saving...' : 'Add Waste'}
            </button>
            {batchFormError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{batchFormError}</p>}
          </form>
          <p className="text-[0.75rem] text-[#545454] mt-3">
            Waste from a wood processing run is added automatically -- this form is for anything collected
            outside that flow.
          </p>
        </div>

        <div className={cardClass}>
          <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E] border-b border-[#e8e8e8] pb-3 mb-4">
            <i className="fa-solid fa-minus mr-2 text-[#e21e53]" />
            Sell Waste
          </h3>
          <form onSubmit={handleAddSale} className="flex flex-col gap-3">
            <div className="flex flex-col gap-[0.4rem]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Type</label>
              <select
                value={saleForm.wasteTypeId}
                onChange={(e) => setSaleForm((prev) => ({ ...prev, wasteTypeId: e.target.value }))}
                required
                disabled={saleSubmitting}
                className={inputClass}
              >
                <option value="">Select waste type</option>
                {wasteTypes.map((wt) => (
                  <option key={wt.id} value={wt.id}>
                    {wt.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-[0.4rem]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Amount</label>
                <input
                  type="number"
                  step="any"
                  value={saleForm.quantity}
                  onChange={(e) => setSaleForm((prev) => ({ ...prev, quantity: e.target.value }))}
                  required
                  disabled={saleSubmitting}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-[0.4rem]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Unit Price (৳)</label>
                <input
                  type="number"
                  step="0.01"
                  value={saleForm.unitPrice}
                  onChange={(e) => setSaleForm((prev) => ({ ...prev, unitPrice: e.target.value }))}
                  required
                  disabled={saleSubmitting}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-[0.4rem]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Date</label>
                <input
                  type="date"
                  value={saleForm.saleDate}
                  onChange={(e) => setSaleForm((prev) => ({ ...prev, saleDate: e.target.value }))}
                  disabled={saleSubmitting}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-[0.4rem]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Buyer (optional)</label>
                <input
                  type="text"
                  value={saleForm.buyer}
                  onChange={(e) => setSaleForm((prev) => ({ ...prev, buyer: e.target.value }))}
                  disabled={saleSubmitting}
                  className={inputClass}
                />
              </div>
            </div>
            <button type="submit" disabled={saleSubmitting} className={primaryBtnClass}>
              <i className={`fa-solid ${saleSubmitting ? 'fa-spinner fa-spin' : 'fa-sack-dollar'}`} />
              {saleSubmitting ? 'Saving...' : 'Record Sale'}
            </button>
            {saleFormError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{saleFormError}</p>}
          </form>
        </div>
      </div>

      {/* Date range filter */}
      <div className={`${cardClass} flex flex-wrap items-center gap-3`}>
        <span className="text-[0.8rem] font-bold text-[#1E1E1E]">Range:</span>
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setRange(opt.key)}
            className={`h-8 px-3 rounded-lg text-[0.78rem] font-bold cursor-pointer transition-colors duration-200 ${
              range === opt.key
                ? 'bg-[#e21e53] text-white'
                : 'border border-[#e8e8e8] text-[#545454] hover:bg-[#f8fafc]'
            }`}
          >
            {opt.label}
          </button>
        ))}
        {range === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="border border-[#e8e8e8] rounded-lg px-3 py-2 text-[0.85rem] font-semibold text-[#1E1E1E] outline-none focus:border-[#e21e53]"
            />
            <span className="text-[#545454]">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="border border-[#e8e8e8] rounded-lg px-3 py-2 text-[0.85rem] font-semibold text-[#1E1E1E] outline-none focus:border-[#e21e53]"
            />
          </div>
        )}
      </div>

      {/* Waste log */}
      <div className={cardClass}>
        <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E] border-b border-[#e8e8e8] pb-3 mb-4">
          <i className="fa-solid fa-clock-rotate-left mr-2 text-[#e21e53]" />
          Waste Added
        </h3>
        {!loading && batches.length === 0 && (
          <p className="text-[0.8rem] font-semibold text-[#545454]">No waste recorded in this range.</p>
        )}
        {batches.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[0.85rem]">
              <thead>
                <tr className="border-b border-[#e8e8e8] text-[0.72rem] uppercase tracking-[0.05em] text-[#545454]">
                  <th className="py-2 pr-4 font-bold">Type</th>
                  <th className="py-2 pr-4 font-bold text-right">Quantity</th>
                  <th className="py-2 pr-4 font-bold text-right">Remaining</th>
                  <th className="py-2 pr-4 font-bold">Source</th>
                  <th className="py-2 pr-4 font-bold">Date</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-b border-[#f1f1f1] last:border-0">
                    <td className="py-3 pr-4 font-bold text-[#1E1E1E]">{b.wasteTypeName}</td>
                    <td className="py-3 pr-4 text-[#545454] text-right">{formatQty(b.quantity)}</td>
                    <td className="py-3 pr-4 text-[#545454] text-right">{formatQty(b.quantityRemaining)}</td>
                    <td className="py-3 pr-4 text-[#545454]">
                      {b.sourceEntryId ? `Processing entry #${b.sourceEntryId}` : 'Manual'}
                    </td>
                    <td className="py-3 pr-4 text-[#545454]">{b.collectedDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={cardClass}>
        <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E] border-b border-[#e8e8e8] pb-3 mb-4">
          <i className="fa-solid fa-sack-dollar mr-2 text-[#e21e53]" />
          Waste Sold
        </h3>
        {!loading && sales.length === 0 && (
          <p className="text-[0.8rem] font-semibold text-[#545454]">No sales recorded in this range.</p>
        )}
        {sales.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[0.85rem]">
              <thead>
                <tr className="border-b border-[#e8e8e8] text-[0.72rem] uppercase tracking-[0.05em] text-[#545454]">
                  <th className="py-2 pr-4 font-bold">Type</th>
                  <th className="py-2 pr-4 font-bold text-right">Quantity</th>
                  <th className="py-2 pr-4 font-bold text-right">Unit Price</th>
                  <th className="py-2 pr-4 font-bold text-right">Total</th>
                  <th className="py-2 pr-4 font-bold">Buyer</th>
                  <th className="py-2 pr-4 font-bold">Date</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-b border-[#f1f1f1] last:border-0">
                    <td className="py-3 pr-4 font-bold text-[#1E1E1E]">{s.wasteTypeName}</td>
                    <td className="py-3 pr-4 text-[#545454] text-right">{formatQty(s.quantity)}</td>
                    <td className="py-3 pr-4 text-[#545454] text-right">৳{s.unitPrice.toFixed(2)}</td>
                    <td className="py-3 pr-4 font-bold text-[#e21e53] text-right">৳{s.totalAmount.toFixed(2)}</td>
                    <td className="py-3 pr-4 text-[#545454]">{s.buyer || '—'}</td>
                    <td className="py-3 pr-4 text-[#545454]">{s.saleDate}</td>
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
