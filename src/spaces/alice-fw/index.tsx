import React from 'react';
import { useSemanticQuery } from '../../hooks/useSemanticQuery';
import { ColumnDef, DataTable } from '../../components/DataTable';
import { LazyVisibleCard } from '../../components/LazyVisibleCard';
import { Activity } from 'lucide-react';

interface Row {
  firmware: string;
  workload: string;
  avg_bandwidth: number;
  avg_power: number;
  efficiency: number;
  p99_latency: number;
}

const AliceSpace: React.FC = () => {
  const { data, loading, error } = useSemanticQuery<Row>({
    dataset: 'ssd_runs',
    metrics: ['avg_bandwidth', 'avg_power', 'efficiency', 'p99_latency'],
    groupBy: ['firmware', 'workload'],
    orderBy: { field: 'efficiency', dir: 'desc' },
    limit: 60,
  });

  const columns: ColumnDef<Row>[] = [
    { key: 'firmware', header: 'Firmware', accessor: (r) => r.firmware },
    { key: 'workload', header: 'Workload', accessor: (r) => r.workload },
    {
      key: 'avg_bandwidth',
      header: 'Avg BW (MB/s)',
      align: 'right',
      accessor: (r) => r.avg_bandwidth,
      render: (r) => <span className="font-mono-num text-[#00B4D8] font-semibold">{r.avg_bandwidth}</span>,
    },
    {
      key: 'p99_latency',
      header: 'P99 (µs)',
      align: 'right',
      accessor: (r) => r.p99_latency,
    },
    {
      key: 'efficiency',
      header: 'Efficiency (MB/s/W)',
      align: 'right',
      accessor: (r) => r.efficiency,
      render: (r) => <span className="font-mono-num text-emerald-500 font-semibold">{r.efficiency}</span>,
    },
  ];

  if (loading) {
    return (
      <div className="bento-card rounded-2xl p-6 text-xs font-mono-num text-[var(--text-muted)]">
        Loading Alice&apos;s FW Space...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bento-card rounded-2xl p-6 text-xs text-[#FF4D2E] font-mono-num">
        Failed to load semantic data: {error}
      </div>
    );
  }

  const rows = data?.rows ?? [];

  return (
    <div className="space-y-5">
      <div className="bento-card rounded-2xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Activity className="w-5 h-5 text-[#00B4D8]" />
          <div>
            <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
              Alice (FW Team) — Gen5 能效与低队列延迟专项
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              独立插件目录：src/spaces/alice-fw/ • 仅通过 useSemanticQuery 取数，零后端改动
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] text-xs font-mono-num text-emerald-500">
          {data?.elapsedMs ?? 0} ms
        </span>
      </div>

      <LazyVisibleCard>
        <DataTable
          title="Alice 固件能效排行表"
          data={rows}
          columns={columns}
          getRowId={(r) => `${r.firmware}-${r.workload}`}
          defaultPageSize={10}
          exportFileName="alice_fw_efficiency.csv"
        />
      </LazyVisibleCard>
    </div>
  );
};

export default AliceSpace;
