---
name: dataviz-scaffold
description: 在 data-platform 可视化脚手架中新增图表组件、Bento 卡片、页面模块或替换 PlaceholderSlot 占位符时使用。
---

# DataViz Scaffold Skill

用于指导在 **PULSE LAB**（React 19 + TypeScript + Tailwind v4 + Three.js + Hono + Better Auth + SQLite）中快速拓展数据可视化组件与页面。

## 工作流步骤

1. **确认目标页面与占位符**
   - 检查 `src/config/navigation.ts` 确认模块归属（`performance` / `power` / `showcase` / `custom` / `myspace` / `admin`）。
   - 若要为不同团队分配空白定制页，可在 `CUSTOM_PAGES` 中新增配置，并在 `App.tsx` 中通过 `React.lazy` 懒加载接入。
   - 查看对应页面（`PerformanceSuitePage.tsx`、`PowerSuitePage.tsx`、`VizGalleryPage.tsx`、`CustomBlankPage.tsx`）中预留的 `<PlaceholderSlot slotId="..." />`。

2. **取数规范（优先语义层 SDK）**
   - 新页面或新图表优先使用 `src/hooks/useSemanticQuery.ts`（`useSemanticQuery({ dataset, metrics, groupBy, where, orderBy })`），无需手写后端接口或 SQL。
   - 若涉及个人导入数据，参考 `src/pages/MySpacePage.tsx` 的 RFC-4180 CSV 解析与 `/api/personal-datasets` 持久化接口。

3. **遵循双主题与防卡顿规范**
   - 卡片容器统一使用 `.bento-card rounded-2xl p-5`。
   - 文本与背景必须使用 CSS 变量：`var(--text-primary)`、`var(--text-secondary)`、`var(--text-muted)`、`var(--bg-subtle)`、`var(--bg-tooltip)`、`var(--border-card)`、`var(--chart-grid)`。
   - 推荐主题强调色：青色 `#00B4D8` / `#00E5FF`（带宽/正常）、紫色 `#A855F7`（功耗/AI）、珊瑚橙 `#FF6B2C`（高亮/温度）、警示红 `#FF4D2E`（回归/告警）、翠绿 `#10B981`（最优/通过）。
   - 页面下半屏或重型图表必须包裹 `<LazyVisibleCard>`（`src/components/LazyVisibleCard.tsx`）实现视口懒挂载，避免首屏卡顿；单页最多保留 1 个 WebGL 画布。

4. **复用基础设施**
   - 列表与明细优先使用 `src/components/DataTable.tsx`（支持筛选、升降序、全选/多选、列重排、CSV 导出；动态表头场景需传 `key` 或依赖内置 `colSchemaKey` 自动重置）。
   - 下拉选择统一使用 `src/components/CustomSelect.tsx`（内置 `createPortal` 防 `backdrop-filter` 遮挡，禁止使用原生 `<select>`）。
   - 复杂图表参考 `src/components/charts/VizLibrary.tsx` 或 `src/components/FirmwareTopology3D.tsx`。

5. **验证构建**
   - 每次修改完成后必须执行 `npm run build`（`tsc -b && vite build`），确保零 TypeScript 报错（`noUnusedLocals: true`）且产物按预期拆包。
