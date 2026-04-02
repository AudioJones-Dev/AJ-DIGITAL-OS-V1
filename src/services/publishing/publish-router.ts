import { PublisherAgent } from "../../agents/publisher.agent.js";
import { logger } from "../../core/logger.js";

export type PublishTarget = "local";

export interface PublishRouterInput {
  runId: string;
  target?: PublishTarget;
}

export interface PublishRouterResult {
  ok: boolean;
  runId: string;
  target: PublishTarget | string;
  executor: string;
  status: "executed" | "failed";
  publishedPath?: string;
  filesWritten: string[];
  warnings: string[];
  errors: string[];
}

type PublishExecutor = (input: Required<PublishRouterInput>) => Promise<PublishRouterResult>;

/**
 * Routes approved runs to the appropriate publishing executor.
 */
export class PublishRouter {
  private readonly publisher: PublisherAgent;

  private readonly executors: Record<PublishTarget, PublishExecutor>;

  constructor(publisher = new PublisherAgent()) {
    this.publisher = publisher;
    this.executors = {
      local: async (input) => this.executeLocal(input),
    };
  }

  /**
   * Validates the target and delegates publishing to the matching executor.
   */
  async route(input: PublishRouterInput): Promise<PublishRouterResult> {
    const target = input.target ?? "local";

    logger.info("Publish router invoked.", {
      runId: input.runId,
      target,
    });

    if (!isPublishTarget(target)) {
      logger.error("Publish router received unsupported target.", {
        runId: input.runId,
        target,
      });

      return {
        ok: false,
        runId: input.runId,
        target,
        executor: "none",
        status: "failed",
        filesWritten: [],
        warnings: [],
        errors: [`Unsupported publish target \"${target}\".`],
      };
    }

    const normalizedInput: Required<PublishRouterInput> = {
      runId: input.runId,
      target,
    };

    logger.info("Publish router selected executor.", {
      runId: normalizedInput.runId,
      target: normalizedInput.target,
    });

    const executor = this.executors[normalizedInput.target];
    return executor(normalizedInput);
  }

  private async executeLocal(input: Required<PublishRouterInput>): Promise<PublishRouterResult> {
    logger.info("Publish router starting executor.", {
      runId: input.runId,
      executor: "publisher",
      target: input.target,
    });

    const result = await this.publisher.publish(input);

    logger.info("Publish router received executor result.", {
      runId: input.runId,
      executor: "publisher",
      status: result.status,
      publishedPath: result.publishedPath,
    });

    return result.publishedPath === undefined
      ? {
          ok: result.ok,
          runId: result.runId,
          target: input.target,
          executor: result.agent,
          status: result.status,
          filesWritten: result.filesWritten,
          warnings: result.warnings,
          errors: result.errors,
        }
      : {
          ok: result.ok,
          runId: result.runId,
          target: input.target,
          executor: result.agent,
          status: result.status,
          publishedPath: result.publishedPath,
          filesWritten: result.filesWritten,
          warnings: result.warnings,
          errors: result.errors,
        };
  }
}

const isPublishTarget = (value: string): value is PublishTarget => value === "local";
