import { randomUUID } from "node:crypto";

import { RunManager } from "../core/run-manager.js";
import { RunTracker, type RunEvent, type RunEventType } from "../services/observability/run-tracker.js";

export interface SeedDemoCommandInput {
  json?: boolean;
}

export interface SeedDemoCommandResult {
  ok: boolean;
  command: "seed-demo";
  runsCreated: number;
  runIds: string[];
  states: string[];
  warnings: string[];
  errors: string[];
}

interface DemoSpec {
  workflowId: string;
  taskType: string;
  clientId: string;
}

const DEMO_SPECS: DemoSpec[] = [
  { workflowId: "blog-authority", taskType: "blog_post", clientId: "client-acme" },
  { workflowId: "transcript-to-content", taskType: "content_repurpose", clientId: "client-beta" },
  { workflowId: "blog-authority", taskType: "blog_post", clientId: "client-acme" },
  { workflowId: "transcript-to-content", taskType: "seo_content", clientId: "client-gamma" },
  { workflowId: "blog-authority", taskType: "thought_leadership", clientId: "client-delta" },
];

/**
 * Generates a realistic demo dataset covering all key run lifecycle states.
 */
export class SeedDemoCommand {
  constructor(
    private readonly runManager = new RunManager(),
    private readonly runTracker = new RunTracker(),
  ) {}

  /**
   * Seeds 5 demo runs covering: pending_approval, approved, executed,
   * validation_failed, and revision_requested states.
   */
  async run(input: SeedDemoCommandInput = {}): Promise<SeedDemoCommandResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      const [spec0, spec1, spec2, spec3, spec4] = DEMO_SPECS;

      const [runId0, runId1, runId2, runId3, runId4] = await Promise.all([
        this.seedPendingApproval(spec0!),
        this.seedApproved(spec1!),
        this.seedExecuted(spec2!),
        this.seedValidationFailed(spec3!),
        this.seedRevisionRequested(spec4!),
      ]);

      const runIds = [runId0, runId1, runId2, runId3, runId4];
      const states = [
        "pending_approval",
        "approved",
        "executed",
        "validation_failed",
        "revision_requested",
      ];

      const result: SeedDemoCommandResult = {
        ok: true,
        command: "seed-demo",
        runsCreated: runIds.length,
        runIds,
        states,
        warnings,
        errors,
      };

      if (input.json === true) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        this.renderHuman(result);
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown seed error.";
      errors.push(message);

      if (input.json === true) {
        console.log(JSON.stringify({ ok: false, command: "seed-demo", errors }, null, 2));
      } else {
        console.log("SEED DEMO FAILED");
        console.log(`Error: ${message}`);
      }

