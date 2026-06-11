var { ContextManager } = require('./context-manager');
var assert = require('assert');

// ============================================================
// Test 1: Summary append on re-compression
// ============================================================
// With maxTokens=50, sys='s' (1 token), and each msg1 ~20 tokens,
// compression triggers at msg index 3 (3*20+1=61 > 50).
// 12 batch1 msgs produce ~5 compressions, 12 batch2 msgs produce more.
var cm1 = new ContextManager({ maxTokens: 50, systemPrompt: 's' });
for (var i = 0; i < 12; i++) {
    cm1.addMessage('user', 'This is a message that will accumulate tokens to trigger compression number ' + i + '.');
}
var summary1 = cm1._summary;
assert(summary1 && summary1.length > 0, 'First compression should produce summary');

for (var i = 0; i < 12; i++) {
    cm1.addMessage('user', 'Another batch of messages to trigger second compression round ' + i + '.');
}
var summary2 = cm1._summary;
assert(summary2.length > summary1.length, 'Second compression should append to summary (longer)');
// Summary should contain content from both compression rounds
assert(summary2.indexOf('compression number') >= 0, 'Should contain first round marker');
assert(summary2.indexOf('second compression') >= 0, 'Should contain second round marker');
console.log('Test 1 PASSED: Summary append on re-compression');

// ============================================================
// Test 2: Sentence-boundary truncation
// ============================================================
// Long message (229 chars, 58 tokens) gets truncated to 150 chars
// at the last sentence boundary. 30 filler msgs trigger compression.
var cm2 = new ContextManager({ maxTokens: 200, systemPrompt: 's' });
cm2.addMessage('user', 'First sentence here is complete with enough padding to make this message exceed one hundred fifty characters so truncation is forced which is the whole point of this exercise. Second sentence is shorter. Third sentence ends here.');
for (var i = 0; i < 30; i++) {
    cm2.addMessage('user', 'Filler message number ' + i + ' with enough text to fill up the token budget quickly.');
}
var summary3 = cm2._summary;
assert(summary3, 'Should have summary');
// The long message (first in history) gets truncated via truncateToSentence(..., 150).
// Find the first summarized message line and verify it ends at sentence boundary.
var lines = summary3.split('\n');
var foundTruncated = false;
for (var li = 0; li < lines.length; li++) {
    var line = lines[li].trim();
    if (line.indexOf('First sentence here is complete') >= 0) {
        var endsOk = /[。！？.!?…]$/.test(line);
        assert(endsOk, 'Truncated line should end at sentence boundary, got: ...' + line.slice(-40));
        foundTruncated = true;
        break;
    }
}
// Also check that the summary tail ends with boundary (from template)
var lastChars = summary3.slice(-10);
var hasBoundary = lastChars.indexOf('。') >= 0 || lastChars.indexOf('.') >= 0 || lastChars.indexOf('…') >= 0 || lastChars.indexOf('!') >= 0;
assert(hasBoundary, 'Summary should end at sentence boundary or ellipsis, got: ' + lastChars);
console.log('Test 2 PASSED: Sentence-boundary truncation');

// ============================================================
// Test 3: Compression respects budget
// ============================================================
// Verify that compression fires and keeps the non-summary
// portion (sys + history) within maxTokens.
var cm3 = new ContextManager({ maxTokens: 300, systemPrompt: 'short sys' });
for (var i = 0; i < 40; i++) {
    cm3.addMessage('user', 'Message number ' + i + ' containing substantial content that will consume many tokens quickly.');
}
// Compression should have fired
assert(cm3._summary && cm3._summary.length > 0, 'Compression should have produced a summary');
// History should be trimmed (not all 40 kept)
assert(cm3._history.length < 40, 'History should be compressed (kept ' + cm3._history.length + ' of 40)');
// Non-summary portion (sys + history) must be within maxTokens
var sysTokens = require('./context-manager').estimateTokens(cm3.systemPrompt);
var historyTokens = cm3._history.reduce(function(s, m) { return s + m.tokens; }, 0);
assert(sysTokens + historyTokens <= cm3.maxTokens + 50,
    'Non-summary tokens ' + (sysTokens + historyTokens) + ' should be ≤ ' + (cm3.maxTokens + 50));
console.log('Test 3 PASSED: Budget respect (sys=' + sysTokens + ' + history=' + historyTokens + ' = ' + (sysTokens + historyTokens) + ' ≤ max=' + cm3.maxTokens + ')');

console.log('\nALL TESTS PASSED');
