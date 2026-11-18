import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  dotColor?: string;
}

interface CustomSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  placeholder?: string;
  searchable?: boolean;
  align?: 'left' | 'right';
  className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  options,
  onChange,
  icon,
  placeholder = 'Select...',
  searchable = false,
  align = 'right',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const filtered = query.trim()
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          o.sublabel?.toLowerCase().includes(query.toLowerCase()) ||
          o.badge?.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setQuery('');
        }}
        className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-input)] border transition cursor-pointer text-xs ${
          open
            ? 'border-[#FF6B2C] ring-2 ring-[#FF6B2C]/20 text-[var(--text-primary)]'
            : 'border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[#FF6B2C]/50'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="shrink-0 text-[#00B4D8]">{icon}</span>}
          {selected?.dotColor && (
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: selected.dotColor }}
            />
          )}
          <span className="font-medium truncate">{selected?.label ?? placeholder}</span>
          {selected?.badge && (
            <span className="hidden md:inline-block px-1.5 py-0.5 rounded-md text-[10px] font-mono-num bg-[var(--bg-subtle-hover)] text-[var(--text-secondary)]">
              {selected.badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180 text-[#FF6B2C]' : ''
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute top-full mt-2 z-50 w-72 rounded-2xl bg-[var(--bg-tooltip)] border border-[var(--border-subtle)] shadow-2xl backdrop-blur-xl p-2 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {searchable && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 mb-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-card)]">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
              />
            </div>
          )}

          <div className="max-h-64 overflow-y-auto space-y-1 pr-0.5">
            {filtered.length === 0 ? (
              <div className="py-4 text-center text-xs text-[var(--text-muted)]">
                No matches
              </div>
            ) : (
              filtered.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#FF6B2C]/14 text-[var(--text-primary)]'
                        : 'hover:bg-[var(--bg-subtle-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {opt.dotColor && (
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: opt.dotColor }}
                        />
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                          {opt.label}
                        </div>
                        {opt.sublabel && (
                          <div className="text-[10px] font-mono-num text-[var(--text-muted)] truncate">
                            {opt.sublabel}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {opt.badge && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono-num bg-[var(--bg-subtle)] border border-[var(--border-card)] text-[var(--text-secondary)]">
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#FF6B2C]" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
