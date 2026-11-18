import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'

function ssdSqliteApiPlugin(): Plugin {
  const dbPath = path.resolve(process.cwd(), 'data/ssd_benchmark.db')
  let sharedDb: DatabaseSync | null = null

  const getDb = () => {
    if (!sharedDb) {
      sharedDb = new DatabaseSync(dbPath, { open: true, readOnly: true })
      sharedDb.exec('PRAGMA busy_timeout = 3000')
    }
    return sharedDb
  }

  const handler = (req: any, res: any, next: any) => {
    if (req.url?.startsWith('/api/ssd-version')) {
      try {
        const db = getDb()
        const dv = db.prepare('PRAGMA data_version').get() as { data_version: number }
        const runsCount = db.prepare('SELECT COUNT(*) as c FROM benchmark_runs').get() as { c: number }
        const tsCount = db.prepare('SELECT COUNT(*) as c FROM power_telemetry_timeseries').get() as { c: number }
        const alertsCount = db.prepare('SELECT COUNT(*) as c FROM regression_alerts').get() as { c: number }
        res.setHeader('Content-Type', 'application/json')
        res.end(
          JSON.stringify({
            data_version: dv?.data_version ?? 1,
            signature: `${dv?.data_version ?? 1}-${runsCount?.c ?? 0}-${tsCount?.c ?? 0}-${alertsCount?.c ?? 0}`,
            runs: runsCount?.c ?? 0,
            timeseries: tsCount?.c ?? 0,
            checkedAt: Date.now(),
          })
        )
      } catch (err: any) {
        sharedDb = null
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: err?.message || 'Version check failed' }))
      }
      return
    }

    if (!req.url?.startsWith('/api/ssd-telemetry')) return next()

    try {
      const db = getDb()
      const models = db.prepare('SELECT * FROM ssd_models').all()
      const firmwares = db.prepare('SELECT * FROM firmware_versions').all()
      const testItems = db.prepare('SELECT * FROM test_items').all()
      const runs = db.prepare('SELECT * FROM benchmark_runs').all()
      const timeseries = db.prepare('SELECT * FROM power_telemetry_timeseries ORDER BY elapsed_sec ASC').all()
      const alerts = db.prepare('SELECT * FROM regression_alerts').all()

      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
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
        })
      )
    } catch (err: any) {
      sharedDb = null
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: err?.message || 'SQLite query failed' }))
    }
  }

  return {
    name: 'ssd-sqlite-api',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), ssdSqliteApiPlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-three': ['three'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
})
