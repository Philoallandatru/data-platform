import React from 'react';
import {
  BenchmarkRun,
  FirmwareVersion,
  PowerTimeseriesPoint,
  RegressionAlert,
  SSDModel,
  TestItem,
  ThemeMode,
} from '../types/ssd';
import { FirmwareTopology3D } from '../components/FirmwareTopology3D';
import { WorkloadSplineChart } from '../components/WorkloadSplineChart';
import {
  EfficiencyThermalRingsCard,
  FirmwareParetoCard,
  RegressionAlertsCard,
  WorkloadMatrixCard,
} from '../components/SSDBentoWidgets';
import { BenchmarkDataTable } from '../components/BenchmarkDataTable';
import { LazyVisibleCard } from '../components/LazyVisibleCard';
import {
  EfficiencyScatterPlot,
  FirmwareRadarChart,
  GroupedComparisonBars,
  LatencyPercentileChart,
  ThermalHeatmapMatrix,
  WorkloadShareTreemap,
} from '../components/charts/VizLibrary';
import { PlaceholderSlot } from '../components/PlaceholderSlot';
import { LayoutGrid } from 'lucide-react';

interface VizGalleryPageProps {
  model: SSDModel;
  models: SSDModel[];
  firmware: FirmwareVersion;
  firmwares: FirmwareVersion[];
  testItems: TestItem[];
  selectedTestId: string;
  onSelectTest: (id: string) => void;
  onSelectFirmware: (id: string) => void;
  onJump: (fwId: string, testId: string) => void;
  allRuns: BenchmarkRun[];
  runsForModel: BenchmarkRun[];
  runsForTest: BenchmarkRun[];
  runsForFirmware: BenchmarkRun[];
  activeRun: BenchmarkRun | undefined;
  timeseries: PowerTimeseriesPoint[];
  alerts: RegressionAlert[];
  theme: ThemeMode;
}

export const VizGalleryPage: React.FC<VizGalleryPageProps> = ({
  model,
  models,
  firmware,
  firmwares,
  testItems,
  selectedTestId,
  onSelectTest,
  onSelectFirmware,
  onJump,
  allRuns,
  runsForModel,
  runsForTest,
  runsForFirmware,
  activeRun,
  timeseries,
  alerts,
  theme,
}) => {
  const currentTest = testItems.find((t) => t.id === selectedTestId);

  return (
    <div className="space-y-5">
      {/* Gallery Header */}
      <div className="bento-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-[#FF6B2C]" />
            <span className="text-xs font-mono-num font-bold uppercase text-[#FF6B2C]">
              All-In-One Visualization Showcase
            </span>
          </div>
          <h2 className="font-display text-xl font-bold text-[var(--text-primary)] mt-1">
            全能型数据可视化样板库（10+ 图表范式）
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            全部组件均由 SQLite（data/ssd_benchmark.db）实时驱动，支持深浅双主题与交互式联动。
          </p>
        </div>
        <div className="text-xs font-mono-num text-[var(--text-muted)]">
          Active: {model.name} • {firmware.version} • {currentTest?.name}
        </div>
      </div>

      {/* Row 1: 3D WebGL Topology + 6-Axis Radar + Composite Rings */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-6">
          <FirmwareTopology3D
            firmwares={firmwares}
            runsForTest={runsForTest}
            selectedFirmwareId={firmware.id}
            onSelectFirmware={onSelectFirmware}
            testName={currentTest?.name || selectedTestId}
            theme={theme}
          />
        </div>
        <div className="xl:col-span-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <FirmwareRadarChart runs={runsForModel} firmwares={firmwares} />
          <EfficiencyThermalRingsCard
            run={activeRun}
            allRunsForTest={runsForTest}
            firmwareVersion={firmware.version}
          />
          <div className="md:col-span-2">
            <EfficiencyScatterPlot
              runs={runsForModel}
              firmwares={firmwares}
              testItems={testItems}
            />
          </div>
        </div>
      </div>

      {/* Row 2: 300s Spline Area + Tail Latency Range */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7">
          <WorkloadSplineChart
            data={timeseries}
            firmwareLabel={firmware.version}
            testLabel={currentTest?.name || selectedTestId}
            modelLabel={model.name}
          />
        </div>
        <div className="lg:col-span-5">
          <LatencyPercentileChart runsForTest={runsForTest} firmwares={firmwares} />
        </div>
      </div>

      {/* Row 3: 6x10 Heatmap Matrix + Treemap + Grouped Bars (Lazy Mounted) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6">
          <LazyVisibleCard>
            <ThermalHeatmapMatrix
              runs={runsForModel}
              firmwares={firmwares}
              testItems={testItems}
              onSelectCell={onJump}
            />
          </LazyVisibleCard>
        </div>
        <div className="lg:col-span-3">
          <LazyVisibleCard>
            <WorkloadShareTreemap
              runsForFirmware={runsForFirmware}
              testItems={testItems}
              onSelectTest={onSelectTest}
            />
          </LazyVisibleCard>
        </div>
        <div className="lg:col-span-3">
          <LazyVisibleCard>
            <GroupedComparisonBars runs={runsForModel} firmwares={firmwares} />
          </LazyVisibleCard>
        </div>
      </div>

      {/* Row 4: Pareto Bars + Full Matrix Table + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4">
          <LazyVisibleCard>
            <FirmwareParetoCard
              firmwares={firmwares}
              runsForTest={runsForTest}
              selectedFirmwareId={firmware.id}
              onSelectFirmware={onSelectFirmware}
              testName={currentTest?.name || selectedTestId}
            />
          </LazyVisibleCard>
        </div>
        <div className="lg:col-span-8">
          <LazyVisibleCard>
            <WorkloadMatrixCard
              testItems={testItems}
              runsForFirmware={runsForFirmware}
              selectedTestId={selectedTestId}
              onSelectTest={onSelectTest}
            />
          </LazyVisibleCard>
        </div>
      </div>

      <LazyVisibleCard>
        <RegressionAlertsCard alerts={alerts} onJumpToAlert={onJump} />
      </LazyVisibleCard>

      <LazyVisibleCard>
        <BenchmarkDataTable
          runs={allRuns}
          models={models}
          firmwares={firmwares}
          testItems={testItems}
          selectedModelId={model.id}
          onSelectRun={onJump}
        />
      </LazyVisibleCard>

      {/* Extensible Template Slots */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <PlaceholderSlot
          slotId="gallery_custom_sankey"
          title="Custom Flow / Sankey Energy Budget"
          description="Placeholder for a custom SVG Sankey diagram mapping PCIe input power → Controller / NAND / DRAM dissipation."
          plannedWidgets={['Sankey SVG', 'Power Loss %']}
        />
        <PlaceholderSlot
          slotId="gallery_custom_cdf"
          title="QoS Tail Latency CDF (99.999%)"
          description="Placeholder for logarithmic Cumulative Distribution Function (CDF) of IO completion times."
          plannedWidgets={['Log-Scale CDF', 'SLA Threshold Line']}
        />
      </div>
    </div>
  );
};
