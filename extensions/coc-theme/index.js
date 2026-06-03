(function() {
    var STYLE_ID = 'coc-theme-styles';
    if (document.getElementById(STYLE_ID)) return;

    var css = `
:root {
    --coc-bg-abyss: #06080c; --coc-bg-deep: #0a0e14; --coc-bg-primary: #0d1117;
    --coc-bg-surface: #13181f; --coc-bg-elevated: #1a1f28; --coc-bg-hover: #1e2530;
    --coc-text-parchment: #d4c5a9; --coc-text-muted: #8b7d6b; --coc-text-dim: #5a5245;
    --coc-text-bright: #e8dcc8;
    --coc-san-gold: #c4a35a; --coc-san-dim: #8a7340;
    --coc-hp-crimson: #a83232; --coc-hp-dim: #6b2020;
    --coc-mp-arcane: #7b5ea7; --coc-mp-dim: #4a3868;
    --coc-success: #8fbc6a; --coc-success-dim: #3a5a28;
    --coc-fail: #c75050; --coc-fail-dim: #6b2a2a;
    --coc-critical: #e8a020;
    --coc-border-dark: rgba(139,125,107,0.08); --coc-border-subtle: rgba(139,125,107,0.15);
    --coc-border-visible: rgba(139,125,107,0.25); --coc-border-gold: rgba(196,163,90,0.3);
    --font-narrative: Georgia, 'Noto Serif SC', 'Source Han Serif SC', serif;
    --font-mono: 'SF Mono', 'Fira Code', 'Consolas', monospace;
}

body {
    background: var(--coc-bg-primary) !important;
    color: var(--coc-text-parchment) !important;
    font-family: system-ui, -apple-system, sans-serif !important;
}

body::after {
    content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 9998;
    opacity: 0.03;
    background: repeating-conic-gradient(rgba(200,180,150,0.03) 0% 25%, transparent 0% 50%) 0 0 / 4px 4px;
}

/* Chat messages → CoC narrative style */
#chat .mes {
    font-family: var(--font-narrative) !important;
    font-size: 15px !important;
    line-height: 1.85 !important;
    color: var(--coc-text-parchment) !important;
    background: transparent !important;
    border: none !important;
    padding-left: 20px !important;
    position: relative !important;
}
#chat .mes::before {
    content: ''; position: absolute; left: 0; top: 4px; bottom: 4px; width: 2px;
    background: linear-gradient(180deg, var(--coc-border-gold), transparent);
    border-radius: 1px;
}

/* Player messages right-aligned */
#chat .mes[is_user="true"] {
    text-align: right !important;
    margin-left: auto !important;
    max-width: 70% !important;
    background: linear-gradient(135deg, rgba(196,163,90,0.06), rgba(196,163,90,0.02)) !important;
    border: 1px solid var(--coc-border-dark) !important;
    border-right: 3px solid var(--coc-border-gold) !important;
    border-radius: 5px !important;
    padding: 12px 16px !important;
    font-family: var(--font-narrative) !important;
    font-size: 14px !important;
}
#chat .mes[is_user="true"]::before { display: none; }

/* System messages */
#chat .mes[is_system="true"] {
    text-align: center !important;
    font-size: 11px !important;
    color: var(--coc-text-dim) !important;
    letter-spacing: 1px !important;
    padding: 8px 0 !important;
}

/* Chat area background */
#chat { background: var(--coc-bg-primary) !important; }

/* Input area */
#send_form {
    background: var(--coc-bg-deep) !important;
    border-top: 1px solid var(--coc-border-dark) !important;
    padding: 12px !important;
}
#send_textarea {
    background: var(--coc-bg-surface) !important;
    border: 1px solid var(--coc-border-subtle) !important;
    color: var(--coc-text-parchment) !important;
    font-family: var(--font-narrative) !important;
    font-size: 14px !important;
    border-radius: 5px !important;
    padding: 12px 16px !important;
}
#send_textarea:focus { border-color: var(--coc-border-gold) !important; box-shadow: 0 0 0 1px rgba(196,163,90,0.1), 0 2px 8px rgba(0,0,0,0.2) !important; }
#send_but {
    background: linear-gradient(180deg, rgba(196,163,90,0.15), rgba(196,163,90,0.05)) !important;
    border: 1px solid var(--coc-border-gold) !important;
    color: var(--coc-san-gold) !important;
    font-weight: 600 !important;
    letter-spacing: 1px !important;
    border-radius: 5px !important;
}

/* Character panel → CoC sidebar */
#rightNavDrawerIcon, #left-nav-panel {
    background: var(--coc-bg-deep) !important;
    border-color: var(--coc-border-dark) !important;
}

/* Side panels */
#extensions_panel, #world_info_panel {
    background: var(--coc-bg-deep) !important;
    border-color: var(--coc-border-subtle) !important;
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(139,125,107,0.15); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(139,125,107,0.25); }

/* Buttons */
.menu_button, .drawer-icon {
    background: var(--coc-bg-surface) !important;
    border: 1px solid var(--coc-border-subtle) !important;
    color: var(--coc-text-parchment) !important;
    border-radius: 4px !important;
}
.menu_button:hover, .drawer-icon:hover {
    background: var(--coc-bg-elevated) !important;
    border-color: var(--coc-border-gold) !important;
}

/* Header / title bar */
#top-bar {
    background: var(--coc-bg-deep) !important;
    border-bottom: 1px solid var(--coc-border-dark) !important;
}
`;

    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
    console.log('[CoC Theme] Horror aesthetic applied.');
})();
