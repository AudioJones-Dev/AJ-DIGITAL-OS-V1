import type { AgentProfileRecord } from "./agent-profile-types.js";

const BUILT_IN_AGENT_PROFILES: AgentProfileRecord[] = [
  {
    recordType: "agent_profile",
    profileId: "runtime-default",
    displayName: "Runtime Default",
    description: "Balanced default runtime behavior with both advisory and orchestrated execution available.",
    enabled: true,
    allowedToolNames: [],
    allowedCapabilityIds: ["filesystem.read", "filesystem.write"],
    executionConstraints: {
      allowedExecutionModes: ["advisory", "orchestrated"],
      allowSideEffectsInAdvisory: false,
      allowSideEffectsInOrchestrated: true,
      persistAdvisoryDeliverables: false,
      persistOrchestratedDeliverables: true,
    },
    metadata: {},
  },
  {
    recordType: "agent_profile",
    profileId: "local-advisor",
    displayName: "Local Advisor",
    description: "Read-oriented assistant profile for no-side-effect advisory work.",
    enabled: true,
    allowedToolNames: [],
    allowedCapabilityIds: ["filesystem.read"],
    executionConstraints: {
      allowedExecutionModes: ["advisory"],
      allowSideEffectsInAdvisory: false,
      allowSideEffectsInOrchestrated: false,
      persistAdvisoryDeliverables: false,
      persistOrchestratedDeliverables: false,
    },
    metadata: {},
  },
  {
    recordType: "agent_profile",
    profileId: "governed-operator",
    displayName: "Governed Operator",
    description: "Workflow-capable operator profile with guarded local mutation available in orchestrated mode.",
    enabled: true,
    allowedToolNames: [],
    allowedCapabilityIds: ["filesystem.read", "filesystem.write"],
    executionConstraints: {
      allowedExecutionModes: ["advisory", "orchestrated"],
      allowSideEffectsInAdvisory: false,
      allowSideEffectsInOrchestrated: true,
      persistAdvisoryDeliverables: false,
      persistOrchestratedDeliverables: true,
    },
    metadata: {},
  },
];

export class AgentProfileRegistry {
  list(): AgentProfileRecord[] {
    return [...BUILT_IN_AGENT_PROFILES].sort((left, right) => left.displayName.localeCompare(right.displayName));
  }

  getDefault(): AgentProfileRecord {
    return this.getById("runtime-default") ?? BUILT_IN_AGENT_PROFILES[0]!;
  }

  getById(profileId: string): AgentProfileRecord | undefined {
    const normalized = profileId.trim();
    return BUILT_IN_AGENT_PROFILES.find((profile) => profile.profileId === normalized);
  }
}
