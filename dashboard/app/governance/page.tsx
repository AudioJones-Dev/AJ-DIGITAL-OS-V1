import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

interface PolicyFile {
  fileName: string;
  policy: string;
  version: string;
  description: string;
  rules: Record<string, unknown>;
}

interface ApprovalRecord {
  approvalId: string;
  requestedByAgentId: string;
  permissionLevel: number;
  actionCategory: string;
  risk: string;
  target?: string | null;
  environment: string;
  status: string;
  requestedAt: string;
  expiresAt: string;
}

interface AuditEvent {
  auditId: string;
  timestamp: string;
  agentId: string;
  permissionLevel: number;
  category: string;
  decision: string;
  risk: string;
  reason: string;
}

const DECISION_COLORS: Record<string, string> = {
  allow: "bg-emerald-900 text-emerald-300",
  block: "bg-red-900 text-red-300",
  require_approval: "bg-yellow-900 text-yellow-300",
  pending: "bg-yellow-900 text-yellow-300",
  approved: "bg-emerald-900 text-emerald-300",
  denied: "bg-red-900 text-red-300",
  expired: "bg-zinc-800 text-zinc-400",
};

const RISK_COLORS: Record<string, string> = {
  low: "bg-zinc-800 text-zinc-300",
  medium: "bg-blue-900 text-blue-300",
  high: "bg-orange-900 text-orange-300",
  critical: "bg-red-900 text-red-300",
};

async function findRepoRoot(): Promise<string> {
  const candidates = [process.cwd(), path.resolve(process.cwd(), "..")];
  for (const candidate of candidates) {
    try {
      const runtime = await stat(path.join(candidate, "runtime"));
      const data = await stat(path.join(candidate, "data"));
      if (runtime.isDirectory() && data.isDirectory()) return candidate;
    } catch {
      // Try the next likely root.
    }
  }
  return path.resolve(process.cwd(), "..");
}

async function readPolicies(root: string): Promise<PolicyFile[]> {
  const dir = path.join(root, "runtime", "policies");
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));

    return Promise.all(
      files.map(async (fileName) => {
        const raw = await readFile(path.join(dir, fileName), "utf-8");
        const parsed = JSON.parse(raw) as Omit<PolicyFile, "fileName">;
        return { ...parsed, fileName };
      }),
    );
  } catch {
    return [];
  }
}

async function readApprovals(root: string): Promise<ApprovalRecord[]> {
  try {
    const raw = await readFile(path.join(root, "data", "security", "approvals.json"), "utf-8");
    const parsed = JSON.parse(raw) as Record<string, ApprovalRecord>;
    return Object.values(parsed).sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));
  } catch {
    return [];
  }
}

async function readAuditEvents(root: string): Promise<AuditEvent[]> {
  try {
    const raw = await readFile(path.join(root, "data", "security", "audit-log.jsonl"), "utf-8");
    return raw
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AuditEvent)
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
  } catch {
    return [];
  }
}

