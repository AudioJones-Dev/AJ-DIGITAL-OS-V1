import type { DiagnoseSystemRequest, StructuralAbstraction, StructuralNode, StructuralRelation } from "../shared-types/index.js";

const CONSTRAINT_KEYWORDS = ["budget", "time", "capacity", "compliance", "headcount", "latency"];
const UNCERTAINTY_KEYWORDS = ["unknown", "unclear", "assumption", "missing", "incomplete", "unverified"];
const FEEDBACK_KEYWORDS = ["feedback", "review", "loop", "retrospective", "monitoring", "escalation"];

// TODO(AIS-v2): Replace this keyword/rule reducer with a structured signal extraction engine.

export function reduceToStructuralAbstraction(input: DiagnoseSystemRequest): StructuralAbstraction {
  const description = input.problem.description.toLowerCase();
  const symptomBlob = input.problem.symptoms.join(" ").toLowerCase();

  const nodes: StructuralNode[] = [
    { id: "n1", label: "Objective", category: "process" },
    { id: "n2", label: input.context.objective, category: "process" },
    { id: "n3", label: "Observed Failures", category: "signal" },
    ...input.problem.observed_failures.map((failure, index) => ({
      id: `f${index + 1}`,
      label: failure,
      category: "constraint" as const,
    })),
  ];

  const relations: StructuralRelation[] = [
    { from: "n1", to: "n2", type: "flow", description: "objective flow" },
    { from: "n3", to: "n2", type: "feedback", description: "failure impact" },
  ];

  const constraints = Array.from(
    new Set(
      [...input.context.constraints, ...input.problem.observed_failures].filter((entry) =>
        CONSTRAINT_KEYWORDS.some((keyword) => entry.toLowerCase().includes(keyword)),
      ),
    ),
  );

  const feedback_loops = input.problem.symptoms.filter((symptom) =>
    FEEDBACK_KEYWORDS.some((keyword) => symptom.toLowerCase().includes(keyword)),
  );

  const uncertainty_points = [description, symptomBlob, ...input.problem.observed_failures].filter((text) =>
    UNCERTAINTY_KEYWORDS.some((keyword) => text.includes(keyword)),
  );

  return {
    primary_flow: `${input.context.objective} -> ${input.problem.desired_outcome}`,
    nodes,
    relations,
    constraints,
    feedback_loops,
    uncertainty_points,
  };
}
