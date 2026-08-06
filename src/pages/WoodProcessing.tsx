import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import MultiSelect from '../components/MultiSelect';
import { getApiErrorMessage } from '../utils/apiError';
import { formatQty } from '../utils/formatNumber';

const API_URL = import.meta.env.VITE_API_URL;

interface WoodType {
  id: number;
  name: string;
  unit: string;
}

interface WasteType {
  id: number;
  name: string;
}

interface WoodStage {
  id: number;
  name: string;
  inputTypeId: number;
  inputType: WoodType;
  outputTypeId: number;
  outputType: WoodType;
  wageRatePerUnit: number;
  sequence: number;
  mirrorToRawMaterialId?: number;
  defaultWasteTypeId?: number;
  active: boolean;
}

interface EmployeeOption {
  id: number;
  name: string;
  status: 'active' | 'inactive';
}

interface WoodProcessingEntry {
  id: number;
  stage: WoodStage;
  stageName: string;
  employees: EmployeeOption[];
  outputQuantity: number;
  wasteQuantity: number;
  wageRateUsed: number;
  entryDate?: string;
  createdAt: string;
}

interface WoodStockSummaryRow {
  woodTypeId: number;
  woodTypeName: string;
  unit: string;
  quantityRemaining: number;
  averageUnitPrice: number;
  stockValue: number;
}

interface RawMaterialOption {
  id: number;
  name: string;
  unit: string;
}

interface EntryFormState {
  stageId: string;
  employeeIds: number[];
  outputQuantity: string;
  wasteQuantity: string;
  wasteTypeId: string;
  entryDate: string;
}

interface PurchaseFormState {
  woodTypeId: string;
  quantity: string;
  unitPrice: string;
  batchDate: string;
}

interface WoodTypeFormState {
  name: string;
  unit: string;
}

