你正在开发 ST-CoC 跑团平台 —— 一个基于 SillyTavern 后端的单人 AI 跑团工具，支持 Call of Cthulhu 7e 规则。

## 开始前先读这些文件

1. `/home/xhaoshen/projects/st-coc-platform/.coc-dev-config.md` — 开发环境配置（ST 路径、sudo 密码 111、API 信息）
2. `/home/xhaoshen/projects/st-coc-platform/docs/UI-gap-analysis.md` — 4 方 Oracle 审查后的完整缺失清单 + Wave 0-3 修复路线图
3. `/home/xhaoshen/projects/st-coc-platform/st-coc-ui/index.html` — 独立的 CoC 游戏 HUD 前端（当前在 `ui-rewrite` 分支）

## 项目现状

**两个分支：**
- `master` → `v0.5.0-stable`：ST 扩展模式（4 个扩展挂在 ST 里），已定格不动
- `ui-rewrite`：独立前端模式（一个 HTML 替代 ST 界面），当前活跃

**已有功能（后端）：**
- CoC Rules Engine 插件：骰子/SAN/战斗引擎、SQLite 角色数据库、多轮生成器、KP 提示词（4 层 System Prompt）、场景管理器（《鬼屋》3 场景硬编码）
- 23 个 API 端点，运行在 `http://localhost:8000/api/plugins/coc-rules-engine/`

**已有功能（前端 st-coc-ui/index.html）：**
- 完整的 CoC 恐怖视觉主题（暗黑 + 噪声纹理 + Georgia 衬线叙事字体）
- 侧边栏：SAN/HP/MP 进度条、场景名 + 恐惧等级、技能快捷按钮
- 聊天区：AI 对话（通过 `/generate/chat` 代理）、骰子结果着色
- 战斗面板（弹窗）：NPC 添加、先攻排序、伤害追踪
- 角色档案弹窗、SAN 检定弹窗、D100 快捷掷骰

**核心缺陷（必须立刻修）：**
1. KP 系统提示词未注入 AI —— `/generate/chat` 直接转发裸消息，AI 不知道自己是守秘人
2. 多轮生成（Two-Pass）未连接 —— 骰子结果和 AI 叙述走两条路径，AI 可覆盖骰子
3. 角色硬编码在 JS 全局变量中，不读写后端 SQLite 数据库
4. 场景只读显示，无法推进过渡（《鬼屋》永远停在第一幕）
5. 没有"开始新游戏"流程（无模组选择、无角色创建导入、无存档读档）

**后端 17/23 个 API 端点前端未调用**，包括角色 CRUD、场景过渡、线索管理、职业数据。

## 关键路径

| 路径 | 值 |
|------|-----|
| ST 本体 | `/home/xhaoshen/apps/SillyTavern/` |
| 项目目录 | `/home/xhaoshen/projects/st-coc-platform/` |
| 独立前端 | `http://localhost:8000/st-coc-ui.html` |
| API base | `http://localhost:8000/api/plugins/coc-rules-engine` |
| 当前分支 | `ui-rewrite` |
| ST 启动方式 | `cd ~/apps/SillyTavern && node server.js --disableCsrf` |
| sudo 密码 | `111` |
| AI 模型 | deepseek-v4-pro（通过 opencode.ai 代理，配置在 ST 的 settings.json 中） |

## 你的任务

继续完善 `st-coc-ui/index.html` 独立前端。按 `docs/UI-gap-analysis.md` 中的 **Wave 0** 顺序执行：

1. **注入 KP System Prompt**：修改 `/generate/chat` 端点，每次调用前自动读取 kp-prompts.js 构建 system prompt 并注入
2. **连接 Two-Pass 生成**：`/generate/chat` 接受 `checkResult` 字段，自动跑 Pass1→Pass2
3. **场景 Exit 按钮**：UI 侧边栏显示可用的场景出口，点击调用场景过渡
4. **角色持久化**：页面加载时读 SQLite，SAN/HP 变化时写回

每次修改后重启 ST（端口 8000），用 curl 验证后端，前端刷新浏览器验证。
