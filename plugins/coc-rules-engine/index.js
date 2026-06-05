// CoC Rules Engine - Server Plugin for SillyTavern
// Provides deterministic dice rolling, SAN management, and character state APIs.
// Pure logic extracted to: dice-engine.js, san-engine.js

const express = require('express');
const { resolveSkillCheck, rollDamage } = require('./dice-engine');
const { resolveSanCheck } = require('./san-engine');
const { createCharacter, getCharacter, updateSAN, updateHP, setSkills, addEquipment } = require('./database');
const { buildPass1Prompt, buildPass2Prompt, buildSanPass1Prompt } = require('./two-pass-generator');
const { getCurrentScene, getScene, transitionTo, discoverClue, getContextForAI, getDiscoveredClues, advanceTime, reset } = require('./scene-manager');
const { buildSystemPrompt, buildCharacterSummary } = require('./kp-prompts');
const fs = require('fs');
const path = require('path');
const saveDir = path.join(__dirname, '..', '..', 'data', 'coc', 'saves');
// Ensure save directory exists
if (!fs.existsSync(saveDir)) { fs.mkdirSync(saveDir, { recursive: true }); }

const info = {
    id: 'coc-rules-engine',
    name: 'CoC Rules Engine',
    description: 'CoC 7e deterministic rules engine - dice rolling, SAN management, skill checks, and combat resolution'
};

