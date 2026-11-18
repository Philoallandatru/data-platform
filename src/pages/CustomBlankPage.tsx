import React, { useEffect, useState } from 'react';
import { CustomPageConfig } from '../config/navigation';
import { PlaceholderSlot } from '../components/PlaceholderSlot';
import { PanelTabsBar } from '../components/PanelTabsBar';
import { useSemanticQuery } from '../hooks/useSemanticQuery';
import { Database, FilePlus2, Sparkles } from 'lucide-react';

interface CustomBlankPageProps {
  page: CustomPageConfig;
  modelName: string;
  firmwareVersion: string;
}

export const CustomBlankPage: React.FC<CustomBlankPageProps> = ({
  page,
  modelName,
  firmwareVersion,
}) => {
  const [panels, setPanels] = useState<{ id: string; title: string; widgets: string[] }[]>([
    { id: 'panel-1', title: '默认 Panel', widgets: ['placeholder'] },
  ]);
  const [activePanelId, setActivePanelId] = useState('panel-1');

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/workspace?scope=${encodeURIComponent(page.id)}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        const loaded = res?.pages?.[0]?.panels;
        if (Array.isArray(loaded) && loaded.length > 0) {
          setPanels(loaded);
          setActivePanelId(loaded[0].id);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [page.id]);

  const persistPanels = (next: { id: string; title: string; widgets: string[] }[]) => {
    setPanels(next);
    fetch('/api/workspace', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: page.id,
        pages: [{ id: 'page-1', title: page.label, panels: next }],
      }),
    }).catch(() => {});
  };

  const activePanel = panels.find((p) => p.id === activePanelId) || panels[0];

  const [targetDataset, setTargetDataset] = useState<'ssd_runs' | 'raw_io_traces'>('ssd_runs');
  const { data: semData, loading: semLoading, error: semError } = useSemanticQuery(
    targetDataset === 'ssd_runs'
      ? {
          dataset: 'ssd_runs',
          metrics: ['avg_bandwidth', 'avg_power', 'efficiency'],
          groupBy: ['firmware'],
          orderBy: { field: 'avg_bandwidth', dir: 'desc' },
        }
      : {
          dataset: 'raw_io_traces',
          metrics: ['trace_count', 'avg_latency_us', 'avg_power_mw'],
          groupBy: ['firmware'],
          orderBy: { field: 'avg_latency_us', dir: 'asc' },
        }
  );
  return (
    <div className="space-y-5">
      {/* Blank Workspace Header */}
      <div className="bento-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF6B2C]/15 border border-[#FF6B2C]/30 flex items-center justify-center text-[#FF6B2C] shrink-0">
            <FilePlus2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono-num font-bold bg-[#FF6B2C]/15 text-[#FF6B2C] border border-[#FF6B2C]/30">
                CUSTOM WORKSPACE • {page.badge}
              </span>
              <span className="text-xs font-mono-num text-[var(--text-muted)]">
                Owner: {page.ownerHint}
              </span>
            </div>
            <h2 className="font-display text-xl font-bold text-[var(--text-primary)] mt-1">
              {page.label}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{page.description}</p>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-card)] text-xs font-mono-num text-[var(--text-secondary)] flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#00B4D8]" />
          Context: {modelName} • {firmwareVersion}
        </div>
      </div>

      {/* Dynamic Panel Sub-Pages Bar */}
      <div className="bento-card rounded-2xl p-4">
        <PanelTabsBar
          label="Panel Sub-Pages"
          items={panels.map((p) => ({ id: p.id, title: p.title }))}
          activeId={activePanel.id}
          onSelect={setActivePanelId}
          onAdd={() => {
            const newId = `panel-${Date.now().toString(36)}`;
            const next = [...panels, { id: newId, title: `Panel ${panels.length + 1}`, widgets: ['placeholder'] }];
            persistPanels(next);
            setActivePanelId(newId);
          }}
          onRename={(id, title) => {
            persistPanels(panels.map((p) => (p.id === id ? { ...p, title } : p)));
          }}
          onDelete={(id) => {
            if (panels.length <= 1) return;
            const next = panels.filter((p) => p.id !== id);
            persistPanels(next);
            if (activePanelId === id) setActivePanelId(next[0].id);
          }}
          addLabel="新建 Panel 子页"
          maxItems={6}
          accentColor="#00B4D8"
        />
      </div>

      {/* Live Semantic Layer SDK Demo (Multi-DB Pool) */}
      <div className="bento-card rounded-2xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#00B4D8]" />
            <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">
              Semantic Layer SDK Demo (<code className="text-[#FF6B2C]">useSemanticQuery</code>)
            </h3>
          </div>
          <div className="flex items-center gap-1.5 bg-[var(--bg-subtle)] p-0.5 rounded-lg border border-[var(--border-card)] text-[11px] font-mono-num">
            <button
              onClick={() => setTargetDataset('ssd_runs')}
              className={`px-2.5 py-1 rounded-md cursor-pointer transition ${
                targetDataset === 'ssd_runs' ? 'bg-[#00B4D8] text-white font-semibold' : 'text-[var(--text-secondary)]'
              }`}
            >
              ssd_benchmark.db (ssd_runs)
            </button>
            <button
              onClick={() => setTargetDataset('raw_io_traces')}
              className={`px-2.5 py-1 rounded-md cursor-pointer transition ${
                targetDataset === 'raw_io_traces' ? 'bg-[#A855F7] text-white font-semibold' : 'text-[var(--text-secondary)]'
              }`}
            >
              ssd_150mb_sim.db (1.35M rows)
            </button>
          </div>
        </div>

        {semError ? (
          <div className="text-xs text-[#FF4D2E] font-mono-num">{semError}</div>
        ) : semLoading || !semData ? (
          <div className="text-xs text-[var(--text-muted)] font-mono-num">Querying semantic layer...</div>
        ) : (
          <div className="space-y-2">
            <div className="text-[11px] font-mono-num text-[var(--text-secondary)]">
              Datasource: <strong className="text-[#00B4D8]">{semData.datasource}.db</strong> •{' '}
              {semData.rowCount} grouped rows in <strong className="text-emerald-500">{semData.elapsedMs} ms</strong>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {semData.rows.map((r, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-card)] text-xs font-mono-num">
                  <div className="font-bold text-[var(--text-primary)]">{r.firmware}</div>
                  {Object.entries(r)
                    .filter(([k]) => k !== 'firmware')
                    .map(([k, v]) => (
                      <div key={k} className="text-[10px] text-[var(--text-secondary)] flex justify-between mt-0.5">
                        <span>{k}:</span>
                        <span className="text-[#00B4D8] font-semibold">{String(v)}</span>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Blank Grid Canvas with Extensible Slots (Scoped to Active Panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8">
          <PlaceholderSlot
            slotId={`${page.id}_${activePanel.id}_primary`}
            title={`${activePanel.title} — 主可视化区域`}
            description="空白主画布：可从 VizLibrary 或 DataTable 中挑选任意组件挂载至此。"
            plannedWidgets={['Spline / Radar / Scatter', '3D WebGL Topology']}
            minHeight="min-h-[260px]"
          />
        </div>
        <div className="lg:col-span-4">
          <PlaceholderSlot
            slotId={`${page.id}_${activePanel.id}_kpi`}
            title={`${activePanel.title} — 侧边指标卡`}
            description="空白侧边栏位：适合放置核心汇总数值、环形仪表或状态徽章。"
            plannedWidgets={['KPI Bento Tiles', 'Ring Gauge']}
            minHeight="min-h-[260px]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <PlaceholderSlot
          slotId={`${page.id}_${activePanel.id}_left`}
          title={`${activePanel.title} — 自定义明细区`}
          description="可直接使用 <DataTable /> 挂载自定义 SQLite 表或对比矩阵。"
          plannedWidgets={['<DataTable />', 'Heatmap Matrix']}
          minHeight="min-h-[200px]"
        />
        <PlaceholderSlot
          slotId={`${page.id}_${activePanel.id}_right`}
          title={`${activePanel.title} — 扩展分析区`}
          description="预留给团队成员扩展专属分析逻辑、导出脚本或告警规则。"
          plannedWidgets={['Custom Script', 'Alert Feed']}
          minHeight="min-h-[200px]"
        />
      </div>
    </div>
  );
};
