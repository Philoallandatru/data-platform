import {
  executeSemanticQuery,
  listDataSources,
  SEMANTIC_DATASETS,
} from '../server/semantic';
import {
  ensureInsightsTable,
  listAIInsights,
  publishAIInsight,
} from '../server/insights';

ensureInsightsTable();

const args = process.argv.slice(2);
const cmd = args[0] || 'help';

function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

function toMarkdownTable(rows: Record<string, any>[]): string {
  if (rows.length === 0) return '_No rows_';
  const headers = Object.keys(rows[0]);
  const headLine = `| ${headers.join(' | ')} |`;
  const sepLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const bodyLines = rows.map((r) => `| ${headers.map((h) => String(r[h] ?? '')).join(' | ')} |`);
  return [headLine, sepLine, ...bodyLines].join('\n');
}

if (cmd === 'catalog') {
  console.log(
    JSON.stringify(
      {
        activeDatasources: listDataSources().filter((d) => d.active),
        datasets: SEMANTIC_DATASETS,
        scopes: [
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
      },
      null,
      2
    )
  );
} else if (cmd === 'query') {
  const dataset = getArg('--dataset') || 'ssd_runs';
  const datasource = getArg('--datasource');
  const metrics = (getArg('--metrics') || 'avg_bandwidth,avg_power,efficiency').split(',').map((s) => s.trim());
  const groupBy = getArg('--groupBy')
    ? getArg('--groupBy')!.split(',').map((s) => s.trim())
    : ['firmware'];
  const whereRaw = getArg('--where');
  const where: Record<string, string> = {};
  if (whereRaw) {
    whereRaw.split(',').forEach((pair) => {
      const [k, v] = pair.split('=');
      if (k && v) where[k.trim()] = v.trim();
    });
  }
  const res = executeSemanticQuery({ dataset, datasource, metrics, groupBy, where });
  console.log(`### Query Result (${res.datasource}.db -> ${res.dataset}, ${res.elapsedMs}ms)\n`);
  console.log(toMarkdownTable(res.rows as Record<string, any>[]));
} else if (cmd === 'insights') {
  const scope = getArg('--scope');
  console.log(JSON.stringify(listAIInsights(scope), null, 2));
} else if (cmd === 'publish') {
  const scope = getArg('--scope') || 'global';
  const agent_name = getArg('--agent') || 'OpenCode-Agent';
  const severity = (getArg('--severity') || 'improvement') as any;
  const title = getArg('--title') || '';
  const summary_md = getArg('--summary') || '';
  const metricsRaw = getArg('--metrics') || '';
  const metrics = metricsRaw
    .split(',')
    .map((pair) => {
      const [label, value] = pair.split(':');
      return label && value ? { label: label.trim(), value: value.trim() } : null;
    })
    .filter((m): m is { label: string; value: string } => Boolean(m));

  const created = publishAIInsight({ scope, agent_name, severity, title, summary_md, metrics });
  console.log('Published AI Insight to SQLite (web dashboard will auto-sync within 5s):');
  console.log(JSON.stringify(created, null, 2));
} else {
  console.log(`PULSE LAB — AI Telemetry CLI
Usage:
  npm run ai:cli -- catalog
  npm run ai:cli -- query --dataset ssd_runs --metrics avg_bandwidth,avg_power,efficiency --groupBy firmware --where workload=THERMAL_75C
  npm run ai:cli -- insights --scope global
  npm run ai:cli -- publish --scope custom-fw --agent OpenCode --severity improvement --title "..." --summary "..." --metrics "BW:+19.5%,Power:-1.8W"`);
}