      return {
        ok: false,
        command: "seed-demo",
        runsCreated: 0,
        runIds: [],
        states: [],
        warnings,
        errors,
      };
    }
  }

  /**
   * Run 1: queued → ... → pending_approval
   */
  private async seedPendingApproval(spec: DemoSpec): Promise<string> {
    const run = await this.runManager.createRun({ ...spec, approvalRequired: true });
    const { runId } = run;

    await this.trackEvent(runId, "run_created", "Demo run created.");
    await this.runManager.updateStatus(runId, "context_loaded");
    await this.trackEvent(runId, "context_loaded", "Context loaded from brand DNA and source materials.");
    await this.runManager.updateStatus(runId, "in_progress");
    await this.trackEvent(runId, "workflow_started", `Workflow started: ${spec.workflowId}.`);
    await this.runManager.updateStatus(runId, "draft_complete");
    await this.trackEvent(runId, "workflow_completed", "Draft complete. All assets generated.");
    await this.runManager.updateStatus(runId, "validation_passed");
    await this.trackEvent(runId, "validation_passed", "Validation passed. Quality threshold met.");
    await this.runManager.markPendingApproval(runId);
    await this.runTracker.trackApprovalRequested(runId, { workflowId: spec.workflowId, clientId: spec.clientId });

    return runId;
  }

  /**
   * Run 2: ... → pending_approval → approved
   */
  private async seedApproved(spec: DemoSpec): Promise<string> {
    const runId = await this.seedPendingApproval(spec);

    await this.runManager.markApproved(runId, "demo-operator");
    await this.trackEvent(runId, "approval_approved", "Run approved by demo-operator.", { actor: "demo-operator" });

    return runId;
  }

  /**
   * Run 3: ... → approved → executed (with workflowResult and publishedPath)
   */
  private async seedExecuted(spec: DemoSpec): Promise<string> {
    const runId = await this.seedApproved(spec);

    await this.trackEvent(runId, "execution_requested", "Execution requested by demo-operator.", { actor: "demo-operator" });
    await this.runTracker.trackExecutionStarted(runId, { target: "local" });

    await this.runManager.updateStatus(runId, "executed", {
      publishedPath: `src/data/outputs/demo/${runId}/output.md`,
      publishedFiles: [`src/data/outputs/demo/${runId}/output.md`],
      workflowResult: {
        workflowId: spec.workflowId,
        taskType: spec.taskType,
        status: "draft_complete",
        summary: "Demo content package drafted and published to local output path.",
        assets: [
          { type: "title", value: "How AI Is Transforming Modern Content Operations" },
          { type: "blog_draft", value: "This is a demo blog post generated by AJ Digital OS to populate the observability layer." },
          { type: "seo_notes", value: "Target keyword: AI content operations. Secondary: workflow automation." },
        ],
        warnings: [],
      },
    });

    await this.runTracker.trackExecutionCompleted(runId, { target: "local", publishedPath: `src/data/outputs/demo/${runId}/output.md` });
    await this.trackEvent(runId, "artifact_written", "Output artifact written.", {
      publishedPath: `src/data/outputs/demo/${runId}/output.md`,
    });

    return runId;
  }

  /**
   * Run 4: queued → ... → draft_complete → validation_failed
   */
  private async seedValidationFailed(spec: DemoSpec): Promise<string> {
    const run = await this.runManager.createRun({ ...spec, approvalRequired: true });
    const { runId } = run;

    await this.trackEvent(runId, "run_created", "Demo run created.");
    await this.runManager.updateStatus(runId, "context_loaded");
    await this.trackEvent(runId, "context_loaded", "Context loaded from brand DNA and source materials.");
    await this.runManager.updateStatus(runId, "in_progress");
    await this.trackEvent(runId, "workflow_started", `Workflow started: ${spec.workflowId}.`);
    await this.runManager.updateStatus(runId, "draft_complete");
    await this.trackEvent(runId, "workflow_completed", "Draft complete.");

    await this.runManager.updateStatus(runId, "validation_failed", {
      errors: ["Content quality score below threshold — minimum 80 required, got 62."],
    });
    await this.trackEvent(runId, "validation_failed", "Validation failed. Quality threshold not met.");
    await this.runTracker.trackError(
      runId,
      "Content quality score below threshold — minimum 80 required, got 62.",
      { workflowId: spec.workflowId, score: 62, threshold: 80 },
    );

    return runId;
  }

  /**
   * Run 5: ... → pending_approval → revision_requested
   */
  private async seedRevisionRequested(spec: DemoSpec): Promise<string> {
    const runId = await this.seedPendingApproval(spec);

    await this.runManager.markRevisionRequested(runId, "demo-operator");
    await this.trackEvent(runId, "approval_revision_requested", "Revision requested by demo-operator.", {
      actor: "demo-operator",
      reason: "Brand voice inconsistency detected in section 2.",
    });

    return runId;
  }

  private async trackEvent(
    runId: string,
    type: RunEventType,
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const event: RunEvent = {
      eventId: randomUUID(),
      runId,
      type,
      timestamp: new Date().toISOString(),
      message,
      ...(metadata ? { metadata } : {}),
    };
    await this.runTracker.track(event);
  }

  private renderHuman(result: SeedDemoCommandResult): void {
    console.log("Demo dataset created.");
    console.log(`Runs: ${result.runsCreated}`);
    console.log("States:");
    for (const state of result.states) {
      console.log(`- ${state}`);
    }
    console.log("");
    console.log("Run IDs:");
    for (const [index, runId] of result.runIds.entries()) {
      const state = result.states[index] ?? "unknown";
      console.log(`  ${index + 1}. [${state}]  ${runId}`);
    }
  }
}
