import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'datasources.json');

export interface DataSourceInfo {
  id: string;
  filename: string;
  sizeMB: number;
  active: boolean;
  tables: string[];
}

export interface SemanticDatasetDef {
  id: string;
  label: string;
  defaultDatasource: string;
  table: string;
  description: string;
  dimensions: Record<string, string>;
  metrics: Record<string, { expr: string; label: string; unit: string }>;
}

export const SEMANTIC_DATASETS: Record<string, SemanticDatasetDef> = {
  ssd_runs: {
    id: 'ssd_runs',
    label: 'SSD Benchmark Summary Runs',
    defaultDatasource: 'ssd_benchmark',
    table: 'benchmark_runs',
    description: 'Aggregated firmware performance, latency & power metrics',
    dimensions: {
      model: 'model_id',
      firmware: 'firmware_id',
      workload: 'test_id',
      status: 'pass_status',
    },
    metrics: {
      avg_bandwidth: { expr: 'ROUND(AVG(throughput_mbps), 1)', label: 'Avg Bandwidth', unit: 'MB/s' },
      max_bandwidth: { expr: 'ROUND(MAX(throughput_mbps), 1)', label: 'Peak Bandwidth', unit: 'MB/s' },
      avg_iops: { expr: 'ROUND(AVG(iops), 0)', label: 'Avg IOPS', unit: 'IOPS' },
      avg_power: { expr: 'ROUND(AVG(power_avg_w), 2)', label: 'Avg Power', unit: 'W' },
      efficiency: { expr: 'ROUND(AVG(efficiency_mbps_per_w), 1)', label: 'Power Efficiency', unit: 'MB/s/W' },
      p99_latency: { expr: 'ROUND(AVG(latency_p99_us), 1)', label: 'Avg P99 Latency', unit: 'µs' },
      avg_temp: { expr: 'ROUND(AVG(temp_controller_c), 1)', label: 'Avg Ctrl Temp', unit: '°C' },
      run_count: { expr: 'COUNT(*)', label: 'Run Count', unit: 'runs' },
    },
  },
  raw_io_traces: {
    id: 'raw_io_traces',
    label: 'Raw NVMe IO Traces (150MB+ Scale)',
    defaultDatasource: 'ssd_150mb_sim',
    table: 'raw_io_traces',
    description: 'Million-row IO trace telemetry queried via covering indexes',
    dimensions: {
      model: 'model_id',
      firmware: 'firmware_id',
      workload: 'test_id',
      io_size: 'io_size_kb',
    },
    metrics: {
      trace_count: { expr: 'COUNT(*)', label: 'Trace Count', unit: 'IOs' },
      avg_latency_us: { expr: 'ROUND(AVG(latency_us), 2)', label: 'Avg Latency', unit: 'µs' },
      avg_power_mw: { expr: 'ROUND(AVG(power_mw), 0)', label: 'Avg Power', unit: 'mW' },
      max_temp_c: { expr: 'ROUND(MAX(temp_c), 1)', label: 'Peak Temp', unit: '°C' },
    },
  },
};

const pool = new Map<string, DatabaseSync>();

function loadActiveIds(): Set<string> {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      if (Array.isArray(parsed.active)) return new Set(parsed.active);
    }
  } catch {
    // fallback
  }
  return new Set(['ssd_benchmark', 'ssd_150mb_sim']);
}

function saveActiveIds(ids: Set<string>) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ active: Array.from(ids) }, null, 2));
}

export function listDataSources(): DataSourceInfo[] {
  const activeIds = loadActiveIds();
  if (!fs.existsSync(DATA_DIR)) return [];
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith('.db') && !f.startsWith('auth'));

  return files.map((filename) => {
    const id = filename.replace(/\.db$/, '');
    const fullPath = path.join(DATA_DIR, filename);
    const sizeMB = Number((fs.statSync(fullPath).size / (1024 * 1024)).toFixed(2));
    const active = activeIds.has(id);
    let tables: string[] = [];
    if (active) {
      try {
        const db = getPoolDb(id);
        tables = (
          db
            .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
            .all() as { name: string }[]
        ).map((t) => t.name);
      } catch {
        tables = [];
      }
    }
    return { id, filename, sizeMB, active, tables };
  });
}

