import React, { useState } from 'react';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';

export interface TabItem {
  id: string;
  title: string;
}

interface PanelTabsBarProps {
  label?: string;
  items: TabItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  addLabel?: string;
  maxItems?: number;
  accentColor?: string;
}

export const PanelTabsBar: React.FC<PanelTabsBarProps> = ({
  label,
  items,
  activeId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
  addLabel = '新建 Panel',
  maxItems = 6,
  accentColor = '#00B4D8',
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  const startEdit = (item: TabItem) => {
    setEditingId(item.id);
    setDraftTitle(item.title);
  };

  const commitEdit = () => {
    if (editingId && draftTitle.trim()) {
      onRename(editingId, draftTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {label && (
        <span className="text-[11px] font-mono-num uppercase tracking-wider text-[var(--text-muted)] mr-1">
          {label}
        </span>
      )}

      {items.map((item) => {
        const isActive = item.id === activeId;
        const isEditing = editingId === item.id;

        return (
          <div
            key={item.id}
            className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition ${
              isActive
                ? 'bg-[var(--bg-input)] text-[var(--text-primary)] font-semibold shadow-sm'
                : 'bg-[var(--bg-subtle)] border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            style={isActive ? { borderColor: accentColor } : undefined}
          >
            {isEditing ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  autoFocus
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="w-28 bg-transparent text-xs text-[var(--text-primary)] focus:outline-none border-b border-[#FF6B2C]"
                />
                <button
                  type="button"
                  onClick={commitEdit}
                  className="text-emerald-500 cursor-pointer"
                  title="Save name"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  onDoubleClick={() => startEdit(item)}
                  className="cursor-pointer truncate max-w-[160px]"
                  title="Click to switch, double-click to rename"
                >
                  {item.title}
                </button>
                {isActive && (
                  <div className="flex items-center gap-1 ml-1">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                      title="Rename"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        className="text-[var(--text-muted)] hover:text-[#FF4D2E] cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {items.length < maxItems && (
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-dashed border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[#FF6B2C]/60 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-[#FF6B2C]" />
          {addLabel}
        </button>
      )}
    </div>
  );
};
