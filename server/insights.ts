import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const ssdDbPath = path.resolve(process.cwd(), 'data/ssd_benchmark.db');

export interface AIInsightMetric {
  label: string;
  value: string;
}

export interface AIInsightRow {
  id: number;
  scope: string;
  agent_name: string;
  severity: 'info' | 'improvement' | 'warning' | 'critical';
  title: string;
  summary_md: string;
  metrics: AIInsightMetric[];
  created_at: string;
}

export function ensureInsightsTable() {
  const db = new DatabaseSync(ssdDbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 3000;
    CREATE TABLE IF NOT EXISTS ai_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scope TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      summary_md TEXT NOT NULL,
      metrics_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ai_insights_scope ON ai_insights(scope, id DESC);
  `);

  const count = (db.prepare('SELECT COUNT(*) as c FROM ai_insights').get() as { c: number })?.c ?? 0;
  if (count === 0) {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const seed = [
      {
        scope: 'global',
        agent_name: 'OpenCode-Agent',
        severity: 'improvement',
        title: 'FW 2.1.3-NEXT 跨负载能效比显著领先基线 31.2%',
        summary_md:
          '通过语义层聚合 `ssd_runs` 全部 10 项测试负载：FW 2.1.3-NEXT 的平均能效达到 **952.4 MB/s/W**，相比基线 FW 1.0.4-GA（725.8 MB/s/W）提升 **+31.2%**，且在 `THERMAL_75C` 高温测试中保持 0 次降频。',
        metrics: JSON.stringify([
          { label: '能效增幅', value: '+31.2%' },
          { label: '75°C 降频', value: '0 次' },
          { label: '最优固件', value: 'FW 2.1.3-NEXT' },
        ]),
      },
      {
        scope: 'custom-fw',
        agent_name: 'Qwen-Agent',
        severity: 'warning',
        title: 'SLC 缓存耗尽后 FW 1.0.4 / 1.2.0 存在尾延迟抖动',
        summary_md:
          '对比 `SLC_EXHAUST_W` 与 200MB `raw_io_traces` 库发现：当持续写入超过 140s 进入 TLC 直写阶段后，旧版固件 P99.9 尾延迟上升至 **3,400+ µs**，建议固件团队在 `custom-fw` 看板重点监控 FTL 垃圾回收水位。',
        metrics: JSON.stringify([
          { label: '拐点时间', value: '140s' },
          { label: '旧版 P99.9', value: '>3400 µs' },
          { label: 'FW 2.1.3 P99.9', value: '1580 µs' },
        ]),
      },
    ];
    const stmt = db.prepare(
      'INSERT INTO ai_insights (scope, agent_name, severity, title, summary_md, metrics_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    for (const s of seed) {
      stmt.run(s.scope, s.agent_name, s.severity, s.title, s.summary_md, s.metrics, now);
    }
  }
  db.close();
}

export function listAIInsights(scope?: string): AIInsightRow[] {
  const db = new DatabaseSync(ssdDbPath, { open: true, readOnly: true });
  db.exec('PRAGMA busy_timeout = 3000;');
  let rows: any[];
  if (scope && scope !== 'all') {
    rows = db
      .prepare('SELECT * FROM ai_insights WHERE scope = ? OR scope = \'global\' ORDER BY id DESC LIMIT 30')
      .all(scope);
  } else {
    rows = db.prepare('SELECT * FROM ai_insights ORDER BY id DESC LIMIT 50').all();
  }
  db.close();

  return rows.map((r) => {
    let metrics: AIInsightMetric[] = [];
    try {
      metrics = JSON.parse(r.metrics_json || '[]');
    } catch {
      metrics = [];
    }
    return {
      id: r.id,
      scope: r.scope,
      agent_name: r.agent_name,
      severity: r.severity,
      title: r.title,
      summary_md: r.summary_md,
      metrics,
      created_at: r.created_at,
    };
  });
}

export interface PublishInsightInput {
  scope?: string;
  agent_name?: string;
  severity?: 'info' | 'improvement' | 'warning' | 'critical';
  title: string;
  summary_md: string;
  metrics?: AIInsightMetric[];
}

export function publishAIInsight(input: PublishInsightInput): AIInsightRow {
  const scope = String(input.scope || 'global').trim().slice(0, 40);
  const agent_name = String(input.agent_name || 'AI-Agent').trim().slice(0, 40);
  const allowedSev = new Set(['info', 'improvement', 'warning', 'critical']);
  const severity = (allowedSev.has(input.severity || '') ? input.severity : 'info') as AIInsightRow['severity'];
  const title = String(input.title || '').trim().slice(0, 160);
  const summary_md = String(input.summary_md || '').trim().slice(0, 4000);
  if (!title || !summary_md) {
    throw new Error('Both title and summary_md are required');
  }
  const metrics = Array.isArray(input.metrics)
    ? input.metrics.slice(0, 8).map((m) => ({
        label: String(m.label || '').slice(0, 32),
        value: String(m.value || '').slice(0, 48),
      }))
    : [];
  const created_at = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const db = new DatabaseSync(ssdDbPath);
  db.exec('PRAGMA busy_timeout = 3000;');
  const res = db
    .prepare(
      'INSERT INTO ai_insights (scope, agent_name, severity, title, summary_md, metrics_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(scope, agent_name, severity, title, summary_md, JSON.stringify(metrics), created_at);
  db.close();

  return {
    id: Number(res.lastInsertRowid),
    scope,
    agent_name,
    severity,
    title,
    summary_md,
    metrics,
    created_at,
  };
}

export function deleteAIInsight(id: number) {
  const db = new DatabaseSync(ssdDbPath);
  db.exec('PRAGMA busy_timeout = 3000;');
  db.prepare('DELETE FROM ai_insights WHERE id = ?').run(id);
  db.close();
}
