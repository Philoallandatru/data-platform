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
import { EfficiencyThermalRingsCard } from '../components/SSDBentoWidgets';
import { EfficiencyScatterPlot, ThermalHeatmapMatrix } from '../components/charts/VizLibrary';
import { PlaceholderSlot } from '../components/PlaceholderSlot';
import { BatteryCharging, Flame, Thermometer, Zap } from 'lucide-react';

interface PowerSuitePageProps {
  suite: SubPageConfig;
  model: SSDModel;
  firmware: FirmwareVersion;
  firmwares: FirmwareVersion[];
  testItems: TestItem[];
  selectedTestId: string;
  onJump: (fwId: string, testId: string) => void;
  runsForModel: BenchmarkRun[];
  runsForTest: BenchmarkRun[];
  activeRun: BenchmarkRun | undefined;
  timeseries: PowerTimeseriesPoint[];
}

export const PowerSuitePage: React.FC<PowerSuitePageProps> = ({
  suite,
  model,
  firmware,
  firmwares,
  testItems,
  selectedTestId,
  onJump,
  runsForModel,
  runsForTest,
  activeRun,
  timeseries,
}) => {
  const currentTest = testItems.find((t) => t.id === selectedTestId);

  return (
    <div className="space-y-5">
      {/* Power Suite Header */}
      <div className="bento-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono-num font-bold bg-[#A855F7]/15 text-[#A855F7] border border-[#A855F7]/30">
              POWER & THERMAL • {suite.shortLabel.toUpperCase()}
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

        <div className="flex flex-wrap gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-card)]">
            <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
              <Zap className="w-3 h-3 text-[#A855F7]" /> Avg Power
            </div>
            <div className="font-mono-num text-base font-bold text-[var(--text-primary)]">
              {activeRun?.power_avg_w ?? 0} W
            </div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-card)]">
            <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
              <BatteryCharging className="w-3 h-3 text-emerald-500" /> Peak Power
            </div>
            <div className="font-mono-num text-base font-bold text-[var(--text-primary)]">
              {activeRun?.power_peak_w ?? 0} W
            </div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-card)]">
            <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
              <Thermometer className="w-3 h-3 text-[#FF6B2C]" /> Ctrl / NAND
            </div>
            <div className="font-mono-num text-base font-bold text-[var(--text-primary)]">
              {activeRun?.temp_controller_c ?? 0}°C / {activeRun?.temp_nand_c ?? 0}°C
            </div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-card)]">
            <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
              <Flame className="w-3 h-3 text-[#FF4D2E]" /> Throttles
            </div>
            <div className="font-mono-num text-base font-bold text-[var(--text-primary)]">
              {activeRun?.throttle_events ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap + Scatter */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7">
          <ThermalHeatmapMatrix
            runs={runsForModel}
            firmwares={firmwares}
            testItems={testItems}
            onSelectCell={onJump}
          />
        </div>
        <div className="lg:col-span-5">
          <EfficiencyScatterPlot
            runs={runsForModel}
            firmwares={firmwares}
            testItems={testItems}
          />
        </div>
      </div>

      {/* 300s Trace + Composite Rings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8">
          <WorkloadSplineChart
            data={timeseries}
            firmwareLabel={firmware.version}
            testLabel={currentTest?.name || selectedTestId}
            modelLabel={model.name}
          />
        </div>
        <div className="lg:col-span-4">
          <EfficiencyThermalRingsCard
            run={activeRun}
            allRunsForTest={runsForTest}
            firmwareVersion={firmware.version}
          />
        </div>
      </div>

      {/* Extensible Power Placeholders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <PlaceholderSlot
          slotId={`power_${suite.id}_slot_1`}
          title="3.3V / 12V Rail Oscilloscope Trace"
          description="Reserved slot for high-frequency power rail transient waveform & inrush current peaks."
          plannedWidgets={['1ms Rail Waveform', 'Peak Current mA']}
        />
        <PlaceholderSlot
          slotId={`power_${suite.id}_slot_2`}
          title="ASPM L1.2 & NVMe PS0–PS4 Residency"
          description="Reserved slot for autonomous power state transition histogram and wake-up latency."
          plannedWidgets={['State Residency Pie', 'Wake-up CDF']}
        />
        <PlaceholderSlot
          slotId={`power_${suite.id}_slot_3`}
          title="Thermal Airflow & Heatsink Sweep"
          description="Reserved slot for 0 LFM / 200 LFM / 400 LFM airflow cooling curves."
          plannedWidgets={['Airflow Curves', 'Junction Limit']}
        />
      </div>
    </div>
  );
};
