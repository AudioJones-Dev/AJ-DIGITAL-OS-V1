import { useMemo } from "react";

type EvidenceState = "verified" | "stale" | "unavailable";

const gaps = [
  { priority: "BLOCKER", title: "Deployment path is not verified", detail: "No current release evidence connects this dashboard build to a tested hosting target.", owner: "Operator + Codex" },
  { priority: "HIGH", title: "Progress source is stale", detail: "BUILD-PROGRESS.md reflects an April 11 branch and cannot be treated as current build truth.", owner: "Codex" },
  { priority: "HIGH", title: "Working tree is not clean", detail: "Three staged control-plane documents are present and must be reviewed before release work.", owner: "Operator" },
  { priority: "ADVISORY", title: "Remote CI status is not connected", detail: "GitHub checks and deployment status remain unknown until a read-only remote evidence source is configured.", owner: "Integration" },
];

const phases = [
  { name: "Foundation", state: "complete", note: "Core architecture and local runtime surfaces exist" },
  { name: "Operator UX", state: "active", note: "Deployment command center in progress" },
  { name: "Validation", state: "blocked", note: "Full current validation baseline required" },
  { name: "Release", state: "waiting", note: "Hosting target and remote checks unverified" },
];

function EvidencePill({ state }: { state: EvidenceState }) {
  return <span className={`evidence evidence--${state}`}>{state}</span>;
}

export function DashboardHome() {
  const score = 46;
  const circumference = 2 * Math.PI * 50;
  const dash = useMemo(() => `${(score / 100) * circumference} ${circumference}`, [circumference]);

  return (
    <div className="readiness-page">
      <header className="readiness-header">
        <div>
          <p className="eyebrow"><span /> DEPLOYMENT READINESS / LOCAL SNAPSHOT</p>
          <h1>Build Control</h1>
          <p className="lede">One view of what is true, what is missing, and the next move toward a safe deployment.</p>
        </div>
        <div className="snapshot-meta">
          <EvidencePill state="verified" />
          <span>Local evidence captured July 12, 2026</span>
        </div>
      </header>

      <section className="hero-grid" aria-label="Deployment readiness overview">
        <article className="readiness-card score-card">
          <div className="card-kicker">CURRENT READINESS</div>
          <div className="score-layout">
            <div className="score-ring" aria-label={`${score} percent deployment ready`}>
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle className="score-track" cx="60" cy="60" r="50" />
                <circle className="score-progress" cx="60" cy="60" r="50" strokeDasharray={dash} />
              </svg>
              <strong>{score}<small>%</small></strong>
            </div>
            <div>
              <span className="status-line"><i /> BUILD IN PROGRESS</span>
              <h2>Not deployment-ready</h2>
              <p>Architecture exists, but current validation, release evidence, and repository alignment are incomplete.</p>
            </div>
          </div>
        </article>

        <article className="readiness-card next-task-card">
          <div className="card-topline"><span className="card-kicker">NEXT BEST TASK</span><span className="priority-chip">P0</span></div>
          <h2>Establish a current deployment baseline</h2>
          <p>Run the repo-defined validation set, record failures without changing runtime behavior, and replace stale progress claims with evidence.</p>
          <div className="acceptance">
            <span>DONE WHEN</span>
            <ul>
              <li>Required validation commands have timestamped results</li>
              <li>Every blocker has an owner and acceptance criterion</li>
              <li>Local branch and upstream relationship are confirmed</li>
            </ul>
          </div>
          <button type="button" onClick={() => document.getElementById("gaps")?.scrollIntoView({ behavior: "smooth" })}>Review deployment gaps <span>→</span></button>
        </article>
      </section>

      <section className="metric-strip" aria-label="Readiness metrics">
        <Metric value="2" label="Known blockers" tone="danger" />
        <Metric value="3" label="Staged files" tone="warning" />
        <Metric value="1" label="Branch divergence" tone="neutral" suffix="unverified" />
        <Metric value="—" label="Remote checks" tone="neutral" suffix="not connected" />
      </section>

      <div className="content-grid">
        <section className="panel" aria-labelledby="progress-heading">
          <div className="panel-heading"><div><p className="card-kicker">BUILD PATH</p><h2 id="progress-heading">Current progress</h2></div><EvidencePill state="stale" /></div>
          <div className="phase-list">
            {phases.map((phase, index) => (
              <div className={`phase phase--${phase.state}`} key={phase.name}>
                <div className="phase-marker">{phase.state === "complete" ? "✓" : index + 1}</div>
                <div><strong>{phase.name}</strong><p>{phase.note}</p></div>
                <span>{phase.state}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel" aria-labelledby="hygiene-heading">
          <div className="panel-heading"><div><p className="card-kicker">SOURCE CONTROL</p><h2 id="hygiene-heading">Repo hygiene</h2></div><EvidencePill state="verified" /></div>
          <div className="repo-name"><img src="/audiojones-mark-signal.svg" alt="" /><div><strong>AJ-DIGITAL-OS</strong><code>docs/agent-operations-control-plane</code></div></div>
          <div className="hygiene-list">
            <HygieneRow label="Working tree" value="Changes staged" state="warning" />
            <HygieneRow label="Tracked remote" value="origin/main" state="good" />
            <HygieneRow label="Ahead / behind" value="Not verified" state="unknown" />
            <HygieneRow label="Remote CI" value="Not connected" state="unknown" />
            <HygieneRow label="Production deploy" value="Not authorized" state="safe" />
          </div>
          <p className="truth-note">Remote status is intentionally shown as unknown—not guessed from local state.</p>
        </section>
      </div>

      <section className="panel gaps-panel" id="gaps" aria-labelledby="gaps-heading">
        <div className="panel-heading"><div><p className="card-kicker">GAP REGISTER</p><h2 id="gaps-heading">What stands between here and deployment</h2></div><span className="gap-count">{gaps.length} OPEN</span></div>
        <div className="gap-table" role="table">
          {gaps.map((gap) => <div className="gap-row" role="row" key={gap.title}><span className={`gap-priority gap-priority--${gap.priority.toLowerCase()}`}>{gap.priority}</span><div><strong>{gap.title}</strong><p>{gap.detail}</p></div><span className="gap-owner">{gap.owner}</span></div>)}
        </div>
      </section>

      <footer className="dashboard-footer"><span>ALL SIGNAL. NO NOISE.</span><p>This screen is an advisory snapshot. Deployment still requires operator approval.</p></footer>
    </div>
  );
}

function Metric({ value, label, tone, suffix }: { value: string; label: string; tone: string; suffix?: string }) {
  return <div className={`metric metric--${tone}`}><strong>{value}</strong><div><span>{label}</span>{suffix && <small>{suffix}</small>}</div></div>;
}

function HygieneRow({ label, value, state }: { label: string; value: string; state: string }) {
  return <div className="hygiene-row"><span>{label}</span><strong><i className={`dot dot--${state}`} />{value}</strong></div>;
}
