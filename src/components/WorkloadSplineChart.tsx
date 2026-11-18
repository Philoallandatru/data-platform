import React, { useMemo, useState } from 'react';
import { PowerTimeseriesPoint } from '../types/ssd';
import { Activity } from 'lucide-react';

interface WorkloadSplineChartProps {
  data: PowerTimeseriesPoint[];
  firmwareLabel: string;
  testLabel: string;
  modelLabel: string;
}

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

export const WorkloadSplineChart: React.FC<WorkloadSplineChartProps> = ({
  data,
  firmwareLabel,
  testLabel,
  modelLabel,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [visible, setVisible] = useState({
    throughput: true,
    power: true,
    temp: true,
  });

  const width = 760;
  const height = 250;
  const padL = 52;
  const padR = 18;
  const padT = 18;
  const padB = 30;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const { maxTp, maxPwr, maxTemp } = useMemo(() => {
    const tp = Math.max(100, ...data.map((d) => d.throughput_mbps)) * 1.15;
    const pw = Math.max(2, ...data.map((d) => d.power_w)) * 1.25;
    const tc = Math.max(50, ...data.map((d) => d.temp_c)) * 1.15;
    return { maxTp: tp, maxPwr: pw, maxTemp: tc };
  }, [data]);

  const toCoords = (getter: (d: PowerTimeseriesPoint) => number, maxVal: number) =>
    data.map((d, i) => ({
      x: padL + (i / Math.max(1, data.length - 1)) * plotW,
      y: padT + plotH - (getter(d) / maxVal) * plotH,
    }));

  const tpPts = toCoords((d) => d.throughput_mbps, maxTp);
  const pwrPts = toCoords((d) => d.power_w, maxPwr);
  const tempPts = toCoords((d) => d.temp_c, maxTemp);

  const buildArea = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    return `${buildSmoothPath(pts)} L ${pts[pts.length - 1].x} ${padT + plotH} L ${pts[0].x} ${padT + plotH} Z`;
  };

  const activePoint = hoverIdx !== null ? data[hoverIdx] : null;
  const activeX = hoverIdx !== null ? tpPts[hoverIdx]?.x : null;

  return (
    <div className="bento-card rounded-2xl p-5 flex flex-col justify-between h-full">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#00B4D8]" />
            <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
              300s Sustained Performance, Power & Thermal Trace
            </h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {modelLabel} • {firmwareLabel} • {testLabel}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(
            [
              { key: 'throughput', label: 'Bandwidth (MB/s)', color: '#00E5FF' },
              { key: 'power', label: 'Power (W)', color: '#A855F7' },
              { key: 'temp', label: 'Ctrl Temp (°C)', color: '#FF6B2C' },
            ] as const
          ).map((s) => {
            const on = visible[s.key];
            return (
              <button
                key={s.key}
                onClick={() => setVisible((p) => ({ ...p, [s.key]: !p[s.key] }))}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition cursor-pointer ${
                  on
                    ? 'bg-[var(--bg-subtle-hover)] border-[var(--border-subtle)] text-[var(--text-primary)]'
                    : 'bg-transparent border-[var(--border-card)] text-[var(--text-muted)] opacity-60'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-xs text-[var(--text-muted)]">
          No time-series trace recorded for this workload; select a sustained workload (e.g. Seq 128K, Rand 4K Q64T8, Mixed 70R/30W, SLC Exhaust, Thermal 75°C).
        </div>
      ) : (
        <div className="relative w-full">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto overflow-visible select-none"
            onMouseLeave={() => setHoverIdx(null)}
          >
            <defs>
              <linearGradient id="gradTp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.30" />
                <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="gradPwr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A855F7" stopOpacity="0.24" />
                <stop offset="100%" stopColor="#A855F7" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="gradTemp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF6B2C" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#FF6B2C" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
              const y = padT + plotH * (1 - t);
              const val = Math.round(maxTp * t);
              return (
                <g key={i}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={width - padR}
                    y2={y}
                    stroke="var(--chart-grid)"
                    strokeDasharray="3 4"
                  />
                  <text
                    x={padL - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-[var(--text-muted)] text-[10px] font-mono-num"
                  >
                    {val >= 1000 ? `${(val / 1000).toFixed(1)}G` : val}
                  </text>
                </g>
              );
            })}

            {visible.throughput && (
              <>
                <path d={buildArea(tpPts)} fill="url(#gradTp)" />
                <path d={buildSmoothPath(tpPts)} fill="none" stroke="#00E5FF" strokeWidth="2.4" strokeLinecap="round" />
              </>
            )}
            {visible.power && (
              <>
                <path d={buildArea(pwrPts)} fill="url(#gradPwr)" />
                <path d={buildSmoothPath(pwrPts)} fill="none" stroke="#A855F7" strokeWidth="2.1" strokeLinecap="round" />
              </>
            )}
            {visible.temp && (
              <>
                <path d={buildArea(tempPts)} fill="url(#gradTemp)" />
                <path d={buildSmoothPath(tempPts)} fill="none" stroke="#FF6B2C" strokeWidth="2.1" strokeLinecap="round" />
              </>
            )}

            {data.map((d, i) => {
              if (i % 3 !== 0 && i !== data.length - 1) return null;
              return (
                <text
                  key={d.elapsed_sec}
                  x={tpPts[i].x}
                  y={height - 6}
                  textAnchor="middle"
                  className="fill-[var(--text-muted)] text-[10px] font-mono-num"
                >
                  {d.elapsed_sec}s
                </text>
              );
            })}

            {hoverIdx !== null && activeX !== null && (
              <g>
                <line x1={activeX} y1={padT} x2={activeX} y2={padT + plotH} stroke="var(--text-muted)" strokeDasharray="3 3" />
                {visible.throughput && (
                  <circle cx={tpPts[hoverIdx].x} cy={tpPts[hoverIdx].y} r="4.5" fill="#00E5FF" stroke="var(--bg-page)" strokeWidth="2" />
                )}
                {visible.power && (
                  <circle cx={pwrPts[hoverIdx].x} cy={pwrPts[hoverIdx].y} r="4.5" fill="#A855F7" stroke="var(--bg-page)" strokeWidth="2" />
                )}
                {visible.temp && (
                  <circle cx={tempPts[hoverIdx].x} cy={tempPts[hoverIdx].y} r="4.5" fill="#FF6B2C" stroke="var(--bg-page)" strokeWidth="2" />
                )}
              </g>
            )}

            {data.map((_, i) => {
              const colW = plotW / Math.max(1, data.length - 1);
              return (
                <rect
                  key={i}
                  x={tpPts[i].x - colW / 2}
                  y={padT}
                  width={colW}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(i)}
                />
              );
            })}
          </svg>

          {activePoint && hoverIdx !== null && (
            <div
              className="pointer-events-none absolute top-2 z-20 rounded-xl bg-[var(--bg-tooltip)] border border-[var(--border-subtle)] px-3 py-2 text-xs shadow-2xl backdrop-blur-xl"
              style={{
                left: `${Math.min(72, Math.max(6, (hoverIdx / Math.max(1, data.length - 1)) * 85))}%`,
              }}
            >
              <div className="font-mono-num text-[11px] font-semibold text-[var(--text-primary)] mb-1">
                T + {activePoint.elapsed_sec}s
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[var(--text-secondary)]">Bandwidth</span>
                <span className="font-mono-num font-bold text-[#00B4D8]">
                  {activePoint.throughput_mbps.toLocaleString()} MB/s
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[var(--text-secondary)]">Power Draw</span>
                <span className="font-mono-num font-bold text-[#A855F7]">{activePoint.power_w} W</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[var(--text-secondary)]">Ctrl Temp</span>
                <span className="font-mono-num font-bold text-[#FF6B2C]">{activePoint.temp_c}°C</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[var(--text-secondary)]">P99 Latency</span>
                <span className="font-mono-num font-bold text-emerald-500">{activePoint.latency_p99_us} µs</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
