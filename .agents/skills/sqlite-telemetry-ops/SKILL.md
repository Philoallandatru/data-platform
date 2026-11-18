---
name: sqlite-telemetry-ops
description: 安全操作、查询、写入、压缩及实时同步 150MB–4GB 级 SSD 遥测 SQLite 数据库（含 MCP 增量写入与 WAL 并发）时使用。
---

# SQLite Telemetry Ops Skill

用于管理 `data/` 下的多库遥测体系及 `150MB–4GB` 级大规模 SQLite 数据库，确保高并发安全、低内存占用与前端实时同步。

## 核心原则

### 1. 四库物理隔离架构
- **业务遥测库**：`data/ssd_benchmark.db`、`data/ssd_150mb_sim.db`（由 `server/semantic.ts` 多库连接池 `readOnly: true` 挂载）。
- **认证与布局库**：`data/auth.db`（Better Auth 用户/会话及 `user_workspaces`）。
- **个人导入库**：`data/personal_datasets.db`（`user_datasets`，按 `user_id` 隔离）。
- **严格隔离**：`server/semantic.ts` 的 `isTelemetryDbFile()` 必须始终排除 `auth*` 与 `personal_datasets*`，绝不将认证或个人库暴露进共享数据源池。

### 2. 并发读写与 WAL 模式（MCP 写入 + 服务端读取）
- 所有写入脚本或 MCP 工具连接数据库时，必须启用 WAL 模式：
  ```sql
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA busy_timeout = 3000;
  ```
- 写入覆盖（如 `DELETE + INSERT`）必须包裹在 `BEGIN ... COMMIT`（异常 `ROLLBACK`）原子事务中；上传接口需在 `JSON.parse` 前校验 `Content-Length` 与原始字节上限。

### 3. 语义层与轻量变更同步
- 后端通过 `server/semantic.ts` 暴露白名单 `SEMANTIC_DATASETS`（参数化绑定 + `LIMIT <= 200`），禁止直接透传原生 SQL。
- 前端每 5 秒轮询 `/api/ssd-version`（读取 `PRAGMA data_version` 与表行数签名，耗时 `<0.1ms`），仅当外部 MCP 写入导致签名变化时才重新拉取数据。

### 4. 处理 4GB 稀疏库 → 150MB 有效数据
- 为高频筛选字段建立复合覆盖索引（如 `idx_traces_mft(model_id, firmware_id, test_id, ts_ms DESC)`）。
- 管理员可通过后台或 `POST /api/admin/ssd-maintenance` 执行 `PRAGMA wal_checkpoint(TRUNCATE); ANALYZE;`；大体积空页回收使用 `VACUUM`。
- Vite 开发服务器必须保留 `blockSensitivePathsPlugin`，严禁静态暴露 `/data/*` 与 `/server/*`。
