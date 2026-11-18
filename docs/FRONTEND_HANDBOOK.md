# PULSE LAB — 前端开发与拓展手册 (Frontend Developer Handbook)

> 本手册面向 `data-platform` 全能型数据可视化脚手架的增量开发，涵盖目录结构、主题系统、导航拓展、通用数据表、占位符替换及 SQLite 实时同步规范。

---

## 1. 目录结构总览

```text
├── data/
│   ├── ssd_benchmark.db        # 主业务遥测数据库（1,644+ 行汇总与时序）
│   └── ssd_150mb_sim.db        # 150MB–200MB 级百万行压测模拟库（1,350,000 行）
├── scripts/
│   ├── generate_ssd_db.py      # 生成 ssd_benchmark.db
│   └── generate_150mb_db.py    # 生成百万行级压测模拟库
├── src/
│   ├── config/navigation.ts    # 左侧菜单树声明式配置（产品 / 性能 / 功耗）
│   ├── types/ssd.ts            # 与 SQLite 表结构对齐的 TypeScript 类型
│   ├── components/
│   │   ├── Sidebar.tsx         # 可折叠左侧导航栏
│   │   ├── CustomSelect.tsx    # 毛玻璃可搜索下拉选择器
│   │   ├── DataTable.tsx       # 通用数据表（筛选/排序/全选/多选/列排布/导出）
│   │   ├── BenchmarkDataTable.tsx # SSD 业务数据表实例
│   │   ├── PlaceholderSlot.tsx # 增量拓展占位符卡片
│   │   ├── FirmwareTopology3D.tsx # Three.js 3D 固件帕累托拓扑
│   │   ├── WorkloadSplineChart.tsx # 300s 持续压测平滑样条图
│   │   ├── SSDBentoWidgets.tsx # 对比柱状图、同心圆评分、告警列表
│   │   └── charts/VizLibrary.tsx # 6 大可视化样板（雷达图/气泡图/热力图/Treemap 等）
│   └── pages/
│       ├── PerformanceSuitePage.tsx # 性能模块（CD Mark / PCMark / 3DMark / FIO）
│       ├── PowerSuitePage.tsx       # 功耗模块（Active Power / Sleep / Thermal）
│       └── VizGalleryPage.tsx       # 全能型可视化样板库
└── vite.config.ts              # Node 24 native node:sqlite API 中间件
```

---

## 2. 主题系统（深色 / 浅色双主题）

所有颜色均通过 `src/index.css` 中的 CSS 变量驱动（`html.dark` 与 `html.light`）：

| 变量名 | 用途 | 深色默认值 | 浅色默认值 |
| :--- | :--- | :--- | :--- |
| `--bg-page` | 页面主背景 | `#05070b` | `#f4f7fb` |
| `--bg-card-start` / `--bg-card-end` | Bento 卡片渐变 | `rgba(16,21,31,0.88)` | `rgba(255,255,255,0.96)` |
| `--bg-tooltip` | 浮层 / 下拉 / Tooltip | `rgba(9,13,20,0.94)` | `rgba(255,255,255,0.96)` |
| `--text-primary` | 主文本 | `#e6edf3` | `#0f172a` |
| `--text-secondary` | 次级文本 | `#94a3b8` | `#475569` |
| `--border-card` | 卡片细边框 | `rgba(255,255,255,0.08)` | `rgba(15,23,42,0.09)` |

**开发规范**：新增组件禁止硬编码 `text-white` 或 `bg-[#090D14]`，请统一使用 `text-[var(--text-primary)]`、`bg-[var(--bg-subtle)]`、`border-[var(--border-card)]`。

---

## 3. 增量拓展指南

### 3.1 新增测试套件或产品
1. 打开 `src/config/navigation.ts`，在 `PERFORMANCE_SUITES` 或 `POWER_SUITES` 中追加一个 `SubPageConfig` 对象。
2. 如需新增 SSD 产品，在 SQLite `ssd_models` 表中插入一行，前端 `Sidebar` 与上下文选择器会自动识别。

### 3.2 替换占位符（`<PlaceholderSlot />`）
每个页面均预留了带 `slotId` 的 `<PlaceholderSlot />`。增量开发时：
1. 在 `src/components/charts/` 下编写新图表组件。
2. 在目标页面（如 `PerformanceSuitePage.tsx`）中用新组件替换对应的 `<PlaceholderSlot slotId="perf_cdmark_slot_1" ... />`。

