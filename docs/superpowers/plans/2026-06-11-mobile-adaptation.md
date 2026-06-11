# Mobile Adaptation Implementation Plan

> **目标**：将 ST-CoC 适配为移动端可用，保持桌面端不变。核心改动：底部 5 按钮标签栏 + 横向队伍 + 触摸目标 ≥44px + 工具底部弹出面板。

**架构**：复用现有 `tools-panel` `<aside>` 在移动端切换为底部 bar。复用 `toggleTool()` / `renderToolContent()` 逻辑，仅新增 `switchMobileTab()` 来控制移动端 workspace 切换。工具浮动面板在移动端变为 `position:fixed; bottom` 的底部 sheet。

**技术栈**：vanilla CSS（1 个 @media 块修改）+ vanilla JS（2 个新函数）+ HTML（meta 标签 1 行改动）。

**文件**：`st-coc-ui/index.html`（单文件，约 1134 行）

---

## 代码现状（关键引用）

| 元素 | 位置 | 作用 |
|------|------|------|
| `.tools-panel` | L230 `<aside>` | 6 个 `.tool-icon` 按钮（🎲📋📝⚔️📊📜） |
| `toggleTool(tool)` | L381 | 桌面：打开 floating panel。读取 `activeTool` |
| `renderToolContent(tool)` | L381 | 生成 dice/items/notes/combat/ref/log 六个面板 HTML |
| `closeToolFloat()` | L381 | 关闭面板，清除 `activeTool` |
| `#tool-float` | L232 | 浮动面板 DOM（`position:fixed; top:50px; right:60px`） |
| `@media(max-width:800px)` | L110 | 当前移动端：`tools-panel{display:none}`，party 160px截断 |
| `.party-scroll` | L18 | 队伍列表（`flex-direction:column`） |
| `char-card` | — | 角色卡片（在 `.char-card` 类下渲染） |

---

## Checkpoint 结构

| CP | 名称 | 验证 | 依赖 |
|----|------|------|:--:|
| CP-M1 | 底部标签栏 + 触摸目标 | 5 按钮可见，≥44px，桌面不变 | — |
| CP-M2 | 工具底部 sheet + ⚙️ 更多面板 | 骰子/战斗/角色卡/道具/笔记/参考/日志 全部可访问 | M1 |
| CP-M3 | 横向队伍 + 输入优化 | 队伍可滑动，输入 15px 字体 | M1 |
| CP-M4 | Android 特化 + 回归验证 | Chrome DevTools 375px 无溢出，桌面 3 列布局不变 | M1-M3 |

---

## 实现任务

### CP-M1：底部标签栏 + 触摸目标

**任务 1.1：替换 @media 块（CSS）**

文件：`st-coc-ui/index.html`，行 110。

OLD（8 规则）：
```css
@media(max-width:800px){.game-container.active{grid-template-columns:1fr;grid-template-rows:36px auto 1fr}.party-panel{max-height:160px;border-right:none;border-bottom:1px solid var(--border-subtle)}.tools-panel{display:none}.sidebar{display:none!important}.mobile-menu-btn{display:block!important}.overlay-content{width:95%!important;max-width:95%!important;font-size:11px}.sheet-tab{font-size:10px}.cc-skill-row input{width:50px}}
```

