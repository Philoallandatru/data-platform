import React from 'react';
import { PlusSquare } from 'lucide-react';

interface PlaceholderSlotProps {
  slotId: string;
  title: string;
  description: string;
  plannedWidgets?: string[];
  minHeight?: string;
}

/**
 * Reusable incremental extension placeholder card.
 * Replace this component with a real chart or data widget when expanding a page.
 */
export const PlaceholderSlot: React.FC<PlaceholderSlotProps> = ({
  slotId,
  title,
  description,
  plannedWidgets = [],
  minHeight = 'min-h-[190px]',
}) => {
  return (
    <div
      className={`rounded-2xl border-2 border-dashed border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-5 flex flex-col justify-between transition hover:border-[#FF6B2C]/50 ${minHeight}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[var(--bg-subtle-hover)] border border-[var(--border-card)] flex items-center justify-center text-[#FF6B2C]">
            <PlusSquare className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-display text-sm font-semibold text-[var(--text-primary)]">
              {title}
            </h4>
            <span className="font-mono-num text-[10px] text-[var(--text-muted)]">
              SLOT_ID: {slotId}
            </span>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-num font-semibold bg-[#FF6B2C]/10 text-[#FF6B2C] border border-[#FF6B2C]/25">
          EXTENSIBLE SLOT
        </span>
      </div>

      <p className="text-xs text-[var(--text-secondary)] my-3 leading-relaxed">
        {description}
      </p>

      {plannedWidgets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[var(--border-card)]">
          {plannedWidgets.map((w) => (
            <span
              key={w}
              className="px-2 py-0.5 rounded-md text-[10px] font-mono-num bg-[var(--bg-input)] border border-[var(--border-card)] text-[var(--text-muted)]"
            >
              + {w}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
