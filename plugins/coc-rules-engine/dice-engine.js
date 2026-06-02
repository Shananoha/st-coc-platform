// plugins/coc-rules-engine/dice-engine.js
// CoC 7e dice engine - pure deterministic functions
// No side effects, no external dependencies.

/**
 * Resolve a CoC 7e skill check (D100 roll).
 * @param {number} skillValue - character's skill percentage (1-99+)
 * @param {number} roll - the D100 roll result (1-100)
 * @param {'regular'|'hard'|'extreme'} [difficulty='regular'] - required difficulty
 * @returns {{success:boolean, level:string, isCritical:boolean, isFumble:boolean, meets_difficulty:boolean}}
 */
function resolveSkillCheck(skillValue, roll, difficulty = 'regular') {
    const hardTarget = Math.floor(skillValue / 2);
    const extremeTarget = Math.floor(skillValue / 5);

    let success, level;

    if (roll === 1) {
        success = true;
        level = 'critical';
    } else if (roll === 100 || (skillValue < 50 && roll >= 96)) {
        success = false;
        level = 'fumble';
    } else if (roll <= extremeTarget) {
        success = true;
        level = 'extreme';
    } else if (roll <= hardTarget) {
        success = true;
        level = 'hard';
    } else if (roll <= skillValue) {
        success = true;
        level = 'regular';
    } else {
        success = false;
        level = 'fail';
    }

    const diffMap = { regular: 0, hard: 1, extreme: 2 };
    const levelMap = { fail: -1, fumble: -1, regular: 0, hard: 1, extreme: 2, critical: 3 };
    const meets_difficulty = success && levelMap[level] >= (diffMap[difficulty] || 0);

    return { success, level, isCritical: level === 'critical', isFumble: level === 'fumble', meets_difficulty };
}

/**
 * Roll damage dice from a formula string.
 * Supports: "1d10", "2d6+3", "1d4+2d6", "5" (flat number)
 * @param {string} formula
 * @returns {{formula:string, breakdown:Array, flatBonus:number, total:number}}
 */
function rollDamage(formula) {
    let total = 0;
    const breakdown = [];
    const diceRegex = /(\d+)?d(\d+)/g;
    let match;

    // Roll all dice groups
    while ((match = diceRegex.exec(formula)) !== null) {
        const count = parseInt(match[1]) || 1;
        const faces = parseInt(match[2]);
        const rolls = [];
        let subtotal = 0;
        for (let i = 0; i < count; i++) {
            const r = Math.floor(Math.random() * faces) + 1;
            rolls.push(r);
            subtotal += r;
        }
        total += subtotal;
        breakdown.push({ formula: match[0], count, faces, rolls, subtotal });
    }

    // Parse flat modifiers (+N or -N)
    let flatBonus = 0;
    const flatFormula = formula.replace(/\s/g, '').replace(/(\d+)?d(\d+)/g, '');
    if (flatFormula) {
        const flatMatches = flatFormula.match(/[+-]?\d+/g);
        if (flatMatches) {
            flatBonus = flatMatches.reduce((sum, n) => sum + parseInt(n), 0);
            total += flatBonus;
        }
    }

    return { formula, breakdown, flatBonus, total };
}

module.exports = { resolveSkillCheck, rollDamage };
