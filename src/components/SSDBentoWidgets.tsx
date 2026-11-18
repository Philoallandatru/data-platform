import React, { useState } from 'react';
import {
  BenchmarkRun,
  FirmwareVersion,
  RegressionAlert,
  TestItem,
} from '../types/ssd';
import { AlertTriangle, CheckCircle2, Gauge, Layers, Sparkles, Zap } from 'lucide-react';

interface FirmwareParetoCardProps {
  firmwares: FirmwareVersion[];
  runsForTest: BenchmarkRun[];
  selectedFirmwareId: string;
  onSelectFirmware: (fwId: string) => void;
  testName: string;
}

export const FirmwareParetoCard: React.FC<FirmwareParetoCardProps> = ({
  firmwares,
  runsForTest,
  selectedFirmwareId,
  onSelectFirmware,
  testName,
}) => {
  const [metric, setMetric] = useState<'throughput' | 'efficiency'>('throughput');
  const maxVal = Math.max(
    1,
    ...runsForTest.map((r) => (metric === 'throughput' ? r.throughput_mbps : r.efficiency_mbps_per_w))
  );

  return (
    <div className="bento-card rounded-2xl p-5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#A855F7]" />
          <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
            Firmware Comparison ({testName})
          </h3>
        </div>
        <div className="flex items-center bg-[var(--bg-subtle)] rounded-lg p-0.5 border border-[var(--border-card)]">
          <button
            onClick={() => setMetric('throughput')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold cursor-pointer transition ${
              metric === 'throughput'
                ? 'bg-[#00B4D8] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            MB/s
          </button>
          <button
            onClick={() => setMetric('efficiency')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold cursor-pointer transition ${
              metric === 'efficiency'
                ? 'bg-[#A855F7] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            MB/s/W
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {firmwares.map((fw) => {
          const run = runsForTest.find((r) => r.firmware_id === fw.id);
          if (!run) return null;
          const val = metric === 'throughput' ? run.throughput_mbps : run.efficiency_mbps_per_w;
          const pct = (val / maxVal) * 100;
          const isSelected = fw.id === selectedFirmwareId;
          const barColor =
            run.pass_status === 'REGRESSION'
              ? '#FF4D2E'
              : metric === 'efficiency'
              ? '#A855F7'
              : '#00E5FF';

          return (
            <button
              key={fw.id}
              onClick={() => onSelectFirmware(fw.id)}
              className={`w-full text-left p-2.5 rounded-xl border transition cursor-pointer ${
                isSelected
                  ? 'bg-[var(--bg-subtle-hover)] border-[#FF6B2C]/60 shadow-sm'
                  : 'bg-[var(--bg-subtle)] border-transparent hover:border-[var(--border-subtle)]'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono-num font-bold text-[var(--text-primary)]">
                    {fw.version}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--bg-subtle-hover)] text-[var(--text-secondary)]">
                    {fw.power_profile}
                  </span>
                </div>
                <div className="font-mono-num text-xs font-semibold text-[var(--text-primary)]">
                  {val.toLocaleString()} {metric === 'throughput' ? 'MB/s' : 'MB/s/W'}
                  <span className="ml-2 text-[10px] text-[var(--text-muted)]">({run.power_avg_w}W)</span>
                </div>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[var(--chart-grid)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: barColor,
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface EfficiencyThermalRingsCardProps {
  run: BenchmarkRun | undefined;
  allRunsForTest: BenchmarkRun[];
  firmwareVersion: string;
}

export const EfficiencyThermalRingsCard: React.FC<EfficiencyThermalRingsCardProps> = ({
  run,
  allRunsForTest,
  firmwareVersion,
}) => {
  const [activeIdx, setActiveIdx] = useState(0);

  const maxTp = Math.max(1, ...allRunsForTest.map((r) => r.throughput_mbps));
  const maxEff = Math.max(1, ...allRunsForTest.map((r) => r.efficiency_mbps_per_w));
  const minLat = Math.min(...allRunsForTest.map((r) => r.latency_p99_us));

  const perfScore = run ? Math.min(100, Math.round((run.throughput_mbps / maxTp) * 100)) : 0;
  const effScore = run ? Math.min(100, Math.round((run.efficiency_mbps_per_w / maxEff) * 100)) : 0;
  const latScore = run ? Math.min(100, Math.round((minLat / Math.max(1, run.latency_p99_us)) * 100)) : 0;
  const thermalScore = run ? Math.max(15, Math.min(100, Math.round(((95 - run.temp_controller_c) / 55) * 100))) : 0;

  const rings = [
    { name: 'Perf Index', value: perfScore, color: '#00E5FF', detail: `${run?.throughput_mbps.toLocaleString() ?? 0} MB/s` },
    { name: 'Power Eff', value: effScore, color: '#A855F7', detail: `${run?.efficiency_mbps_per_w ?? 0} MB/s/W` },
    { name: 'P99 Score', value: latScore, color: '#10B981', detail: `${run?.latency_p99_us ?? 0} µs P99` },
    { name: 'Thermal Margin', value: thermalScore, color: '#FF6B2C', detail: `${run?.temp_controller_c ?? 0}°C Ctrl` },
  ];

  const active = rings[activeIdx];

  return (
    <div className="bento-card rounded-2xl p-5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-[#00B4D8]" />
          <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
            Composite Score ({firmwareVersion})
          </h3>
        </div>
        <span className="text-[11px] font-mono-num text-[var(--text-muted)]">NORMALIZED</span>
      </div>

      <div className="flex items-center gap-4 my-auto">
        <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
            {rings.map((m, idx) => {
              const r = 56 - idx * 10;
              const circ = 2 * Math.PI * r;
              const dash = (m.value / 100) * circ;
              const isSelected = idx === activeIdx;
              return (
                <g key={m.name} className="cursor-pointer" onMouseEnter={() => setActiveIdx(idx)}>
                  <circle cx="70" cy="70" r={r} fill="none" stroke="var(--chart-grid)" strokeWidth="6.5" />
                  <circle
                    cx="70"
                    cy="70"
                    r={r}
                    fill="none"
                    stroke={m.color}
                    strokeWidth={isSelected ? '7.5' : '6'}
                    strokeDasharray={`${dash} ${circ}`}
                    strokeLinecap="round"
                    style={{ opacity: isSelected ? 1 : 0.65, transition: 'all 0.3s ease' }}
                  />
                </g>
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-mono-num text-lg font-bold text-[var(--text-primary)]">{active.value}%</span>
            <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">{active.name}</span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          {rings.map((m, idx) => (
            <button
              key={m.name}
              onMouseEnter={() => setActiveIdx(idx)}
              onClick={() => setActiveIdx(idx)}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg border transition cursor-pointer flex items-center justify-between ${
                idx === activeIdx
                  ? 'bg-[var(--bg-subtle-hover)] border-[var(--border-subtle)]'
                  : 'bg-transparent border-transparent hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                <span className="text-xs font-medium text-[var(--text-primary)] truncate">{m.name}</span>
              </div>
              <span className="font-mono-num text-xs font-semibold text-[var(--text-primary)] shrink-0">
                {m.value}%
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-[var(--border-card)] text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
        <span>Active Metric Detail</span>
        <span className="font-mono-num font-semibold text-[#00B4D8]">{active.detail}</span>
      </div>
    </div>
  );
};

interface WorkloadMatrixCardProps {
  testItems: TestItem[];
  runsForFirmware: BenchmarkRun[];
  selectedTestId: string;
  onSelectTest: (testId: string) => void;
}

export const WorkloadMatrixCard: React.FC<WorkloadMatrixCardProps> = ({
  testItems,
  runsForFirmware,
  selectedTestId,
  onSelectTest,
}) => {
  return (
    <div className="bento-card rounded-2xl p-5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#FF6B2C]" />
          <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
            All Test Workloads Matrix ({testItems.length} Tests)
          </h3>
        </div>
        <span className="text-[11px] text-[var(--text-muted)]">Click row to inspect</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-card)] text-[10px] font-mono-num uppercase text-[var(--text-muted)]">
              <th className="pb-2 pr-3">Test Item</th>
              <th className="pb-2 px-2 text-right">Bandwidth</th>
              <th className="pb-2 px-2 text-right">IOPS</th>
              <th className="pb-2 px-2 text-right">P99 Lat</th>
              <th className="pb-2 px-2 text-right">Power</th>
              <th className="pb-2 pl-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-card)] text-xs">
            {testItems.map((t) => {
              const run = runsForFirmware.find((r) => r.test_id === t.id);
              const isSelected = t.id === selectedTestId;
              return (
                <tr
                  key={t.id}
                  onClick={() => onSelectTest(t.id)}
                  className={`cursor-pointer transition ${
                    isSelected ? 'bg-[#FF6B2C]/10' : 'hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  <td className="py-2 pr-3">
                    <div className="font-semibold text-[var(--text-primary)]">{t.name}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      {t.block_size} • QD{t.queue_depth} • {t.rw_mix}
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right font-mono-num font-semibold text-[#00B4D8]">
                    {run ? `${run.throughput_mbps.toLocaleString()}` : '-'}
                  </td>
                  <td className="py-2 px-2 text-right font-mono-num text-[var(--text-primary)]">
                    {run ? `${(run.iops / 1000).toFixed(0)}k` : '-'}
                  </td>
                  <td className="py-2 px-2 text-right font-mono-num text-[var(--text-secondary)]">
                    {run ? `${run.latency_p99_us}µs` : '-'}
                  </td>
                  <td className="py-2 px-2 text-right font-mono-num text-[#A855F7]">
                    {run ? `${run.power_avg_w}W` : '-'}
                  </td>
                  <td className="py-2 pl-2 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        run?.pass_status === 'REGRESSION'
                          ? 'bg-[#FF4D2E]/15 text-[#FF4D2E] border-[#FF4D2E]/30'
                          : run?.pass_status === 'WARN'
                          ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                          : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                      }`}
                    >
                      {run?.pass_status ?? 'N/A'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface RegressionAlertsCardProps {
  alerts: RegressionAlert[];
  onJumpToAlert: (firmwareId: string, testId: string) => void;
}

export const RegressionAlertsCard: React.FC<RegressionAlertsCardProps> = ({
  alerts,
  onJumpToAlert,
}) => {
  return (
    <div className="bento-card rounded-2xl p-5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
            Automated Firmware Findings
          </h3>
        </div>
        <span className="text-[11px] text-[var(--text-muted)]">SQLite regression_alerts</span>
      </div>

      <div className="space-y-2.5">
        {alerts.map((a) => {
          const badge =
            a.severity === 'critical'
              ? 'bg-[#FF4D2E]/15 text-[#FF4D2E] border-[#FF4D2E]/30'
              : a.severity === 'warning'
              ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
              : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';

          return (
            <button
              key={a.id}
              onClick={() => onJumpToAlert(a.firmware_id, a.test_id)}
              className="w-full text-left p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-card)] hover:border-[var(--border-subtle)] hover:bg-[var(--bg-subtle-hover)] transition cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                  {a.severity === 'improvement' ? (
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}
                  {a.title}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono-num font-semibold border shrink-0 ${badge}`}>
                  {a.delta_metric}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)] leading-relaxed">{a.detail}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
