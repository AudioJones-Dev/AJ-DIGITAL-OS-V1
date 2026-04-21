export const buildWebShellClientScript = (): string => {
  return String.raw`
const state = {
  bootstrap: null,
  currentView: "chat",
  selectedSessionId: null,
  selectedThreadId: null,
  selectedBrandId: "",
  selectedAgentId: "runtime-default",
  selectedMode: "advisory",
  liveMessages: [],
  lastRun: null,
};

const NAV_ITEMS = [
  { id: "chat", title: "Assistant Chat", meta: "History-backed local chat shell" },
  { id: "deliverables", title: "Deliverables", meta: "Brand-aware output registry" },
  { id: "integrations", title: "Integrations", meta: "Read-only profile registry views" },
  { id: "models", title: "Model Profiles", meta: "Base and fine-tune reference scaffold" },
  { id: "tools", title: "Tool Registry", meta: "Native and MCP-ready tool catalog" },
];

const byId = (id) => document.getElementById(id);

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }
  return payload;
}

async function loadBootstrap() {
  const payload = await fetchJson("/api/bootstrap");
  state.bootstrap = payload;
  if (!state.selectedBrandId) {
    state.selectedBrandId = payload.defaultBrandId || "";
  }
  if (!state.selectedAgentId) {
    state.selectedAgentId = payload.defaultAgentId || "runtime-default";
  }
  if (!state.selectedThreadId && (payload.conversationThreads || []).length > 0) {
    state.selectedThreadId = payload.conversationThreads[0].threadId;
  }
  renderAll();
}

function renderAll() {
  renderNavigation();
  renderSelectors();
  renderMetrics();
  renderCurrentView();
  renderSessions();
  renderBrandPanel();
  renderRightPanels();
  renderWorkspaceHeader();
}

function renderNavigation() {
  const container = byId("nav-views");
  if (!container) return;

  container.innerHTML = NAV_ITEMS.map((item) => {
    const active = item.id === state.currentView ? "active" : "";
    return '<button class="ui-nav-button ' + active + '" data-view="' + item.id + '">'
      + '<span class="title">' + escapeHtml(item.title) + '</span>'
      + '<span class="meta">' + escapeHtml(item.meta) + '</span>'
      + '</button>';
  }).join("");

  container.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentView = button.getAttribute("data-view") || "chat";
      renderAll();
    });
  });

  document.querySelectorAll("[data-view-button]").forEach((button) => {
    const active = button.getAttribute("data-view-button") === state.currentView;
    button.classList.toggle("active", active);
    button.onclick = () => {
      state.currentView = button.getAttribute("data-view-button") || "chat";
      renderAll();
    };
  });
}

function renderSelectors() {
  const brandSelect = byId("brand-select");
  const agentSelect = byId("agent-select");
  const modeSelect = byId("mode-select");
  if (!state.bootstrap || !brandSelect || !agentSelect || !modeSelect) return;

  brandSelect.innerHTML = ['<option value="">Default / none</option>'].concat(
    (state.bootstrap.brands || []).map((brand) => '<option value="' + escapeAttribute(brand.brandId) + '">' + escapeHtml(brand.displayName) + '</option>')
  ).join("");
  brandSelect.value = state.selectedBrandId || "";
  brandSelect.onchange = () => {
    state.selectedBrandId = brandSelect.value;
    renderBrandPanel();
    renderRightPanels();
    if (state.currentView !== "chat") {
      renderCurrentView();
    }
  };

  agentSelect.innerHTML = (state.bootstrap.agentOptions || []).map((agent) => {
    const disabled = agent.enabled ? "" : " disabled";
    return '<option value="' + escapeAttribute(agent.id) + '"' + disabled + '>' + escapeHtml(agent.label) + '</option>';
  }).join("");
  agentSelect.value = state.selectedAgentId || state.bootstrap.defaultAgentId || "runtime-default";
  agentSelect.onchange = () => {
    state.selectedAgentId = agentSelect.value;
    renderWorkspaceHeader();
  };

  modeSelect.value = state.selectedMode;
  modeSelect.onchange = () => {
    state.selectedMode = modeSelect.value;
    renderWorkspaceHeader();
  };
}

function renderMetrics() {
  if (!state.bootstrap) return;
  setText("metric-history-count", String((state.bootstrap.history || []).length));
  setText("metric-deliverable-count", String((state.bootstrap.deliverables || []).length));
  setText("metric-brand-count", String((state.bootstrap.brands || []).length));
}

function renderWorkspaceHeader() {
  if (!state.bootstrap) return;
  const agent = (state.bootstrap.agentOptions || []).find((item) => item.id === state.selectedAgentId);
  const brand = (state.bootstrap.brands || []).find((item) => item.brandId === state.selectedBrandId);
  setText("workspace-title", state.currentView === "chat" ? "Local Assistant Chat" : (NAV_ITEMS.find((item) => item.id === state.currentView)?.title || "Assistant Control Surface"));
  setText(
    "workspace-subtitle",
    state.currentView === "chat"
      ? ((brand ? brand.displayName : "Default brand context") + " • " + (agent ? agent.label : "Runtime default") + " • " + state.selectedMode)
      : "Local-first AJ Digital OS control plane over existing runtime data."
  );
}

function renderSessions() {
  const container = byId("session-list");
  if (!container || !state.bootstrap) return;
  const sessions = state.bootstrap.history || [];
  if (sessions.length === 0) {
    container.innerHTML = '<div class="ui-empty">No assistant history yet.</div>';
    return;
  }

  container.innerHTML = sessions.slice(0, 12).map((entry) => {
    const active = entry.sessionId === state.selectedSessionId ? "active" : "";
    const route = entry.route ? entry.route.provider + "/" + entry.route.model : "route pending";
    return '<button class="ui-session-button ' + active + '" data-session="' + escapeAttribute(entry.sessionId) + '">'
      + '<span class="title">' + escapeHtml(entry.task || "Untitled session") + '</span>'
      + '<span class="meta">' + escapeHtml(entry.mode + " • " + entry.status + " • " + route) + '</span>'
      + '</button>';
  }).join("");

  container.querySelectorAll("[data-session]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.selectedSessionId = button.getAttribute("data-session");
      const selected = (state.bootstrap.history || []).find((entry) => entry.sessionId === state.selectedSessionId);
      state.selectedThreadId = selected && selected.conversationThreadId ? selected.conversationThreadId : state.selectedThreadId;
      state.liveMessages = [];
      if (state.selectedThreadId) {
        await hydrateConversationThread(state.selectedThreadId);
      }
      renderCurrentView();
      renderRightPanels();
      renderSessions();
    });
  });
}

function renderCurrentView() {
  const container = byId("main-screen");
  if (!container || !state.bootstrap) return;

  if (state.currentView === "chat") {
    const template = byId("chat-template");
    container.innerHTML = template ? template.innerHTML : "";
    bindChatComposer();
    renderChatThread();
    renderMetrics();
    return;
  }

  if (state.currentView === "deliverables") {
    renderDeliverablesScreen(container, state.bootstrap.deliverables || []);
    return;
  }

  const markup = state.currentView === "integrations"
    ? renderIntegrationTables(state.bootstrap.integrationRegistry)
    : state.currentView === "models"
      ? renderModelProfilesTable(state.bootstrap.integrationRegistry.modelProfiles || [])
      : renderToolRegistryTable(state.bootstrap.toolRegistry);

  container.innerHTML = markup;
}

function renderChatThread() {
  const container = byId("chat-thread");
  if (!container || !state.bootstrap) return;

  const historySession = (state.bootstrap.history || []).find((entry) => entry.sessionId === state.selectedSessionId);
  const selectedThreadId = state.selectedThreadId || historySession?.conversationThreadId || null;
  const messages = state.liveMessages.length > 0
    ? state.liveMessages
    : selectedThreadId
      ? conversationThreadToMessages(
          (state.bootstrap.conversationThreads || []).find((entry) => entry.threadId === selectedThreadId),
        )
      : historySession
        ? historyEntryToMessages(historySession)
      : [{
          role: "system",
          title: "Ready",
          content: "This local web shell runs on top of the existing AJ Digital OS assistant runtime and local file-backed stores.",
        }];

  container.innerHTML = messages.map((message) => {
    const badgeClass = message.role === "assistant" ? "info" : message.role === "user" ? "success" : "warning";
    return '<div class="ui-message ' + escapeAttribute(message.role) + '">'
      + '<div class="ui-message-title"><span class="ui-badge ' + badgeClass + '">' + escapeHtml(message.role) + '</span>'
      + '<strong>' + escapeHtml(message.title) + '</strong></div>'
      + '<div>' + escapeHtml(message.content) + '</div></div>';
  }).join("");
}

function bindChatComposer() {
  const sendButton = byId("send-button");
  const attachButton = byId("attach-button");
  if (sendButton) {
    sendButton.onclick = async () => {
      await sendChatRequest();
    };
  }
  if (attachButton) {
    attachButton.onclick = () => {
      window.alert("File attach is a UI scaffold in this patch and does not execute uploads yet.");
    };
  }
}

async function sendChatRequest() {
  const taskInput = byId("composer-task");
  const sourceInput = byId("composer-source");
  const pathInput = byId("composer-path");
  if (!taskInput) return;

  const task = taskInput.value.trim();
  if (!task) {
    window.alert("Enter a prompt before sending.");
    return;
  }

  state.liveMessages.push({ role: "user", title: "Prompt", content: task });
  renderChatThread();

  const selectedAgent = state.bootstrap
    ? (state.bootstrap.agentOptions || []).find((item) => item.id === state.selectedAgentId)
    : null;

  const payload = {
    task,
    executionMode: state.selectedMode,
    ...(state.selectedBrandId ? { brandId: state.selectedBrandId } : {}),
    ...(sourceInput && sourceInput.value.trim() ? { sourceText: sourceInput.value.trim() } : {}),
    ...(selectedAgent?.source === "model-profile" ? { modelProfileId: selectedAgent.id } : {}),
    ...(selectedAgent && selectedAgent.source !== "model-profile" ? { agentProfileId: selectedAgent.id } : {}),
    ...(state.selectedThreadId ? { conversationThreadId: state.selectedThreadId } : {}),
    ...(pathInput && pathInput.value.trim() ? { localPathHint: pathInput.value.trim() } : {}),
  };

  try {
    const response = await fetchJson("/api/assistant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    state.lastRun = response;
    state.selectedSessionId = response.session ? response.session.sessionId : state.selectedSessionId;
    state.selectedThreadId = response.assistant.conversation?.threadId || state.selectedThreadId;
    state.liveMessages.push({
      role: "assistant",
      title: response.assistant.advisory?.summary || response.assistant.task || "Assistant",
      content: buildAssistantMessage(response.assistant),
    });

    taskInput.value = "";
    if (sourceInput) sourceInput.value = "";
    renderChatThread();
    await loadBootstrap();
    if (state.selectedThreadId) {
      await hydrateConversationThread(state.selectedThreadId);
    }
  } catch (error) {
    state.liveMessages.push({
      role: "assistant",
      title: "Runtime Error",
      content: error instanceof Error ? error.message : "Unknown UI request failure.",
    });
    renderChatThread();
  }
}

async function hydrateConversationThread(threadId) {
  const payload = await fetchJson("/api/conversation-thread?threadId=" + encodeURIComponent(threadId));
  if (!state.bootstrap || !payload.ok || !payload.thread) {
    return;
  }

  const existing = (state.bootstrap.conversationThreads || []).filter((entry) => entry.threadId !== payload.thread.threadId);
  state.bootstrap.conversationThreads = [payload.thread].concat(existing);
  state.liveMessages = (payload.turns || []).map((turn) => ({
    role: turn.role === "system" ? "system" : turn.role,
    title: turn.role === "user" ? "Prompt" : turn.role === "assistant" ? "Assistant" : "System",
    content: turn.content,
  }));
}

function renderBrandPanel() {
  const container = byId("brand-context-panel");
  if (!container || !state.bootstrap) return;
  const brand = (state.bootstrap.brands || []).find((item) => item.brandId === state.selectedBrandId)
    || (state.bootstrap.defaultBrandId ? (state.bootstrap.brands || []).find((item) => item.brandId === state.bootstrap.defaultBrandId) : null);

  if (!brand) {
    container.innerHTML = '<div class="ui-empty">No local brand manifest is currently available.</div>';
    return;
  }

  container.innerHTML = '<dl class="ui-kv">'
    + '<dt>Brand</dt><dd>' + escapeHtml(brand.displayName) + '</dd>'
    + '<dt>ID</dt><dd class="ui-code">' + escapeHtml(brand.brandId) + '</dd>'
    + '<dt>Client</dt><dd>' + escapeHtml(brand.clientId) + '</dd>'
    + '<dt>Default</dt><dd>' + (brand.defaultBrand ? "yes" : "no") + '</dd>'
    + '<dt>Tone</dt><dd>' + escapeHtml((brand.voice?.tone || []).join(", ") || "-") + '</dd>'
    + '<dt>Rules</dt><dd>' + escapeHtml((brand.contentRules?.reviewChecklist || []).slice(0, 3).join(" | ") || "-") + '</dd>'
    + '</dl>';
}

function renderRightPanels() {
  renderRunMetadata();
  renderMemoryPanel();
  renderDeliverableSidePanel();
  renderIssuesPanel();
}

function renderMemoryPanel() {
  const container = byId("memory-panel");
  if (!container || !state.bootstrap) return;
  const semanticMemory = state.lastRun?.assistant?.semanticMemory;

  if (!semanticMemory) {
    container.innerHTML = '<div class="ui-stack">'
      + '<div class="ui-note">No semantic retrieval was used in the selected run yet.</div>'
      + '<div class="ui-note">Indexed chunks: ' + escapeHtml(String(state.bootstrap.memoryStats.totalChunks)) + '</div>'
      + '</div>';
    return;
  }

  container.innerHTML = '<div class="ui-stack">'
    + '<div class="ui-note">Query: ' + escapeHtml(semanticMemory.query) + '</div>'
    + '<div class="ui-note">Selected: ' + escapeHtml(String(semanticMemory.selectedCount)) + ' / ' + escapeHtml(String(semanticMemory.resultCount)) + '</div>'
    + semanticMemory.sources.map((source) => '<div class="ui-card">'
      + '<div class="ui-message-title"><span class="ui-badge info">memory</span><strong>' + escapeHtml(source.label) + '</strong></div>'
      + '<div class="ui-note">' + escapeHtml((source.sourceType || "-") + (source.score !== undefined ? " • " + source.score.toFixed(3) : "")) + '</div>'
      + '</div>').join("")
    + '</div>';
}

function renderRunMetadata() {
  const container = byId("run-metadata-panel");
  if (!container || !state.bootstrap) return;
  const selectedSession = (state.bootstrap.history || []).find((entry) => entry.sessionId === state.selectedSessionId);
  const lastRun = state.lastRun;
  if (!selectedSession && !lastRun) {
    container.innerHTML = '<div class="ui-empty">Select a session or run a prompt to inspect execution metadata.</div>';
    return;
  }

  const session = selectedSession || lastRun?.session;
  const assistant = lastRun?.assistant;
  container.innerHTML = '<dl class="ui-kv">'
    + '<dt>Source</dt><dd>' + escapeHtml(session?.sourceCommand || "assistant-ui") + '</dd>'
    + '<dt>Status</dt><dd>' + escapeHtml(session?.status || (assistant?.ok ? "succeeded" : "failed") || "-") + '</dd>'
    + '<dt>Mode</dt><dd>' + escapeHtml(session?.mode || assistant?.mode || "-") + '</dd>'
    + '<dt>Thread</dt><dd class="ui-code">' + escapeHtml(session?.conversationThreadId || assistant?.conversation?.threadId || "-") + '</dd>'
    + '<dt>Route</dt><dd>' + escapeHtml(session?.route ? session.route.provider + "/" + session.route.model : (assistant ? assistant.route.provider + "/" + assistant.route.model : "-")) + '</dd>'
    + '<dt>Run ID</dt><dd class="ui-code">' + escapeHtml(session?.runId || assistant?.orchestration?.runId || "-") + '</dd>'
    + '<dt>Workflow</dt><dd>' + escapeHtml(assistant?.workflowMatch?.workflowId || session?.selectedWorkflowId || "-") + '</dd>'
    + '</dl>';
}

function renderDeliverableSidePanel() {
  const container = byId("deliverables-side-panel");
  if (!container || !state.bootstrap) return;
  const deliverables = filterDeliverablesByBrand(state.bootstrap.deliverables || []);
  if (deliverables.length === 0) {
    container.innerHTML = '<div class="ui-empty">No deliverables recorded for the selected brand context yet.</div>';
    return;
  }

  const pending = deliverables.filter((entry) => entry.status === "pending_approval");
  container.innerHTML = ""
    + (pending.length > 0
      ? '<div class="ui-stack"><div class="ui-eyebrow">Pending Queue</div>'
        + pending.slice(0, 3).map((entry) => '<div class="ui-card">'
          + '<div class="ui-message-title"><span class="ui-badge warning">' + escapeHtml(entry.status) + '</span><strong>' + escapeHtml(entry.title) + '</strong></div>'
          + '<div class="ui-note">' + escapeHtml(entry.deliverableId) + '</div>'
          + renderDeliverableActionButtons(entry)
          + '</div>').join("")
        + '</div>'
      : "")
    + deliverables.slice(0, 5).map((entry) => {
    return '<div class="ui-card">'
      + '<div class="ui-message-title"><span class="ui-badge ' + escapeAttribute(getStatusBadgeClass(entry.status)) + '">' + escapeHtml(entry.status) + '</span><strong>' + escapeHtml(entry.title) + '</strong></div>'
      + '<div class="ui-note">' + escapeHtml(entry.workflowId + " • " + (entry.outputPath || "no file path")) + '</div>'
      + renderDeliverableActionButtons(entry)
      + '</div>';
  }).join("");
  bindDeliverableActionButtons(container);
}

function renderIssuesPanel() {
  const container = byId("issues-panel");
  if (!container || !state.bootstrap) return;
  const assistant = state.lastRun?.assistant;
  const selectedSession = (state.bootstrap.history || []).find((entry) => entry.sessionId === state.selectedSessionId);
  const warnings = assistant?.warnings || selectedSession?.warnings || [];
  const errors = assistant?.errors || selectedSession?.errors || [];

  if (warnings.length === 0 && errors.length === 0) {
    container.innerHTML = '<div class="ui-empty">No active warnings or errors.</div>';
    return;
  }

  container.innerHTML = ''
    + (warnings.length ? '<div class="ui-stack"><div class="ui-eyebrow">Warnings</div>' + warnings.map((entry) => '<div class="ui-card ui-note">' + escapeHtml(entry) + '</div>').join("") + '</div>' : '')
    + (errors.length ? '<div class="ui-stack"><div class="ui-eyebrow">Errors</div>' + errors.map((entry) => '<div class="ui-card ui-note" style="color:var(--ui-error);">' + escapeHtml(entry) + '</div>').join("") + '</div>' : '');
}

function renderDeliverablesScreen(container, entries) {
  const filtered = filterDeliverablesByBrand(entries);
  const pending = filtered.filter((entry) => entry.status === "pending_approval");
  container.innerHTML = '<div class="ui-stack">'
    + '<section class="ui-panel"><div class="ui-eyebrow">Lifecycle Queue</div><h3 class="ui-title" style="font-size:16px; margin-bottom:12px;">Pending Approval</h3>'
    + (pending.length === 0
      ? '<div class="ui-empty">No deliverables are waiting for approval.</div>'
      : pending.map((entry) => renderDeliverableRow(entry)).join(""))
    + '</section>'
    + '<section class="ui-panel"><div class="ui-eyebrow">Registry</div><h3 class="ui-title" style="font-size:16px; margin-bottom:12px;">Deliverables</h3>'
    + (filtered.length === 0
      ? '<div class="ui-empty">No local records found.</div>'
      : filtered.map((entry) => renderDeliverableRow(entry)).join(""))
    + '</section></div>';
  bindDeliverableActionButtons(container);
}

function renderIntegrationTables(registry) {
  const integrationRows = (registry.integrationProfiles || []).filter((entry) => !state.selectedBrandId || entry.brandIds.includes(state.selectedBrandId));
  const providerRows = (registry.providerProfiles || []).filter((entry) => !state.selectedBrandId || entry.brandIds.includes(state.selectedBrandId));
  return renderCompositeScreen("Integration Profiles", [
    renderTablePanel("Provider Profiles", ["Name", "Kind", "Enabled", "Scopes"], providerRows.map((entry) => [entry.displayName, entry.kind, String(entry.enabled), entry.defaultScopes.join(", ") || "-"])),
    renderTablePanel("Integration Profiles", ["Name", "Enabled", "Provider", "Capabilities"], integrationRows.map((entry) => [entry.displayName, String(entry.enabled), entry.providerProfileId, entry.capabilities.join(", ") || "-"])),
  ]);
}

function renderModelProfilesTable(entries) {
  const filtered = entries.filter((entry) => !state.selectedBrandId || entry.brandIds.includes(state.selectedBrandId));
  return renderTableScreen(
    "Model Profiles",
    "Read-only local model and fine-tune reference profiles. Chat selection now overrides the runtime route when a model profile is chosen.",
    ["Name", "Provider", "Base", "Fine Tune", "Task Classes"],
    filtered.map((entry) => [entry.displayName, entry.provider, entry.baseModel, entry.fineTuneReference || "-", entry.taskUsageClasses.join(", ") || "-"])
  );
}

function renderToolRegistryTable(snapshot) {
  return renderCompositeScreen("Tool Registry", [
    renderTablePanel("Providers", ["Name", "Kind", "Transport", "Status"], (snapshot.providers || []).map((entry) => [entry.displayName, entry.kind, entry.transport, entry.status])),
    renderTablePanel("Capabilities", ["Name", "Domain", "Network", "Secret Ref"], (snapshot.capabilities || []).map((entry) => [entry.displayName, entry.domain, String(entry.requiresNetwork), String(entry.requiresSecretReference)])),
    renderTablePanel("MCP Adapters", ["Name", "Provider", "Transport", "Enabled"], (snapshot.mcpAdapters || []).map((entry) => [entry.displayName, entry.providerId, entry.transport, String(entry.enabled)])),
  ]);
}

function renderCompositeScreen(title, sections) {
  return '<div class="ui-stack"><div class="ui-title-block"><div class="ui-eyebrow">Read Only</div><h2 class="ui-title">' + escapeHtml(title) + '</h2></div>' + sections.join("") + '</div>';
}

function renderTableScreen(title, subtitle, headings, rows) {
  return renderCompositeScreen(title, [renderTablePanel(subtitle, headings, rows)]);
}

function renderTablePanel(title, headings, rows) {
  const body = rows.length === 0
    ? '<div class="ui-empty">No local records found.</div>'
    : '<table class="ui-table"><thead><tr>' + headings.map((heading) => '<th>' + escapeHtml(heading) + '</th>').join("") + '</tr></thead><tbody>'
      + rows.map((row) => '<tr>' + row.map((cell) => '<td>' + escapeHtml(String(cell)) + '</td>').join("") + '</tr>').join("")
      + '</tbody></table>';
  return '<section class="ui-panel"><div class="ui-eyebrow">Dataset</div><h3 class="ui-title" style="font-size:16px; margin-bottom:12px;">' + escapeHtml(title) + '</h3>' + body + '</section>';
}

function renderDeliverableRow(entry) {
  return '<div class="ui-card" style="margin-bottom:12px;">'
    + '<div class="ui-message-title"><span class="ui-badge ' + escapeAttribute(getStatusBadgeClass(entry.status)) + '">' + escapeHtml(entry.status) + '</span><strong>' + escapeHtml(entry.title) + '</strong></div>'
    + '<div class="ui-note">' + escapeHtml((entry.brandName || entry.brandId || "-") + " • " + entry.deliverableType + " • " + entry.workflowId) + '</div>'
    + '<div class="ui-note">' + escapeHtml(entry.outputPath || "No file path yet.") + '</div>'
    + renderDeliverableActionButtons(entry)
    + '</div>';
}

function renderDeliverableActionButtons(entry) {
  const actions = getDeliverableActionList(entry.status);
  if (actions.length === 0) {
    return "";
  }

  return '<div class="ui-message-title" style="margin-top:12px;">'
    + actions.map((action) => '<button class="ui-nav-button" data-deliverable-action="' + escapeAttribute(action.endpoint) + '" data-deliverable-id="' + escapeAttribute(entry.deliverableId) + '" style="padding:10px 12px; min-width:0;">'
      + '<span class="title">' + escapeHtml(action.label) + '</span>'
      + '<span class="meta">' + escapeHtml(action.meta) + '</span>'
      + '</button>').join("")
    + '</div>';
}

function getDeliverableActionList(status) {
  switch (status) {
    case "draft":
      return [{ endpoint: "submit", label: "Submit", meta: "Move to pending approval" }];
    case "pending_approval":
      return [{ endpoint: "approve", label: "Approve", meta: "Move to approved" }];
    case "approved":
      return [{ endpoint: "publish", label: "Publish", meta: "Move to published" }];
    default:
      return [];
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case "approved":
    case "published":
      return "success";
    case "pending_approval":
      return "warning";
    case "failed":
      return "warning";
    default:
      return "info";
  }
}

function bindDeliverableActionButtons(container) {
  container.querySelectorAll("[data-deliverable-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      await performDeliverableAction(
        button.getAttribute("data-deliverable-action"),
        button.getAttribute("data-deliverable-id"),
      );
    });
  });
}

async function performDeliverableAction(action, deliverableId) {
  if (!action || !deliverableId) {
    return;
  }

  const response = await fetchJson("/api/deliverables/" + encodeURIComponent(action), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deliverableId, actor: "ui-operator" }),
  });

  if (!response.ok) {
    window.alert((response.errors || []).join("\n") || "Deliverable action failed.");
    return;
  }

  await loadBootstrap();
  renderCurrentView();
  renderRightPanels();
}

function historyEntryToMessages(entry) {
  const assistantText = entry.ok
    ? "This session was loaded from assistant history. If a linked conversation thread exists, the UI can load persisted turns from local conversation storage."
    : (entry.errors || []).join("\n") || "Session failed without a stored response body.";
  return [
    { role: "user", title: "Task", content: entry.task || "(empty task)" },
    { role: "assistant", title: entry.status, content: assistantText },
  ];
}

function conversationThreadToMessages(thread) {
  if (!thread) {
    return [{
      role: "system",
      title: "Thread",
      content: "Conversation thread metadata is available, but recent turns have not been loaded yet.",
    }];
  }

  return [{
    role: "system",
    title: thread.title || "Conversation Thread",
    content: "Thread " + thread.threadId + " • turns " + String(thread.turnCount),
  }];
}

function buildAssistantMessage(assistant) {
  if (assistant.advisory) {
    const nextSteps = (assistant.advisory.nextSteps || []).length ? "\n\nNext steps:\n- " + assistant.advisory.nextSteps.join("\n- ") : "";
    const risks = (assistant.advisory.risks || []).length ? "\n\nRisks:\n- " + assistant.advisory.risks.join("\n- ") : "";
    return (assistant.advisory.response || assistant.advisory.summary || "No response returned.") + nextSteps + risks;
  }

  if (assistant.orchestration) {
    return "Run " + assistant.orchestration.runId + " created for workflow " + assistant.orchestration.workflowId
      + ". Approval status: " + assistant.orchestration.approvalStatus + ".";
  }

  return (assistant.errors || []).join("\n") || assistant.task || "Assistant completed without a structured payload.";
}

function filterDeliverablesByBrand(entries) {
  if (!state.selectedBrandId) {
    return entries;
  }
  return entries.filter((entry) => entry.brandId === state.selectedBrandId);
}

function setText(id, value) {
  const element = byId(id);
  if (element) {
    element.textContent = value;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

window.addEventListener("DOMContentLoaded", async () => {
  const refreshButton = byId("refresh-button");
  if (refreshButton) {
    refreshButton.addEventListener("click", async () => {
      await loadBootstrap();
    });
  }

  await loadBootstrap();
  if (state.selectedThreadId) {
    await hydrateConversationThread(state.selectedThreadId);
    renderChatThread();
  }
});
`;
};
