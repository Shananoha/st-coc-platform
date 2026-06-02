// plugins/coc-rules-engine/san-engine.js
// CoC 7e SAN (Sanity) engine - deterministic sanity check resolution

/**
 * Resolve a SAN (Sanity) check.
 * @param {number} currentSAN - investigator's current SAN value
 * @param {string} sanLossStr - loss formula, e.g. "0/1d6" (success/failure) or "1d4/1d8"
 * @param {string} reason - what triggered the SAN check
 * @returns {{passed:boolean, roll:number, currentSAN:number, sanLost:number, newSAN:number, sanLossStr:string, reason:string, insanity:object|null}}
 */
function resolveSanCheck(currentSAN, sanLossStr, reason = '') {
    const parts = sanLossStr.split('/');
    if (parts.length !== 2) throw new Error('Invalid sanLoss format. Use "successLoss/failureLoss" (e.g., "0/1d6")');

    const successLoss = parseLoss(parts[0]);
    const failureLoss = parseLoss(parts[1]);

    const sanRoll = Math.floor(Math.random() * 100) + 1;
    const passed = sanRoll <= currentSAN;

    const sanLost = passed ? successLoss : failureLoss;
    const newSAN = Math.max(0, currentSAN - sanLost);

    // Insanity determination (CoC 7e rules)
    let insanity = null;
    const fifthOfSAN = Math.floor(currentSAN / 5);

    if (newSAN <= 0) {
        insanity = { type: 'permanent', description: '理智归零——永久疯狂' };
    } else if (!passed && failureLoss >= 5 && failureLoss >= fifthOfSAN) {
        insanity = { type: 'indefinite', description: '不定疯狂——角色在24小时内经历了重大精神创伤' };
    } else if (!passed && failureLoss >= 5) {
        insanity = { type: 'temp', description: '临时疯狂——角色经历了严重的精神冲击' };
    }

    return {
        passed,
        roll: sanRoll,
        currentSAN,
        sanLost,
        newSAN,
        sanLossStr,
        reason,
        insanity
    };
}

/**
 * Parse a SAN loss value: "0", "5", "1d6", "2d6+3", "1d4-2"
 * @param {string} str
 * @returns {number}
 */
function parseLoss(str) {
    str = str.trim();
    if (str === '0') return 0;

    // Plain number?
    const plainNum = parseInt(str);
    if (!isNaN(plainNum) && !str.includes('d')) return plainNum;

    // Dice formula: NdM+N or NdM-N
    const match = str.match(/^(\d+)?d(\d+)([+-]\d+)?$/);
    if (!match) throw new Error(`Cannot parse SAN loss value: "${str}". Expected "0", "5", "1d6", "2d6+3", or "1d4-2"`);

    const count = parseInt(match[1]) || 1;
    const faces = parseInt(match[2]);
    const modifier = match[3] ? parseInt(match[3]) : 0;

    let total = 0;
    for (let i = 0; i < count; i++) {
        total += Math.floor(Math.random() * faces) + 1;
    }
    return total + modifier;
}

module.exports = { resolveSanCheck, parseLoss };
