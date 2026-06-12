import type { DeploymentTier, QualificationNextStep } from "../shared-types/index.js";

export function determineDeploymentTier(readinessScore: number, disqualifiers: string[]): DeploymentTier {
  if (disqualifiers.length > 0 || readinessScore < 40) {
    return "not_ready";
  }

  if (readinessScore < 60) {
    return "foundation";
  }

  if (readinessScore < 80) {
    return "growth";
  }

  return "scale";
}

export function determineNextStep(params: {
  deploymentTier: DeploymentTier;
  disqualifiers: string[];
  readinessScore: number;
}): QualificationNextStep {
  if (params.disqualifiers.length > 0) {
    return "reject";
  }

  if (params.deploymentTier === "foundation") {
    if (params.readinessScore < 45) {
      return "fix_foundation";
    }

    return "install_foundation_layer";
  }

  if (params.deploymentTier === "growth") {
    return "install_growth_os";
  }

  if (params.deploymentTier === "scale") {
    return "install_scale_os";
  }

  return "fix_foundation";
}
