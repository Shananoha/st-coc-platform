# CP-5 模块系统 — 架构断层记录

## 状态：审查完成，未修复。原因：需架构建设而非 bug 修复。

## 核心发现

**模块系统是一套独立的 JSON CRUD，与游戏引擎完全断开。**
- `selectModuleForGame` 写入 localStorage，没有任何代码读取
- `scene-manager.js` 永远使用硬编码 SCENES
- 存取的模块格式 `{meta, background, npcs:[], locations:[]}` 与引擎期望的 SCENES 格式 95% 不兼容

## 待建设清单（3-4d）

1. 定义统一模块 schema（Oracle 2 提供完整草稿）
2. scene-manager 新增 loadModule() 接口
3. 接线 selectModuleForGame → enterGame → loadModule
4. 保存版本化（module hash 写入存档）
5. 替换 prompt() 为模态编辑器 + 文件上传
6. AI 辅助模组生成模板

## Oracle 评分

| 维度 | 评分 |
|------|:--:|
| 架构/安全 | 1.2/5 |
| 格式/模式 | 2.0/5 |
| 测试/质量 | 2.0/5 |
| UX/集成   | 1.0/5 |
