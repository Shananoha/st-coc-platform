# 开发日志

## 2026-06-03 - Phase 1 完成
- ✅ Jest 30.4.1 + better-sqlite3 installed
- ✅ dice-engine.js: 22 tests all green
- ✅ san-engine.js: 10 tests all green  
- ✅ database.js: SQLite in ST's data/coc/ directory, WAL mode
- ✅ two-pass-generator.js: Pass1→Pass2 prompt building
- ⚠️ SAN insanity bug caught (was triggered on pass, fixed in extracted module)
- ⚠️ CSRF blocks curl; dev uses --disableCsrf flag
- ⚠️ Plugin files now tracked in project plugins/ dir; deployed to ~/apps/SillyTavern/plugins/

## 2026-06-02 - Phase 0 启动
- 确认现有 ST 安装：`/home/xhaoshen/apps/SillyTavern/`（staging 分支，最新）
- 决定：不删除现有 ST，直接在现有 ST 上加插件/扩展
- 创建项目目录 `~/projects/st-coc-platform/`
- 创建 `.coc-dev-config.md` 记录开发环境关键信息
- 浏览器自动启动关闭：browserLaunch.enabled: false
