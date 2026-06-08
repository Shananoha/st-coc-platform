你正在继续开发 ST-CoC 跑团平台 —— 一个基于 SillyTavern 后端的单人/多人 AI 跑团工具，支持 Call of Cthulhu 7e 规则。

## 开始前先读这些文件

1. `/home/xhaoshen/projects/st-coc-platform/.coc-dev-config.md` — 开发环境配置（ST 路径 `~/apps/SillyTavern`、sudo 密码 `111`、API 信息）
2. `/home/xhaoshen/projects/st-coc-platform/st-coc-ui/index.html` — 独立前端 SPA（~1050 行，120KB单文件）
3. `/home/xhaoshen/projects/st-coc-platform/plugins/coc-rules-engine/index.js` — 后端 API（~560 行，35+端点）
4. `/home/xhaoshen/projects/st-coc-platform/docs/REDESIGN-PLAN.md` — 重构实施计划（Waves A-H 全部完成）

## 项目现状

**分支**: `ui-rewrite`（活跃）。GitHub: `https://github.com/Shananoha/st-coc-platform`

**架构**:
```
st-coc-ui (前端 HTML SPA) → HTTP/SSE → plugins/coc-rules-engine (ST 插件) → ST AI 代理
```

### 后端 (plugins/coc-rules-engine/)
- **index.js**: 主路由，35+ 端点（/generate/chat, /character/*, /roll/*, /save/*, /module/*, /import/st-card, /api-config, /scene/*等）
- **database.js**: SQLite 角色持久化。自动迁移缺失列（key_connection, age, sex, birthplace等）
- **kp-prompts.js**: 5 层 KP 系统提示词（基础语调 → 节奏 → 对话驱动 → 反模式 → 场景上下文）
- **two-pass-generator.js**: Two-Pass 生成（检定结果锁定+AI叙事）
- **scene-manager.js**: 3 个硬编码场景（The Haunting / 鬼屋）。对话驱动模式——无固定出口
- **dice-engine.js / san-engine.js**: CoC 7e 规则引擎
- **occupations.json**: 10 个 CoC 职业
- **context-manager.js**: 场景上下文管理

### 前端 (st-coc-ui/index.html)
**单文件 SPA，vanilla JS，`var` only, 单引号, 字符串拼接, 无箭头函数, 无backtick。**

**界面**: 三栏布局（左 250px 队伍面板 / 中 flex 聊天区 / 右 40px 工具图标栏）
- **标题画面**: "探索者之幕" → 新游戏 / 继续冒险
- **模组选择**: 从 `modules/haunting.json` 或已导入模组选择
- **角色选择**: 快速开始 / 创建新角色（7步车卡）/ 从存档加载
- **游戏界面**: KP 对话驱动叙事，无"行动方向"按钮

**核心功能（已完成）**:
1. **KP 守秘人 AI**: 5层系统提示词，CoC 规则裁定，对话驱动
2. **Two-Pass 生成**: 骰子结果锁定→AI叙事
3. **SSE 流式输出**: 逐字流式显示AI回复（需修复 choices[0].delta.content 解析）
4. **多角色队伍**: `party[]` 数组，每角色独立 HP/SAN/技能
5. **AI 托管角色**: 角色可切换 🤖托管，`toggleCharControl(id)`
6. **自动模式**: `toggleAutoPlay()` → `runAutoPlayRound()` 循环（最大15轮）。玩家输入即停止
7. **骰子命令**: `.ra 技能` `.rc 属性` `.r XdY` `.rd`
8. **战斗系统**: 回合制，伤害/闪避/格挡，玩家可受伤
9. **7 步 CoC 车卡**: 对标 Dhole's House，3 种创建方式，46 技能
10. **5 标签角色卡**: 属性/技能/战斗/装备/背景
11. **ST 卡导入**: V1/V2/V3 PNG/JSON 拖拽导入
12. **多存档**: 后端 JSON 存储，含聊天记录。自动存档固定 `auto` 槽覆盖
13. **模型供应商管理器**: 统一管理（设置内联列表），KP/角色共用。读 ST 的 secrets.json
14. **浮窗工具面板**: 日志(全宽)、骰子命令、技能速查、战斗入口
15. **移动端适配**: `@media(max-width:800px)` 响应式布局

**关键全局变量**:
```javascript
var API='http://localhost:8000/api/plugins/coc-rules-engine';
var char={name:'詹姆斯·卡特',occupation:'私家侦探',san:70,...};
var charId='pregen-001';
var party=[];           // [{id,name,charData,control:'player'|'ai',aiModel,aiPersonality,...}]
var activeCharId='pregen-001';
var useStream=true;
var autoPlayActive=false;
```

**关键函数**:
- `sendToAI(text,extra)` — 发送给 KP，自动附加 characterSummary, model, apiKey, baseUrl, characterPersonality
- `sendMessage()` — 先检查 `processInput()`（骰子命令），再调 sendToAI
- `triggerAiReactions()` — sendToAI 完成后触发 AI 角色回应
- `runAutoPlayRound()` — 自动模式循环：AI角色行动→KP响应
- `enterGame()/loadGame(saveData)` — 初始化 party，开场 KP
- `renderParty()` — 渲染队伍面板角色卡（HP/SAN条，👤/🤖切换）

**前端代码风格（关键！）**:
- `var` only。NO `let`/`const`。NO 箭头函数 `=>`。NO 模板字符串 `` ` ``。
- 单引号 `'`。字符串拼接用 `+`。
- 函数: `function f(){...}` 或 `async function f(){...}`
- HTML onclick 属性内单引号不需要转义: `onclick="document.getElementById('x')...."` ✅

## 已修复的关键 Bug（不要再出现）

1. **SSE 解析字段**: `json.choices[0].delta.content`（不是 `json.content`）
2. **stream-text ID 冲突**: 每次流式响应创建新 div 后用 `getElementById` 拿到旧的 → 改用直接引用
3. **party 数组未初始化**: enterGame/loadGame 必须 `party=[...]`
4. **close 按钮失效**: HTML 属性中 `\'` 应改为 `'`
5. **save-dlg 被 title-screen 遮盖**: openSaveManager 先隐藏 title-screen
6. **auto-save 堆积**: 用固定 `id:'auto'` 覆盖同一文件
7. **数据库缺失列**: database.js 有 ALTER TABLE 自动迁移
8. **api-config 路径错误**: `path.join(__dirname, '..', '..')`（不是 `'..','..','..'`）
9. **continueGame 忽略存档**: 已修复为 `loadGame(saveData)`
10. **loadGame 双重初始化**: 移除多余的 `enterGame()` 调用
11. **AI托管角色不回应**: `triggerAiReactions` 跳过 `activeCharId` 的 bug 已修复

## 部署流程

```bash
# 后端修改后：
cp -r /home/xhaoshen/projects/st-coc-platform/plugins/coc-rules-engine /home/xhaoshen/apps/SillyTavern/plugins/
kill -TERM $(pgrep -f "node server"); sleep 3
cd /home/xhaoshen/apps/SillyTavern && nohup node server.js --disableCsrf > /tmp/st-coc.log 2>&1 &
# 前端修改后（无需重启ST）：
cp /home/xhaoshen/projects/st-coc-platform/st-coc-ui/index.html /home/xhaoshen/apps/SillyTavern/public/st-coc-ui.html
```

**ST 启动慢**：用 `kill -9` 杀进程，`nohup node server.js --disableCsrf > /dev/null 2>&1 &` 启动，等 10-20 秒。

**验证语法**：
```bash
node --check plugins/coc-rules-engine/index.js   # 后端
node -e "var fs=require('fs');var h=fs.readFileSync('st-coc-ui/index.html','utf8');var m=h.match(/<script>([\s\S]*?)<\/script>/);if(m){try{new Function(m[1]);console.log('JS OK')}catch(e){console.log('JS ERROR:',e.message)}}"   # 前端
```

## 已知待改进项

1. **AI 角色不会主动用技能**: `runAutoPlayRound` 提示词让角色"描述想做之事"，但后端没有自动执行检定。需要让 KP 识别角色的技能使用意图并调用检定 API
2. **存档只有文本无格式化**: chatHistory 存了 textContent 但丢失了消息类型（系统/KP/玩家/骰子）
3. **模组系统是骨架**: 只支持 JSON 导入，没有 AI 辅助解析模组文本的功能
4. **ST 的模型列表未暴露**: `GET /api-config` 只读了 secrets.json，ST 的可用模型列表（来自 API）未返回
5. **自动保存 5 分钟太频繁**: 可改为 10-15 分钟，或仅在重大事件时触发
6. **移动端体验**: 基础响应式已做好，但触摸交互可优化
7. **游戏内看不到信用评级/现金**: CoC 的经济系统未在 UI 中展示
8. **没有帮助/教程**: 新用户不知道 `.ra` 命令和流程

## 下一阶段建议

1. **修复 AI 角色技能检定**: 让 KP 能识别角色的检定意图并实际掷骰
2. **完善模组系统**: AI 辅助文本→JSON 解析，支持更多模组
3. **改进存档格式**: 保存带类型的消息（非纯文本），支持完整恢复
4. **ST 集成深化**: 读取 ST 的可用模型列表，同步到供应商管理器
5. **用户引导**: 添加新手指南/帮助面板/快捷键提示

## 重要提醒

- 所有 AI 对话走 `/generate/chat`（不是 ST 原生 API）
- 后端运行在 ST 进程内，共享 ST 的 better-sqlite3
- 前端 `var` / 单引号 / 字符串拼接 是硬性约束
- 每步修改后必须验证 JS 语法
- GitHub push 前先 `git add -A && git commit && git push origin ui-rewrite`
