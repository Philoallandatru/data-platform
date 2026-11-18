import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { auth, initAuthDatabase } from './auth';
import {
  executeSemanticQuery,
  listDataSources,
  SEMANTIC_DATASETS,
  setActiveDataSources,
} from './semantic';

const app = new Hono();
const ssdDbPath = path.resolve(process.cwd(), 'data/ssd_benchmark.db');
let sharedSsdDb: DatabaseSync | null = null;

function getSsdDb() {
  if (!sharedSsdDb) {
    sharedSsdDb = new DatabaseSync(ssdDbPath, { open: true, readOnly: true });
    sharedSsdDb.exec('PRAGMA busy_timeout = 3000;');
  }
  return sharedSsdDb;
}

// 1. Mount Better Auth handler (Sign-in, Sign-out, Session, Admin CRUD)
app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw));

// 2. Auth Guard helper
async function requireSession(req: Request) {
  return auth.api.getSession({ headers: req.headers });
}

// 3. Lightweight SQLite version check (PRAGMA data_version)
app.get('/api/ssd-version', async (c) => {
  const session = await requireSession(c.req.raw);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const db = getSsdDb();
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
    sharedSsdDb = null;
    return c.json({ error: err?.message || 'Version check failed' }, 500);
  }
});

// 4. Full SSD Telemetry payload
app.get('/api/ssd-telemetry', async (c) => {
  const session = await requireSession(c.req.raw);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const db = getSsdDb();
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
    sharedSsdDb = null;
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

const PORT = Number(process.env.API_PORT || 3001);

initAuthDatabase().then(() => {
  serve({ fetch: app.fetch, port: PORT }, () => {
    console.log(`[PULSE LAB API] Hono + Better Auth listening on http://localhost:${PORT}`);
  });
});
