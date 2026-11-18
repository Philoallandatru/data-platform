# PULSE LAB — 全能型 SSD 固件性能与功耗遥测可视化脚手架

基于 **React 19 + TypeScript + Tailwind CSS v4 + Three.js + Hono + Better Auth + Node 24 原生 `node:sqlite`** 构建的模块化数据可视化平台。兼具极客深色 / 云白浅色双主题、3D WebGL 拓扑、多库语义层引擎、RBAC 权限控制与个人可定制工作台。

---

## 核心特性

1. **双主题与现代 Bento 网格 UI**
   - 一键切换**深色（Dark）**与**浅色（Light）**主题，偏好自动持久化。
   - 统一毛玻璃 `.bento-card` 视觉规范与 `createPortal` 防遮挡下拉选择器（`<CustomSelect />`）。
2. **多级模块化页面与可扩展占位符**
   - 左侧树状导航支持切换 **SSD 产品** → **性能模块（CD Mark / PCMark 10 / 3DMark / FIO）** 与 **功耗模块（Active Power / Sleep States / Thermal 75°C）**。
   - 内置 **4 个角色化自定义空白页（Custom Pages）** 与标准化 `<PlaceholderSlot />` 占位组件，方便团队增量拓展。
3. **10+ 种数据可视化样板库（`Viz Gallery`）**
   - 3D WebGL 固件帕累托拓扑（Three.js）、300s 持续压测平滑样条图、6 轴雷达图、功耗-吞吐量气泡象限图、尾延迟区间图（Avg → P99 → P99.9）、6×10 热力图矩阵、Treemap、同心圆综合仪表等。
   - 通用 `<DataTable />` 组件：支持搜索、快捷标签筛选、升降序、当前页/跨页全选、自定义列顺序与显隐、CSV 导出。
4. **多库连接池 + 语义层引擎（150MB–4GB 级 SQLite 适配）**
   - 管理员可在后台热切换激活多个 `data/*.db` 数据源。
   - 统一语义层 `POST /api/semantic/query` + 前端 Hook `useSemanticQuery()`：白名单映射 + 参数化绑定 + 只读连接 + `LIMIT <= 200` 护栏。
   - 基于 `PRAGMA journal_mode = WAL` 与 `PRAGMA data_version` 自动感知外部（如 MCP）增量写入并刷新。
5. **认证鉴权与个人空间（`My Space`）**
   - **Hono + Better Auth（`admin` 插件）**：独立 `data/auth.db`，支持账号管理、角色分配（`admin` / `fw_team` / `qa_team` / `viewer`）与封禁控制。
   - **我的空间（`My Space`）**：按用户保存个人卡片布局，并支持拖拽导入本地 CSV / JSON（持久化至独立的 `data/personal_datasets.db`），自动生成 X/Y 轴图表与 `<DataTable />`。

---

## 快速开始

### 环境要求
- **Node.js** `>= 22.5`（本项目使用 Node 24 内置 `node:sqlite`，无需 C++ 编译环境）
- **Python** `>= 3.10`（仅用于重新生成模拟 SQLite 数据库）

### 安装与启动

```bash
# 1. 安装依赖
npm install

# 2. 启动后端 API 服务（Hono + Better Auth + SQLite，端口 3001）
npm run server

# 3. 新开终端启动前端开发服务器（Vite，端口 5180，已代理 /api -> 3001）
npm run dev
```

访问：**http://localhost:5180/**

> **开发模式默认测试账号**（仅在非生产环境自动初始化）：
> - 管理员：`admin@pulselab.io` / `Admin@123456`
> - 固件工程师：`fw@pulselab.io` / `Engineer@123`

### 生成 200MB 百万行压测模拟库（可选）

仓库默认附带轻量的 `data/ssd_benchmark.db`（1,644 行）。如需本地验证 150MB–200MB 级查询性能，可运行：

```bash
python scripts/generate_150mb_db.py
```

将生成包含 1,350,000 行 `raw_io_traces` 及覆盖索引的 `data/ssd_150mb_sim.db`。

### 生产构建与运行

```bash
npm run build
NODE_ENV=production BETTER_AUTH_SECRET="your-strong-secret" npm run server
```

---

## 数据库物理隔离说明

| 数据库文件 | 用途 | 权限与隔离 |
| :--- | :--- | :--- |
| `data/ssd_benchmark.db` | 主遥测汇总与 300s 时序库 | 语义引擎池只读访问 |
| `data/ssd_150mb_sim.db` | 200MB 级百万行原始 IO Trace 模拟库 | 语义引擎池只读访问 |
| `data/auth.db` | Better Auth 用户、会话与个人布局（`user_workspaces`） | 仅认证层读写，严禁暴露给语义引擎 |
| `data/personal_datasets.db` | 用户个人导入的 CSV/JSON 快照（`user_datasets`） | 按 `user_id` 隔离，严禁暴露给语义引擎 |

---

## 开发手册与配套 Skills

- **完整前端开发手册**：[`docs/FRONTEND_HANDBOOK.md`](docs/FRONTEND_HANDBOOK.md)
- **可视化拓展 Skill**：[`.agents/skills/dataviz-scaffold/SKILL.md`](.agents/skills/dataviz-scaffold/SKILL.md)
- **SQLite 大库遥测运维 Skill**：[`.agents/skills/sqlite-telemetry-ops/SKILL.md`](.agents/skills/sqlite-telemetry-ops/SKILL.md)
