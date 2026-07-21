const quickLinks = [
  { icon: 'fa-gauge-high', label: 'Dashboard Overview' },
  { icon: 'fa-pen-to-square', label: 'Daily Entry Forms' },
  { icon: 'fa-warehouse', label: 'Raw Material Inventory' },
  { icon: 'fa-wallet', label: 'Salary & Wages Sheet' },
];

const systemInfo = [
  { label: 'Version', value: 'v1.0.0' },
  { label: 'User', value: 'John Doe' },
  { label: 'Role', value: 'Super Admin' },
  { label: 'Language', value: 'English' },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden mt-auto bg-[#161138] text-[rgba(255,255,255,0.5)] border-t border-[rgba(255,255,255,0.06)] before:content-[''] before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_at_bottom_left,rgba(226,30,83,0.06)_0%,transparent_65%)] before:pointer-events-none">
      {/* 3-column inner */}
      <div className="relative max-w-7xl mx-auto px-8 pt-8 pb-6 grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_1fr] gap-8">
        {/* Brand col */}
        <div className="flex flex-col gap-[0.8rem]">
          <div className="flex items-center gap-[0.6rem]">
            <div className="h-[2.4rem] flex items-center">
              <img
                src="/canvas-logo.png"
                alt="Logo"
                className="h-[2.2rem] w-auto object-contain [filter:brightness(0)_invert(1)]"
              />
            </div>
            <div className="w-px h-[1.2rem] bg-[rgba(255,255,255,0.1)]" />
            <span className="text-[0.9rem] font-extrabold text-[rgba(255,255,255,0.8)] tracking-[0.02em] uppercase">
              Production
            </span>
          </div>
          <p className="text-[0.75rem] text-[rgba(255,255,255,0.38)] leading-[1.6] max-w-[28ch]">
            Real-time stock &amp; piece-rate payroll management system
          </p>
          <div className="flex items-center gap-[0.4rem] mt-1">
            <span className="w-[6px] h-[6px] bg-[#10b981] rounded-full shrink-0 animate-[blink-dot_2s_infinite]" />
            <span className="text-[0.7rem] font-semibold text-[#34d399] tracking-[0.03em]">
              System Online
            </span>
          </div>
        </div>

        {/* Quick links col */}
        <div className="flex flex-col gap-3">
          <h4 className="text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-[rgba(255,255,255,0.35)] pb-[0.4rem] border-b border-[rgba(255,255,255,0.06)]">
            Quick Nav
          </h4>
          <ul className="flex flex-col gap-[0.2rem]">
            {quickLinks.map((item) => (
              <li key={item.label}>
                <button className="w-full flex items-center gap-2 text-left py-[0.3rem] text-[0.8rem] text-[rgba(255,255,255,0.48)] transition-colors duration-200 hover:text-[rgba(255,255,255,0.85)]">
                  <i className={`fa-solid ${item.icon} text-[0.7rem] w-4 text-center text-[rgba(226,30,83,0.5)]`} />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* System info col */}
        <div className="flex flex-col gap-3">
          <h4 className="text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-[rgba(255,255,255,0.35)] pb-[0.4rem] border-b border-[rgba(255,255,255,0.06)]">
            System Info
          </h4>
          <ul className="flex flex-col gap-[0.45rem]">
            {systemInfo.map((row) => (
              <li key={row.label} className="flex items-center justify-between gap-4">
                <span className="text-[0.72rem] text-[rgba(255,255,255,0.35)]">{row.label}</span>
                <span className="text-[0.72rem] font-bold text-[rgba(255,255,255,0.7)]">{row.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative max-w-[1400px] mx-auto px-8 py-[0.85rem] border-t border-[rgba(255,255,255,0.06)] flex flex-wrap items-center justify-center gap-3 text-[0.72rem] text-[rgba(255,255,255,0.3)]">
        <span>&copy; 2026 CanProSys. All rights reserved.</span>
        <span className="w-[3px] h-[3px] rounded-full bg-[rgba(255,255,255,0.2)]" />
        <span>Built with React &amp; Tailwind CSS</span>
      </div>
    </footer>
  );
}
