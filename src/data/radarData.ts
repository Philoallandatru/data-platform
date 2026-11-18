export type TimeRange = '1H' | '24H' | '7D' | '30D';
export type RegionFilter = 'Global' | 'North America' | 'Europe' | 'Asia-Pacific' | 'LATAM';
export type CategoryTab = 'Overview' | 'Traffic' | 'Security & DDoS' | 'AI & Bots' | 'Outages';
export type FlowLayer = 'all' | 'traffic' | 'ddos' | 'ai';

export interface EdgeHub {
  id: string;
  code: string;
  city: string;
  country: string;
  region: Exclude<RegionFilter, 'Global'>;
  lat: number;
  lng: number;
  rps: number; // Million req/sec
  ddosGbps: number;
  aiShare: number; // %
  latencyMs: number;
  status: 'nominal' | 'elevated' | 'mitigating';
}

export interface GlobeArc {
  id: string;
  from: string; // hub id
  to: string;   // hub id
  type: 'traffic' | 'ddos' | 'ai';
  intensity: number; // 0.3 - 1.0
  label: string;
}

export interface TimeSeriesPoint {
  time: string;
  humanTraffic: number; // Index or Mrps
  aiCrawlers: number;
  ddosMitigated: number;
}

export interface AIBotEntry {
  name: string;
  operator: string;
  share: number;
  delta: number;
  reqPerMin: string;
  verified: boolean;
  color: string;
  sparkline: number[];
}

export interface AttackVector {
  name: string;
  share: number;
  peakGbps: number;
  color: string;
  mitigationRate: string;
}

export interface ProtocolMetric {
  name: string;
  value: number;
  delta: string;
  color: string;
  description: string;
}

export interface OutageIncident {
  id: string;
  title: string;
  asn: string;
  hubId: string;
  region: Exclude<RegionFilter, 'Global'>;
  severity: 'critical' | 'major' | 'minor';
  dropPercent: number;
  duration: string;
  timestamp: string;
  cause: string;
}

export const EDGE_HUBS: EdgeHub[] = [
  { id: 'sfo', code: 'SFO', city: 'San Francisco', country: 'US', region: 'North America', lat: 37.77, lng: -122.41, rps: 14.8, ddosGbps: 420, aiShare: 18.4, latencyMs: 11, status: 'nominal' },
  { id: 'nyc', code: 'IAD', city: 'New York / Ashburn', country: 'US', region: 'North America', lat: 40.71, lng: -74.0, rps: 19.2, ddosGbps: 890, aiShare: 21.6, latencyMs: 9, status: 'elevated' },
  { id: 'lhr', code: 'LHR', city: 'London', country: 'UK', region: 'Europe', lat: 51.5, lng: -0.12, rps: 15.6, ddosGbps: 610, aiShare: 15.2, latencyMs: 12, status: 'nominal' },
  { id: 'fra', code: 'FRA', city: 'Frankfurt', country: 'DE', region: 'Europe', lat: 50.11, lng: 8.68, rps: 17.4, ddosGbps: 1140, aiShare: 14.8, latencyMs: 10, status: 'mitigating' },
  { id: 'sin', code: 'SIN', city: 'Singapore', country: 'SG', region: 'Asia-Pacific', lat: 1.35, lng: 103.81, rps: 13.9, ddosGbps: 1480, aiShare: 16.9, latencyMs: 14, status: 'mitigating' },
  { id: 'nrt', code: 'NRT', city: 'Tokyo', country: 'JP', region: 'Asia-Pacific', lat: 35.67, lng: 139.65, rps: 16.1, ddosGbps: 530, aiShare: 19.1, latencyMs: 11, status: 'nominal' },
  { id: 'hkg', code: 'HKG', city: 'Hong Kong', country: 'HK', region: 'Asia-Pacific', lat: 22.31, lng: 114.16, rps: 11.4, ddosGbps: 760, aiShare: 22.3, latencyMs: 13, status: 'elevated' },
  { id: 'syd', code: 'SYD', city: 'Sydney', country: 'AU', region: 'Asia-Pacific', lat: -33.86, lng: 151.2, rps: 6.8, ddosGbps: 190, aiShare: 12.7, latencyMs: 16, status: 'nominal' },
  { id: 'gru', code: 'GRU', city: 'São Paulo', country: 'BR', region: 'LATAM', lat: -23.55, lng: -46.63, rps: 9.5, ddosGbps: 670, aiShare: 11.4, latencyMs: 18, status: 'elevated' },
  { id: 'dxb', code: 'DXB', city: 'Dubai', country: 'AE', region: 'Europe', lat: 25.2, lng: 55.27, rps: 7.2, ddosGbps: 310, aiShare: 13.5, latencyMs: 15, status: 'nominal' },
];

