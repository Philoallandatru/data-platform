import React, { useMemo, useState } from 'react';
import { TimeSeriesPoint } from '../data/radarData';
import { TrendingUp } from 'lucide-react';

interface TrafficSplineChartProps {
  data: TimeSeriesPoint[];
  regionLabel: string;
  rangeLabel: string;
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

export const TrafficSplineChart: React.FC<TrafficSplineChartProps> = ({
  data,
  regionLabel,
  rangeLabel,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [visibleSeries, setVisibleSeries] = useState({
    human: true,
    ai: true,
    ddos: true,
  });

  const width = 760;
  const height = 250;
  const padL = 42;
  const padR = 16;
  const padT = 18;
  const padB = 30;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const maxVal = useMemo(() => {
    let m = 10;
    data.forEach((d) => {
      if (visibleSeries.human) m = Math.max(m, d.humanTraffic);
      if (visibleSeries.ai) m = Math.max(m, d.aiCrawlers);
      if (visibleSeries.ddos) m = Math.max(m, d.ddosMitigated);
    });
    return Math.ceil(m * 1.15);
  }, [data, visibleSeries]);

  const toCoords = (getter: (d: TimeSeriesPoint) => number) =>
    data.map((d, i) => ({
      x: padL + (i / Math.max(1, data.length - 1)) * plotW,
      y: padT + plotH - (getter(d) / maxVal) * plotH,
    }));

  const humanPts = toCoords((d) => d.humanTraffic);
  const aiPts = toCoords((d) => d.aiCrawlers);
  const ddosPts = toCoords((d) => d.ddosMitigated);

  const buildArea = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    return `${buildSmoothPath(pts)} L ${pts[pts.length - 1].x} ${padT + plotH} L ${pts[0].x} ${padT + plotH} Z`;
  };

  const activePoint = hoverIdx !== null ? data[hoverIdx] : null;
  const activeX = hoverIdx !== null ? humanPts[hoverIdx]?.x : null;

  return (
    <div className="bento-card rounded-2xl p-5 flex flex-col justify-between h-full">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#00B4D8]" />
            <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
              Global Request Velocity & Automated Traffic
            </h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {regionLabel} • {rangeLabel} rolling window (Million req/sec)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(
            [
              { key: 'human', label: 'Human HTTP', color: '#00E5FF' },
              { key: 'ai', label: 'AI Crawlers', color: '#A855F7' },
              { key: 'ddos', label: 'DDoS Mitigated', color: '#FF4D2E' },
            ] as const
          ).map((s) => {
            const on = visibleSeries[s.key];
            return (
              <button
                key={s.key}
                onClick={() => setVisibleSeries((prev) => ({ ...prev, [s.key]: !prev[s.key] }))}
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

      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="gradHuman" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="gradAI" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A855F7" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#A855F7" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="gradDdos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF4D2E" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#FF4D2E" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Y gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
            const y = padT + plotH * (1 - t);
            const val = Math.round(maxVal * t);
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
                  {val}M
                </text>
              </g>
            );
          })}

          {/* Area + Line paths */}
          {visibleSeries.human && (
            <>
              <path d={buildArea(humanPts)} fill="url(#gradHuman)" />
              <path
                d={buildSmoothPath(humanPts)}
                fill="none"
                stroke="#00E5FF"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </>
          )}
          {visibleSeries.ai && (
            <>
              <path d={buildArea(aiPts)} fill="url(#gradAI)" />
              <path
                d={buildSmoothPath(aiPts)}
                fill="none"
                stroke="#A855F7"
                strokeWidth="2.1"
                strokeLinecap="round"
              />
            </>
          )}
          {visibleSeries.ddos && (
            <>
              <path d={buildArea(ddosPts)} fill="url(#gradDdos)" />
              <path
                d={buildSmoothPath(ddosPts)}
                fill="none"
                stroke="#FF4D2E"
                strokeWidth="2.1"
                strokeLinecap="round"
              />
            </>
          )}

          {/* X Axis Labels */}
          {data.map((d, i) => {
            if (i % 2 !== 0 && i !== data.length - 1) return null;
            return (
              <text
                key={d.time}
                x={humanPts[i].x}
                y={height - 6}
                textAnchor="middle"
                className="fill-slate-500 text-[10px] font-mono-num"
              >
                {d.time}
              </text>
            );
          })}

          {/* Crosshair & Hover Dots */}
          {hoverIdx !== null && activeX !== null && (
            <g>
              <line
                x1={activeX}
                y1={padT}
                x2={activeX}
                y2={padT + plotH}
                stroke="rgba(255,255,255,0.28)"
                strokeDasharray="3 3"
              />
              {visibleSeries.human && (
                <circle cx={humanPts[hoverIdx].x} cy={humanPts[hoverIdx].y} r="4.5" fill="#00E5FF" stroke="#05070B" strokeWidth="2" />
              )}
              {visibleSeries.ai && (
                <circle cx={aiPts[hoverIdx].x} cy={aiPts[hoverIdx].y} r="4.5" fill="#A855F7" stroke="#05070B" strokeWidth="2" />
              )}
              {visibleSeries.ddos && (
                <circle cx={ddosPts[hoverIdx].x} cy={ddosPts[hoverIdx].y} r="4.5" fill="#FF4D2E" stroke="#05070B" strokeWidth="2" />
              )}
            </g>
          )}

          {/* Invisible hover columns for smooth scrubbing */}
          {data.map((_, i) => {
            const colW = plotW / Math.max(1, data.length - 1);
            return (
              <rect
                key={i}
                x={humanPts[i].x - colW / 2}
                y={padT}
                width={colW}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
              />
            );
          })}
        </svg>

        {/* Floating Glassmorphic Tooltip */}
        {activePoint && hoverIdx !== null && (
          <div
            className="pointer-events-none absolute top-2 z-20 rounded-xl bg-[var(--bg-tooltip)] border border-[var(--border-subtle)] px-3 py-2 text-xs shadow-2xl backdrop-blur-xl"
            style={{
              left: `${Math.min(72, Math.max(6, (hoverIdx / (data.length - 1)) * 85))}%`,
            }}
          >
            <div className="font-mono-num text-[11px] font-semibold text-[var(--text-primary)] mb-1">
              {activePoint.time} UTC
            </div>
            {visibleSeries.human && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-[var(--text-secondary)]">Human HTTP</span>
                <span className="font-mono-num font-bold text-[#00B4D8]">{activePoint.humanTraffic}M/s</span>
              </div>
            )}
            {visibleSeries.ai && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-[var(--text-secondary)]">AI Crawlers</span>
                <span className="font-mono-num font-bold text-[#A855F7]">{activePoint.aiCrawlers}M/s</span>
              </div>
            )}
            {visibleSeries.ddos && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-[var(--text-secondary)]">DDoS Mitigated</span>
                <span className="font-mono-num font-bold text-[#FF4D2E]">{activePoint.ddosMitigated}M/s</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
