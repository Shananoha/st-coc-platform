# ST-CoC Platform

> 基于 SillyTavern 的《克苏鲁的呼唤》7e 单人/多人跑团平台

完整的多组件 TRPG 平台：服务端插件提供 CoC 7e 规则引擎和 AI 守秘人，独立前端提供完整游戏界面，多 Agent 架构支持多角色同时运行。

---

## 架构

```
┌─────────────────────────────────────────────┐
│                  st-coc-ui                  │
│              (独立前端 HTML)                 │
│   标题 → 选模组 → 选角色 → 三栏游戏界面        │
│   AI 对话 / 骰子 / 战斗 / 角色卡 / 存档        │
└──────────────────┬──────────────────────────┘
                   │ HTTP + SSE
┌──────────────────▼──────────────────────────┐
│        plugins/coc-rules-engine             │
│           (SillyTavern 服务端插件)            │
│  dice-engine  san-engine  database          │
│  kp-prompts   scene-manager  two-pass-gen   │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│           SillyTavern (宿主机)               │
│         AI 代理 + HTTP 服务 + SSE            │
└─────────────────────────────────────────────┘
```

### 多 Agent 架构

```
                    ┌─────────────────┐
                    │   ST-CoC 引擎   │
                    │  (API 路由层)   │
                    └───┬───┬───┬─────┘
                        │   │   │
            ┌───────────┘   │   └───────────┐
            ▼               ▼               ▼
      ┌──────────┐   ┌──────────┐    ┌──────────┐
      │ deepseek │   │  kimi    │    │  gpt     │
      │ (KP)     │   │ (角色A)  │    │ (角色B)  │
      └──────────┘   └──────────┘    └──────────┘
```

每个角色和 KP 都是独立的 Agent——有各自的 system prompt、模型配置和 API key，互不干扰。

---

## 游戏界面

```
┌──────────────────────────────────────────────────────────────────┐
│ 🎭 ST-CoC    [▶️ 自动] [💾 保存] [⚙️ 设置] [📥 模组] [📤 导入] │
├──────────────┬───────────────────────────────┬────────────────────┤
│  队伍面板     │         聊天区                  │   工具面板         │
│              │                               │   🎲 骰子         │
│ 👤 杰克      │ [KP] 1925年10月，波士顿         │   📋 道具         │
│ 私家侦探     │ 秋雨绵绵。你坐在Knott先生       │   📝 笔记         │
│ SAN █████░░ │ 昏暗的办公室里...               │   ⚔️ 战斗         │
│ HP  ██████░ │                               │   📊 参考         │
│ 👤↔🤖 ⚙️    │ [杰克] 我打量着委托人。他       │                   │
│              │ 看起来非常紧张...              │                   │
│ ✚ 添加角色   │                               │                   │
│              │ [KP] 侦查检定：困难成功(42/70)  │                   │
│              │ 🎲 你注意到帽檐内侧露出        │                   │
│              │ 半截泛黄的报纸剪片...          │                   │
│              │                               │                   │
│              │ ┌─────────────────────────────┐│                   │
│              │ │ 描述你的行动...        [发送] ││                   │
│              │ └─────────────────────────────┘│                   │
└──────────────┴───────────────────────────────┴────────────────────┘
```

---

## 功能总览

### 核心跑团

| 功能 | 说明 |
|------|------|
| 🤖 KP 守秘人 AI | 5 层系统提示词，CoC 规则裁定，场景叙事 |
| 💬 对话驱动 | 玩家自然语言输入，KP 判断是否需要检定 |
| 🎲 Two-Pass 生成 | 骰子结果锁定后发给 AI，KP 基于结果叙事 |
| ⚡ SSE 流式输出 | AI 回复逐字流式显示 |
| 👥 多角色队伍 | 多个调查员同队，各自独立 HP/SAN/技能 |
| 🤖 AI 托管角色 | 角色交给 AI 代控，独立 Agent 人格 |
| ▶️ 自动模式 | KP 与所有 AI 角色自动互动跑团（最多 15 轮） |
| 🎲 骰子命令 | `.ra 技能` `.rc 属性` `.r XdY` `.rd` |
| ⚔️ 战斗系统 | 回合制攻击/闪避/格挡/伤害加值/重创/昏迷/护甲/贯穿/多打一 |
| 💾 存档管理 | 多存档槽 + 自动存档，JSON 存储，含聊天记录 |
| 🔌 模型管理 | 统一供应商列表，KP/角色共用，兼容任何 OpenAI API |
| 📜 游戏日志 | 全宽浮窗日志面板，完整对话记录 |

### 模组系统

| 功能 | 说明 |
|------|------|
| 📦 模组导入 | JSON 格式，前后端一致 schema（scenes/npcs/clues/san_triggers） |
| 🔄 模组切换 | 游戏中实时切换模组，场景/NPC/线索同步加载 |
| 💾 模组持久化 | 存档中保存模组 ID，读档恢复模组 |
| 📋 默认模组 | 内置《鬼屋 (The Haunting)》完整模组，含 3 场景 2 NPC 6 线索 |

### 角色系统

