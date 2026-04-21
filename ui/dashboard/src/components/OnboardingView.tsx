import { useState } from "react";
import type { CSSProperties } from "react";
import { createCheckoutSession } from "../lib/queries";

const TIERS = [
  {
    id: "standard",
    name: "Standard",
    price: "$97/mo",
    features: ["2 AI agents (Architect + Operator)", "1 mission type", "Basic monitoring", "R2 storage"],
  },
  {
    id: "professional",
    name: "Professional",
    price: "$297/mo",
    features: ["3 AI agents (+ Auditor)", "3 mission types", "Daily data extraction", "Priority support"],
    recommended: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$997/mo",
    features: ["4 AI agents (full team)", "All mission types", "Auto-repair workflows", "6h health checks", "Dedicated support"],
  },
];

export function OnboardingView() {
  const [email, setEmail] = useState("");
  const [selectedTier, setSelectedTier] = useState("professional");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await createCheckoutSession({ email: email.trim(), tier: selectedTier });
      if (result.ok && result.url) {
        window.location.href = result.url;
      } else {
        setError(result.error ?? "Failed to create checkout session");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={headingStyle}>Get Started with AJ Digital OS</h1>
      <p style={subtitleStyle}>Choose your plan and let your AI team handle the rest.</p>

      {/* Tier Cards */}
      <div style={tiersContainerStyle}>
        {TIERS.map((tier) => (
          <div
            key={tier.id}
            onClick={() => setSelectedTier(tier.id)}
            style={{
              ...tierCardStyle,
              borderColor: selectedTier === tier.id ? "#3b82f6" : "#1e293b",
              backgroundColor: selectedTier === tier.id ? "#1e293b" : "#0f172a",
            }}
          >
            {tier.recommended && <div style={recommendedBadgeStyle}>Recommended</div>}
            <h3 style={tierNameStyle}>{tier.name}</h3>
            <div style={priceStyle}>{tier.price}</div>
            <ul style={featureListStyle}>
              {tier.features.map((f) => (
                <li key={f} style={featureItemStyle}>✓ {f}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Email + Checkout */}
      <div style={formContainerStyle}>
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
          autoComplete="email"
        />
        <button
          onClick={() => void handleCheckout()}
          disabled={loading}
          style={{
            ...buttonStyle,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Creating checkout…" : `Start ${TIERS.find((t) => t.id === selectedTier)?.name ?? ""} Plan`}
        </button>
        {error && <div style={errorStyle}>{error}</div>}
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

const headingStyle: CSSProperties = { fontSize: 28, fontWeight: 700, marginBottom: 8, color: "#f1f5f9" };
const subtitleStyle: CSSProperties = { fontSize: 15, color: "#94a3b8", marginBottom: 32 };

const tiersContainerStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: 20,
  marginBottom: 32,
};

const tierCardStyle: CSSProperties = {
  padding: 24,
  borderRadius: 10,
  border: "2px solid #1e293b",
  cursor: "pointer",
  transition: "all 0.2s",
  position: "relative",
};

const recommendedBadgeStyle: CSSProperties = {
  position: "absolute",
  top: -10,
  right: 16,
  background: "#3b82f6",
  color: "#fff",
  fontSize: 11,
  fontWeight: 600,
  padding: "3px 10px",
  borderRadius: 12,
};

const tierNameStyle: CSSProperties = { fontSize: 18, fontWeight: 600, color: "#f1f5f9", marginBottom: 4 };
const priceStyle: CSSProperties = { fontSize: 28, fontWeight: 700, color: "#3b82f6", marginBottom: 16 };

const featureListStyle: CSSProperties = { listStyle: "none", padding: 0, margin: 0 };
const featureItemStyle: CSSProperties = { fontSize: 13, color: "#94a3b8", padding: "4px 0" };

const formContainerStyle: CSSProperties = {
  maxWidth: 400,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const inputStyle: CSSProperties = {
  padding: "12px 16px",
  fontSize: 14,
  borderRadius: 8,
  border: "1px solid #334155",
  backgroundColor: "#1e293b",
  color: "#f1f5f9",
  outline: "none",
};

const buttonStyle: CSSProperties = {
  padding: "12px 24px",
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 8,
  border: "none",
  backgroundColor: "#3b82f6",
  color: "#fff",
  cursor: "pointer",
};

const errorStyle: CSSProperties = {
  fontSize: 13,
  color: "#ef4444",
  padding: "8px 12px",
  backgroundColor: "#1c1917",
  borderRadius: 6,
};
