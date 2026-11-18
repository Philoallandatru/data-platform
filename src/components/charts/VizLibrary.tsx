import React, { useMemo, useState } from 'react';
import { BenchmarkRun, FirmwareVersion, TestItem } from '../../types/ssd';
import { Activity, BarChart3, Flame, Grid, Radar as RadarIcon, ScatterChart } from 'lucide-react';

/* 1. Multi-Axis Firmware Radar / Spider Chart */
export const FirmwareRadarChart: React.FC<{
  runs: BenchmarkRun[];
  firmwares: FirmwareVersion[];
}> = ({ runs, firmwares }) => {
  const axes = [
    { id: 'SEQ_128K_Q32_R', label: 'Seq Read' },
    { id: 'SEQ_128K_Q32_W', label: 'Seq Write' },
    { id: 'RAND_4K_Q64T8_R', label: '4K Peak IOPS' },
    { id: 'MIXED_70R_30W', label: 'Mixed OLTP' },
    { id: 'ZNS_APPEND', label: 'ZNS Append' },
    { id: 'RAND_4K_Q1T1_R', label: 'Low-QD 4K' },
  ];

  const compareIds = ['fw-104', 'fw-142', 'fw-213'];
  const colors: Record<string, string> = {
    'fw-104': '#94A3B8',
    'fw-142': '#A855F7',
    'fw-213': '#00E5FF',
  };

  const cx = 150;
  const cy = 125;
  const maxR = 85;

  const maxPerAxis = useMemo(() => {
    const map: Record<string, number> = {};
    axes.forEach((ax) => {
      map[ax.id] = Math.max(1, ...runs.filter((r) => r.test_id === ax.id).map((r) => r.throughput_mbps));
    });
    return map;
  }, [runs]);

  const getPoint = (axisIdx: number, ratio: number) => {
    const angle = (axisIdx / axes.length) * Math.PI * 2 - Math.PI / 2;
    return {
      x: cx + Math.cos(angle) * maxR * ratio,
      y: cy + Math.sin(angle) * maxR * ratio,
    };
  };

  return (
    <div className="bento-card rounded-2xl p-5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <RadarIcon className="w-4 h-4 text-[#00B4D8]" />
          <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
            6-Axis Firmware Radar Profile
          </h3>
        </div>
        <div className="flex items-center gap-2.5 text-[10px] font-mono-num">
          {compareIds.map((id) => {
            const fw = firmwares.find((f) => f.id === id);
            return (
              <span key={id} className="flex items-center gap-1 text-[var(--text-secondary)]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[id] }} />
                {fw?.version.replace('FW ', '')}
              </span>
            );
          })}
        </div>
      </div>

      <svg viewBox="0 0 300 255" className="w-full max-h-[250px] mx-auto overflow-visible">
        {[0.25, 0.5, 0.75, 1].map((ring) => {
          const pts = axes.map((_, i) => {
            const p = getPoint(i, ring);
            return `${p.x},${p.y}`;
          }).join(' ');
          return (
            <polygon
              key={ring}
              points={pts}
              fill="none"
              stroke="var(--chart-grid)"
              strokeWidth="1"
            />
          );
        })}

        {axes.map((ax, i) => {
          const end = getPoint(i, 1);
          const lbl = getPoint(i, 1.2);
          return (
            <g key={ax.id}>
              <line x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="var(--chart-grid)" strokeWidth="1" />
              <text
                x={lbl.x}
                y={lbl.y + 3}
                textAnchor="middle"
                className="fill-[var(--text-secondary)] text-[9px] font-mono-num"
              >
                {ax.label}
              </text>
            </g>
          );
        })}

        {compareIds.map((fwId) => {
          const pts = axes
            .map((ax, i) => {
              const r = runs.find((run) => run.firmware_id === fwId && run.test_id === ax.id);
              const ratio = r ? Math.max(0.2, r.throughput_mbps / maxPerAxis[ax.id]) : 0.3;
              const p = getPoint(i, ratio);
              return `${p.x},${p.y}`;
            })
            .join(' ');
          return (
            <polygon
              key={fwId}
              points={pts}
              fill={`${colors[fwId]}28`}
              stroke={colors[fwId]}
              strokeWidth="2"
            />
          );
        })}
      </svg>
    </div>
  );
};

/* 2. Power vs Performance Scatter / Bubble Quadrant */
export const EfficiencyScatterPlot: React.FC<{
  runs: BenchmarkRun[];
  firmwares: FirmwareVersion[];
  testItems: TestItem[];
}> = ({ runs, firmwares, testItems }) => {
  const [hovered, setHovered] = useState<BenchmarkRun | null>(null);

  const w = 420;
  const h = 230;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const pw = w - padL - padR;
  const ph = h - padT - padB;

  const maxPwr = Math.max(12, ...runs.map((r) => r.power_avg_w)) * 1.08;
  const maxTp = Math.max(1000, ...runs.map((r) => r.throughput_mbps)) * 1.1;

  return (
    <div className="bento-card rounded-2xl p-5 flex flex-col justify-between h-full relative">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ScatterChart className="w-4 h-4 text-[#A855F7]" />
          <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
            Power vs Throughput Bubble Quadrant
          </h3>
        </div>
        <span className="text-[10px] font-mono-num text-[var(--text-muted)]">
          X: Watts • Y: MB/s
        </span>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto overflow-visible">
          {/* Quadrant Grid */}
          {[0.25, 0.5, 0.75, 1].map((t) => (
            <line
              key={t}
              x1={padL}
              y1={padT + ph * (1 - t)}
              x2={w - padR}
              y2={padT + ph * (1 - t)}
              stroke="var(--chart-grid)"
              strokeDasharray="3 3"
            />
          ))}
          <line x1={padL} y1={padT} x2={padL} y2={padT + ph} stroke="var(--border-subtle)" />
          <line x1={padL} y1={padT + ph} x2={w - padR} y2={padT + ph} stroke="var(--border-subtle)" />

          <text x={padL + pw / 2} y={h - 4} textAnchor="middle" className="fill-[var(--text-muted)] text-[9px] font-mono-num">
            Average Power Draw (Watts) →
          </text>
          <text x={padL - 6} y={padT + 8} textAnchor="end" className="fill-[var(--text-muted)] text-[9px] font-mono-num">
            {Math.round(maxTp / 1000)}G
          </text>

          {runs.map((r) => {
            const x = padL + (r.power_avg_w / maxPwr) * pw;
            const y = padT + ph - (r.throughput_mbps / maxTp) * ph;
            const radius = Math.max(3.5, Math.min(10, r.efficiency_mbps_per_w / 220));
            const color =
              r.pass_status === 'REGRESSION'
                ? '#FF4D2E'
                : r.firmware_id === 'fw-213'
                ? '#10B981'
                : r.firmware_id === 'fw-142'
                ? '#A855F7'
                : '#00E5FF';
            return (
              <circle
                key={r.id}
                cx={x}
                cy={y}
                r={hovered?.id === r.id ? radius + 2.5 : radius}
                fill={color}
                fillOpacity={0.72}
                stroke="var(--bg-page)"
                strokeWidth="1"
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHovered(r)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        </svg>

        {hovered && (
          <div className="pointer-events-none absolute top-2 right-2 z-20 rounded-xl bg-[var(--bg-tooltip)] border border-[var(--border-subtle)] px-3 py-2 text-[11px] shadow-xl backdrop-blur-md">
            <div className="font-mono-num font-bold text-[var(--text-primary)]">
              {firmwares.find((f) => f.id === hovered.firmware_id)?.version}
            </div>
            <div className="text-[var(--text-secondary)]">
              {testItems.find((t) => t.id === hovered.test_id)?.name}
            </div>
            <div className="font-mono-num mt-1 text-[#00B4D8]">
              {hovered.throughput_mbps.toLocaleString()} MB/s @ {hovered.power_avg_w}W
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* 3. Tail Latency Range Chart (Avg -> P99 -> P99.9) */
export const LatencyPercentileChart: React.FC<{
  runsForTest: BenchmarkRun[];
  firmwares: FirmwareVersion[];
}> = ({ runsForTest, firmwares }) => {
  const maxP999 = Math.max(100, ...runsForTest.map((r) => r.latency_p999_us));

  return (
    <div className="bento-card rounded-2xl p-5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500" />
          <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
            Tail Latency Spread (Avg → P99 → P99.9)
          </h3>
        </div>
        <span className="text-[10px] font-mono-num text-[var(--text-muted)]">Lower is better (µs)</span>
      </div>

      <div className="space-y-3">
        {firmwares.map((fw) => {
          const r = runsForTest.find((run) => run.firmware_id === fw.id);
          if (!r) return null;
          const avgPct = (r.latency_avg_us / maxP999) * 100;
          const p99Pct = (r.latency_p99_us / maxP999) * 100;
          const p999Pct = (r.latency_p999_us / maxP999) * 100;

          return (
            <div key={fw.id} className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono-num">
                <span className="font-semibold text-[var(--text-primary)]">{fw.version}</span>
                <span className="text-[var(--text-secondary)]">
                  {r.latency_avg_us} / <strong className="text-[#00B4D8]">{r.latency_p99_us}</strong> /{' '}
                  <strong className="text-[#FF6B2C]">{r.latency_p999_us}µs</strong>
                </span>
              </div>
              <div className="relative h-2.5 rounded-full bg-[var(--chart-grid)] overflow-hidden">
                {/* P99.9 whisker */}
                <div
                  className="absolute top-0 bottom-0 rounded-full bg-[#FF6B2C]/45"
                  style={{ left: `${avgPct}%`, width: `${Math.max(2, p999Pct - avgPct)}%` }}
                />
                {/* P99 bar */}
                <div
                  className="absolute top-0 bottom-0 rounded-full bg-[#00E5FF]"
                  style={{ left: 0, width: `${p99Pct}%` }}
                />
                {/* Avg marker */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-emerald-400"
                  style={{ left: `${avgPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* 4. Full 6x10 Thermal & Power Heatmap Matrix */
export const ThermalHeatmapMatrix: React.FC<{
  runs: BenchmarkRun[];
  firmwares: FirmwareVersion[];
  testItems: TestItem[];
  onSelectCell: (fwId: string, testId: string) => void;
}> = ({ runs, firmwares, testItems, onSelectCell }) => {
  const [mode, setMode] = useState<'temp' | 'power' | 'eff'>('temp');
  const [hovered, setHovered] = useState<BenchmarkRun | null>(null);

  const getCellColor = (r: BenchmarkRun) => {
    if (mode === 'temp') {
      const t = Math.min(1, Math.max(0, (r.temp_controller_c - 35) / 48));
      return t > 0.78
        ? 'rgba(255, 77, 46, 0.78)'
        : t > 0.55
        ? 'rgba(245, 158, 11, 0.58)'
        : 'rgba(16, 185, 129, 0.45)';
    }
    if (mode === 'power') {
      const p = Math.min(1, r.power_avg_w / 12);
      return `rgba(168, 85, 247, ${0.18 + p * 0.72})`;
    }
    const e = Math.min(1, r.efficiency_mbps_per_w / 2000);
    return `rgba(0, 229, 255, ${0.15 + e * 0.75})`;
  };

  return (
    <div className="bento-card rounded-2xl p-5 flex flex-col justify-between h-full">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-[#FF6B2C]" />
          <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
            Firmware × Workload Heatmap Matrix
          </h3>
        </div>
        <div className="flex items-center gap-1 bg-[var(--bg-subtle)] p-0.5 rounded-lg border border-[var(--border-card)]">
          {(
            [
              { id: 'temp', label: 'Temp °C' },
              { id: 'power', label: 'Power W' },
              { id: 'eff', label: 'MB/s/W' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold cursor-pointer transition ${
                mode === m.id
                  ? 'bg-[#FF6B2C] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[540px]">
          <div className="grid grid-cols-11 gap-1 text-[9px] font-mono-num text-[var(--text-muted)] mb-1">
            <div />
            {testItems.map((t) => (
              <div key={t.id} className="truncate text-center" title={t.name}>
                {t.name.split(' ')[0]}
              </div>
            ))}
          </div>
          {firmwares.map((fw) => (
            <div key={fw.id} className="grid grid-cols-11 gap-1 mb-1 items-center">
              <div className="text-[10px] font-mono-num font-semibold text-[var(--text-primary)] truncate">
                {fw.version.replace('FW ', '')}
              </div>
              {testItems.map((t) => {
                const r = runs.find((run) => run.firmware_id === fw.id && run.test_id === t.id);
                if (!r) return <div key={t.id} className="h-7 rounded bg-[var(--bg-subtle)]" />;
                const label =
                  mode === 'temp'
                    ? `${Math.round(r.temp_controller_c)}°`
                    : mode === 'power'
                    ? `${r.power_avg_w.toFixed(1)}`
                    : `${Math.round(r.efficiency_mbps_per_w)}`;
                return (
                  <button
                    key={t.id}
                    onClick={() => onSelectCell(fw.id, t.id)}
                    onMouseEnter={() => setHovered(r)}
                    onMouseLeave={() => setHovered(null)}
                    className="h-7 rounded text-[10px] font-mono-num font-semibold text-white flex items-center justify-center hover:ring-2 hover:ring-white transition cursor-pointer"
                    style={{ backgroundColor: getCellColor(r) }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-[var(--border-card)] text-[11px] font-mono-num text-[var(--text-secondary)] flex items-center justify-between">
        <span>
          {hovered
            ? `${firmwares.find((f) => f.id === hovered.firmware_id)?.version} • ${
                testItems.find((t) => t.id === hovered.test_id)?.name
              }`
            : 'Hover or click any cell to inspect'}
        </span>
        <span className="text-[#00B4D8]">
          {hovered
            ? `${hovered.throughput_mbps.toLocaleString()} MB/s | ${hovered.power_avg_w}W | ${hovered.temp_controller_c}°C`
            : '60 Matrix Cells'}
        </span>
      </div>
    </div>
  );
};

/* 5. Grouped Multi-Firmware Bar Comparison */
export const GroupedComparisonBars: React.FC<{
  runs: BenchmarkRun[];
  firmwares: FirmwareVersion[];
}> = ({ runs, firmwares }) => {
  const targetTests = [
    { id: 'SEQ_128K_Q32_R', label: 'Seq Read' },
    { id: 'SEQ_128K_Q32_W', label: 'Seq Write' },
    { id: 'ZNS_APPEND', label: 'ZNS Append' },
    { id: 'RAND_4K_Q64T8_R', label: '4K Q64T8' },
  ];
  const targetFws = [
    { id: 'fw-104', color: '#64748B' },
    { id: 'fw-142', color: '#A855F7' },
    { id: 'fw-200', color: '#00E5FF' },
    { id: 'fw-213', color: '#10B981' },
  ];
  const maxTp = Math.max(1, ...runs.map((r) => r.throughput_mbps));

  return (
    <div className="bento-card rounded-2xl p-5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#00B4D8]" />
          <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
            Multi-Firmware Grouped Throughput
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono-num">
          {targetFws.map((f) => (
            <span key={f.id} className="flex items-center gap-1 text-[var(--text-secondary)]">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: f.color }} />
              {firmwares.find((fw) => fw.id === f.id)?.version.replace('FW ', '')}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 items-end h-[180px] pt-4">
        {targetTests.map((t) => (
          <div key={t.id} className="flex flex-col items-center h-full justify-end">
            <div className="flex items-end gap-1.5 h-[145px] w-full justify-center">
              {targetFws.map((f) => {
                const r = runs.find((run) => run.test_id === t.id && run.firmware_id === f.id);
                const hPct = r ? Math.max(8, (r.throughput_mbps / maxTp) * 100) : 10;
                return (
                  <div
                    key={f.id}
                    title={`${firmwares.find((fw) => fw.id === f.id)?.version}: ${r?.throughput_mbps.toLocaleString()} MB/s`}
                    className="w-3.5 rounded-t-md transition-all duration-500 hover:opacity-80"
                    style={{ height: `${hPct}%`, backgroundColor: f.color }}
                  />
                );
              })}
            </div>
            <span className="mt-2 text-[10px] font-mono-num text-[var(--text-secondary)] text-center">
              {t.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* 6. Proportional Power & IOPS Treemap Blocks */
export const WorkloadShareTreemap: React.FC<{
  runsForFirmware: BenchmarkRun[];
  testItems: TestItem[];
  onSelectTest: (testId: string) => void;
}> = ({ runsForFirmware, testItems, onSelectTest }) => {
  const palette = ['#00B4D8', '#A855F7', '#FF6B2C', '#10B981', '#3B82F6', '#F59E0B'];
  const sorted = [...runsForFirmware]
    .sort((a, b) => b.throughput_mbps - a.throughput_mbps)
    .slice(0, 6);

  return (
    <div className="bento-card rounded-2xl p-5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Grid className="w-4 h-4 text-[#FF6B2C]" />
          <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
            Workload Bandwidth Treemap
          </h3>
        </div>
        <span className="text-[10px] font-mono-num text-[var(--text-muted)]">Top 6 Workloads</span>
      </div>

      <div className="grid grid-cols-6 grid-rows-2 gap-2 h-[180px]">
        {sorted.map((r, idx) => {
          const t = testItems.find((item) => item.id === r.test_id);
          const spanClass =
            idx === 0
              ? 'col-span-3 row-span-2'
              : idx === 1
              ? 'col-span-3 row-span-1'
              : idx === 2
              ? 'col-span-2 row-span-1'
              : 'col-span-1 row-span-1';
          const bg = palette[idx % palette.length];
          return (
            <button
              key={r.id}
              onClick={() => onSelectTest(r.test_id)}
              className={`${spanClass} rounded-xl p-2.5 text-left flex flex-col justify-between text-white transition hover:scale-[1.02] cursor-pointer overflow-hidden`}
              style={{ background: `linear-gradient(135deg, ${bg}DD, ${bg}88)` }}
            >
              <span className="text-[10px] font-semibold truncate">{t?.name}</span>
              <div>
                <div className="font-mono-num text-xs font-bold">
                  {r.throughput_mbps >= 1000
                    ? `${(r.throughput_mbps / 1000).toFixed(1)} GB/s`
                    : `${r.throughput_mbps} MB/s`}
                </div>
                <div className="font-mono-num text-[9px] opacity-85">{r.power_avg_w}W</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
