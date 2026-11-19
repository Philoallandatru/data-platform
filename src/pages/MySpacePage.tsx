import React, { useEffect, useMemo, useState } from 'react';
import {
  BenchmarkRun,
  FirmwareVersion,
  RegressionAlert,
  SSDModel,
  TestItem,
} from '../types/ssd';
import { LazyVisibleCard } from '../components/LazyVisibleCard';
import { CustomSelect } from '../components/CustomSelect';
import { ColumnDef, DataTable } from '../components/DataTable';
import { PanelTabsBar } from '../components/PanelTabsBar';
import {
  EfficiencyScatterPlot,
  FirmwareRadarChart,
  ThermalHeatmapMatrix,
} from '../components/charts/VizLibrary';
import {
  EfficiencyThermalRingsCard,
  RegressionAlertsCard,
} from '../components/SSDBentoWidgets';
import { useSemanticQuery } from '../hooks/useSemanticQuery';
import {
  BarChart3,
  Check,
  Database,
  FileSpreadsheet,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  User,
} from 'lucide-react';

interface MySpacePageProps {
  userId: string;
  userName: string;
  userRole: string;
  model: SSDModel;
  firmware: FirmwareVersion;
  firmwares: FirmwareVersion[];
  testItems: TestItem[];
  runsForModel: BenchmarkRun[];
  runsForTest: BenchmarkRun[];
  activeRun: BenchmarkRun | undefined;
  alerts: RegressionAlert[];
  onJump: (fwId: string, testId: string) => void;
}

const WIDGET_CATALOG = [
  { id: 'personal_import', label: '个人 CSV / JSON 导入与自动图表' },
  { id: 'radar', label: '6-Axis Firmware Radar' },
  { id: 'scatter', label: 'Power vs Throughput Bubble' },
  { id: 'heatmap', label: '6×10 Thermal Heatmap' },
  { id: 'rings', label: 'Composite Score Rings' },
  { id: 'semantic_raw', label: '1.35M-Row Semantic Query' },
  { id: 'alerts', label: 'Automated Alerts Feed' },
];

interface WorkspacePanel {
  id: string;
  title: string;
  widgets: string[];
}

interface WorkspacePage {
  id: string;
  title: string;
  panels: WorkspacePanel[];
}

const DEFAULT_PAGES: WorkspacePage[] = [
  {
    id: 'page-1',
    title: '默认工作台',
    panels: [
      { id: 'panel-1', title: '主面板 Panel', widgets: ['radar', 'scatter', 'semantic_raw'] },
      { id: 'panel-2', title: '个人数据导入', widgets: ['personal_import'] },
    ],
  },
];

const SAMPLE_CSV = `job_name,block_kb,qd,bw_mbps,iops,lat_p99_us,power_w,temp_c
seq_read_128k,128,32,14250,111328,265,8.4,61.2
seq_write_128k,128,32,12680,99062,310,9.1,64.8
rand_read_4k_q1,4,1,425,108800,48,3.6,44.5
rand_read_4k_q64,4,64,7850,2009600,240,8.9,63.1
rand_write_4k_q64,4,64,6320,1617920,295,9.3,66.4
mixed_oltp_70r,4,32,5490,1405440,215,8.6,62.0
slc_exhaust_steady,128,16,4650,36328,840,9.8,70.5
zns_append_stream,64,16,9420,147187,195,7.9,58.7`;

/** RFC-4180 compliant CSV parser supporting quoted commas, escaped quotes, and multiline fields */
function parseCsvText(text: string): Record<string, any>[] {
  const table: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim());
      if (row.some((c) => c !== '')) table.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell.trim());
    if (row.some((c) => c !== '')) table.push(row);
  }

  if (table.length < 2) return [];
  const headers = table[0];
  return table.slice(1).map((vals, idx) => {
    const obj: Record<string, any> = { __rowId: idx + 1 };
    headers.forEach((h, i) => {
      const raw = vals[i] ?? '';
      const num = Number(raw);
      obj[h] = raw !== '' && !Number.isNaN(num) ? num : raw;
    });
    return obj;
  });
}

