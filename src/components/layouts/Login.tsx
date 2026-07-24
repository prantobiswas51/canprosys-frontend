import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

type TabId = 'super_admin' | 'manager' | 'artisan';

interface Tab {
  id: TabId;
  icon: string;
  label: string;
  color: string;
  badge: string;
}

const tabs: Tab[] = [
  { id: 'super_admin', icon: 'fa-crown', label: 'Super Admin', color: '#e21e53', badge: 'Full system access' },
  { id: 'manager', icon: 'fa-user-tie', label: 'Manager', color: '#7c3aed', badge: 'Factory management access' },
  { id: 'artisan', icon: 'fa-hammer', label: 'Artisan / Staff', color: '#0ea5e9', badge: 'Own profile access only' },
];

const staffOptions = [
  'John Doe — Artisan',
  'Jane Smith — Machine Operator',
  'Sam Wilson — Packer',
];

const inputWrapIconClass = 'absolute left-4 text-[#545454] opacity-60 text-[0.9rem]';

const fieldInputClass =
  'w-full pl-10 pr-10 py-[0.65rem] bg-white border border-[#e8e8e8] text-[#1E1E1E] rounded-lg text-[0.875rem] font-medium transition-all duration-200 outline-none focus:border-[#e21e53] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] disabled:opacity-60 disabled:cursor-not-allowed';

const API_URL = import.meta.env.VITE_API_URL;

