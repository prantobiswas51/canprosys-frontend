import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';


export default function Header() {
    const navigate = useNavigate();
    const { user, loading, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    console.log(user);

    const displayName = loading ? 'Loading...' : user?.name ?? 'Guest';
    const displayRole = loading ? '' :
        user?.role?.name === 'super_admin' ? 'Super Admin' :
            user?.role?.name === 'manager' ? 'Manager' : '';

    const initial = user?.name ? user.name.charAt(0).toUpperCase() : '?';

    return (
        <header className="sticky flex justify-center top-0 z-100 backdrop-blur-lg shadow-md bg-white dark:bg-[#161138] dark:shadow-black/30">
            <div className="max-w-7xl  w-full h-17.5 flex items-center justify-between gap-4 ">

                {/* Left: Brand */}
                <div className="flex  items-center gap-[0.85rem] shrink-0">
                    <div className="h-[2.8rem] flex items-center justify-center shrink-0">
                        <img src="/canvas-logo.png" alt="Logo" className="h-[2.4rem] w-auto object-contain dark:brightness-0 dark:invert" />
                    </div>
                    <div className="w-px h-[1.6rem] bg-[rgba(22,17,56,0.08)] dark:bg-white/10 mx-[0.1rem]" />
                    <div className="flex flex-col gap-[0.05rem]">
                        <h1 className="text-[1.2rem] font-black text-[#1E1E1E] dark:text-white tracking-[-0.025em] leading-[1.2] flex items-center">
                            <span className="font-extrabold text-[1.1rem] tracking-[0.02em] uppercase opacity-80">
                                Production House
                            </span>
                        </h1>
                        <p className="text-[0.72rem] text-[#545454] dark:text-white/50 font-semibold tracking-[0.01em]">
                            Real-time Stock &amp; Payroll Management System
                        </p>
                    </div>
                </div>

                {/* Center: Live badge + date */}
                <div className="flex items-center gap-4  justify-center">

                    <div className="py-2 flex items-center gap-[0.45rem] text-[#545454] dark:text-white/60 text-[0.8rem] font-bold bg-[rgba(22,17,56,0.04)] dark:bg-white/5 border border-[rgba(22,17,56,0.08)] dark:border-white/10 px-[0.85rem] rounded-full">
                        <i className="fa-regular fa-calendar-days text-[#e21e53]" />
                        <span>{new Date().toLocaleDateString('en-US', {
                            timeZone: 'Asia/Dhaka',
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                        })}</span>
                    </div>
                </div>

                {/* Right: Controls + User */}
                <div className="flex items-center gap-[0.65rem] shrink-0">
                    <button
                        className={`rounded-md py-1 bg-[rgba(22,17,56,0.04)] dark:bg-white/5 border border-[rgba(22,17,56,0.08)] dark:border-white/10 text-[#1E1E1E] dark:text-white/80 px-[0.85rem] hover:bg-[rgba(22,17,56,0.08)] dark:hover:bg-white/10 hover:-translate-y-[1.5px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:cursor-pointer`}
                        title="Switch language"
                    >
                        <i className="fa-solid fa-language" />
                        <span>EN</span>
                    </button>

                    {/* Light / Dark mode toggle */}
                    <button
                        onClick={toggleTheme}
                        className={`rounded-md py-1 bg-[rgba(22,17,56,0.04)] dark:bg-white/5 border border-[rgba(22,17,56,0.08)] dark:border-white/10 text-[#1E1E1E] dark:text-white/80 w-[38px] px-0 hover:bg-[rgba(22,17,56,0.08)] dark:hover:bg-white/10 hover:-translate-y-[1.5px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:cursor-pointer`}
                        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                        <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} />
                    </button>

                    <div className="hidden sm:flex items-center gap-[0.6rem] bg-[rgba(22,17,56,0.04)] dark:bg-white/5 border border-[rgba(22,17,56,0.08)] dark:border-white/10 rounded-full pl-[0.25rem] pr-4 py-[0.25rem] h-[38px] transition-all duration-200 ease-in-out hover:bg-[rgba(22,17,56,0.08)] dark:hover:bg-white/10">
                        <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-[#e21e53] to-[#7c3aed] flex items-center justify-center text-[0.8rem] font-black text-white shrink-0 shadow-[0_2px_6px_rgba(124,58,237,0.2)]">
                            {initial}
                        </div>
                        <div className="flex flex-col gap-[0.02rem]">
                            <span className="text-[0.8rem] font-extrabold text-[#1E1E1E] dark:text-white leading-[1.15]">{displayName}</span>
                            <span className="text-[0.65rem] text-[#545454] dark:text-white/50 font-bold opacity-80">{displayRole}</span>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className={`rounded-md py-1 font-bold bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] text-[#ef4444] px-[0.85rem] hover:-translate-y-[1.5px] hover:bg-[#ef4444] hover:border-[#ef4444] hover:text-white hover:shadow-[0_4px_12px_rgba(239,68,68,0.25)] hover:cursor-pointer`}
                        title="Logout"
                    >
                        <i className="fa-solid fa-right-from-bracket" />
                        <span>Logout</span>
                    </button>
                </div>
            </div>

        </header>
    );
}
