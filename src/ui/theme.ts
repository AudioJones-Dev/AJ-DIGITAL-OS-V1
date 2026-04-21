import { AJ_DIGITAL_DARK_THEME } from "./design-tokens.js";
import type { UiTheme } from "./theme-types.js";

export const uiTheme: UiTheme = AJ_DIGITAL_DARK_THEME;

export const buildThemeCssVariables = (theme: UiTheme = uiTheme): string => {
  return [
    `--ui-bg: ${theme.colors.background};`,
    `--ui-panel: ${theme.colors.panel};`,
    `--ui-card: ${theme.colors.card};`,
    `--ui-elevated: ${theme.colors.elevated};`,
    `--ui-border: ${theme.colors.border};`,
    `--ui-border-strong: ${theme.colors.borderStrong};`,
    `--ui-text-primary: ${theme.colors.textPrimary};`,
    `--ui-text-secondary: ${theme.colors.textSecondary};`,
    `--ui-text-muted: ${theme.colors.textMuted};`,
    `--ui-interactive-primary: ${theme.colors.interactivePrimary};`,
    `--ui-interactive-primary-hover: ${theme.colors.interactivePrimaryHover};`,
    `--ui-interactive-secondary: ${theme.colors.interactiveSecondary};`,
    `--ui-success: ${theme.colors.success};`,
    `--ui-warning: ${theme.colors.warning};`,
    `--ui-error: ${theme.colors.error};`,
    `--ui-link: ${theme.colors.link};`,
    `--ui-ai-gradient-start: ${theme.colors.aiGradientStart};`,
    `--ui-ai-gradient-end: ${theme.colors.aiGradientEnd};`,
    `--ui-font-sans: ${theme.typography.fontFamily};`,
    `--ui-font-mono: ${theme.typography.fontMonoFamily};`,
    `--ui-radius-panel: ${theme.radius.panel};`,
    `--ui-radius-card: ${theme.radius.card};`,
    `--ui-radius-pill: ${theme.radius.pill};`,
    `--ui-shadow-panel: ${theme.shadow.panel};`,
    `--ui-shadow-glow: ${theme.shadow.glow};`,
  ].join("\n");
};

