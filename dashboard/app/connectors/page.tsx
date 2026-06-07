import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

type StatusState = "not_configured" | "configured" | "connecting" | "connected" | "degraded" | "error" | "disabled";

interface ProviderProfile {
  profileId: string;
  providerKey: string;
  displayName: string;
  kind: string;
  enabled: boolean;
  authStrategy: string;
  supportedCapabilities: string[];
  status?: { state?: StatusState; message?: string };
}

interface IntegrationProfile {
  profileId: string;
  integrationKey: string;
  displayName: string;
  providerProfileId: string;
  enabled: boolean;
  connectorIds: string[];
  channelAdapterIds: string[];
  scopes: string[];
  capabilities: string[];
  status: { state: StatusState; message: string };
}

interface ModelProfile {
  profileId: string;
  displayName: string;
  provider: string;
  baseModel: string;
  enabled: boolean;
  taskUsageClasses: string[];
  integrationProfileIds: string[];
}

interface ToolCatalogRecord {
  recordType?: string;
  providerId?: string;
  capabilityId?: string;
  adapterId?: string;
  displayName?: string;
  enabled?: boolean;
  status?: string;
  requiresSecretReference?: boolean;
  scopes?: string[];
  capabilityIds?: string[];
}

const STATUS_COLORS: Record<string, string> = {
  connected: "bg-emerald-900 text-emerald-300",
  configured: "bg-blue-900 text-blue-300",
  connecting: "bg-yellow-900 text-yellow-300",
  degraded: "bg-orange-900 text-orange-300",
  error: "bg-red-900 text-red-300",
  disabled: "bg-zinc-800 text-zinc-400",
  not_configured: "bg-zinc-800 text-zinc-400",
  scaffolded: "bg-indigo-950 text-indigo-300",
  ready: "bg-emerald-900 text-emerald-300",
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

async function readJsonFiles<T>(root: string, relativeDir: string): Promise<T[]> {
  const dir = path.join(root, relativeDir);
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));

    return Promise.all(
      files.map(async (file) => {
        const raw = await readFile(path.join(dir, file), "utf-8");
        return JSON.parse(raw) as T;
      }),
    );
  } catch {
    return [];
  }
}

