import React, { useMemo, useState } from 'react';
import { BenchmarkRun, FirmwareVersion, SSDModel, TestItem } from '../types/ssd';
import { ColumnDef, DataTable, QuickFilterOption } from './DataTable';

interface BenchmarkDataTableProps {
  runs: BenchmarkRun[];
  models?: SSDModel[];
  firmwares: FirmwareVersion[];
  testItems: TestItem[];
  selectedModelId: string;
  onSelectRun: (fwId: string, testId: string) => void;
}

export const BenchmarkDataTable: React.FC<BenchmarkDataTableProps> = ({
  runs,
  models = [],
  firmwares,
  testItems,
  selectedModelId,
  onSelectRun,
}) => {
  const [scope, setScope] = useState<'model' | 'all'>('model');

  const fwMap = useMemo(() => new Map(firmwares.map((f) => [f.id, f])), [firmwares]);
  const testMap = useMemo(() => new Map(testItems.map((t) => [t.id, t])), [testItems]);
  const modelMap = useMemo(() => new Map(models.map((m) => [m.id, m])), [models]);

  const scopedRuns = useMemo(
    () => (scope === 'model' ? runs.filter((r) => r.model_id === selectedModelId) : runs),
    [runs, scope, selectedModelId]
  );

  const columns: ColumnDef<BenchmarkRun>[] = useMemo(
    () => [
      {
        key: 'firmware',
        header: 'Firmware',
        accessor: (r) => fwMap.get(r.firmware_id)?.version ?? r.firmware_id,
        render: (r) => (
          <div>
            <div className="font-mono-num font-bold text-[var(--text-primary)]">
              {fwMap.get(r.firmware_id)?.version ?? r.firmware_id}
            </div>
            {scope === 'all' && (
              <div className="text-[10px] text-[var(--text-muted)]">
                {modelMap.get(r.model_id)?.name ?? r.model_id}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'test',
        header: 'Test Workload',
        accessor: (r) => testMap.get(r.test_id)?.name ?? r.test_id,
        render: (r) => {
          const t = testMap.get(r.test_id);
          return (
            <div>
              <div className="font-semibold text-[var(--text-primary)]">{t?.name ?? r.test_id}</div>
              <div className="text-[10px] text-[var(--text-muted)]">
                {t?.category} • {t?.block_size} • QD{t?.queue_depth}
              </div>
            </div>
          );
        },
      },
      {
        key: 'throughput',
        header: 'Bandwidth',
        align: 'right',
        accessor: (r) => r.throughput_mbps,
        render: (r) => (
          <span className="font-mono-num font-semibold text-[#00B4D8]">
            {r.throughput_mbps.toLocaleString()} MB/s
          </span>
        ),
      },
      {
        key: 'iops',
        header: 'IOPS',
        align: 'right',
        accessor: (r) => r.iops,
        render: (r) => (
          <span className="font-mono-num text-[var(--text-primary)]">
            {(r.iops / 1000).toFixed(1)}k
          </span>
        ),
      },
      {
        key: 'p99',
        header: 'P99 Latency',
        align: 'right',
        accessor: (r) => r.latency_p99_us,
        render: (r) => (
          <span className="font-mono-num text-[var(--text-secondary)]">
            {r.latency_p99_us} µs
          </span>
        ),
      },
      {
        key: 'power',
        header: 'Avg Power',
        align: 'right',
        accessor: (r) => r.power_avg_w,
        render: (r) => (
          <span className="font-mono-num font-semibold text-[#A855F7]">
            {r.power_avg_w} W
          </span>
        ),
      },
      {
        key: 'efficiency',
        header: 'Efficiency',
        align: 'right',
        accessor: (r) => r.efficiency_mbps_per_w,
        render: (r) => (
          <span className="font-mono-num text-emerald-500 font-semibold">
            {r.efficiency_mbps_per_w} MB/s/W
          </span>
        ),
      },
      {
        key: 'temp',
        header: 'Ctrl Temp',
        align: 'right',
        accessor: (r) => r.temp_controller_c,
        render: (r) => (
          <span
            className={`font-mono-num font-semibold ${
              r.temp_controller_c >= 78 ? 'text-[#FF4D2E]' : 'text-[#FF6B2C]'
            }`}
          >
            {r.temp_controller_c}°C
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        align: 'right',
        accessor: (r) => r.pass_status,
        render: (r) => (
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
              r.pass_status === 'REGRESSION'
                ? 'bg-[#FF4D2E]/15 text-[#FF4D2E] border-[#FF4D2E]/30'
                : r.pass_status === 'WARN'
                ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
            }`}
          >
            {r.pass_status}
          </span>
        ),
      },
    ],
    [fwMap, testMap, modelMap, scope]
  );

  const quickFilters: QuickFilterOption<BenchmarkRun>[] = useMemo(
    () => [
      { label: 'PASS', value: 'PASS', predicate: (r) => r.pass_status === 'PASS' },
      { label: 'WARN / REGRESSION', value: 'ANOMALY', predicate: (r) => r.pass_status !== 'PASS' },
      {
        label: 'Sequential',
        value: 'SEQ',
        predicate: (r) => testMap.get(r.test_id)?.category === 'Sequential',
      },
      {
        label: 'Random 4K',
        value: 'RAND',
        predicate: (r) => testMap.get(r.test_id)?.category === 'Random',
      },
      {
        label: 'High Efficiency (>1000 MB/s/W)',
        value: 'EFF',
        predicate: (r) => r.efficiency_mbps_per_w >= 1000,
      },
    ],
    [testMap]
  );

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <div className="inline-flex items-center bg-[var(--bg-subtle)] border border-[var(--border-card)] rounded-xl p-0.5 text-[11px] font-mono-num">
          <button
            onClick={() => setScope('model')}
            className={`px-2.5 py-1 rounded-lg cursor-pointer transition ${
              scope === 'model'
                ? 'bg-[#FF6B2C] text-white font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Current Product ({runs.filter((r) => r.model_id === selectedModelId).length})
          </button>
          <button
            onClick={() => setScope('all')}
            className={`px-2.5 py-1 rounded-lg cursor-pointer transition ${
              scope === 'all'
                ? 'bg-[#FF6B2C] text-white font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            All SQLite Runs ({runs.length})
          </button>
        </div>
      </div>

      <DataTable
        title="SQLite Benchmark Explorer Table"
        subtitle="支持多列升/降序、关键词筛选、快捷标签过滤、全选/多选导出 CSV 及自定义列顺序与显隐"
        data={scopedRuns}
        columns={columns}
        getRowId={(r) => r.id}
        quickFilters={quickFilters}
        onRowClick={(r) => onSelectRun(r.firmware_id, r.test_id)}
        defaultPageSize={10}
        exportFileName="ssd_benchmark_runs.csv"
      />
    </div>
  );
};
