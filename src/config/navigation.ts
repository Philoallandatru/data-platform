export type ModuleKey = 'performance' | 'power' | 'showcase' | 'custom';

export interface SubPageConfig {
  id: string;
  label: string;
  shortLabel: string;
  badge?: string;
  defaultTestId: string;
  description: string;
}

export const PERFORMANCE_SUITES: SubPageConfig[] = [
  {
    id: 'cdmark',
    label: 'CrystalDiskMark (CD Mark)',
    shortLabel: 'CD Mark',
    badge: 'SEQ / 4K',
    defaultTestId: 'SEQ_128K_Q32_R',
    description: 'Sequential 128K Q32 & Random 4K Q1T1 / Q64T8 peak bandwidth & IOPS',
  },
  {
    id: 'pcmark',
    label: 'PCMark 10 Storage',
    shortLabel: 'PCMark 10',
    badge: 'TRACE',
    defaultTestId: 'MIXED_70R_30W',
    description: 'Real-world OS boot, application launch & mixed OLTP trace replay',
  },
  {
    id: '3dmark',
    label: '3DMark Storage',
    shortLabel: '3DMark',
    badge: 'GAMING',
    defaultTestId: 'RAND_4K_Q1T1_R',
    description: 'DirectStorage asset streaming, level loading & low-QD tail latency',
  },
  {
    id: 'fio',
    label: 'FIO / SNIA Steady-State',
    shortLabel: 'FIO / SNIA',
    badge: 'ENDURANCE',
    defaultTestId: 'SLC_EXHAUST_W',
    description: 'Sustained SLC cache exhaustion, multi-stream ZNS & steady-state IOPS',
  },
];

export const POWER_SUITES: SubPageConfig[] = [
  {
    id: 'active-power',
    label: 'Active Power & Efficiency',
    shortLabel: 'Active Power',
    badge: 'MB/s/W',
    defaultTestId: 'SEQ_128K_Q32_R',
    description: 'Active Wattage envelope, performance-per-watt Pareto & peak current',
  },
  {
    id: 'sleep-states',
    label: 'PS3 / PS4 Deep Sleep',
    shortLabel: 'Sleep States',
    badge: 'ASPM L1.2',
    defaultTestId: 'IDLE_PS3_WAKE',
    description: 'Idle power states, autonomous transition latency & wake-up overhead',
  },
  {
    id: 'thermal',
    label: 'Thermal Chamber (75°C)',
    shortLabel: 'Thermal 75°C',
    badge: 'THROTTLE',
    defaultTestId: 'THERMAL_75C',
    description: 'Controller & NAND junction temperatures and thermal throttling behavior',
  },
];

export interface CustomPageConfig {
  id: string;
  label: string;
  ownerHint: string;
  badge: string;
  description: string;
}

export const CUSTOM_PAGES: CustomPageConfig[] = [
  {
    id: 'custom-fw',
    label: '自定义页面 A (FW Team)',
    ownerHint: 'Firmware Engineering',
    badge: 'BLANK',
    description: '预留给固件团队的专属可视化空白页，可按需挂载 FTL / GC / ECC 指标。',
  },
  {
    id: 'custom-qa',
    label: '自定义页面 B (QA Lab)',
    ownerHint: 'Hardware Validation',
    badge: 'BLANK',
    description: '预留给测试验证团队的回归对比空白页，可挂载自动化 Pass/Fail 看板。',
  },
  {
    id: 'custom-exec',
    label: '自定义页面 C (Overview)',
    ownerHint: 'Product & PM',
    badge: 'BLANK',
    description: '预留给产品经理的版本发布总览空白页，可挂载核心 KPI 与里程碑对比。',
  },
  {
    id: 'custom-sandbox',
    label: '自定义页面 D (Sandbox)',
    ownerHint: 'Open Sandbox',
    badge: 'DRAFT',
    description: '通用实验沙盒空白页，用于快速验证新图表原型或临时 SQLite 查询视图。',
  },
];
