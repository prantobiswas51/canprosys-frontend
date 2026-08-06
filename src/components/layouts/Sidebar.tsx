import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navBtnBase =
  'relative w-full flex items-center gap-3 whitespace-nowrap rounded-xl px-[1.15rem] py-[0.85rem] text-[0.9rem] font-semibold cursor-pointer transition-all duration-200 ease-in-out shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]';

const navBtnInactive =
  'bg-white border border-[#e8e8e8] text-[#545454] hover:text-[#1E1E1E] hover:bg-[rgba(226,30,83,0.05)] hover:border-[rgba(226,30,83,0.25)] hover:translate-x-[3px] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]';

const navBtnActive =
  'bg-gradient-to-br from-[#e21e53] to-[#c01745] text-white border border-transparent shadow-[0_4px_12px_rgba(226,30,83,0.25)] hover:-translate-y-[2px]';

function NavIcon({ icon, active }: { icon: string; active?: boolean }) {
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-all duration-200 ${active ? 'bg-white/15 text-white' : 'bg-[rgba(226,30,83,0.08)] text-[#e21e53]'
        }`}
    >
      <i className={`fa-solid ${icon} text-[1.1rem]`} />
    </span>
  );
}

function ActivePip() {
  return (
    <span className="absolute right-3 h-[6px] w-[6px] rounded-full bg-white/70 shadow-[0_0_6px_rgba(255,255,255,0.5)] animate-[pip-pulse_2s_infinite]" />
  );
}

function BadgeCount({ count }: { count: number }) {
  return (
    <span className="absolute right-5 top-1/2 -translate-y-1/2 rounded-full bg-[#e21e53] px-[0.4rem] py-[0.1rem] text-[0.65rem] font-extrabold text-white shadow-[0_0_6px_rgba(226,30,83,0.4)]">
      {count}
    </span>
  );
}

interface NavItem {
  icon: string;
  label: string;
  path: string;
  badge?: number;
  superAdminOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Core',
    items: [
      { icon: 'fa-gauge-high', label: 'Dashboard', path: '/' },
      { icon: 'fa-list-check', label: 'Tasks', path: '/tasks' },
      { icon: 'fa-sliders', label: 'Recipes', path: '/recipes' },
      { icon: 'fa-pen-to-square', label: 'Daily Entry', path: '/daily-entry' },
      { icon: 'fa-clock-rotate-left', label: 'Activity Logs', path: '/activity-logs' },
    ],
  },
  {
    label: 'Stock',
    items: [
      { icon: 'fa-warehouse', label: 'Raw Materials Inventory', path: '/inventory' },
      { icon: 'fa-tree', label: 'Wood Processing', path: '/wood-processing' },
      { icon: 'fa-boxes-packing', label: 'Finished Products', path: '/finished-products' },
      { icon: 'fa-dumpster', label: 'Waste Management', path: '/waste-management' },
    ],
  },
  {
    label: 'Team',
    items: [
      { icon: 'fa-wallet', label: 'Payouts', path: '/payouts' },
      { icon: 'fa-hand-holding-dollar', label: 'Loans', path: '/loans' },
      { icon: 'fa-users-gear', label: 'Employee Dashboard', path: '/employee-dashboard' },
      { icon: 'fa-user-group', label: 'Employees', path: '/employees' },
    ],
  },
  {
    label: 'Settings & Admin',
    items: [
      { icon: 'fa-list-check', label: 'Role Management', path: '/manage-roles', superAdminOnly: true },
      { icon: 'fa-truck-fast', label: 'Shipment Basic', path: '/shipment-basic' },

      { icon: 'fa-truck', label: 'Transport Management', path: '/transport' },
      // { icon: 'fa-shield-halved', label: 'Approval Queue', path: '/approvals', badge: 3 },
      // { icon: 'fa-gears', label: 'System Settings', path: '/settings' },
      // { icon: 'fa-book-open', label: 'User Manual', path: '/user-manual' },
    ],
  },
];

export default function Sidebar() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role?.name === 'super_admin';

  return (
    <aside className="sticky top-[4.5rem] flex h-fit flex-col gap-[0.1rem] self-start">
      {navGroups.map((group) => {
        const visibleItems = group.items.filter((item) => !item.superAdminOnly || isSuperAdmin);
        if (visibleItems.length === 0) return null;

        return (
          <div key={group.label} className="flex flex-col gap-[0.15rem] mb-[0.4rem]">
            <span className="block px-[0.85rem] pb-[0.15rem] pt-[0.4rem] text-[0.6rem] font-extrabold uppercase tracking-[0.1em] text-[#545454] opacity-60">
              {group.label}
            </span>
            {visibleItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }: { isActive: boolean }) =>
                  `${navBtnBase} ${isActive ? navBtnActive : navBtnInactive}`
                }
              >
                {({ isActive }: { isActive: boolean }) => (
                  <>
                    <NavIcon icon={item.icon} active={isActive} />
                    <span>{item.label}</span>
                    {item.badge != null && <BadgeCount count={item.badge} />}
                    {isActive && <ActivePip />}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        );
      })}

      {/* Sidebar footer user card */}
      <div className="mt-4 flex items-center gap-[0.6rem] rounded-xl border border-[rgba(226,30,83,0.12)] bg-[rgba(226,30,83,0.04)] p-3">
        <div className="flex h-[2.1rem] w-[2.1rem] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#e21e53] to-[#7c3aed] text-[0.8rem] font-extrabold text-white">
          J
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[0.8rem] font-bold text-[#1E1E1E]">John Doe</span>
          <span className="text-[0.62rem] font-medium text-[#545454]">Super Admin</span>
        </div>
      </div>
    </aside>
  );
}
