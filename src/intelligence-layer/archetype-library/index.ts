import type { ArchetypeId, StructuralAbstraction } from "../shared-types/index.js";

export interface ArchetypeRecord {
  id: ArchetypeId;
  name: string;
  description: string;
  structural_signature: {
    nodes: string[];
    relations: string[];
    constraints: string[];
    feedback_loops: string[];
  };
  diagnostic_questions: string[];
  default_intervention_classes: string[];
  retrieval_tags: string[];
  routing_hints: string[];
}

export const archetypeLibrary: Record<ArchetypeId, ArchetypeRecord> = {
  bottleneck_constraint: {
    id: "bottleneck_constraint",
    name: "Bottleneck Constraint",
    description: "A limiting node throttles system-wide throughput.",
    structural_signature: {
      nodes: ["queue", "resource", "process"],
      relations: ["dependency"],
      constraints: ["single-point-capacity"],
      feedback_loops: ["backlog-amplification"],
    },
    diagnostic_questions: ["Where does work accumulate faster than it clears?", "Which single resource gates output?"],
    default_intervention_classes: ["load balancing", "parallelization", "queue control"],
    retrieval_tags: ["throughput", "queue", "constraint"],
    routing_hints: ["queue", "backlog", "waiting", "blocked", "approval queue"],
  },
  transformation_failure: {
    id: "transformation_failure",
    name: "Transformation Failure",
    description: "Inputs are available, but conversion into usable output fails.",
    structural_signature: {
      nodes: ["input", "transform", "output"],
      relations: ["flow"],
      constraints: ["quality-threshold"],
      feedback_loops: ["rework-cycle"],
    },
    diagnostic_questions: ["Which transformation step introduces defects?", "How often does rework occur?"],
    default_intervention_classes: ["process redesign", "quality gates", "error-proofing"],
    retrieval_tags: ["defect", "rework", "quality"],
    routing_hints: ["defect", "rework", "conversion", "drop-off", "failed processing"],
  },
  signal_degradation: {
    id: "signal_degradation",
    name: "Signal Degradation",
    description: "Critical signal quality decays across handoffs or channels.",
    structural_signature: {
      nodes: ["signal", "channel", "consumer"],
      relations: ["flow", "feedback"],
      constraints: ["latency", "noise"],
      feedback_loops: ["misinterpretation-loop"],
    },
    diagnostic_questions: ["Where is signal fidelity lost?", "What noise enters between producer and consumer?"],
    default_intervention_classes: ["instrumentation", "signal normalization", "handoff standardization"],
    retrieval_tags: ["signal", "noise", "latency", "handoff"],
    routing_hints: ["noise", "inconsistent", "stale data", "miscommunication", "signal"],
  },
  feedback_delay: {
    id: "feedback_delay",
    name: "Feedback Delay",
    description: "Corrective feedback arrives too late to influence decisions.",
    structural_signature: {
      nodes: ["decision", "feedback", "outcome"],
      relations: ["feedback"],
      constraints: ["long-cycle-time"],
      feedback_loops: ["delayed-correction"],
    },
    diagnostic_questions: ["How long between action and measurable feedback?", "Which loops are slowest?"],
    default_intervention_classes: ["faster telemetry", "leading indicators", "shorter review loops"],
    retrieval_tags: ["feedback", "cycle-time", "latency"],
    routing_hints: ["delay", "late", "slow feedback", "lagging indicator"],
  },
  incentive_misalignment: {
    id: "incentive_misalignment",
    name: "Incentive Misalignment",
    description: "Local incentives conflict with global system objectives.",
    structural_signature: {
      nodes: ["actor", "incentive", "objective"],
      relations: ["control", "dependency"],
      constraints: ["goal-conflict"],
      feedback_loops: ["local-optimization-loop"],
    },
    diagnostic_questions: ["Which KPI drives harmful local optimization?", "Who benefits from current failure mode?"],
    default_intervention_classes: ["metric redesign", "incentive harmonization", "shared accountability"],
    retrieval_tags: ["incentive", "KPI", "misalignment"],
    routing_hints: ["gaming metrics", "misaligned", "conflict of goals", "local optimization"],
  },
  capacity_mismatch: {
    id: "capacity_mismatch",
    name: "Capacity Mismatch",
    description: "Capacity profile does not match workload shape or volatility.",
    structural_signature: {
      nodes: ["demand", "capacity", "buffer"],
      relations: ["dependency", "flow"],
      constraints: ["resource-gap"],
      feedback_loops: ["burst-overload-loop"],
    },
    diagnostic_questions: ["When does demand exceed available capacity?", "Is capacity elastic enough for peak load?"],
    default_intervention_classes: ["capacity planning", "elastic staffing", "demand smoothing"],
    retrieval_tags: ["load", "capacity", "utilization"],
    routing_hints: ["overloaded", "understaffed", "capacity", "spike", "utilization"],
  },
  coordination_breakdown: {
    id: "coordination_breakdown",
    name: "Coordination Breakdown",
    description: "Interdependent teams fail to synchronize effectively.",
    structural_signature: {
      nodes: ["team", "handoff", "dependency"],
      relations: ["dependency", "control"],
      constraints: ["cross-team-friction"],
      feedback_loops: ["handoff-rework-loop"],
    },
    diagnostic_questions: ["Which handoff fails most often?", "Where are ownership boundaries unclear?"],
    default_intervention_classes: ["interface contracts", "RACI clarity", "handoff SLAs"],
    retrieval_tags: ["coordination", "handoff", "ownership"],
    routing_hints: ["handoff", "ownership unclear", "cross-team", "coordination", "silo"],
  },
  compounding_decay: {
    id: "compounding_decay",
    name: "Compounding Decay",
    description: "Small unresolved issues accumulate into accelerating degradation.",
    structural_signature: {
      nodes: ["debt", "quality", "outcome"],
      relations: ["dependency", "feedback"],
      constraints: ["deferred-maintenance"],
      feedback_loops: ["debt-acceleration-loop"],
    },
    diagnostic_questions: ["What recurring issues are deferred repeatedly?", "Which quality trend is worsening over time?"],
    default_intervention_classes: ["debt retirement", "preventive maintenance", "trend interruption"],
    retrieval_tags: ["decay", "debt", "trend"],
    routing_hints: ["worsening", "accumulating", "degrading", "technical debt", "decay"],
  },
};

