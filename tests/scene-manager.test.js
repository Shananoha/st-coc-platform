// tests/scene-manager.test.js
// Scene Manager - Unit Tests (TDD)
//
// Tests:
// T1: Default scene is intro with expected name/dread
// T2: loadModule replaces scenes and sets new start
// T3: reset restores default scenes
// T4: transitionTo works with loaded module
// T5: discoverClue works with loaded module
// T6: loadModule rejects null input

var assert = require('assert');
var sm = require('../plugins/coc-rules-engine/scene-manager');

// ============================================================
// T1: DEFAULT SCENE
// ============================================================

sm.reset();

var s = sm.getCurrentScene();
assert.strictEqual(s.id, 'intro', 'Default start scene should be intro');
assert.strictEqual(s.name, '委托人到访');
assert.strictEqual(s.dread, 1);
console.log('T1 PASSED: Default scene is intro with name="委托人到访", dread=1');

// ============================================================
// T2: loadModule replaces scenes
// ============================================================

var testScenes = {
    start: { id: 'start', name: 'Test Start', dread: 1, description: '', npcs: [], clues: [], san_triggers: [] },
    middle: { id: 'middle', name: 'Test Middle', dread: 3, description: '', npcs: [], clues: [], san_triggers: [] },
    end: { id: 'end', name: 'Test End', dread: 5, description: '', npcs: [], clues: [], san_triggers: [] }
};
var result = sm.loadModule(testScenes);
assert.strictEqual(result.ok, true, 'loadModule should return ok:true');
assert.strictEqual(result.startScene, 'start');
// Current scene should now be the first key in testScenes
var s2 = sm.getCurrentScene();
assert.strictEqual(s2.id, 'start');
assert.strictEqual(s2.name, 'Test Start');
assert.strictEqual(s2.dread, 1);
console.log('T2 PASSED: loadModule replaces scenes, current scene is "start"');

// ============================================================
// T3: reset restores default scenes
// ============================================================

sm.reset();
var s3 = sm.getCurrentScene();
assert.strictEqual(s3.id, 'intro');
assert.strictEqual(s3.name, '委托人到访');
console.log('T3 PASSED: reset restores default intro scene');

// ============================================================
// T4: transitionTo works with loaded module
// ============================================================

sm.loadModule(testScenes);
var t = sm.transitionTo('middle');
assert.strictEqual(t.from, 'start');
assert.strictEqual(t.to, 'middle');
assert.strictEqual(t.scene.name, 'Test Middle');
assert.strictEqual(t.scene.dread, 3);
var s4 = sm.getCurrentScene();
assert.strictEqual(s4.id, 'middle');
assert.strictEqual(s4.name, 'Test Middle');
console.log('T4 PASSED: transitionTo("middle") works, current scene is "middle"');

// ============================================================
// T5: discoverClue works with loaded module
// ============================================================

sm.reset();
sm.loadModule(testScenes);
// Reload with a clue on start scene (non-auto trigger so discoverClue can find it)
testScenes.start.clues = [
    { id: 'test_clue_1', severity: 'core', success: 'Found a clue!', fail_forward: 'Almost found...', trigger: 'search' }
];
sm.loadModule(testScenes);
var clue = sm.discoverClue('test_clue_1');
assert.ok(clue, 'discoverClue should return a clue object');
assert.strictEqual(clue.success, 'Found a clue!');
assert.strictEqual(clue.severity, 'core');
console.log('T5 PASSED: discoverClue returns correct clue object');

// ============================================================
// T6: loadModule rejects null
// ============================================================

var bad = sm.loadModule(null);
assert.ok(bad.error, 'loadModule(null) should return an error');
assert.strictEqual(typeof bad.error, 'string');
console.log('T6 PASSED: loadModule(null) returns error: ' + bad.error);

// ============================================================
// SUMMARY
// ============================================================

console.log('\nALL TESTS PASSED');
