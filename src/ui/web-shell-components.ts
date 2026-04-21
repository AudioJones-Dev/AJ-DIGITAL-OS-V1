const actionButton = (id: string, label: string, variant = "secondary"): string => {
  return `<button id="${id}" class="ui-action-button ${variant}">${label}</button>`;
};

export const AppShell = (input: {
  sidebar: string;
  topBar: string;
  mainContent: string;
  rail: string;
  rightPanel: string;
}): string => {
  return `
<div class="ui-app">
  ${input.sidebar}
  <main class="ui-main">
    ${input.topBar}
    <div class="ui-main-grid">
      <section class="ui-screen" id="main-screen">${input.mainContent}</section>
      ${input.rail}
    </div>
  </main>
  ${input.rightPanel}
</div>
`;
};

export const Sidebar = (): string => {
  return `
<aside class="ui-sidebar">
  <div class="ui-title-block">
    <div class="ui-eyebrow">AJ Digital OS</div>
    <h1 class="ui-title">Assistant Control Surface</h1>
    <p class="ui-subtitle">Local-first operator shell over the current runtime.</p>
  </div>
  <div class="ui-panel">
    <div class="ui-eyebrow">Navigation</div>
    <div class="ui-nav-list" id="nav-views"></div>
  </div>
  <div class="ui-panel" style="flex:1;">
    <div class="ui-eyebrow">Recent Sessions</div>
    <div class="ui-session-list" id="session-list"></div>
  </div>
</aside>
`;
};

export const TopBar = (): string => {
  return `
<header class="ui-topbar">
  <div class="ui-title-block">
    <div class="ui-eyebrow">Workspace</div>
    <h2 class="ui-title" id="workspace-title">Local Assistant Chat</h2>
    <p class="ui-subtitle" id="workspace-subtitle">Brand-aware, local-first, and layered on the current AJ Digital OS runtime.</p>
  </div>
  <div class="ui-form-grid">
    ${BrandSelector()}
    ${AgentModelPicker()}
    ${ModePicker()}
  </div>
</header>
`;
};

export const FloatingActionRail = (): string => {
  return `
<aside class="ui-rail">
  <button class="ui-rail-button active" data-view-button="chat" title="Chat">C</button>
  <button class="ui-rail-button" data-view-button="deliverables" title="Deliverables">D</button>
  <button class="ui-rail-button" data-view-button="integrations" title="Integrations">I</button>
  <button class="ui-rail-button" data-view-button="models" title="Models">M</button>
  <button class="ui-rail-button" data-view-button="tools" title="Tools">T</button>
  <button class="ui-rail-button" id="refresh-button" title="Refresh">R</button>
</aside>
`;
};

export const Panel = (title: string, body: string, eyebrow?: string): string => {
  return `
<section class="ui-panel">
  ${eyebrow ? `<div class="ui-eyebrow">${eyebrow}</div>` : ""}
  <h3 class="ui-title" style="font-size:16px; margin-bottom:12px;">${title}</h3>
  ${body}
</section>
`;
};

export const MetricCard = (id: string, label: string): string => {
  return `
<div class="ui-card">
  <div class="ui-eyebrow">${label}</div>
  <div class="ui-title" id="${id}" style="font-size:24px; margin-top:8px;">-</div>
</div>
`;
};

export const ChatMessages = (): string => {
  return `
<div class="ui-grid metrics">
  ${MetricCard("metric-history-count", "Sessions")}
  ${MetricCard("metric-deliverable-count", "Deliverables")}
  ${MetricCard("metric-brand-count", "Brands")}
</div>
<div class="ui-panel" style="margin-top:16px;">
  <div class="ui-eyebrow">Conversation</div>
  <div class="ui-chat-thread" id="chat-thread">
    <div class="ui-empty">Start a local assistant run to populate the chat thread.</div>
  </div>
</div>
`;
};

export const ChatComposer = (): string => {
  return `
<div class="ui-panel" style="margin-top:16px;">
  <div class="ui-eyebrow">Composer</div>
  <div class="ui-composer">
    <textarea class="ui-textarea" id="composer-task" placeholder="Ask AJ Digital OS to draft a brief, route a workflow, or inspect local state..."></textarea>
    <div class="ui-form-grid" style="grid-template-columns: 1fr 1fr;">
      <div class="ui-field">
        <label for="composer-source">Source text (optional)</label>
        <textarea class="ui-textarea" id="composer-source" placeholder="Paste local transcript or source context."></textarea>
      </div>
      <div class="ui-field">
        <label for="composer-path">Local path hint (scaffold)</label>
        <input class="ui-input ui-code" id="composer-path" placeholder="C:\\path\\to\\local\\file.txt" />
        <div class="ui-note">Local path capture is scaffold-only in this patch and is not read automatically.</div>
      </div>
    </div>
    <div class="ui-composer-actions">
      <div style="display:flex; gap:10px; align-items:center;">
        ${actionButton("attach-button", "Attach File (Scaffold)", "secondary")}
        <span class="ui-note">No live upload execution yet.</span>
      </div>
      ${actionButton("send-button", "Send To Assistant", "primary")}
    </div>
  </div>
</div>
`;
};

export const RunMetadataPanel = (): string => {
  return `
<div class="ui-stack" id="run-metadata-panel">
  <div class="ui-empty">Run metadata, warnings, and files will appear here for the selected chat action.</div>
</div>
`;
};

export const BrandSelector = (): string => {
  return `
<div class="ui-field">
  <label for="brand-select">Brand</label>
  <select class="ui-select" id="brand-select"></select>
</div>
`;
};

export const AgentModelPicker = (): string => {
  return `
<div class="ui-field">
  <label for="agent-select">Agent / Model</label>
  <select class="ui-select" id="agent-select"></select>
</div>
`;
};

export const ModePicker = (): string => {
  return `
<div class="ui-field">
  <label for="mode-select">Mode</label>
  <select class="ui-select" id="mode-select">
    <option value="advisory">Advisory</option>
    <option value="orchestrated">Orchestrated</option>
  </select>
</div>
`;
};

export const RightPanel = (): string => {
  return `
<aside class="ui-right-panel">
  ${Panel("Brand Context", `<div id="brand-context-panel" class="ui-empty">Select a brand to inspect manifest details.</div>`, "Selected Brand")}
  ${Panel("Run Metadata", RunMetadataPanel(), "Execution")}
  ${Panel("Memory", `<div id="memory-panel" class="ui-empty">Semantic memory retrieval will appear here after a run.</div>`, "Context")}
  ${Panel("Deliverables", `<div id="deliverables-side-panel" class="ui-empty">No deliverables selected.</div>`, "Outputs")}
  ${Panel("Warnings / Errors", `<div id="issues-panel" class="ui-empty">No active warnings or errors.</div>`, "Signals")}
</aside>
`;
};
