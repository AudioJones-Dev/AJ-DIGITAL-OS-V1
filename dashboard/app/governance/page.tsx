import {
  getGovernanceBrandVoicePolicy,
  getGovernanceLegalPolicy,
  getGovernanceSopPolicy,
  getGovernanceOfferPolicy,
} from "@/lib/api";

export const dynamic = "force-dynamic";

function PolicyOffline({ label }: { label: string }) {
  return (
    <div className="bg-aj-surface-1 border border-aj-border rounded-lg p-6 text-center">
      <p className="text-aj-text-muted text-sm italic">{label} policy data unavailable — Hermes offline</p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs bg-aj-surface-2 text-aj-text-secondary px-2 py-0.5 rounded font-mono">{children}</span>
  );
}

export default async function GovernancePage() {
  const [brandVoice, legal, sopContent, sopOffer, offerPolicy] = await Promise.allSettled([
    getGovernanceBrandVoicePolicy(),
    getGovernanceLegalPolicy(),
    getGovernanceSopPolicy("content_creation"),
    getGovernanceSopPolicy("offer_generation"),
    getGovernanceOfferPolicy(),
  ]);

  const bv = brandVoice.status === "fulfilled" ? (brandVoice.value as Record<string, unknown> | null) : null;
  const lg = legal.status === "fulfilled" ? (legal.value as Record<string, unknown> | null) : null;
  const sopC = sopContent.status === "fulfilled" ? (sopContent.value as Record<string, unknown> | null) : null;
  const sopO = sopOffer.status === "fulfilled" ? (sopOffer.value as Record<string, unknown> | null) : null;
  const ofp = offerPolicy.status === "fulfilled" ? (offerPolicy.value as Record<string, unknown> | null) : null;

  const forbiddenPhrases = Array.isArray(bv?.["forbiddenPhrases"]) ? (bv["forbiddenPhrases"] as string[]) : [];
  const brandNames = Array.isArray(bv?.["brandNames"]) ? (bv["brandNames"] as string[]) : [];
  const restrictedCategories = Array.isArray(lg?.["restrictedCategories"]) ? (lg["restrictedCategories"] as string[]) : [];
  const prohibitedPatterns = Array.isArray(lg?.["prohibitedPatterns"]) ? lg["prohibitedPatterns"] : [];
  const policyVersion = (bv?.["version"] as string) ?? "—";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Governance Layer</h1>
        <p className="text-aj-text-muted text-sm mt-1">
          Brand voice · Legal · SOP · Offer · Agent behavior · Policy v: {policyVersion}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Brand Voice */}
        {!bv ? <PolicyOffline label="Brand Voice" /> : (
          <div className="bg-aj-surface-1 border border-aj-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-aj-data">Brand Voice</h2>
              <span className="text-xs text-aj-text-muted">max claim: <span className="text-aj-text-secondary">{String(bv["maxClaimStrength"] ?? "qualified")}</span></span>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-aj-text-muted mb-1.5">Brand names ({brandNames.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {brandNames.map((n) => <Badge key={n}>{n}</Badge>)}
                </div>
              </div>
              <div>
                <p className="text-xs text-aj-text-muted mb-1.5">Forbidden phrases ({forbiddenPhrases.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {forbiddenPhrases.slice(0, 10).map((p) => (
                    <span key={p} className="text-xs bg-aj-critical/15 text-aj-critical px-2 py-0.5 rounded font-mono">{p}</span>
                  ))}
                  {forbiddenPhrases.length > 10 && (
                    <span className="text-xs text-aj-text-muted">+{forbiddenPhrases.length - 10} more</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Legal */}
        {!lg ? <PolicyOffline label="Legal Constraints" /> : (
          <div className="bg-aj-surface-1 border border-aj-warning/40 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-aj-warning">Legal Constraints</h2>
              <span className="text-xs text-aj-text-muted">{prohibitedPatterns.length} blocked patterns</span>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-aj-text-muted mb-1.5">Restricted categories ({restrictedCategories.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {restrictedCategories.map((c) => (
                    <span key={c} className="text-xs bg-aj-warning/15 text-aj-warning px-2 py-0.5 rounded font-mono">{c}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-aj-text-muted">Required disclaimer categories</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {Object.keys((lg["requiredDisclaimers"] as Record<string, unknown>) ?? {}).map((k) => (
                    <Badge key={k}>{k}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SOP */}
        <div className="bg-aj-surface-1 border border-aj-data/40 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-aj-data mb-4">SOPs</h2>
          {!sopC && !sopO ? <p className="text-aj-text-muted text-sm italic">SOP data unavailable</p> : (
            <div className="space-y-4">
              {[{ label: "content_creation", data: sopC }, { label: "offer_generation", data: sopO }].map(({ label, data }) => {
                if (!data) return null;
                const workflow = data["workflow"] as Record<string, unknown> | null;
                if (!workflow) return null;
                const requiredSteps = Array.isArray(workflow["requiredSteps"]) ? workflow["requiredSteps"] as string[] : [];
                const requiredApprovals = Array.isArray(workflow["requiredApprovals"]) ? workflow["requiredApprovals"] as string[] : [];
                return (
                  <div key={label}>
                    <p className="text-xs text-aj-text-secondary font-medium mb-1.5">{label}</p>
                    <div className="flex flex-wrap gap-1">
                      {requiredSteps.map((s, i) => (
                        <span key={s} className="text-xs text-aj-text-secondary">
                          {i > 0 && <span className="text-aj-text-muted mr-1">→</span>}
                          <span className={requiredApprovals.includes(s) ? "text-aj-warning font-medium" : ""}>{s}</span>
                        </span>
                      ))}
                    </div>
                    {requiredApprovals.length > 0 && (
                      <p className="text-xs text-aj-warning mt-1">Requires approval at: {requiredApprovals.join(", ")}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Offer Governance */}
        {!ofp ? <PolicyOffline label="Offer Governance" /> : (
          <div className="bg-aj-surface-1 border border-aj-success/40 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-aj-success">Offer Governance</h2>
              <span className="text-xs text-aj-text-muted">
                max discount: <span className="text-aj-text-secondary">{String((ofp["discountRules"] as Record<string, unknown> | null)?.["maxDiscountPercentage"] ?? "—")}%</span>
              </span>
            </div>
            <div>
              <p className="text-xs text-aj-text-muted mb-2">Price floors by tier</p>
              <table className="w-full text-xs">
                <thead><tr><th className="text-left text-aj-text-muted pb-1">Tier</th><th className="text-left text-aj-text-muted pb-1">Min Price</th></tr></thead>
                <tbody>
                  {Object.entries((ofp["priceFloors"] as Record<string, unknown>) ?? {}).map(([tier, price]) => (
                    <tr key={tier}>
                      <td className="py-0.5 text-aj-text-secondary font-mono">{tier}</td>
                      <td className="py-0.5 text-aj-success font-mono">${String(price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
