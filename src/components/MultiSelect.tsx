import { useState, useRef, useEffect } from 'react';
import type { MouseEvent } from 'react';

interface MultiSelectOption {
  id: number;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function MultiSelect({
  options,
  selectedIds,
  onChange,
  placeholder = 'Select...',
  disabled,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: globalThis.MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOptions = options.filter((opt) => selectedIds.includes(opt.id));

  const toggleOption = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const removeOption = (id: number, e: MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter((sid) => sid !== id));
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={`w-full min-h-[2.7rem] flex flex-wrap items-center gap-1.5 bg-white border border-[#e8e8e8] text-[#1E1E1E] px-[0.65rem] py-[0.35rem] rounded-lg text-[0.875rem] font-medium transition-all duration-200 outline-none disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${
          open ? 'border-[#e21e53] shadow-[0_0_0_3px_rgba(16,185,129,0.15)]' : ''
        }`}
      >
        {selectedOptions.length === 0 && (
          <span className="text-[#545454] opacity-70 py-[0.25rem]">{placeholder}</span>
        )}
        {selectedOptions.map((opt) => (
          <span
            key={opt.id}
            className="flex items-center gap-1 rounded-md bg-[rgba(226,30,83,0.08)] text-[#e21e53] text-[0.75rem] font-bold px-2 py-[0.2rem]"
          >
            {opt.label}
            <i
              className="fa-solid fa-xmark text-[0.65rem] cursor-pointer hover:opacity-70"
              onClick={(e) => removeOption(opt.id, e)}
            />
          </span>
        ))}
        <i
          className={`fa-solid fa-chevron-down ml-auto text-[0.7rem] text-[#545454] transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-[220px] overflow-y-auto rounded-lg border border-[#e8e8e8] bg-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)]">
          {options.length === 0 && (
            <p className="px-3 py-2 text-[0.8rem] text-[#545454]">No options available.</p>
          )}
          {options.map((opt) => {
            const checked = selectedIds.includes(opt.id);
            return (
              <label
                key={opt.id}
                className="flex items-center gap-2 px-3 py-2 text-[0.85rem] text-[#1E1E1E] cursor-pointer hover:bg-[#f8fafc] transition-colors duration-150"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleOption(opt.id)}
                  className="h-4 w-4 accent-[#e21e53] cursor-pointer"
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