interface StageFormState {
  name: string;
  inputTypeId: string;
  outputTypeId: string;
  wageRatePerUnit: string;
  sequence: string;
  mirrorToRawMaterialId: string;
  defaultWasteTypeId: string;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const emptyEntryForm: EntryFormState = {
  stageId: '',
  employeeIds: [],
  outputQuantity: '',
  wasteQuantity: '',
  wasteTypeId: '',
  entryDate: today(),
};

const emptyPurchaseForm: PurchaseFormState = {
  woodTypeId: '',
  quantity: '',
  unitPrice: '',
  batchDate: today(),
};

const emptyWoodTypeForm: WoodTypeFormState = { name: '', unit: 'kg' };

const emptyStageForm: StageFormState = {
  name: '',
  inputTypeId: '',
  outputTypeId: '',
  wageRatePerUnit: '',
  sequence: '',
  mirrorToRawMaterialId: '',
  defaultWasteTypeId: '',
};

const inputClass =
  'w-full bg-white border border-[#e8e8e8] text-[#1E1E1E] px-[0.85rem] py-[0.65rem] rounded-lg text-[0.875rem] font-medium transition-all duration-200 outline-none focus:border-[#e21e53] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] disabled:opacity-60 disabled:cursor-not-allowed';

const cardClass =
  'bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]';

const primaryBtnClass =
  'h-10 px-4 flex items-center gap-2 rounded-lg bg-[#e21e53] text-white font-bold text-[0.875rem] transition-all duration-200 hover:bg-[#c01745] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer';

export default function WoodProcessing() {
  const [stock, setStock] = useState<WoodStockSummaryRow[]>([]);
  const [stages, setStages] = useState<WoodStage[]>([]);
  const [woodTypes, setWoodTypes] = useState<WoodType[]>([]);
  const [wasteTypes, setWasteTypes] = useState<WasteType[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [entries, setEntries] = useState<WoodProcessingEntry[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [entryForm, setEntryForm] = useState<EntryFormState>(emptyEntryForm);
  const [entrySubmitting, setEntrySubmitting] = useState(false);
  const [entryFormError, setEntryFormError] = useState<string | null>(null);

  const [purchaseForm, setPurchaseForm] = useState<PurchaseFormState>(emptyPurchaseForm);
  const [purchaseSubmitting, setPurchaseSubmitting] = useState(false);
  const [purchaseFormError, setPurchaseFormError] = useState<string | null>(null);

  const [rateEdits, setRateEdits] = useState<Record<number, string>>({});
  const [savingRateId, setSavingRateId] = useState<number | null>(null);

  const [rawMaterials, setRawMaterials] = useState<RawMaterialOption[]>([]);

  const [woodTypeForm, setWoodTypeForm] = useState<WoodTypeFormState>(emptyWoodTypeForm);
  const [woodTypeSubmitting, setWoodTypeSubmitting] = useState(false);
  const [woodTypeFormError, setWoodTypeFormError] = useState<string | null>(null);

  const [stageForm, setStageForm] = useState<StageFormState>(emptyStageForm);
  const [stageSubmitting, setStageSubmitting] = useState(false);
  const [stageFormError, setStageFormError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [stockRes, stagesRes, woodTypesRes, wasteTypesRes, employeesRes, entriesRes, rawMaterialsRes] =
        await Promise.all([
          axios.get<WoodStockSummaryRow[]>(`${API_URL}/wood-stock/summary`),
          axios.get<WoodStage[]>(`${API_URL}/wood-stages`),
          axios.get<WoodType[]>(`${API_URL}/wood-types`),
          axios.get<WasteType[]>(`${API_URL}/waste-types`),
          axios.get<EmployeeOption[]>(`${API_URL}/employees`),
          axios.get<WoodProcessingEntry[]>(`${API_URL}/wood-processing-entries`),
          axios.get<RawMaterialOption[]>(`${API_URL}/raw-materials`),
        ]);
      setStock(stockRes.data);
      setStages(stagesRes.data);
      setWoodTypes(woodTypesRes.data);
      setWasteTypes(wasteTypesRes.data);
      setEmployees(employeesRes.data);
      setEntries(entriesRes.data);
      setRawMaterials(rawMaterialsRes.data);
    } catch (err) {
      setLoadError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to load wood processing data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const activeEmployees = employees.filter((e) => e.status === 'active');
  const selectedStage = stages.find((s) => String(s.id) === entryForm.stageId);
  const wasteQuantityNum = Number(entryForm.wasteQuantity) || 0;
  const needsWasteType =
    wasteQuantityNum > 0 && !selectedStage?.defaultWasteTypeId && !entryForm.wasteTypeId;

  const handleEntryChange = (field: keyof EntryFormState, value: string) => {
    setEntryForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEntrySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEntryFormError(null);

    if (!entryForm.stageId) {
      setEntryFormError('Select a processing stage.');
      return;
    }
    if (entryForm.employeeIds.length === 0) {
      setEntryFormError('Select at least one artisan.');
      return;
    }
    const outputQuantity = Number(entryForm.outputQuantity);
    if (!outputQuantity || outputQuantity <= 0) {
      setEntryFormError('Enter the output quantity (weight after processing).');
      return;
    }
    if (needsWasteType) {
      setEntryFormError('This stage has no default waste type -- pick one for the waste produced.');
      return;
    }

    setEntrySubmitting(true);
    try {
      await axios.post(`${API_URL}/wood-processing-entries`, {
        stageId: Number(entryForm.stageId),
        employeeIds: entryForm.employeeIds,
        outputQuantity,
        wasteQuantity: wasteQuantityNum,
        wasteTypeId: entryForm.wasteTypeId ? Number(entryForm.wasteTypeId) : undefined,
        entryDate: entryForm.entryDate,
      });
      setEntryForm({ ...emptyEntryForm, entryDate: entryForm.entryDate });
      loadAll();
    } catch (err) {
      setEntryFormError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to save wood processing entry', err);
    } finally {
      setEntrySubmitting(false);
    }
  };

  const handlePurchaseChange = (field: keyof PurchaseFormState, value: string) => {
    setPurchaseForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePurchaseSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPurchaseFormError(null);

    const quantity = Number(purchaseForm.quantity);
    const unitPrice = Number(purchaseForm.unitPrice);
    if (!purchaseForm.woodTypeId || !quantity || quantity <= 0 || isNaN(unitPrice) || unitPrice < 0) {
      setPurchaseFormError('Pick a wood type and enter a valid quantity and unit price.');
      return;
    }

    setPurchaseSubmitting(true);
    try {
      await axios.post(`${API_URL}/wood-stock/purchase`, {
        woodTypeId: Number(purchaseForm.woodTypeId),
        quantity,
        unitPrice,
        batchDate: purchaseForm.batchDate,
      });
      setPurchaseForm({ ...emptyPurchaseForm, batchDate: purchaseForm.batchDate });
      loadAll();
    } catch (err) {
      setPurchaseFormError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to save wood purchase', err);
    } finally {
      setPurchaseSubmitting(false);
    }
  };

  const handleRateSave = async (stage: WoodStage) => {
    const raw = rateEdits[stage.id];
    if (raw == null) return;
    const wageRatePerUnit = Number(raw);
    if (isNaN(wageRatePerUnit) || wageRatePerUnit < 0) {
      window.alert('Enter a valid, non-negative wage rate.');
      return;
    }
    setSavingRateId(stage.id);
    try {
      await axios.patch(`${API_URL}/wood-stages/${stage.id}`, { wageRatePerUnit });
      setRateEdits((prev) => {
        const next = { ...prev };
        delete next[stage.id];
        return next;
      });
      loadAll();
    } catch (err) {
      window.alert(getApiErrorMessage(err, 'Failed to update wage rate. Check the console.'));
      console.error('Failed to update wage rate', err);
    } finally {
      setSavingRateId(null);
    }
  };

  const handleWoodTypeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setWoodTypeFormError(null);
    if (!woodTypeForm.name.trim() || !woodTypeForm.unit.trim()) {
      setWoodTypeFormError('Enter a name and unit.');
      return;
    }
    setWoodTypeSubmitting(true);
    try {
      await axios.post(`${API_URL}/wood-types`, {
        name: woodTypeForm.name.trim(),
        unit: woodTypeForm.unit.trim(),
      });
      setWoodTypeForm(emptyWoodTypeForm);
      loadAll();
    } catch (err) {
      setWoodTypeFormError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to create wood type', err);
    } finally {
      setWoodTypeSubmitting(false);
    }
  };

  const handleStageSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStageFormError(null);

    if (!stageForm.name.trim()) {
      setStageFormError('Enter a stage name.');
      return;
    }
    if (!stageForm.inputTypeId || !stageForm.outputTypeId) {
      setStageFormError('Pick an input and output wood type.');
      return;
    }
    const wageRatePerUnit = Number(stageForm.wageRatePerUnit);
    if (isNaN(wageRatePerUnit) || wageRatePerUnit < 0) {
      setStageFormError('Enter a valid, non-negative wage rate.');
      return;
    }

    setStageSubmitting(true);
    try {
      await axios.post(`${API_URL}/wood-stages`, {
        name: stageForm.name.trim(),
        inputTypeId: Number(stageForm.inputTypeId),
        outputTypeId: Number(stageForm.outputTypeId),
        wageRatePerUnit,
        sequence: stageForm.sequence ? Number(stageForm.sequence) : undefined,
        mirrorToRawMaterialId: stageForm.mirrorToRawMaterialId
          ? Number(stageForm.mirrorToRawMaterialId)
          : undefined,
        defaultWasteTypeId: stageForm.defaultWasteTypeId ? Number(stageForm.defaultWasteTypeId) : undefined,
      });
      setStageForm(emptyStageForm);
      loadAll();
    } catch (err) {
      setStageFormError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to create wood stage', err);
    } finally {
      setStageSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-[1.4rem] font-extrabold text-[#1E1E1E] mb-2">Wood Processing</h2>
        <p className="text-[0.9rem] text-[#545454]">
          Raw wood through slicing and cutting -- decoupled from Tasks/Daily Entry. Each stage's output cost
          compounds: (consumed x source price) + wages, split across the good output only.
        </p>
      </div>

      {loadError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{loadError}</p>}

      {/* Stock summary */}
      <div className={cardClass}>
        <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E] border-b border-[#e8e8e8] pb-3 mb-4">
          <i className="fa-solid fa-layer-group mr-2 text-[#e21e53]" />
          Wood Stock
        </h3>
        {loading && <p className="text-[0.8rem] font-semibold text-[#545454]">Loading...</p>}
        {!loading && stock.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
            {stock.map((row) => (
              <div key={row.woodTypeId} className="rounded-lg border border-[#e8e8e8] p-4">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.05em] text-[#545454] m-0">
                  {row.woodTypeName}
                </p>
                <p className="text-[1.1rem] font-extrabold text-[#1E1E1E] m-0 mt-1">
                  {formatQty(row.quantityRemaining)} {row.unit}
                </p>
                <p className="text-[0.75rem] text-[#545454] m-0 mt-1">
                  avg ৳{row.averageUnitPrice.toFixed(2)}/{row.unit} -- value ৳{row.stockValue.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Purchase raw wood */}
      <div className={cardClass}>
        <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E] border-b border-[#e8e8e8] pb-3 mb-4">
          <i className="fa-solid fa-truck-ramp-box mr-2 text-[#e21e53]" />
          Record a Purchase
        </h3>
        <form onSubmit={handlePurchaseSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:items-end">
          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Wood Type</label>
            <select
              value={purchaseForm.woodTypeId}
              onChange={(e) => handlePurchaseChange('woodTypeId', e.target.value)}
              required
              disabled={purchaseSubmitting}
              className={inputClass}
            >
              <option value="">Select wood type</option>
              {woodTypes.map((wt) => (
                <option key={wt.id} value={wt.id}>
                  {wt.name} ({wt.unit})
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Quantity</label>
            <input
              type="number"
              step="0.01"
              value={purchaseForm.quantity}
              onChange={(e) => handlePurchaseChange('quantity', e.target.value)}
              placeholder="e.g. 100"
              required
              disabled={purchaseSubmitting}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Unit Price (৳)</label>
            <input
              type="number"
              step="0.01"
              value={purchaseForm.unitPrice}
              onChange={(e) => handlePurchaseChange('unitPrice', e.target.value)}
              placeholder="e.g. 10"
              required
              disabled={purchaseSubmitting}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Date</label>
            <input
              type="date"
              value={purchaseForm.batchDate}
              onChange={(e) => handlePurchaseChange('batchDate', e.target.value)}
              required
              disabled={purchaseSubmitting}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-4">
            <button type="submit" disabled={purchaseSubmitting} className={primaryBtnClass}>
              <i className={`fa-solid ${purchaseSubmitting ? 'fa-spinner fa-spin' : 'fa-plus'}`} />
              {purchaseSubmitting ? 'Saving...' : 'Record Purchase'}
            </button>
          </div>
        </form>
        {purchaseFormError && <p className="text-[0.8rem] font-semibold text-[#ef4444] mt-3">{purchaseFormError}</p>}
      </div>

      {/* New processing entry */}
      <div className={cardClass}>
        <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E] border-b border-[#e8e8e8] pb-3 mb-4">
          <i className="fa-solid fa-square-plus mr-2 text-[#e21e53]" />
          New Processing Entry
        </h3>
        <form onSubmit={handleEntrySubmit} className="flex flex-wrap gap-4 md:items-end">
          <div className="flex flex-col gap-[0.4rem] flex-1 min-w-[220px]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Stage</label>
            <select
              value={entryForm.stageId}
              onChange={(e) => handleEntryChange('stageId', e.target.value)}
              required
              disabled={loading || entrySubmitting}
              className={inputClass}
            >
              <option value="">Select a stage...</option>
              {stages.map((stage) => (
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
              selectedIds={entryForm.employeeIds}
              onChange={(ids) => setEntryForm((prev) => ({ ...prev, employeeIds: ids }))}
              placeholder="Select artisan(s)..."
              disabled={loading || entrySubmitting}
            />
          </div>

          <div className="flex flex-col gap-[0.4rem] w-full sm:w-[170px]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Output Qty (after processing)</label>
            <input
              type="number"
              step="any"
              value={entryForm.outputQuantity}
              onChange={(e) => handleEntryChange('outputQuantity', e.target.value)}
              placeholder="e.g. 10"
              required
              disabled={entrySubmitting}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-[0.4rem] w-full sm:w-[150px]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Waste Qty</label>
            <input
              type="number"
              step="any"
              value={entryForm.wasteQuantity}
              onChange={(e) => handleEntryChange('wasteQuantity', e.target.value)}
              placeholder="e.g. 1"
              disabled={entrySubmitting}
              className={inputClass}
            />
          </div>

          {wasteQuantityNum > 0 && (
            <div className="flex flex-col gap-[0.4rem] w-full sm:w-[180px]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">
                Waste Type {selectedStage?.defaultWasteTypeId ? '(override)' : ''}
              </label>
              <select
                value={entryForm.wasteTypeId}
                onChange={(e) => handleEntryChange('wasteTypeId', e.target.value)}
                disabled={entrySubmitting}
                className={inputClass}
              >
                <option value="">
                  {selectedStage?.defaultWasteType?.name
                    ? `Default: ${selectedStage.defaultWasteType.name}`
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
              value={entryForm.entryDate}
              onChange={(e) => handleEntryChange('entryDate', e.target.value)}
              disabled={entrySubmitting}
              className={inputClass}
            />
          </div>

          <button type="submit" disabled={entrySubmitting || loading} className={primaryBtnClass}>
            <i className={`fa-solid ${entrySubmitting ? 'fa-spinner fa-spin' : 'fa-save'}`} />
            {entrySubmitting ? 'Saving...' : 'Add Entry'}
          </button>
        </form>
        {entryFormError && <p className="mt-3 text-[0.8rem] font-semibold text-[#ef4444]">{entryFormError}</p>}
      </div>

      {/* Add wood type + Add stage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cardClass}>
          <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E] border-b border-[#e8e8e8] pb-3 mb-4">
            <i className="fa-solid fa-tag mr-2 text-[#e21e53]" />
            Add Wood Type
          </h3>
          <p className="text-[0.75rem] text-[#545454] mb-3">
            Only needed if a new stage needs a wood type that doesn't exist yet -- raw wood, sliced wood, and
            the cut stages are already seeded.
          </p>
          <form onSubmit={handleWoodTypeSubmit} className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-[0.4rem] flex-1 min-w-[160px]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Name</label>
              <input
                type="text"
                value={woodTypeForm.name}
                onChange={(e) => setWoodTypeForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Sanded Wood"
                disabled={woodTypeSubmitting}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-[0.4rem] w-[100px]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Unit</label>
              <input
                type="text"
                value={woodTypeForm.unit}
                onChange={(e) => setWoodTypeForm((prev) => ({ ...prev, unit: e.target.value }))}
                placeholder="kg"
                disabled={woodTypeSubmitting}
                className={inputClass}
              />
            </div>
            <button type="submit" disabled={woodTypeSubmitting} className={primaryBtnClass}>
              <i className={`fa-solid ${woodTypeSubmitting ? 'fa-spinner fa-spin' : 'fa-plus'}`} />
              Add
            </button>
          </form>
          {woodTypeFormError && <p className="text-[0.8rem] font-semibold text-[#ef4444] mt-3">{woodTypeFormError}</p>}
        </div>

        <div className={cardClass}>
          <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E] border-b border-[#e8e8e8] pb-3 mb-4">
            <i className="fa-solid fa-square-plus mr-2 text-[#e21e53]" />
            Add Stage
          </h3>
          <form onSubmit={handleStageSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-[0.4rem]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Stage Name</label>
              <input
                type="text"
                value={stageForm.name}
                onChange={(e) => setStageForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Sanding"
                disabled={stageSubmitting}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-[0.4rem]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Input Type</label>
                <select
                  value={stageForm.inputTypeId}
                  onChange={(e) => setStageForm((prev) => ({ ...prev, inputTypeId: e.target.value }))}
                  disabled={stageSubmitting}
                  className={inputClass}
                >
                  <option value="">Select input</option>
                  {woodTypes.map((wt) => (
                    <option key={wt.id} value={wt.id}>
                      {wt.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-[0.4rem]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Output Type</label>
                <select
                  value={stageForm.outputTypeId}
                  onChange={(e) => setStageForm((prev) => ({ ...prev, outputTypeId: e.target.value }))}
                  disabled={stageSubmitting}
                  className={inputClass}
                >
                  <option value="">Select output</option>
                  {woodTypes.map((wt) => (
                    <option key={wt.id} value={wt.id}>
                      {wt.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-[0.4rem]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Wage Rate (৳/output unit)</label>
                <input
                  type="number"
                  step="0.01"
                  value={stageForm.wageRatePerUnit}
                  onChange={(e) => setStageForm((prev) => ({ ...prev, wageRatePerUnit: e.target.value }))}
                  placeholder="e.g. 2"
                  disabled={stageSubmitting}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-[0.4rem]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Sequence (display order)</label>
                <input
                  type="number"
                  value={stageForm.sequence}
                  onChange={(e) => setStageForm((prev) => ({ ...prev, sequence: e.target.value }))}
                  placeholder="e.g. 4"
                  disabled={stageSubmitting}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex flex-col gap-[0.4rem]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">
                Mirrors To Raw Material (optional -- set only if this is a final product Packaging consumes)
              </label>
              <select
                value={stageForm.mirrorToRawMaterialId}
                onChange={(e) => setStageForm((prev) => ({ ...prev, mirrorToRawMaterialId: e.target.value }))}
                disabled={stageSubmitting}
                className={inputClass}
              >
                <option value="">None -- internal only</option>
                {rawMaterials.map((rm) => (
                  <option key={rm.id} value={rm.id}>
                    {rm.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-[0.4rem]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Default Waste Type (optional)</label>
              <select
                value={stageForm.defaultWasteTypeId}
                onChange={(e) => setStageForm((prev) => ({ ...prev, defaultWasteTypeId: e.target.value }))}
                disabled={stageSubmitting}
                className={inputClass}
              >
                <option value="">None</option>
                {wasteTypes.map((wt) => (
                  <option key={wt.id} value={wt.id}>
                    {wt.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={stageSubmitting} className={primaryBtnClass}>
              <i className={`fa-solid ${stageSubmitting ? 'fa-spinner fa-spin' : 'fa-save'}`} />
              {stageSubmitting ? 'Saving...' : 'Add Stage'}
            </button>
            {stageFormError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{stageFormError}</p>}
          </form>
        </div>
      </div>

      {/* Stage settings */}
      <div className={cardClass}>
        <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E] border-b border-[#e8e8e8] pb-3 mb-4">
          <i className="fa-solid fa-sliders mr-2 text-[#e21e53]" />
          Stage Settings
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[0.85rem]">
            <thead>
              <tr className="border-b border-[#e8e8e8] text-[0.72rem] uppercase tracking-[0.05em] text-[#545454]">
                <th className="py-2 pr-4 font-bold">Stage</th>
                <th className="py-2 pr-4 font-bold">Input → Output</th>
                <th className="py-2 pr-4 font-bold">Mirrors To Raw Material</th>
                <th className="py-2 pr-4 font-bold text-right">Wage Rate (৳/output unit)</th>
                <th className="py-2 pr-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((stage) => (
                <tr key={stage.id} className="border-b border-[#f1f1f1] last:border-0">
                  <td className="py-3 pr-4 font-bold text-[#1E1E1E]">{stage.name}</td>
                  <td className="py-3 pr-4 text-[#545454]">
                    {stage.inputType?.name} → {stage.outputType?.name}
                  </td>
                  <td className="py-3 pr-4 text-[#545454]">
                    {stage.mirrorToRawMaterialId ? 'Yes -- final product' : '—'}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <input
                      type="number"
                      step="0.01"
                      value={rateEdits[stage.id] ?? stage.wageRatePerUnit}
                      onChange={(e) => setRateEdits((prev) => ({ ...prev, [stage.id]: e.target.value }))}
                      className="w-24 text-right border border-[#e8e8e8] rounded-lg px-2 py-1 text-[0.85rem] outline-none focus:border-[#e21e53]"
                    />
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleRateSave(stage)}
                      disabled={savingRateId === stage.id || rateEdits[stage.id] == null}
                      className="h-8 px-3 rounded-lg bg-[#e21e53] text-white font-bold text-[0.78rem] hover:bg-[#c01745] disabled:opacity-40 cursor-pointer"
                    >
                      {savingRateId === stage.id ? 'Saving...' : 'Save'}
                    </button>
                  </td>
                </tr>
              ))}
              {stages.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="py-4 text-[0.8rem] font-semibold text-[#545454]">
                    No wood stages configured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Entries log */}
      <div className={cardClass}>
        <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E] border-b border-[#e8e8e8] pb-3 mb-4">
          <i className="fa-solid fa-clock-rotate-left mr-2 text-[#e21e53]" />
          Processing Entries
        </h3>
        {!loading && entries.length === 0 && (
          <p className="text-[0.8rem] font-semibold text-[#545454]">No entries yet.</p>
        )}
        {entries.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[0.85rem]">
              <thead>
                <tr className="border-b border-[#e8e8e8] text-[0.72rem] uppercase tracking-[0.05em] text-[#545454]">
                  <th className="py-2 pr-4 font-bold">Stage</th>
                  <th className="py-2 pr-4 font-bold">Artisan(s)</th>
                  <th className="py-2 pr-4 font-bold text-right">Output</th>
                  <th className="py-2 pr-4 font-bold text-right">Waste</th>
                  <th className="py-2 pr-4 font-bold text-right">Rate Used</th>
                  <th className="py-2 pr-4 font-bold">Date</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-[#f1f1f1] last:border-0">
                    <td className="py-3 pr-4 font-bold text-[#1E1E1E]">{entry.stageName}</td>
                    <td className="py-3 pr-4 text-[#545454]">
                      {entry.employees?.map((e) => e.name).join(', ') || '—'}
                    </td>
                    <td className="py-3 pr-4 text-[#545454] text-right">{formatQty(entry.outputQuantity)}</td>
                    <td className="py-3 pr-4 text-[#545454] text-right">{formatQty(entry.wasteQuantity)}</td>
                    <td className="py-3 pr-4 text-[#545454] text-right">৳{entry.wageRateUsed.toFixed(2)}</td>
                    <td className="py-3 pr-4 text-[#545454]">{entry.entryDate || '—'}</td>
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
