// plugins/coc-rules-engine/two-pass-generator.js
// Two-Pass Generation: Pass1 generates locked mechanism → Pass2 generates narrative.
// This prevents the AI from "cheating" on dice results.
//
// Usage: Integrate with ST's generate_interceptor or call directly via API.
// The generateFn callback should be ST's AI generation function: (prompt, options) => string

/**
 * Run two-pass generation for a skill check.
 * @param {object} checkResult - from resolveSkillCheck (includes skillName, skillValue, roll, level, success)
 * @param {object} context - { currentScene, characterSummary, generateFn }
 * @returns {Promise<{mechanicsResult: string, narrativeResult: string}>}
 */
async function twoPassSkillCheck(checkResult, context) {
    const { generateFn, currentScene, characterSummary } = context;
    const { skillName, skillValue, roll, level, success } = checkResult;

    // Pass 1: Generate locked mechanism description (no narrative flourishes)
    const pass1Prompt = buildPass1Prompt({ skillName, skillValue, roll, level, success });
    const pass1Output = await generateFn(pass1Prompt, { maxTokens: 100, temperature: 0.3 });

    // Pass 2: Generate immersive narrative based on locked mechanism
    const pass2Prompt = buildPass2Prompt(pass1Output, { currentScene, characterSummary });
    const pass2Output = await generateFn(pass2Prompt, { maxTokens: 500, temperature: 0.8 });

    return {
        mechanicsResult: pass1Output.trim(),
        narrativeResult: pass2Output.trim()
    };
}

/**
 * Run two-pass generation for a SAN check.
 * @param {object} sanResult - from resolveSanCheck
 * @param {object} context
 * @returns {Promise<{mechanicsResult: string, narrativeResult: string}>}
 */
async function twoPassSanCheck(sanResult, context) {
    const { generateFn, currentScene } = context;
    const { passed, roll, currentSAN, sanLost, newSAN, reason, insanity } = sanResult;

    const pass1Prompt = buildSanPass1Prompt({ passed, roll, currentSAN, sanLost, newSAN, reason, insanity });
    const pass1Output = await generateFn(pass1Prompt, { maxTokens: 100, temperature: 0.3 });

    const pass2Prompt = buildPass2Prompt(pass1Output, { currentScene });
    const pass2Output = await generateFn(pass2Prompt, { maxTokens: 500, temperature: 0.8 });

    return {
        mechanicsResult: pass1Output.trim(),
        narrativeResult: pass2Output.trim()
    };
}

// ==================== PROMPT BUILDERS ====================

function buildPass1Prompt({ skillName, skillValue, roll, level, success }) {
    const resultText = success
        ? `成功 (${level})`
        : (level === 'fumble' ? '大失败' : '失败');

    return `[规则引擎输出 - 客观事实，不可修改]

技能检定结果：
- 技能：${skillName} (${skillValue}%)
- 掷出：${roll}
- 结果：${resultText}

请用一句中文客观描述这个检定发生了什么。不要添加叙述性语言或环境描写。
${success ? '示例格式："侦查检定成功(42/70)。调查员在书桌抽屉中发现了一封泛黄的信件。"' : '示例格式："侦查检定失败(85/70)。调查员没能找到隐藏的线索，但注意到书架上一本书似乎被频繁翻阅。"'}
注意：即使失败，也绝不说"什么都没发现"。失败意味着花时间太多、错失关键细节、或只找到次要线索。`;
}

function buildSanPass1Prompt({ passed, roll, currentSAN, sanLost, newSAN, reason, insanity }) {
    let insanityText = '';
    if (insanity) {
        insanityText = `\n疯狂判定：${insanity.description}`;
    }

    return `[规则引擎输出 - 客观事实，不可修改]

理智检定结果：
- 触发原因：${reason}
- 掷出：${roll} (当前SAN: ${currentSAN})
- ${passed ? '通过' : '失败'}：失去 ${sanLost} 点SAN，剩余 ${newSAN}/${currentSAN}${insanityText}

请用一句中文客观描述这个SAN检定的结果。包含检定成功/失败和SAN损失。
${insanity ? '疯狂状态需要在叙述中体现，但不要过度戏剧化。' : ''}`;
}

function buildPass2Prompt(mechanicsResult, { currentScene = '', characterSummary = '' }) {
    return `[守密人叙述指令]

你是克苏鲁的呼唤的守密人(KP)。基于以下机制描述，扩写为沉浸式叙述。

机制描述（锁定的客观事实，不可修改或添加）：${mechanicsResult}

${currentScene ? `当前场景：${currentScene}` : ''}
${characterSummary ? `调查员状态：${characterSummary}` : ''}

叙述要求：
- 使用感官细节（气味、温度、材质、声音）
- 展示而非告知。不说"你感到恐惧"，而说"你的手心渗出冷汗"
- 保持 cosmic horror 的语调——恐惧来自认知，而非怪物
- ${mechanicsResult.includes('失败') || mechanicsResult.includes('大失败') ? '失败不等于死胡同。暗示其他可能性或带来有意义的后果。' : ''}
- 长度控制在 3-5 句`;
}

module.exports = { twoPassSkillCheck, twoPassSanCheck, buildPass1Prompt, buildPass2Prompt, buildSanPass1Prompt };