function statusLabel(enabled?: boolean, state?: string): string {
  if (enabled === false) return "disabled";
  return state ?? "not_configured";
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[value] ?? "bg-zinc-800 text-zinc-400"}`}>
      {value}
    </span>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-4 text-sm text-zinc-600">
        {label}
      </td>
    </tr>
  );
}

export default async function ConnectorsPage() {
  const root = await findRepoRoot();
  const [profiles, models, catalog] = await Promise.all([
    readJsonFiles<ProviderProfile | IntegrationProfile>(root, "data/integrations/profiles"),
    readJsonFiles<ModelProfile>(root, "data/model-profiles"),
    readJsonFiles<ToolCatalogRecord>(root, "data/tools"),
  ]);

  const providers = profiles.filter((item): item is ProviderProfile => "providerKey" in item);
  const integrations = profiles.filter((item): item is IntegrationProfile => "integrationKey" in item);
  const toolProviders = catalog.filter((item) => item.recordType === "tool_provider");
  const capabilities = catalog.filter((item) => item.recordType === "tool_capability");
  const mcpAdapters = catalog.filter((item) => item.recordType === "mcp_tool_adapter");
  const connected = integrations.filter((item) => item.status?.state === "connected").length;
  const enabled = integrations.filter((item) => item.enabled).length + providers.filter((item) => item.enabled).length;
  const secretBacked = providers.filter((item) => item.authStrategy !== "none").length
    + capabilities.filter((item) => item.requiresSecretReference === true).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Connectors</h1>
        <p className="text-zinc-500 text-sm mt-1">Provider profiles, integration profiles, model links, and tool adapters.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Profiles</p>
          <p className="text-2xl font-bold text-zinc-100 mt-1">{providers.length + integrations.length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Enabled</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{enabled}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Connected</p>
          <p className="text-2xl font-bold text-indigo-400 mt-1">{connected}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Secret-backed</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">{secretBacked}</p>
        </div>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">Integration Profiles</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/50 border-b border-zinc-800">
              <tr>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Name</th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Provider</th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Status</th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Capabilities</th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Scopes</th>
              </tr>
            </thead>
            <tbody>
              {integrations.length === 0 ? (
                <EmptyRow colSpan={5} label="No integration profiles registered in data/integrations/profiles." />
              ) : integrations.map((profile) => (
                <tr key={profile.profileId} className="border-t border-zinc-800/50 hover:bg-zinc-800/20">
                  <td className="px-4 py-2">
                    <p className="text-zinc-200">{profile.displayName}</p>
                    <p className="text-zinc-600 text-xs font-mono">{profile.integrationKey}</p>
                  </td>
                  <td className="px-4 py-2 text-zinc-400 text-xs font-mono">{profile.providerProfileId}</td>
                  <td className="px-4 py-2"><StatusBadge value={statusLabel(profile.enabled, profile.status?.state)} /></td>
                  <td className="px-4 py-2 text-zinc-400 text-xs">{profile.capabilities.slice(0, 3).join(", ") || "-"}</td>
                  <td className="px-4 py-2 text-zinc-500 text-xs">{profile.scopes.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">Provider Profiles</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/50 border-b border-zinc-800">
              <tr>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Provider</th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Kind</th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Auth</th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Status</th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Capabilities</th>
              </tr>
            </thead>
            <tbody>
              {providers.length === 0 ? (
                <EmptyRow colSpan={5} label="No provider profiles registered in data/integrations/profiles." />
              ) : providers.map((provider) => (
                <tr key={provider.profileId} className="border-t border-zinc-800/50 hover:bg-zinc-800/20">
                  <td className="px-4 py-2">
                    <p className="text-zinc-200">{provider.displayName}</p>
                    <p className="text-zinc-600 text-xs font-mono">{provider.providerKey}</p>
                  </td>
                  <td className="px-4 py-2 text-zinc-400 text-xs">{provider.kind}</td>
                  <td className="px-4 py-2 text-zinc-400 text-xs">{provider.authStrategy}</td>
                  <td className="px-4 py-2"><StatusBadge value={statusLabel(provider.enabled, provider.status?.state)} /></td>
                  <td className="px-4 py-2 text-zinc-500 text-xs">{provider.supportedCapabilities.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">Tool Adapter Registry</h2>
        <div className="grid lg:grid-cols-3 gap-4">
          {[
            ["Tool providers", toolProviders],
            ["Capabilities", capabilities],
            ["MCP adapters", mcpAdapters],
          ].map(([label, rows]) => (
            <div key={label as string} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <p className="text-sm font-medium text-zinc-300">{label as string}</p>
              </div>
              {(rows as ToolCatalogRecord[]).length === 0 ? (
                <p className="px-4 py-3 text-sm text-zinc-600">No records in data/tools.</p>
              ) : (
                <div className="divide-y divide-zinc-800/70">
                  {(rows as ToolCatalogRecord[]).slice(0, 6).map((row) => {
                    const id = row.providerId ?? row.capabilityId ?? row.adapterId ?? row.displayName ?? "record";
                    return (
                      <div key={id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm text-zinc-200">{row.displayName ?? id}</p>
                            <p className="text-xs text-zinc-600 font-mono mt-0.5">{id}</p>
                          </div>
                          <StatusBadge value={statusLabel(row.enabled, row.status)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">Model Links</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/50 border-b border-zinc-800">
              <tr>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Model</th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Provider</th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Base</th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Usage</th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Integrations</th>
              </tr>
            </thead>
            <tbody>
              {models.length === 0 ? (
                <EmptyRow colSpan={5} label="No model profiles registered in data/model-profiles." />
              ) : models.map((model) => (
                <tr key={model.profileId} className="border-t border-zinc-800/50 hover:bg-zinc-800/20">
                  <td className="px-4 py-2">
                    <p className="text-zinc-200">{model.displayName}</p>
                    <p className="text-zinc-600 text-xs font-mono">{model.profileId}</p>
                  </td>
                  <td className="px-4 py-2 text-zinc-400 text-xs">{model.provider}</td>
                  <td className="px-4 py-2 text-zinc-400 text-xs font-mono">{model.baseModel}</td>
                  <td className="px-4 py-2 text-zinc-500 text-xs">{model.taskUsageClasses.join(", ") || "-"}</td>
                  <td className="px-4 py-2 text-zinc-500 text-xs">{model.integrationProfileIds.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
