// Scene Manager - hardcoded 3-scene The Haunting module
// In Phase 4+ this will be replaced by the YAML module engine

const SCENES = {
    intro: {
        id: 'intro',
        name: '委托人到访',
        dread: 1,
        description: `你坐在私家侦探事务所的办公室里。窗外是 1920 年代波士顿灰蒙蒙的下午。门铃响了——你的新委托人到了。

Mr. Knott 是一个消瘦的中年男人，穿着过时但整洁的西装。他不安地搓着帽子，在你对面的椅子上坐下。

"感谢你愿意见我，卡特先生。"他开口道，"我遇到了一件……不太寻常的事。"`,
        npcs: [{
            name: 'Mr. Knott',
            role: '委托人',
            speak: '紧张、礼貌、害怕',
            public_knowledge: [
                '继承了波士顿郊区的一栋老房子——Corbitt 宅邸',
                '前几任租户都很快搬走了，有的死了，有的疯了',
                '波士顿环球报上登过关于那栋房子的奇怪报道',
                '他自己不敢进去——"每次靠近那栋房子，我就浑身发冷"'
            ],
            secret: '他自己也害怕那栋房子——不是不想住，是不敢进去'
        }],
        clues: [
            { id: 'c1', severity: 'core', text: 'Mr. Knott 委托你调查 Corbitt 宅邸。他提供了一份钥匙、房产文件和报纸剪报。报酬：$20/day + 费用报销。', trigger: 'auto' },
            { id: 'c2', severity: 'core', text: '波士顿环球报剪报：标题"鬼屋之谜？Corbitt 宅邸的离奇死亡事件"。三任租户在一年内非正常死亡。', trigger: 'auto' }
        ],
        exits: [{ to: 'house', condition: '玩家接受委托，前往 Corbitt 宅邸' }],
        san_triggers: []
    },

    house: {
        id: 'house',
        name: '鬼屋探索',
        dread: 3,
        description: `Corbitt 宅邸坐落在一条安静的郊区街道尽头。这是一栋殖民地风格的二层建筑，曾经气派的白漆如今斑驳剥落。所有窗户都被木板钉死，前院的草坪早已枯死，在秋风中瑟瑟作响。

前门吱呀一声打开了。室内弥漫着樟脑和旧木头的味道——但底下似乎有什么更陈腐、更甜腻的气味。家具上盖着白布，墙纸泛着不自然的黄色。

通往地下室的楼梯藏在厨房的储物间后面。`,
        npcs: [],
        clues: [
            { id: 'c3', severity: 'core', text: '一楼书房中发现了一本日记。翻开最后一页，字迹潦草而疯狂："我已经准备好了。今晚在地下室。愿主怜悯我的灵魂。——Walter Corbitt，1897年10月31日"', trigger: '侦查或图书馆使用' },
            { id: 'c4', severity: 'auxiliary', text: '厨房的碗柜里有一把生锈的切肉刀。刀刃上有暗褐色的污渍——不是锈。', trigger: '侦查' },
            { id: 'c5', severity: 'auxiliary', text: '从客厅的窗户往外看，你注意到后院的泥土最近被翻动过。土里似乎埋着什么东西。', trigger: '侦查或聆听' },
            { id: 'c6', severity: 'core', text: '通往地下室的楼梯很窄，木台阶在你脚下发出不祥的吱呀声。空气变得潮湿、寒冷，带着一股说不清的甜腻气味。地下室的角落里，有一个……棺材。', trigger: '走向地下室' }
        ],
        exits: [{ to: 'basement', condition: '玩家找到并进入地下室' }],
        san_triggers: []
    },

    basement: {
        id: 'basement',
        name: '地下室对决',
        dread: 5,
        description: `地下室的空气冰冷刺骨。你的呼吸在面前凝成白雾——这不应该发生在室内。

角落里放着一口简陋的松木棺材。棺盖半开着，里面躺着一个人形——或者曾经是人形的东西。它的皮肤是灰绿色的，干枯地贴在骨头上。眼窝深陷，但里面有什么东西在……发光。

当你的手电筒光照到它时，那东西睁开了眼睛。

Walter Corbitt 从棺材里坐了起来。`,
        npcs: [{
            name: 'Walter Corbitt',
            role: '反派——不死巫师',
            speak: '不说话的。只有喉间发出的嘶哑的、仿佛来自很远地方的声音。',
            stats: 'STR 80, CON 75, SIZ 50, DEX 35, INT 60, POW 85. HP 13, DB +1d4. 护甲: 穿刺武器1点伤害，其他武器半伤。',
            combat: '支配术(1MP, 1d3SAN对目标): POW对抗85, 失败则被控制1回合。优先控制最强壮的调查员攻击队友。',
            public_knowledge: []
        }],
        clues: [],
        exits: [],
        san_triggers: [
            { reason: '第一次亲眼看到 Corbitt 的不死形态', loss: '0/1d6' }
        ]
    }
};

