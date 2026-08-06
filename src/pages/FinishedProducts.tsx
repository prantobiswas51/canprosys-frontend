import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getApiErrorMessage } from '../utils/apiError';
import { formatQty } from '../utils/formatNumber';
import Modal from '../components/Modal';

const API_URL = import.meta.env.VITE_API_URL;

interface Product {
  id: number;
  name: string;
  sku: string;
  costPrice: number;
  stock: number;
}

interface RouteOption {
  id: number;
  origin: string;
  destination: string;
}

interface CarOption {
  id: number;
  plateNumber: string;
  model: string;
}

interface DriverOption {
  id: number;
  name: string;
}

// Form-only row shape -- ids/qty stay as strings while being edited so an
// empty input isn't forced to "0".
interface ShipmentItemFormRow {
  productId: string;
  quantity: string;
}

interface ShipmentFormState {
  routeId: string;
  carId: string;
  driverId: string;
  note: string;
  totalCost: string;
  items: ShipmentItemFormRow[];
}

const emptyShipmentForm: ShipmentFormState = {
  routeId: '',
  carId: '',
  driverId: '',
  note: '',
  totalCost: '',
  items: [],
};

const cardClass =
  'bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]';

const inputClass =
  'w-full bg-white border border-[#e8e8e8] text-[#1E1E1E] px-[0.85rem] py-[0.65rem] rounded-lg text-[0.875rem] font-medium transition-all duration-200 outline-none focus:border-[#e21e53] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] disabled:opacity-60 disabled:cursor-not-allowed';

