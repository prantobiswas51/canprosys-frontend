export default function Header() {
 
    return (
        <header className="sticky flex justify-center top-0 z-100 border-b backdrop-blur-lg shadow-md">            
            <div className="max-w-7xl  w-full h-17.5 flex items-center justify-between gap-4 ">
                
                {/* Left: Brand */}
                <div className="flex  items-center gap-[0.85rem] shrink-0">
                    <div className="h-[2.8rem] flex items-center justify-center shrink-0">
                        <img src="/canvas-logo.png" alt="Logo" className="h-[2.4rem] w-auto object-contain" />
                    </div>
                    <div className="w-px h-[1.6rem] bg-[rgba(22,17,56,0.08)] mx-[0.1rem]" />
                    <div className="flex flex-col gap-[0.05rem]">
                        <h1 className="text-[1.2rem] font-black text-[#1E1E1E] tracking-[-0.025em] leading-[1.2] flex items-center">
                            <span className="font-extrabold text-[1.1rem] tracking-[0.02em] uppercase opacity-80">
                                Production
                            </span>
                        </h1>
                        <p className="text-[0.72rem] text-[#545454] font-semibold tracking-[0.01em]">
                            Real-time Stock &amp; Payroll Management System
                        </p>
                    </div>
                </div>

                {/* Center: Live badge + date */}
                <div className="flex items-center gap-4  justify-center">
                    
                    <div className="py-2 flex items-center gap-[0.4rem] bg-[rgba(16,185,129,0.08)] text-[#10b981] border-[1.5px] border-[rgba(16,185,129,0.18)] rounded-full px-[0.85rem] text-[0.75rem] font-extrabold tracking-[0.03em] shadow-[0_2px_8px_rgba(16,185,129,0.04)]">
                        <span className="w-[7px] h-[7px] bg-[#10b981] rounded-full shrink-0 animate-[pulse-live_2s_infinite_cubic-bezier(0.4,0,0.6,1)]" />
                        <span className="">Online</span>
                    </div>

                    <div className="py-2 flex items-center gap-[0.45rem] text-[#545454] text-[0.8rem] font-bold bg-[rgba(22,17,56,0.04)] border border-[rgba(22,17,56,0.08)] px-[0.85rem] rounded-full">
                        <i className="fa-regular fa-calendar-days text-[#e21e53]" />
                        <span>Tuesday, July 21, 2026</span>
                    </div>
                </div>

                {/* Right: Controls + User */}
                <div className="flex items-center gap-[0.65rem] shrink-0">
                    <button
                        className={`rounded-md py-1 bg-[rgba(22,17,56,0.04)] border border-[rgba(22,17,56,0.08)] text-[#1E1E1E] px-[0.85rem] hover:bg-[rgba(22,17,56,0.08)] hover:-translate-y-[1.5px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:cursor-pointer`}
                        title="Switch language"
                    >
                        <i className="fa-solid fa-language" />
                        <span>EN</span>
                    </button>

                    {/* Light Dark Mode */}
                    <button
                        className={`rounded-md py-1 bg-[rgba(22,17,56,0.04)] border border-[rgba(22,17,56,0.08)] text-[#1E1E1E] w-[38px] px-0 hover:bg-[rgba(22,17,56,0.08)] hover:-translate-y-[1.5px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:cursor-pointer`}
                        title="Toggle theme"
                    >
                        <i className="fa-solid fa-moon" />
                    </button>

                    <div className="hidden sm:flex items-center gap-[0.6rem] bg-[rgba(22,17,56,0.04)] border border-[rgba(22,17,56,0.08)] rounded-full pl-[0.25rem] pr-4 py-[0.25rem] h-[38px] transition-all duration-200 ease-in-out hover:bg-[rgba(22,17,56,0.08)]">
                        <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-[#e21e53] to-[#7c3aed] flex items-center justify-center text-[0.8rem] font-black text-white shrink-0 shadow-[0_2px_6px_rgba(124,58,237,0.2)]">
                            J
                        </div>
                        <div className="flex flex-col gap-[0.02rem]">
                            <span className="text-[0.8rem] font-extrabold text-[#1E1E1E] leading-[1.15]">John Doe</span>
                            <span className="text-[0.65rem] text-[#545454] font-bold opacity-80">Super Admin</span>
                        </div>
                    </div>
                    <button
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
