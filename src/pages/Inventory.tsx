import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

interface RawMaterial {
  id: number;
  name: string;
  unit: string;
}

type RawMaterialFormState = Omit<RawMaterial, 'id'>;

const emptyMaterialForm: RawMaterialFormState = {
  name: '',
  unit: '',
};

const UNIT_OPTIONS = ['kg', 'gram', 'piece', 'yard', 'meter', 'liter', 'sheet', 'roll', 'box'];

interface MaterialBatch {
  id: number;
  rawMaterialId: number;
  rawMaterialName: string;
  rawMaterialUnit?: string;
  quantityPurchased: number;
  unitPrice: number;
  totalCost: number;
  quantityRemaining: number;
  purchaseDate?: string;
  createdAt: string;
}

interface BatchFormState {
  rawMaterialId: string;
  quantityPurchased: string;
  unitPrice: string;
  purchaseDate: string;
}

const emptyBatchForm: BatchFormState = {
  rawMaterialId: '',
  quantityPurchased: '',
  unitPrice: '',
  purchaseDate: '',
};

const inputClass =
  'w-full bg-white border border-[#e8e8e8] text-[#1E1E1E] px-[0.85rem] py-[0.65rem] rounded-lg text-[0.875rem] font-medium transition-all duration-200 outline-none focus:border-[#e21e53] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] disabled:opacity-60 disabled:cursor-not-allowed';

const cardClass =
  'bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]';

const primaryBtnClass =
  'h-10 px-4 flex items-center gap-2 rounded-lg bg-[#e21e53] text-white font-bold text-[0.875rem] transition-all duration-200 hover:bg-[#c01745] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer';

const secondaryBtnClass =
  'h-10 px-4 rounded-lg border border-[#e8e8e8] text-[#545454] font-bold text-[0.875rem] hover:bg-[#f8fafc] transition-colors duration-200 disabled:opacity-60 cursor-pointer';