function Badge({ value, tone = "decision" }: { value: string; tone?: "decision" | "risk" }) {
  const colors = tone === "risk" ? RISK_COLORS : DECISION_COLORS;
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${colors[value] ?? "bg-zinc-800 text-zinc-400"}`}>
      {value}
    </span>
  );
}

function countRules(rules: Record<string, unknown>): number {
  return Object.values(rules).reduce<number>((sum, value) => {
    if (Array.isArray(value)) return sum + value.length;
    if (value && typeof value === "object") return sum + Object.keys(value).length;
    return sum + 1;
  }, 0);
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export default async function GovernancePage() {
  const root = await findRepoRoot();
  const [policies, approvals, auditEvents] = await Promise.all([
    readPolicies(root),
    readApprovals(root),
    readAuditEvents(root),
  ]);

  const approvalGatePolicy = policies.find((policy) => policy.policy === "approval-gates");
  const actionRiskPolicy = policies.find((policy) => policy.policy === "action-risk");
  const environmentPolicy = policies.find((policy) => policy.policy === "environment");
  const retrievalPolicy = policies.find((policy) => policy.policy === "retrieval-access");
  const pendingApprovals = approvals.filter((approval) => approval.status === "pending").length;
  const blockedEvents = auditEvents.filter((event) => event.decision === "block").length;
  const approvalRequiredActions = getStringArray(approvalGatePolicy?.rules.approvalRequired);
  const actionRisks = getRecord(getRecord(actionRiskPolicy?.rules).actions);
  const restrictedByEnv = getRecord(getRecord(environmentPolicy?.rules).restrictedActions);
  const retrievalNamespaces = getRecord(getRecord(retrievalPolicy?.rules).namespaces);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Governance</h1>
        <p className="text-zinc-500 text-sm mt-1">Policy files, approval gates, tenant boundaries, and security audit posture.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Policy Files</p>
          <p className="text-2xl font-bold text-zinc-100 mt-1">{policies.length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Approval Gates</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">{approvalRequiredActions.length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Pending Approvals</p>
          <p className="text-2xl font-bold text-indigo-400 mt-1">{pendingApprovals}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Blocked Events</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{blockedEvents}</p>
        </div>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">Policy Registry</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/50 border-b border-zinc-800">
              <tr>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Policy</th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Version</th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Rules</th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Description</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((policy) => (
                <tr key={policy.fileName} className="border-t border-zinc-800/50 hover:bg-zinc-800/20">
                  <td className="px-4 py-2">
                    <p className="text-zinc-200">{policy.policy}</p>
                    <p className="text-xs text-zinc-600 font-mono">{policy.fileName}</p>
                  </td>
                  <td className="px-4 py-2 text-zinc-400 text-xs">{policy.version}</td>
                  <td className="px-4 py-2 text-zinc-400 text-xs">{countRules(policy.rules)}</td>
                  <td className="px-4 py-2 text-zinc-500 text-xs">{policy.description}</td>
                </tr>
              ))}
              {policies.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-sm text-zinc-600">No policies found in runtime/policies.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-4">
        <section className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-300">Approval Required</h2>
          </div>
          <div className="divide-y divide-zinc-800/70">
            {approvalRequiredActions.length === 0 ? (
              <p className="px-4 py-3 text-sm text-zinc-600">No approval actions configured.</p>
            ) : approvalRequiredActions.map((action) => (
              <div key={action} className="px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-sm text-zinc-300 font-mono">{action}</span>
                <Badge value={String(actionRisks[action] ?? "medium")} tone="risk" />
              </div>
            ))}
          </div>
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-300">Environment Restrictions</h2>
          </div>
          <div className="divide-y divide-zinc-800/70">
            {Object.entries(restrictedByEnv).map(([env, actions]) => (
              <div key={env} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-zinc-300">{env}</span>
                  <span className="text-xs text-zinc-500">{getStringArray(actions).length} restricted</span>
                </div>
                <p className="text-xs text-zinc-600 mt-1">{getStringArray(actions).join(", ") || "none"}</p>
              </div>
            ))}
            {Object.keys(restrictedByEnv).length === 0 && (
              <p className="px-4 py-3 text-sm text-zinc-600">No environment restrictions configured.</p>
            )}
          </div>
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-300">Retrieval Namespaces</h2>
          </div>
          <div className="divide-y divide-zinc-800/70">
            {Object.entries(retrievalNamespaces).map(([namespace, risk]) => (
              <div key={namespace} className="px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-sm text-zinc-300">{namespace}</span>
                <Badge value={String(risk)} tone="risk" />
              </div>
            ))}
            {Object.keys(retrievalNamespaces).length === 0 && (
              <p className="px-4 py-3 text-sm text-zinc-600">No retrieval namespace policy configured.</p>
            )}
          </div>
        </section>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">Recent Approval Requests</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/50 border-b border-zinc-800">
              <tr>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Requested</th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Agent</th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Category</th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Risk</th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Status</th>
              </tr>
            </thead>
            <tbody>
              {approvals.slice(0, 10).map((approval) => (
                <tr key={approval.approvalId} className="border-t border-zinc-800/50 hover:bg-zinc-800/20">
                  <td className="px-4 py-2 text-zinc-500 text-xs">{approval.requestedAt}</td>
                  <td className="px-4 py-2 text-zinc-300 text-xs font-mono">{approval.requestedByAgentId}</td>
                  <td className="px-4 py-2 text-zinc-400 text-xs">{approval.actionCategory}</td>
                  <td className="px-4 py-2"><Badge value={approval.risk} tone="risk" /></td>
                  <td className="px-4 py-2"><Badge value={approval.status} /></td>
                </tr>
              ))}
              {approvals.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-sm text-zinc-600">No approval records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">Security Audit</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/50 border-b border-zinc-800">
              <tr>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Time</th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Agent</th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Category</th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Decision</th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Reason</th>
              </tr>
            </thead>
            <tbody>
              {auditEvents.slice(0, 12).map((event) => (
                <tr key={event.auditId} className="border-t border-zinc-800/50 hover:bg-zinc-800/20">
                  <td className="px-4 py-2 text-zinc-500 text-xs">{event.timestamp}</td>
                  <td className="px-4 py-2 text-zinc-300 text-xs font-mono">{event.agentId}</td>
                  <td className="px-4 py-2 text-zinc-400 text-xs">{event.category}</td>
                  <td className="px-4 py-2"><Badge value={event.decision} /></td>
                  <td className="px-4 py-2 text-zinc-500 text-xs">{event.reason}</td>
                </tr>
              ))}
              {auditEvents.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-sm text-zinc-600">No security audit events found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