// ==================== STATE ====================
let currentScene = 'intro';
let discoveredClues = [];
let gameTime = '第一天 14:00';

function getCurrentScene() { return SCENES[currentScene]; }
function getScene(id) { return SCENES[id] || null; }

function transitionTo(sceneId) {
    if (!SCENES[sceneId]) return { error: `Scene "${sceneId}" not found` };
    const old = currentScene;
    currentScene = sceneId;
    const scene = SCENES[sceneId];
    // Auto-discover scene's auto-trigger clues
    const newDiscoveries = [];
    if (scene.clues) {
        scene.clues.filter(c => c.trigger === 'auto').forEach(c => {
            if (!discoveredClues.includes(c.id)) {
                discoveredClues.push(c.id);
                newDiscoveries.push(c);
            }
        });
    }
    return { from: old, to: sceneId, scene: { id: scene.id, name: scene.name, dread: scene.dread }, newDiscoveries, sanTriggers: scene.san_triggers || [] };
}

function discoverClue(clueId) {
    if (discoveredClues.includes(clueId)) return null;
    discoveredClues.push(clueId);
    // Search all scenes for the clue
    for (const sid of Object.keys(SCENES)) {
        const found = SCENES[sid].clues?.find(c => c.id === clueId);
        if (found) return found;
    }
    return null;
}

function getDiscoveredClues() { return discoveredClues; }

function getContextForAI() {
    const scene = SCENES[currentScene];
    const context = [];
    context.push(`[场景] ${scene.name} (恐怖等级: ${scene.dread}/5)`);
    context.push(`[时间] ${gameTime}`);
    if (scene.npcs?.length > 0) {
        context.push('[在场的NPC]');
        scene.npcs.forEach(n => {
            context.push(`- ${n.name}(${n.role}): ${n.speak}`);
        });
    }
    if (discoveredClues.length > 0) {
        context.push('[已发现的线索]');
        discoveredClues.forEach(cid => {
            for (const sid of Object.keys(SCENES)) {
                const c = SCENES[sid].clues?.find(x => x.id === cid);
                if (c) { context.push(`- ${c.text.substring(0, 80)}...`); break; }
            }
        });
    }
    if (scene.exits?.length > 0) {
        context.push('[可能的去向]');
        scene.exits.forEach(e => context.push(`- ${e.condition}`));
    }
    return context.join('\n');
}

function advanceTime(minutes) {
    const [_, day, time] = gameTime.match(/(第.+天) (\d+:\d+)/) || ['', '第一天', '14:00'];
    const [h, m] = time.split(':').map(Number);
    let totalMins = h * 60 + m + minutes;
    const hours = Math.floor(totalMins / 60) % 24;
    const mins = totalMins % 60;
    gameTime = `${day} ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    return gameTime;
}

function reset() {
    currentScene = 'intro';
    discoveredClues = [];
    gameTime = '第一天 14:00';
}

module.exports = { getCurrentScene, getScene, transitionTo, discoverClue, getDiscoveredClues, getContextForAI, advanceTime, reset, SCENES };