export const GLOBE_ARCS: GlobeArc[] = [
  { id: 'a1', from: 'sfo', to: 'nrt', type: 'traffic', intensity: 0.9, label: 'Trans-Pacific Backbone' },
  { id: 'a2', from: 'nyc', to: 'lhr', type: 'traffic', intensity: 0.95, label: 'Trans-Atlantic Tier-1' },
  { id: 'a3', from: 'lhr', to: 'fra', type: 'ai', intensity: 0.75, label: 'EU AI Inference Mesh' },
  { id: 'a4', from: 'fra', to: 'sin', type: 'ddos', intensity: 0.95, label: 'L7 Botnet Surge (1.48 Tbps)' },
  { id: 'a5', from: 'hkg', to: 'sin', type: 'ddos', intensity: 0.85, label: 'HTTP/2 Rapid Reset' },
  { id: 'a6', from: 'sfo', to: 'nyc', type: 'ai', intensity: 0.88, label: 'LLM Crawler Sync' },
  { id: 'a7', from: 'gru', to: 'nyc', type: 'ddos', intensity: 0.7, label: 'SYN Flood Mitigated' },
  { id: 'a8', from: 'nrt', to: 'hkg', type: 'traffic', intensity: 0.8, label: 'APAC Edge Mesh' },
  { id: 'a9', from: 'sin', to: 'syd', type: 'traffic', intensity: 0.65, label: 'Oceania Transit' },
  { id: 'a10', from: 'dxb', to: 'fra', type: 'ai', intensity: 0.6, label: 'AI Training Scrape' },
  { id: 'a11', from: 'nyc', to: 'fra', type: 'traffic', intensity: 0.85, label: 'Core Anycast Flow' },
  { id: 'a12', from: 'sfo', to: 'hkg', type: 'ai', intensity: 0.78, label: 'Multimodal Indexer' },
];

const REGION_MULTIPLIER: Record<RegionFilter, number> = {
  Global: 1.0,
  'North America': 0.34,
  Europe: 0.28,
  'Asia-Pacific': 0.27,
  LATAM: 0.11,
};

export function getTimeSeries(range: TimeRange, region: RegionFilter): TimeSeriesPoint[] {
  const mult = REGION_MULTIPLIER[region];
  const labelsByRange: Record<TimeRange, string[]> = {
    '1H': ['20:30', '20:35', '20:40', '20:45', '20:50', '20:55', '21:00', '21:05', '21:10', '21:15', '21:20', '21:25'],
    '24H': ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
    '7D': ['Mon AM', 'Mon PM', 'Tue AM', 'Tue PM', 'Wed AM', 'Wed PM', 'Thu AM', 'Thu PM', 'Fri AM', 'Fri PM', 'Sat', 'Sun'],
    '30D': ['D-28', 'D-25', 'D-22', 'D-19', 'D-16', 'D-13', 'D-10', 'D-7', 'D-5', 'D-3', 'D-1', 'Today'],
  };

  const baseHuman = [54.2, 51.8, 49.6, 53.1, 61.4, 68.9, 74.3, 79.1, 76.5, 81.2, 78.4, 83.6];
  const baseAI = [9.4, 9.8, 10.2, 11.1, 12.6, 14.2, 13.8, 16.5, 17.9, 18.4, 17.6, 19.8];
  const baseDdos = [3.1, 2.8, 4.5, 3.9, 5.2, 4.8, 8.7, 12.4, 7.6, 6.2, 9.1, 11.3];

  const offset = range === '1H' ? 1.04 : range === '24H' ? 1.0 : range === '7D' ? 0.94 : 0.89;

  return labelsByRange[range].map((time, idx) => ({
    time,
    humanTraffic: Number((baseHuman[idx] * mult * offset).toFixed(2)),
    aiCrawlers: Number((baseAI[idx] * mult * offset).toFixed(2)),
    ddosMitigated: Number((baseDdos[idx] * mult * (idx === 7 ? 1.25 : 1)).toFixed(2)),
  }));
}

