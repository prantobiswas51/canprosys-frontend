import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { getApiErrorMessage } from '../utils/apiError';
import { formatQty } from '../utils/formatNumber';

const API_URL = import.meta.env.VITE_API_URL;

// ─── Types (only the fields this page actually reads) ───
type EmployeeStatus = 'active' | 'inactive';
type NidStatus = 'pending' | 'approved' | 'rejected';

interface EmployeeRow {
  id: number;
  name: string;
  phone?: string;
  status: EmployeeStatus;
  balance: number;
  nidStatus: NidStatus;
}

interface PayoutRow {
  amount: number;
}

interface LoanRow {
  amount: number;
}

interface RawMaterialStockRow {
  rawMaterialId: number;
  rawMaterialName: string;
  unit: string;
  quantityRemaining: number;
  stockValue: number;
}

interface WoodStockRow {
  woodTypeId: number;
  woodTypeName: string;
  unit: string;
  quantityRemaining: number;
  stockValue: number;
}

interface ProductRow {
  id: number;
  name: string;
  sku: string;
  costPrice: number;
  stock: number;
}

interface WasteStockRow {
  wasteTypeId: number;
  wasteTypeName: string;
  quantityRemaining: number;
}

interface MaintenanceCostRow {
  amount: number;
}

interface StockItem {
  key: string;
  name: string;
  unit: string;
  quantityRemaining: number;
  stockValue: number;
  category: 'material' | 'wood';
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

// First/last day of the current month, YYYY-MM-DD -- what "this month's
// wages/loans" is scoped to.
function monthBounds(month: string) {
  const [year, mon] = month.split('-').map(Number);
  const from = `${month}-01`;
  const lastDay = new Date(year, mon, 0).getDate();
  const to = `${month}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

// ─── Animated count-up, no chart library needed ───
function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!target) {
      setValue(0);
      return;
    }
    let raf: number;
    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(eased * target);
      if (p < 1) raf = requestAnimationFrame(step);
      else setValue(target);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

const ACCENT = {
  green: { color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
  blue: { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
  amber: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  rose: { color: '#e21e53', bg: 'rgba(226,30,83,0.08)' },
  purple: { color: '#a855f7', bg: 'rgba(168,85,247,0.08)' },
} as const;

interface StatCardProps {
  label: string;
  value: number;
  icon: string;
  accent: keyof typeof ACCENT;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  warn?: boolean;
}

function StatCard({ label, value, icon, accent, prefix = '', suffix = '', decimals = 0, warn }: StatCardProps) {
  const animated = useCountUp(value);
  const { color, bg } = ACCENT[accent];
  const display = decimals > 0 ? animated.toFixed(decimals) : Math.round(animated).toLocaleString();
  const isAlert = warn && value > 0;

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]">
      <span className="absolute left-0 right-0 top-0 h-[3px]" style={{ background: color }} />
      <div className="mb-2 flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg text-[0.95rem]" style={{ background: bg, color }}>
          <i className={`fa-solid ${icon}`} />
        </div>
        {isAlert && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(239,68,68,0.1)] px-2 py-[0.15rem] text-[0.62rem] font-bold text-[#ef4444]">
            <i className="fa-solid fa-triangle-exclamation" />
          </span>
        )}
      </div>
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.05em] text-[#545454]">{label}</p>
      <h3 className="mt-[0.15rem] text-[1.3rem] font-extrabold tracking-tight" style={{ color: isAlert ? '#ef4444' : '#1E1E1E' }}>
        {prefix && <span className="text-[0.75rem] font-bold opacity-70">{prefix}</span>}
        {display}
        {suffix && <span className="text-[0.75rem] font-bold opacity-70">{suffix}</span>}
      </h3>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(226,30,83,0.08)] text-[#e21e53]">
        <i className={`fa-solid ${icon}`} />
      </div>
      <div>
        <h2 className="text-[1.1rem] font-extrabold text-[#1E1E1E]">{title}</h2>
        <p className="text-[0.78rem] text-[#545454]">{subtitle}</p>
      </div>
    </div>
  );
}

const cardClass =
  'bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]';

const nidBadgeClass: Record<NidStatus, string> = {
  pending: 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]',
  approved: 'bg-[rgba(16,185,129,0.1)] text-[#10b981]',
  rejected: 'bg-[rgba(239,68,68,0.1)] text-[#ef4444]',
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [monthPayouts, setMonthPayouts] = useState<PayoutRow[]>([]);
  const [monthLoans, setMonthLoans] = useState<LoanRow[]>([]);
  const [materialStock, setMaterialStock] = useState<RawMaterialStockRow[]>([]);
  const [woodStock, setWoodStock] = useState<WoodStockRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [wasteStock, setWasteStock] = useState<WasteStockRow[]>([]);
  const [monthMaintenanceCosts, setMonthMaintenanceCosts] = useState<MaintenanceCostRow[]>([]);

  useEffect(() => {
    const { from, to } = monthBounds(currentMonth());

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [empRes, payoutRes, loanRes, matRes, woodRes, productRes, wasteRes, maintenanceRes] = await Promise.all([
          axios.get<EmployeeRow[]>(`${API_URL}/employees`),
          axios.get<PayoutRow[]>(`${API_URL}/payouts`, { params: { month: currentMonth() } }),
          axios.get<LoanRow[]>(`${API_URL}/loans`, { params: { from, to } }),
          axios.get<RawMaterialStockRow[]>(`${API_URL}/material-batches/stock-summary`),
          axios.get<WoodStockRow[]>(`${API_URL}/wood-stock/summary`),
          axios.get<ProductRow[]>(`${API_URL}/products`),
          axios.get<WasteStockRow[]>(`${API_URL}/waste-batches/stock`),
          axios.get<MaintenanceCostRow[]>(`${API_URL}/maintenance-costs`, { params: { month: currentMonth() } }),
        ]);
        setEmployees(empRes.data);
        setMonthPayouts(payoutRes.data);
        setMonthLoans(loanRes.data);
        setMaterialStock(matRes.data);
        setWoodStock(woodRes.data);
        setProducts(productRes.data);
        setWasteStock(wasteRes.data);
        setMonthMaintenanceCosts(maintenanceRes.data);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Employee metrics ──
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.status === 'active').length;
  const inactiveEmployees = totalEmployees - activeEmployees;
  const pendingNidEmployees = employees.filter((e) => e.nidStatus === 'pending');
  const totalBalanceOwed = employees.reduce((sum, e) => sum + (e.balance || 0), 0);
  const monthWagesTotal = monthPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);
  const monthLoansTotal = monthLoans.reduce((sum, l) => sum + (l.amount || 0), 0);

  // ── Inventory metrics ──
  const stockItems: StockItem[] = [
    ...materialStock.map((m) => ({
      key: `material-${m.rawMaterialId}`,
      name: m.rawMaterialName,
      unit: m.unit,
      quantityRemaining: m.quantityRemaining,
      stockValue: m.stockValue,
      category: 'material' as const,
    })),
    ...woodStock.map((w) => ({
      key: `wood-${w.woodTypeId}`,
      name: w.woodTypeName,
      unit: w.unit,
      quantityRemaining: w.quantityRemaining,
      stockValue: w.stockValue,
      category: 'wood' as const,
    })),
  ].sort((a, b) => b.stockValue - a.stockValue);

  const rawStockValue = stockItems.reduce((sum, i) => sum + i.stockValue, 0);
  const outOfStockMaterials = stockItems.filter((i) => i.quantityRemaining <= 0).length;
  const finishedGoodsValue = products.reduce((sum, p) => sum + (p.stock || 0) * (p.costPrice || 0), 0);
  const outOfStockProducts = products.filter((p) => (p.stock || 0) <= 0).length;
  const sortedProducts = [...products].sort((a, b) => b.stock * b.costPrice - a.stock * a.costPrice);
  const wasteTypesInStock = wasteStock.filter((w) => w.quantityRemaining > 0).length;

  // ── Operating cost metrics ──
  const monthMaintenanceTotal = monthMaintenanceCosts.reduce((sum, c) => sum + (c.amount || 0), 0);

  const today = new Date();

  return (
    <div className="flex flex-col gap-6">
      {/* ══ HERO ══ */}
      <div className="relative overflow-hidden rounded-2xl border border-[#e8e8e8] bg-gradient-to-br from-[rgba(226,30,83,0.05)] to-[rgba(22,17,56,0.04)] px-6 py-6 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex flex-col gap-2">
            <span className="inline-flex w-fit items-center gap-[0.35rem] rounded-full border border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.1)] px-3 py-1 text-[0.72rem] font-bold tracking-[0.04em] text-[#10b981]">
              <span className="h-[6px] w-[6px] animate-pulse rounded-full bg-[#10b981]" />
              Live
            </span>
            <h1 className="text-[1.5rem] font-extrabold tracking-tight text-[#1E1E1E] sm:text-[1.9rem]">
              Dashboard <span className="text-[#e21e53]">Overview</span>
            </h1>
            <p className="max-w-[42ch] text-[0.85rem] text-[#545454]">
              Workforce and stock, at a glance.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-[#e8e8e8] bg-white px-4 py-3 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
            <i className="fa-regular fa-calendar-check text-[#e21e53]" />
            <div>
              <div className="text-[0.68rem] font-bold uppercase tracking-[0.05em] text-[#545454]">
                {today.toLocaleDateString(undefined, { weekday: 'long' })}
              </div>
              <div className="text-[0.85rem] font-bold text-[#1E1E1E]">
                {today.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-[0.85rem] font-semibold text-[#ef4444]">{error}</p>}
      {loading && <p className="text-[0.85rem] font-semibold text-[#545454]">Loading dashboard...</p>}

      {!loading && !error && (
        <>
          {/* ══ EMPLOYEE SECTION ══ */}
          <div className="flex flex-col gap-4">
            <SectionHeader icon="fa-user-group" title="Employee Overview" subtitle="Workforce, wages & NID verification" />

            <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-4">
              <StatCard label="Total Employees" value={totalEmployees} icon="fa-users" accent="blue" />
              <StatCard label="Active" value={activeEmployees} icon="fa-user-check" accent="green" />
              <StatCard label="This Month's Wages" value={monthWagesTotal} icon="fa-bangladeshi-taka-sign" accent="green" prefix="৳ " decimals={2} />
              <StatCard label="This Month's Loans" value={monthLoansTotal} icon="fa-hand-holding-dollar" accent="amber" prefix="৳ " decimals={2} />
              <StatCard label="Balance Owed" value={totalBalanceOwed} icon="fa-wallet" accent="rose" prefix="৳ " decimals={2} />
              <StatCard label="Pending NID" value={pendingNidEmployees.length} icon="fa-id-card" accent="amber" warn />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className={cardClass}>
                <h3 className="mb-4 text-[0.95rem] font-extrabold text-[#1E1E1E]">
                  <i className="fa-solid fa-chart-simple mr-2 text-[#e21e53]" />
                  Workforce Status
                </h3>
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[0.8rem] font-semibold">
                      <span className="text-[#1E1E1E]">Active</span>
                      <span className="text-[#10b981]">{activeEmployees} / {totalEmployees}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#f1f1f1]">
                      <div
                        className="h-2 rounded-full bg-[#10b981] transition-[width] duration-700"
                        style={{ width: `${totalEmployees ? (activeEmployees / totalEmployees) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[0.8rem] font-semibold">
                      <span className="text-[#1E1E1E]">Inactive</span>
                      <span className="text-[#ef4444]">{inactiveEmployees} / {totalEmployees}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#f1f1f1]">
                      <div
                        className="h-2 rounded-full bg-[#ef4444] transition-[width] duration-700"
                        style={{ width: `${totalEmployees ? (inactiveEmployees / totalEmployees) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
                {totalEmployees === 0 && (
                  <p className="mt-3 text-[0.78rem] text-[#545454]">No employees yet.</p>
                )}
              </div>

              <div className={cardClass}>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-[0.95rem] font-extrabold text-[#1E1E1E]">
                    <i className="fa-solid fa-id-card mr-2 text-[#e21e53]" />
                    Pending NID Verification
                  </h3>
                  <Link to="/employees" className="text-[0.78rem] font-bold text-[#e21e53] hover:underline">
                    View All
                  </Link>
                </div>
                {pendingNidEmployees.length === 0 ? (
                  <p className="text-[0.8rem] text-[#545454]">
                    <i className="fa-solid fa-circle-check mr-1 text-[#10b981]" />
                    Everyone's verified. Nothing pending.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {pendingNidEmployees.slice(0, 6).map((e) => (
                      <div key={e.id} className="flex items-center justify-between rounded-lg border border-[#e8e8e8] px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-[0.85rem] font-bold text-[#1E1E1E]">{e.name}</p>
                          <p className="text-[0.72rem] text-[#545454]">{e.phone || 'No phone on file'}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-[0.15rem] text-[0.68rem] font-bold ${nidBadgeClass.pending}`}>
                          Pending
                        </span>
                      </div>
                    ))}
                    {pendingNidEmployees.length > 6 && (
                      <p className="text-[0.72rem] text-[#545454]">+{pendingNidEmployees.length - 6} more</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ══ INVENTORY SECTION ══ */}
          <div className="flex flex-col gap-4">
            <SectionHeader icon="fa-warehouse" title="Inventory Overview" subtitle="Raw materials, wood stock & finished goods" />

            <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-4">
              <StatCard label="Raw Material Value" value={rawStockValue} icon="fa-boxes-stacked" accent="blue" prefix="৳ " decimals={2} />
              <StatCard label="Finished Goods Value" value={finishedGoodsValue} icon="fa-sack-dollar" accent="green" prefix="৳ " decimals={2} />
              <StatCard label="Out of Stock (Materials)" value={outOfStockMaterials} icon="fa-triangle-exclamation" accent="rose" warn />
              <StatCard label="Out of Stock (Products)" value={outOfStockProducts} icon="fa-box-open" accent="rose" warn />
              <StatCard label="Waste Types In Stock" value={wasteTypesInStock} icon="fa-dumpster" accent="purple" />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className={cardClass}>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-[0.95rem] font-extrabold text-[#1E1E1E]">
                    <i className="fa-solid fa-warehouse mr-2 text-[#e21e53]" />
                    Raw Material & Wood Stock
                  </h3>
                  <Link to="/inventory" className="text-[0.78rem] font-bold text-[#e21e53] hover:underline">
                    View All
                  </Link>
                </div>
                {stockItems.length === 0 ? (
                  <p className="text-[0.8rem] text-[#545454]">No stock recorded yet.</p>
                ) : (
                  <div className="flex max-h-[340px] flex-col gap-2 overflow-y-auto pr-1">
                    {stockItems.map((item) => (
                      <div
                        key={item.key}
                        className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 ${
                          item.quantityRemaining <= 0
                            ? 'border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.02)]'
                            : 'border-[#e8e8e8]'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[0.75rem] ${
                              item.category === 'wood'
                                ? 'bg-[rgba(168,85,247,0.08)] text-[#a855f7]'
                                : 'bg-[rgba(59,130,246,0.08)] text-[#3b82f6]'
                            }`}
                          >
                            <i className={`fa-solid ${item.category === 'wood' ? 'fa-tree' : 'fa-box'}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[0.82rem] font-bold text-[#1E1E1E]">{item.name}</p>
                            <p className="text-[0.7rem] text-[#545454]">
                              {formatQty(item.quantityRemaining)} {item.unit}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[0.8rem] font-bold text-[#1E1E1E]">৳{item.stockValue.toFixed(0)}</p>
                          {item.quantityRemaining <= 0 && (
                            <span className="text-[0.65rem] font-bold text-[#ef4444]">Out of stock</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={cardClass}>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-[0.95rem] font-extrabold text-[#1E1E1E]">
                    <i className="fa-solid fa-boxes-packing mr-2 text-[#e21e53]" />
                    Finished Products
                  </h3>
                  <Link to="/finished-products" className="text-[0.78rem] font-bold text-[#e21e53] hover:underline">
                    View All
                  </Link>
                </div>
                {sortedProducts.length === 0 ? (
                  <p className="text-[0.8rem] text-[#545454]">No finished products yet.</p>
                ) : (
                  <div className="max-h-[340px] overflow-y-auto">
                    <table className="w-full text-left text-[0.82rem]">
                      <thead>
                        <tr className="border-b border-[#e8e8e8] text-[0.68rem] uppercase tracking-[0.05em] text-[#545454]">
                          <th className="py-2 pr-2 font-bold">Product</th>
                          <th className="py-2 pr-2 text-right font-bold">Stock</th>
                          <th className="py-2 pr-2 text-right font-bold">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedProducts.map((p) => {
                          const inStock = (p.stock || 0) > 0;
                          return (
                            <tr key={p.id} className="border-b border-[#f1f1f1] last:border-0">
                              <td className="py-2 pr-2">
                                <p className="font-bold text-[#1E1E1E]">{p.name}</p>
                                <p className="text-[0.68rem] text-[#545454]">{p.sku}</p>
                              </td>
                              <td className={`py-2 pr-2 text-right font-bold ${inStock ? 'text-[#1E1E1E]' : 'text-[#ef4444]'}`}>
                                {formatQty(p.stock)}
                              </td>
                              <td className="py-2 pr-2 text-right font-bold text-[#10b981]">
                                ৳{((p.stock || 0) * (p.costPrice || 0)).toFixed(0)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ══ OPERATING COSTS ══ */}
          <div className="flex flex-col gap-4">
            <SectionHeader icon="fa-money-bill-transfer" title="Operating Costs" subtitle="Factory overhead -- electricity, internet, meals & more" />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-4">
              <StatCard label="This Month's Maintenance Costs" value={monthMaintenanceTotal} icon="fa-money-bill-transfer" accent="rose" prefix="৳ " decimals={2} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