export default function Login() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [activeTabId, setActiveTabId] = useState<TabId>('super_admin');
  const [showPass, setShowPass] = useState(false);

  // Super Admin form
  const [saUsername, setSaUsername] = useState('');
  const [saPassword, setSaPassword] = useState('');

  // Manager form
  const [mgUsername, setMgUsername] = useState('');
  const [mgPassword, setMgPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) as Tab;

  const doLogin = async (username: string, password: string) => {
    setError(null);
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/login`, { username, password });
      await refresh(); // populate AuthContext before RequireAuth checks it on the redirect
      navigate('/');
    } catch (err) {
      setError(
        axios.isAxiosError(err) && err.response?.status === 401
          ? 'Invalid username or password.'
          : 'Could not reach the server. Check the console.'
      );
      console.error('Login failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuperAdminSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    doLogin(saUsername, saPassword);
  };

  const handleManagerSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    doLogin(mgUsername, mgPassword);
  };

  return (
    <>
      {/* Decorative blobs */}
      <div className="absolute rounded-full blur-[80px] z-0 pointer-events-none top-[-10%] left-[-10%] w-[35vw] h-[35vw] bg-[rgba(226,30,83,0.07)]" />
      <div className="absolute rounded-full blur-[80px] z-0 pointer-events-none bottom-[-10%] right-[-10%] w-[35vw] h-[35vw] bg-[rgba(22,17,56,0.07)]" />
      <div className="absolute rounded-full blur-[80px] z-0 pointer-events-none top-[40%] left-[45%] w-[25vw] h-[25vw] bg-[rgba(124,58,237,0.05)]" />

      <div className="relative z-[1] w-full max-w-[440px] bg-white border border-[#e8e8e8] rounded-2xl px-8 py-10 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] animate-[fade-in-up_0.5s_cubic-bezier(0.16,1,0.3,1)_both]">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 px-4 bg-[rgba(22,17,56,0.04)] border border-[rgba(22,17,56,0.08)] rounded-2xl mb-5 transition-all duration-200">
            <img src="/canvas-logo.png" alt="Logo" className="h-[2.4rem] w-auto object-contain" />
          </div>
          <p className="text-[0.8rem] text-[#545454] font-medium">Production &amp; Stock Management System</p>
        </div>

        {/* Role tabs */}
        <div className="flex bg-[rgba(22,17,56,0.03)] border border-[#e8e8e8] p-1 rounded-xl mb-6">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTabId(tab.id);
                  setError(null);
                }}
                className={`flex-1 border-none bg-transparent text-[0.75rem] font-bold py-[0.6rem] px-2 rounded-lg flex flex-col items-center gap-1 transition-all duration-200 cursor-pointer ${
                  isActive ? 'bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]' : 'text-[#545454] hover:text-[#1E1E1E]'
                }`}
                style={isActive ? { color: tab.color } : undefined}
              >
                <i className={`fa-solid ${tab.icon}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Role badge */}
        <div className="flex items-center gap-2 bg-[rgba(22,17,56,0.03)] border border-[#e8e8e8] px-3 py-2 rounded-lg text-[0.72rem] font-semibold text-[#545454] mb-6">
          <i className={`fa-solid ${activeTab.icon}`} style={{ color: activeTab.color }} />
          <span>{activeTab.badge}</span>
        </div>

        {/* Super Admin form */}
        {activeTabId === 'super_admin' && (
          <form className="flex flex-col gap-5" onSubmit={handleSuperAdminSubmit}>
            <div className="flex flex-col gap-[0.4rem]">
              <label className="text-[0.75rem] font-bold text-[#545454]">Username</label>
              <div className="relative flex items-center">
                <i className={`fa-solid fa-user-shield ${inputWrapIconClass}`} />
                <input
                  type="text"
                  placeholder="superadmin"
                  value={saUsername}
                  onChange={(e) => setSaUsername(e.target.value)}
                  required
                  autoFocus
                  disabled={submitting}
                  className={fieldInputClass}
                />
              </div>
            </div>
            <div className="flex flex-col gap-[0.4rem]">
              <label className="text-[0.75rem] font-bold text-[#545454]">Password</label>
              <div className="relative flex items-center">
                <i className={`fa-solid fa-lock ${inputWrapIconClass}`} />
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={saPassword}
                  onChange={(e) => setSaPassword(e.target.value)}
                  required
                  disabled={submitting}
                  className={fieldInputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-3 bg-transparent border-none text-[#545454] cursor-pointer text-[0.85rem] p-1 flex items-center justify-center hover:text-[#1E1E1E]"
                >
                  <i className={`fa-solid ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
            </div>

            {error && <p className="text-[0.75rem] font-semibold text-[#ef4444]">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="border-none text-white text-[0.85rem] font-bold py-[0.85rem] rounded-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(0,0,0,0.15)] hover:brightness-110 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
              style={{ background: activeTab.color }}
            >
              <i className={`fa-solid ${submitting ? 'fa-spinner fa-spin' : 'fa-arrow-right-to-bracket'}`} />
              {submitting ? 'Signing in...' : 'Enter Super Admin Portal'}
            </button>
          </form>
        )}

        {/* Manager form */}
        {activeTabId === 'manager' && (
          <form className="flex flex-col gap-5" onSubmit={handleManagerSubmit}>
            <div className="flex flex-col gap-[0.4rem]">
              <label className="text-[0.75rem] font-bold text-[#545454]">Manager Username</label>
              <div className="relative flex items-center">
                <i className={`fa-solid fa-user-tie ${inputWrapIconClass}`} />
                <input
                  type="text"
                  placeholder="manager"
                  value={mgUsername}
                  onChange={(e) => setMgUsername(e.target.value)}
                  required
                  autoFocus
                  disabled={submitting}
                  className={fieldInputClass}
                />
              </div>
            </div>
            <div className="flex flex-col gap-[0.4rem]">
              <label className="text-[0.75rem] font-bold text-[#545454]">Password</label>
              <div className="relative flex items-center">
                <i className={`fa-solid fa-lock ${inputWrapIconClass}`} />
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={mgPassword}
                  onChange={(e) => setMgPassword(e.target.value)}
                  required
                  disabled={submitting}
                  className={fieldInputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-3 bg-transparent border-none text-[#545454] cursor-pointer text-[0.85rem] p-1 flex items-center justify-center hover:text-[#1E1E1E]"
                >
                  <i className={`fa-solid ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
            </div>

            {error && <p className="text-[0.75rem] font-semibold text-[#ef4444]">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="border-none text-white text-[0.85rem] font-bold py-[0.85rem] rounded-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(0,0,0,0.15)] hover:brightness-110 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
              style={{ background: activeTab.color }}
            >
              <i className={`fa-solid ${submitting ? 'fa-spinner fa-spin' : 'fa-arrow-right-to-bracket'}`} />
              {submitting ? 'Signing in...' : 'Enter Manager Portal'}
            </button>
          </form>
        )}

        {/* Artisan form - visual only, no PIN-based backend endpoint yet */}
        {activeTabId === 'artisan' && (
          <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-col gap-[0.4rem]">
              <label className="text-[0.75rem] font-bold text-[#545454]">Select Your Profile</label>
              <div className="relative flex items-center">
                <i className={`fa-solid fa-person-digging ${inputWrapIconClass}`} />
                <select required className={fieldInputClass}>
                  <option value="">Select your name...</option>
                  {staffOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-[0.4rem]">
              <label className="text-[0.75rem] font-bold text-[#545454]">PIN / Passcode</label>
              <div className="relative flex items-center">
                <i className={`fa-solid fa-hashtag ${inputWrapIconClass}`} />
                <input
                  type="password"
                  placeholder="••••"
                  maxLength={8}
                  required
                  className={`${fieldInputClass} tracking-[0.4em] text-center`}
                />
              </div>
              <p className="text-[0.68rem] text-[#545454] opacity-80">Not wired up yet — no PIN-based endpoint on the backend.</p>
            </div>
            <button
              type="submit"
              className="border-none text-white text-[0.85rem] font-bold py-[0.85rem] rounded-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(0,0,0,0.15)] hover:brightness-110 active:translate-y-0"
              style={{ background: activeTab.color }}
            >
              <i className="fa-solid fa-arrow-right-to-bracket" />
              Enter My Dashboard
            </button>
          </form>
        )}

        {/* Footer */}
        <p className="text-center mt-8 text-[0.68rem] text-[#545454] opacity-70">
          © 2026 CanProSys Ltd.
        </p>
      </div>
    </>
  );
}