export const AI_BOTS: AIBotEntry[] = [
  { name: 'GPTBot', operator: 'OpenAI', share: 31.4, delta: +14.2, reqPerMin: '4.8M', verified: true, color: '#10B981', sparkline: [22, 24, 23, 27, 29, 28, 30, 31, 33, 32, 34, 36] },
  { name: 'ClaudeBot', operator: 'Anthropic', share: 21.8, delta: +28.6, reqPerMin: '3.3M', verified: true, color: '#FF6B2C', sparkline: [12, 14, 15, 16, 18, 17, 19, 21, 23, 24, 26, 28] },
  { name: 'Google-Extended', operator: 'Google', share: 18.5, delta: +6.4, reqPerMin: '2.8M', verified: true, color: '#00E5FF', sparkline: [17, 18, 17, 18, 19, 18, 19, 20, 19, 20, 21, 21] },
  { name: 'PerplexityBot', operator: 'Perplexity', share: 11.2, delta: +41.9, reqPerMin: '1.7M', verified: true, color: '#A855F7', sparkline: [5, 6, 7, 7, 8, 9, 10, 11, 12, 13, 14, 16] },
  { name: 'Bytespider', operator: 'ByteDance', share: 9.7, delta: -4.1, reqPerMin: '1.5M', verified: false, color: '#F59E0B', sparkline: [14, 13, 13, 12, 12, 11, 11, 10, 11, 10, 10, 9] },
  { name: 'Meta-ExternalAgent', operator: 'Meta AI', share: 7.4, delta: +19.3, reqPerMin: '1.1M', verified: true, color: '#3B82F6', sparkline: [4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10] },
];

export const ATTACK_VECTORS: AttackVector[] = [
  { name: 'HTTP/2 Rapid Reset', share: 38, peakGbps: 1480, color: '#FF4D2E', mitigationRate: '99.99%' },
  { name: 'Volumetric UDP Flood', share: 27, peakGbps: 1120, color: '#FF8A3D', mitigationRate: '99.98%' },
  { name: 'SYN / ACK Reflection', share: 19, peakGbps: 740, color: '#F59E0B', mitigationRate: '100.0%' },
  { name: 'Credential Stuffing L7', share: 10, peakGbps: 320, color: '#A855F7', mitigationRate: '99.94%' },
  { name: 'DNS Amplification', share: 6, peakGbps: 210, color: '#00E5FF', mitigationRate: '100.0%' },
];

export const PROTOCOL_METRICS: ProtocolMetric[] = [
  { name: 'TLS 1.3', value: 78.4, delta: '+3.2%', color: '#00E5FF', description: 'Encrypted edge handshakes' },
  { name: 'HTTP/3 QUIC', value: 42.6, delta: '+8.7%', color: '#FF6B2C', description: 'Zero-RTT UDP transport' },
  { name: 'IPv6 Share', value: 46.1, delta: '+2.4%', color: '#A855F7', description: 'Dual-stack global traffic' },
  { name: 'DNSSEC Valid', value: 64.9, delta: '+1.9%', color: '#10B981', description: 'Signed resolver queries' },
];

export const OUTAGE_INCIDENTS: OutageIncident[] = [
  {
    id: 'inc-1',
    title: 'Subsea Cable Cut — Strait of Malacca Transit',
    asn: 'AS4788 / AS7473',
    hubId: 'sin',
    region: 'Asia-Pacific',
    severity: 'critical',
    dropPercent: 34,
    duration: '1h 42m',
    timestamp: '12m ago',
    cause: 'BGP route reconvergence via Hong Kong & Tokyo edge',
  },
  {
    id: 'inc-2',
    title: 'Tier-1 Peering Congestion — DE-CIX Frankfurt',
    asn: 'AS3320',
    hubId: 'fra',
    region: 'Europe',
    severity: 'major',
    dropPercent: 18,
    duration: '38m',
    timestamp: '29m ago',
    cause: 'Automated Anycast traffic shift active (0% packet loss)',
  },
  {
    id: 'inc-3',
    title: 'Regional Fiber Maintenance — São Paulo IX',
    asn: 'AS28573',
    hubId: 'gru',
    region: 'LATAM',
    severity: 'minor',
    dropPercent: 11,
    duration: '55m',
    timestamp: '1h ago',
    cause: 'Scheduled carrier failover to alternate coastal ring',
  },
  {
    id: 'inc-4',
    title: 'L7 Botnet Burst — US-East Financial Cluster',
    asn: 'AS15169',
    hubId: 'nyc',
    region: 'North America',
    severity: 'major',
    dropPercent: 22,
    duration: '19m',
    timestamp: '4m ago',
    cause: '890 Gbps HTTP/2 flood auto-mitigated at edge PoPs',
  },
];

