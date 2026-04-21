import {
  RuntimeHealthcheckService,
  type RuntimeHealthcheckResult,
} from "../services/runtime/runtime-healthcheck.js";

export interface HealthcheckCommandInput {
  json?: boolean;
}

export interface HealthcheckCommandResult {
  ok: boolean;
  command: "healthcheck";
  rendered: boolean;
  healthcheck: RuntimeHealthcheckResult;
  warnings: string[];
  errors: string[];
}

/**
 * Terminal-facing command for runtime readiness checks.
 */
export class HealthcheckCommand {
  constructor(private readonly runtimeHealthcheckService = new RuntimeHealthcheckService()) {}

  async run(input: HealthcheckCommandInput = {}): Promise<HealthcheckCommandResult> {
    const healthcheck = await this.runtimeHealthcheckService.run();

    if (input.json === true) {
      this.printJson(healthcheck);
    } else {
      this.renderHuman(healthcheck);
    }

    return {
      ok: healthcheck.ok,
      command: "healthcheck",
      rendered: true,
      healthcheck,
      warnings: healthcheck.warnings,
      errors: healthcheck.errors,
    };
  }

  private renderHuman(healthcheck: RuntimeHealthcheckResult): void {
    console.log("AJ DIGITAL OS HEALTHCHECK");
    console.log("=========================");
    console.log(`Status: ${healthcheck.ok ? "pass" : "fail"}`);
    console.log(`Environment: ${healthcheck.environment}`);
    console.log(`Active Provider: ${healthcheck.activeProvider}`);
    console.log(`Enabled Providers: ${healthcheck.enabledProviders.join(", ")}`);
    console.log(`Memory Enabled: ${healthcheck.memoryEnabled ? "yes" : "no"}`);
    console.log("");
    console.log("Checks");

    for (const check of healthcheck.checks) {
      console.log(`- [${check.status.toUpperCase()}] ${check.message}`);
    }

    if (healthcheck.warnings.length > 0) {
      console.log("");
      console.log("Warnings");
      for (const warning of healthcheck.warnings) {
        console.log(`- ${warning}`);
      }
    }

    if (healthcheck.errors.length > 0) {
      console.log("");
      console.log("Errors");
      for (const error of healthcheck.errors) {
        console.log(`- ${error}`);
      }
    }
  }

  private printJson(payload: RuntimeHealthcheckResult): void {
    console.log(JSON.stringify(payload, null, 2));
  }
}