NEW（保留原有 + 新增）：
```css
@media(max-width:800px){
  /* 栅格：5 行（header / party / chat / input / tabs）*/
  .game-container.active{grid-template-columns:1fr;grid-template-rows:36px auto 1fr auto 56px;height:100dvh}
  /* 队伍：横向滚动 */
  .party-panel{max-height:none;border-right:none;border-bottom:1px solid var(--border-subtle);overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch}
  .party-panel::before{display:none}
  .party-scroll{flex-direction:row;flex-wrap:nowrap;gap:var(--sp-2);padding:var(--sp-2) var(--sp-3);overflow-x:auto;overflow-y:hidden}
  .party-scroll::-webkit-scrollbar{height:0}
  .char-card{min-width:140px;flex-shrink:0;min-height:44px;padding:var(--sp-2) var(--sp-3)}
  .char-card-name{font-size:12px}
  .char-vital-bar-track{height:5px}
  /* 聊天 */
  .chat-area{grid-row:3;min-height:0}
  .messages{padding:var(--sp-3) var(--sp-4);gap:var(--sp-3)}
  .narrative-text{font-size:14px;line-height:1.75}
  .player-action{max-width:85%}
  /* 输入 */
  .input-area{grid-row:4;padding:var(--sp-2) var(--sp-3) calc(var(--sp-2) + env(safe-area-inset-bottom,0px));border-top:1px solid var(--border-dark);background:var(--bg-deep)}
  .input-field{min-height:44px;font-size:15px;padding:var(--sp-2) var(--sp-3)}
  .send-btn{min-height:44px;min-width:60px;padding:var(--sp-2) var(--sp-3);font-size:13px}
  /* 标签栏：repurpose tools-panel */
  .tools-panel{display:flex!important;grid-row:5;width:100%;flex-direction:row;border-left:none;border-top:1px solid var(--border-subtle);background:var(--bg-deep);padding-bottom:env(safe-area-inset-bottom,0px)}
  .tools-icons{flex-direction:row;width:100%;justify-content:space-around;align-items:center;padding:0;gap:0}
  .tool-icon{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:52px;min-width:44px;padding:var(--sp-1) 0;font-size:19px;background:none;border:none;color:var(--text-dim);cursor:pointer;-webkit-tap-highlight-color:transparent;position:relative}
  .tool-icon::after{content:attr(title);font-size:9px;letter-spacing:.5px;margin-top:1px;color:var(--text-dim);font-family:var(--font-ui)}
  .tool-icon.active{color:var(--san-gold)}
  .tool-icon.active::after{color:var(--san-gold)}
  /* 浮窗 → 底部 sheet */
  .tool-float.show{display:flex;position:fixed;top:auto;bottom:calc(56px + env(safe-area-inset-bottom,0px));left:0;right:0;width:100%;max-height:65vh;border-radius:var(--r-md) var(--r-md) 0 0;z-index:200;transform:translateY(0)}
  .tool-float-body{padding:var(--sp-3) var(--sp-4);padding-bottom:calc(var(--sp-4) + 56px + env(safe-area-inset-bottom,0px))}
  .tool-float-header{padding:var(--sp-2) var(--sp-4)}
  .tool-float-close{font-size:16px;min-width:36px;min-height:36px;display:flex;align-items:center;justify-content:center}
  /* 对话框 */
  .san-dialog-content{width:92%;max-width:none;max-height:80vh;overflow-y:auto}
  .sheet-tab{min-height:44px;font-size:12px;padding:var(--sp-2) var(--sp-3)}
  .action-btn{min-height:44px;padding:var(--sp-2) var(--sp-3);font-size:13px}
  .header-btn{min-height:32px;min-width:32px;padding:var(--sp-1) var(--sp-2);font-size:11px}
  /* 旧规则保留 */
  .overlay-content{width:95%!important;max-width:95%!important;font-size:11px}
  .cc-skill-row input{width:50px}
  /* 触摸优化：Android + iOS */
  button,input,textarea,select,.char-card,.tool-icon,.action-btn,.skill-btn{touch-action:manipulation}
}
```

**任务 1.2：添加 viewport-fit（HTML）**

文件：`st-coc-ui/index.html`，行 1。

OLD：`<meta name="viewport" content="width=device-width,initial-scale=1.0">`
NEW：`<meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover">`

**任务 1.3：JS — 标签栏切换逻辑**

文件：`st-coc-ui/index.html`，在 `toggleTool` 附近（L381 之后）添加：

