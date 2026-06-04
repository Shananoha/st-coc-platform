# ST-CoC Platform

> 基于 SillyTavern 的《克苏鲁的呼唤》7e 单人跑团平台

一个完整的多组件 TRPG 平台：服务端插件提供 CoC 7e 规则引擎、AI 守秘人、场景管理，独立前端提供完整游戏界面，浏览器扩展提供辅助面板。

## 架构

```
┌─────────────────────────────────────────────┐
│                  st-coc-ui                  │
│              (独立前端 HTML)                 │
│   标题 → 选模组 → 选角色 → 游戏界面           │
│   AI 对话 / 骰子 / 战斗 / 角色卡 / 存档       │
└──────────────────┬──────────────────────────┘
                   │ HTTP API
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

## 目录

| 目录 | 说明 |
|------|------|
| `plugins/coc-rules-engine/` | ST 服务端插件 — 23 个 API 端点，CoC 7e 规则引擎 |
| `st-coc-ui/` | 独立前端 — 单文件 HTML SPA（标题→模组→角色→游戏） |
| `st-coc-ui/modules/` | 模组 JSON 数据 |
| `extensions/` | ST 浏览器扩展 — 角色卡、战斗面板、骰子面板、主题 |
| `tests/` | Jest 单元测试 |
| `docs/` | 开发文档与路线图 |

## 快速开始

### 前提

- [SillyTavern](https://github.com/SillyTavern/SillyTavern) 已安装并运行
- Node.js 18+

### 安装

```bash
git clone https://github.com/你的用户名/st-coc-platform.git
cd st-coc-platform
./setup.sh ~/SillyTavern   # 指定你的 SillyTavern 安装路径
```

`setup.sh` 会将：
- 插件复制到 `SillyTavern/plugins/coc-rules-engine/`
- 前端复制到 `SillyTavern/public/st-coc-ui.html`
- 模组数据复制到 `SillyTavern/public/st-coc-ui/modules/`

然后**重启 SillyTavern**，打开 `http://localhost:8000/st-coc-ui.html`。

### 开发

```bash
# 运行测试
npm install
npm test

# 修改文件后重新部署
./setup.sh ~/SillyTavern
# 前端无需重启 ST，后端需重启
```

## 功能

| 功能 | 状态 |
|------|:--:|
| KP AI 系统提示词 | ✅ |
| Two-Pass 检定叙事锁定 | ✅ |
| 场景切换 + 出口按钮 | ✅ |
| 角色 SQLite 持久化 | ✅ |
| 标题画面 + 新游戏流程 | ✅ |
| 模组选择器 | ✅ |
| 角色选择器 + 创建向导 | ✅ |
| 线索追踪面板 | ✅ |
| 设置面板（模型/温度/KP风格） | ✅ |
| 5 标签完整角色卡 | ✅ |
| NPC 对话面板 | ✅ |
| 战斗面板（含玩家闪避/格挡） | ✅ |
| 存档/读档 | ✅ |
| JSON 模组加载 | ✅ |
| 多调查员队伍 | ✅ |
| SSE 流式 AI 生成 | ✅ |
| 移动端适配 | ✅ |

## License

ISC
