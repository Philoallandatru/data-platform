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
  Home,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  User,
  Zap,
} from 'lucide-react';

interface SidebarProps {
  models: SSDModel[];
  selectedModelId: string;
  activeModule: ModuleKey;
  activeSubPageId: string;
  onNavigate: (
    module: ModuleKey,
    subPageId: string,
    modelId?: string,
    defaultTestId?: string
  ) => void;
  userRole?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  models,
  selectedModelId,
  activeModule,
  activeSubPageId,
  onNavigate,
  userRole = 'viewer',
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>(() => ({
    [selectedModelId || 'x900-2tb']: true,
  }));
  const [openCustom, setOpenCustom] = useState(true);

  const toggleModelExpand = (modelId: string) => {
    setExpandedModels((prev) => ({ ...prev, [modelId]: !prev[modelId] }));
  };

  return (
    <aside
      className={`shrink-0 border-r border-[var(--border-card)] bg-[var(--bg-header)] backdrop-blur-xl flex flex-col justify-between transition-all duration-300 ${
        collapsed ? 'w-[70px]' : 'w-[280px]'
      }`}
    >
      <div className="p-3.5 space-y-4 overflow-y-auto">
        {/* Collapse Header */}
        <div className="flex items-center justify-between">
          {!collapsed && (
            <span className="text-[11px] font-mono-num uppercase tracking-wider text-[var(--text-muted)]">
              Navigation Router
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

        {/* 1. Home Entry (/) */}
        <div>
          <button
            onClick={() => onNavigate('home', 'overview')}
            title="主页 (Home)"
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
              activeModule === 'home'
                ? 'bg-[#FF6B2C]/15 border-[#FF6B2C]/50 text-[#FF6B2C] shadow-sm'
                : 'bg-[var(--bg-subtle)] border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Home className="w-4 h-4 shrink-0 text-[#FF6B2C]" />
            {!collapsed && (
              <div className="flex items-center justify-between flex-1">
                <span>主页总览 (Home)</span>
                <span className="font-mono-num text-[10px] text-[var(--text-muted)]">/</span>
              </div>
            )}
          </button>
        </div>

        {/* 2. Hierarchical Tree: Product A, B, C -> Sub-items a1..a7, b1..b7 */}
        <div className="pt-2 border-t border-[var(--border-card)] space-y-1.5">
          {!collapsed && (
            <div className="text-[10px] font-mono-num uppercase tracking-wider text-[var(--text-muted)] px-1 mb-1">
              Products & Sub-Routes (A / B / C)
            </div>
          )}

          {models.map((m, idx) => {
            const prefix = String.fromCharCode(65 + idx); // A, B, C
            const subPrefix = prefix.toLowerCase(); // a, b, c
            const isModelActive =
              (activeModule === 'performance' || activeModule === 'power') &&
              m.id === selectedModelId;
            const isOpen = expandedModels[m.id] ?? m.id === selectedModelId;

            return (
              <div key={m.id} className="space-y-1">
                <button
                  onClick={() => {
                    if (collapsed) {
                      onNavigate('performance', 'cdmark', m.id, 'SEQ_128K_Q32_R');
                    } else {
                      toggleModelExpand(m.id);
                    }
                  }}
                  title={`${prefix}. ${m.name}`}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left text-xs transition cursor-pointer border ${
                    isModelActive
                      ? 'bg-[#FF6B2C]/10 border-[#FF6B2C]/40 text-[var(--text-primary)] font-semibold'
                      : 'bg-transparent border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-num font-bold bg-[#FF6B2C]/15 text-[#FF6B2C] shrink-0">
                      {prefix}
                    </span>
                    {!collapsed && <span className="truncate">{m.name}</span>}
                  </div>
                  {!collapsed && (
                    isOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    )
                  )}
                </button>

                {!collapsed && isOpen && (
                  <div className="ml-3 pl-3 border-l border-[var(--border-card)] space-y-2 py-1">
                    {/* Performance Sub-group (a1..a4) */}
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono-num uppercase text-[#00B4D8]">
                        <Gauge className="w-3 h-3" /> 性能 (Performance)
                      </div>
                      {PERFORMANCE_SUITES.map((s, si) => {
                        const isSubActive =
                          isModelActive &&
                          activeModule === 'performance' &&
                          activeSubPageId === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() =>
                              onNavigate('performance', s.id, m.id, s.defaultTestId)
                            }
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                              isSubActive
                                ? 'bg-[#00B4D8]/15 text-[#00B4D8] font-semibold'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                            }`}
                          >
                            <span className="truncate">
                              <span className="font-mono-num opacity-75 mr-1.5">
                                {subPrefix}{si + 1}.
                              </span>
                              {s.shortLabel}
                            </span>
                            {s.badge && (
                              <span className="text-[9px] font-mono-num px-1.5 py-0.2 rounded bg-[var(--bg-subtle-hover)] text-[var(--text-muted)]">
                                {s.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Power Sub-group (a5..a7) */}
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono-num uppercase text-[#A855F7]">
                        <Zap className="w-3 h-3" /> 功耗 (Power)
                      </div>
                      {POWER_SUITES.map((s, si) => {
                        const isSubActive =
                          isModelActive &&
                          activeModule === 'power' &&
                          activeSubPageId === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() =>
                              onNavigate('power', s.id, m.id, s.defaultTestId)
                            }
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                              isSubActive
                                ? 'bg-[#A855F7]/15 text-[#A855F7] font-semibold'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                            }`}
                          >
                            <span className="truncate">
                              <span className="font-mono-num opacity-75 mr-1.5">
                                {subPrefix}{si + 5}.
                              </span>
                              {s.shortLabel}
                            </span>
                            {s.badge && (
                              <span className="text-[9px] font-mono-num px-1.5 py-0.2 rounded bg-[var(--bg-subtle-hover)] text-[var(--text-muted)]">
                                {s.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 3. Custom Module D -> d1..d4 */}
        {!collapsed && (
          <div className="pt-2 border-t border-[var(--border-card)]">
            <button
              onClick={() => setOpenCustom((v) => !v)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-num font-bold bg-[#00B4D8]/15 text-[#00B4D8]">
                  D
                </span>
                自定义空白页 (Custom)
              </span>
              {openCustom ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>

            {openCustom && (
              <div className="mt-1 ml-3 pl-3 border-l border-[var(--border-card)] space-y-1">
                {CUSTOM_PAGES.filter((cp) => {
                  if (userRole === 'admin') return true;
                  if (userRole === 'fw_team') return cp.id === 'custom-fw' || cp.id === 'custom-sandbox';
                  if (userRole === 'qa_team') return cp.id === 'custom-qa' || cp.id === 'custom-sandbox';
                  return cp.id === 'custom-exec';
                }).map((cp, idx) => {
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
                      <span className="truncate">
                        <span className="font-mono-num opacity-75 mr-1">d{idx + 1}.</span>
                        {cp.label}
                      </span>
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

        {/* 4. Personal Space, Viz Gallery & Admin Console */}
        <div className="pt-2 border-t border-[var(--border-card)] space-y-1.5">
          <button
            onClick={() => onNavigate('myspace', 'personal')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
              activeModule === 'myspace'
                ? 'bg-[#00B4D8]/15 border-[#00B4D8]/50 text-[#00B4D8]'
                : 'bg-[var(--bg-subtle)] border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <User className="w-4 h-4 text-[#00B4D8] shrink-0" />
            {!collapsed && <span>我的空间 (/myspace)</span>}
          </button>

          <button
            onClick={() => onNavigate('showcase', 'gallery')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
              activeModule === 'showcase'
                ? 'bg-gradient-to-r from-[#FF6B2C]/20 to-[#A855F7]/20 border-[#FF6B2C]/40 text-[var(--text-primary)]'
                : 'bg-[var(--bg-subtle)] border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <LayoutGrid className="w-4 h-4 text-[#FF6B2C] shrink-0" />
            {!collapsed && <span>可视化样板库 (/showcase)</span>}
          </button>

          {userRole === 'admin' && (
            <button
              onClick={() => onNavigate('admin', 'console')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                activeModule === 'admin'
                  ? 'bg-[#FF6B2C]/15 border-[#FF6B2C]/50 text-[#FF6B2C]'
                  : 'bg-[var(--bg-subtle)] border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Shield className="w-4 h-4 text-[#FF6B2C] shrink-0" />
              {!collapsed && <span>系统管理 (/admin)</span>}
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="p-3.5 border-t border-[var(--border-card)]">
          <div className="rounded-xl border border-dashed border-[var(--border-subtle)] p-2.5 text-[11px] text-[var(--text-muted)] flex items-center gap-2">
            <HardDrive className="w-3.5 h-3.5 text-[#00B4D8] shrink-0" />
            <span className="font-mono-num truncate">
              Active: {models.find((m) => m.id === selectedModelId)?.name}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};