export function setActiveDataSources(ids: string[]) {
  const validFiles = new Set(
    fs
      .readdirSync(DATA_DIR)
      .filter((f) => f.endsWith('.db') && !f.startsWith('auth'))
      .map((f) => f.replace(/\.db$/, ''))
  );
  const next = new Set(ids.filter((id) => validFiles.has(id)));
  saveActiveIds(next);

  // Close deactivated connections
  for (const [key, db] of pool.entries()) {
    if (!next.has(key)) {
      try {
        db.close();
      } catch {
        // ignore
      }
      pool.delete(key);
    }
  }
  return listDataSources();
}

export function getPoolDb(datasourceId: string): DatabaseSync {
  const activeIds = loadActiveIds();
  if (!activeIds.has(datasourceId)) {
    throw new Error(`Datasource "${datasourceId}" is not active or does not exist`);
  }
  const existing = pool.get(datasourceId);
  if (existing) return existing;

  const safeName = path.basename(`${datasourceId}.db`);
  const fullPath = path.resolve(DATA_DIR, safeName);
  if (!fullPath.startsWith(DATA_DIR) || !fs.existsSync(fullPath)) {
    throw new Error(`Database file not found: ${safeName}`);
  }

  const db = new DatabaseSync(fullPath, { open: true, readOnly: true });
  db.exec('PRAGMA busy_timeout = 3000;');
  pool.set(datasourceId, db);
  return db;
}

export interface SemanticQueryInput {
  dataset: string;
  datasource?: string;
  metrics: string[];
  groupBy?: string[];
  where?: Record<string, string | number>;
  orderBy?: { field: string; dir?: 'asc' | 'desc' };
  limit?: number;
}

export function executeSemanticQuery(input: SemanticQueryInput) {
  const ds = SEMANTIC_DATASETS[input.dataset];
  if (!ds) throw new Error(`Unknown semantic dataset: ${input.dataset}`);

  const datasourceId = input.datasource || ds.defaultDatasource;
  const db = getPoolDb(datasourceId);

  const groupCols = (input.groupBy || []).map((g) => {
    const col = ds.dimensions[g];
    if (!col) throw new Error(`Invalid dimension "${g}" for dataset "${ds.id}"`);
    return { alias: g, col };
  });

  if (!input.metrics || input.metrics.length === 0) {
    throw new Error('At least one metric is required');
  }

  const metricCols = input.metrics.map((m) => {
    const def = ds.metrics[m];
    if (!def) throw new Error(`Invalid metric "${m}" for dataset "${ds.id}"`);
    return { alias: m, expr: def.expr };
  });

  const selectParts = [
    ...groupCols.map((g) => `${g.col} AS "${g.alias}"`),
    ...metricCols.map((m) => `${m.expr} AS "${m.alias}"`),
  ];

  const whereClauses: string[] = [];
  const params: (string | number)[] = [];
  if (input.where) {
    for (const [k, v] of Object.entries(input.where)) {
      if (v === undefined || v === null || v === '') continue;
      const col = ds.dimensions[k];
      if (!col) throw new Error(`Invalid filter dimension "${k}"`);
      whereClauses.push(`${col} = ?`);
      params.push(v);
    }
  }

  let sql = `SELECT ${selectParts.join(', ')} FROM ${ds.table}`;
  if (whereClauses.length > 0) sql += ` WHERE ${whereClauses.join(' AND ')}`;
  if (groupCols.length > 0) sql += ` GROUP BY ${groupCols.map((g) => g.col).join(', ')}`;

  if (input.orderBy?.field) {
    const allowedOrder = new Set([
      ...groupCols.map((g) => g.alias),
      ...metricCols.map((m) => m.alias),
    ]);
    if (!allowedOrder.has(input.orderBy.field)) {
      throw new Error(`Invalid orderBy field "${input.orderBy.field}"`);
    }
    const dir = input.orderBy.dir === 'asc' ? 'ASC' : 'DESC';
    sql += ` ORDER BY "${input.orderBy.field}" ${dir}`;
  }

  const limit = Math.min(200, Math.max(1, Number(input.limit || 50)));
  sql += ` LIMIT ${limit}`;

  const t0 = performance.now();
  const rows = db.prepare(sql).all(...params);
  const elapsedMs = Number((performance.now() - t0).toFixed(2));

  return {
    datasource: datasourceId,
    dataset: ds.id,
    elapsedMs,
    rowCount: rows.length,
    rows,
  };
}
