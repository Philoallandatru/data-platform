import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import {
  executeSemanticQuery,
  listDataSources,
  SEMANTIC_DATASETS,
} from './semantic';
import {
  ensureInsightsTable,
  listAIInsights,
  publishAIInsight,
} from './insights';

ensureInsightsTable();

const TOOLS = [
  {
    name: 'get_telemetry_catalog',
    description:
      'List active SQLite datasources, available semantic datasets (ssd_runs, raw_io_traces), dimensions, metrics, and target scopes.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'query_telemetry_table',
    description:
      'Query aggregated SSD benchmark or raw IO trace tables via the semantic layer without writing raw SQL.',
    inputSchema: {
      type: 'object',
      properties: {
        dataset: { type: 'string', description: 'ssd_runs or raw_io_traces' },
        datasource: { type: 'string', description: 'Optional datasource alias (e.g. ssd_benchmark, ssd_150mb_sim)' },
        metrics: {
          type: 'array',
          items: { type: 'string' },
          description: 'Metrics to aggregate (e.g. ["avg_bandwidth", "avg_power", "efficiency", "p99_latency"])',
        },
        groupBy: {
          type: 'array',
          items: { type: 'string' },
          description: 'Dimensions to group by (e.g. ["firmware", "workload"])',
        },
        where: {
          type: 'object',
          description: 'Optional equality filters (e.g. {"model": "x900-2tb", "workload": "THERMAL_75C"})',
        },
        limit: { type: 'number', description: 'Max rows (default 50, max 200)' },
      },
      required: ['dataset', 'metrics'],
    },
  },
  {
    name: 'list_ai_insights',
    description: 'List published AI analysis conclusions currently displayed on the web dashboard.',
    inputSchema: {
      type: 'object',
      properties: {
        scope: { type: 'string', description: 'Optional scope filter (global, cdmark, pcmark, thermal, custom-fw, myspace)' },
      },
    },
  },
  {
    name: 'publish_ai_insight',
    description:
      'Publish an AI analysis conclusion to SQLite so it automatically displays on the PULSE LAB web dashboard within 5 seconds.',
    inputSchema: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          description: 'Target page scope: global, cdmark, pcmark, 3dmark, fio, active-power, sleep-states, thermal, custom-fw, custom-qa, custom-exec, custom-sandbox, or myspace',
        },
        agent_name: { type: 'string', description: 'Agent name (e.g. Qwen-Agent, OpenCode)' },
        severity: { type: 'string', enum: ['info', 'improvement', 'warning', 'critical'] },
        title: { type: 'string', description: 'Concise headline of the finding' },
        summary_md: { type: 'string', description: 'Detailed analysis conclusion (supports Markdown bold/code)' },
        metrics: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              value: { type: 'string' },
            },
            required: ['label', 'value'],
          },
          description: 'Up to 6 highlight metric chips',
        },
      },
      required: ['title', 'summary_md'],
    },
  },
  {
    name: 'check_space_compliance',
    description:
      'Validate a team space plugin folder under src/spaces/<spaceId>/ for required meta.ts, index.tsx, forbidden imports, and raw <select> usage.',
    inputSchema: {
      type: 'object',
      properties: {
        spaceId: { type: 'string', description: 'Folder name under src/spaces/ (e.g. alice-fw)' },
      },
      required: ['spaceId'],
    },
  },
];

function send(msg: any) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let req: any;
  try {
    req = JSON.parse(trimmed);
  } catch {
    return;
  }

  const { id, method, params } = req;

  if (method === 'initialize') {
    send({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'pulse-lab-telemetry-mcp', version: '1.0.0' },
      },
    });
    return;
  }

  if (method === 'notifications/initialized') return;

  if (method === 'tools/list') {
    send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
    return;
  }

  if (method === 'tools/call') {
    try {
      const name = params?.name;
      const args = params?.arguments || {};
      let payload: any;

      if (name === 'get_telemetry_catalog') {
        payload = {
          activeDatasources: listDataSources().filter((d) => d.active),
          datasets: SEMANTIC_DATASETS,
          availableScopes: [
            'global',
            'cdmark',
            'pcmark',
            '3dmark',
            'fio',
            'active-power',
            'sleep-states',
            'thermal',
            'custom-fw',
            'custom-qa',
            'custom-exec',
            'custom-sandbox',
            'myspace',
          ],
        };
      } else if (name === 'query_telemetry_table') {
        payload = executeSemanticQuery(args);
      } else if (name === 'list_ai_insights') {
        payload = { insights: listAIInsights(args.scope) };
      } else if (name === 'publish_ai_insight') {
        payload = { published: publishAIInsight(args) };
      } else if (name === 'check_space_compliance') {
        const spaceId = String(args.spaceId || '').replace(/[^a-zA-Z0-9_-]/g, '');
        const dir = path.resolve(process.cwd(), 'src/spaces', spaceId);
        const issues: string[] = [];
        if (!fs.existsSync(path.join(dir, 'meta.ts'))) issues.push('Missing meta.ts');
        if (!fs.existsSync(path.join(dir, 'index.tsx'))) issues.push('Missing index.tsx');
        const idxPath = path.join(dir, 'index.tsx');
        if (fs.existsSync(idxPath)) {
          const src = fs.readFileSync(idxPath, 'utf-8');
          if (src.includes('<select')) issues.push('Forbidden native <select> found; use CustomSelect');
          if (src.includes('dangerouslySetInnerHTML')) issues.push('Forbidden dangerouslySetInnerHTML found');
          if (src.includes('server/')) issues.push('Forbidden server/ import found');
        }
        payload = { spaceId, passed: issues.length === 0, issues };
      } else {
        throw new Error(`Unknown tool: ${name}`);
      }

      send({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        },
      });
    } catch (err: any) {
      send({
        jsonrpc: '2.0',
        id,
        result: {
          isError: true,
          content: [{ type: 'text', text: `Error: ${err?.message || 'Tool execution failed'}` }],
        },
      });
    }
    return;
  }

  if (id !== undefined) {
    send({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    });
  }
});
