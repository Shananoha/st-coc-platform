(function() {
    var API = '/api/plugins/coc-rules-engine';
    var SKILLS = [
        {n:'侦查',i:'🔍'},{n:'聆听',i:'👂'},{n:'图书馆使用',i:'📚'},
        {n:'心理学',i:'🧠'},{n:'潜行',i:'🥷'},{n:'话术',i:'💬'},
        {n:'闪避',i:'💨'},{n:'格斗(斗殴)',i:'👊'},{n:'射击(手枪)',i:'🔫'},
        {n:'急救',i:'🏥'},{n:'驾驶(汽车)',i:'🚗'},{n:'信用评级',i:'💰'}
    ];
    var sanV=70, sanM=99, hpV=11, hpM=11;
    var charId = null;
    var charSkills = {};

    // ==================== CHARACTER DB SYNC ====================
    async function loadCharacter() {
        try {
            // Try loading pre-gen character
            var r = await fetch(API+'/character/'+(charId||'pregen'));
            if (!r.ok) { createPregen(); return; }
            var d = await r.json();
            charId = d.id;
            sanV = d.san_current || 70; sanM = d.san_max || 99;
            hpV = d.hp_current || 11; hpM = d.hp_max || 11;
            if (d.skills) d.skills.forEach(function(s){ charSkills[s.skill_name] = s.current_value; });
            upd();
            console.log('[CoC] Character loaded:', d.name, 'SAN', sanV, 'Skills:', Object.keys(charSkills).length);
        } catch(e){ console.error('[CoC] Char load failed:', e); }
    }

    async function createPregen() {
        try {
            var r = await fetch(API+'/character', {
                method:'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({id:'pregen', name:'詹姆斯·卡特', occupation_name:'私家侦探',
                    str:60, con:50, siz:60, dex:55, int_:75, pow:70, edu:70, luk:65,
                    hp_max:11, hp_current:11, mp_max:14, mp_current:14, san_max:99, san_current:70, san_start:70,
                    credit_rating:30, cash:60, assets:300,
                    traits:'左手受伤,极度恐高', injuries_scars:'左手旧伤',
                    personal_description:'戴着圆框眼镜，穿旧风衣', ideology:'真相值得任何代价',
                    significant_person:'失踪的妹妹艾米莉', meaningful_location:'童年的海边小屋',
                    treasured_possession:'父亲的银质徽章'})
            });
            var d = await r.json();
            charId = d.id;
            var skills = [
                {name:'侦查',value:70,base:25,occupation:35,interest:10},
                {name:'聆听',value:40,base:20,occupation:0,interest:20},
                {name:'图书馆使用',value:60,base:20,occupation:30,interest:10},
                {name:'心理学',value:60,base:10,occupation:40,interest:10},
                {name:'潜行',value:30,base:20,occupation:0,interest:10},
                {name:'话术',value:40,base:5,occupation:25,interest:10},
                {name:'闪避',value:27,base:27,occupation:0,interest:0},
                {name:'格斗(斗殴)',value:50,base:25,occupation:0,interest:25},
                {name:'射击(手枪)',value:40,base:20,occupation:0,interest:20},
                {name:'急救',value:30,base:30,occupation:0,interest:0},
                {name:'驾驶(汽车)',value:30,base:20,occupation:0,interest:10},
                {name:'信用评级',value:30,base:0,occupation:30,interest:0}
            ];
            skills.forEach(function(s){ charSkills[s.name] = s.value; });
            await fetch(API+'/character/'+d.id+'/skills', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({skills:skills})});
            console.log('[CoC] Pre-gen character created:', d.name);
        } catch(e){ console.error('[CoC] Pregen failed:', e); }
    }

    async function saveSanHP() {
        if (!charId) return;
        try {
            await fetch(API+'/character/'+charId+'/san', {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({newSAN:sanV})});
            await fetch(API+'/character/'+charId+'/hp', {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({newHP:hpV})});
        } catch(e){}
    }

    loadCharacter();

    async function pollScene() {
        try {
            var r = await fetch(API+'/scene/current');
            var d = await r.json();
            var sn = document.getElementById('coc-scene-name');
            var sd = document.getElementById('coc-scene-dread');
            if (sn) sn.textContent = d.scene.name;
            if (sd) { var dread = d.scene.dread||1; sd.textContent = '◆'.repeat(dread)+'◇'.repeat(5-dread); sd.style.color = ['#8b949e','#c9d1d9','#d29922','#da3633','#f85149','#bc8cff'][dread]; }
        } catch(e) {}
    }
    setInterval(pollScene, 3000);
    var kpPromptCache = null;
    var kpPromptEnabled = true;

    // ==================== KP PROMPT INJECTION ====================
    async function loadKpPrompt() {
        try {
            var r = await fetch(API+'/prompt/system', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({characterSummary:'詹姆斯·卡特 - 私家侦探, SAN '+sanV+'/'+sanM})
            });
            var d = await r.json();
            kpPromptCache = d.prompt;
        } catch(e) { console.error('[CoC] KP prompt load failed:', e); }
    }

    function injectKpPrompt() {
        if (!kpPromptEnabled || !kpPromptCache) return;
        try {
            var ctx = SillyTavern && SillyTavern.getContext && SillyTavern.getContext();
            if (!ctx) return;
            if (ctx.extensionPrompts && !ctx.extensionPrompts['coc-kp']) {
                ctx.extensionPrompts = ctx.extensionPrompts || {};
                ctx.extensionPrompts['coc-kp'] = kpPromptCache;
            }
            if (ctx.eventSource) {
                ctx.eventSource.on('generate', function(data) {
                    if (kpPromptCache && kpPromptEnabled) {
                        data.systemPrompt = kpPromptCache + '\n\n' + (data.systemPrompt || '');
                    }
                });
            }
        } catch(e) {}
    }

    loadKpPrompt();
    setTimeout(injectKpPrompt, 3000);
    setInterval(function(){ kpPromptCache=null; loadKpPrompt(); }, 300000);

    function build() {
        var h = '';
        h += '<div id="coc-panel" style="position:fixed;right:10px;top:120px;width:200px;z-index:9999;background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:10px;color:#c9d1d9;font-family:system-ui,sans-serif;font-size:11px;box-shadow:0 4px 20px rgba(0,0,0,0.5)">';
        h += '<div style="font-weight:bold;font-size:13px;color:#f85149;text-align:center;border-bottom:1px solid #21262d;padding-bottom:6px;margin-bottom:6px;cursor:move" id="coc-header">🎲 CoC 控制台</div>';
        h += '<div style="display:flex;gap:3px;margin-bottom:6px">';
        h += '<div id="coc-san" style="flex:1;background:#161b22;border:1px solid #30363d;border-radius:4px;padding:3px;text-align:center;cursor:pointer"><span style="font-size:8px;color:#8b949e;display:block">SAN</span><span style="font-weight:bold;font-size:14px;color:#3fb950">'+sanV+'</span><span style="font-size:9px;color:#8b949e">/'+sanM+'</span></div>';
        h += '<div id="coc-hp" style="flex:1;background:#161b22;border:1px solid #30363d;border-radius:4px;padding:3px;text-align:center;cursor:pointer"><span style="font-size:8px;color:#8b949e;display:block">HP</span><span style="font-weight:bold;font-size:14px;color:#f85149">'+hpV+'</span><span style="font-size:9px;color:#8b949e">/'+hpM+'</span></div>';
        h += '<div style="flex:1;background:#161b22;border:1px solid #30363d;border-radius:4px;padding:3px;text-align:center"><span style="font-size:8px;color:#8b949e;display:block">MP</span><span style="font-weight:bold;font-size:14px;color:#58a6ff">14</span><span style="font-size:9px;color:#8b949e">/14</span></div>';
        h += '</div>';

        h += '<div id="coc-scene-bar" style="background:#161b22;border:1px solid #21262d;border-radius:4px;padding:4px 6px;margin-bottom:6px;font-size:10px;display:flex;justify-content:space-between;align-items:center">';
        h += '<span id="coc-scene-name" style="color:#c9d1d9">委托人到访</span>';
        h += '<span id="coc-scene-dread" style="color:#8b949e">◆◇◇◇◇</span>';
        h += '</div>';
        h += '<div style="font-size:9px;color:#8b949e;margin:5px 0 3px;border-bottom:1px solid #21262d;padding-bottom:2px">技能检定</div>';
        h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px">';
        SKILLS.forEach(function(s){
            h += '<button class="csk-btn" data-s="'+s.n+'" style="display:flex;align-items:center;gap:3px;background:#161b22;border:1px solid #21262d;color:#c9d1d9;padding:3px 5px;border-radius:3px;cursor:pointer;font-size:10px;transition:all 0.15s">'+s.i+' '+s.n+'</button>';
        });
        h += '</div>';
        h += '<div style="display:flex;gap:3px;margin-top:5px">';
        h += '<button class="cq-btn" data-a="d100" style="flex:1;padding:4px;background:#161b22;border:1px solid #1f6feb;color:#58a6ff;border-radius:3px;cursor:pointer;font-weight:bold;font-size:10px">🎯 D100</button>';
        h += '<button class="cq-btn" data-a="san" style="flex:1;padding:4px;background:#161b22;border:1px solid #6e40c9;color:#bc8cff;border-radius:3px;cursor:pointer;font-weight:bold;font-size:10px">🧿 SAN</button>';
        h += '<button class="cq-btn" data-a="dmg" style="flex:1;padding:4px;background:#161b22;border:1px solid #da3633;color:#f85149;border-radius:3px;cursor:pointer;font-weight:bold;font-size:10px">⚔️ 1d6</button>';
        h += '</div>';
        h += '<div style="margin-top:5px;text-align:center"><button id="coc-toggle" style="background:none;border:none;color:#8b949e;cursor:pointer;font-size:10px">▲ 收起</button></div>';
        h += '</div>';
        return h;
    }

    function inject() {
        if (document.getElementById('coc-panel')) return;
        var w = document.createElement('div');
        w.innerHTML = build();
        document.body.appendChild(w.firstChild);

        // Make panel draggable
        var panel = document.getElementById('coc-panel');
        var header = document.getElementById('coc-header');
        if (header) {
            header.onmousedown = function(e) {
                e.preventDefault();
                var shiftX = e.clientX - panel.getBoundingClientRect().left;
                var shiftY = e.clientY - panel.getBoundingClientRect().top;
                function move(ev) {
                    panel.style.left = (ev.clientX - shiftX) + 'px';
                    panel.style.top = (ev.clientY - shiftY) + 'px';
                    panel.style.right = 'auto';
                }
                document.addEventListener('mousemove', move);
                document.onmouseup = function() { document.removeEventListener('mousemove', move); document.onmouseup = null; };
            };
        }

        // Toggle collapse
        var toggle = document.getElementById('coc-toggle');
        var content = panel.children;
        var collapsed = false;
        if (toggle) {
            toggle.onclick = function() {
                collapsed = !collapsed;
                for (var i = 1; i < content.length - 1; i++) content[i].style.display = collapsed ? 'none' : '';
                toggle.textContent = collapsed ? '▼ 展开' : '▲ 收起';
            };
        }

        bind();
    }

    function bind() {
        // Skill buttons - hover highlight
        document.querySelectorAll('.csk-btn').forEach(function(b){
            b.onmouseenter = function(){ this.style.background='#1f6feb'; this.style.borderColor='#58a6ff'; };
            b.onmouseleave = function(){ this.style.background='#161b22'; this.style.borderColor='#21262d'; };
            b.onclick = function(){
                var skill = this.dataset.s;
                var val = charSkills[skill] || 50;
                roll(skill, val);
            };
        });
        // Quick action buttons
        document.querySelectorAll('.cq-btn').forEach(function(b){
            b.onmouseenter = function(){ this.style.background='#1f6feb22'; };
            b.onmouseleave = function(){ this.style.background='#161b22'; };
            b.onclick = function(){
                var a = this.dataset.a;
                if (a==='d100') d100();
                else if (a==='san') san();
                else if (a==='dmg') dmg();
            };
        });
        var se = document.getElementById('coc-san');
        if (se) se.onclick = function(){ var v=prompt('SAN:',''+sanV); if(v){sanV=Math.max(0,Math.min(sanM,parseInt(v)||0));upd();} };
        var he = document.getElementById('coc-hp');
        if (he) he.onclick = function(){ var v=prompt('HP:',''+hpV); if(v){hpV=Math.max(0,Math.min(hpM,parseInt(v)||0));upd();} };
    }

    function upd() {
        var s = document.querySelector('#coc-san span:nth-child(3)');
        if (s) s.textContent = sanV;
        var h = document.querySelector('#coc-hp span:nth-child(3)');
        if (h) h.textContent = hpV;
        saveSanHP();
    }

    async function roll(skill, val) {
        try {
            var r = await fetch(API+'/roll/skill-check', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({skillName:skill,skillValue:val})});
            var d = await r.json();
            var lv = {critical:'✨大成功',extreme:'🌟极难',hard:'⭐困难',regular:'✅成功',fail:'❌失败',fumble:'💀大失败'};
            send('🎲 **'+skill+'检定**('+val+'%): 掷出 **'+d.roll+'** → '+lv[d.level]);
        } catch(e) { console.error('[CoC]',e); }
    }

    async function d100() {
        try { var r=await fetch(API+'/roll/d100'); var d=await r.json(); send('🎯 D100: **'+d.roll+'**'); } catch(e){}
    }

    async function san() {
        try {
            var f = prompt('SAN损失 (如 0/1d6):','0/1d6'); if(!f) return;
            var c = prompt('原因:','恐惧');
            var r = await fetch(API+'/roll/san-check', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentSAN:sanV,sanLoss:f,reason:c})});
            var d = await r.json();
            sanV = d.newSAN; upd();
            var t = d.passed?'✅通过':'❌失败';
            var m = '🧿 **SAN检定**: '+d.roll+'/'+d.currentSAN+' → '+t+' (-'+d.sanLost+')\nSAN: '+d.currentSAN+' → **'+d.newSAN+'**';
            if (d.insanity) m += '\n🧠 **'+d.insanity.description+'**';
            send(m);
        } catch(e){}
    }

    async function dmg() {
        try {
            var f = prompt('伤害公式:','1d6'); if(!f) return;
            var r = await fetch(API+'/roll/damage', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({formula:f})});
            var d = await r.json();
            send('⚔️ '+d.formula+' → **'+d.total+'**');
        } catch(e){}
    }

    function send(msg) {
        try {
            var ta = document.getElementById('send_textarea');
            if (ta) { ta.value = msg; document.getElementById('send_but')?.click(); }
        } catch(e) { console.log('[CoC]',msg); }
    }

    // Wait for ST to fully load, then inject
    var attempts = 0;
    function tryInject() {
        attempts++;
        if (document.getElementById('send_textarea')) { inject(); return; }
        if (attempts < 30) setTimeout(tryInject, 500);
    }
    setTimeout(tryInject, 1000);
})();
