import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getApiErrorMessage } from '../utils/apiError';

const API_URL = import.meta.env.VITE_API_URL;

type ShipmentStatus = 'in_transit' | 'delivered' | 'cancelled';

interface ShipmentItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
}

interface Shipment {
  id: number;
  route: { id: number; origin: string; destination: string };
  car: { id: number; plateNumber: string; model: string };
  driver: { id: number; name: string };
  items: ShipmentItem[];
  note?: string;
  totalCost?: number;
  status: ShipmentStatus;
  createdAt: string;
}

const cardClass =
  'bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]';

const statusBadge: Record<ShipmentStatus, string> = {
  in_transit: 'bg-[rgba(59,130,246,0.1)] text-[#3b82f6]',
  delivered: 'bg-[rgba(16,185,129,0.1)] text-[#10b981]',
  cancelled: 'bg-[rgba(239,68,68,0.1)] text-[#ef4444]',
};

const statusLabel: Record<ShipmentStatus, string> = {
  in_transit: 'In Transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function TransportManagement() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const res = await axios.get<Shipment[]>(`${API_URL}/shipments`);
      setShipments(res.data);
    } catch (err) {
      setListError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to load shipments', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  const inTransitCount = shipments.filter((s) => s.status === 'in_transit').length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between pb-1">
        <div>
          <h2 className="text-[1.4rem] font-extrabold text-[#1E1E1E] mb-2">Transport Management</h2>
          <p className="text-[0.9rem] text-[#545454]">Vehicle logs and delivery scheduling.</p>
        </div>
        <button
          type="button"
          onClick={fetchShipments}
          disabled={loading}
          className="h-10 px-4 flex items-center gap-2 rounded-lg border border-[#e8e8e8] text-[#545454] font-bold text-[0.875rem] hover:bg-[#f8fafc] hover:text-[#1E1E1E] transition-colors duration-200 disabled:opacity-60 cursor-pointer"
        >
          <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : 'fa-rotate'}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <div className={`${cardClass} flex items-center gap-3`}>
          <div className="w-10 h-10 rounded-lg bg-[rgba(226,30,83,0.08)] text-[#e21e53] flex items-center justify-center shrink-0">
            <i className="fa-solid fa-truck-fast" />
          </div>
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.05em] text-[#545454] m-0">Total Shipments</p>
            <p className="text-[1.1rem] font-extrabold text-[#1E1E1E] m-0">{shipments.length}</p>
          </div>
        </div>
        <div className={`${cardClass} flex items-center gap-3`}>
          <div className="w-10 h-10 rounded-lg bg-[rgba(59,130,246,0.08)] text-[#3b82f6] flex items-center justify-center shrink-0">
            <i className="fa-solid fa-route" />
          </div>
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.05em] text-[#545454] m-0">In Transit</p>
            <p className="text-[1.1rem] font-extrabold text-[#1E1E1E] m-0">{inTransitCount}</p>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E] border-b border-[#e8e8e8] pb-3 mb-4">
          <i className="fa-solid fa-truck mr-2 text-[#e21e53]" />
          Shipments
        </h3>

        {loading && <p className="text-[0.8rem] font-semibold text-[#545454]">Loading shipments...</p>}
        {!loading && listError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{listError}</p>}
        {!loading && !listError && shipments.length === 0 && (
          <p className="text-[0.8rem] font-semibold text-[#545454]">
            No shipments yet -- create one from the "New Shipment" button on the Finished Products page.
          </p>
        )}

        {!loading && !listError && shipments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#e8e8e8]">
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454]">Route</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454]">Car</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454]">Driver</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454]">Products</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] text-right">Toll Cost</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454]">Note</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454]">Created</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((s) => (
                  <tr key={s.id} className="border-b border-[#f1f1f1] last:border-0 align-top">
                    <td className="py-3 pr-3 text-[0.85rem] font-bold text-[#1E1E1E]">
                      {s.route.origin} → {s.route.destination}
                    </td>
                    <td className="py-3 pr-3 text-[0.8rem] font-medium text-[#545454]">
                      {s.car.plateNumber}
                      <div className="text-[0.72rem] text-[#8a8a8a]">{s.car.model}</div>
                    </td>
                    <td className="py-3 pr-3 text-[0.8rem] font-medium text-[#545454]">{s.driver.name}</td>
                    <td className="py-3 pr-3 text-[0.8rem] font-medium text-[#545454]">
                      {s.items.map((item) => (
                        <div key={item.id}>
                          {item.productName} × {item.quantity}
                        </div>
                      ))}
                    </td>
                    <td className="py-3 pr-3 text-[0.85rem] font-medium text-[#545454] text-right">
                      {s.totalCost != null ? `৳${s.totalCost.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-3 pr-3 text-[0.8rem] font-medium text-[#545454] max-w-[200px]">
                      {s.note || '—'}
                    </td>
                    <td className="py-3 pr-3 text-[0.8rem] font-medium text-[#545454]">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-3 text-right">
                      <span className={`rounded-full text-[0.7rem] font-bold px-3 py-1 ${statusBadge[s.status]}`}>
                        {statusLabel[s.status]}
                      </span>
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
