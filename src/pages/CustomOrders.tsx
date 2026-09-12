import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getApiErrorMessage } from '../utils/apiError';
import Modal from '../components/Modal';

const API_URL = import.meta.env.VITE_API_URL;

type CanvasType = 'circle' | 'square';
type OrderStatus = 'pending' | 'in_progress' | 'completed';

interface CustomOrderItem {
  id: number;
  width: number;
  height: number;
  canvasType: CanvasType;
  quantity: number;
}

interface CustomOrder {
  id: number;
  clientOrderNum: string;
  note: string | null;
  deadline: string;
  status: OrderStatus;
  items: CustomOrderItem[];
  createdAt: string;
}

// One row in the repeatable item list on the New Order form / Edit modal --
// not the same shape as CustomOrderItem since these are raw string inputs.
interface ItemRow {
  width: string;
  height: string;
  canvasType: CanvasType;
  quantity: string;
}

interface OrderFormState {
  clientOrderNum: string;
  note: string;
  deadline: string;
}

const emptyItemRow: ItemRow = { width: '', height: '', canvasType: 'square', quantity: '1' };

const emptyOrderForm: OrderFormState = {
  clientOrderNum: '',
  note: '',
  deadline: '',
};

interface RawMaterialOption {
  id: number;
  name: string;
  unit: string;
}

interface StockRow {
  rawMaterialId: number;
  quantityRemaining: number;
}

interface TaskOption {
  id: number;
  name: string;
  pricePerUnit: number | null;
}

interface EmployeeOption {
  id: number;
  name: string;
  status: string;
}

interface MaterialRow {
  rawMaterialId: string;
  quantity: string;
}

interface LaborRow {
  employeeId: string;
  taskId: string;
  quantity: string;
  rate: string;
}

const emptyMaterialRow: MaterialRow = { rawMaterialId: '', quantity: '' };
const emptyLaborRow: LaborRow = { employeeId: '', taskId: '', quantity: '', rate: '' };

const cardClass =
  'bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]';

const inputClass =
  'w-full bg-white border border-[#e8e8e8] text-[#1E1E1E] px-[0.85rem] py-[0.65rem] rounded-lg text-[0.875rem] font-medium transition-all duration-200 outline-none focus:border-[#e21e53] focus:shadow-[0_0_0_3px_rgba(226,30,83,0.15)] disabled:opacity-60 disabled:cursor-not-allowed';

const primaryBtnClass =
  'h-10 px-4 flex items-center justify-center gap-2 rounded-lg bg-[#e21e53] text-white font-bold text-[0.875rem] transition-all duration-200 hover:bg-[#c01745] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer';

const secondaryBtnClass =
  'h-9 px-3 flex items-center justify-center gap-2 rounded-lg border border-[#e8e8e8] text-[#545454] font-bold text-[0.8rem] hover:bg-[#f8fafc] transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer';

const statusStyles: Record<OrderStatus, string> = {
  pending: 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]',
  in_progress: 'bg-[rgba(59,130,246,0.1)] text-[#3b82f6]',
  completed: 'bg-[rgba(16,185,129,0.1)] text-[#10b981]',
};

