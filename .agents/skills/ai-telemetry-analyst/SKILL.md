---
name: ai-telemetry-analyst
description: 当需要让本地 AI Agent（如 OpenCode、千问 Agent 等）读取已做好的数据表、分析 SSD 性能/功耗指标，并将分析结论自动发布展示到网页看板上时使用。
---

# AI Telemetry Analyst Skill

用于让本地 AI Agent（OpenCode / 千问 Agent）通过 **CLI** 或 **MCP** 读取 PULSE LAB 的语义层数据表，完成对比推理后将分析结论写回 SQLite，由网页在 5 秒内自动同步上墙展示。

## 方式一：通过内置 CLI 读取与发布（推荐 OpenCode 直接调用）

1. **查看可用数据库、语义表指标与页面 Scope**
   ```bash
   npm run ai:cli -- catalog
   ```
2. **拉取聚合好的 Markdown 数据表进行分析**
   ```bash
   # 示例：按固件分组查看高温 75°C 下的带宽、功耗与能效
   npm run ai:cli -- query --dataset ssd_runs --metrics avg_bandwidth,avg_power,efficiency,p99_latency --groupBy firmware --where workload=THERMAL_75C

   # 示例：查询 200MB 百万行原始 IO Trace 聚合表
   npm run ai:cli -- query --dataset raw_io_traces --metrics trace_count,avg_latency_us,avg_power_mw --groupBy firmware
   ```
3. **将 AI 分析结论发布到网页指定页面（5 秒内自动上墙）**
   ```bash
   npm run ai:cli -- publish \
     --scope custom-fw \
     --agent OpenCode \
     --severity improvement \
     --title "FW 2.1.3 在 75°C 高温箱下能效领先 31%" \
     --summary "基于 ssd_runs 聚合表对比：FW 2.1.3-NEXT 在 75°C 持续负载下保持 0 次热降频，能效达 **952 MB/s/W**。" \
     --metrics "能效比:952 MB/s/W,热降频:0次,对比基线:+31.2%"
   ```
   - 可选 `--scope`：`global`（全站可见）、`cdmark`、`pcmark`、`3dmark`、`fio`、`active-power`、`sleep-states`、`thermal`、`custom-fw`、`custom-qa`、`custom-exec`、`custom-sandbox`、`myspace`。

## 方式二：通过本地 stdio MCP Server 接入（适合千问 Agent / MCP 客户端）

在千问 Agent 或 OpenCode 的 MCP 配置中添加：
```json
{
  "mcpServers": {
    "pulse-lab-telemetry": {
      "command": "npx",
      "args": ["tsx", "server/mcp.ts"],
      "cwd": "c:/Users/Administrator/Documents/Code/tasks/data-platform"
    }
  }
}
```
包含 4 个标准 MCP 工具：`get_telemetry_catalog`、`query_telemetry_table`、`list_ai_insights`、`publish_ai_insight`。
