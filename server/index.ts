import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { auth, authDb, initAuthDatabase } from './auth';
import {
  executeSemanticQuery,
  getPoolDb,
  listDataSources,
  SEMANTIC_DATASETS,
  setActiveDataSources,
} from './semantic';

const app = new Hono();
const ssdDbPath = path.resolve(process.cwd(), 'data/ssd_benchmark.db');
const personalDbPath = path.resolve(process.cwd(), 'data/personal_datasets.db');
const personalDb = new DatabaseSync(personalDbPath);
personalDb.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 3000;
  CREATE TABLE IF NOT EXISTS user_datasets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    row_count INTEGER NOT NULL,
    rows_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_user_datasets_uid ON user_datasets(user_id, updated_at DESC);
`);

// 1. Mount Better Auth handler (Sign-in, Sign-out, Session, Admin CRUD)
app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw));

// 2. Auth Guard helper
async function requireSession(req: Request) {
  return auth.api.getSession({ headers: req.headers });
}

// 3. Lightweight SQLite version check (PRAGMA data_version) via shared pool
app.get('/api/ssd-version', async (c) => {
  const session = await requireSession(c.req.raw);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const db = getPoolDb('ssd_benchmark');
    const dv = db.prepare('PRAGMA data_version').get() as { data_version: number };
    const runsCount = db.prepare('SELECT COUNT(*) as c FROM benchmark_runs').get() as { c: number };
    const tsCount = db.prepare('SELECT COUNT(*) as c FROM power_telemetry_timeseries').get() as { c: number };
    const alertsCount = db.prepare('SELECT COUNT(*) as c FROM regression_alerts').get() as { c: number };
    return c.json({
      data_version: dv?.data_version ?? 1,
      signature: `${dv?.data_version ?? 1}-${runsCount?.c ?? 0}-${tsCount?.c ?? 0}-${alertsCount?.c ?? 0}`,
      runs: runsCount?.c ?? 0,
      timeseries: tsCount?.c ?? 0,
      checkedAt: Date.now(),
    });
  } catch (err: any) {
    return c.json({ error: err?.message || 'Version check failed' }, 500);
  }
});

// 4. Full SSD Telemetry payload via shared pool
app.get('/api/ssd-telemetry', async (c) => {
  const session = await requireSession(c.req.raw);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const db = getPoolDb('ssd_benchmark');
    const models = db.prepare('SELECT * FROM ssd_models').all();
    const firmwares = db.prepare('SELECT * FROM firmware_versions').all();
    const testItems = db.prepare('SELECT * FROM test_items').all();
    const runs = db.prepare('SELECT * FROM benchmark_runs').all();
    const timeseries = db.prepare('SELECT * FROM power_telemetry_timeseries ORDER BY elapsed_sec ASC').all();
    const alerts = db.prepare('SELECT * FROM regression_alerts').all();

    return c.json({
      source: 'sqlite:data/ssd_benchmark.db',
      counts: {
        models: models.length,
        firmwares: firmwares.length,
        testItems: testItems.length,
        runs: runs.length,
        timeseries: timeseries.length,
        alerts: alerts.length,
      },
      models,
      firmwares,
      testItems,
      runs,
      timeseries,
      alerts,
    });
  } catch (err: any) {
    return c.json({ error: err?.message || 'SQLite query failed' }, 500);
  }
});

// 5. Admin-only SQLite Maintenance Endpoint
app.post('/api/admin/ssd-maintenance', async (c) => {
  const session = await requireSession(c.req.raw);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);
  if (session.user.role !== 'admin') return c.json({ error: 'Forbidden: Admin only' }, 403);

  try {
    const rwDb = new DatabaseSync(ssdDbPath);
    rwDb.exec('PRAGMA busy_timeout = 3000; PRAGMA wal_checkpoint(TRUNCATE); ANALYZE;');
    rwDb.close();
    return c.json({ ok: true, message: 'WAL checkpoint & ANALYZE completed on ssd_benchmark.db' });
  } catch (err: any) {
    return c.json({ error: err?.message || 'Maintenance failed' }, 500);
  }
});

// 6. Semantic Layer Catalog & Query (Authenticated, Multi-DB Pool)
app.get('/api/semantic/catalog', async (c) => {
  const session = await requireSession(c.req.raw);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const activeSources = listDataSources().filter((d) => d.active);
  return c.json({
    activeDatasources: activeSources.map((d) => ({ id: d.id, filename: d.filename, sizeMB: d.sizeMB })),
    datasets: Object.values(SEMANTIC_DATASETS),
  });
});

app.post('/api/semantic/query', async (c) => {
  const session = await requireSession(c.req.raw);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const body = await c.req.json();
    const result = executeSemanticQuery(body);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err?.message || 'Semantic query failed' }, 400);
  }
});

// 7. Admin Multi-DB Pool Management
app.get('/api/admin/datasources', async (c) => {
  const session = await requireSession(c.req.raw);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);
  if (session.user.role !== 'admin') return c.json({ error: 'Forbidden: Admin only' }, 403);

  return c.json({ datasources: listDataSources() });
});

app.post('/api/admin/datasources', async (c) => {
  const session = await requireSession(c.req.raw);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);
  if (session.user.role !== 'admin') return c.json({ error: 'Forbidden: Admin only' }, 403);

  const body = await c.req.json();
  const activeIds = Array.isArray(body?.activeIds) ? body.activeIds : [];
  return c.json({ datasources: setActiveDataSources(activeIds) });
});

// 8. Personal Workspace Layout Persistence (per authenticated user in auth.db)
const DEFAULT_WIDGETS = ['radar', 'scatter', 'semantic_raw'];

app.get('/api/workspace', async (c) => {
  const session = await requireSession(c.req.raw);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const row = authDb
    .prepare('SELECT widgets_json, updated_at FROM user_workspaces WHERE user_id = ?')
    .get(session.user.id) as { widgets_json: string; updated_at: number } | undefined;

  let widgets = DEFAULT_WIDGETS;
  if (row?.widgets_json) {
    try {
      const parsed = JSON.parse(row.widgets_json);
      if (Array.isArray(parsed)) widgets = parsed;
    } catch {
      widgets = DEFAULT_WIDGETS;
    }
  }
  return c.json({ widgets, updatedAt: row?.updated_at ?? null });
});

app.put('/api/workspace', async (c) => {
  const session = await requireSession(c.req.raw);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const widgets = Array.isArray(body?.widgets) ? body.widgets.slice(0, 20) : DEFAULT_WIDGETS;
  const now = Date.now();
  authDb
    .prepare(
      `INSERT INTO user_workspaces (user_id, widgets_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET widgets_json = excluded.widgets_json, updated_at = excluded.updated_at`
    )
    .run(session.user.id, JSON.stringify(widgets), now);

  return c.json({ ok: true, widgets, updatedAt: now });
});

// 9. Personal Imported Datasets Persistence (isolated in data/personal_datasets.db)
app.get('/api/personal-datasets', async (c) => {
  const session = await requireSession(c.req.raw);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const row = personalDb
    .prepare('SELECT id, name, row_count, rows_json, updated_at FROM user_datasets WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1')
    .get(session.user.id) as { id: number; name: string; row_count: number; rows_json: string; updated_at: number } | undefined;

  if (!row) return c.json({ dataset: null });
  return c.json({
    dataset: {
      id: row.id,
      name: row.name,
      rowCount: row.row_count,
      rows: JSON.parse(row.rows_json),
      updatedAt: row.updated_at,
    },
  });
});

app.post('/api/personal-datasets', async (c) => {
  const session = await requireSession(c.req.raw);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const MAX_BYTES = 5 * 1024 * 1024;
  const contentLength = Number(c.req.header('content-length') || 0);
  if (contentLength > MAX_BYTES) {
    return c.json({ error: 'Dataset too large for personal snapshot (max 5MB)' }, 413);
  }

  const rawText = await c.req.text();
  if (Buffer.byteLength(rawText, 'utf8') > MAX_BYTES) {
    return c.json({ error: 'Dataset too large for personal snapshot (max 5MB)' }, 413);
  }

  let body: any;
  try {
    body = JSON.parse(rawText);
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const name = String(body?.name || 'personal_data.csv').slice(0, 120);
  const allRows = Array.isArray(body?.rows) ? body.rows : [];
  const truncated = allRows.length > 5000;
  const rows = allRows.slice(0, 5000);
  const rowsJson = JSON.stringify(rows);
  const now = Date.now();

  personalDb.exec('BEGIN');
  try {
    personalDb.prepare('DELETE FROM user_datasets WHERE user_id = ?').run(session.user.id);
    personalDb
      .prepare('INSERT INTO user_datasets (user_id, name, row_count, rows_json, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(session.user.id, name, rows.length, rowsJson, now);
    personalDb.exec('COMMIT');
  } catch (err: any) {
    personalDb.exec('ROLLBACK');
    return c.json({ error: err?.message || 'Failed to save dataset' }, 500);
  }

  return c.json({ ok: true, name, rowCount: rows.length, truncated, updatedAt: now });
});

app.delete('/api/personal-datasets', async (c) => {
  const session = await requireSession(c.req.raw);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  personalDb.prepare('DELETE FROM user_datasets WHERE user_id = ?').run(session.user.id);
  return c.json({ ok: true });
});

// 10. Production static asset serving (when dist/ exists)
const distDir = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use('/*', serveStatic({ root: './dist' }));
  app.get('*', serveStatic({ path: './dist/index.html' }));
}

const PORT = Number(process.env.API_PORT || 3001);

initAuthDatabase().then(() => {
  serve({ fetch: app.fetch, port: PORT }, () => {
    console.log(`[PULSE LAB API] Hono + Better Auth listening on http://localhost:${PORT}`);
  });
});
