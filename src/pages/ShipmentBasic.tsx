import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getApiErrorMessage } from '../utils/apiError';

const API_URL = import.meta.env.VITE_API_URL;

const inputClass =
  'w-full bg-white border border-[#e8e8e8] text-[#1E1E1E] px-[0.85rem] py-[0.65rem] rounded-lg text-[0.875rem] font-medium transition-all duration-200 outline-none focus:border-[#e21e53] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] disabled:opacity-60 disabled:cursor-not-allowed';

const cardClass =
  'bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]';

const primaryBtnClass =
  'h-10 px-4 flex items-center gap-2 rounded-lg bg-[#e21e53] text-white font-bold text-[0.875rem] transition-all duration-200 hover:bg-[#c01745] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer';

const secondaryBtnClass =
  'h-10 px-4 rounded-lg border border-[#e8e8e8] text-[#545454] font-bold text-[0.875rem] hover:bg-[#f8fafc] transition-colors duration-200 disabled:opacity-60 cursor-pointer';

/* ══════════════════════════════════════════════════════════════════
   Cars
   ══════════════════════════════════════════════════════════════════ */

type CarStatus = 'active' | 'maintenance' | 'inactive';

interface Car {
  id: number;
  plateNumber: string;
  model: string;
  capacityKg: number;
  status: CarStatus;
}

interface CarFormState {
  plateNumber: string;
  model: string;
  capacityKg: string;
  status: CarStatus;
}

const emptyCarForm: CarFormState = {
  plateNumber: '',
  model: '',
  capacityKg: '',
  status: 'active',
};

const carStatusBadge: Record<CarStatus, string> = {
  active: 'bg-[rgba(16,185,129,0.1)] text-[#10b981]',
  maintenance: 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]',
  inactive: 'bg-[rgba(239,68,68,0.1)] text-[#ef4444]',
};

/* ══════════════════════════════════════════════════════════════════
   Routes
   ══════════════════════════════════════════════════════════════════ */

interface RouteRecord {
  id: number;
  origin: string;
  destination: string;
  distanceKm?: number;
  estimatedCost?: number;
}

interface RouteFormState {
  origin: string;
  destination: string;
  distanceKm: string;
  estimatedCost: string;
}

const emptyRouteForm: RouteFormState = {
  origin: '',
  destination: '',
  distanceKm: '',
  estimatedCost: '',
};

/* ══════════════════════════════════════════════════════════════════
   Drivers
   ══════════════════════════════════════════════════════════════════ */

type DriverStatus = 'active' | 'inactive';

interface Driver {
  id: number;
  name: string;
  phone?: string;
  licenseNumber?: string;
  status: DriverStatus;
}

interface DriverFormState {
  name: string;
  phone: string;
  licenseNumber: string;
  status: DriverStatus;
}

const emptyDriverForm: DriverFormState = {
  name: '',
  phone: '',
  licenseNumber: '',
  status: 'active',
};