| 功能 | 说明 |
|------|------|
| 📋 7 步 CoC 车卡 | 对标 Dhole's House，1920s/现代/煤气灯 |
| 🎲 三种创建方式 | 掷骰 / 购点(460) / Quick-Start |
| 📚 46 完整技能 | 5 大类：社交/战斗/知识/操作/生存 |
| 📊 5 标签角色卡 | 属性/技能/战斗/装备/背景 |
| 📥 ST 卡导入 | 支持 V1/V2/V3 PNG/JSON 格式 |
| 🗄️ 角色持久化 | SQLite 存储，SAN/HP 实时同步 |
| ⚙️ 简化模型配置 | 角色只需选模型名，API 配置集中在设置里 |

---

## 快速开始

### 前提

- [SillyTavern](https://github.com/SillyTavern/SillyTavern) 已安装并运行
- Node.js 18+
- 已配置至少一个 AI API

### 安装

```bash
git clone https://github.com/Shananoha/st-coc-platform.git
cd st-coc-platform
./deploy.sh ~/SillyTavern    # or: ./deploy.sh /path/to/your/SillyTavern
```

打开 `http://localhost:8000/st-coc-ui.html`。部署脚本会自动重启 ST 服务器。

> **注意**: SillyTavern 服务端必须已安装并运行（或已配置好 API 密钥）。部署脚本会杀掉旧进程并以 `--listen` 模式重启。

---

## 游戏流程

```
标题画面
  ├── 新游戏 → 模组选择 → 角色选择 → 进入跑团
  └── 继续冒险 → 存档列表 → 恢复进度

自动模式:
  [角色切换 🤖] → [点击 ▶️ 自动]
  → KP 与 AI 角色自动互动（最多 15 轮）
  → 输入任意内容停止
```

---

## 骰子命令

| 命令 | 功能 | 示例 |
|------|------|------|
| `.ra 技能名` | 技能检定 | `.ra 侦查` |
| `.rc 属性名` | 属性检定 | `.rc 力量` |
| `.r XdY` | 自由掷骰 | `.r 3d6` |
| `.rd` | 掷 D100 | `.rd` |

---

## 目录结构

```
st-coc-platform/
├── README.md
├── setup.sh                      # 一键部署脚本
├── plugins/coc-rules-engine/     # ST 服务端插件
│   ├── index.js                  # 主路由 (~35 API 端点)
│   ├── dice-engine.js            # CoC 7e 骰子引擎
│   ├── san-engine.js             # SAN 检定引擎
│   ├── database.js               # SQLite 角色库
│   ├── kp-prompts.js             # KP 系统提示词 (5层)
│   ├── two-pass-generator.js     # Two-Pass 生成
│   ├── scene-manager.js          # 场景管理
│   └── occupations.json          # 10 个 CoC 职业
├── st-coc-ui/                    # 独立前端
│   ├── index.html                # 单文件 SPA
│   └── modules/haunting.json     # 鬼屋模组
├── extensions/                   # ST 浏览器扩展
├── tests/                        # Jest 测试
└── docs/                         # 开发文档
```

## API 参考

服务端插件提供 ~40 个 REST API 端点，挂载于 `/api/plugins/coc-rules-engine`。

| 分组 | 端点 | 方法 | 说明 |
|------|------|------|------|
| 生成 | `/generate/chat` | POST | AI 对话（支持多模型/角色/SSE） |
| 生成 | `/generate/skill-check-prompt` | POST | Two-Pass 技能检定提示词 |
| 场景 | `/scene/current` | GET | 当前场景含 NPC/线索/恐怖等级 |
| 场景 | `/scene/:id/transition` | POST | 场景转换 |
| 场景 | `/scene/clue/:id` | POST | 发现线索 |
| 角色 | `/character` | POST | 创建角色 |
| 角色 | `/character/full` | POST | 事务性角色创建 (角色+技能+装备) |
| 骰子 | `/roll/skill-check` | POST | 技能/属性检定 |
| 骰子 | `/roll/san-check` | POST | SAN 检定 |
| 骰子 | `/roll/damage` | POST | 伤害投骰 |
| 骰子 | `/roll/bonus` | POST | 奖励/惩罚骰 |
| 模组 | `/module/list` | GET | 模组列表 |
| 模组 | `/module/import` | POST | 导入模组 |
| 模组 | `/module/:id/activate` | POST | 激活模组 |
| 存档 | `/save` | POST | 创建存档 |
| 存档 | `/save/list` | GET | 存档列表 |
| 配置 | `/api-config` | GET | 模型供应商列表 |

## 已知限制

- **模组格式**: 当前仅支持 JSON 导入（通过 `prompt()` 粘贴），文件上传 UI 待建设
- **AI 角色技能检定**: AI 角色可描述行动意图，但不会自动触发技能检定（需玩家手动执行）
- **CSRF 保护**: POST 端点受 ST CSRF 保护，curl 调用需携带 CSRF token；浏览器正常
- **MOV 10 档位**: DEX+SIZ ≥ 100 → MOV 10 已修复
- **信用评级**: CoC 7e 5 级制已对齐

## License

MIT
