// CoC Rules Engine - Server Plugin for SillyTavern
// Provides deterministic dice rolling, SAN management, and character state APIs.
// Pure logic extracted to: dice-engine.js, san-engine.js

const express = require('express');
const { resolveSkillCheck, rollDamage } = require('./dice-engine');
const { resolveSanCheck } = require('./san-engine');
const { createCharacter, getCharacter, updateSAN, updateHP, setSkills } = require('./database');
const { buildPass1Prompt, buildPass2Prompt, buildSanPass1Prompt } = require('./two-pass-generator');
const { getCurrentScene, getScene, transitionTo, discoverClue, getContextForAI, getDiscoveredClues, advanceTime, reset } = require('./scene-manager');
const { buildSystemPrompt, buildCharacterSummary } = require('./kp-prompts');

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
        if (newHP === undefined) return res.status(400).json({ error: 'newHP required' });
        try {
            const char = updateHP(req.params.id, newHP, newMaxHP);
            res.json({ id: char.id, hp_current: char.hp_current, hp_max: char.hp_max });
        } catch (e) {
            res.status(400).json({ error: e.message });
        }
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
        res.json({ scene: { id: scene.id, name: scene.name, dread: scene.dread, description: scene.description, npcs: scene.npcs?.map(n => ({ name: n.name, role: n.role, speak: n.speak })), exits: scene.exits }, context });
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
                if (c) { allClues.push({ id: c.id, text: c.text }); break; }
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
        try {
            const fs = require('fs'), path = require('path');
            const userDir = path.join(__dirname, '..', '..', 'data', 'default-user');
            const settings = JSON.parse(fs.readFileSync(path.join(userDir, 'settings.json'), 'utf8'));
            const secrets = JSON.parse(fs.readFileSync(path.join(userDir, 'secrets.json'), 'utf8'));
            const mainApi = settings.main_api || 'openai';

            // Resolve API key
            let apiKey = null;
            const keyField = 'api_key_' + mainApi;
            if (secrets[keyField] && Array.isArray(secrets[keyField]) && secrets[keyField].length > 0) {
                apiKey = secrets[keyField].find(s => s.active)?.value || secrets[keyField][0].value;
            }
            if (!apiKey && secrets.api_key_custom && Array.isArray(secrets.api_key_custom)) {
                apiKey = secrets.api_key_custom.find(s => s.active)?.value || secrets.api_key_custom[0].value;
            }

            // Resolve API URL
            let apiUrl = '';
            const base = settings.oai_settings?.custom_url || '';
            if (base) apiUrl = base + (base.endsWith('/') ? 'chat/completions' : '/chat/completions');
            else if (mainApi === 'openai') apiUrl = 'https://api.openai.com/v1/chat/completions';
            else if (mainApi === 'deepseek') apiUrl = 'https://api.deepseek.com/v1/chat/completions';
            else apiUrl = 'https://api.openai.com/v1/chat/completions';

            // Check proxy
            if (settings.selected_proxy?.url) apiUrl = settings.selected_proxy.url;

            if (!apiUrl || !apiKey) {
                return res.status(400).json({ error: 'AI backend not configured. Set up API key in ST first.' });
            }

            const resp = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                body: JSON.stringify({
                    model: req.body.model || 'deepseek-v4-pro',
                    messages: messages,
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
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
}

module.exports = { info, init };
