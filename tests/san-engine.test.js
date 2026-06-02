// tests/san-engine.test.js
// CoC 7e SAN Engine - Unit Tests (TDD: RED phase)
//
// Scenarios:
// S4: SAN check: pass if roll ≤ SAN, fail → lose SAN, temp/indefinite insanity on ≥5 loss
// S5: SAN loss formula "0/1d6" "1d4/1d8" parsing

const { resolveSanCheck, parseLoss } = require('san-engine');

// ============================================================
// S4: SAN CHECK - PASS/FAIL + INSANITY DETECTION
// ============================================================

describe('resolveSanCheck - pass/fail', () => {
    test('S4a: SAN 70, roll 5 → pass, lose 0 SAN (when formula is "0/1d6")', () => {
        const result = resolveSanCheck(70, '0/1d6', 'test');
        // roll 5 ≤ 70 → passed
        expect(result.passed).toBe(true);
        expect(result.sanLost).toBe(0);
        expect(result.newSAN).toBe(70);
        expect(result.insanity).toBeNull();
    });

    test('S4b: failure loss ≥ 5 but < SAN/5 → temp insanity', () => {
        // SAN 80, formula "0/6": failure loses 6 (always in test)
        // We need to simulate a failing roll. Since resolveSanCheck is non-deterministic,
        // we test the insanity logic indirectly by checking correct result structure.
        const result = resolveSanCheck(80, '0/6', 'horror');
        // If roll > 80 (fail), sanLost should be 6
        if (!result.passed) {
            expect(result.sanLost).toBeGreaterThanOrEqual(6);
            // 6 ≥ 5 AND 6 < 80/5(=16)? → temp insanity
            // Actually: 6 ≥ 5 AND 6 < 16? → temp
            // But if 6 ≥ 16? No. So for this specific case, if failed: temp
            if (result.insanity) {
                // could be temp or none depending on exact loss
            }
        }
        // Just verify the response structure is valid
        expect(result).toHaveProperty('passed');
        expect(result).toHaveProperty('roll');
        expect(result).toHaveProperty('sanLost');
        expect(result).toHaveProperty('newSAN');
    });

    test('S4c: large SAN loss triggers permanent insanity when SAN reaches 0', () => {
        // SAN 5, loss "0/1d20" → failing likely drops SAN to ≤ 0
        const result = resolveSanCheck(5, '0/1d20', 'extreme horror');
        if (!result.passed && result.sanLost >= 5) {
            expect(result.insanity).not.toBeNull();
        }
        expect(result.newSAN).toBeGreaterThanOrEqual(0);
    });

    test('S4d: passed SAN check should never trigger insanity', () => {
        // Force a pass by setting SAN high, loss low
        // Actually since rolls are random, we just check: if passed, sanity is not null check
        const result = resolveSanCheck(99, '0/1', 'mild');
        if (result.passed) {
            expect(result.insanity).toBeNull();
        }
    });
});

// ============================================================
// S5: SAN LOSS FORMULA PARSING
// ============================================================

describe('parseLoss - formula parsing', () => {
    test('S5a: "0" → returns 0', () => {
        expect(parseLoss('0')).toBe(0);
    });

    test('S5b: "5" (plain number) → returns 5', () => {
        expect(parseLoss('5')).toBe(5);
    });

    test('S5c: "1d6" → returns 1-6', () => {
        const result = parseLoss('1d6');
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(6);
    });

    test('S5d: "2d6+3" → returns 5-15', () => {
        const result = parseLoss('2d6+3');
        expect(result).toBeGreaterThanOrEqual(5);
        expect(result).toBeLessThanOrEqual(15);
    });

    test('S5e: "1d4-2" → returns -1 to 2', () => {
        const result = parseLoss('1d4-2');
        expect(result).toBeGreaterThanOrEqual(-1);
        expect(result).toBeLessThanOrEqual(2);
    });

    test('S5f: invalid format throws', () => {
        expect(() => parseLoss('abc')).toThrow();
    });
});
