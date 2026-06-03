(function() {
    var API = '/api/plugins/coc-rules-engine';
    var OCCUPATIONS = [];
    var step = 1, scrollPos = 0, attrs = {}, occ = null, skillPts = {occ:0, int:0}, skills = {};

    var ATTR_NAMES = {STR:'力量',CON:'体质',SIZ:'体型',DEX:'敏捷',APP:'外貌',INT:'智力',POW:'意志',EDU:'教育',LUK:'幸运'};
    var CATEGORIES = {
        '侦查':['侦查','聆听','图书馆使用','心理学','追踪','导航','摄影'],
        '社交':['话术','魅惑','恐吓','说服','信用评级'],
        '战斗':['格斗(斗殴)','射击(手枪)','射击(步枪)','射击(霰弹枪)','闪避','投掷'],
        '知识':['历史','神秘学','法律','外语','医学','科学','自然学','人类学','考古学','药学'],
        '技术':['汽车驾驶','电气维修','机械维修','开锁','巧手','急救','攀爬','跳跃','游泳'],
        '其他':['会计','估价','技艺','乔装','计算机使用','电子学','操作重型机械','驾驶(飞机)','驾驶(船)','精神分析','骑术','生存','克苏鲁神话']
    };

    function show() {
        step = 1; attrs = {}; occ = null; skillPts = {occ:0, int:0}; skills = {}; scrollPos = 0;
        var d = document.getElementById('coc-char-sheet');
        if (d) { d.style.display='block'; render(); return; }
        d = document.createElement('div');
        d.id = 'coc-char-sheet';
        d.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:560px;max-height:85vh;overflow-y:auto;z-index:99999;background:#0d1117;border:1px solid #30363d;border-radius:12px;padding:20px;color:#c9d1d9;font-size:12px;box-shadow:0 0 40px rgba(0,0,0,0.8)';
        document.body.appendChild(d);
        render();
    }

    function hide() { var d = document.getElementById('coc-char-sheet'); if (d) d.style.display = 'none'; }

    function render() {
        var d = document.getElementById('coc-char-sheet');
        if (!d) return;
        d.innerHTML = buildContent();
        // Restore scroll position on step 3
        if (step === 3 && scrollPos > 0) setTimeout(function(){ d.scrollTop = scrollPos; }, 10);
    }

    function stepNav(current, total, hasBack) {
        var dots = '';
        for (var i=1; i<=total; i++) dots += '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;margin:0 3px;background:'+(i===current?'#58a6ff':'#21262d')+'"></span>';
        var h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';
        h += '<span style="font-size:11px;color:#8b949e">'+dots+' 第'+current+'/'+total+'步</span>';
        h += '<button onclick="window._cocClose()" style="background:none;border:none;color:#8b949e;cursor:pointer;font-size:16px;padding:0 4px">✕</button>';
        h += '</div>';
        if (!hasBack) h += '<div style="height:28px"></div>'; // spacer
        return h;
    }

    function navButtons(hasPrev, hasNext, nextStep, nextLabel) {
        var h = '<div style="display:flex;gap:8px;margin-top:10px">';
        if (hasPrev) h += '<button onclick="window._cocPrev()" style="flex:1;padding:7px 12px;background:#161b22;border:1px solid #30363d;color:#c9d1d9;border-radius:4px;cursor:pointer">← 上一步</button>';
        if (hasNext) h += '<button onclick="window._cocNextStep('+nextStep+')" style="flex:1;padding:7px 12px;background:#238636;border:none;color:#fff;border-radius:4px;cursor:pointer;font-weight:bold">'+(nextLabel||'下一步 →')+'</button>';
        h += '<button onclick="window._cocClose()" style="padding:7px 12px;background:#161b22;border:1px solid #30363d;color:#8b949e;border-radius:4px;cursor:pointer">取消</button>';
        h += '</div>';
        return h;
    }

    // ==================== BUILDERS ====================

    function buildContent() {
        if (step === 1) return buildStep1();
        if (step === 2) return buildStep2();
        if (step === 3) return buildStep3();
        if (step === 4) return buildStep4();
    }

    function buildStep1() {
        if (!attrs.sets) {
            attrs.sets = [];
            for (var i = 0; i < 5; i++) {
                var s = {};
                s.STR = roll3d6(); s.CON = roll3d6(); s.SIZ = roll2d6_6();
                s.DEX = roll3d6(); s.APP = roll3d6(); s.INT = roll2d6_6();
                s.POW = roll3d6(); s.EDU = roll2d6_6(); s.LUK = roll3d6();
                s.total = s.STR+s.CON+s.SIZ+s.DEX+s.APP+s.INT+s.POW+s.EDU+s.LUK;
                attrs.sets.push(s);
            }
        }
        var h = stepNav(1,4,false) + '<h3 style="color:#f85149;margin:0 0 4px">🎲 掷属性 — 5组选1组</h3>';
        h += '<div style="font-size:11px;color:#8b949e;margin-bottom:10px">每组含9个属性。STR=力量 CON=体质 SIZ=体型 DEX=敏捷 APP=外貌 INT=智力 POW=意志 EDU=教育 LUK=幸运</div>';

        attrs.sets.forEach(function(s,i){
            var sel = attrs.chosen === i;
            h += '<div onclick="window._cocPickSet('+i+')" style="cursor:pointer;margin:4px 0;padding:8px;background:'+(sel?'#1f6feb':'#161b22')+';border:2px solid '+(sel?'#58a6ff':'#21262d')+';border-radius:6px">';
            h += '<b>'+(sel?'✅ 第'+(i+1)+'组':'第'+(i+1)+'组')+'</b> (合计:<b style="color:'+(s.total>=460?'#3fb950':(s.total>=430?'#d29922':'#da3633'))+'">'+s.total+'</b>) ';
            h += '&nbsp;' + Object.keys(ATTR_NAMES).map(function(k){ return ATTR_NAMES[k]+s[k]; }).join(' ');
            h += '</div>';
        });
        h += '<div style="margin-top:8px;font-size:10px;color:#8b949e">💡 合计≥460=优秀 430-460=良好 &lt;430=较弱（可接受）</div>';

        h += '<div style="display:flex;gap:6px;margin-top:10px">';
        h += '<button onclick="window._cocReRoll()" style="padding:6px 12px;background:#161b22;border:1px solid #30363d;color:#c9d1d9;border-radius:4px;cursor:pointer">🎲 重新掷</button>';
        h += '<button onclick="window._cocSetAll()" style="padding:6px 12px;background:#161b22;border:1px solid #30363d;color:#c9d1d9;border-radius:4px;cursor:pointer">📋 选最佳组</button>';
        h += '</div>';
        h += navButtons(false, true, 2);
        return h;
    }

    function buildStep2() {
        var h = stepNav(2,4,true) + '<h3 style="color:#f85149;margin:0 0 4px">🔧 选择职业</h3>';
        h += '<div style="font-size:11px;color:#8b949e;margin-bottom:8px">教育(EDU): '+attrs.chosenSet.EDU+' | 智力(INT): '+attrs.chosenSet.INT+'</div>';

        OCCUPATIONS.forEach(function(o){
            var sel = occ && occ.code === o.code;
            var pts = attrs.chosenSet.EDU * o.skill_formula.multiplier;
            h += '<div onclick="window._cocPickOcc(\''+o.code+'\')" style="cursor:pointer;margin:3px 0;padding:8px;background:'+(sel?'#1f6feb':'#161b22')+';border:2px solid '+(sel?'#58a6ff':'#21262d')+';border-radius:6px">';
            h += '<b>'+(sel?'✅ ':'')+o.name+'</b> <span style="color:#8b949e;font-size:10px">信用:'+o.credit_range[0]+'~'+o.credit_range[1]+'</span>';
            h += '<span style="color:#3fb950;font-size:10px;float:right">职业点: '+pts+'</span>';
            if (sel) h += '<div style="font-size:10px;color:#8b949e;margin-top:4px">本职技能: '+o.occupational_skills.join('、')+'</div>';
            h += '</div>';
        });
        h += navButtons(true, true, 3);
        return h;
    }

    function buildStep3() {
        if (!occ) { step=2; return buildStep2(); }
        skillPts.occ = attrs.chosenSet.EDU * occ.skill_formula.multiplier;
        skillPts.int = attrs.chosenSet.INT * 2;
        // Auto-calc spent
        var occSpent = 0, intSpent = 0;
        Object.keys(skills).forEach(function(sk){
            var pts = skills[sk] || 0;
            var isOcc = isOccSkill(sk);
            if (isOcc) occSpent += pts; else intSpent += pts;
        });
        var occRemain = skillPts.occ - occSpent, intRemain = skillPts.int - intSpent;

        var h = stepNav(3,4,true) + '<h3 style="color:#f85149;margin:0 0 8px">📊 分配技能点</h3>';

        // Legend
        h += '<div style="margin:0 0 8px;padding:8px;background:#161b22;border-radius:6px;font-size:10px;line-height:1.6">';
        h += '<span style="color:#3fb950">━ ⭐ 职业技能</span> — 只能用职业点 <b id="coc-occ-pts" style="color:#3fb950">'+occRemain+'</b>/'+skillPts.occ+' | ';
        h += '<span style="color:#58a6ff">━ 兴趣技能</span> — 可用兴趣点 <b id="coc-int-pts" style="color:#58a6ff">'+intRemain+'</b>/'+skillPts.int;
        h += '<br>⚠ <b style="color:#d29922">信用评级</b> 必须填到职业范围内 ('+occ.credit_range[0]+'~'+occ.credit_range[1]+') | 每个技能上限: <b>75%</b>';
        h += '</div>';

        // Skills by category
        Object.keys(CATEGORIES).forEach(function(cat){
            var catSkills = CATEGORIES[cat];
            h += '<div style="font-weight:bold;font-size:10px;color:#8b949e;margin:8px 0 3px;border-bottom:1px solid #21262d">'+cat+'</div>';
            catSkills.forEach(function(sk){
                h += buildSkillRow(sk);
            });
        });

        h += navButtons(true, true, 4);
        return h;
    }

    function buildSkillRow(sk) {
        var isOcc = isOccSkill(sk);
        var cur = skills[sk] || 0;
        var base = getBase(sk);
        var val = cur || base;
        var isCredit = sk === '信用评级';
        var marker = isCredit ? '💰' : (isOcc ? '⭐' : '');
        var clr = isCredit ? '#d29922' : (cur > 0 ? '#3fb950' : '#8b949e');

        var h = '<div id="coc-sk-'+sk.replace(/[^a-zA-Z\u4e00-\u9fff]/g,'')+'" style="display:flex;align-items:center;gap:4px;margin:1px 0;padding:2px 0;'+(isCredit?'background:#2a1f0a;border-radius:3px;padding:3px 4px':'')+'">';
        h += '<span style="width:80px;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="'+sk+(marker?' ['+(isCredit?'信用评级':(isOcc?'职业技能':'兴趣技能'))+']':'')+'">'+marker+' '+sk+'</span>';
        h += '<button onclick="window._cocSkill(\''+sk+'\',-5)" style="padding:1px 5px;background:#161b22;border:1px solid #30363d;color:#c9d1d9;border-radius:3px;cursor:pointer;font-size:10px">-5</button>';
        h += '<button onclick="window._cocSkill(\''+sk+'\',-1)" style="padding:1px 5px;background:#161b22;border:1px solid #30363d;color:#c9d1d9;border-radius:3px;cursor:pointer;font-size:10px">-</button>';
        h += '<span id="coc-sv-'+sk.replace(/[^a-zA-Z\u4e00-\u9fff]/g,'')+'" style="width:35px;text-align:center;font-weight:bold;color:'+clr+';cursor:pointer" onclick="window._cocSkillInput(\''+sk+'\')">'+val+'%</span>';
        h += '<button onclick="window._cocSkill(\''+sk+'\',1)" style="padding:1px 5px;background:#161b22;border:1px solid #30363d;color:#c9d1d9;border-radius:3px;cursor:pointer;font-size:10px">+</button>';
        h += '<button onclick="window._cocSkill(\''+sk+'\',5)" style="padding:1px 5px;background:#161b22;border:1px solid #30363d;color:#c9d1d9;border-radius:3px;cursor:pointer;font-size:10px">+5</button>';
        h += '<span style="font-size:9px;color:#484f58;width:30px;text-align:right">基'+base+'</span>';
        h += '</div>';
        return h;
    }

    function buildStep4() {
        var h = stepNav(4,4,true) + '<h3 style="color:#f85149;margin:0 0 12px">✏️ 角色背景</h3>';
        var fields = [
            ['name','姓名 *','詹姆斯·卡特',false],
            ['personal_description','个人描述','戴着圆框眼镜，总是穿一件旧风衣',false],
            ['ideology','思想信念','真相值得任何代价',false],
            ['significant_person','重要之人','失踪的妹妹艾米莉',false],
            ['meaningful_location','意义非凡之地','童年的海边小屋',false],
            ['treasured_possession','宝贵之物','父亲的遗物——一枚银质徽章',false],
            ['traits','特点','左手在战争中受伤，极度恐高',false],
            ['injuries_scars','伤口疤痕','左手旧伤——写字时会发抖',false],
            ['background_story','背景故事','退役侦察兵，波士顿私家侦探。十年前妹妹艾米莉在调查神秘案件时失踪，至今下落不明。此后对任何"不寻常"案件格外关注。',true]
        ];
        fields.forEach(function(f){
            h += '<div style="margin:5px 0"><label style="font-size:10px;color:#8b949e">'+f[1]+'</label><br>';
            if (f[3]) h += '<textarea id="coc-bg-'+f[0]+'" style="width:100%;height:100px;background:#0d1117;border:1px solid #30363d;color:#c9d1d9;border-radius:4px;padding:6px;font-size:11px;resize:vertical">'+f[2]+'</textarea>';
            else h += '<input id="coc-bg-'+f[0]+'" value="'+f[2]+'" style="width:100%;background:#0d1117;border:1px solid #30363d;color:#c9d1d9;border-radius:4px;padding:6px;font-size:11px">';
            h += '</div>';
        });
        h += '<button onclick="window._cocFinish()" style="margin-top:10px;padding:10px 24px;background:#238636;border:none;color:#fff;border-radius:6px;cursor:pointer;font-weight:bold;font-size:14px">✅ 完成车卡</button>';
        h += navButtons(true, false, 0);
        return h;
    }

    // ==================== LOGIC ====================

    function roll3d6() { return (d6()+d6()+d6())*5; }
    function roll2d6_6() { return (d6()+d6()+6)*5; }
    function d6() { return Math.floor(Math.random()*6)+1; }
    function isOccSkill(sk) { return occ && occ.occupational_skills.some(function(o){ return sk.indexOf(o)===0||o===sk; }); }

    function getBase(skill) {
        var bases = {
            '会计':5,'人类学':1,'估价':5,'考古学':1,'技艺':5,'魅惑':15,'攀爬':20,'计算机使用':5,
            '信用评级':0,'克苏鲁神话':0,'乔装':5,'闪避':25,'汽车驾驶':20,'电气维修':10,'电子学':1,
            '话术':5,'格斗(斗殴)':25,'格斗(剑)':20,'射击(手枪)':20,'射击(步枪)':25,'射击(霰弹枪)':30,
            '急救':30,'历史':5,'恐吓':15,'跳跃':20,'外语':1,'法律':5,'图书馆使用':20,'聆听':20,'锁匠':1,
            '机械维修':10,'医学':1,'自然学':10,'导航':10,'神秘学':5,'操作重型机械':1,'说服':10,
            '药学':1,'摄影':5,'物理':1,'驾驶(飞机)':1,'驾驶(船)':1,'心理学':10,'精神分析':1,
            '骑术':5,'科学':1,'巧手':10,'侦查':25,'潜行':20,'生存':10,'游泳':20,'投掷':20,'追踪':10
        };
        return bases[skill] || 1;
    }

    function addSkill(skill, delta) {
        var d = document.getElementById('coc-char-sheet');
        scrollPos = d ? d.scrollTop : 0;

        var cur = skills[skill] || 0;
        var nv = Math.max(0, Math.min(75, cur + delta));
        if (nv === cur) { if (delta > 0) flashMsg('点数不足或已达上限(75%)', '#da3633'); return; }

        var isOcc = isOccSkill(skill) || skill === '信用评级';
        var spent = nv - (skills[skill] || 0);
        if (spent > 0) {
            if (isOcc && skillPts.occ >= spent) skillPts.occ -= spent;
            else if (skillPts.int >= spent) skillPts.int -= spent;
            else { flashMsg('点数不足！职业点剩余:'+skillPts.occ+' 兴趣点剩余:'+skillPts.int, '#da3633'); return; }
        } else {
            if (isOcc) skillPts.occ += Math.abs(spent);
            else skillPts.int += Math.abs(spent);
        }
        skills[skill] = nv;

        // Incremental update — no full rebuild!
        updateSkillValue(skill, nv);
        updatePointCounters();
        if (d) d.scrollTop = scrollPos;
    }

    function updateSkillValue(skill, val) {
        var id = 'coc-sv-'+skill.replace(/[^a-zA-Z\u4e00-\u9fff]/g,'');
        var el = document.getElementById(id);
        if (el) {
            var base = getBase(skill);
            el.textContent = (val||base)+'%';
            el.style.color = val > 0 ? '#3fb950' : '#8b949e';
        }
    }

    function updatePointCounters() {
        var occSpent = 0, intSpent = 0;
        Object.keys(skills).forEach(function(sk){
            var pts = skills[sk] || 0;
            if (isOccSkill(sk) || sk === '信用评级') occSpent += pts; else intSpent += pts;
        });
        var oe = document.getElementById('coc-occ-pts');
        if (oe) oe.textContent = (skillPts.occ - occSpent);
        var ie = document.getElementById('coc-int-pts');
        if (ie) ie.textContent = (skillPts.int - intSpent);
    }

    function flashMsg(msg, color) {
        var existing = document.getElementById('coc-flash');
        if (existing) existing.remove();
        var el = document.createElement('div');
        el.id = 'coc-flash';
        el.textContent = msg;
        el.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);padding:8px 16px;background:'+color+';color:#fff;border-radius:6px;font-size:12px;z-index:999999;opacity:0;transition:opacity 0.2s';
        document.body.appendChild(el);
        setTimeout(function(){ el.style.opacity = '1'; }, 10);
        setTimeout(function(){ el.style.opacity = '0'; setTimeout(function(){ el.remove(); }, 300); }, 2000);
    }

    // ==================== GLOBALS ====================

    window._cocClose = function() { if (step>1) if(!confirm('确定关闭？当前进度将丢失。')) return; hide(); };
    window._cocPrev = function() { if (step>1) { step--; render(); } };
    window._cocPickSet = function(i) { attrs.chosen = i; attrs.chosenSet = attrs.sets[i]; render(); };
    window._cocSetAll = function() {
        if (attrs.sets.length === 0) return;
        var best = attrs.sets.reduce(function(a,b){ return a.total>b.total?a:b; });
        attrs.chosen = attrs.sets.indexOf(best);
        attrs.chosenSet = best;
        render();
    };
    window._cocReRoll = function() { if(!confirm('重新掷属性将丢弃当前选择，确定？')) return; attrs = {}; step = 1; render(); };
    window._cocPickOcc = function(code) { occ = OCCUPATIONS.find(function(o){return o.code===code;}); render(); };
    window._cocSkill = function(sk, d) { addSkill(sk, d); };
    window._cocSkillInput = function(sk) {
        var cur = skills[sk] || 0;
        var v = prompt('设置 '+sk+' 的最终值 (当前:'+cur+'%, 上限75%):', cur||getBase(sk));
        if (v === null) return;
        var nv = parseInt(v) || 0;
        nv = Math.max(0, Math.min(75, nv));
        var delta = nv - cur;
        if (delta !== 0) {
            // Reset skill first
            var oldCur = skills[sk] || 0;
            var isOcc = isOccSkill(sk) || sk === '信用评级';
            if (isOcc) skillPts.occ += oldCur; else skillPts.int += oldCur;
            skills[sk] = 0;
            // Then add the new value
            if (isOcc) skillPts.occ -= nv; else skillPts.int -= nv;
            skills[sk] = nv;
            updateSkillValue(sk, nv);
            updatePointCounters();
        }
    };
    window._cocNextStep = function(s) {
        if (s === 2 && attrs.chosen === undefined) { flashMsg('请先选择一组属性', '#da3633'); return; }
        if (s === 3 && !occ) { flashMsg('请先选择职业', '#da3633'); return; }
        if (s === 3 && attrs.chosenSet) { skillPts.occ = attrs.chosenSet.EDU * occ.skill_formula.multiplier; skillPts.int = attrs.chosenSet.INT * 2; }
        step = s; scrollPos = 0; render();
    };

    window._cocFinish = async function() {
        var name = document.getElementById('coc-bg-name');
        if (!name || !name.value.trim()) { flashMsg('请输入角色姓名', '#da3633'); return; }

        var bg = {};
        ['name','personal_description','ideology','significant_person','meaningful_location','treasured_possession','traits','injuries_scars','background_story'].forEach(function(k){
            var el = document.getElementById('coc-bg-'+k);
            bg[k] = el ? el.value : '';
        });

        var credit = skills['信用评级'] || 0;
        if (credit < occ.credit_range[0] || credit > occ.credit_range[1]) {
            flashMsg('信用评级必须填到职业范围内: '+occ.credit_range[0]+'~'+occ.credit_range[1], '#da3633');
            return;
        }

        var data = Object.assign({}, attrs.chosenSet, bg, {
            occupation_code: occ.code, occupation_name: occ.name,
            credit_rating: credit,
            hp_max: Math.floor((attrs.chosenSet.CON+attrs.chosenSet.SIZ)/10),
            hp_current: Math.floor((attrs.chosenSet.CON+attrs.chosenSet.SIZ)/10),
            mp_max: Math.floor(attrs.chosenSet.POW/5),
            mp_current: Math.floor(attrs.chosenSet.POW/5),
            san_max: 99, san_current: attrs.chosenSet.POW, san_start: attrs.chosenSet.POW,
            cash: credit * 2, assets: credit * 10
        });

        try {
            var r = await fetch(API+'/character', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
            var ch = await r.json();
            if (ch.error) { flashMsg('创建失败: '+ch.error, '#da3633'); return; }

            var skillList = Object.keys(skills).map(function(sk){
                var isOcc = isOccSkill(sk) || sk==='信用评级';
                return {name:sk, value:skills[sk], base:getBase(sk), occupation:isOcc?skills[sk]:0, interest:isOcc?0:skills[sk]};
            });
            await fetch(API+'/character/'+ch.id+'/skills', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({skills:skillList})});

            flashMsg('✅ '+ch.name+' — '+occ.name+' | SAN:'+ch.san_current+' HP:'+ch.hp_current+' | 车卡完成！', '#238636');
            // Reload char in dice panel
            if (window._cocReloadChar) window._cocReloadChar();
            setTimeout(hide, 1500);
        } catch(e) { flashMsg('创建失败: 请检查网络连接', '#da3633'); }
    };

    // ==================== KEYBOARD ====================
    document.addEventListener('keydown', function(e) {
        var d = document.getElementById('coc-char-sheet');
        if (!d || d.style.display === 'none') return;
        if (e.key === 'Escape') { e.preventDefault(); window._cocClose(); }
    });

    // ==================== INIT ====================
    async function loadOccs() {
        try {
            var r = await fetch(API+'/occupations');
            var d = await r.json();
            OCCUPATIONS = d.occupations || [];
        } catch(e) { console.error('[CoC Sheet] load failed:', e); }
    }

    function injectButton() {
        var attempts = 0;
        function tryInject() {
            attempts++;
            var panel = document.getElementById('coc-panel');
            if (panel) {
                var btn = document.createElement('button');
                btn.textContent = '📝 车卡';
                btn.style.cssText = 'display:block;width:100%;margin:4px 0;padding:4px;background:#238636;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:11px;font-weight:bold';
                btn.onclick = show;
                panel.insertBefore(btn, panel.firstChild.nextSibling);
                return;
            }
            if (attempts < 30) setTimeout(tryInject, 1000);
        }
        setTimeout(tryInject, 2000);
    }

    loadOccs();
    injectButton();
})();
