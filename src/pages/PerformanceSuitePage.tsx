import React from 'react';
import {
  BenchmarkRun,
  FirmwareVersion,
  PowerTimeseriesPoint,
  SSDModel,
  TestItem,
} from '../types/ssd';
import { SubPageConfig } from '../config/navigation';
import { WorkloadSplineChart } from '../components/WorkloadSplineChart';
import { FirmwareParetoCard } from '../components/SSDBentoWidgets';
import { BenchmarkDataTable } from '../components/BenchmarkDataTable';
import { GroupedComparisonBars, LatencyPercentileChart } from '../components/charts/VizLibrary';
import { PlaceholderSlot } from '../components/PlaceholderSlot';
import { Activity, Gauge, Layers, Zap } from 'lucide-react';

interface PerformanceSuitePageProps {
  suite: SubPageConfig;
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
  activeRun: BenchmarkRun | undefined;
  timeseries: PowerTimeseriesPoint[];
}

export const PerformanceSuitePage: React.FC<PerformanceSuitePageProps> = ({
  suite,
  model,
  models,
  firmware,
  firmwares,
  testItems,
  selectedTestId,
  onSelectFirmware,
  onJump,
  allRuns,
  runsForModel,
  runsForTest,
  activeRun,
  timeseries,
}) => {
  const currentTest = testItems.find((t) => t.id === selectedTestId);

  return (
    <div className="space-y-5">
      {/* Suite Header Banner */}
      <div className="bento-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono-num font-bold bg-[#00B4D8]/15 text-[#00B4D8] border border-[#00B4D8]/30">
              PERFORMANCE • {suite.shortLabel.toUpperCase()}
            </span>
            <span className="text-xs font-mono-num text-[var(--text-muted)]">
              {model.name} • {firmware.version}
            </span>
          </div>
          <h2 className="font-display text-xl font-bold text-[var(--text-primary)] mt-1">
            {suite.label}
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{suite.description}</p>
        </div>

        {/* 4 Quick Suite KPIs */}
        <div className="flex flex-wrap gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-card)]">
            <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
              <Activity className="w-3 h-3 text-[#00B4D8]" /> Bandwidth
            </div>
            <div className="font-mono-num text-base font-bold text-[var(--text-primary)]">
              {activeRun?.throughput_mbps.toLocaleString() ?? 0} MB/s
            </div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-card)]">
            <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#FF6B2C]" /> Peak IOPS
            </div>
            <div className="font-mono-num text-base font-bold text-[var(--text-primary)]">
              {activeRun ? `${(activeRun.iops / 1000).toFixed(1)}k` : '0'}
            </div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-card)]">
            <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
              <Gauge className="w-3 h-3 text-emerald-500" /> P99 Latency
            </div>
            <div className="font-mono-num text-base font-bold text-[var(--text-primary)]">
              {activeRun?.latency_p99_us ?? 0} µs
            </div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-card)]">
            <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
              <Zap className="w-3 h-3 text-[#A855F7]" /> Efficiency
            </div>
            <div className="font-mono-num text-base font-bold text-[var(--text-primary)]">
              {activeRun?.efficiency_mbps_per_w ?? 0} MB/s/W
            </div>
          </div>
        </div>
      </div>

      {/* Primary Charts */}
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

      {/* Secondary Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5">
          <FirmwareParetoCard
            firmwares={firmwares}
            runsForTest={runsForTest}
            selectedFirmwareId={firmware.id}
            onSelectFirmware={onSelectFirmware}
            testName={currentTest?.name || selectedTestId}
          />
        </div>
        <div className="lg:col-span-7">
          <GroupedComparisonBars runs={runsForModel} firmwares={firmwares} />
        </div>
      </div>

      {/* Full Interactive SQLite Data Table (Filter, Sort, Multi-Select, Column Arrange, CSV Export) */}
      <BenchmarkDataTable
        runs={allRuns}
        models={models}
        firmwares={firmwares}
        testItems={testItems}
        selectedModelId={model.id}
        onSelectRun={onJump}
      />

      {/* Extensible Placeholder Slots for Incremental Editing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <PlaceholderSlot
          slotId={`perf_${suite.id}_slot_1`}
          title={`${suite.shortLabel} — Sub-Test Breakdown`}
          description={`Reserved slot for ${suite.shortLabel} sub-item details (e.g. Queue Depth scaling or block-size sweep).`}
          plannedWidgets={['QD1–QD128 Curve', 'Block Size Matrix']}
        />
        <PlaceholderSlot
          slotId={`perf_${suite.id}_slot_2`}
          title={`${suite.shortLabel} — Host CPU & PCIe Overhead`}
          description="Reserved slot for host platform metrics, PCIe Gen5 lane utilization, and DMA ring stats."
          plannedWidgets={['PCIe Bandwidth %', 'IRQ / Core Load']}
        />
        <PlaceholderSlot
          slotId={`perf_${suite.id}_slot_3`}
          title={`${suite.shortLabel} — Golden Baseline Diff`}
          description="Reserved slot for automated regression diff against golden release firmware."
          plannedWidgets={['Delta Table', 'Pass/Fail Gate']}
        />
      </div>
    </div>
  );
};