```javascript
function switchMobileTab(tab){
  // 关闭可能打开的工具面板
  closeToolFloat();
  // 更新标签栏 active 态
  document.querySelectorAll('.tool-icon').forEach(function(b){b.classList.remove('active')});
  if(tab==='chat'){
    // 对话：隐藏所有 tool-float，显示聊天
    return;
  }
  if(tab==='more'){
    toggleMoreSheet();
    return;
  }
  toggleTool(tab);
}

function toggleMoreSheet(){
  var panel=document.getElementById('tool-float');
  var title=document.getElementById('tool-float-title');
  if(panel.classList.contains('show')&&activeTool==='more'){
    panel.classList.remove('show');
    document.querySelectorAll('.tool-icon').forEach(function(b){b.classList.remove('active')});
    return;
  }
  activeTool='more';
  title.textContent='更多工具';
  panel.className='tool-float show';
  var b=document.getElementById('tool-float-body');
  b.innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+
    '<button class="more-sheet-btn" onclick="closeToolFloat();toggleTool(\'items\')" style="display:flex;align-items:center;gap:8px;padding:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(139,125,107,0.15);border-radius:8px;color:var(--text-parchment);font-size:12px;cursor:pointer;min-height:48px"><span style="font-size:18px">📋</span>道具</button>'+
    '<button class="more-sheet-btn" onclick="closeToolFloat();toggleTool(\'notes\')" style="display:flex;align-items:center;gap:8px;padding:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(139,125,107,0.15);border-radius:8px;color:var(--text-parchment);font-size:12px;cursor:pointer;min-height:48px"><span style="font-size:18px">📝</span>笔记</button>'+
    '<button class="more-sheet-btn" onclick="closeToolFloat();toggleTool(\'ref\')" style="display:flex;align-items:center;gap:8px;padding:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(139,125,107,0.15);border-radius:8px;color:var(--text-parchment);font-size:12px;cursor:pointer;min-height:48px"><span style="font-size:18px">📊</span>参考</button>'+
    '<button class="more-sheet-btn" onclick="closeToolFloat();toggleTool(\'log\')" style="display:flex;align-items:center;gap:8px;padding:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(139,125,107,0.15);border-radius:8px;color:var(--text-parchment);font-size:12px;cursor:pointer;min-height:48px"><span style="font-size:18px">📜</span>日志</button>'+
    '</div>';
}
```

**任务 1.4：修改 tool-icon onclick 绑定（HTML）**

文件：`st-coc-ui/index.html`，行 230-231。

当前所有 tool-icon 使用 `onclick="toggleTool('dice')"` 等。需要改为移动端感知：

OLD（行 230）：
```html
<button class="tool-icon" onclick="toggleTool('dice')" title="骰子" aria-label="骰子面板">🎲</button>
```
NEW：
```html
<button class="tool-icon" onclick="if(window.innerWidth<=800)switchMobileTab('dice');else toggleTool('dice')" title="骰子" aria-label="骰子面板">🎲</button>
```

同样修改其他 3 个按钮（📋 → 'more'，⚔️ → 'combat'，📊 → 'more'）：
```html
<button class="tool-icon" onclick="if(window.innerWidth<=800)switchMobileTab('more');else toggleTool('items')" title="道具" aria-label="道具面板">📋</button>
<button class="tool-icon" onclick="if(window.innerWidth<=800)switchMobileTab('more');else toggleTool('notes')" title="笔记" aria-label="笔记面板">📝</button>
<button class="tool-icon" onclick="if(window.innerWidth<=800)switchMobileTab('combat');else toggleTool('combat')" title="战斗" aria-label="战斗面板">⚔️</button>
<button class="tool-icon" onclick="if(window.innerWidth<=800)switchMobileTab('more');else toggleTool('ref')" title="参考" aria-label="参考资料">📊</button>
<button class="tool-icon" onclick="if(window.innerWidth<=800)switchMobileTab('more');else toggleTool('log')" title="日志" aria-label="日志面板">📜</button>
```

**任务 1.5：验证 CP-M1**

