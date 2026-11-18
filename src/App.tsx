import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { SSDTelemetryPayload, ThemeMode } from './types/ssd';
import {
  CUSTOM_PAGES,
  ModuleKey,
  PERFORMANCE_SUITES,
  POWER_SUITES,
} from './config/navigation';
import { Sidebar } from './components/Sidebar';
import { CustomSelect } from './components/CustomSelect';
import { TelemetryExplorer } from './components/TelemetryExplorer';

const PerformanceSuitePage = lazy(() =>
  import('./pages/PerformanceSuitePage').then((m) => ({ default: m.PerformanceSuitePage }))
);
const PowerSuitePage = lazy(() =>
  import('./pages/PowerSuitePage').then((m) => ({ default: m.PowerSuitePage }))
);
const VizGalleryPage = lazy(() =>
  import('./pages/VizGalleryPage').then((m) => ({ default: m.VizGalleryPage }))
);
const CustomBlankPage = lazy(() =>
  import('./pages/CustomBlankPage').then((m) => ({ default: m.CustomBlankPage }))
);
import {
  Activity,
  ChevronRight,
  Cpu,
  Database,
  HardDrive,
  Menu,
  Moon,
  Sun,
  X,
} from 'lucide-react';

export function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('pulse-radar-theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  const [data, setData] = useState<SSDTelemetryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedModelId, setSelectedModelId] = useState<string>('x900-2tb');
  const [selectedFirmwareId, setSelectedFirmwareId] = useState<string>('fw-213');
  const [selectedTestId, setSelectedTestId] = useState<string>('SEQ_128K_Q32_R');

  const [activeModule, setActiveModule] = useState<ModuleKey>('performance');
  const [activeSubPageId, setActiveSubPageId] = useState<string>('cdmark');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dbSignature, setDbSignature] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
    localStorage.setItem('pulse-radar-theme', theme);
  }, [theme]);

  const fetchTelemetry = (isInitial = false) => {
    fetch('/api/ssd-telemetry')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((payload: SSDTelemetryPayload) => {
        setData(payload);
        if (isInitial) {
          if (payload.models.length > 0) setSelectedModelId(payload.models[0].id);
          if (payload.firmwares.length > 0) setSelectedFirmwareId(payload.firmwares[payload.firmwares.length - 1].id);
          if (payload.testItems.length > 0) setSelectedTestId(payload.testItems[0].id);
        }
      })
      .catch((err) => setError(err?.message || 'Failed to load SQLite telemetry'));
  };

  useEffect(() => {
    fetchTelemetry(true);
  }, []);

  // Poll SQLite PRAGMA data_version every 5s to auto-sync external MCP writes
  useEffect(() => {
    const timer = setInterval(() => {
      fetch('/api/ssd-version')
        .then((r) => (r.ok ? r.json() : null))
        .then((v) => {
          if (!v?.signature) return;
          setDbSignature((prev) => {
            if (prev && prev !== v.signature) {
              fetchTelemetry(false);
            }
            return v.signature;
          });
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const currentModel = useMemo(
    () => data?.models.find((m) => m.id === selectedModelId) || data?.models[0],
    [data, selectedModelId]
  );
  const currentFirmware = useMemo(
    () => data?.firmwares.find((f) => f.id === selectedFirmwareId) || data?.firmwares[0],
    [data, selectedFirmwareId]
  );

  const runsForModel = useMemo(
    () => (data?.runs || []).filter((r) => r.model_id === selectedModelId),
    [data, selectedModelId]
  );

  const runsForTest = useMemo(
    () => runsForModel.filter((r) => r.test_id === selectedTestId),
    [runsForModel, selectedTestId]
  );

  const runsForFirmware = useMemo(
    () => runsForModel.filter((r) => r.firmware_id === selectedFirmwareId),
    [runsForModel, selectedFirmwareId]
  );

  const activeRun = useMemo(
    () => runsForTest.find((r) => r.firmware_id === selectedFirmwareId) || runsForTest[0],
    [runsForTest, selectedFirmwareId]
  );

  const activeTimeseries = useMemo(
    () =>
      (data?.timeseries || []).filter(
        (pt) =>
          pt.model_id === selectedModelId &&
          pt.firmware_id === selectedFirmwareId &&
          pt.test_id === selectedTestId
      ),
    [data, selectedModelId, selectedFirmwareId, selectedTestId]
  );

  const totalRows = useMemo(() => {
    if (!data) return 0;
    return (
      data.counts.models +
      data.counts.firmwares +
      data.counts.testItems +
      data.counts.runs +
      data.counts.timeseries +
      data.counts.alerts
    );
  }, [data]);

  const handleNavigate = (module: ModuleKey, subPageId: string, defaultTestId?: string) => {
    setActiveModule(module);
    setActiveSubPageId(subPageId);
    if (defaultTestId) setSelectedTestId(defaultTestId);
    setMobileMenuOpen(false);
  };

  const handleJump = (fwId: string, testId: string) => {
    setSelectedFirmwareId(fwId);
    setSelectedTestId(testId);
  };

  const activeCustomPage = useMemo(
    () => CUSTOM_PAGES.find((c) => c.id === activeSubPageId) || CUSTOM_PAGES[0],
    [activeSubPageId]
  );

  const activeSuiteConfig = useMemo(() => {
    if (activeModule === 'performance') {
      return PERFORMANCE_SUITES.find((s) => s.id === activeSubPageId) || PERFORMANCE_SUITES[0];
    }
    return POWER_SUITES.find((s) => s.id === activeSubPageId) || POWER_SUITES[0];
  }, [activeModule, activeSubPageId]);

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex items-center justify-center p-6">
        <div className="bento-card rounded-2xl p-6 max-w-md text-center">
          <Database className="w-8 h-8 text-[#FF4D2E] mx-auto mb-3" />
          <h2 className="font-display text-lg font-bold">SQLite Connection Error</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || !currentModel || !currentFirmware) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-mono-num">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B2C] animate-ping" />
          Loading SQLite SSD Telemetry (data/ssd_benchmark.db)...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] bg-cyber-grid text-[var(--text-primary)] flex flex-col transition-colors duration-300">
      {/* Top Navbar */}
      <header
        className="sticky top-0 z-40 border-b border-[var(--border-card)] backdrop-blur-xl transition-colors duration-300"
        style={{ backgroundColor: 'var(--bg-header)' }}
      >
        <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left: Mobile Drawer Toggle + Brand + Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden p-2 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-primary)]"
              aria-label="Toggle Sidebar"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>

            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF6B2C] to-[#FF3B1D] flex items-center justify-center shadow-lg shadow-[#FF6B2C]/25 shrink-0">
              <HardDrive className="w-5 h-5 text-white" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base tracking-tight text-[var(--text-primary)]">
                  PULSE LAB
                </span>
                <span
                  title={`SQLite WAL Sync Signature: ${dbSignature ?? 'connecting'}`}
                  className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono-num font-semibold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  SQLITE LIVE
                </span>
              </div>

              <div className="hidden md:flex items-center gap-1 text-[11px] text-[var(--text-secondary)] truncate">
                <span>{currentModel.name}</span>
                <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />
                <span className="capitalize">
                  {activeModule === 'showcase'
                    ? 'Viz Gallery'
                    : activeModule === 'custom'
                    ? 'Custom'
                    : activeModule}
                </span>
                {activeModule !== 'showcase' && (
                  <>
                    <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />
                    <span className="text-[#FF6B2C] font-medium">
                      {activeModule === 'custom' ? activeCustomPage.label : activeSuiteConfig.shortLabel}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Custom Glassmorphic Firmware & Workload Selectors + Theme Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <CustomSelect
              value={selectedFirmwareId}
              onChange={setSelectedFirmwareId}
              icon={<Cpu className="w-3.5 h-3.5" />}
              searchable
              options={data.firmwares.map((fw) => ({
                value: fw.id,
                label: fw.version,
                sublabel: `${fw.release_date} • ${fw.notes}`,
                badge: fw.power_profile,
                dotColor:
                  fw.channel === 'Beta'
                    ? '#10B981'
                    : fw.channel === 'RC'
                    ? '#F59E0B'
                    : '#00B4D8',
              }))}
            />

            <CustomSelect
              value={selectedTestId}
              onChange={setSelectedTestId}
              icon={<Activity className="w-3.5 h-3.5" />}
              searchable
              className="hidden sm:block"
              options={data.testItems.map((t) => ({
                value: t.id,
                label: t.name,
                sublabel: `${t.category} • ${t.rw_mix}`,
                badge: `${t.block_size} QD${t.queue_depth}`,
              }))}
            />

            <button
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              aria-label="Toggle theme"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              className="p-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[#FF6B2C]/50 transition cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout: Left Sidebar + Right Page Workspace */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex">
          <Sidebar
            models={data.models}
            selectedModelId={selectedModelId}
            onSelectModel={setSelectedModelId}
            activeModule={activeModule}
            activeSubPageId={activeSubPageId}
            onNavigate={handleNavigate}
          />
        </div>

        {/* Mobile Drawer Sidebar */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div className="h-full flex">
              <Sidebar
                models={data.models}
                selectedModelId={selectedModelId}
                onSelectModel={setSelectedModelId}
                activeModule={activeModule}
                activeSubPageId={activeSubPageId}
                onNavigate={handleNavigate}
              />
            </div>
            <div
              className="flex-1 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
          </div>
        )}

        {/* Active Page Content */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 space-y-5 overflow-y-auto">
          <TelemetryExplorer
            runs={data.runs}
            firmwares={data.firmwares}
            testItems={data.testItems}
            selectedModelId={selectedModelId}
            selectedTestId={selectedTestId}
            onJump={handleJump}
            totalRows={totalRows}
          />

          <Suspense
            fallback={
              <div className="bento-card rounded-2xl p-8 text-center text-xs font-mono-num text-[var(--text-muted)]">
                Loading module chunk...
              </div>
            }
          >
            {activeModule === 'performance' && (
              <PerformanceSuitePage
                suite={activeSuiteConfig}
                model={currentModel}
                models={data.models}
                firmware={currentFirmware}
                firmwares={data.firmwares}
                testItems={data.testItems}
                selectedTestId={selectedTestId}
                onSelectTest={setSelectedTestId}
                onSelectFirmware={setSelectedFirmwareId}
                onJump={handleJump}
                allRuns={data.runs}
                runsForModel={runsForModel}
                runsForTest={runsForTest}
                activeRun={activeRun}
                timeseries={activeTimeseries}
              />
            )}

            {activeModule === 'power' && (
              <PowerSuitePage
                suite={activeSuiteConfig}
                model={currentModel}
                firmware={currentFirmware}
                firmwares={data.firmwares}
                testItems={data.testItems}
                selectedTestId={selectedTestId}
                onJump={handleJump}
                runsForModel={runsForModel}
                runsForTest={runsForTest}
                activeRun={activeRun}
                timeseries={activeTimeseries}
              />
            )}

            {activeModule === 'showcase' && (
              <VizGalleryPage
                model={currentModel}
                models={data.models}
                firmware={currentFirmware}
                firmwares={data.firmwares}
                testItems={data.testItems}
                selectedTestId={selectedTestId}
                onSelectTest={setSelectedTestId}
                onSelectFirmware={setSelectedFirmwareId}
                onJump={handleJump}
                allRuns={data.runs}
                runsForModel={runsForModel}
                runsForTest={runsForTest}
                runsForFirmware={runsForFirmware}
                activeRun={activeRun}
                timeseries={activeTimeseries}
                alerts={data.alerts}
                theme={theme}
              />
            )}

            {activeModule === 'custom' && (
              <CustomBlankPage
                page={activeCustomPage}
                modelName={currentModel.name}
                firmwareVersion={currentFirmware.version}
              />
            )}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default App;
