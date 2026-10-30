export const COLOR_STYLE_ID = 'vela-ui-color';

export const COLOR_CSS = `
.vela-color-field{width:24px;height:24px;padding:2px;border:1px solid var(--vela-border);border-radius:0;background:var(--vela-surface-sunken);cursor:pointer;display:inline-flex;flex:none;}
.vela-color-field:hover{border-color:var(--vela-fg-muted);}
.vela-color-field-swatch{display:block;width:100%;height:100%;border-radius:0;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.25);}
.vela-color-field-circle{width:26px;height:26px;padding:3px;border:1px solid var(--vela-border-strong);border-radius:4px;background:transparent;overflow:hidden;}
.vela-color-field-circle .vela-color-field-swatch{border-radius:2px;box-shadow:none;}
.vela-color-field-line{width:auto;height:32px;padding:0 10px 0 6px;gap:8px;align-items:center;border:1px solid var(--vela-border-strong);border-radius:6px;background:transparent;}
.vela-color-field-line .vela-color-field-swatch{width:20px;height:20px;flex:none;border-radius:3px;box-shadow:none;}
.vela-color-field-sample{display:block;width:34px;height:0;}
.vela-color-field-pop{background:var(--vela-surface-overlay);border:1px solid var(--vela-border);border-radius:var(--vela-radius-lg);box-shadow:var(--vela-shadow);padding:10px;}
`;