export default function FinishedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [cars, setCars] = useState<CarOption[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const [shipmentModalOpen, setShipmentModalOpen] = useState(false);
  const [shipmentForm, setShipmentForm] = useState<ShipmentFormState>(emptyShipmentForm);
  const [shipmentSubmitting, setShipmentSubmitting] = useState(false);
  const [shipmentFormError, setShipmentFormError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const res = await axios.get<Product[]>(`${API_URL}/products`);
      setProducts(res.data);
    } catch (err) {
      setListError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to load products', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchShipmentOptions = useCallback(async () => {
    setOptionsError(null);
    try {
      const [routesRes, carsRes, driversRes] = await Promise.all([
        axios.get<RouteOption[]>(`${API_URL}/routes`),
        axios.get<CarOption[]>(`${API_URL}/cars`),
        axios.get<DriverOption[]>(`${API_URL}/drivers`),
      ]);
      setRoutes(routesRes.data);
      setCars(carsRes.data);
      setDrivers(driversRes.data);
    } catch (err) {
      setOptionsError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to load shipment options', err);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchShipmentOptions();
  }, [fetchProducts, fetchShipmentOptions]);

  const openShipmentModal = () => {
    setShipmentForm(emptyShipmentForm);
    setShipmentFormError(null);
    setShipmentModalOpen(true);
  };

  const closeShipmentModal = () => {
    if (shipmentSubmitting) return;
    setShipmentModalOpen(false);
  };

  const handleShipmentChange = (field: keyof Omit<ShipmentFormState, 'items'>, value: string) => {
    setShipmentForm((prev) => ({ ...prev, [field]: value }));
  };

  const addShipmentItemRow = () => {
    setShipmentForm((prev) => ({ ...prev, items: [...prev.items, { productId: '', quantity: '' }] }));
  };

  const removeShipmentItemRow = (index: number) => {
    setShipmentForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const updateShipmentItemRow = (index: number, field: keyof ShipmentItemFormRow, value: string) => {
    setShipmentForm((prev) => ({
      ...prev,
      items: prev.items.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    }));
  };

  // Products already picked in another row -- excluded from the options in
  // a given row's dropdown so the same product can't be added twice.
  const usedProductIds = (excludeIndex: number) =>
    new Set(
      shipmentForm.items
        .filter((_, i) => i !== excludeIndex)
        .map((row) => row.productId)
        .filter(Boolean),
    );

  const handleShipmentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setShipmentFormError(null);

    if (!shipmentForm.routeId || !shipmentForm.carId || !shipmentForm.driverId) {
      setShipmentFormError('Select a route, car, and driver.');
      return;
    }

    if (shipmentForm.items.length === 0) {
      setShipmentFormError('Add at least one product to ship.');
      return;
    }

    if (shipmentForm.items.some((row) => !row.productId || row.quantity.trim() === '')) {
      setShipmentFormError('Every product row needs a product and a quantity -- remove any incomplete rows.');
      return;
    }

    for (const row of shipmentForm.items) {
      const product = products.find((p) => String(p.id) === row.productId);
      const quantity = Number(row.quantity);
      if (product && quantity > product.stock) {
        setShipmentFormError(
          `Not enough stock for "${product.name}": requested ${quantity}, only ${product.stock} available.`,
        );
        return;
      }
    }

    setShipmentSubmitting(true);
    try {
      await axios.post(`${API_URL}/shipments`, {
        routeId: Number(shipmentForm.routeId),
        carId: Number(shipmentForm.carId),
        driverId: Number(shipmentForm.driverId),
        note: shipmentForm.note.trim() === '' ? undefined : shipmentForm.note,
        totalCost: shipmentForm.totalCost.trim() === '' ? undefined : Number(shipmentForm.totalCost),
        items: shipmentForm.items.map((row) => ({
          productId: Number(row.productId),
          quantity: Number(row.quantity),
        })),
      });
      setShipmentModalOpen(false);
      fetchProducts();
    } catch (err) {
      setShipmentFormError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to create shipment', err);
    } finally {
      setShipmentSubmitting(false);
    }
  };

  const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const totalValue = products.reduce((sum, p) => sum + (p.stock || 0) * (p.costPrice || 0), 0);
  const outOfStockCount = products.filter((p) => (p.stock || 0) <= 0).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between pb-1">
        <div>
          <h2 className="text-[1.4rem] font-extrabold text-[#1E1E1E] mb-2">Finished Products</h2>
          <p className="text-[0.9rem] text-[#545454]">Completed goods ready for dispatch.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchProducts}
            disabled={loading}
            className="h-10 px-4 flex items-center gap-2 rounded-lg border border-[#e8e8e8] text-[#545454] font-bold text-[0.875rem] hover:bg-[#f8fafc] hover:text-[#1E1E1E] transition-colors duration-200 disabled:opacity-60 cursor-pointer"
          >
            <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : 'fa-rotate'}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openShipmentModal}
            className="h-10 px-4 flex items-center gap-2 rounded-lg bg-[#e21e53] text-white font-bold text-[0.875rem] hover:bg-[#c81a49] transition-colors duration-200 cursor-pointer"
          >
            <i className="fa-solid fa-truck-fast" />
            New Shipment
          </button>
        </div>
      </div>

      {optionsError && (
        <p className="text-[0.8rem] font-semibold text-[#ef4444]">{optionsError}</p>
      )}

      {/* ══════════ STAT CARDS ══════════ */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <div className={`${cardClass} flex items-center gap-3`}>
          <div className="w-10 h-10 rounded-lg bg-[rgba(226,30,83,0.08)] text-[#e21e53] flex items-center justify-center shrink-0">
            <i className="fa-solid fa-layer-group" />
          </div>
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.05em] text-[#545454] m-0">Products</p>
            <p className="text-[1.1rem] font-extrabold text-[#1E1E1E] m-0">{products.length}</p>
          </div>
        </div>
        <div className={`${cardClass} flex items-center gap-3`}>
          <div className="w-10 h-10 rounded-lg bg-[rgba(59,130,246,0.08)] text-[#3b82f6] flex items-center justify-center shrink-0">
            <i className="fa-solid fa-boxes-stacked" />
          </div>
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.05em] text-[#545454] m-0">Total Stock</p>
            <p className="text-[1.1rem] font-extrabold text-[#1E1E1E] m-0">{totalStock} units</p>
          </div>
        </div>
        <div className={`${cardClass} flex items-center gap-3`}>
          <div className="w-10 h-10 rounded-lg bg-[rgba(16,185,129,0.08)] text-[#10b981] flex items-center justify-center shrink-0">
            <i className="fa-solid fa-sack-dollar" />
          </div>
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.05em] text-[#545454] m-0">Stock Value</p>
            <p className="text-[1.1rem] font-extrabold text-[#1E1E1E] m-0">৳{totalValue.toFixed(2)}</p>
          </div>
        </div>
        <div className={`${cardClass} flex items-center gap-3`}>
          <div className="w-10 h-10 rounded-lg bg-[rgba(239,68,68,0.08)] text-[#ef4444] flex items-center justify-center shrink-0">
            <i className="fa-solid fa-triangle-exclamation" />
          </div>
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.05em] text-[#545454] m-0">Out of Stock</p>
            <p className="text-[1.1rem] font-extrabold text-[#1E1E1E] m-0">{outOfStockCount}</p>
          </div>
        </div>
      </div>

      {/* ══════════ PRODUCTS TABLE ══════════ */}
      <div className={cardClass}>
        <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E] border-b border-[#e8e8e8] pb-3 mb-4">
          <i className="fa-solid fa-box mr-2 text-[#e21e53]" />
          Ready Stock
        </h3>

        {loading && <p className="text-[0.8rem] font-semibold text-[#545454]">Loading products...</p>}
        {!loading && listError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{listError}</p>}
        {!loading && !listError && products.length === 0 && (
          <p className="text-[0.8rem] font-semibold text-[#545454]">
            No finished products yet -- these get created automatically the first time a Packaging entry
            references a recipe SKU that doesn't exist yet, or you can add one directly on the Products side.
          </p>
        )}

        {!loading && !listError && products.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#e8e8e8]">
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454]">Product</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454]">SKU</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] text-right">Cost Price</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] text-right">Stock</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] text-right">Total Value</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const inStock = (p.stock || 0) > 0;
                  return (
                    <tr key={p.id} className="border-b border-[#f1f1f1] last:border-0">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-[0.6rem]">
                          <div className="w-8 h-8 rounded-lg bg-[rgba(226,30,83,0.08)] text-[#e21e53] flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-box text-[0.8rem]" />
                          </div>
                          <span className="text-[0.875rem] font-bold text-[#1E1E1E]">{p.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-[0.8rem] font-medium text-[#545454]">{p.sku}</td>
                      <td className="py-3 pr-3 text-[0.875rem] font-medium text-[#545454] text-right">৳{p.costPrice.toFixed(2)}</td>
                      <td className={`py-3 pr-3 text-[0.9rem] font-extrabold text-right ${inStock ? 'text-[#1E1E1E]' : 'text-[#ef4444]'}`}>
                        {formatQty(p.stock)}
                      </td>
                      <td className="py-3 pr-3 text-[0.875rem] font-bold text-[#10b981] text-right">
                        ৳{((p.stock || 0) * (p.costPrice || 0)).toFixed(2)}
                      </td>
                      <td className="py-3 pr-3 text-right">
                        {inStock ? (
                          <span className="rounded-full bg-[rgba(16,185,129,0.1)] text-[#10b981] text-[0.7rem] font-bold px-3 py-1">
                            In Stock
                          </span>
                        ) : (
                          <span className="rounded-full bg-[rgba(239,68,68,0.1)] text-[#ef4444] text-[0.7rem] font-bold px-3 py-1">
                            Out of Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={shipmentModalOpen} onClose={closeShipmentModal} title="New Shipment">
        <form onSubmit={handleShipmentSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] mb-1">
                Route
              </label>
              <select
                value={shipmentForm.routeId}
                onChange={(e) => handleShipmentChange('routeId', e.target.value)}
                className={inputClass}
              >
                <option value="">Select route</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.origin} → {r.destination}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] mb-1">
                Car
              </label>
              <select
                value={shipmentForm.carId}
                onChange={(e) => handleShipmentChange('carId', e.target.value)}
                className={inputClass}
              >
                <option value="">Select car</option>
                {cars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.plateNumber} — {c.model}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] mb-1">
                Driver
              </label>
              <select
                value={shipmentForm.driverId}
                onChange={(e) => handleShipmentChange('driverId', e.target.value)}
                className={inputClass}
              >
                <option value="">Select driver</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] mb-1">
              Toll Cost (৳, optional)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={shipmentForm.totalCost}
              onChange={(e) => handleShipmentChange('totalCost', e.target.value)}
              className={inputClass}
              placeholder="0.00"
            />
          </div>

          <p className="text-[0.75rem] text-[#545454] -mt-1">
            <i className="fa-solid fa-circle-info mr-1 text-[#e21e53]" />
            An invoice number is generated automatically once you create this shipment.
          </p>

          <div>
            <label className="block text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] mb-1">
              Note (optional)
            </label>
            <input
              type="text"
              value={shipmentForm.note}
              onChange={(e) => handleShipmentChange('note', e.target.value)}
              className={inputClass}
              placeholder="Any notes for this shipment"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454]">
                Products to Ship
              </label>
              <button
                type="button"
                onClick={addShipmentItemRow}
                className="text-[0.78rem] font-bold text-[#e21e53] hover:underline cursor-pointer"
              >
                <i className="fa-solid fa-plus mr-1" />
                Add Product
              </button>
            </div>

            {shipmentForm.items.length === 0 && (
              <p className="text-[0.8rem] text-[#545454]">No products added yet.</p>
            )}

            <div className="flex flex-col gap-2">
              {shipmentForm.items.map((row, index) => {
                const excluded = usedProductIds(index);
                const selectedProduct = products.find((p) => String(p.id) === row.productId);
                return (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={row.productId}
                      onChange={(e) => updateShipmentItemRow(index, 'productId', e.target.value)}
                      className={`${inputClass.replace('w-full ', '')} flex-1 min-w-0`}
                    >
                      <option value="">Select product</option>
                      {products
                        .filter((p) => !excluded.has(String(p.id)) || String(p.id) === row.productId)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku}) — {formatQty(p.stock)} in stock
                          </option>
                        ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      max={selectedProduct?.stock ?? undefined}
                      value={row.quantity}
                      onChange={(e) => updateShipmentItemRow(index, 'quantity', e.target.value)}
                      placeholder="Qty"
                      className={`${inputClass.replace('w-full ', '')} w-[110px] shrink-0`}
                    />
                    <button
                      type="button"
                      onClick={() => removeShipmentItemRow(index)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#e8e8e8] text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors duration-200 cursor-pointer shrink-0"
                    >
                      <i className="fa-solid fa-trash text-[0.8rem]" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {shipmentFormError && (
            <p className="text-[0.8rem] font-semibold text-[#ef4444]">{shipmentFormError}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#e8e8e8]">
            <button
              type="button"
              onClick={closeShipmentModal}
              disabled={shipmentSubmitting}
              className="h-10 px-4 rounded-lg border border-[#e8e8e8] text-[#545454] font-bold text-[0.875rem] hover:bg-[#f8fafc] transition-colors duration-200 disabled:opacity-60 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={shipmentSubmitting}
              className="h-10 px-4 rounded-lg bg-[#e21e53] text-white font-bold text-[0.875rem] hover:bg-[#c81a49] transition-colors duration-200 disabled:opacity-60 cursor-pointer"
            >
              {shipmentSubmitting ? 'Creating...' : 'Create Shipment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
