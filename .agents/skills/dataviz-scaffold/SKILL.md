---
name: dataviz-scaffold
description: 在 data-platform 可视化脚手架中新增图表组件、Bento 卡片、页面模块或替换 PlaceholderSlot 占位符时使用。
---

# DataViz Scaffold Skill

用于指导在 **PULSE LAB**（React 19 + TypeScript + Tailwind v4 + Three.js + SQLite）中快速拓展数据可视化组件与页面。

## 工作流步骤

1. **确认目标页面与占位符**
   - 检查 `src/config/navigation.ts` 确认模块归属（`performance` / `power` / `showcase` / `custom`）。
   - 若要为不同团队分配空白定制页，可在 `CUSTOM_PAGES` 中新增配置并在 `CustomBlankPage.tsx` 或独立页面中按 `React.lazy` 懒加载接入。
   - 查看对应页面（`PerformanceSuitePage.tsx`、`PowerSuitePage.tsx`、`VizGalleryPage.tsx`、`CustomBlankPage.tsx`）中预留的 `<PlaceholderSlot slotId="..." />`。

2. **遵循双主题视觉规范**
   - 卡片容器统一使用 `.bento-card rounded-2xl p-5`。
   - 文本与背景必须使用 CSS 变量：`var(--text-primary)`、`var(--text-secondary)`、`var(--text-muted)`、`var(--bg-subtle)`、`var(--bg-tooltip)`、`var(--border-card)`、`var(--chart-grid)`。
   - 推荐主题强调色：青色 `#00B4D8` / `#00E5FF`（带宽/正常）、紫色 `#A855F7`（功耗/AI）、珊瑚橙 `#FF6B2C`（高亮/温度）、警示红 `#FF4D2E`（回归/告警）、翠绿 `#10B981`（最优/通过）。

3. **复用现有可视化基础设施**
   - 列表与明细优先使用 `src/components/DataTable.tsx`（支持筛选、升降序、全选/多选、列重排、CSV 导出）。
   - 下拉选择优先使用 `src/components/CustomSelect.tsx`（禁止使用原生 `<select>`）。
   - 复杂图表参考 `src/components/charts/VizLibrary.tsx`（雷达图、散点气泡图、热力图、Treemap、分位区间图）或 `src/components/FirmwareTopology3D.tsx`（Three.js 3D 交互）。

4. **验证构建**
   - 每次修改完成后必须执行 `npm run build`（`tsc -b && vite build`），确保零 TypeScript 报错（`noUnusedLocals: true`）。
