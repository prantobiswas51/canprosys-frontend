import { Outlet } from 'react-router-dom';

export default function GuestLayout() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 py-8 bg-[radial-gradient(circle_at_10%_20%,rgba(22,17,56,0.05)_0%,rgba(226,30,83,0.05)_90%)]">
      <Outlet />
    </div>
  );
}
