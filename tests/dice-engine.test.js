// tests/dice-engine.test.js
// CoC 7e Dice Engine - Unit Tests (TDD: RED phase)
//
// Scenarios:
// S1: D100 roll=1→critical, roll=100→fumble, roll≤skill→regular success
// S2: Skill<50: 96-100 all fumble (fumble range expands)
// S3: Difficulty levels: extreme (≤skill/5), hard (≤skill/2), regular (≤skill)

const { resolveSkillCheck, rollDamage } = require('dice-engine');

// ============================================================
// S1: CORE SKILL CHECK - SUCCESS/FAILURE LEVELS
// ============================================================

describe('resolveSkillCheck - success/failure levels', () => {
    const skill = 70;

    test('S1a: roll 1 → critical success', () => {
        const result = resolveSkillCheck(skill, 1);
        expect(result.success).toBe(true);
        expect(result.level).toBe('critical');
        expect(result.isCritical).toBe(true);
        expect(result.isFumble).toBe(false);
    });

    test('S1b: roll ≤ skill/5 (≤14) → extreme success', () => {
        const result = resolveSkillCheck(skill, 10);
        expect(result.success).toBe(true);
        expect(result.level).toBe('extreme');
    });

    test('S1c: roll ≤ skill/2 (≤35) but > skill/5 → hard success', () => {
        const result = resolveSkillCheck(skill, 30);
        expect(result.success).toBe(true);
        expect(result.level).toBe('hard');
    });

    test('S1d: roll ≤ skill (≤70) but > skill/2 → regular success', () => {
        const result = resolveSkillCheck(skill, 60);
        expect(result.success).toBe(true);
        expect(result.level).toBe('regular');
    });

    test('S1e: roll > skill (71-99) → fail', () => {
        const result = resolveSkillCheck(skill, 85);
        expect(result.success).toBe(false);
        expect(result.level).toBe('fail');
    });

    test('S1f: roll 100 → fumble', () => {
        const result = resolveSkillCheck(skill, 100);
        expect(result.success).toBe(false);
        expect(result.level).toBe('fumble');
        expect(result.isFumble).toBe(true);
    });
});

// ============================================================
// S2: LOW SKILL FUMBLE RANGE (CoC 7e rule)
// When skill < 50, 96-100 is fumble instead of just 100
// ============================================================

describe('resolveSkillCheck - low skill fumble range', () => {
    test('S2a: skill 40, roll 96 → fumble (expanded range)', () => {
        const result = resolveSkillCheck(40, 96);
        expect(result.level).toBe('fumble');
        expect(result.isFumble).toBe(true);
    });

    test('S2b: skill 40, roll 97 → fumble', () => {
        const result = resolveSkillCheck(40, 97);
        expect(result.level).toBe('fumble');
    });

    test('S2c: skill 40, roll 99 → fumble', () => {
        const result = resolveSkillCheck(40, 99);
        expect(result.level).toBe('fumble');
    });

    test('S2d: skill 40, roll 1 → still critical', () => {
        const result = resolveSkillCheck(40, 1);
        expect(result.level).toBe('critical');
    });

    test('S2e: skill 50, roll 96 → NOT fumble (skill ≥ 50, only 100 is fumble)', () => {
        const result = resolveSkillCheck(50, 96);
        expect(result.level).not.toBe('fumble');
        // 96 > 50, so it's a fail
        expect(result.level).toBe('fail');
    });

    test('S2f: skill 50, roll 100 → still fumble', () => {
        const result = resolveSkillCheck(50, 100);
        expect(result.level).toBe('fumble');
    });
});

// ============================================================
// S3: DIFFICULTY REQUIREMENT CHECK (meets_difficulty)
// ============================================================

describe('resolveSkillCheck - meets_difficulty', () => {
    test('S3a: regular difficulty, roll 60 on skill 70 → meets', () => {
        const result = resolveSkillCheck(70, 60, 'regular');
        expect(result.meets_difficulty).toBe(true);
    });

    test('S3b: hard difficulty, roll 60 on skill 70 → does NOT meet (60 > 35)', () => {
        const result = resolveSkillCheck(70, 60, 'hard');
        expect(result.meets_difficulty).toBe(false);
    });

    test('S3c: hard difficulty, roll 30 on skill 70 → meets (30 ≤ 35)', () => {
        const result = resolveSkillCheck(70, 30, 'hard');
        expect(result.meets_difficulty).toBe(true);
    });

    test('S3d: extreme difficulty, roll 10 on skill 70 → meets (10 ≤ 14)', () => {
        const result = resolveSkillCheck(70, 10, 'extreme');
        expect(result.meets_difficulty).toBe(true);
    });

    test('S3e: extreme difficulty, roll 30 on skill 70 → does NOT meet', () => {
        const result = resolveSkillCheck(70, 30, 'extreme');
        expect(result.meets_difficulty).toBe(false);
    });

    test('S3f: critical on any difficulty → meets', () => {
        const result = resolveSkillCheck(70, 1, 'extreme');
        expect(result.meets_difficulty).toBe(true);
    });
});

// ============================================================
// S5: DAMAGE ROLL FORMULA PARSING
// ============================================================

describe('rollDamage - formula parsing', () => {
    test('S5a: "1d10" → total between 1-10', () => {
        const result = rollDamage('1d10');
        expect(result.total).toBeGreaterThanOrEqual(1);
        expect(result.total).toBeLessThanOrEqual(10);
        expect(result.breakdown).toHaveLength(1);
        expect(result.breakdown[0].rolls).toHaveLength(1);
    });

    test('S5b: "2d6+3" → total between 5-15', () => {
        const result = rollDamage('2d6+3');
        expect(result.total).toBeGreaterThanOrEqual(5);
        expect(result.total).toBeLessThanOrEqual(15);
        expect(result.flatBonus).toBe(3);
    });

    test('S5c: "1d4+2d6" → total between 3-16', () => {
        const result = rollDamage('1d4+2d6');
        expect(result.total).toBeGreaterThanOrEqual(3);
        expect(result.total).toBeLessThanOrEqual(16);
        expect(result.breakdown).toHaveLength(2);
    });

    test('S5d: "5" (flat number) → total = 5', () => {
        const result = rollDamage('5');
        expect(result.total).toBe(5);
        expect(result.flatBonus).toBe(5);
    });
});
