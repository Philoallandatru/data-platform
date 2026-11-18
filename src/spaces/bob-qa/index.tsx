import React from 'react';
import { useSemanticQuery } from '../../hooks/useSemanticQuery';
import { Flame } from 'lucide-react';

interface TraceRow {
  firmware: string;
  trace_count: number;
  avg_latency_us: number;
  avg_power_mw: number;
  max_temp_c: number;
}

const BobSpace: React.FC = () => {
  const { data, loading, error } = useSemanticQuery<TraceRow>({
    dataset: 'raw_io_traces',
    metrics: ['trace_count', 'avg_latency_us', 'avg_power_mw', 'max_temp_c'],
    groupBy: ['firmware'],
    orderBy: { field: 'avg_latency_us', dir: 'asc' },
  });

  if (loading) {
    return (
      <div className="bento-card rounded-2xl p-6 text-xs font-mono-num text-[var(--text-muted)]">
        Querying 1.35M-row raw_io_traces...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bento-card rounded-2xl p-6 text-xs text-[#FF4D2E] font-mono-num">
        {error}
      </div>
    );
  }

  const rows = data?.rows ?? [];

  return (
    <div className="space-y-5">
      <div className="bento-card rounded-2xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Flame className="w-5 h-5 text-[#FF6B2C]" />
          <div>
            <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
              Bob (QA Lab) — 135 万行压测 Trace 聚合看板
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              独立插件目录：src/spaces/bob-qa/ • 响应耗时 {data?.elapsedMs ?? 0} ms
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((r) => (
          <div key={r.firmware} className="bento-card rounded-2xl p-4 space-y-2 font-mono-num">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[var(--text-primary)]">{r.firmware}</span>
              <span className="text-[11px] text-emerald-500">{r.trace_count.toLocaleString()} IOs</span>
            </div>
            <div className="text-xs text-[var(--text-secondary)] flex justify-between">
              <span>Avg Latency:</span>
              <strong className="text-[#00B4D8]">{r.avg_latency_us} µs</strong>
            </div>
            <div className="text-xs text-[var(--text-secondary)] flex justify-between">
              <span>Avg Power:</span>
              <strong className="text-[#A855F7]">{r.avg_power_mw} mW</strong>
            </div>
            <div className="text-xs text-[var(--text-secondary)] flex justify-between">
              <span>Max Temp:</span>
              <strong className="text-[#FF6B2C]">{r.max_temp_c}°C</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BobSpace;