export const MySpacePage: React.FC<MySpacePageProps> = ({
  userId,
  userName,
  userRole,
  model,
  firmware,
  firmwares,
  testItems,
  runsForModel,
  runsForTest,
  activeRun,
  alerts,
  onJump,
}) => {
  const [pages, setPages] = useState<WorkspacePage[]>(DEFAULT_PAGES);
  const [activePageId, setActivePageId] = useState<string>('page-1');
  const [activePanelId, setActivePanelId] = useState<string>('panel-1');
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const [hasRawTracesDs, setHasRawTracesDs] = useState(false);
  const [savingLayout, setSavingLayout] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const activePage = pages.find((p) => p.id === activePageId) || pages[0];
  const activePanel = activePage.panels.find((pn) => pn.id === activePanelId) || activePage.panels[0];
  const widgets = activePanel.widgets;

  // Personal imported CSV/JSON dataset (persisted per userId in data/personal_datasets.db)
  const [importedName, setImportedName] = useState<string | null>(null);
  const [importedRows, setImportedRows] = useState<Record<string, any>[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [xAxis, setXAxis] = useState<string>('');
  const [yAxis, setYAxis] = useState<string>('');

  // Load saved widget preferences & personal dataset from SQLite (abort stale fetches on user switch)
  useEffect(() => {
    const controller = new AbortController();
    setWorkspaceLoaded(false);
    setImportedName(null);
    setImportedRows([]);
    setImportError(null);
    setImportNotice(null);

    fetch('/api/workspace?scope=myspace', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (Array.isArray(res?.pages) && res.pages.length > 0) {
          setPages(res.pages);
          let nextPageId = res.pages[0].id;
          let nextPanelId = res.pages[0].panels[0]?.id || 'panel-1';
          try {
            const savedNav = JSON.parse(
              localStorage.getItem(`pulselab:myspace:nav:${userId}`) || 'null'
            );
            const matchedPage = res.pages.find((p: WorkspacePage) => p.id === savedNav?.pageId);
            if (matchedPage) {
              nextPageId = matchedPage.id;
              const matchedPanel = matchedPage.panels.find(
                (pn: WorkspacePanel) => pn.id === savedNav?.panelId
              );
              if (matchedPanel) {
                nextPanelId = matchedPanel.id;
              } else if (matchedPage.panels[0]?.id) {
                nextPanelId = matchedPage.panels[0].id;
              }
            }
          } catch {
            // ignore invalid localStorage entry
          }
          setActivePageId(nextPageId);
          setActivePanelId(nextPanelId);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setWorkspaceLoaded(true);
      });

    fetch('/api/semantic/catalog', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        const active = Array.isArray(res?.activeDatasources) ? res.activeDatasources : [];
        setHasRawTracesDs(active.some((d: any) => d.id === 'ssd_150mb_sim'));
      })
      .catch(() => setHasRawTracesDs(false));

    fetch('/api/personal-datasets', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.dataset) {
          setImportedName(res.dataset.name);
          const loaded = Array.isArray(res.dataset.rows) ? res.dataset.rows : [];
          setImportedRows(loaded.map((r: any, idx: number) => ({ __rowId: r.__rowId ?? idx + 1, ...r })));
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [userId]);

  const persistPages = async (nextPages: WorkspacePage[]) => {
    setPages(nextPages);
    setSavingLayout(true);
    try {
      await fetch('/api/workspace', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'myspace', pages: nextPages }),
      });
    } finally {
      setSavingLayout(false);
    }
  };

  const toggleWidget = (id: string) => {
    const nextWidgets = widgets.includes(id)
      ? widgets.filter((w) => w !== id)
      : [...widgets, id];
    const nextPages = pages.map((p) =>
      p.id !== activePage.id
        ? p
        : {
            ...p,
            panels: p.panels.map((pn) =>
              pn.id !== activePanel.id ? pn : { ...pn, widgets: nextWidgets }
            ),
          }
    );
    persistPages(nextPages);
  };

  const addPage = () => {
    const newId = `page-${Date.now().toString(36)}`;
    const newPanelId = `panel-${Date.now().toString(36)}`;
    const nextPages: WorkspacePage[] = [
      ...pages,
      {
        id: newId,
        title: `页面 ${pages.length + 1}`,
        panels: [{ id: newPanelId, title: 'Panel 1', widgets: ['radar', 'personal_import'] }],
      },
    ];
    persistPages(nextPages);
    setActivePageId(newId);
    setActivePanelId(newPanelId);
  };

  const renamePage = (id: string, title: string) => {
    persistPages(pages.map((p) => (p.id === id ? { ...p, title } : p)));
  };

  const deletePage = (id: string) => {
    if (pages.length <= 1) return;
    const next = pages.filter((p) => p.id !== id);
    persistPages(next);
    if (activePageId === id) {
      setActivePageId(next[0].id);
      setActivePanelId(next[0].panels[0].id);
    }
  };

  const addPanel = () => {
    const newPanelId = `panel-${Date.now().toString(36)}`;
    const nextPages = pages.map((p) =>
      p.id !== activePage.id
        ? p
        : {
            ...p,
            panels: [
              ...p.panels,
              { id: newPanelId, title: `Panel ${p.panels.length + 1}`, widgets: ['scatter'] },
            ],
          }
    );
    persistPages(nextPages);
    setActivePanelId(newPanelId);
  };

  const renamePanel = (panelId: string, title: string) => {
    const nextPages = pages.map((p) =>
      p.id !== activePage.id
        ? p
        : {
            ...p,
            panels: p.panels.map((pn) => (pn.id === panelId ? { ...pn, title } : pn)),
          }
    );
    persistPages(nextPages);
  };

  const deletePanel = (panelId: string) => {
    if (activePage.panels.length <= 1) return;
    const nextPanels = activePage.panels.filter((pn) => pn.id !== panelId);
    const nextPages = pages.map((p) =>
      p.id !== activePage.id ? p : { ...p, panels: nextPanels }
    );
    persistPages(nextPages);
    if (activePanelId === panelId) {
      setActivePanelId(nextPanels[0].id);
    }
  };

  // Persist active page/panel selection across reloads
  useEffect(() => {
    if (!workspaceLoaded) return;
    try {
      localStorage.setItem(
        `pulselab:myspace:nav:${userId}`,
        JSON.stringify({ pageId: activePageId, panelId: activePanelId })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [userId, workspaceLoaded, activePageId, activePanelId]);

  // Live 1.35M-row Semantic Query for personal widget (only when ssd_150mb_sim is active)
  const { data: semRaw } = useSemanticQuery(
    workspaceLoaded && hasRawTracesDs && widgets.includes('semantic_raw')
      ? {
          dataset: 'raw_io_traces',
          metrics: ['trace_count', 'avg_latency_us', 'avg_power_mw'],
          groupBy: ['firmware'],
          where: { model: model.id },
          orderBy: { field: 'avg_latency_us', dir: 'asc' },
        }
      : null
  );

  // Detect columns from importedRows
  const importedHeaders = useMemo(() => {
    if (importedRows.length === 0) return [];
    return Object.keys(importedRows[0]).filter((k) => k !== '__rowId');
  }, [importedRows]);

  const numericHeaders = useMemo(() => {
    if (importedRows.length === 0) return [];
    return importedHeaders.filter((h) => typeof importedRows[0][h] === 'number');
  }, [importedHeaders, importedRows]);

  useEffect(() => {
    if (importedHeaders.length > 0 && !importedHeaders.includes(xAxis)) {
      setXAxis(importedHeaders[0]);
    }
    if (numericHeaders.length > 0 && !numericHeaders.includes(yAxis)) {
      setYAxis(numericHeaders[0]);
    }
  }, [importedHeaders, numericHeaders, xAxis, yAxis]);

  const saveImportedData = async (name: string, rows: Record<string, any>[]) => {
    setImportError(null);
    setImportNotice(null);
    const limitedRows = rows.slice(0, 5000);
    try {
      const res = await fetch('/api/personal-datasets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, rows: limitedRows }),
      });
      const json = await res.json();
      if (!res.ok) {
        setImportError(json.error || 'Failed to persist dataset');
        return;
      }
      setImportedName(name);
      setImportedRows(limitedRows);
      if (rows.length > 5000) {
        setImportNotice(`已截断并持久化前 5,000 行（原始文件共 ${rows.length.toLocaleString()} 行）`);
      }
    } catch {
      setImportError('Failed to save dataset to server');
    }
  };

  const handleFileUpload = async (file: File) => {
    setImportError(null);
    if (file.size > 10 * 1024 * 1024) {
      setImportError('File too large (max 10 MB)');
      return;
    }
    const text = await file.text();
    try {
      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(text);
        const arr = Array.isArray(parsed) ? parsed : parsed.rows || [];
        if (!Array.isArray(arr) || arr.length === 0) throw new Error('JSON must be a non-empty array of objects');
        const normalized = arr.map((r: any, idx: number) => ({ __rowId: idx + 1, ...r }));
        saveImportedData(file.name, normalized);
      } else {
        const rows = parseCsvText(text);
        if (rows.length === 0) throw new Error('CSV must contain a header row and at least 1 data row');
        saveImportedData(file.name, rows);
      }
    } catch (err: any) {
      setImportError(err?.message || 'Failed to parse file');
    }
  };

  const clearImported = async () => {
    setImportedName(null);
    setImportedRows([]);
    await fetch('/api/personal-datasets', { method: 'DELETE' }).catch(() => {});
  };

  const dynamicColumns: ColumnDef<Record<string, any>>[] = useMemo(
    () =>
      importedHeaders.map((h) => ({
        key: h,
        header: h,
        align: typeof importedRows[0]?.[h] === 'number' ? 'right' : 'left',
        accessor: (r) => r[h] ?? '',
        render: (r) => (
          <span
            className={
              typeof r[h] === 'number'
                ? 'font-mono-num font-semibold text-[#00B4D8]'
                : 'font-medium text-[var(--text-primary)]'
            }
          >
            {typeof r[h] === 'number' ? r[h].toLocaleString() : String(r[h] ?? '')}
          </span>
        ),
      })),
    [importedHeaders, importedRows]
  );

  // Evenly sample up to 40 points for crisp SVG chart preview
  const chartPoints = useMemo(() => {
    if (!xAxis || !yAxis || importedRows.length === 0) return [];
    const maxPts = 40;
    const step = Math.max(1, Math.ceil(importedRows.length / maxPts));
    const sampled: { label: string; value: number }[] = [];
    for (let i = 0; i < importedRows.length && sampled.length < maxPts; i += step) {
      const r = importedRows[i];
      sampled.push({
        label: String(r[xAxis] ?? i + 1),
        value: Number(r[yAxis]) || 0,
      });
    }
    return sampled;
  }, [importedRows, xAxis, yAxis]);

  const maxChartVal = Math.max(1, ...chartPoints.map((p) => p.value));

  return (
    <div className="space-y-5">
      {/* Personal Space Header */}
      <div className="bento-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00B4D8] to-[#A855F7] flex items-center justify-center text-white shadow-md">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono-num font-bold bg-[#00B4D8]/15 text-[#00B4D8] border border-[#00B4D8]/30">
                MY SPACE • {userRole.toUpperCase()}
              </span>
              <span className="text-xs font-mono-num text-[var(--text-muted)]">
                {savingLayout ? 'Saving layout...' : 'Synced to auth.db'}
              </span>
            </div>
            <h2 className="font-display text-xl font-bold text-[var(--text-primary)] mt-1">
              {userName} 的个人数据工作台
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              自由勾选主库可视化卡片（按账号持久化），或拖入个人 CSV / JSON 文件即时生成图表与数据表。
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowPicker((v) => !v)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] transition cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#FF6B2C]" />
          定制当前 Panel 组件 ({widgets.length})
        </button>
      </div>

      {/* Multi-Page & Multi-Panel Switcher */}
      <div className="bento-card rounded-2xl p-4 space-y-3">
        <PanelTabsBar
          label="Pages"
          items={pages.map((p) => ({ id: p.id, title: p.title }))}
          activeId={activePage.id}
          onSelect={(id) => {
            setActivePageId(id);
            const target = pages.find((p) => p.id === id);
            if (target?.panels[0]) setActivePanelId(target.panels[0].id);
          }}
          onAdd={addPage}
          onRename={renamePage}
          onDelete={deletePage}
          addLabel="新建页面"
          maxItems={10}
          accentColor="#FF6B2C"
        />

        <div className="pt-2.5 border-t border-[var(--border-card)]">
          <PanelTabsBar
            label="Panels"
            items={activePage.panels.map((pn) => ({ id: pn.id, title: pn.title }))}
            activeId={activePanel.id}
            onSelect={setActivePanelId}
            onAdd={addPanel}
            onRename={renamePanel}
            onDelete={deletePanel}
            addLabel="新建 Panel"
            maxItems={6}
            accentColor="#00B4D8"
          />
        </div>
      </div>

      {/* Widget Picker Drawer */}
      {showPicker && (
        <div className="bento-card rounded-2xl p-4 space-y-2.5">
          <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#FF6B2C]" />
            选择要固定在个人空间的主库组件（自动保存至 auth.db）：
          </div>
          <div className="flex flex-wrap gap-2">
            {WIDGET_CATALOG.map((w) => {
              const active = widgets.includes(w.id);
              return (
                <button
                  key={w.id}
                  onClick={() => toggleWidget(w.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
                    active
                      ? 'bg-[#FF6B2C]/15 border-[#FF6B2C] text-[var(--text-primary)]'
                      : 'bg-[var(--bg-subtle)] border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {active && <Check className="w-3.5 h-3.5 text-[#FF6B2C]" />}
                  {w.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Page / Panel Indicator + Empty State Guide */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs font-mono-num text-[var(--text-secondary)]">
        <span>
          当前视图：<strong className="text-[#FF6B2C]">{activePage.title}</strong> /{' '}
          <strong className="text-[#00B4D8]">{activePanel.title}</strong>（已挂载 {widgets.length} 个组件）
        </span>
        <button
          onClick={() => setShowPicker(true)}
          className="text-[11px] text-[#00B4D8] hover:underline cursor-pointer"
        >
          + 为当前 Panel 增减组件
        </button>
      </div>

      {widgets.length === 0 && (
        <div className="bento-card rounded-2xl p-8 text-center space-y-3 border-2 border-dashed border-[var(--border-subtle)]">
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            「{activePage.title} / {activePanel.title}」当前是一个空白 Panel
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            每个新建的页面和 Panel 都是独立的画布配置（已保存至 auth.db）。点击下方按钮即可为它挑选要展示的图表或数据导入区。
          </p>
          <button
            onClick={() => setShowPicker(true)}
            className="px-4 py-2 rounded-xl bg-[#FF6B2C] text-white text-xs font-semibold cursor-pointer"
          >
            + 立即配置本 Panel 组件
          </button>
        </div>
      )}

      {/* Personal CSV / JSON Dropzone & Auto-Visualizer (when enabled on active panel) */}
      {widgets.includes('personal_import') && (
      <div className="bento-card rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#FF6B2C]" />
            <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
              个人数据导入区（持久化至 personal_datasets.db，绝不污染主库）
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => saveImportedData('sample_fio_sweep.csv', parseCsvText(SAMPLE_CSV))}
              className="px-3 py-1.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] border border-[var(--border-card)] text-xs font-medium text-[var(--text-primary)] transition cursor-pointer"
            >
              载入示例 FIO CSV
            </button>
            {importedRows.length > 0 && (
              <button
                onClick={clearImported}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FF4D2E]/12 border border-[#FF4D2E]/30 text-xs font-medium text-[#FF4D2E] cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> 清空
              </button>
            )}
          </div>
        </div>

        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) handleFileUpload(f);
          }}
          className="flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-2xl border-2 border-dashed border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-[#00B4D8] transition cursor-pointer text-center"
        >
          <Upload className="w-6 h-6 text-[#00B4D8]" />
          <div className="text-xs font-medium text-[var(--text-primary)]">
            {importedName
              ? `已加载：${importedName}（${importedRows.length} 行，${importedHeaders.length} 列）— 拖入新文件可替换`
              : '拖拽 .csv 或 .json 文件到此处，或点击选择文件（最大 10MB）'}
          </div>
          <input
            type="file"
            accept=".csv,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileUpload(f);
            }}
          />
        </label>

        {importError && (
          <div className="text-xs text-[#FF4D2E] font-mono-num">{importError}</div>
        )}
        {importNotice && (
          <div className="text-xs text-amber-500 font-mono-num">{importNotice}</div>
        )}

        {/* Auto-Generated Chart + DataTable for Imported Data */}
        {importedRows.length > 0 && (
          <div className="space-y-4 pt-2">
            {numericHeaders.length > 0 && (
              <div className="rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-card)] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                    <BarChart3 className="w-4 h-4 text-[#00B4D8]" />
                    自动图表预览
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CustomSelect
                      value={xAxis}
                      onChange={setXAxis}
                      options={importedHeaders.map((h) => ({ value: h, label: `X: ${h}` }))}
                      className="w-36"
                    />
                    <CustomSelect
                      value={yAxis}
                      onChange={setYAxis}
                      options={numericHeaders.map((h) => ({ value: h, label: `Y: ${h}` }))}
                      className="w-36"
                    />
                    <div className="flex bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl p-0.5 text-[11px]">
                      <button
                        onClick={() => setChartType('bar')}
                        className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                          chartType === 'bar' ? 'bg-[#FF6B2C] text-white font-semibold' : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        Bar
                      </button>
                      <button
                        onClick={() => setChartType('line')}
                        className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                          chartType === 'line' ? 'bg-[#00B4D8] text-white font-semibold' : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        Line
                      </button>
                    </div>
                  </div>
                </div>

                {chartType === 'bar' ? (
                  <div className="flex items-end gap-2 h-44 pt-4 overflow-x-auto">
                    {chartPoints.map((pt, idx) => (
                      <div key={idx} className="flex-1 min-w-[44px] flex flex-col items-center h-full justify-end">
                        <div className="text-[10px] font-mono-num text-[var(--text-secondary)] mb-1">
                          {pt.value.toLocaleString()}
                        </div>
                        <div
                          className="w-full max-w-[36px] rounded-t-lg bg-gradient-to-t from-[#00B4D8] to-[#A855F7] transition-all duration-300"
                          style={{ height: `${Math.max(8, (pt.value / maxChartVal) * 110)}px` }}
                        />
                        <div className="text-[10px] font-mono-num text-[var(--text-muted)] truncate w-full text-center mt-1.5">
                          {pt.label}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <svg viewBox="0 0 640 160" className="w-full h-44 overflow-visible">
                    <polyline
                      fill="none"
                      stroke="#00E5FF"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={chartPoints
                        .map((pt, idx) => {
                          const x = 30 + (idx / Math.max(1, chartPoints.length - 1)) * 580;
                          const y = 135 - (pt.value / maxChartVal) * 110;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />
                    {chartPoints.map((pt, idx) => {
                      const x = 30 + (idx / Math.max(1, chartPoints.length - 1)) * 580;
                      const y = 135 - (pt.value / maxChartVal) * 110;
                      return (
                        <g key={idx}>
                          <circle cx={x} cy={y} r="4" fill="#FF6B2C" />
                          <text x={x} y={154} textAnchor="middle" className="fill-[var(--text-muted)] text-[9px] font-mono-num">
                            {pt.label.slice(0, 8)}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                )}
              </div>
            )}

            <DataTable
              key={importedName || 'empty'}
              title={`Imported Table: ${importedName}`}
              subtitle="自动解析列类型并挂载通用排序、筛选、多选与导出功能"
              data={importedRows}
              columns={dynamicColumns}
              getRowId={(r) => r.__rowId}
              defaultPageSize={10}
              exportFileName={`personal_${importedName || 'data'}.csv`}
            />
          </div>
        )}
      </div>
      )}

      {/* Pinned Main-DB Widgets (Lazy-Mounted via IntersectionObserver) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {widgets.includes('radar') && (
          <div className="lg:col-span-6">
            <LazyVisibleCard>
              <FirmwareRadarChart runs={runsForModel} firmwares={firmwares} />
            </LazyVisibleCard>
          </div>
        )}

        {widgets.includes('scatter') && (
          <div className="lg:col-span-6">
            <LazyVisibleCard>
              <EfficiencyScatterPlot
                runs={runsForModel}
                firmwares={firmwares}
                testItems={testItems}
              />
            </LazyVisibleCard>
          </div>
        )}

        {widgets.includes('heatmap') && (
          <div className="lg:col-span-8">
            <LazyVisibleCard>
              <ThermalHeatmapMatrix
                runs={runsForModel}
                firmwares={firmwares}
                testItems={testItems}
                onSelectCell={onJump}
              />
            </LazyVisibleCard>
          </div>
        )}

        {widgets.includes('rings') && (
          <div className="lg:col-span-4">
            <LazyVisibleCard>
              <EfficiencyThermalRingsCard
                run={activeRun}
                allRunsForTest={runsForTest}
                firmwareVersion={firmware.version}
              />
            </LazyVisibleCard>
          </div>
        )}

        {widgets.includes('semantic_raw') && semRaw && (
          <div className="lg:col-span-12">
            <LazyVisibleCard minHeight="min-h-[140px]">
              <div className="bento-card rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                    <Database className="w-4 h-4 text-[#A855F7]" />
                    200MB 百万行原始 Trace 语义聚合（{model.name}）
                  </div>
                  <span className="text-xs font-mono-num text-emerald-500">
                    {semRaw.rowCount} rows in {semRaw.elapsedMs} ms
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {semRaw.rows.map((r, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-card)] text-xs font-mono-num">
                      <div className="font-bold text-[var(--text-primary)]">{r.firmware}</div>
                      <div className="text-[10px] text-[var(--text-secondary)] mt-1">
                        Avg Lat: <strong className="text-[#00B4D8]">{r.avg_latency_us} µs</strong>
                      </div>
                      <div className="text-[10px] text-[var(--text-secondary)]">
                        Power: <strong className="text-[#A855F7]">{r.avg_power_mw} mW</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </LazyVisibleCard>
          </div>
        )}

        {widgets.includes('alerts') && (
          <div className="lg:col-span-12">
            <LazyVisibleCard>
              <RegressionAlertsCard alerts={alerts} onJumpToAlert={onJump} />
            </LazyVisibleCard>
          </div>
        )}
      </div>
    </div>
  );
};