async function init(router) {
    const ver = require('./package.json').version;
    console.log(`🎲 CoC Rules Engine v${ver} loaded`);
    console.log('   API: /api/plugins/coc-rules-engine');

    // HEALTH
    router.get('/health', (_req, res) => {
        res.json({ status: 'ok', version: ver, timestamp: new Date().toISOString() });
    });

    // ROLL SINGLE DIE
    router.get('/roll/d:faces', (req, res) => {
        const faces = parseInt(req.params.faces);
        if (isNaN(faces) || faces < 2) return res.status(400).json({ error: 'Invalid die faces' });
        res.json({ faces, roll: Math.floor(Math.random() * faces) + 1 });
    });

    // SKILL CHECK
    router.post('/roll/skill-check', (req, res) => {
        const { skillName, skillValue, difficulty } = req.body;
        if (!skillName || skillValue === undefined) {
            return res.status(400).json({ error: 'skillName and skillValue required' });
        }
        const roll = Math.floor(Math.random() * 100) + 1;
        const result = resolveSkillCheck(skillValue, roll, difficulty || 'regular');
        res.json({ skillName, skillValue, roll, ...result });
    });

    // DAMAGE ROLL
    router.post('/roll/damage', (req, res) => {
        const { formula } = req.body;
        if (!formula) return res.status(400).json({ error: 'formula required' });
        try { res.json(rollDamage(formula)); } catch (e) { res.status(400).json({ error: e.message }); }
    });

    // SAN CHECK
    router.post('/roll/san-check', (req, res) => {
        const { currentSAN, sanLoss, reason } = req.body;
        if (currentSAN == null || sanLoss == null) {
            return res.status(400).json({ error: 'currentSAN and sanLoss required' });
        }
        try { res.json(resolveSanCheck(currentSAN, sanLoss, reason || '')); }
        catch (e) { res.status(400).json({ error: e.message }); }
    });

    // SAN check via GET (convenience for testing)
    router.get('/roll/san-check', (req, res) => {
        const currentSAN = parseInt(req.query.currentSAN);
        const sanLoss = req.query.sanLoss;
        if (isNaN(currentSAN) || !sanLoss) {
            return res.status(400).json({ error: 'currentSAN and sanLoss required' });
        }
        try { res.json(resolveSanCheck(currentSAN, sanLoss, req.query.reason || '')); }
        catch (e) { res.status(400).json({ error: e.message }); }
    });

    // BONUS/PENALTY DIE
    router.post('/roll/bonus', (req, res) => {
        const { type } = req.body;
        const t1 = Math.floor(Math.random() * 10), t2 = Math.floor(Math.random() * 10);
        const units = Math.floor(Math.random() * 10);
        const adjTens = (type === 'bonus') ? Math.min(t1, t2) : Math.max(t1, t2);
        res.json({ type, originalRolls: [t1 * 10 + units, t2 * 10 + units], adjustedRoll: adjTens * 10 + units });
    });

    // ==================== CHARACTER MANAGEMENT ====================
    router.post('/character', (req, res) => {
        try {
            const char = createCharacter(req.body);
            res.status(201).json(char);
        } catch (e) {
            res.status(400).json({ error: e.message });
        }
    });

    router.get('/character/:id', (req, res) => {
        const char = getCharacter(req.params.id);
        if (!char) return res.status(404).json({ error: 'Character not found' });
        res.json(char);
    });

    router.put('/character/:id/san', (req, res) => {
        const { newSAN } = req.body;
        if (newSAN === undefined) return res.status(400).json({ error: 'newSAN required' });
        try {
            const char = updateSAN(req.params.id, newSAN);
            res.json({ id: char.id, san_current: char.san_current, san_max: char.san_max });
        } catch (e) {
            res.status(400).json({ error: e.message });
        }
    });

    router.put('/character/:id/hp', (req, res) => {
        const { newHP, newMaxHP } = req.body;
        if (newHP === undefined || newHP === null) return res.status(400).json({ error: 'newHP required' });
        if (typeof newHP !== 'number' || isNaN(newHP)) return res.status(400).json({ error: 'newHP must be a number' });
        if (newMaxHP !== undefined && newMaxHP !== null && (typeof newMaxHP !== 'number' || isNaN(newMaxHP))) return res.status(400).json({ error: 'newMaxHP must be a number' });
        try {
            const char = updateHP(req.params.id, newHP, newMaxHP);
            res.json({ id: char.id, hp_current: char.hp_current, hp_max: char.hp_max });
        } catch (e) {
            res.status(400).json({ error: e.message });
        }
    });

    router.get('/character/:id/skills', (req, res) => {
        const char = getCharacter(req.params.id);
        if (!char) return res.status(404).json({ error: 'Character not found' });
        res.json({ id: char.id, skills: char.skills || [] });
    });

    router.post('/character/:id/skills', (req, res) => {
        const { skills } = req.body;
        if (!skills || !Array.isArray(skills)) return res.status(400).json({ error: 'skills array required' });
        try {
            const char = setSkills(req.params.id, skills);
            res.json({ id: char.id, skills: char.skills });
        } catch (e) {
            res.status(400).json({ error: e.message });
        }
    });

    // TWO-PASS PROMPT GENERATION (for AI integration testing)
    router.post('/generate/skill-check-prompt', (req, res) => {
        const { skillName, skillValue, roll, level, success } = req.body;
        if (!skillName || skillValue === undefined) {
            return res.status(400).json({ error: 'skillName and skillValue required' });
        }
        const actualRoll = roll || Math.floor(Math.random() * 100) + 1;
        const result = resolveSkillCheck(skillValue, actualRoll);
        const pass1 = buildPass1Prompt({ skillName, skillValue, roll: actualRoll, ...result });
        const pass2 = buildPass2Prompt(pass1, { currentScene: req.body.currentScene || '' });
        res.json({ checkResult: { roll: actualRoll, ...result }, pass1, pass2 });
    });

    router.post('/generate/san-check-prompt', (req, res) => {
        const { currentSAN, sanLoss, reason, currentScene } = req.body;
        if (currentSAN == null || !sanLoss) {
            return res.status(400).json({ error: 'currentSAN and sanLoss required' });
        }
        const result = resolveSanCheck(currentSAN, sanLoss, reason || '');
        const pass1 = buildSanPass1Prompt(result);
        const pass2 = buildPass2Prompt(pass1, { currentScene: currentScene || '' });
        res.json({ checkResult: result, pass1, pass2 });
    });

router.get('/scene/current', (_req, res) => {
    const scene = getCurrentScene();
    const context = getContextForAI();
    res.json({ scene: { id: scene.id, name: scene.name, dread: scene.dread, description: scene.description, npcs: scene.npcs?.map(n => ({ name: n.name, role: n.role, speak: n.speak })) }, context });
});

    router.post('/scene/transition', (req, res) => {
        const { to } = req.body;
        if (!to) return res.status(400).json({ error: 'target scene "to" required' });
        const result = transitionTo(to);
        if (result.error) return res.status(400).json(result);
        res.json(result);
    });

    router.post('/scene/clue', (req, res) => {
        const { clueId } = req.body;
        if (!clueId) return res.status(400).json({ error: 'clueId required' });
        const clue = discoverClue(clueId);
        if (!clue) return res.status(404).json({ error: 'Clue not found' });
        res.json(clue);
    });

    router.get('/scene/clues', (_req, res) => {
        const ids = getDiscoveredClues();
        const allClues = [];
        const scenes = require('./scene-manager').SCENES;
        ids.forEach(cid => {
            for (const sid of Object.keys(scenes)) {
                const c = scenes[sid].clues?.find(x => x.id === cid);
                if (c && c.success) { allClues.push({ id: c.id, text: c.success }); break; }
            }
        });
        res.json({ discovered: ids, clues: allClues });
    });

    router.post('/scene/time', (req, res) => {
        const { minutes } = req.body;
        if (!minutes) return res.status(400).json({ error: 'minutes required' });
        const newTime = advanceTime(parseInt(minutes));
        res.json({ time: newTime });
    });

    router.post('/scene/reset', (_req, res) => {
        reset();
        res.json({ status: 'reset', scene: getCurrentScene().name });
    });

    router.post('/prompt/system', (req, res) => {
        const scene = getCurrentScene();
        const summary = req.body.characterSummary || '詹姆斯·卡特 - 私家侦探';
        const prompt = buildSystemPrompt(scene, summary);
        res.json({ prompt, estimatedTokens: prompt.length });
    });

    router.get('/occupations', (_req, res) => {
        try {
            const data = require('./occupations.json');
            res.json(data);
        } catch (e) {
            res.status(500).json({ error: 'Occupations data not found' });
        }
    });

    router.post('/generate/chat', async (req, res) => {
        const { messages } = req.body;
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'messages array required' });
        }
        const scene = getCurrentScene();
        const characterSummary = req.body.characterSummary || '一名调查员';
        const systemPrompt = buildSystemPrompt(scene, characterSummary);
        const chatMessages = [...messages];
        chatMessages.unshift({ role: 'system', content: systemPrompt });
        if (req.body.checkResult) {
            const cr = req.body.checkResult;
            const levelNames = {critical:'大成功',extreme:'极难成功',hard:'困难成功',regular:'成功'};
            const resultLabel = cr.success ? (levelNames[cr.level]||'成功') : (cr.level==='fumble'?'大失败':'失败');
            const lastMsg = chatMessages[chatMessages.length - 1];
            lastMsg.content = '[检定结果锁定 - 不可修改]: '+cr.skillName+'检定 '+resultLabel+' (掷出'+cr.roll+'/'+cr.skillValue+'%)\n\n[调查员行动]: '+lastMsg.content+'\n\n请以守秘人身份，先陈述上述检定结果（一句话），然后展开沉浸式叙事。';
        }
        if (req.body.sanResult) {
            const sr = req.body.sanResult;
            const sanPass = sr.passed ? '通过' : '失败';
            const sanInfo = sr.passed ? '成功维持理智 (掷出'+sr.roll+'，SAN保持'+sr.currentSAN+')' : '失败，失去'+sr.sanLost+'点SAN (掷出'+sr.roll+'/'+sr.currentSAN+'，剩余'+sr.newSAN+')';
            const lastMsg = chatMessages[chatMessages.length - 1];
            const reasonText = sr.reason ? ' 触发原因: '+sr.reason : '';
            lastMsg.content = '[SAN检定结果锁定 - 不可修改]: '+sanPass+' - '+sanInfo+reasonText+'\n\n[调查员行动]: '+lastMsg.content+'\n\n请以守秘人身份，先陈述上述SAN检定结果（一句话），然后用感官细节描述'+lastMsg.content+'所带来的心理冲击和身体反应。3-5句。';
        }
        // Per-request model routing overrides
        const requestModel = req.body.model || 'deepseek-v4-pro';
        const requestApiKey = req.body.apiKey || null;
        const requestBaseUrl = req.body.baseUrl || null;

        // Handle character personality — prepend as system message before KP prompt
        if (req.body.characterPersonality) {
            chatMessages.unshift({ role: 'system', content: '[角色人格设定]\n' + req.body.characterPersonality + '\n请完全按照以上设定扮演此角色。' });
        }

        try {
            // Resolve API key from global settings (used as fallback)
            let globalApiKey = null;
            let globalApiUrl = '';
            try {
                const fs = require('fs'), path = require('path');
                const userDir = path.join(__dirname, '..', '..', 'data', 'default-user');
                const settings = JSON.parse(fs.readFileSync(path.join(userDir, 'settings.json'), 'utf8'));
                const secrets = JSON.parse(fs.readFileSync(path.join(userDir, 'secrets.json'), 'utf8'));
                const mainApi = settings.main_api || 'openai';
                const keyField = 'api_key_' + mainApi;
                if (secrets[keyField] && Array.isArray(secrets[keyField]) && secrets[keyField].length > 0) {
                    globalApiKey = secrets[keyField].find(s => s.active)?.value || secrets[keyField][0].value;
                }
                if (!globalApiKey && secrets.api_key_custom && Array.isArray(secrets.api_key_custom)) {
                    globalApiKey = secrets.api_key_custom.find(s => s.active)?.value || secrets.api_key_custom[0].value;
                }
                const base = settings.oai_settings?.custom_url || '';
                if (base) globalApiUrl = base + (base.endsWith('/') ? 'chat/completions' : '/chat/completions');
                else if (mainApi === 'openai') globalApiUrl = 'https://api.openai.com/v1/chat/completions';
                else if (mainApi === 'deepseek') globalApiUrl = 'https://api.deepseek.com/v1/chat/completions';
                else globalApiUrl = 'https://api.openai.com/v1/chat/completions';
                if (settings.selected_proxy?.url) globalApiUrl = settings.selected_proxy.url;
            } catch (_) {
                // Settings files not available; rely on per-request values
            }

            // Apply per-request overrides: request values take priority over global
            const effectiveApiKey = requestApiKey || globalApiKey;
            const effectiveUrl = requestBaseUrl || globalApiUrl;

            if (!effectiveUrl || !effectiveApiKey) {
                return res.status(400).json({ error: 'AI backend not configured. Set up API key in ST first or provide apiKey per-request.' });
            }

            if (req.body.stream) {
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');
                res.flushHeaders();

                const llmResp = await fetch(effectiveUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + effectiveApiKey },
                    body: JSON.stringify({
                        model: requestModel,
                        messages: chatMessages,
                        temperature: 0.85,
                        max_tokens: 800,
                        stream: true
                    })
                });

                if (!llmResp.ok) {
                    const errText = await llmResp.text();
                    res.write('data: {"error":"LLM API error ' + llmResp.status + ': ' + errText.replace(/"/g, '\\"') + '"}\n\n');
                    res.write('data: [DONE]\n\n');
                    res.end();
                    return;
                }

                const reader = llmResp.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                res.write(line + '\n\n');
                            }
                        }
                    }
                    if (buffer.trim()) {
                        res.write(buffer + '\n');
                    }
                } catch (streamErr) {
                    res.write('data: {"error":"stream error"}\n\n');
                }
                res.write('data: [DONE]\n\n');
                res.end();
            } else {
                const resp = await fetch(effectiveUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + effectiveApiKey },
                    body: JSON.stringify({
                        model: requestModel,
                        messages: chatMessages,
                        temperature: 0.85,
                        max_tokens: 800,
                        stream: false
                    })
                });
                const data = await resp.json();
                if (data.error) return res.status(500).json({ error: data.error.message || JSON.stringify(data.error) });
                const content = data.choices?.[0]?.message?.content || '';
                if (!content) return res.status(500).json({ error: 'Empty response from AI' });
                res.json({ content });
            }
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // SAVE MANAGEMENT
    router.post('/save', (req, res) => {
        const { name, charId, charName, hp, hpMax, san, sanMax, mp, mpMax, sceneId, sceneName } = req.body;
        if (!name) return res.status(400).json({ error: 'name required' });
        if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });
        const id = 'save_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
        const saveData = {
            id, name,
            created: new Date().toISOString(),
            charId: charId || '',
            charName: charName || '',
            hp: hp || 0, hpMax: hpMax || 0,
            san: san || 0, sanMax: sanMax || 0,
            mp: mp || 0, mpMax: mpMax || 0,
            sceneId: sceneId || '',
            sceneName: sceneName || ''
        };
        try {
            fs.writeFileSync(path.join(saveDir, id + '.json'), JSON.stringify(saveData, null, 2));
            res.status(201).json({ id, name, created: saveData.created });
        } catch (e) {
            res.status(500).json({ error: 'Failed to write save: ' + e.message });
        }
    });

    router.get('/save/list', (_req, res) => {
        try {
            if (!fs.existsSync(saveDir)) return res.json({ saves: [] });
            const files = fs.readdirSync(saveDir).filter(f => f.endsWith('.json'));
            const saves = files.map(f => {
                try {
                    const data = JSON.parse(fs.readFileSync(path.join(saveDir, f), 'utf8'));
                    return { id: data.id, name: data.name, created: data.created, charId: data.charId, charName: data.charName, sceneId: data.sceneId, sceneName: data.sceneName, hp: data.hp, hpMax: data.hpMax, san: data.san, sanMax: data.sanMax };
                } catch (e) { return null; }
            }).filter(Boolean).sort((a, b) => new Date(b.created) - new Date(a.created));
            res.json({ saves });
        } catch (e) {
            res.status(500).json({ error: 'Failed to list saves: ' + e.message });
        }
    });

    router.get('/save/:id', (req, res) => {
        try {
            const filePath = path.join(saveDir, req.params.id + '.json');
            if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Save not found' });
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            res.json(data);
        } catch (e) {
            res.status(500).json({ error: 'Failed to load save: ' + e.message });
        }
    });

    router.delete('/save/:id', (req, res) => {
        try {
            const filePath = path.join(saveDir, req.params.id + '.json');
            if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Save not found' });
            fs.unlinkSync(filePath);
            res.json({ deleted: true });
        } catch (e) {
            res.status(500).json({ error: 'Failed to delete save: ' + e.message });
        }
    });

    router.put('/save/:id', (req, res) => {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'name required' });
        try {
            const filePath = path.join(saveDir, req.params.id + '.json');
            if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Save not found' });
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            data.name = name;
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            res.json({ id: data.id, name: data.name });
        } catch (e) {
            res.status(500).json({ error: 'Failed to rename save: ' + e.message });
        }
    });

    router.post('/character/:id/equipment', (req, res) => {
        const { items } = req.body;
        if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'items array required' });
        const char = getCharacter(req.params.id);
        if (!char) return res.status(404).json({ error: 'Character not found' });
        try {
            addEquipment(req.params.id, items);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // ==================== ST CARD IMPORT ====================
    router.post('/import/st-card', (req, res) => {
        const { data } = req.body; // base64 or JSON string
        if (!data) return res.status(400).json({ error: 'data required' });
        try {
            var parsed;
            // Try direct JSON first
            try { parsed = JSON.parse(data); } catch (_) {
                // Try base64 decode (PNG tEXt chunk)
                try { parsed = JSON.parse(Buffer.from(data, 'base64').toString('utf8')); } catch (_2) {
                    return res.status(400).json({ error: 'Invalid ST card format' });
                }
            }
            // Extract fields (handle V1/V2/V3)
            var name = '', description = '', personality = '', scenario = '', firstMes = '', systemPrompt = '';
            if (parsed.spec === 'chara_card_v3' || parsed.spec === 'chara_card_v2') {
                var d = parsed.data || parsed;
                name = d.name || '';
                description = d.description || '';
                personality = d.personality || '';
                scenario = d.scenario || '';
                firstMes = d.first_mes || '';
                systemPrompt = d.system_prompt || '';
            } else if (parsed.name) {
                name = parsed.name;
                description = parsed.description || '';
                personality = parsed.personality || '';
                firstMes = parsed.first_mes || '';
                systemPrompt = parsed.system_prompt || '';
            }
            // Extract CoC data from extensions
            var cocData = {};
            if (parsed.data && parsed.data.extensions && parsed.data.extensions.coc7) {
                cocData = parsed.data.extensions.coc7;
            }
            res.json({ name, description, personality, scenario, firstMes, systemPrompt, cocData });
        } catch (e) {
            res.status(500).json({ error: 'Parse failed: ' + e.message });
        }
    });

    // ==================== MODULE CRUD ====================
    const moduleDir = path.join(__dirname, '..', '..', 'data', 'coc', 'modules');
    if (!fs.existsSync(moduleDir)) fs.mkdirSync(moduleDir, { recursive: true });

    router.post('/module/import', (req, res) => {
        const mod = req.body;
        if (!mod.meta || !mod.meta.name) return res.status(400).json({ error: 'Module must have meta.name' });
        const id = 'mod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        mod.id = id;
        mod.imported = new Date().toISOString();
        fs.writeFileSync(path.join(moduleDir, id + '.json'), JSON.stringify(mod, null, 2));
        res.status(201).json({ id, name: mod.meta.name });
    });

    router.get('/module/list', (_req, res) => {
        try {
            if (!fs.existsSync(moduleDir)) return res.json({ modules: [] });
            var files = fs.readdirSync(moduleDir).filter(function(f) { return f.endsWith('.json'); });
            var mods = files.map(function(f) {
                try {
                    var d = JSON.parse(fs.readFileSync(path.join(moduleDir, f), 'utf8'));
                    return { id: d.id, name: d.meta.name, era: d.meta.era, author: d.meta.author, difficulty: d.meta.difficulty, imported: d.imported };
                } catch (e) { return null; }
            }).filter(Boolean);
            res.json({ modules: mods });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.get('/module/:id', (req, res) => {
        var fp = path.join(moduleDir, req.params.id + '.json');
        if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Module not found' });
        res.json(JSON.parse(fs.readFileSync(fp, 'utf8')));
    });

    router.delete('/module/:id', (req, res) => {
        var fp = path.join(moduleDir, req.params.id + '.json');
        if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Module not found' });
        fs.unlinkSync(fp);
        res.json({ deleted: true });
    });
}

module.exports = { info, init };