export default function ShipmentBasic() {
  /* ─────────────────────────── Cars state ─────────────────────────── */
  const [cars, setCars] = useState<Car[]>([]);
  const [loadingCars, setLoadingCars] = useState(false);
  const [carsError, setCarsError] = useState<string | null>(null);

  const [editingCarId, setEditingCarId] = useState<number | null>(null);
  const [carForm, setCarForm] = useState<CarFormState>(emptyCarForm);
  const [carSubmitting, setCarSubmitting] = useState(false);
  const [carFormError, setCarFormError] = useState<string | null>(null);
  const [deletingCarId, setDeletingCarId] = useState<number | null>(null);

  /* ─────────────────────────── Routes state ────────────────────────── */
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [routesError, setRoutesError] = useState<string | null>(null);

  const [editingRouteId, setEditingRouteId] = useState<number | null>(null);
  const [routeForm, setRouteForm] = useState<RouteFormState>(emptyRouteForm);
  const [routeSubmitting, setRouteSubmitting] = useState(false);
  const [routeFormError, setRouteFormError] = useState<string | null>(null);
  const [deletingRouteId, setDeletingRouteId] = useState<number | null>(null);

  /* ─────────────────────────── Drivers state ───────────────────────── */
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [driversError, setDriversError] = useState<string | null>(null);

  const [editingDriverId, setEditingDriverId] = useState<number | null>(null);
  const [driverForm, setDriverForm] = useState<DriverFormState>(emptyDriverForm);
  const [driverSubmitting, setDriverSubmitting] = useState(false);
  const [driverFormError, setDriverFormError] = useState<string | null>(null);
  const [deletingDriverId, setDeletingDriverId] = useState<number | null>(null);

  /* ────────────────────────────  Fetchers  ─────────────────────────── */
  const fetchCars = useCallback(async () => {
    setLoadingCars(true);
    setCarsError(null);
    try {
      const res = await axios.get<Car[]>(`${API_URL}/cars`);
      setCars(res.data);
    } catch (err) {
      setCarsError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to load cars', err);
    } finally {
      setLoadingCars(false);
    }
  }, []);

  const fetchRoutes = useCallback(async () => {
    setLoadingRoutes(true);
    setRoutesError(null);
    try {
      const res = await axios.get<RouteRecord[]>(`${API_URL}/routes`);
      setRoutes(res.data);
    } catch (err) {
      setRoutesError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to load routes', err);
    } finally {
      setLoadingRoutes(false);
    }
  }, []);

  const fetchDrivers = useCallback(async () => {
    setLoadingDrivers(true);
    setDriversError(null);
    try {
      const res = await axios.get<Driver[]>(`${API_URL}/drivers`);
      setDrivers(res.data);
    } catch (err) {
      setDriversError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to load drivers', err);
    } finally {
      setLoadingDrivers(false);
    }
  }, []);

  useEffect(() => {
    fetchCars();
    fetchRoutes();
    fetchDrivers();
  }, [fetchCars, fetchRoutes, fetchDrivers]);

  /* ───────────────────────────  Car CRUD  ──────────────────────────── */
  const openEditCar = (car: Car) => {
    setEditingCarId(car.id);
    setCarForm({
      plateNumber: car.plateNumber,
      model: car.model,
      capacityKg: String(car.capacityKg),
      status: car.status,
    });
    setCarFormError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditCar = () => {
    setEditingCarId(null);
    setCarForm(emptyCarForm);
    setCarFormError(null);
  };

  const handleCarChange = (field: keyof CarFormState, value: string) => {
    setCarForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCarSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCarFormError(null);

    const capacityKg = parseFloat(carForm.capacityKg);
    if (!carForm.plateNumber.trim() || !carForm.model.trim() || isNaN(capacityKg) || capacityKg <= 0) {
      setCarFormError('Enter a plate number, model, and a valid capacity.');
      return;
    }

    setCarSubmitting(true);
    try {
      const payload = { plateNumber: carForm.plateNumber, model: carForm.model, capacityKg, status: carForm.status };
      if (editingCarId != null) {
        await axios.patch(`${API_URL}/cars/${editingCarId}`, payload);
      } else {
        await axios.post(`${API_URL}/cars`, payload);
      }
      setEditingCarId(null);
      setCarForm(emptyCarForm);
      fetchCars();
    } catch (err) {
      setCarFormError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to save car', err);
    } finally {
      setCarSubmitting(false);
    }
  };

  const handleCarDelete = async (id: number) => {
    if (!window.confirm('Delete this car? This cannot be undone.')) return;
    setDeletingCarId(id);
    try {
      await axios.delete(`${API_URL}/cars/${id}`);
      setCars((prev) => prev.filter((c) => c.id !== id));
      if (editingCarId === id) cancelEditCar();
    } catch (err) {
      console.error('Failed to delete car', err);
      window.alert(getApiErrorMessage(err, 'Failed to delete car. Check the console.'));
    } finally {
      setDeletingCarId(null);
    }
  };

  /* ──────────────────────────  Route CRUD  ─────────────────────────── */
  const openEditRoute = (route: RouteRecord) => {
    setEditingRouteId(route.id);
    setRouteForm({
      origin: route.origin,
      destination: route.destination,
      distanceKm: route.distanceKm != null ? String(route.distanceKm) : '',
      estimatedCost: route.estimatedCost != null ? String(route.estimatedCost) : '',
    });
    setRouteFormError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditRoute = () => {
    setEditingRouteId(null);
    setRouteForm(emptyRouteForm);
    setRouteFormError(null);
  };

  const handleRouteChange = (field: keyof RouteFormState, value: string) => {
    setRouteForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleRouteSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRouteFormError(null);

    if (!routeForm.origin.trim() || !routeForm.destination.trim()) {
      setRouteFormError('Enter an origin and destination.');
      return;
    }

    setRouteSubmitting(true);
    try {
      const payload = {
        origin: routeForm.origin,
        destination: routeForm.destination,
        distanceKm: routeForm.distanceKm.trim() === '' ? undefined : Number(routeForm.distanceKm),
        estimatedCost: routeForm.estimatedCost.trim() === '' ? undefined : Number(routeForm.estimatedCost),
      };
      if (editingRouteId != null) {
        await axios.patch(`${API_URL}/routes/${editingRouteId}`, payload);
      } else {
        await axios.post(`${API_URL}/routes`, payload);
      }
      setEditingRouteId(null);
      setRouteForm(emptyRouteForm);
      fetchRoutes();
    } catch (err) {
      setRouteFormError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to save route', err);
    } finally {
      setRouteSubmitting(false);
    }
  };

  const handleRouteDelete = async (id: number) => {
    if (!window.confirm('Delete this route? This cannot be undone.')) return;
    setDeletingRouteId(id);
    try {
      await axios.delete(`${API_URL}/routes/${id}`);
      setRoutes((prev) => prev.filter((r) => r.id !== id));
      if (editingRouteId === id) cancelEditRoute();
    } catch (err) {
      console.error('Failed to delete route', err);
      window.alert(getApiErrorMessage(err, 'Failed to delete route. Check the console.'));
    } finally {
      setDeletingRouteId(null);
    }
  };

  /* ──────────────────────────  Driver CRUD  ────────────────────────── */
  const openEditDriver = (driver: Driver) => {
    setEditingDriverId(driver.id);
    setDriverForm({
      name: driver.name,
      phone: driver.phone ?? '',
      licenseNumber: driver.licenseNumber ?? '',
      status: driver.status,
    });
    setDriverFormError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditDriver = () => {
    setEditingDriverId(null);
    setDriverForm(emptyDriverForm);
    setDriverFormError(null);
  };

  const handleDriverChange = (field: keyof DriverFormState, value: string) => {
    setDriverForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDriverSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDriverFormError(null);

    if (!driverForm.name.trim()) {
      setDriverFormError('Enter a name.');
      return;
    }

    setDriverSubmitting(true);
    try {
      const payload = {
        name: driverForm.name,
        phone: driverForm.phone.trim() === '' ? undefined : driverForm.phone,
        licenseNumber: driverForm.licenseNumber.trim() === '' ? undefined : driverForm.licenseNumber,
        status: driverForm.status,
      };
      if (editingDriverId != null) {
        await axios.patch(`${API_URL}/drivers/${editingDriverId}`, payload);
      } else {
        await axios.post(`${API_URL}/drivers`, payload);
      }
      setEditingDriverId(null);
      setDriverForm(emptyDriverForm);
      fetchDrivers();
    } catch (err) {
      setDriverFormError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to save driver', err);
    } finally {
      setDriverSubmitting(false);
    }
  };

  const handleDriverDelete = async (id: number) => {
    if (!window.confirm('Delete this driver? This cannot be undone.')) return;
    setDeletingDriverId(id);
    try {
      await axios.delete(`${API_URL}/drivers/${id}`);
      setDrivers((prev) => prev.filter((d) => d.id !== id));
      if (editingDriverId === id) cancelEditDriver();
    } catch (err) {
      console.error('Failed to delete driver', err);
      window.alert(getApiErrorMessage(err, 'Failed to delete driver. Check the console.'));
    } finally {
      setDeletingDriverId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-[1.4rem] font-extrabold text-[#1E1E1E] mb-2">Shipment Basic</h2>
        <p className="text-[0.9rem] text-[#545454]">Manage the fleet, delivery routes, and drivers used for shipments.</p>
      </div>

      {/* ══════════════════════ CARS ══════════════════════ */}
      <div className={cardClass}>
        <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E] border-b border-[#e8e8e8] pb-3 mb-4">
          <i className="fa-solid fa-truck mr-2 text-[#e21e53]" />
          {editingCarId != null ? 'Edit Car' : 'Add Car'}
        </h3>
        <form onSubmit={handleCarSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:items-end">
          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Plate Number</label>
            <input
              type="text"
              value={carForm.plateNumber}
              onChange={(e) => handleCarChange('plateNumber', e.target.value)}
              placeholder="e.g. DHAKA-METRO-GA-12-3456"
              disabled={carSubmitting}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Model</label>
            <input
              type="text"
              value={carForm.model}
              onChange={(e) => handleCarChange('model', e.target.value)}
              placeholder="e.g. Toyota Hiace"
              disabled={carSubmitting}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Capacity (kg)</label>
            <input
              type="number"
              step="any"
              value={carForm.capacityKg}
              onChange={(e) => handleCarChange('capacityKg', e.target.value)}
              placeholder="e.g. 1500"
              disabled={carSubmitting}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Status</label>
            <select
              value={carForm.status}
              onChange={(e) => handleCarChange('status', e.target.value as CarStatus)}
              disabled={carSubmitting}
              className={inputClass}
            >
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="sm:col-span-4 flex gap-2">
            <button type="submit" disabled={carSubmitting} className={primaryBtnClass}>
              <i className={`fa-solid ${carSubmitting ? 'fa-spinner fa-spin' : 'fa-save'}`} />
              {carSubmitting ? 'Saving...' : editingCarId != null ? 'Save Changes' : 'Add Car'}
            </button>
            {editingCarId != null && (
              <button type="button" onClick={cancelEditCar} disabled={carSubmitting} className={secondaryBtnClass}>
                Cancel
              </button>
            )}
          </div>
        </form>
        {carFormError && <p className="text-[0.8rem] font-semibold text-[#ef4444] mt-3">{carFormError}</p>}
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3 mb-4">
          <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E]">
            <i className="fa-solid fa-list mr-2 text-[#e21e53]" />
            Cars
          </h3>
          <span className="rounded-full bg-[rgba(16,185,129,0.1)] text-[#10b981] text-[0.7rem] font-bold px-3 py-1">
            {cars.length} {cars.length === 1 ? 'car' : 'cars'}
          </span>
        </div>

        {loadingCars && <p className="text-[0.8rem] font-semibold text-[#545454]">Loading cars...</p>}
        {!loadingCars && carsError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{carsError}</p>}
        {!loadingCars && !carsError && cars.length === 0 && (
          <p className="text-[0.8rem] font-semibold text-[#545454]">No cars yet. Add your first one above.</p>
        )}

        {!loadingCars && !carsError && cars.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#e8e8e8]">
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454]">Plate Number</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454]">Model</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] text-right">Capacity (kg)</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454]">Status</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cars.map((c) => (
                  <tr key={c.id} className="border-b border-[#f1f1f1] last:border-0">
                    <td className="py-3 pr-3 text-[0.875rem] font-bold text-[#1E1E1E]">{c.plateNumber}</td>
                    <td className="py-3 pr-3 text-[0.875rem] font-medium text-[#545454]">{c.model}</td>
                    <td className="py-3 pr-3 text-[0.875rem] font-medium text-[#545454] text-right">{c.capacityKg}</td>
                    <td className="py-3 pr-3">
                      <span
                        className={`inline-flex items-center rounded-full px-[0.6rem] py-[0.2rem] text-[0.7rem] font-bold capitalize ${carStatusBadge[c.status]}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditCar(c)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#e8e8e8] text-[#545454] hover:bg-[#f8fafc] hover:text-[#1E1E1E] transition-colors duration-200 cursor-pointer"
                          title="Edit"
                        >
                          <i className="fa-solid fa-pen" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCarDelete(c.id)}
                          disabled={deletingCarId === c.id}
                          className="h-8 w-8 flex items-center justify-center rounded-lg border border-[rgba(239,68,68,0.25)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors duration-200 disabled:opacity-60 cursor-pointer"
                          title="Delete"
                        >
                          <i className={`fa-solid ${deletingCarId === c.id ? 'fa-spinner fa-spin' : 'fa-trash'}`} />
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

      {/* ══════════════════════ ROUTES ══════════════════════ */}
      <div className={cardClass}>
        <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E] border-b border-[#e8e8e8] pb-3 mb-4">
          <i className="fa-solid fa-route mr-2 text-[#e21e53]" />
          {editingRouteId != null ? 'Edit Route' : 'Add Route'}
        </h3>
        <form onSubmit={handleRouteSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:items-end">
          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Origin</label>
            <input
              type="text"
              value={routeForm.origin}
              onChange={(e) => handleRouteChange('origin', e.target.value)}
              placeholder="e.g. Dhaka"
              disabled={routeSubmitting}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Destination</label>
            <input
              type="text"
              value={routeForm.destination}
              onChange={(e) => handleRouteChange('destination', e.target.value)}
              placeholder="e.g. Chattogram"
              disabled={routeSubmitting}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">
              Distance (km) <span className="font-normal text-[#545454]">(optional)</span>
            </label>
            <input
              type="number"
              step="any"
              value={routeForm.distanceKm}
              onChange={(e) => handleRouteChange('distanceKm', e.target.value)}
              placeholder="e.g. 264"
              disabled={routeSubmitting}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">
              Est. Cost (৳) <span className="font-normal text-[#545454]">(optional)</span>
            </label>
            <input
              type="number"
              step="any"
              value={routeForm.estimatedCost}
              onChange={(e) => handleRouteChange('estimatedCost', e.target.value)}
              placeholder="e.g. 3500"
              disabled={routeSubmitting}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-4 flex gap-2">
            <button type="submit" disabled={routeSubmitting} className={primaryBtnClass}>
              <i className={`fa-solid ${routeSubmitting ? 'fa-spinner fa-spin' : 'fa-save'}`} />
              {routeSubmitting ? 'Saving...' : editingRouteId != null ? 'Save Changes' : 'Add Route'}
            </button>
            {editingRouteId != null && (
              <button type="button" onClick={cancelEditRoute} disabled={routeSubmitting} className={secondaryBtnClass}>
                Cancel
              </button>
            )}
          </div>
        </form>
        {routeFormError && <p className="text-[0.8rem] font-semibold text-[#ef4444] mt-3">{routeFormError}</p>}
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3 mb-4">
          <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E]">
            <i className="fa-solid fa-list mr-2 text-[#e21e53]" />
            Routes
          </h3>
          <span className="rounded-full bg-[rgba(16,185,129,0.1)] text-[#10b981] text-[0.7rem] font-bold px-3 py-1">
            {routes.length} {routes.length === 1 ? 'route' : 'routes'}
          </span>
        </div>

        {loadingRoutes && <p className="text-[0.8rem] font-semibold text-[#545454]">Loading routes...</p>}
        {!loadingRoutes && routesError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{routesError}</p>}
        {!loadingRoutes && !routesError && routes.length === 0 && (
          <p className="text-[0.8rem] font-semibold text-[#545454]">No routes yet. Add your first one above.</p>
        )}

        {!loadingRoutes && !routesError && routes.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#e8e8e8]">
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454]">Origin</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454]">Destination</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] text-right">Distance (km)</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] text-right">Est. Cost (৳)</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {routes.map((r) => (
                  <tr key={r.id} className="border-b border-[#f1f1f1] last:border-0">
                    <td className="py-3 pr-3 text-[0.875rem] font-bold text-[#1E1E1E]">{r.origin}</td>
                    <td className="py-3 pr-3 text-[0.875rem] font-medium text-[#545454]">{r.destination}</td>
                    <td className="py-3 pr-3 text-[0.875rem] font-medium text-[#545454] text-right">
                      {r.distanceKm ?? '—'}
                    </td>
                    <td className="py-3 pr-3 text-[0.875rem] font-medium text-[#545454] text-right">
                      {r.estimatedCost != null ? `৳${r.estimatedCost}` : '—'}
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditRoute(r)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#e8e8e8] text-[#545454] hover:bg-[#f8fafc] hover:text-[#1E1E1E] transition-colors duration-200 cursor-pointer"
                          title="Edit"
                        >
                          <i className="fa-solid fa-pen" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRouteDelete(r.id)}
                          disabled={deletingRouteId === r.id}
                          className="h-8 w-8 flex items-center justify-center rounded-lg border border-[rgba(239,68,68,0.25)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors duration-200 disabled:opacity-60 cursor-pointer"
                          title="Delete"
                        >
                          <i className={`fa-solid ${deletingRouteId === r.id ? 'fa-spinner fa-spin' : 'fa-trash'}`} />
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

      {/* ══════════════════════ DRIVERS ══════════════════════ */}
      <div className={cardClass}>
        <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E] border-b border-[#e8e8e8] pb-3 mb-4">
          <i className="fa-solid fa-id-card mr-2 text-[#e21e53]" />
          {editingDriverId != null ? 'Edit Driver' : 'Add Driver'}
        </h3>
        <form onSubmit={handleDriverSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:items-end">
          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Name</label>
            <input
              type="text"
              value={driverForm.name}
              onChange={(e) => handleDriverChange('name', e.target.value)}
              placeholder="e.g. Karim Ahmed"
              disabled={driverSubmitting}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">
              Phone <span className="font-normal text-[#545454]">(optional)</span>
            </label>
            <input
              type="tel"
              value={driverForm.phone}
              onChange={(e) => handleDriverChange('phone', e.target.value)}
              placeholder="e.g. 017xxxxxxxx"
              disabled={driverSubmitting}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">
              License Number <span className="font-normal text-[#545454]">(optional)</span>
            </label>
            <input
              type="text"
              value={driverForm.licenseNumber}
              onChange={(e) => handleDriverChange('licenseNumber', e.target.value)}
              placeholder="e.g. DL-123456"
              disabled={driverSubmitting}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-bold text-[#1E1E1E]">Status</label>
            <select
              value={driverForm.status}
              onChange={(e) => handleDriverChange('status', e.target.value as DriverStatus)}
              disabled={driverSubmitting}
              className={inputClass}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="sm:col-span-4 flex gap-2">
            <button type="submit" disabled={driverSubmitting} className={primaryBtnClass}>
              <i className={`fa-solid ${driverSubmitting ? 'fa-spinner fa-spin' : 'fa-save'}`} />
              {driverSubmitting ? 'Saving...' : editingDriverId != null ? 'Save Changes' : 'Add Driver'}
            </button>
            {editingDriverId != null && (
              <button type="button" onClick={cancelEditDriver} disabled={driverSubmitting} className={secondaryBtnClass}>
                Cancel
              </button>
            )}
          </div>
        </form>
        {driverFormError && <p className="text-[0.8rem] font-semibold text-[#ef4444] mt-3">{driverFormError}</p>}
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3 mb-4">
          <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E]">
            <i className="fa-solid fa-list mr-2 text-[#e21e53]" />
            Drivers
          </h3>
          <span className="rounded-full bg-[rgba(16,185,129,0.1)] text-[#10b981] text-[0.7rem] font-bold px-3 py-1">
            {drivers.length} {drivers.length === 1 ? 'driver' : 'drivers'}
          </span>
        </div>

        {loadingDrivers && <p className="text-[0.8rem] font-semibold text-[#545454]">Loading drivers...</p>}
        {!loadingDrivers && driversError && <p className="text-[0.8rem] font-semibold text-[#ef4444]">{driversError}</p>}
        {!loadingDrivers && !driversError && drivers.length === 0 && (
          <p className="text-[0.8rem] font-semibold text-[#545454]">No drivers yet. Add your first one above.</p>
        )}

        {!loadingDrivers && !driversError && drivers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#e8e8e8]">
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454]">Name</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454]">Phone</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454]">License Number</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454]">Status</th>
                  <th className="py-2 pr-3 text-[0.72rem] font-extrabold uppercase tracking-[0.05em] text-[#545454] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => (
                  <tr key={d.id} className="border-b border-[#f1f1f1] last:border-0">
                    <td className="py-3 pr-3 text-[0.875rem] font-bold text-[#1E1E1E]">{d.name}</td>
                    <td className="py-3 pr-3 text-[0.875rem] font-medium text-[#545454]">{d.phone || '—'}</td>
                    <td className="py-3 pr-3 text-[0.875rem] font-medium text-[#545454]">{d.licenseNumber || '—'}</td>
                    <td className="py-3 pr-3">
                      <span
                        className={`inline-flex items-center rounded-full px-[0.6rem] py-[0.2rem] text-[0.7rem] font-bold ${
                          d.status === 'active'
                            ? 'bg-[rgba(16,185,129,0.1)] text-[#10b981]'
                            : 'bg-[rgba(239,68,68,0.1)] text-[#ef4444]'
                        }`}
                      >
                        {d.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditDriver(d)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#e8e8e8] text-[#545454] hover:bg-[#f8fafc] hover:text-[#1E1E1E] transition-colors duration-200 cursor-pointer"
                          title="Edit"
                        >
                          <i className="fa-solid fa-pen" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDriverDelete(d.id)}
                          disabled={deletingDriverId === d.id}
                          className="h-8 w-8 flex items-center justify-center rounded-lg border border-[rgba(239,68,68,0.25)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors duration-200 disabled:opacity-60 cursor-pointer"
                          title="Delete"
                        >
                          <i className={`fa-solid ${deletingDriverId === d.id ? 'fa-spinner fa-spin' : 'fa-trash'}`} />
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