```bash
# 语法检查
grep -c 'switchMobileTab\|toggleMoreSheet\|viewport-fit=cover\' /home/xhaoshen/projects/st-coc-platform/st-coc-ui/index.html
# 期望：≥3

# 部署 + 截图
cp st-coc-ui/index.html ~/apps/SillyTavern/public/st-coc-ui.html
npx playwright screenshot --viewport-size=375,750 http://localhost:8000/st-coc-ui.html /tmp/cp-m1.png
```

---

### CP-M2：工具底部 sheet 完善

**任务 2.1：修复 renderToolContent 中的更多面板按钮高度**

在 `toggleMoreSheet()` 中生成的按钮已使用 `min-height:48px`（内联样式）。确认 `toggleTool()` 在移动端正确处理：`tool-float.show` 的 CSS 已将面板定位到屏幕底部。

**任务 2.2：验证 CP-M2**

浏览器中打开 `http://localhost:8000/st-coc-ui.html`（375px 视口），点击每个标签按钮，验证：
- 🎲 骰子面板正常显示
- ⚔️ 战斗面板正常显示
- ⚙️ 更多 → 📋📝📊📜 四个子面板均可打开
- 桌面端（>800px）原有功能不受影响

---

### CP-M3：横向队伍 + 输入优化

已包含在 CP-M1 的 CSS 中：
- `.party-scroll{flex-direction:row}` — 横向队伍
- `.input-field{font-size:15px}` — 防 iOS 缩放
- `.send-btn{min-height:44px}` — 大按钮

验证：
```bash
# 确认 CSS 规则存在
grep -c 'flex-direction:row' st-coc-ui/index.html
# → 应输出 ≥2（原有 .tools-icons 已有 + 新增 .party-scroll）
```

---

### CP-M4：Android 特化 + 回归

**任务 4.1：Android WebView 兼容**

以下 CSS 已包含在 CP-M1 的媒体查询中：
- `-webkit-overflow-scrolling: touch` — 队伍面板平滑滚动
- `touch-action: manipulation` — 消除 300ms 点击延迟
- `env(safe-area-inset-bottom)` — 安全区（已有 fallback `0px`）
- `100dvh` — 动态视口高度（`100vh` backup 在 `<style>` 外）

**任务 4.2：回归验证**

```bash
# 桌面回归：确认 grid 仍为 3 列
curl -s http://localhost:8000/st-coc-ui.html | grep -c 'grid-template-columns:250px 1fr 40px'
# → 1

# 移动端验证：确认 5 行 grid 存在
curl -s http://localhost:8000/st-coc-ui.html | grep -c 'grid-template-rows:36px auto 1fr auto 56px'
# → 1

# 服务端 API 回归
curl -s http://localhost:8000/api/plugins/coc-rules-engine/scene/current | python3 -c "import sys,json;print(json.load(sys.stdin)['scene']['name'])"
# → 委托人到访
```

---

## 执行流程

```
M1.1 (CSS) ─┐
M1.2 (meta)  ├─ CP-M1 (并行, 纯 CSS/HTML, 无 JS 依赖)
M1.3 (JS)   ─┤
M1.4 (HTML)  ┘
     ↓ 验证 CP-M1
M2.1 ─── CP-M2 (串行, 依赖 M1 的 toggleMoreSheet)
     ↓ 验证 CP-M2
M3   ─── CP-M3 (验证, 无需新代码 — CSS 已在 M1 中完成)
     ↓ 验证 CP-M3
M4   ─── CP-M4 (回归验证 + Android 确认)
```

---

## 风险与回滚

| 风险 | 缓解 |
|------|------|
| 底部标签栏遮挡 iOS 底部横条 | `env(safe-area-inset-bottom)` + `viewport-fit=cover` |
| 桌面端工具图标异常变大 | `@media(min-width:801px)` 重置 `.tool-icon::after{display:none}` |
| Android Chrome 底部导航栏重叠 | `100dvh` 动态视口高度 |
| `toggleTool` 移动/桌面分流逻辑错误 | `switchMobileTab` 仅判断 `innerWidth`，不修改 `toggleTool` |
| 回滚 | `git checkout st-coc-ui/index.html` 即可恢复 |