export const TICKER_EVENTS: string[] = [
  '⚡ MITIGATED 1.48 Tbps HTTP/2 Rapid Reset targeting SIN-APAC Edge (0.3ms overhead)',
  '🤖 AI CRAWLER SURGE: ClaudeBot +28.6% and PerplexityBot +41.9% over 24H window',
  '🌐 BGP RECONVERGENCE: AS4788 traffic rerouted cleanly via HKG & NRT Anycast',
  '🔒 PROTOCOL MILESTONE: HTTP/3 QUIC reaches 42.6% of global edge requests',
  '🛡️ ZERO-DAY WAF RULE #94218 deployed across 330+ global cities in 4.2 seconds',
  '📡 MEDIAN GLOBAL LATENCY: 12.4ms p50 • 99.998% Edge Availability',
];

export interface AIQueryPreset {
  prompt: string;
  headline: string;
  summary: string;
  metrics: { label: string; value: string; accent: string }[];
  focusHubId?: string;
  recommendedTab?: CategoryTab;
}

export const AI_QUERY_PRESETS: AIQueryPreset[] = [
  {
    prompt: 'Why did APAC DDoS spike at 14:00?',
    headline: 'APAC L7 Botnet Surge — Singapore & Hong Kong',
    summary:
      'A coordinated 1.48 Tbps HTTP/2 Rapid Reset campaign originated from 42,000 compromised IoT endpoints, targeting fintech & gaming origins in SIN. Autonomous edge mitigation absorbed 99.99% of malicious frames with zero origin downtime.',
    metrics: [
      { label: 'Peak Attack', value: '1.48 Tbps', accent: '#FF4D2E' },
      { label: 'Mitigation', value: '99.99%', accent: '#10B981' },
      { label: 'Primary Vector', value: 'HTTP/2 Reset', accent: '#FF8A3D' },
    ],
    focusHubId: 'sin',
    recommendedTab: 'Security & DDoS',
  },
  {
    prompt: 'Compare AI crawlers vs human traffic',
    headline: 'AI Bot Share Reaches 18.4% of Automated Web',
    summary:
      'Verified LLM indexers (GPTBot, ClaudeBot, PerplexityBot) grew +24.8% week-over-week. PerplexityBot shows the fastest velocity (+41.9%), while unverified Bytespider scrapes declined -4.1% following edge rate-limiting.',
    metrics: [
      { label: 'AI Share', value: '18.4%', accent: '#A855F7' },
      { label: 'Top Bot', value: 'GPTBot (31.4%)', accent: '#10B981' },
      { label: 'Fastest Growth', value: '+41.9%', accent: '#00E5FF' },
    ],
    focusHubId: 'sfo',
    recommendedTab: 'AI & Bots',
  },
  {
    prompt: 'Show HTTP/3 & TLS 1.3 adoption in Europe',
    headline: 'Europe Leads Encrypted Zero-RTT Adoption',
    summary:
      'Frankfurt (FRA) and London (LHR) edge clusters now serve 78.4% of connections over TLS 1.3 and 42.6% over HTTP/3 QUIC, cutting mobile handshake latency by 28% compared to HTTP/1.1.',
    metrics: [
      { label: 'TLS 1.3', value: '78.4%', accent: '#00E5FF' },
      { label: 'HTTP/3 QUIC', value: '42.6%', accent: '#FF6B2C' },
      { label: 'FRA Latency', value: '10 ms', accent: '#10B981' },
    ],
    focusHubId: 'fra',
    recommendedTab: 'Traffic',
  },
];