const BASE_SCORE = 0.05;

export function scoreArchetypes(structural: StructuralAbstraction): Record<ArchetypeId, number> {
  const textCorpus = [
    structural.primary_flow,
    ...structural.constraints,
    ...structural.feedback_loops,
    ...structural.uncertainty_points,
    ...structural.nodes.map((n) => n.label),
    ...structural.relations.map((r) => `${r.type} ${r.description ?? ""}`),
  ]
    .join(" ")
    .toLowerCase();

  const scores = {} as Record<ArchetypeId, number>;

  for (const [id, record] of Object.entries(archetypeLibrary) as Array<[ArchetypeId, ArchetypeRecord]>) {
    let score = BASE_SCORE;

    for (const hint of record.routing_hints) {
      if (textCorpus.includes(hint.toLowerCase())) {
        score += 0.18;
      }
    }

    for (const constraint of record.structural_signature.constraints) {
      if (textCorpus.includes(constraint.split("-").join(" "))) {
        score += 0.14;
      }
    }

    for (const loop of record.structural_signature.feedback_loops) {
      if (textCorpus.includes(loop.split("-").join(" "))) {
        score += 0.1;
      }
    }

    scores[id] = Number(Math.min(score, 0.99).toFixed(3));
  }

  return scores;
}

export function getArchetypeById(id: ArchetypeId): ArchetypeRecord {
  return archetypeLibrary[id];
}
