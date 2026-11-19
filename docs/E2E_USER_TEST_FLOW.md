# PULSE LAB 端到端（E2E）用户使用测试流程

本文档定义了从“真实用户视角”验证 PULSE LAB 全流程可用性与易用性的标准测试 SOP，适用于每次发布便携包或重大功能迭代前的回归验收。

---

## 一、测试前置与构建校验

1. **代码与构建门禁**
   ```bash
   npm run verify
   ```
   - 确认 `tsc -b`、`eslint .`、`vite build` 全部通过（exit code 0）。
2. **便携包生成**
   ```bash
   npm run package:release
   ```
   - 确认生成 `release/pulse-lab-v<version>-portable.zip`。

---

## 二、冷启动与开箱体验测试（2 分钟内）

1. 将 `pulse-lab-v<version>-portable.zip` 解压到全新目录（不含 `node_modules` 与历史 `auth.db`）。
2. 执行一键启动：
   - **Windows**：双击 `一键启动.bat`（或 `start.bat`）
   - **macOS / Linux**：运行 `./start.sh`
   - **无界面自动化**：`NO_OPEN=1 API_PORT=3001 node launcher.mjs`
3. **通过标准**：
   - 自动检测 `Node.js >= 22.5.0`。
   - 首次启动自动生成并持久化 `data/.auth_secret`。
   - 端口被占用时自动递增可用端口，服务就绪后自动打开浏览器。
   - 控制台清晰打印访问 URL 与首次管理员默认账号（`admin@pulselab.io` / `Admin@123456`）。

---

## 三、浏览器 8 步核心路径走查

| 步骤 | 测试场景 | 操作与检查点 | 通过标准 |
| :--- | :--- | :--- | :--- |
| **1. 登录页加载** | 首屏渲染 | 打开 `http://localhost:3001` | HTTP 200，正常渲染登录卡片、邮箱/密码输入框与主题切换按钮，无白屏 |
| **2. 负向登录校验** | 错误密码提示 | 输入 `admin@pulselab.io` + 错误密码提交 | `POST /api/auth/sign-in/email` 返回 `401`，界面展示可读错误提示（如 `Invalid email or password`） |
| **3. 正向登录与刷新** | 会话持久化 | 使用 `admin@pulselab.io` / `Admin@123456` 登录，进入首页后按 `F5` 刷新 | 登录返回 `200`，进入工作台首页；刷新后仍保持登录状态 |
| **4. 导航与遥测图表** | 多模块切换 | 依次访问首页 `/`、性能模块（如 `CD Mark` `/product/x900-2tb/performance/cdmark`）、功耗模块（如 `Thermal 75°C` `/product/x900-2tb/power/thermal`）、`Viz Gallery`（`/showcase`） | 各模块 SVG/Canvas（含 3D WebGL 拓扑、热力图、样条图）正常渲染，无控制台 JS 报错 |
| **5. 表格交互与主题** | 检索/排序/主题记忆 | 在 `<DataTable />` 测试关键词搜索、标签筛选、列排序；切换 Dark/Light 主题后刷新页面 | 搜索/筛选/排序结果准确；刷新后主题偏好持久化保留 |
| **6. 个人空间导入** | CSV 上传与持久化 | 进入 `/myspace` → `个人数据导入`，上传测试 CSV（如 6 行遥测样本），刷新页面 | `POST /api/personal-datasets` 返回 `200`；自动生成 X/Y 轴预览图与数据表；刷新后数据集依然存在 |
| **7. 管理员控制台** | 多库与用户管理 | 进入 `/admin` | 正常展示 `data/*.db` 连接池（`ssd_benchmark.db` 状态为 `ACTIVE`）与用户列表 |
| **8. 退出登录** | 会话销毁 | 点击顶部 `Sign Out` | 返回登录界面，刷新不再自动进入工作台 |

---

## 四、多用户并发与 RBAC 隔离测试

使用仓库内置多用户 E2E 接口测试脚本：

```bash
# 开发模式（默认端口 3001）下运行
npm run server
# 新开终端执行
npm run test:multiuser
```

> **注意**：在 `NODE_ENV=production` 下，Better Auth 默认开启接口限流（Rate Limiting）；若在本地直接对无代理的 `localhost` 并发发起 5 个用户同时登录，可能触发 `429` 共享限流桶。生产环境多用户并发测试建议在开发模式或配置 `trustedProxies` / 错峰登录后执行。

---

## 五、首轮基准走查发现的待优化 UX 项（v1.0.0）

在 `v1.0.0` 便携包实测中，全部 8 步功能均通过，同时记录到以下可用性改进点供后续迭代修复：

1. **窄屏（`<= 1280px`）缺少退出入口**：顶部用户徽章与 `Sign Out` 按钮在 `<= 1280px` 宽度下被隐藏，且左侧边栏无兜底退出按钮。
2. **`/myspace` 首屏触发 `POST /api/semantic/query` 400**：进入或刷新 `/myspace` 时自动触发了一次空参数语义查询请求。
3. **`/myspace` 刷新重置子面板**：刷新后当前激活的 `个人数据导入` Tab 会重置回 `主面板 Panel`。
4. **局部文案截断与登出 URL 保留**：`<= 1440px` 下 `/admin` 表格角色/分页下拉有轻微截断；在 `/admin` 退出登录后浏览器地址栏仍停留在 `/admin`。
