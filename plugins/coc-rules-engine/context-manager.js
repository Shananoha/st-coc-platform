// Context Manager - Layered context for AI generation
// Prevents context window overflow during long CoC sessions.
// Uses 4 layers: System (static), Sticky (change-detected), Ephemeral (per-turn), History (compressed)

/**
 * Estimate token count for a string (rough: ~2.5 chars per token for Chinese, ~4 for English).
 * This is a rough estimate; use a real tokenizer in production.
 */
function estimateTokens(text) {
    if (!text) return 0;
    // Chinese chars ~1.5 tokens each, others ~0.25 tokens per char
    let tokens = 0;
    for (const ch of text) {
        tokens += /[\u4e00-\u9fff\u3400-\u4dbf]/.test(ch) ? 1.5 : 0.25;
    }
    return Math.ceil(tokens);
}

/**
 * Truncate text at the last sentence boundary within maxLen characters.
 * Falls back to maxLen if no boundary found.
 */
function truncateToSentence(text, maxLen) {
    if (text.length <= maxLen) return text;
    const slice = text.substring(0, maxLen);
    // Find last sentence boundary (Chinese or English punctuation)
    const match = slice.match(/.*[。！？.!?\n]/);
    if (match) return match[0].trim();
    // Fallback: truncate at last space
    const lastSpace = slice.lastIndexOf(' ');
    if (lastSpace > maxLen * 0.5) return slice.substring(0, lastSpace) + '…';
    return slice + '…';
}

/**
 * Layered context manager for CoC sessions.
 */
class ContextManager {
    constructor(options = {}) {
        this.maxTokens = options.maxTokens || 28000; // default for most models
        this.systemPrompt = options.systemPrompt || '';
        this._stickyHash = '';
        this._stickyContent = '';
        this._ephemeral = '';
        this._history = [];
        this._summary = '';
    }

    /** Set system prompt (rarely changes - only on major config changes) */
    setSystem(prompt) {
        this.systemPrompt = prompt;
    }

    /** Set sticky context - only updates when content actually changes (hash check) */
    setSticky(content) {
        const hash = this._hash(content);
        if (hash === this._stickyHash) return false; // no change
        this._stickyHash = hash;
        this._stickyContent = content;
        return true; // changed
    }

    /** Set ephemeral context (injected every turn, never cached) */
    setEphemeral(content) {
        this._ephemeral = content;
    }

    /** Add a message to history, auto-compress if over budget */
    addMessage(role, content) {
        this._history.push({ role, content, tokens: estimateTokens(content) });
        this._maybeCompress();
    }

    /** Build the final context for AI generation */
    build() {
        const parts = [];
        let budget = this.maxTokens;

        // 1. System prompt (highest priority, always included)
        const sysTokens = estimateTokens(this.systemPrompt);
        parts.push({ role: 'system', content: this.systemPrompt });
        budget -= sysTokens;

        // 2. Sticky context (if changed)
        if (this._stickyContent) {
            const stickyTokens = estimateTokens(this._stickyContent);
            if (budget - stickyTokens > this.maxTokens * 0.3) { // leave 30% floor for history
                parts.push({ role: 'system', content: `[当前状态]\n${this._stickyContent}` });
                budget -= stickyTokens;
            }
        }

        // 3. Summary of older messages (if exists)
        if (this._summary) {
            const sumTokens = estimateTokens(this._summary);
            parts.push({ role: 'system', content: `[之前的摘要]\n${this._summary}` });
            budget -= sumTokens;
        }

        // 4. Recent history (most recent messages, within budget)
        const recentMsgs = [];
        let historyTokens = 0;
        for (let i = this._history.length - 1; i >= 0; i--) {
            const msg = this._history[i];
            if (historyTokens + msg.tokens > budget) break;
            recentMsgs.unshift(msg);
            historyTokens += msg.tokens;
        }
        parts.push(...recentMsgs.map(m => ({ role: m.role, content: m.content })));

        // 5. Ephemeral (injected as last system message if budget allows)
        if (this._ephemeral) {
            const ephTokens = estimateTokens(this._ephemeral);
            if (budget - historyTokens - ephTokens > 0) {
                parts.splice(parts.length - recentMsgs.length, 0,
                    { role: 'system', content: `[本轮检定]\n${this._ephemeral}` });
            }
        }

        return { messages: parts, estimatedTokens: this.maxTokens - budget + historyTokens };
    }

    /** Get current token usage estimate */
    getTokenUsage() {
        let total = estimateTokens(this.systemPrompt) + estimateTokens(this._stickyContent) + estimateTokens(this._summary);
        for (const msg of this._history) total += msg.tokens;
        total += estimateTokens(this._ephemeral);
        return { total, max: this.maxTokens, percent: Math.round(total / this.maxTokens * 100) };
    }

    /** Reset everything except system prompt */
    reset() {
        this._stickyHash = '';
        this._stickyContent = '';
        this._ephemeral = '';
        this._history = [];
        this._summary = '';
    }

    // ==================== PRIVATE ====================

    _hash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const ch = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + ch;
            hash |= 0;
        }
        return hash.toString(36);
    }

    _maybeCompress() {
        const historyTokens = this._history.reduce((sum, m) => sum + m.tokens, 0);
        const stickyTokens = estimateTokens(this._stickyContent);
        const sysTokens = estimateTokens(this.systemPrompt);
        const used = sysTokens + stickyTokens + historyTokens + estimateTokens(this._ephemeral);

        if (used <= this.maxTokens) return; // within budget, no compression needed

        // Compress oldest 50% of history into a summary
        const keepCount = Math.floor(this._history.length * 0.4); // keep most recent 40%
        const toSummarize = this._history.slice(0, this._history.length - keepCount);

        if (toSummarize.length < 5) return; // not enough to compress

        const summaryContent = toSummarize
            .filter(m => m.role !== 'system')
            .map(m => `[${m.role}] ${truncateToSentence(m.content, 150)}`)
            .join('\n');

        const newBlock = `[历史摘要 - ${toSummarize.length} 条消息]\n${summaryContent}`;
        if (this._summary) {
            this._summary = this._summary.replace(/\n关键事件请保留在记忆中。$/, '') + '\n' + newBlock + '\n\n关键事件请保留在记忆中。';
        } else {
            this._summary = newBlock + '\n\n关键事件请保留在记忆中。';
        }
        this._history = this._history.slice(-keepCount);
    }
}

module.exports = { ContextManager, estimateTokens };
