# ST-CoC 开发审查体系

## Checkpoint 清单

每个 checkpoint 触发时，自动启动 4 个 oracle 审查 agent，按各自视角独立审查后综合研判。

## 审查视角固定配置

| 审查者 | 代号 | 专长 |
|--------|------|------|
| Oracle 1 | **架构/安全** | 代码结构、错误处理、API 设计、SQL/状态一致性、注入风险 |
| Oracle 2 | **规则正确性** | CoC 7e 规则是否被正确实现、边界情况是否覆盖 |
| Oracle 3 | **测试/质量** | 测试覆盖、边界用例、代码可维护性、逻辑漏洞 |
| Oracle 4 | **UX/集成** | 端到端是否可用、API 是否能被 UI 正确调用、用户操作路径 |

## Checkpoint 位置

### CP-0：环境就绪（Phase 0 结束后）✅ 已完成
- ST 运行、Plugin 加载、API 可用
- 审查重点：开发环境正确性、CI/CD 准备

### CP-1：核心引擎就绪（Phase 1 结束后）✅ 已完成
- 骰子/SAN/DB/多轮生成
- 审查重点：规则正确性、测试覆盖

### CP-2：UI + 模组就绪（Phase 2 结束后）✅ 已完成
- 骰子面板、场景管理器、《鬼屋》模组
- 审查重点：UI 可用性、前后端对接、模组逻辑完整性

### CP-3：KP + 上下文就绪（Phase 3 结束后）⏳ 当前
- KP 四层 System Prompt、上下文管理器
- 审查重点：KP 提示词质量、上下文压缩策略、token 预算

### CP-4：车卡系统就绪（Phase 4 结束后）🔜
- 步骤式车卡 UI、属性/技能/职业/背景向导
- 审查重点：车卡流程完整性、数据校验、与 DB 对接

### CP-5：模组编辑器就绪（Phase 5 结束后）🔜
- YAML 模组格式、GUI 编辑器或 AI 辅助转换
- 审查重点：格式规范、用户体验、与场景引擎兼容

### CP-6：战斗面板就绪（Phase 6 结束后）🔜
- 先攻追踪、HP 管理、伤害计算 UI
- 审查重点：战斗规则正确性、UI 响应性

### CP-7：ST UI 重构就绪（Phase 7 结束后）🔜
- 全屏游戏 HUD 布局
- 审查重点：前后端解耦、性能、视觉一致性

### CP-8：发布就绪（Phase 8 结束后）🔜
- Docker 镜像、用户文档、示例模组包
- 审查重点：安装流程、首次用户体验、文档完整性

## CP-3 审查协议

当前 checkpoint。审查内容：

1. `kp-prompts.js` — KP System Prompt 质量（声音/节奏/反模式/场景注入）
2. `context-manager.js` — 分层上下文策略、压缩逻辑、token 估算
3. `scene-manager.js` — 模组场景逻辑完整性（NPC 知识门控、SAN 触发、线索提示）
4. `two-pass-generator.js` — Pass1→Pass2 管道设计、提示词构建
5. `index.js` — API 路由完整性、模块间解耦

审查指令：
```
Read /home/xhaoshen/ST-CoC-Implementation-Roadmap.md (the implementation plan)
Read /home/xhaoshen/ST-CoC-Platform-Design-v2.md (the architecture design)
Read these files: plugins/coc-rules-engine/kp-prompts.js, context-manager.js, 
  scene-manager.js, two-pass-generator.js, index.js
Read tests/dice-engine.test.js, tests/san-engine.test.js

From your assigned perspective [Architecture | CoC Rules | Testing | UX], 
critique the current implementation. Identify gaps between design intent and 
actual code. Flag any issues. Rate each module 1-5.
```
