(function() {
    var API = '/api/plugins/coc-rules-engine';
    var COMBATANTS = [];
    var round = 0, currentTurn = 0, combatActive = false;

    function show() {
        var d = document.getElementById('coc-combat-panel');
        if (d) { d.style.display='block'; render(); return; }
        d = document.createElement('div');
        d.id = 'coc-combat-panel';
        d.style.cssText = 'position:fixed;right:220px;top:120px;width:220px;z-index:9998;background:#0d1117;border:1px solid #da3633;border-radius:8px;padding:10px;color:#c9d1d9;font-size:11px;box-shadow:0 4px 20px rgba(0,0,0,0.5)';
        document.body.appendChild(d);
        render();
    }

    function hide() { var d = document.getElementById('coc-combat-panel'); if (d) d.style.display = 'none'; }

    function render() {
        var d = document.getElementById('coc-combat-panel');
        if (!d) return;

        var h = '<div style="font-weight:bold;font-size:13px;color:#da3633;text-align:center;border-bottom:1px solid #21262d;padding-bottom:4px;margin-bottom:6px;cursor:move" onmousedown="var p=document.getElementById(\'coc-combat-panel\');var e=event;var sx=e.clientX-p.getBoundingClientRect().left,sy=e.clientY-p.getBoundingClientRect().top;function m(ev){p.style.left=(ev.clientX-sx)+\'px\';p.style.top=(ev.clientY-sy)+\'px\';p.style.right=\'auto\'}document.addEventListener(\'mousemove\',m);document.onmouseup=function(){document.removeEventListener(\'mousemove\',m);document.onmouseup=null}">⚔️ 战斗面板</div>';

        if (!combatActive) {
            h += '<div style="margin:6px 0"><input id="coc-cbt-add-name" placeholder="NPC名称" style="width:80px;background:#0d1117;border:1px solid #30363d;color:#c9d1d9;border-radius:3px;padding:3px;font-size:10px"> ';
            h += 'HP<input id="coc-cbt-add-hp" value="10" style="width:30px;background:#0d1117;border:1px solid #30363d;color:#c9d1d9;border-radius:3px;padding:3px;font-size:10px"> ';
            h += 'DEX<input id="coc-cbt-add-dex" value="50" style="width:30px;background:#0d1117;border:1px solid #30363d;color:#c9d1d9;border-radius:3px;padding:3px;font-size:10px"> ';
            h += '<button onclick="window._cocAddCombatant()" style="padding:2px 6px;background:#238636;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:10px">+</button></div>';
        }

        if (COMBATANTS.length > 0) {
            h += '<div style="max-height:200px;overflow-y:auto;margin:4px 0">';
            COMBATANTS.forEach(function(c,i){
                var active = combatActive && i === currentTurn;
                h += '<div style="padding:4px;margin:2px 0;background:'+(active?'#da363322':'#161b22')+';border:1px solid '+(active?'#da3633':'#21262d')+';border-radius:3px;display:flex;align-items:center;gap:4px">';
                h += '<span style="flex:1;font-size:10px">'+(active?'▶ ':'')+c.name+'<br><span style="color:#8b949e">HP '+c.hp+'/'+c.maxHp+' DEX '+c.dex+'</span></span>';
                h += '<button onclick="window._cocDmgCbt('+i+')" style="padding:1px 4px;background:#da3633;border:none;color:#fff;border-radius:2px;cursor:pointer;font-size:9px">-1</button>';
                h += '<button onclick="window._cocDmgCbt2('+i+')" style="padding:1px 4px;background:#da3633;border:none;color:#fff;border-radius:2px;cursor:pointer;font-size:9px">-'+Math.ceil(c.maxHp/4)+'</button>';
                h += '</div>';
            });
            h += '</div>';
        }

        if (!combatActive && COMBATANTS.length >= 1) {
            h += '<button onclick="window._cocStartCombat()" style="width:100%;padding:6px;background:#da3633;border:none;color:#fff;border-radius:4px;cursor:pointer;font-weight:bold;font-size:11px">⚔️ 开始战斗</button>';
        }

        if (combatActive) {
            h += '<div style="margin:4px 0;padding:4px;background:#161b22;border-radius:3px;text-align:center"><span style="color:#da3633;font-weight:bold">第 '+round+' 轮</span></div>';
            h += '<button onclick="window._cocNextTurn()" style="width:100%;padding:4px;background:#1f6feb;border:none;color:#fff;border-radius:3px;cursor:pointer;font-weight:bold;font-size:11px">→ 下一行动</button>';
            h += '<button onclick="window._cocEndCombat()" style="width:100%;margin-top:3px;padding:3px;background:#161b22;border:1px solid #30363d;color:#8b949e;border-radius:3px;cursor:pointer;font-size:10px">结束战斗</button>';
        }

        if (COMBATANTS.length > 0) {
            h += '<button onclick="window._cocResetCombat()" style="width:100%;margin-top:3px;padding:3px;background:#161b22;border:1px solid #30363d;color:#8b949e;border-radius:3px;cursor:pointer;font-size:10px">重置</button>';
        }

        h += '<div style="margin-top:4px"><button onclick="window._cocQuickDamage()" style="width:100%;padding:3px;background:#161b22;border:1px solid #30363d;color:#c9d1d9;border-radius:3px;cursor:pointer;font-size:10px">💥 快速伤害</button></div>';

        d.innerHTML = h;
    }

    // ==================== GLOBALS ====================

    window._cocAddCombatant = function() {
        var n = document.getElementById('coc-cbt-add-name').value || 'NPC';
        var hp = parseInt(document.getElementById('coc-cbt-add-hp').value) || 10;
        var dex = parseInt(document.getElementById('coc-cbt-add-dex').value) || 50;
        COMBATANTS.push({name:n, maxHp:hp, hp:hp, dex:dex});
        document.getElementById('coc-cbt-add-name').value = '';
        render();
    };

    window._cocDmgCbt = function(i) { COMBATANTS[i].hp = Math.max(0, COMBATANTS[i].hp-1); render(); };
    window._cocDmgCbt2 = function(i) { COMBATANTS[i].hp = Math.max(0, COMBATANTS[i].hp - Math.ceil(COMBATANTS[i].maxHp/4)); render(); };

    window._cocStartCombat = function() {
        COMBATANTS.sort(function(a,b){ return b.dex - a.dex; });
        round = 1; currentTurn = 0; combatActive = true;
        sendToChat('⚔️ **战斗开始！** 先攻顺序: ' + COMBATANTS.map(function(c){return c.name+'('+c.dex+')';}).join(' → '));
        render();
    };

    window._cocNextTurn = function() {
        currentTurn++;
        if (currentTurn >= COMBATANTS.length) { currentTurn = 0; round++; }
        var c = COMBATANTS[currentTurn];
        sendToChat('⚔️ **第'+round+'轮** — '+c.name+'的回合 (HP: '+c.hp+'/'+c.maxHp+')');
        render();
    };

    window._cocEndCombat = function() {
        combatActive = false; round = 0;
        sendToChat('⚔️ **战斗结束**');
        render();
    };

    window._cocResetCombat = function() { COMBATANTS = []; combatActive = false; round = 0; render(); };

    window._cocQuickDamage = async function() {
        var f = prompt('伤害公式 (如 1d6, 2d6+1d4, 1d10+2):', '1d6');
        if (!f) return;
        try {
            var r = await fetch(API+'/roll/damage', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({formula:f})});
            var d = await r.json();
            sendToChat('💥 '+d.formula+' → **'+d.total+'** 伤害');
        } catch(e){}
    };

    function sendToChat(msg) {
        try {
            var ta = document.getElementById('send_textarea');
            if (ta) { ta.value = msg; document.getElementById('send_but')?.click(); }
        } catch(e) {}
    }

    function injectButton() {
        var attempts = 0;
        (function tryInject() {
            attempts++;
            var panel = document.getElementById('coc-panel');
            if (panel) {
                var btn = document.createElement('button');
                btn.textContent = '⚔️ 战斗';
                btn.style.cssText = 'display:block;width:100%;margin:4px 0;padding:4px;background:#da3633;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:11px;font-weight:bold';
                btn.onclick = show;
                panel.appendChild(btn);
                return;
            }
            if (attempts < 30) setTimeout(tryInject, 1000);
        })();
    }

    setTimeout(injectButton, 2000);
})();
