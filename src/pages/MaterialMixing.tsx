import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getApiErrorMessage } from '../utils/apiError';
import { formatQty } from '../utils/formatNumber';

const API_URL = import.meta.env.VITE_API_URL;

interface RawMaterialOption {
  id: number;
  name: string;
  unit: string;
}

interface MixRecord {
  id: number;
  materialAName: string;
  materialAUnit?: string;
  quantityA: number;
  materialBName: string;
  materialBUnit?: string;
  quantityB: number;
  outputMaterialName: string;
  outputUnit?: string;
  outputQuantity: number;
  mixDate?: string;
  createdAt: string;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

interface MixFormState {
  materialAId: string;
  quantityA: string;
  materialBId: string;
  quantityB: string;
  outputMaterialId: string;
  mixDate: string;
}

const emptyMixForm: MixFormState = {
  materialAId: '',
  quantityA: '',
  materialBId: '',
  quantityB: '',
  outputMaterialId: '',
  mixDate: today(),
};

const inputClass =
  'w-full bg-white border border-[#e8e8e8] text-[#1E1E1E] px-[0.85rem] py-[0.65rem] rounded-lg text-[0.875rem] font-medium transition-all duration-200 outline-none focus:border-[#e21e53] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] disabled:opacity-60 disabled:cursor-not-allowed';

const cardClass =
  'bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]';

const primaryBtnClass =
  'h-10 px-4 flex items-center gap-2 rounded-lg bg-[#e21e53] text-white font-bold text-[0.875rem] transition-all duration-200 hover:bg-[#c01745] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer';

export default function MaterialMixing() {
  const [rawMaterials, setRawMaterials] = useState<RawMaterialOption[]>([]);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [mixes, setMixes] = useState<MixRecord[]>([]);
  const [loadingMixes, setLoadingMixes] = useState(false);
  const [mixesError, setMixesError] = useState<string | null>(null);

  const [form, setForm] = useState<MixFormState>(emptyMixForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchRawMaterials = useCallback(async () => {
    setLoadingOptions(true);
    setOptionsError(null);
    try {
      const res = await axios.get<RawMaterialOption[]>(`${API_URL}/raw-materials`);
      setRawMaterials(res.data);
    } catch (err) {
      setOptionsError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to load raw materials', err);
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  const fetchMixes = useCallback(async () => {
    setLoadingMixes(true);
    setMixesError(null);
    try {
      const res = await axios.get<MixRecord[]>(`${API_URL}/material-mixes`);
      setMixes(res.data);
    } catch (err) {
      setMixesError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to load material mixes', err);
    } finally {
      setLoadingMixes(false);
    }
  }, []);

  useEffect(() => {
    fetchRawMaterials();
    fetchMixes();
  }, [fetchRawMaterials, fetchMixes]);

  const handleChange = (field: keyof MixFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const materialA = rawMaterials.find((m) => String(m.id) === form.materialAId);
  const materialB = rawMaterials.find((m) => String(m.id) === form.materialBId);
  const outputMaterial = rawMaterials.find((m) => String(m.id) === form.outputMaterialId);
  const quantityANum = Number(form.quantityA) || 0;
  const quantityBNum = Number(form.quantityB) || 0;
  const combinedQuantity = quantityANum + quantityBNum;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);

    if (!form.materialAId || !form.materialBId || !form.outputMaterialId) {
      setFormError('Select both input materials and the output material.');
      return;
    }
    if (form.materialAId === form.materialBId) {
      setFormError('Pick two different materials to mix.');
      return;
    }
    if (form.outputMaterialId === form.materialAId || form.outputMaterialId === form.materialBId) {
      setFormError('The output material must be different from the two inputs.');
      return;
    }
    if (quantityANum <= 0 || quantityBNum <= 0) {
      setFormError('Enter a quantity greater than zero for both materials.');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/material-mixes`, {
        materialAId: Number(form.materialAId),
        quantityA: quantityANum,
        materialBId: Number(form.materialBId),
        quantityB: quantityBNum,
        outputMaterialId: Number(form.outputMaterialId),
        mixDate: form.mixDate,
      });
      setSuccess(
        `Mixed ${formatQty(combinedQuantity)} ${outputMaterial?.unit ?? ''} of ${outputMaterial?.name} and added it to stock.`,
      );
      setForm({ ...emptyMixForm, mixDate: form.mixDate });
      fetchMixes();
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to record material mix', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (mix: MixRecord) => {
    if (
      !window.confirm(
        `Delete this mix? This removes the ${mix.outputMaterialName} stock it produced and restores ${mix.materialAName}/${mix.materialBName} back to stock.`,
      )
    ) {
      return;
    }
    setDeletingId(mix.id);
    try {
      await axios.delete(`${API_URL}/material-mixes/${mix.id}`);
      fetchMixes();
    } catch (err) {
      window.alert(getApiErrorMessage(err, 'Failed to delete mix. Check the console.'));
      console.error('Failed to delete material mix', err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="pb-4">
        <h2 className="text-[1.4rem] font-extrabold text-[#1E1E1E] mb-2">Material Mixing</h2>
        <p className="text-[0.9rem] text-[#545454]">
          Combine two raw materials at whatever ratio you need into a third -- e.g. Color + Ayca into Gesso. Add
          stock of the inputs first on the Raw Materials Inventory page, then mix here; the output shows up as
          stock there too.
        </p>
      </div>

      {optionsError && <p className="mb-3 text-[0.8rem] font-semibold text-[#ef4444]">{optionsError}</p>}

      <div className={`${cardClass} mb-6`}>
        <h3 className="text-base font-extrabold border-b border-[#e8e8e8] pb-2 mb-4 text-[#1E1E1E]">
          <i className="fa-solid fa-flask mr-[0.4rem] text-[#e21e53]" />
          Mix Materials
        </h3>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-4 md:items-end">
            <div className="flex flex-col gap-[0.4rem] flex-1 min-w-[200px]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Material A</label>
              <select
                value={form.materialAId}
                onChange={(e) => handleChange('materialAId', e.target.value)}
                required
                disabled={loadingOptions || submitting}
                className={inputClass}
              >
                <option value="" disabled>
                  Select a material...
                </option>
                {rawMaterials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.unit})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-[0.4rem] w-full sm:w-[150px]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Quantity {materialA ? `(${materialA.unit})` : ''}</label>
              <input
                type="number"
                step="any"
                value={form.quantityA}
                onChange={(e) => handleChange('quantityA', e.target.value)}
                placeholder="e.g. 5"
                required
                disabled={submitting}
                className={inputClass}
              />
            </div>

            <div className="flex items-center justify-center px-1 pb-2 text-[#545454]">
              <i className="fa-solid fa-plus" />
            </div>

            <div className="flex flex-col gap-[0.4rem] flex-1 min-w-[200px]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Material B</label>
              <select
                value={form.materialBId}
                onChange={(e) => handleChange('materialBId', e.target.value)}
                required
                disabled={loadingOptions || submitting}
                className={inputClass}
              >
                <option value="" disabled>
                  Select a material...
                </option>
                {rawMaterials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.unit})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-[0.4rem] w-full sm:w-[150px]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Quantity {materialB ? `(${materialB.unit})` : ''}</label>
              <input
                type="number"
                step="any"
                value={form.quantityB}
                onChange={(e) => handleChange('quantityB', e.target.value)}
                placeholder="e.g. 2"
                required
                disabled={submitting}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 md:items-end rounded-lg border border-dashed border-[#e8e8e8] bg-[#f8fafc] p-3">
            <div className="flex items-center justify-center px-1 text-[#545454]">
              <i className="fa-solid fa-arrow-right" />
            </div>
            <div className="flex flex-col gap-[0.4rem] flex-1 min-w-[200px]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Output Material (becomes stock)</label>
              <select
                value={form.outputMaterialId}
                onChange={(e) => handleChange('outputMaterialId', e.target.value)}
                required
                disabled={loadingOptions || submitting}
                className={inputClass}
              >
                <option value="" disabled>
                  Select the resulting material...
                </option>
                {rawMaterials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.unit})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-[0.4rem] w-full sm:w-[170px]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Output Qty (auto)</label>
              <div className={`${inputClass} bg-white text-[#545454] flex items-center`}>
                {combinedQuantity > 0 ? `${formatQty(combinedQuantity)} ${outputMaterial?.unit ?? ''}` : '—'}
              </div>
            </div>
            <div className="flex flex-col gap-[0.4rem] w-full sm:w-[160px]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Date</label>
              <input
                type="date"
                value={form.mixDate}
                onChange={(e) => handleChange('mixDate', e.target.value)}
                disabled={submitting}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <button type="submit" disabled={submitting || loadingOptions} className={primaryBtnClass}>
              <i className={`fa-solid ${submitting ? 'fa-spinner fa-spin' : 'fa-flask'}`} />
              {submitting ? 'Mixing...' : 'Mix & Add to Stock'}
            </button>
          </div>
        </form>

        {formError && <p className="mt-3 text-[0.8rem] font-semibold text-[#ef4444]">{formError}</p>}
        {success && <p className="mt-3 text-[0.8rem] font-semibold text-[#10b981]">{success}</p>}
      </div>

      <div className={cardClass}>
        <h3 className="text-base font-extrabold border-b border-[#e8e8e8] pb-2 mb-4 text-[#1E1E1E]">
          <i className="fa-solid fa-clock-rotate-left mr-[0.4rem] text-[#161138]" />
          Mix History
        </h3>

        {loadingMixes && <p className="text-[0.8rem] font-semibold text-[#545454]">Loading mixes...</p>}
        {!loadingMixes && mixesError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{mixesError}</p>}
        {!loadingMixes && !mixesError && mixes.length === 0 && (
          <p className="text-[0.8rem] font-semibold text-[#545454]">No mixes recorded yet.</p>
        )}

        {!loadingMixes && !mixesError && mixes.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[0.85rem]">
              <thead>
                <tr className="border-b border-[#e8e8e8] text-[0.72rem] uppercase tracking-[0.05em] text-[#545454]">
                  <th className="py-2 pr-4 font-bold">Date</th>
                  <th className="py-2 pr-4 font-bold">Input A</th>
                  <th className="py-2 pr-4 font-bold">Input B</th>
                  <th className="py-2 pr-4 font-bold">Output</th>
                  <th className="py-2 pr-4 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mixes.map((mix) => (
                  <tr key={mix.id} className="border-b border-[#f1f1f1] last:border-0">
                    <td className="py-3 pr-4 text-[#545454]">{mix.mixDate || '—'}</td>
                    <td className="py-3 pr-4 text-[#545454]">
                      {formatQty(mix.quantityA)} {mix.materialAUnit} {mix.materialAName}
                    </td>
                    <td className="py-3 pr-4 text-[#545454]">
                      {formatQty(mix.quantityB)} {mix.materialBUnit} {mix.materialBName}
                    </td>
                    <td className="py-3 pr-4 font-bold text-[#1E1E1E]">
                      {formatQty(mix.outputQuantity)} {mix.outputUnit} {mix.outputMaterialName}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => handleDelete(mix)}
                          disabled={deletingId === mix.id}
                          title="Delete mix"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e8e8e8] text-[#545454] transition-colors duration-200 hover:border-[#ef4444] hover:text-[#ef4444] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <i className={`fa-solid ${deletingId === mix.id ? 'fa-spinner fa-spin' : 'fa-trash'}`} />
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
