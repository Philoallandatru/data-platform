export type ThemeMode = 'dark' | 'light';
export type ViewTab = 'Overview' | 'Performance' | 'Power & Thermal' | 'Workload Matrix' | 'Alerts';

export interface SSDModel {
  id: string;
  name: string;
  interface: string;
  capacity_tb: number;
  controller: string;
  nand_type: string;
}

export interface FirmwareVersion {
  id: string;
  version: string;
  release_date: string;
  channel: string;
  power_profile: string;
  notes: string;
}

export interface TestItem {
  id: string;
  name: string;
  category: string;
  block_size: string;
  queue_depth: number;
  rw_mix: string;
  description: string;
}

export interface BenchmarkRun {
  id: number;
  model_id: string;
  firmware_id: string;
  test_id: string;
  throughput_mbps: number;
  iops: number;
  latency_avg_us: number;
  latency_p99_us: number;
  latency_p999_us: number;
  power_avg_w: number;
  power_peak_w: number;
  efficiency_mbps_per_w: number;
  efficiency_kiops_per_w: number;
  temp_controller_c: number;
  temp_nand_c: number;
  throttle_events: number;
  pass_status: 'PASS' | 'WARN' | 'REGRESSION';
}

export interface PowerTimeseriesPoint {
  id: number;
  model_id: string;
  firmware_id: string;
  test_id: string;
  elapsed_sec: number;
  throughput_mbps: number;
  power_w: number;
  temp_c: number;
  latency_p99_us: number;
}

export interface RegressionAlert {
  id: number;
  firmware_id: string;
  test_id: string;
  severity: 'improvement' | 'warning' | 'critical';
  title: string;
  detail: string;
  delta_metric: string;
}

export interface AIInsight {
  id: number;
  scope: string;
  agent_name: string;
  severity: 'info' | 'improvement' | 'warning' | 'critical';
  title: string;
  summary_md: string;
  metrics: { label: string; value: string }[];
  created_at: string;
}

export interface SSDTelemetryPayload {
  source: string;
  counts: {
    models: number;
    firmwares: number;
    testItems: number;
    runs: number;
    timeseries: number;
    alerts: number;
    aiInsights?: number;
  };
  models: SSDModel[];
  firmwares: FirmwareVersion[];
  testItems: TestItem[];
  runs: BenchmarkRun[];
  timeseries: PowerTimeseriesPoint[];
  alerts: RegressionAlert[];
  aiInsights?: AIInsight[];
}
