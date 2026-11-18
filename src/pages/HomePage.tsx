import React from 'react';
import {
  AIInsight,
  BenchmarkRun,
  FirmwareVersion,
  SSDModel,
  TestItem,
} from '../types/ssd';
import {
  CUSTOM_PAGES,
  ModuleKey,
  PERFORMANCE_SUITES,
  POWER_SUITES,
} from '../config/navigation';
import { AIInsightsPanel } from '../components/AIInsightsPanel';
import {
  Activity,
  ArrowRight,
  Cpu,
  Database,
  FilePlus2,
  Gauge,
  HardDrive,
  LayoutGrid,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';

interface HomePageProps {
  models: SSDModel[];
  firmwares: FirmwareVersion[];
  testItems: TestItem[];
  runs: BenchmarkRun[];
  insights: AIInsight[];
  totalRows: number;
  onNavigateRoute: (
    module: ModuleKey,
    subPageId: string,
    modelId?: string,
    defaultTestId?: string
  ) => void;
  onRefresh: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  models,
  firmwares,
  testItems,
  runs,
  insights,
  totalRows,
  onNavigateRoute,
  onRefresh,
}) => {
  const latestFw = firmwares[firmwares.length - 1];
  const peakBandwidth = Math.max(0, ...runs.map((r) => r.throughput_mbps));
  const bestEff = Math.max(0, ...runs.map((r) => r.efficiency_mbps_per_w));

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bento-card rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(255,107,44,0.14),rgba(0,180,216,0.08)_45%,transparent_70%)]" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono-num font-semibold bg-[#FF6B2C]/15 text-[#FF6B2C] border border-[#FF6B2C]/30">
              <Sparkles className="w-3.5 h-3.5" />
              HOME OVERVIEW • MULTI-DB TELEMETRY PLATFORM
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              PULSE LAB 统一数据可视化工作台
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              通过左侧层级路由树（<code className="text-[#00B4D8]">产品 A / B / C → 性能 a1..a4 / 功耗 a5..a7</code>）快速深入任意测试子页，或进入个人空间与可视化样板库。
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => onNavigateRoute('myspace', 'personal')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] hover:border-[#00B4D8] text-xs font-semibold text-[var(--text-primary)] transition cursor-pointer"
            >
              <User className="w-4 h-4 text-[#00B4D8]" />
              进入我的空间
            </button>
            <button
              onClick={() => onNavigateRoute('showcase', 'gallery')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B2C] to-[#FF3B1D] text-white text-xs font-semibold shadow-lg shadow-[#FF6B2C]/20 hover:opacity-95 transition cursor-pointer"
            >
              <LayoutGrid className="w-4 h-4" />
              浏览 10+ 可视化样板库
            </button>
          </div>
        </div>

        {/* 4 Global Platform KPIs */}
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-[var(--border-card)]">
          <div className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-card)]">
            <div className="text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
              <span>覆盖产品与固件</span>
              <Cpu className="w-4 h-4 text-[#00B4D8]" />
            </div>
            <div className="font-mono-num text-xl font-bold text-[var(--text-primary)] mt-1">
              {models.length} 款产品 × {firmwares.length} 固件
            </div>
            <div className="text-[10px] font-mono-num text-emerald-500 mt-0.5">
              Latest: {latestFw?.version}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-card)]">
            <div className="text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
              <span>全平台峰值带宽</span>
              <Activity className="w-4 h-4 text-[#FF6B2C]" />
            </div>
            <div className="font-mono-num text-xl font-bold text-[var(--text-primary)] mt-1">
              {peakBandwidth.toLocaleString()} <span className="text-xs font-normal">MB/s</span>
            </div>
            <div className="text-[10px] font-mono-num text-[var(--text-muted)] mt-0.5">
              PCIe 5.0 x4 Sequential Read
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-card)]">
            <div className="text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
              <span>最佳能效比记录</span>
              <Zap className="w-4 h-4 text-[#A855F7]" />
            </div>
            <div className="font-mono-num text-xl font-bold text-[var(--text-primary)] mt-1">
              {bestEff.toLocaleString()} <span className="text-xs font-normal">MB/s/W</span>
            </div>
            <div className="text-[10px] font-mono-num text-[#A855F7] mt-0.5">
              {testItems.length} 项标准负载全覆盖
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-card)]">
            <div className="text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
              <span>SQLite 遥测引擎</span>
              <Database className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="font-mono-num text-xl font-bold text-[var(--text-primary)] mt-1">
              {totalRows.toLocaleString()} <span className="text-xs font-normal">rows</span>
            </div>
            <div className="text-[10px] font-mono-num text-emerald-500 mt-0.5">
              WAL 实时同步 + 200MB 扩展池
            </div>
          </div>
        </div>
      </div>

      {/* Product Lines Directory (A / B / C -> a1, a2, a3...) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-[var(--text-primary)]">
            产品线与子模块导航矩阵 (A / B / C → 子路由)
          </h2>
          <span className="text-xs font-mono-num text-[var(--text-muted)]">
            点击任意子项直接跳转对应路由
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {models.map((m, idx) => {
            const prefix = String.fromCharCode(65 + idx); // A, B, C
            const subPrefix = prefix.toLowerCase(); // a, b, c
            const modelRuns = runs.filter((r) => r.model_id === m.id);
            const maxTp = Math.max(0, ...modelRuns.map((r) => r.throughput_mbps));

            return (
              <div key={m.id} className="bento-card rounded-2xl p-5 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono-num font-bold bg-[#FF6B2C]/15 text-[#FF6B2C] border border-[#FF6B2C]/30">
                      PRODUCT {prefix}
                    </span>
                    <span className="font-mono-num text-xs font-semibold text-[#00B4D8]">
                      Peak {maxTp.toLocaleString()} MB/s
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <HardDrive className="w-5 h-5 text-[#FF6B2C] shrink-0" />
                    <div>
                      <h3 className="font-display text-base font-bold text-[var(--text-primary)]">
                        {m.name}
                      </h3>
                      <p className="text-[11px] font-mono-num text-[var(--text-muted)]">
                        {m.controller} • {m.nand_type} • {m.interface}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Performance Sub-routes (a1..a4) */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono-num uppercase text-[var(--text-muted)] flex items-center gap-1">
                    <Gauge className="w-3 h-3 text-[#00B4D8]" /> 性能测试子页 (Performance)
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PERFORMANCE_SUITES.map((s, si) => (
                      <button
                        key={s.id}
                        onClick={() => onNavigateRoute('performance', s.id, m.id, s.defaultTestId)}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] border border-[var(--border-card)] hover:border-[#00B4D8]/50 text-xs text-[var(--text-primary)] transition cursor-pointer"
                      >
                        <span className="truncate">
                          <strong className="font-mono-num text-[#00B4D8] mr-1">
                            {subPrefix}{si + 1}.
                          </strong>
                          {s.shortLabel}
                        </span>
                        <ArrowRight className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Power Sub-routes (a5..a7) */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono-num uppercase text-[var(--text-muted)] flex items-center gap-1">
                    <Zap className="w-3 h-3 text-[#A855F7]" /> 功耗与热管理子页 (Power)
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {POWER_SUITES.map((s, si) => (
                      <button
                        key={s.id}
                        onClick={() => onNavigateRoute('power', s.id, m.id, s.defaultTestId)}
                        className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] border border-[var(--border-card)] hover:border-[#A855F7]/50 text-[11px] text-[var(--text-primary)] transition cursor-pointer"
                      >
                        <span className="truncate">
                          <strong className="font-mono-num text-[#A855F7] mr-0.5">
                            {subPrefix}{si + 5}.
                          </strong>
                          {s.shortLabel}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Workspaces Quick Entry */}
      <div className="bento-card rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
            <FilePlus2 className="w-4 h-4 text-[#FF6B2C]" />
            自定义工作区子路由 (Custom Modules → d1..d4)
          </div>
          <span className="text-xs font-mono-num text-[var(--text-muted)]">/custom/:pageId</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {CUSTOM_PAGES.map((cp, idx) => (
            <button
              key={cp.id}
              onClick={() => onNavigateRoute('custom', cp.id)}
              className="p-3.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] border border-[var(--border-card)] hover:border-[#FF6B2C]/50 text-left transition cursor-pointer space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono-num text-xs font-bold text-[#FF6B2C]">
                  d{idx + 1}. {cp.id}
                </span>
                <span className="text-[10px] font-mono-num px-1.5 py-0.5 rounded bg-[var(--bg-input)] text-[var(--text-muted)]">
                  {cp.badge}
                </span>
              </div>
              <div className="text-xs font-semibold text-[var(--text-primary)]">{cp.label}</div>
              <div className="text-[11px] text-[var(--text-secondary)] line-clamp-1">
                {cp.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Global AI Agent Insights Board */}
      <AIInsightsPanel insights={insights} scope="global" onDeleted={onRefresh} />
    </div>
  );
};