### 3.3 使用通用数据表（`<DataTable<T> />`）
```tsx
<DataTable
  title="自定义数据表"
  data={rows}
  columns={[
    { key: 'name', header: '名称', accessor: (r) => r.name },
    { key: 'val', header: '数值', align: 'right', accessor: (r) => r.val },
  ]}
  getRowId={(r) => r.id}
  quickFilters={[{ label: '仅异常', value: 'ERR', predicate: (r) => r.status !== 'PASS' }]}
  exportFileName="export.csv"
/>
```
内置能力：表头升降序、全局搜索、快捷标签筛选、当前页全选/跨页全选、行多选、列显隐与左右排序（`Columns` 按钮）、分页及 CSV 导出。

---

## 4. SQLite 实时同步与大数据量（150MB–4GB）规范

1. **开启 WAL 模式**：写端（MCP）与读端（Vite/Node）并发访问不阻塞（`PRAGMA journal_mode = WAL` + `PRAGMA busy_timeout = 3000`）。
2. **轻量级变更检测**：前端每 5 秒轮询 `/api/ssd-version`（内部读取 `PRAGMA data_version` 与表行数签名，耗时 `<0.1ms`），仅当签名变化时才重新拉取数据。
3. **禁止全量拉取 150MB 明细**：150MB 级原始 Trace 应使用服务端 `WHERE ... ORDER BY ... LIMIT ? OFFSET ?` + 覆盖索引分页或 SQL 聚合（`AVG / MIN / MAX`），前端只接收当前页（<20KB）。

---

## 5. 网站响应性能与调优参考

### 5.1 已落地的性能优化架构
1. **路由级懒加载（`React.lazy` + `Suspense`）**：`PerformanceSuitePage`、`PowerSuitePage`、`VizGalleryPage`、`CustomBlankPage` 均按需加载，首屏不加载未访问页面的 JS。
2. **第三方重依赖拆包（`vite.config.ts` `manualChunks`）**：将 `three`（3D WebGL 引擎）与 `lucide-react` 独立拆分为长期可缓存的 Vendor Chunk，避免业务代码微调导致全量缓存失效。
3. **WebGL 帧率与分辨率控制**：`FirmwareTopology3D` 限制 `devicePixelRatio <= 2`，并通过 `ResizeObserver` 精准重绘，避免高分屏 4K 渲染过载。
4. **React 计算缓存**：高频过滤（`runsForModel`、`runsForTest`、`activeTimeseries`）与表格排序/分页均使用 `useMemo` 隔离，避免无关状态变化触发全表重算。

### 5.2 推荐性能评测与调优工具清单
- **首屏与交互评测**：Chrome DevTools → **Lighthouse**（目标 Performance >= 90，INP < 200ms）与 **Performance 面板**（排查长任务 Long Tasks > 50ms）。
- **打包体积分析**：`npx vite-bundle-visualizer` 可视化分析各依赖包体积占比。
- **React 渲染剖析**：安装 **React Developer Tools → Profiler**，勾选 *Record why each component rendered* 定位无效重渲染。
- **SQLite 查询调优**：对新增 SQL 统一执行 `EXPLAIN QUERY PLAN SELECT ...`，确保出现 `USING COVERING INDEX` 或 `SEARCH ... USING INDEX`，杜绝大表 `SCAN`。

---

## 6. 团队插件化空间、AI 联动与质量门禁

### 6.1 团队成员独立空间插件（`src/spaces/<author>/`）
每位成员无需修改 `App.tsx` 或 `Sidebar.tsx`，只需在 `src/spaces/<author>/` 下创建：
- `meta.ts`：导出 `meta: SpaceMeta`（`id`、`title`、`author`、`team`、`description`、`tags`）
- `index.tsx`：默认导出 React 组件（统一使用 `useSemanticQuery` 取数，显式处理 `loading / error / 空数组`）

`src/spaces/registry.ts` 会通过 `import.meta.glob` 自动发现、按路由懒加载，并在 `TeamSpacesPage.tsx` 中用 `<SpaceErrorBoundary>` 隔离单页崩溃。

### 6.2 本地 AI Agent 闭环（OpenCode / 千问）
- **MCP Server**：`npm run mcp`（`server/mcp.ts`）提供 `get_telemetry_catalog`、`query_telemetry_table`、`list_ai_insights`、`publish_ai_insight`、`check_space_compliance`。
- **CLI 工具**：`npm run ai:cli -- query ...` / `npm run ai:cli -- publish ...`，结论写入 `ai_insights` 表后网页 5 秒内自动展示在 `<AIInsightsPanel />`。

### 6.3 提交前强制门禁
```bash
npm run verify          # 依次执行 tsc -b && eslint . && vite build（必须 0 error）
npm run test:multiuser  # 运行多用户隔离与 RBAC 权限集成测试
```
GitHub Actions（`.github/workflows/ci.yml`）会在 PR 阶段自动执行同等校验。