const statusLabels: Record<OrderStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export default function CustomOrders() {
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // ── New order form ──
  const [form, setForm] = useState<OrderFormState>(emptyOrderForm);
  const [itemRows, setItemRows] = useState<ItemRow[]>([{ ...emptyItemRow }]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Edit order modal ──
  const [editOrder, setEditOrder] = useState<CustomOrder | null>(null);
  const [editForm, setEditForm] = useState<OrderFormState>(emptyOrderForm);
  const [editItemRows, setEditItemRows] = useState<ItemRow[]>([{ ...emptyItemRow }]);
  const [editStatus, setEditStatus] = useState<OrderStatus>('pending');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);

  // ── Pagination (client-side -- GET /custom-orders returns the full list) ──
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ── Complete Order popup -- cuts raw material stock + pays employees ──
  const [rawMaterials, setRawMaterials] = useState<RawMaterialOption[]>([]);
  const [stockByMaterialId, setStockByMaterialId] = useState<Record<string, number>>({});
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [completingOrder, setCompletingOrder] = useState<CustomOrder | null>(null);
  const [materialRows, setMaterialRows] = useState<MaterialRow[]>([{ ...emptyMaterialRow }]);
  const [laborRows, setLaborRows] = useState<LaborRow[]>([{ ...emptyLaborRow }]);
  const [completeSubmitting, setCompleteSubmitting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  const loadReferenceData = useCallback(async () => {
    try {
      const [materialsRes, stockRes, tasksRes, employeesRes] = await Promise.all([
        axios.get<RawMaterialOption[]>(`${API_URL}/raw-materials`),
        axios.get<StockRow[]>(`${API_URL}/material-batches/stock-summary`),
        axios.get<TaskOption[]>(`${API_URL}/tasks`),
        axios.get<EmployeeOption[]>(`${API_URL}/employees`),
      ]);
      setRawMaterials(materialsRes.data);
      setStockByMaterialId(
        Object.fromEntries(stockRes.data.map((s) => [s.rawMaterialId, s.quantityRemaining])),
      );
      setTasks(tasksRes.data);
      setEmployees(employeesRes.data.filter((e) => e.status === 'active'));
    } catch (err) {
      // Best-effort -- the popup just shows empty dropdowns if this fails;
      // the main orders list/error handling above is what actually matters.
      console.error('Failed to load reference data for order completion', err);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const res = await axios.get<CustomOrder[]>(`${API_URL}/custom-orders`);
      setOrders(res.data);
    } catch (err) {
      setListError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to load custom orders', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    loadReferenceData();
  }, [loadOrders, loadReferenceData]);

  const totalPages = Math.max(1, Math.ceil(orders.length / pageSize));
  // Clamp back onto a real page whenever the list shrinks (e.g. a delete
  // empties out the last page) or the page size changes.
  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);
  const pagedOrders = orders.slice((page - 1) * pageSize, page * pageSize);

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setPage(1);
  };

  const handleChange = (field: keyof OrderFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ── Item rows (New Order form) ──
  const addItemRow = () => setItemRows((prev) => [...prev, { ...emptyItemRow }]);
  const removeItemRow = (index: number) => setItemRows((prev) => prev.filter((_, i) => i !== index));
  const updateItemRow = (index: number, field: keyof ItemRow, value: string) =>
    setItemRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));

  // ── Item rows (Edit modal) ──
  const addEditItemRow = () => setEditItemRows((prev) => [...prev, { ...emptyItemRow }]);
  const removeEditItemRow = (index: number) =>
    setEditItemRows((prev) => prev.filter((_, i) => i !== index));
  const updateEditItemRow = (index: number, field: keyof ItemRow, value: string) =>
    setEditItemRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));

  const validateItemRows = (rows: ItemRow[]): string | null => {
    if (rows.length === 0) return 'Add at least one item.';
    for (const row of rows) {
      if (!row.width || Number(row.width) <= 0) return 'Enter a width greater than zero for every item.';
      if (!row.height || Number(row.height) <= 0) return 'Enter a height greater than zero for every item.';
      if (!row.quantity || Number(row.quantity) <= 0) return 'Enter a quantity greater than zero for every item.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (!form.clientOrderNum.trim()) {
      setFormError('Client order # is required.');
      return;
    }
    if (!form.deadline) {
      setFormError('Deadline is required.');
      return;
    }
    const itemsError = validateItemRows(itemRows);
    if (itemsError) {
      setFormError(itemsError);
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/custom-orders`, {
        clientOrderNum: form.clientOrderNum.trim(),
        note: form.note.trim() || undefined,
        deadline: form.deadline,
        items: itemRows.map((r) => ({
          width: Number(r.width),
          height: Number(r.height),
          canvasType: r.canvasType,
          quantity: Number(r.quantity),
        })),
      });
      setForm(emptyOrderForm);
      setItemRows([{ ...emptyItemRow }]);
      setPage(1);
      loadOrders();
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to save custom order', err);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditOrder = (order: CustomOrder) => {
    setEditOrder(order);
    setEditForm({
      clientOrderNum: order.clientOrderNum,
      note: order.note ?? '',
      deadline: order.deadline.slice(0, 10),
    });
    setEditItemRows(
      order.items.length > 0
        ? order.items.map((item) => ({
            width: String(item.width),
            height: String(item.height),
            canvasType: item.canvasType,
            quantity: String(item.quantity),
          }))
        : [{ ...emptyItemRow }],
    );
    setEditStatus(order.status);
    setEditFormError(null);
  };

  const closeEditOrder = () => {
    if (editSubmitting) return;
    setEditOrder(null);
  };

  const handleEditChange = (field: keyof OrderFormState, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editOrder) return;
    setEditFormError(null);

    if (!editForm.clientOrderNum.trim()) {
      setEditFormError('Client order # is required.');
      return;
    }
    if (!editForm.deadline) {
      setEditFormError('Deadline is required.');
      return;
    }
    const itemsError = validateItemRows(editItemRows);
    if (itemsError) {
      setEditFormError(itemsError);
      return;
    }

    setEditSubmitting(true);
    try {
      await axios.patch(`${API_URL}/custom-orders/${editOrder.id}`, {
        clientOrderNum: editForm.clientOrderNum.trim(),
        note: editForm.note.trim() || null,
        deadline: editForm.deadline,
        status: editStatus,
        items: editItemRows.map((r) => ({
          width: Number(r.width),
          height: Number(r.height),
          canvasType: r.canvasType,
          quantity: Number(r.quantity),
        })),
      });
      setEditOrder(null);
      loadOrders();
    } catch (err) {
      setEditFormError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to update custom order', err);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (order: CustomOrder) => {
    if (!window.confirm(`Delete order ${order.clientOrderNum}?`)) return;
    setDeletingOrderId(order.id);
    try {
      await axios.delete(`${API_URL}/custom-orders/${order.id}`);
      loadOrders();
    } catch (err) {
      alert(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to delete custom order', err);
    } finally {
      setDeletingOrderId(null);
    }
  };

  // ── Complete Order popup ──
  const openCompleteOrder = (order: CustomOrder) => {
    setCompletingOrder(order);
    setMaterialRows([{ ...emptyMaterialRow }]);
    setLaborRows([{ ...emptyLaborRow }]);
    setCompleteError(null);
  };

  const closeCompleteOrder = () => {
    if (completeSubmitting) return;
    setCompletingOrder(null);
  };

  const addMaterialRow = () => setMaterialRows((prev) => [...prev, { ...emptyMaterialRow }]);
  const removeMaterialRow = (index: number) =>
    setMaterialRows((prev) => prev.filter((_, i) => i !== index));
  const updateMaterialRow = (index: number, field: keyof MaterialRow, value: string) =>
    setMaterialRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));

  const addLaborRow = () => setLaborRows((prev) => [...prev, { ...emptyLaborRow }]);
  const removeLaborRow = (index: number) =>
    setLaborRows((prev) => prev.filter((_, i) => i !== index));
  const updateLaborRow = (index: number, field: keyof LaborRow, value: string) =>
    setLaborRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, [field]: value };
        // Picking a task pre-fills its own rate as a starting point (only
        // when the rate field is still blank, so it never clobbers a value
        // already typed in) -- still editable either way, e.g. to set one
        // for a task that has none yet, or override it for this order.
        if (field === 'taskId' && row.rate === '') {
          const task = tasks.find((t) => String(t.id) === value);
          if (task?.pricePerUnit != null) {
            next.rate = String(task.pricePerUnit);
          }
        }
        return next;
      }),
    );

  const handleCompleteSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!completingOrder) return;
    setCompleteError(null);

    const materials = materialRows
      .filter((r) => r.rawMaterialId || r.quantity)
      .map((r) => ({ rawMaterialId: Number(r.rawMaterialId), quantity: Number(r.quantity) }));
    const labor = laborRows
      .filter((r) => r.employeeId || r.taskId || r.quantity)
      .map((r) => ({
        employeeId: Number(r.employeeId),
        taskId: Number(r.taskId),
        quantity: Number(r.quantity),
        rate: r.rate ? Number(r.rate) : undefined,
      }));

    if (materials.length === 0 && labor.length === 0) {
      setCompleteError('Add at least one material or labor row.');
      return;
    }
    for (const m of materials) {
      if (!m.rawMaterialId || !m.quantity || m.quantity <= 0) {
        setCompleteError('Every material row needs a raw material and a quantity greater than zero.');
        return;
      }
    }
    for (const l of labor) {
      if (!l.employeeId || !l.taskId || !l.quantity || l.quantity <= 0) {
        setCompleteError('Every labor row needs an employee, a task, and a quantity greater than zero.');
        return;
      }
    }

    setCompleteSubmitting(true);
    try {
      await axios.post(`${API_URL}/custom-orders/${completingOrder.id}/complete`, { materials, labor });
      setCompletingOrder(null);
      loadOrders();
      loadReferenceData(); // stock levels just changed
    } catch (err) {
      setCompleteError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to complete custom order', err);
    } finally {
      setCompleteSubmitting(false);
    }
  };

  // Shared markup for one item row (width/height/canvas type/quantity) --
  // used by both the New Order form and the Edit modal.
  const renderItemRow = (
    row: ItemRow,
    index: number,
    onUpdate: (index: number, field: keyof ItemRow, value: string) => void,
    onRemove: (index: number) => void,
    disabled: boolean,
    canRemove: boolean,
  ) => (
    <div key={index} className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1.2fr_0.8fr_auto] gap-2 items-end">
      <div className="flex flex-col gap-1">
        <label className="text-[0.7rem] font-bold text-[#545454]">Width</label>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={row.width}
          onChange={(e) => onUpdate(index, 'width', e.target.value)}
          disabled={disabled}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[0.7rem] font-bold text-[#545454]">Height</label>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={row.height}
          onChange={(e) => onUpdate(index, 'height', e.target.value)}
          disabled={disabled}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[0.7rem] font-bold text-[#545454]">Canvas Type</label>
        <select
          value={row.canvasType}
          onChange={(e) => onUpdate(index, 'canvasType', e.target.value)}
          disabled={disabled}
          className={inputClass}
        >
          <option value="square">Square</option>
          <option value="circle">Circle</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[0.7rem] font-bold text-[#545454]">Qty</label>
        <input
          type="number"
          min="1"
          step="1"
          value={row.quantity}
          onChange={(e) => onUpdate(index, 'quantity', e.target.value)}
          disabled={disabled}
          className={inputClass}
        />
      </div>
      <button
        type="button"
        onClick={() => onRemove(index)}
        disabled={disabled || !canRemove}
        className="h-10 w-10 inline-flex items-center justify-center rounded-lg border border-[#e8e8e8] text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors duration-200 disabled:opacity-40 cursor-pointer"
        title="Remove item"
      >
        <i className="fa-solid fa-trash text-[0.8rem]" />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-[1.4rem] font-extrabold text-[#1E1E1E] mb-2">
          <i className="fa-solid fa-clipboard-list mr-2 text-[#e21e53]" />
          Custom Orders
        </h2>
        <p className="text-[0.9rem] text-[#545454]">
          Canvas orders -- placed here or by a third party through the API.
        </p>
      </div>

      {listError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{listError}</p>}

      {/* ══════════ NEW ORDER (full width, on top) ══════════ */}
      <div className={cardClass}>
        <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E] border-b border-[#e8e8e8] pb-3 mb-4">
          <i className="fa-solid fa-square-plus mr-2 text-[#e21e53]" />
          New Order
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-[0.4rem]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Client Order #</label>
              <input
                type="text"
                value={form.clientOrderNum}
                onChange={(e) => handleChange('clientOrderNum', e.target.value)}
                placeholder="e.g. 1042"
                disabled={submitting}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-[0.4rem]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Deadline</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => handleChange('deadline', e.target.value)}
                disabled={submitting}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-[#f1f1f1] pt-3">
            <div className="flex items-center justify-between">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">
                <i className="fa-solid fa-images mr-1 text-[#e21e53]" />
                Items
              </label>
              <button type="button" onClick={addItemRow} className={secondaryBtnClass}>
                <i className="fa-solid fa-plus" />
                Add Item
              </button>
            </div>
            {itemRows.map((row, index) =>
              renderItemRow(row, index, updateItemRow, removeItemRow, submitting, itemRows.length > 1),
            )}
          </div>

          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">
              Note <span className="font-normal text-[#545454]">(optional)</span>
            </label>
            <textarea
              value={form.note}
              onChange={(e) => handleChange('note', e.target.value)}
              rows={2}
              disabled={submitting}
              className={inputClass}
            />
          </div>
          <button type="submit" disabled={submitting} className={`${primaryBtnClass} self-start mt-1`}>
            <i className={`fa-solid ${submitting ? 'fa-spinner fa-spin' : 'fa-save'}`} />
            {submitting ? 'Saving...' : 'Place Order'}
          </button>
          {formError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{formError}</p>}
        </form>
      </div>

      {/* ══════════ ORDERS LIST ══════════ */}
      <div className={cardClass}>
        <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3 mb-4">
          <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E]">
            <i className="fa-solid fa-list mr-2 text-[#e21e53]" />
            Orders
          </h3>
          <span className="rounded-full bg-[rgba(59,130,246,0.1)] text-[#3b82f6] text-[0.72rem] font-extrabold px-3 py-1">
            Total: {orders.length}
          </span>
        </div>

        {loading && <p className="text-[0.8rem] font-semibold text-[#545454]">Loading...</p>}
        {!loading && orders.length === 0 && (
          <p className="text-[0.8rem] font-semibold text-[#545454]">No custom orders yet.</p>
        )}

        {!loading && orders.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[0.85rem]">
                <thead>
                  <tr className="border-b border-[#e8e8e8] text-[0.72rem] uppercase tracking-[0.05em] text-[#545454]">
                    <th className="py-2 pr-3 font-bold">Order #</th>
                    <th className="py-2 pr-3 font-bold">Items</th>
                    <th className="py-2 pr-3 font-bold">Note</th>
                    <th className="py-2 pr-3 font-bold">Deadline</th>
                    <th className="py-2 pr-3 font-bold">Status</th>
                    <th className="py-2 pr-3 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedOrders.map((order) => (
                    <tr key={order.id} className="border-b border-[#f1f1f1] last:border-0 align-top">
                      <td className="py-3 pr-3 font-bold text-[#1E1E1E] whitespace-nowrap">{order.clientOrderNum}</td>
                      <td className="py-3 pr-3 text-[#1E1E1E]">
                        {order.items.map((item) => (
                          <div key={item.id} className="whitespace-nowrap">
                            {item.quantity}pcs X {item.width}-{item.height}{' '}
                            <span className="capitalize text-[#545454]">{item.canvasType}</span>
                          </div>
                        ))}
                      </td>
                      <td className="py-3 pr-3 text-[#545454]">{order.note || '—'}</td>
                      <td className="py-3 pr-3 whitespace-nowrap text-[#545454]">
                        {new Date(order.deadline).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-3">
                        <span className={`rounded-full text-[0.72rem] font-extrabold px-2 py-[0.15rem] ${statusStyles[order.status]}`}>
                          {statusLabels[order.status]}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openCompleteOrder(order)}
                          disabled={order.status === 'completed'}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-[#e8e8e8] text-[#7c3aed] hover:bg-[rgba(124,58,237,0.08)] transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title={order.status === 'completed' ? 'Already completed' : 'Cut materials & pay employees'}
                        >
                          <i className="fa-solid fa-flask text-[0.75rem]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditOrder(order)}
                          className="ml-1 w-8 h-8 inline-flex items-center justify-center rounded-lg border border-[#e8e8e8] text-[#545454] hover:bg-[#f8fafc] transition-colors duration-200 cursor-pointer"
                          title="Edit"
                        >
                          <i className="fa-solid fa-pen text-[0.75rem]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(order)}
                          disabled={deletingOrderId === order.id}
                          className="ml-1 w-8 h-8 inline-flex items-center justify-center rounded-lg border border-[#e8e8e8] text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors duration-200 disabled:opacity-60 cursor-pointer"
                          title="Delete"
                        >
                          <i className={`fa-solid ${deletingOrderId === order.id ? 'fa-spinner fa-spin' : 'fa-trash'} text-[0.75rem]`} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f1f1f1] pt-3 mt-3">
              <div className="flex items-center gap-2 text-[0.8rem] font-semibold text-[#545454]">
                <span>Rows per page</span>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(e.target.value)}
                  className="bg-white border border-[#e8e8e8] rounded-lg px-2 py-1 text-[0.8rem] font-semibold text-[#1E1E1E] outline-none focus:border-[#e21e53] cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[0.8rem] font-semibold text-[#545454]">
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-[#e8e8e8] text-[#545454] hover:bg-[#f8fafc] transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Previous page"
                  >
                    <i className="fa-solid fa-chevron-left text-[0.7rem]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-[#e8e8e8] text-[#545454] hover:bg-[#f8fafc] transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Next page"
                  >
                    <i className="fa-solid fa-chevron-right text-[0.7rem]" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ══════════ EDIT ORDER MODAL ══════════ */}
      <Modal open={editOrder != null} onClose={closeEditOrder} title={editOrder ? `Edit ${editOrder.clientOrderNum}` : 'Edit Order'}>
        {editOrder && (
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-[0.4rem]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Client Order #</label>
              <input
                type="text"
                value={editForm.clientOrderNum}
                onChange={(e) => handleEditChange('clientOrderNum', e.target.value)}
                disabled={editSubmitting}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-[0.4rem]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Deadline</label>
                <input
                  type="date"
                  value={editForm.deadline}
                  onChange={(e) => handleEditChange('deadline', e.target.value)}
                  disabled={editSubmitting}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-[0.4rem]">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as OrderStatus)}
                  disabled={editSubmitting}
                  className={inputClass}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-[#f1f1f1] pt-3">
              <div className="flex items-center justify-between">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">
                  <i className="fa-solid fa-images mr-1 text-[#e21e53]" />
                  Items
                </label>
                <button type="button" onClick={addEditItemRow} className={secondaryBtnClass}>
                  <i className="fa-solid fa-plus" />
                  Add Item
                </button>
              </div>
              {editItemRows.map((row, index) =>
                renderItemRow(
                  row,
                  index,
                  updateEditItemRow,
                  removeEditItemRow,
                  editSubmitting,
                  editItemRows.length > 1,
                ),
              )}
            </div>

            <div className="flex flex-col gap-[0.4rem]">
              <label className="text-[0.8rem] font-bold text-[#1E1E1E]">
                Note <span className="font-normal text-[#545454]">(optional)</span>
              </label>
              <textarea
                value={editForm.note}
                onChange={(e) => handleEditChange('note', e.target.value)}
                rows={2}
                disabled={editSubmitting}
                className={inputClass}
              />
            </div>
            <button type="submit" disabled={editSubmitting} className={`${primaryBtnClass} self-start`}>
              <i className={`fa-solid ${editSubmitting ? 'fa-spinner fa-spin' : 'fa-save'}`} />
              {editSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
            {editFormError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{editFormError}</p>}
          </form>
        )}
      </Modal>

      {/* ══════════ COMPLETE ORDER MODAL ══════════ */}
      <Modal
        open={completingOrder != null}
        onClose={closeCompleteOrder}
        title={completingOrder ? `Complete ${completingOrder.clientOrderNum}` : 'Complete Order'}
      >
        {completingOrder && (
          <form onSubmit={handleCompleteSubmit} className="flex flex-col gap-4">
            <p className="text-[0.78rem] text-[#545454] -mt-1">
              Cuts each material off real stock and pays each employee for their task. This can't be undone.
            </p>

            {/* ── Materials used ── */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">
                  <i className="fa-solid fa-flask mr-1 text-[#7c3aed]" />
                  Raw Materials Used
                </label>
                <button type="button" onClick={addMaterialRow} className={secondaryBtnClass}>
                  <i className="fa-solid fa-plus" />
                  Add Row
                </button>
              </div>
              {materialRows.map((row, index) => {
                const selectedMaterial = rawMaterials.find((m) => String(m.id) === row.rawMaterialId);
                const available = selectedMaterial ? stockByMaterialId[selectedMaterial.id] : undefined;
                return (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_auto] gap-2 items-end">
                    <div className="flex flex-col gap-1">
                      <label className="text-[0.7rem] font-bold text-[#545454]">Raw Material</label>
                      <select
                        value={row.rawMaterialId}
                        onChange={(e) => updateMaterialRow(index, 'rawMaterialId', e.target.value)}
                        disabled={completeSubmitting}
                        className={inputClass}
                      >
                        <option value="">Select material</option>
                        {rawMaterials.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.unit})
                          </option>
                        ))}
                      </select>
                      <p className="text-[0.68rem] text-[#545454] h-[1em] leading-[1em]">
                        {selectedMaterial ? `In stock: ${available ?? 0} ${selectedMaterial.unit}` : ' '}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[0.7rem] font-bold text-[#545454]">Quantity</label>
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={row.quantity}
                        onChange={(e) => updateMaterialRow(index, 'quantity', e.target.value)}
                        disabled={completeSubmitting}
                        className={inputClass}
                      />
                      <p className="text-[0.68rem] h-[1em] leading-[1em]"> </p>
                    </div>
                    <div className="flex flex-col gap-1 justify-self-end">
                      <span className="text-[0.7rem] font-bold text-transparent select-none">.</span>
                      <button
                        type="button"
                        onClick={() => removeMaterialRow(index)}
                        disabled={completeSubmitting || materialRows.length === 1}
                        className="h-10 w-10 inline-flex items-center justify-center rounded-lg border border-[#e8e8e8] text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors duration-200 disabled:opacity-40 cursor-pointer"
                        title="Remove row"
                      >
                        <i className="fa-solid fa-trash text-[0.8rem]" />
                      </button>
                      <p className="text-[0.68rem] h-[1em] leading-[1em]"> </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Labor / task assignments ── */}
            <div className="flex flex-col gap-2 border-t border-[#f1f1f1] pt-3">
              <div className="flex items-center justify-between">
                <label className="text-[0.8rem] font-bold text-[#1E1E1E]">
                  <i className="fa-solid fa-user-gear mr-1 text-[#7c3aed]" />
                  Work Done (employee, task, quantity)
                </label>
                <button type="button" onClick={addLaborRow} className={secondaryBtnClass}>
                  <i className="fa-solid fa-plus" />
                  Add Row
                </button>
              </div>
              {laborRows.map((row, index) => {
                const selectedTask = tasks.find((t) => String(t.id) === row.taskId);
                return (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-[1.2fr_1.2fr_0.8fr_0.8fr_auto] gap-2 items-end">
                    <div className="flex flex-col gap-1">
                      <label className="text-[0.7rem] font-bold text-[#545454]">Employee</label>
                      <select
                        value={row.employeeId}
                        onChange={(e) => updateLaborRow(index, 'employeeId', e.target.value)}
                        disabled={completeSubmitting}
                        className={inputClass}
                      >
                        <option value="">Select employee</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-[0.68rem] h-[1em] leading-[1em]"> </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[0.7rem] font-bold text-[#545454]">Task</label>
                      <select
                        value={row.taskId}
                        onChange={(e) => updateLaborRow(index, 'taskId', e.target.value)}
                        disabled={completeSubmitting}
                        className={inputClass}
                      >
                        <option value="">Select task</option>
                        {tasks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                            {t.pricePerUnit == null ? ' (no rate set)' : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-[0.68rem] text-[#ef4444] h-[1em] leading-[1em]">
                        {selectedTask?.pricePerUnit == null && selectedTask && !row.rate
                          ? 'No rate set -- enter one in the Rate field.'
                          : ' '}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[0.7rem] font-bold text-[#545454]">Quantity</label>
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={row.quantity}
                        onChange={(e) => updateLaborRow(index, 'quantity', e.target.value)}
                        disabled={completeSubmitting}
                        className={inputClass}
                      />
                      <p className="text-[0.68rem] h-[1em] leading-[1em]"> </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[0.7rem] font-bold text-[#545454]">Rate</label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="৳ per unit"
                        value={row.rate}
                        onChange={(e) => updateLaborRow(index, 'rate', e.target.value)}
                        disabled={completeSubmitting}
                        className={inputClass}
                      />
                      <p className="text-[0.68rem] h-[1em] leading-[1em]"> </p>
                    </div>
                    <div className="flex flex-col gap-1 justify-self-end">
                      <span className="text-[0.7rem] font-bold text-transparent select-none">.</span>
                      <button
                        type="button"
                        onClick={() => removeLaborRow(index)}
                        disabled={completeSubmitting || laborRows.length === 1}
                        className="h-10 w-10 inline-flex items-center justify-center rounded-lg border border-[#e8e8e8] text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors duration-200 disabled:opacity-40 cursor-pointer"
                        title="Remove row"
                      >
                        <i className="fa-solid fa-trash text-[0.8rem]" />
                      </button>
                      <p className="text-[0.68rem] h-[1em] leading-[1em]"> </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <button type="submit" disabled={completeSubmitting} className={`${primaryBtnClass} self-start`}>
              <i className={`fa-solid ${completeSubmitting ? 'fa-spinner fa-spin' : 'fa-check'}`} />
              {completeSubmitting ? 'Completing...' : 'Complete Order'}
            </button>
            {completeError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{completeError}</p>}
          </form>
        )}
      </Modal>
    </div>
  );
}