export const buildUiStylesheet = (theme: UiTheme = uiTheme): string => {
  const variables = buildThemeCssVariables(theme);

  return `
:root {
${variables}
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
  background:
    radial-gradient(circle at top left, rgba(0, 164, 255, 0.14), transparent 28%),
    radial-gradient(circle at top right, rgba(255, 200, 87, 0.10), transparent 22%),
    linear-gradient(180deg, #111936 0%, var(--ui-bg) 55%);
  color: var(--ui-text-primary);
  font-family: var(--ui-font-sans);
}

button,
input,
select,
textarea {
  font: inherit;
}

a {
  color: var(--ui-link);
}

body {
  padding: 20px;
}

.ui-app {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 360px;
  min-height: calc(100vh - 40px);
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-panel);
  overflow: hidden;
  background: rgba(11, 16, 32, 0.72);
  backdrop-filter: blur(16px);
  box-shadow: var(--ui-shadow-panel);
}

.ui-sidebar,
.ui-right-panel {
  background: rgba(18, 26, 51, 0.92);
  border-right: 1px solid var(--ui-border);
}

.ui-right-panel {
  border-right: none;
  border-left: 1px solid var(--ui-border);
}

.ui-sidebar,
.ui-main,
.ui-right-panel {
  min-width: 0;
}

.ui-sidebar {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ui-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ui-topbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: end;
  padding: 18px 20px;
  border-bottom: 1px solid var(--ui-border);
  background: rgba(18, 26, 51, 0.7);
}

.ui-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 58px;
  gap: 16px;
  min-height: 0;
  flex: 1;
}

.ui-screen {
  min-height: 0;
  overflow: auto;
  padding: 20px;
}

.ui-rail {
  border-left: 1px solid var(--ui-border);
  padding: 16px 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  background: rgba(18, 26, 51, 0.58);
}

.ui-card,
.ui-panel {
  border: 1px solid var(--ui-border);
  background: linear-gradient(180deg, rgba(30, 42, 58, 0.86), rgba(18, 26, 51, 0.92));
  border-radius: var(--ui-radius-card);
  box-shadow: var(--ui-shadow-glow);
}

.ui-panel {
  padding: 16px;
}

.ui-card {
  padding: 14px;
}

.ui-title-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ui-eyebrow {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ui-text-muted);
}

.ui-title {
  margin: 0;
  font-size: 18px;
  font-weight: 650;
}

.ui-subtitle {
  margin: 0;
  color: var(--ui-text-secondary);
  font-size: 13px;
}

.ui-grid {
  display: grid;
  gap: 12px;
}

.ui-grid.metrics {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.ui-nav-list,
.ui-session-list,
.ui-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ui-nav-button,
.ui-session-button,
.ui-rail-button,
.ui-action-button {
  border: 1px solid var(--ui-border);
  background: rgba(21, 33, 63, 0.74);
  color: var(--ui-text-primary);
  border-radius: 14px;
  cursor: pointer;
  transition: border-color 120ms ease, transform 120ms ease, background 120ms ease;
}

.ui-nav-button:hover,
.ui-session-button:hover,
.ui-rail-button:hover,
.ui-action-button:hover,
.ui-action-button.primary:hover {
  border-color: var(--ui-border-strong);
  transform: translateY(-1px);
}

.ui-nav-button.active,
.ui-session-button.active,
.ui-rail-button.active {
  background: linear-gradient(135deg, rgba(0, 164, 255, 0.18), rgba(28, 63, 153, 0.36));
  border-color: rgba(0, 164, 255, 0.45);
}

.ui-nav-button,
.ui-session-button {
  padding: 12px 14px;
  text-align: left;
}

.ui-session-button .title,
.ui-nav-button .title {
  display: block;
  font-size: 13px;
  font-weight: 600;
}

.ui-session-button .meta,
.ui-nav-button .meta {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: var(--ui-text-muted);
}

.ui-form-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.ui-field {
  display: grid;
  gap: 8px;
}

.ui-field label {
  font-size: 12px;
  color: var(--ui-text-secondary);
}

.ui-select,
.ui-input,
.ui-textarea {
  width: 100%;
  border-radius: 14px;
  border: 1px solid var(--ui-border);
  background: rgba(11, 16, 32, 0.75);
  color: var(--ui-text-primary);
  padding: 12px 14px;
}

.ui-textarea {
  min-height: 140px;
  resize: vertical;
}

.ui-composer {
  display: grid;
  gap: 12px;
}

.ui-composer-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.ui-action-button {
  padding: 10px 14px;
}

.ui-action-button.primary {
  background: linear-gradient(135deg, var(--ui-ai-gradient-start), var(--ui-ai-gradient-end));
  border-color: transparent;
  color: white;
}

.ui-action-button.secondary {
  background: rgba(21, 33, 63, 0.72);
}

.ui-action-button[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}

.ui-chat-thread {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ui-message {
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid var(--ui-border);
  max-width: min(92%, 860px);
  line-height: 1.55;
  white-space: pre-wrap;
}

.ui-message.user {
  align-self: flex-end;
  background: linear-gradient(135deg, rgba(0, 164, 255, 0.18), rgba(28, 63, 153, 0.36));
}

.ui-message.assistant {
  align-self: flex-start;
  background: rgba(18, 26, 51, 0.82);
}

.ui-message.system {
  align-self: center;
  background: rgba(255, 200, 87, 0.10);
  border-color: rgba(255, 200, 87, 0.18);
  color: var(--ui-text-secondary);
}

.ui-message-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.ui-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: var(--ui-radius-pill);
  padding: 5px 10px;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border: 1px solid var(--ui-border);
  color: var(--ui-text-secondary);
}

.ui-badge.success { color: var(--ui-success); }
.ui-badge.warning { color: var(--ui-warning); }
.ui-badge.error { color: var(--ui-error); }
.ui-badge.info { color: var(--ui-interactive-primary); }

.ui-kv {
  display: grid;
  grid-template-columns: minmax(0, 110px) minmax(0, 1fr);
  gap: 8px 12px;
  font-size: 13px;
}

.ui-kv dt {
  color: var(--ui-text-muted);
}

.ui-kv dd {
  margin: 0;
  color: var(--ui-text-primary);
  word-break: break-word;
}

.ui-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.ui-table th,
.ui-table td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--ui-border);
  text-align: left;
  vertical-align: top;
}

.ui-table th {
  color: var(--ui-text-muted);
  font-weight: 600;
}

.ui-empty {
  padding: 18px;
  text-align: center;
  border: 1px dashed var(--ui-border);
  border-radius: 14px;
  color: var(--ui-text-muted);
}

.ui-right-panel {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: auto;
}

.ui-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ui-code {
  font-family: var(--ui-font-mono);
  font-size: 12px;
}

.ui-note {
  font-size: 12px;
  color: var(--ui-text-muted);
}

@media (max-width: 1280px) {
  .ui-app {
    grid-template-columns: 250px minmax(0, 1fr);
  }

  .ui-right-panel {
    display: none;
  }
}

@media (max-width: 900px) {
  body {
    padding: 12px;
  }

  .ui-app {
    grid-template-columns: 1fr;
  }

  .ui-sidebar {
    display: none;
  }

  .ui-main-grid {
    grid-template-columns: 1fr;
  }

  .ui-rail {
    display: none;
  }

  .ui-form-grid,
  .ui-grid.metrics {
    grid-template-columns: 1fr;
  }
}
`;
};
