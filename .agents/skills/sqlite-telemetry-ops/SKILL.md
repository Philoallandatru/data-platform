---
name: sqlite-telemetry-ops
description: 安全操作、查询、写入、压缩及实时同步 150MB–4GB 级 SSD 遥测 SQLite 数据库（含 MCP 增量写入与 WAL 并发）时使用。
---

# SQLite Telemetry Ops Skill

用于管理 `data/ssd_benchmark.db` 及 `150MB–4GB` 级大规模遥测 SQLite 数据库，确保高并发安全、低内存占用与前端实时同步。

## 核心原则

### 1. 并发读写与 WAL 模式（MCP 写入 + 前端读取）
- 所有写入脚本或 MCP 工具连接数据库时，必须启用 WAL 模式：
  ```sql
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA busy_timeout = 3000;
  ```
- 前端 API 层（`vite.config.ts` 中的 `node:sqlite`）应保持**只读长连接**并设置 `PRAGMA busy_timeout = 3000`。

### 2. 保证前端数据随 SQLite 自动更新
- **不要**在每次轮询时全表扫描或传输全量 JSON。
- 使用 `PRAGMA data_version`（当外部进程/MCP 提交写入时自动递增）配合核心表计数作为轻量级变更签名（`/api/ssd-version`，耗时 `<0.1ms`）。
- 仅当签名发生变化时，前端再拉取当前视图所需的聚合或分页数据。

### 3. 处理 4GB 稀疏库 → 150MB 有效数据
- 面对包含大量空表或历史碎片的 4GB 库：
  1. **索引覆盖**：为高频筛选字段建立复合索引（例如 `CREATE INDEX idx_traces_mft ON raw_io_traces(model_id, firmware_id, test_id, ts_ms DESC)`）。
  2. **定期压缩**：在维护窗口执行 `PRAGMA wal_checkpoint(TRUNCATE);` 与 `VACUUM;`（或开启 `PRAGMA auto_vacuum = INCREMENTAL`）回收空页。
  3. **统计信息更新**：大批量 MCP 插入后执行 `ANALYZE;`，确保 SQLite 查询优化器选择正确索引。
  4. **分页查询**：明细表严禁 `SELECT *`，必须使用 `WHERE ... ORDER BY ... LIMIT ? OFFSET ?` 或键集分页（Keyset Pagination `WHERE id < ?`）。

### 4. 常用 Python / Node 验证命令
- 查看库大小与表行数：
  ```bash
  python -c "import sqlite3; c=sqlite3.connect('data/ssd_benchmark.db'); print(c.execute(\"SELECT name FROM sqlite_master WHERE type='table'\").fetchall())"
  ```
- 模拟 MCP 增量写入并触发前端自动同步：向 `benchmark_runs` 或 `regression_alerts` 插入一条记录并 `COMMIT`，前端将在 5 秒内自动感知 `PRAGMA data_version` 变化并刷新。
