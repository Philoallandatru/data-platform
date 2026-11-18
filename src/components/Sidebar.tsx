import React, { useState } from 'react';
import { SSDModel } from '../types/ssd';
import {
  CUSTOM_PAGES,
  ModuleKey,
  PERFORMANCE_SUITES,
  POWER_SUITES,
} from '../config/navigation';
import {
  ChevronDown,
  ChevronRight,
  FilePlus2,
  Gauge,
  HardDrive,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Zap,
} from 'lucide-react';

interface SidebarProps {
  models: SSDModel[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  activeModule: ModuleKey;
  activeSubPageId: string;
  onNavigate: (module: ModuleKey, subPageId: string, defaultTestId?: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  models,
  selectedModelId,
  onSelectModel,
  activeModule,
  activeSubPageId,
  onNavigate,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [openPerf, setOpenPerf] = useState(true);
  const [openPower, setOpenPower] = useState(true);
  const [openCustom, setOpenCustom] = useState(true);

  return (
    <aside
      className={`shrink-0 border-r border-[var(--border-card)] bg-[var(--bg-header)] backdrop-blur-xl flex flex-col justify-between transition-all duration-300 ${
        collapsed ? 'w-[70px]' : 'w-[272px]'
      }`}
    >
      <div className="p-3.5 space-y-5 overflow-y-auto">
        {/* Collapse Header */}
        <div className="flex items-center justify-between">
          {!collapsed && (
            <span className="text-[11px] font-mono-num uppercase tracking-wider text-[var(--text-muted)]">
              Product & Suite Tree
            </span>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer ml-auto"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* 1. Product Switcher */}
        <div>
          {!collapsed && (
            <div className="text-[10px] font-mono-num uppercase tracking-wider text-[var(--text-muted)] mb-2 px-1">
              SSD Products ({models.length})
            </div>
          )}
          <div className="space-y-1">
            {models.map((m) => {
              const active = m.id === selectedModelId;
              return (
                <button
                  key={m.id}
                  onClick={() => onSelectModel(m.id)}
                  title={m.name}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs transition cursor-pointer border ${
                    active
                      ? 'bg-[#FF6B2C]/12 border-[#FF6B2C]/45 text-[var(--text-primary)] font-semibold shadow-sm'
                      : 'bg-transparent border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <HardDrive
                    className={`w-4 h-4 shrink-0 ${active ? 'text-[#FF6B2C]' : 'text-[var(--text-muted)]'}`}
                  />
                  {!collapsed && (
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{m.name}</div>
                      <div className="text-[10px] font-mono-num text-[var(--text-muted)] truncate">
                        {m.controller} • {m.capacity_tb}TB
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Modules under Selected Product */}
        {!collapsed && (
          <div className="space-y-3 pt-2 border-t border-[var(--border-card)]">
            {/* Performance Module */}
            <div>
              <button
                onClick={() => setOpenPerf((v) => !v)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-[#00B4D8]" />
                  性能模块 (Performance)
                </span>
                {openPerf ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>

              {openPerf && (
                <div className="mt-1 ml-3 pl-3 border-l border-[var(--border-card)] space-y-1">
                  {PERFORMANCE_SUITES.map((s) => {
                    const isActive = activeModule === 'performance' && activeSubPageId === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => onNavigate('performance', s.id, s.defaultTestId)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                          isActive
                            ? 'bg-[#00B4D8]/15 text-[#00B4D8] font-semibold'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                        }`}
                      >
                        <span className="truncate">{s.shortLabel}</span>
                        {s.badge && (
                          <span className="text-[9px] font-mono-num px-1.5 py-0.2 rounded bg-[var(--bg-subtle-hover)] text-[var(--text-muted)]">
                            {s.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Power Module */}
            <div>
              <button
                onClick={() => setOpenPower((v) => !v)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#A855F7]" />
                  功耗模块 (Power)
                </span>
                {openPower ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>

              {openPower && (
                <div className="mt-1 ml-3 pl-3 border-l border-[var(--border-card)] space-y-1">
                  {POWER_SUITES.map((s) => {
                    const isActive = activeModule === 'power' && activeSubPageId === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => onNavigate('power', s.id, s.defaultTestId)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                          isActive
                            ? 'bg-[#A855F7]/15 text-[#A855F7] font-semibold'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                        }`}
                      >
                        <span className="truncate">{s.shortLabel}</span>
                        {s.badge && (
                          <span className="text-[9px] font-mono-num px-1.5 py-0.2 rounded bg-[var(--bg-subtle-hover)] text-[var(--text-muted)]">
                            {s.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Custom Blank Placeholder Pages */}
        {!collapsed && (
          <div className="pt-2 border-t border-[var(--border-card)]">
            <button
              onClick={() => setOpenCustom((v) => !v)}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <FilePlus2 className="w-4 h-4 text-[#FF6B2C]" />
                自定义空白页 (Custom)
              </span>
              {openCustom ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>

            {openCustom && (
              <div className="mt-1 ml-3 pl-3 border-l border-[var(--border-card)] space-y-1">
                {CUSTOM_PAGES.map((cp) => {
                  const isActive = activeModule === 'custom' && activeSubPageId === cp.id;
                  return (
                    <button
                      key={cp.id}
                      onClick={() => onNavigate('custom', cp.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                        isActive
                          ? 'bg-[#FF6B2C]/15 text-[#FF6B2C] font-semibold'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                      }`}
                    >
                      <span className="truncate">{cp.label}</span>
                      <span className="text-[9px] font-mono-num px-1.5 py-0.2 rounded bg-[var(--bg-subtle-hover)] text-[var(--text-muted)]">
                        {cp.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 4. All-in-One Visualization Showcase */}
        <div className="pt-2 border-t border-[var(--border-card)]">
          <button
            onClick={() => onNavigate('showcase', 'gallery')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
              activeModule === 'showcase'
                ? 'bg-gradient-to-r from-[#FF6B2C]/20 to-[#A855F7]/20 border-[#FF6B2C]/40 text-[var(--text-primary)]'
                : 'bg-[var(--bg-subtle)] border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <LayoutGrid className="w-4 h-4 text-[#FF6B2C] shrink-0" />
            {!collapsed && <span>可视化样板库 (Viz Gallery)</span>}
          </button>
        </div>
      </div>

      {/* Bottom Extensibility Hint */}
      {!collapsed && (
        <div className="p-3.5 border-t border-[var(--border-card)]">
          <div className="rounded-xl border border-dashed border-[var(--border-subtle)] p-2.5 text-[11px] text-[var(--text-muted)] flex items-center gap-2">
            <Plus className="w-3.5 h-3.5 text-[#FF6B2C] shrink-0" />
            <span>
              Edit <code className="text-[var(--text-primary)]">src/config/navigation.ts</code> to add products or suites
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};