export default function Inventory() {
  /* ─── Raw Materials state ─── */
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [materialsError, setMaterialsError] = useState<string | null>(null);

  const [editingMaterialId, setEditingMaterialId] = useState<number | null>(null);
  const [materialForm, setMaterialForm] = useState<RawMaterialFormState>(emptyMaterialForm);
  const [materialSubmitting, setMaterialSubmitting] = useState(false);
  const [materialFormError, setMaterialFormError] = useState<string | null>(null);
  const [deletingMaterialId, setDeletingMaterialId] = useState<number | null>(null);

  /* ─── Material Batches state ─── */
  const [batches, setBatches] = useState<MaterialBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [batchesError, setBatchesError] = useState<string | null>(null);

  const [batchForm, setBatchForm] = useState<BatchFormState>(emptyBatchForm);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchFormError, setBatchFormError] = useState<string | null>(null);
  const [deletingBatchId, setDeletingBatchId] = useState<number | null>(null);

  /* ────────── Fetchers ────────── */
  const fetchRawMaterials = useCallback(async () => {
    setLoadingMaterials(true);
    setMaterialsError(null);
    try {
      const res = await axios.get<RawMaterial[]>(`${API_URL}/raw-materials`);
      setRawMaterials(res.data);
    } catch (err) {
      setMaterialsError(
        axios.isAxiosError(err) && err.response
          ? `Failed to load raw materials: ${err.response.status}`
          : 'Could not reach the server. Check the console.'
      );
      console.error('Failed to load raw materials', err);
    } finally {
      setLoadingMaterials(false);
    }
  }, []);

  const fetchBatches = useCallback(async () => {
    setLoadingBatches(true);
    setBatchesError(null);
    try {
      const res = await axios.get<MaterialBatch[]>(`${API_URL}/material-batches`);
      setBatches(res.data);
    } catch (err) {
      setBatchesError(
        axios.isAxiosError(err) && err.response
          ? `Failed to load batches: ${err.response.status}`
          : 'Could not reach the server. Check the console.'
      );
      console.error('Failed to load material batches', err);
    } finally {
      setLoadingBatches(false);
    }
  }, []);

  useEffect(() => {
    fetchRawMaterials();
    fetchBatches();
  }, [fetchRawMaterials, fetchBatches]);

  /* ────────── Raw Material CRUD ────────── */
  const openEditMaterial = (material: RawMaterial) => {
    setEditingMaterialId(material.id);
    setMaterialForm({ name: material.name, unit: material.unit });
    setMaterialFormError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditMaterial = () => {
    setEditingMaterialId(null);
    setMaterialForm(emptyMaterialForm);
    setMaterialFormError(null);
  };

  const handleMaterialChange = (field: keyof RawMaterialFormState, value: string) => {
    setMaterialForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleMaterialSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMaterialSubmitting(true);
    setMaterialFormError(null);

    try {
      if (editingMaterialId != null) {
        await axios.patch(`${API_URL}/raw-materials/${editingMaterialId}`, materialForm);
      } else {
        await axios.post(`${API_URL}/raw-materials`, materialForm);
      }
      setEditingMaterialId(null);
      setMaterialForm(emptyMaterialForm);
      fetchRawMaterials();
    } catch (err) {
      setMaterialFormError(
        axios.isAxiosError(err) && err.response
          ? `Failed to save: ${err.response.status}`
          : 'Could not reach the server. Check the console.'
      );
      console.error('Failed to save raw material', err);
    } finally {
      setMaterialSubmitting(false);
    }
  };

  const handleMaterialDelete = async (id: number) => {
    if (!window.confirm('Delete this raw material? Its batches and consumption history will be deleted too.')) return;
    setDeletingMaterialId(id);
    try {
      await axios.delete(`${API_URL}/raw-materials/${id}`);
      setRawMaterials((prev) => prev.filter((m) => m.id !== id));
      if (editingMaterialId === id) cancelEditMaterial();
      fetchBatches();
    } catch (err) {
      console.error('Failed to delete raw material', err);
      window.alert('Failed to delete raw material. Check the console.');
    } finally {
      setDeletingMaterialId(null);
    }
  };

  /* ────────── Material Batch (Purchase) create/delete ────────── */
  const handleBatchChange = (field: keyof BatchFormState, value: string) => {
    setBatchForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleBatchSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBatchSubmitting(true);
    setBatchFormError(null);

    const quantityPurchased = parseFloat(batchForm.quantityPurchased);
    const unitPrice = parseFloat(batchForm.unitPrice);

    if (!batchForm.rawMaterialId || isNaN(quantityPurchased) || quantityPurchased <= 0 || isNaN(unitPrice) || unitPrice < 0) {
      setBatchFormError('Pick a material and enter a valid quantity and unit price.');
      setBatchSubmitting(false);
      return;
    }

    try {
      await axios.post(`${API_URL}/material-batches`, {
        rawMaterialId: Number(batchForm.rawMaterialId),
        quantityPurchased,
        unitPrice,
        purchaseDate: batchForm.purchaseDate || undefined,
      });
      setBatchForm(emptyBatchForm);
      fetchBatches();
    } catch (err) {
      setBatchFormError(
        axios.isAxiosError(err) && err.response
          ? `Failed to save: ${err.response.status}`
          : 'Could not reach the server. Check the console.'
      );
      console.error('Failed to save material batch', err);
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleBatchDelete = async (id: number) => {
    if (!window.confirm('Delete this batch? This cannot be undone.')) return;
    setDeletingBatchId(id);
    try {
      await axios.delete(`${API_URL}/material-batches/${id}`);
      setBatches((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error('Failed to delete material batch', err);
      window.alert('Failed to delete batch. Check the console.');
    } finally {
      setDeletingBatchId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-[1.4rem] font-extrabold text-[#1E1E1E] mb-2">Raw Materials Inventory</h2>
        <p className="text-[0.9rem] text-[#545454]">
          Manage your material catalog and track purchase batches at whatever price you paid that time.
        </p>
      </div>

      {/* ══════════ 1. RAW MATERIAL CREATE/EDIT FORM ══════════ */}
      <div className={cardClass}>
        <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E] border-b border-[#e8e8e8] pb-3 mb-4">
          <i className="fa-solid fa-cubes mr-2 text-[#e21e53]" />
          {editingMaterialId != null ? 'Edit Raw Material' : 'Add Raw Material'}
        </h3>
        <form onSubmit={handleMaterialSubmit} className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex flex-col gap-[0.4rem] flex-1">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Name</label>
            <input
              type="text"
              value={materialForm.name}
              onChange={(e) => handleMaterialChange('name', e.target.value)}
              placeholder="e.g. Wood"
              required
              disabled={materialSubmitting}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-[0.4rem] sm:w-[180px]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Unit</label>
            <select
              value={materialForm.unit}
              onChange={(e) => handleMaterialChange('unit', e.target.value)}
              required
              disabled={materialSubmitting}
              className={inputClass}
            >
              <option value="">Select unit</option>
              {UNIT_OPTIONS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={materialSubmitting} className={primaryBtnClass}>
              <i className={`fa-solid ${materialSubmitting ? 'fa-spinner fa-spin' : 'fa-save'}`} />
              {materialSubmitting ? 'Saving...' : editingMaterialId != null ? 'Save Changes' : 'Add Material'}
            </button>
            {editingMaterialId != null && (
              <button type="button" onClick={cancelEditMaterial} disabled={materialSubmitting} className={secondaryBtnClass}>
                Cancel
              </button>
            )}
          </div>
        </form>
        {materialFormError && <p className="text-[0.8rem] font-semibold text-[#ef4444] mt-3">{materialFormError}</p>}
      </div>

      {/* ══════════ 2. RAW MATERIALS TABLE ══════════ */}
      <div className={cardClass}>
        <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3 mb-4">
          <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E]">
            <i className="fa-solid fa-list mr-2 text-[#e21e53]" />
            Raw Materials
          </h3>
          <span className="rounded-full bg-[rgba(16,185,129,0.1)] text-[#10b981] text-[0.7rem] font-bold px-3 py-1">
            {rawMaterials.length} {rawMaterials.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {loadingMaterials && <p className="text-[0.8rem] font-semibold text-[#545454]">Loading raw materials...</p>}
        {!loadingMaterials && materialsError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{materialsError}</p>}
        {!loadingMaterials && !materialsError && rawMaterials.length === 0 && (
          <p className="text-[0.8rem] font-semibold text-[#545454]">No raw materials yet. Add your first one above.</p>
        )}

        {!loadingMaterials && !materialsError && rawMaterials.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#e8e8e8]">
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454]">Name</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454]">Unit</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rawMaterials.map((m) => (
                  <tr key={m.id} className="border-b border-[#f1f1f1] last:border-0">
                    <td className="py-3 pr-3 text-[0.875rem] font-bold text-[#1E1E1E]">{m.name}</td>
                    <td className="py-3 pr-3 text-[0.875rem] font-medium text-[#545454]">{m.unit}</td>
                    <td className="py-3 pr-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditMaterial(m)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#e8e8e8] text-[#545454] hover:bg-[#f8fafc] hover:text-[#1E1E1E] transition-colors duration-200 cursor-pointer"
                          title="Edit"
                        >
                          <i className="fa-solid fa-pen" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMaterialDelete(m.id)}
                          disabled={deletingMaterialId === m.id}
                          className="h-8 w-8 flex items-center justify-center rounded-lg border border-[rgba(239,68,68,0.25)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors duration-200 disabled:opacity-60 cursor-pointer"
                          title="Delete"
                        >
                          <i className={`fa-solid ${deletingMaterialId === m.id ? 'fa-spinner fa-spin' : 'fa-trash'}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════ 3. BATCHES ══════════ */}
      <div className={cardClass}>
        <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E] border-b border-[#e8e8e8] pb-3 mb-4">
          <i className="fa-solid fa-boxes-stacked mr-2 text-[#e21e53]" />
          Record a Purchase (Batch)
        </h3>
        <form onSubmit={handleBatchSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:items-end">
          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Material</label>
            <select
              value={batchForm.rawMaterialId}
              onChange={(e) => handleBatchChange('rawMaterialId', e.target.value)}
              required
              disabled={batchSubmitting}
              className={inputClass}
            >
              <option value="">Select material</option>
              {rawMaterials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.unit})
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Quantity</label>
            <input
              type="number"
              step="0.01"
              value={batchForm.quantityPurchased}
              onChange={(e) => handleBatchChange('quantityPurchased', e.target.value)}
              placeholder="e.g. 100"
              required
              disabled={batchSubmitting}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Unit Price (৳)</label>
            <input
              type="number"
              step="0.01"
              value={batchForm.unitPrice}
              onChange={(e) => handleBatchChange('unitPrice', e.target.value)}
              placeholder="e.g. 30"
              required
              disabled={batchSubmitting}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Purchase Date</label>
            <input
              type="date"
              value={batchForm.purchaseDate}
              onChange={(e) => handleBatchChange('purchaseDate', e.target.value)}
              disabled={batchSubmitting}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-4">
            <button type="submit" disabled={batchSubmitting} className={primaryBtnClass}>
              <i className={`fa-solid ${batchSubmitting ? 'fa-spinner fa-spin' : 'fa-plus'}`} />
              {batchSubmitting ? 'Saving...' : 'Record Purchase'}
            </button>
          </div>
        </form>
        {batchFormError && <p className="text-[0.8rem] font-semibold text-[#ef4444] mt-3">{batchFormError}</p>}
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3 mb-4">
          <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E]">
            <i className="fa-solid fa-clock-rotate-left mr-2 text-[#e21e53]" />
            Batches
          </h3>
          <span className="rounded-full bg-[rgba(59,130,246,0.1)] text-[#3b82f6] text-[0.7rem] font-bold px-3 py-1">
            {batches.length} {batches.length === 1 ? 'batch' : 'batches'}
          </span>
        </div>

        {loadingBatches && <p className="text-[0.8rem] font-semibold text-[#545454]">Loading batches...</p>}
        {!loadingBatches && batchesError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{batchesError}</p>}
        {!loadingBatches && !batchesError && batches.length === 0 && (
          <p className="text-[0.8rem] font-semibold text-[#545454]">No purchases recorded yet.</p>
        )}

        {!loadingBatches && !batchesError && batches.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#e8e8e8]">
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454]">Material</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] text-right">Qty Purchased</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] text-right">Unit Price</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] text-right">Total Cost</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] text-right">Remaining</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454]">Purchase Date</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-b border-[#f1f1f1] last:border-0">
                    <td className="py-3 pr-3 text-[0.875rem] font-bold text-[#1E1E1E]">
                      {b.rawMaterialName}
                      {b.rawMaterialUnit && (
                        <span className="ml-1 font-medium text-[#545454]">({b.rawMaterialUnit})</span>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-[0.875rem] font-medium text-[#545454] text-right">{b.quantityPurchased}</td>
                    <td className="py-3 pr-3 text-[0.875rem] font-medium text-[#545454] text-right">৳{b.unitPrice}</td>
                    <td className="py-3 pr-3 text-[0.875rem] font-bold text-[#1E1E1E] text-right">৳{b.totalCost}</td>
                    <td className="py-3 pr-3 text-[0.875rem] font-semibold text-right">
                      <span
                        className={
                          b.quantityRemaining <= 0
                            ? 'text-[#ef4444]'
                            : b.quantityRemaining < b.quantityPurchased
                              ? 'text-[#f59e0b]'
                              : 'text-[#10b981]'
                        }
                      >
                        {b.quantityRemaining}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-[0.8rem] font-medium text-[#545454]">{b.purchaseDate || '—'}</td>
                    <td className="py-3 pr-3">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleBatchDelete(b.id)}
                          disabled={deletingBatchId === b.id}
                          className="h-8 w-8 flex items-center justify-center rounded-lg border border-[rgba(239,68,68,0.25)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors duration-200 disabled:opacity-60 cursor-pointer"
                          title="Delete"
                        >
                          <i className={`fa-solid ${deletingBatchId === b.id ? 'fa-spinner fa-spin' : 'fa-trash'}`} />
                        </button>
                      </div>
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
