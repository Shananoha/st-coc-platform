(function() {
    var API = '/api/plugins/coc-rules-engine';
    var OCCUPATIONS = [];
    var step = 1, attrs = {}, occ = null, skillPts = {occ:0, int:0}, skills = {};

    // ==================== UI BUILDERS ====================

    function show() {
        var d = document.getElementById('coc-char-sheet');
        if (d) { d.style.display='block'; render(); return; }
        d = document.createElement('div');
        d.id = 'coc-char-sheet';
        d.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:500px;max-height:80vh;overflow-y:auto;z-index:99999;background:#0d1117;border:1px solid #30363d;border-radius:12px;padding:20px;color:#c9d1d9;font-size:12px;box-shadow:0 0 40px rgba(0,0,0,0.7)';
        document.body.appendChild(d);
        render();
    }

    function hide() { var d = document.getElementById('coc-char-sheet'); if (d) d.style.display = 'none'; }

    function render() {
        var d = document.getElementById('coc-char-sheet');
        if (!d) return;
        if (step === 1) renderStep1(d);
        else if (step === 2) renderStep2(d);
        else if (step === 3) renderStep3(d);
        else if (step === 4) renderStep4(d);
    }

    // STEP 1: Roll attributes (5 sets, pick 1)
    function renderStep1(d) {
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

        var h = '<h3 style="color:#f85149;margin:0 0 12px">🎲 第1步：掷属性 (5组选1)</h3>';
        attrs.sets.forEach(function(s, i) {
            var sel = attrs.chosen === i;
            h += '<div onclick="window._cocPickSet('+i+')" style="cursor:pointer;margin:6px 0;padding:8px;background:'+(sel?'#1f6feb':'#161b22')+';border:1px solid '+(sel?'#58a6ff':'#21262d')+';border-radius:6px">';
            h += '<b>第'+(i+1)+'组</b> (总计:'+s.total+') ';
            h += 'STR'+s.STR+' CON'+s.CON+' SIZ'+s.SIZ+' DEX'+s.DEX+' APP'+s.APP+' INT'+s.INT+' POW'+s.POW+' EDU'+s.EDU+' LUK'+s.LUK;
            h += '</div>';
        });
        h += '<button onclick="window._cocReRoll()" style="margin-top:8px;padding:6px 12px;background:#161b22;border:1px solid #30363d;color:#c9d1d9;border-radius:4px;cursor:pointer">🎲 重新掷5组</button>';
        h += '<button onclick="window._cocNextStep(2)" style="margin-left:8px;padding:6px 12px;background:#238636;border:none;color:#fff;border-radius:4px;cursor:pointer;font-weight:bold">下一步 →</button>';
        d.innerHTML = h;
    }

    // STEP 2: Choose occupation
    function renderStep2(d) {
        var h = '<h3 style="color:#f85149;margin:0 0 12px">🔧 第2步：选择职业</h3>';
        OCCUPATIONS.forEach(function(o) {
            h += '<div onclick="window._cocPickOcc(\''+o.code+'\')" style="cursor:pointer;margin:4px 0;padding:6px;background:'+(occ&&occ.code===o.code?'#1f6feb':'#161b22')+';border:1px solid #21262d;border-radius:4px">';
            h += '<b>'+o.name+'</b> 信用:'+o.credit_range[0]+'-'+o.credit_range[1]+' 技能点:EDU×'+o.skill_formula.multiplier;
            h += '</div>';
        });
        h += '<button onclick="window._cocNextStep(3)" style="margin-top:8px;padding:6px 12px;background:#238636;border:none;color:#fff;border-radius:4px;cursor:pointer;font-weight:bold">下一步 →</button>';
        d.innerHTML = h;
    }

    // STEP 3: Allocate skill points
    function renderStep3(d) {
        if (!occ) { step=2; render(); return; }
        skillPts.occ = attrs.chosenSet.EDU * occ.skill_formula.multiplier;
        skillPts.int = attrs.chosenSet.INT * 2;

        var allSkills = [
            '会计','人类学','估价','考古学','技艺','魅惑','攀爬','计算机使用',
            '信用评级','克苏鲁神话','乔装','闪避','汽车驾驶','电气维修','电子学',
            '话术','格斗(斗殴)','格斗(剑)','射击(手枪)','射击(步枪)','射击(霰弹枪)',
            '急救','历史','恐吓','跳跃','外语','法律','图书馆使用','聆听','锁匠',
            '机械维修','医学','自然学','导航','神秘学','操作重型机械','说服',
            '药学','摄影','物理','驾驶(飞机)','驾驶(船)','心理学','精神分析',
            '骑术','科学','巧手','侦查','潜行','生存','游泳','投掷','追踪'
        ];

        var h = '<h3 style="color:#f85149;margin:0 0 12px">📊 第3步：分配技能点</h3>';
        h += '<div style="margin:8px 0;padding:6px;background:#161b22;border-radius:4px">';
        h += '职业技能点: <b style="color:#3fb950">'+skillPts.occ+'</b> (EDU'+attrs.chosenSet.EDU+'×'+occ.skill_formula.multiplier+') &nbsp; 兴趣点: <b style="color:#58a6ff">'+skillPts.int+'</b> (INT'+attrs.chosenSet.INT+'×2)';
        h += '</div>';
        h += '<div style="max-height:300px;overflow-y:auto">';
        allSkills.forEach(function(sk) {
            var isOcc = occ.occupational_skills.some(function(os){ return sk.indexOf(os)===0||os===sk; });
            var cur = skills[sk] || 0, base = getBase(sk);
            h += '<div style="display:flex;align-items:center;gap:8px;margin:2px 0">';
            h += '<span style="width:100px;font-size:11px">'+(isOcc?'⭐':'')+sk+'</span>';
            h += '<button onclick="window._cocSkill(\''+sk+'\',-5)" style="padding:2px 6px;background:#161b22;border:1px solid #30363d;color:#c9d1d9;border-radius:3px;cursor:pointer">-5</button>';
            h += '<button onclick="window._cocSkill(\''+sk+'\',-1)" style="padding:2px 6px">-1</button>';
            h += '<span style="width:35px;text-align:center;color:'+(cur>base?'#3fb950':'#c9d1d9')+'">'+(cur||base)+'%</span>';
            h += '<button onclick="window._cocSkill(\''+sk+'\',1)" style="padding:2px 6px">+1</button>';
            h += '<button onclick="window._cocSkill(\''+sk+'\',5)" style="padding:2px 6px;background:#161b22;border:1px solid #30363d;color:#c9d1d9;border-radius:3px;cursor:pointer">+5</button>';
            h += '<span style="font-size:10px;color:#8b949e">基础'+base+'%</span>';
            h += '</div>';
        });
        h += '</div>';
        h += '<button onclick="window._cocNextStep(4)" style="margin-top:8px;padding:6px 12px;background:#238636;border:none;color:#fff;border-radius:4px;cursor:pointer;font-weight:bold">下一步 →</button>';
        d.innerHTML = h;
    }

    // STEP 4: Background + Finish
    function renderStep4(d) {
        var h = '<h3 style="color:#f85149;margin:0 0 12px">✏️ 第4步：角色背景</h3>';
        var fields = [
            ['name','姓名','詹姆斯·卡特'],
            ['personal_description','个人描述','戴着圆框眼镜，总是穿一件旧风衣'],
            ['ideology','思想信念','真相值得任何代价'],
            ['significant_person','重要之人','失踪的妹妹艾米莉'],
            ['meaningful_location','意义非凡之地','童年的海边小屋'],
            ['treasured_possession','宝贵之物','父亲的遗物——一枚银质徽章'],
            ['traits','特点','左手在战争中受伤，极度恐高'],
            ['injuries_scars','伤口疤痕','左手旧伤——写字时会发抖'],
            ['background_story','背景故事','詹姆斯·卡特曾是陆军侦察兵，退伍后在波士顿开了一家私人侦探所。十年前，妹妹艾米莉在调查一桩神秘案件时失踪，至今下落不明。从那以后，卡特对任何"不寻常"的案件都格外关注。']
        ];
        fields.forEach(function(f){
            h += '<div style="margin:4px 0"><label style="font-size:10px;color:#8b949e">'+f[1]+'</label><br>';
            if (f[0]==='background_story') h += '<textarea id="coc-bg-'+f[0]+'" style="width:100%;height:80px;background:#0d1117;border:1px solid #30363d;color:#c9d1d9;border-radius:4px;padding:6px;font-size:11px">'+f[2]+'</textarea>';
            else h += '<input id="coc-bg-'+f[0]+'" value="'+f[2]+'" style="width:100%;background:#0d1117;border:1px solid #30363d;color:#c9d1d9;border-radius:4px;padding:6px;font-size:11px">';
            h += '</div>';
        });
        h += '<button onclick="window._cocFinish()" style="margin-top:8px;padding:8px 20px;background:#238636;border:none;color:#fff;border-radius:6px;cursor:pointer;font-weight:bold;font-size:14px">✅ 完成车卡</button>';
        d.innerHTML = h;
    }

    // ==================== LOGIC ====================

    function roll3d6() { return (d6()+d6()+d6())*5; }
    function roll2d6_6() { return (d6()+d6()+6)*5; }
    function d6() { return Math.floor(Math.random()*6)+1; }

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
        var cur = skills[skill] || 0;
        var nv = Math.max(0, Math.min(75, cur + delta)); // cap at 75%
        if (nv === cur) return;

        var isOcc = occ && occ.occupational_skills.some(function(os){ return skill.indexOf(os)===0||os===skill; });
        var spent = nv - (skills[skill]||0);
        if (spent > 0) {
            if (isOcc && skillPts.occ >= spent) skillPts.occ -= spent;
            else if (skillPts.int >= spent) skillPts.int -= spent;
            else return; // not enough points
        } else {
            if (isOcc) skillPts.occ += Math.abs(spent);
            else skillPts.int += Math.abs(spent);
        }
        skills[skill] = nv;
        render();
    }

    // ==================== GLOBALS ====================

    window._cocPickSet = function(i) { attrs.chosen = i; attrs.chosenSet = attrs.sets[i]; render(); };
    window._cocReRoll = function() { attrs = {}; step = 1; render(); };
    window._cocPickOcc = function(code) { occ = OCCUPATIONS.find(function(o){return o.code===code;}); render(); };
    window._cocSkill = function(sk, d) { addSkill(sk, d); };
    window._cocNextStep = function(s) {
        if (s === 2 && attrs.chosen === undefined) { alert('请先选择一组属性'); return; }
        if (s === 3 && !occ) { alert('请先选择职业'); return; }
        step = s; render();
    };

    window._cocFinish = async function() {
        var bg = {};
        ['name','personal_description','ideology','significant_person','meaningful_location','treasured_possession','traits','injuries_scars','background_story'].forEach(function(k){
            var el = document.getElementById('coc-bg-'+k);
            bg[k] = el ? el.value : '';
        });

        var data = Object.assign({}, attrs.chosenSet, bg, {
            occupation_code: occ.code, occupation_name: occ.name,
            credit_rating: Math.floor((occ.credit_range[0]+occ.credit_range[1])/2),
            hp_max: Math.floor((attrs.chosenSet.CON+attrs.chosenSet.SIZ)/10),
            hp_current: Math.floor((attrs.chosenSet.CON+attrs.chosenSet.SIZ)/10),
            mp_max: Math.floor(attrs.chosenSet.POW/5),
            mp_current: Math.floor(attrs.chosenSet.POW/5),
            san_max: 99, san_current: attrs.chosenSet.POW, san_start: attrs.chosenSet.POW
        });

        try {
            var r = await fetch(API+'/character', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
            var ch = await r.json();
            if (ch.error) { alert('创建失败: '+ch.error); return; }

            var skillList = Object.keys(skills).map(function(sk){
                return {name:sk, value:skills[sk], base:getBase(sk), occupation:occ.occupational_skills.some(function(o){return sk.indexOf(o)===0||o===sk;})?skills[sk]:0, interest:occ.occupational_skills.some(function(o){return sk.indexOf(o)===0||o===sk;})?0:skills[sk]};
            });
            await fetch(API+'/character/'+ch.id+'/skills', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({skills:skillList})});

            alert('车卡完成！\n\n'+ch.name+' - '+occ.name+'\nSAN: '+ch.san_current+' HP: '+ch.hp_current+'\n请在CoC控制台面板检验技能值。');
            hide();
        } catch(e) { alert('创建失败: '+e); }
    };

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
