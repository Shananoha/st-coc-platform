(function() {
    var API = '/api/plugins/coc-rules-engine';
    var SKILLS = [
        {n:'侦查',i:'🔍'},{n:'聆听',i:'👂'},{n:'图书馆使用',i:'📚'},
        {n:'心理学',i:'🧠'},{n:'潜行',i:'🥷'},{n:'话术',i:'💬'},
        {n:'闪避',i:'💨'},{n:'格斗(斗殴)',i:'👊'},{n:'射击(手枪)',i:'🔫'},
        {n:'急救',i:'🏥'},{n:'驾驶(汽车)',i:'🚗'},{n:'信用评级',i:'💰'}
    ];
    var sanV=70, sanM=99, hpV=11, hpM=11, panel=null;

    function build() {
        var h = '<div id="coc-panel" style="background:#1a1a2e;border:1px solid #16213e;border-radius:8px;padding:10px;margin:8px 0;color:#ddd;font-size:12px;max-width:280px">';
        h += '<div style="font-weight:bold;font-size:14px;color:#e94560;text-align:center;border-bottom:1px solid #333;padding-bottom:6px;margin-bottom:8px">🎲 CoC 控制台</div>';
        h += '<div style="display:flex;gap:4px;margin-bottom:8px">';
        h += '<div id="coc-san" style="flex:1;background:#16213e;border-radius:4px;padding:4px;text-align:center;cursor:pointer"><span style="font-size:9px;color:#888">SAN</span><br><span style="font-weight:bold;font-size:16px;color:#0f0">'+sanV+'</span><small>/'+sanM+'</small></div>';
        h += '<div id="coc-hp" style="flex:1;background:#16213e;border-radius:4px;padding:4px;text-align:center;cursor:pointer"><span style="font-size:9px;color:#888">HP</span><br><span style="font-weight:bold;font-size:16px;color:#f44">'+hpV+'</span><small>/'+hpM+'</small></div>';
        h += '<div style="flex:1;background:#16213e;border-radius:4px;padding:4px;text-align:center"><span style="font-size:9px;color:#888">MP</span><br><span style="font-weight:bold;font-size:16px;color:#44f">14</span><small>/14</small></div>';
        h += '</div>';
        h += '<div style="font-size:10px;color:#888;margin:6px 0 3px;border-bottom:1px solid #222;padding-bottom:2px">技能检定</div>';
        h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px">';
        SKILLS.forEach(function(s){
            h += '<button class="csk" data-s="'+s.n+'" style="display:flex;align-items:center;gap:4px;background:#16213e;border:1px solid #0f3460;color:#ccc;padding:4px 6px;border-radius:3px;cursor:pointer;font-size:11px">'+s.i+' '+s.n+'</button>';
        });
        h += '</div>';
        h += '<div style="display:flex;gap:4px;margin-top:6px">';
        h += '<button class="cq" data-a="d100" style="flex:1;padding:6px;background:#1a1a2e;border:1px solid #0f3460;color:#0f0;border-radius:3px;cursor:pointer;font-weight:bold;font-size:11px">🎯 D100</button>';
        h += '<button class="cq" data-a="san" style="flex:1;padding:6px;background:#1a1a2e;border:1px solid #3d0f46;color:#e9e;border-radius:3px;cursor:pointer;font-weight:bold;font-size:11px">🧿 SAN</button>';
        h += '<button class="cq" data-a="dmg" style="flex:1;padding:6px;background:#1a1a2e;border:1px solid #461f0f;color:#f94;border-radius:3px;cursor:pointer;font-weight:bold;font-size:11px">⚔️ 1d6</button>';
        h += '</div></div>';
        return h;
    }

    function inject() {
        if (document.getElementById('coc-panel')) return;
        var t = document.getElementById('extensions_panel');
        if (!t) { setTimeout(inject, 500); return; }
        var w = document.createElement('div');
        w.innerHTML = build();
        t.parentNode.insertBefore(w.firstChild, t.nextSibling);
        bind();
    }

    function bind() {
        document.querySelectorAll('.csk').forEach(function(b){
            b.onclick = function(){
                var v = prompt(this.dataset.s+' 技能值 (1-99):', '50');
                if (v) roll(this.dataset.s, parseInt(v)||50);
            };
        });
        document.querySelectorAll('.cq').forEach(function(b){
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
    }

    async function roll(skill, val) {
        try {
            var r = await fetch(API+'/roll/skill-check', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({skillName:skill,skillValue:val})});
            var d = await r.json();
            var lv = {critical:'✨大成功',extreme:'🌟极难',hard:'⭐困难',regular:'✅成功',fail:'❌失败',fumble:'💀大失败'};
            send('🎲 **'+skill+'检定**('+val+'%): 掷出 **'+d.roll+'** → '+lv[d.level]);
        } catch(e) { console.error(e); }
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
            var ctx = SillyTavern && SillyTavern.getContext && SillyTavern.getContext();
            if (ctx && ctx.sendSystemMessage) ctx.sendSystemMessage('generic', msg);
        } catch(e) { console.log('[CoC]',msg); }
    }

    setTimeout(inject, 2000);
})();
