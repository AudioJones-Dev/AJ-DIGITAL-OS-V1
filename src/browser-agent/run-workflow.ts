import path from "node:path";
import {
  launchBrowser,
  closeBrowser,
  navigateTo,
  clickElement,
  typeText,
  pressKey,
  waitForSelector,
  waitForTimeout,
  getPageSummary,
  type BrowserInstance,
} from "./browser.js";
import { saveSession, resolveSessionFile, sessionFileExists } from "./session-manager.js";
import { extractFields } from "./extractors.js";
import { requestNextAction, type AgentAction } from "./openai.js";
import { validateAction } from "./validator.js";
import { withRetry } from "./retry.js";
import { WorkflowLogger } from "./logger.js";
import { writeCsv } from "./writers/csv-writer.js";
import { writeEnvTemplate } from "./writers/env-writer.js";
import { writeMdReport } from "./writers/md-writer.js";
import type { WorkflowJobDefinition, WorkflowResult } from "./workflow-types.js";

export async function runWorkflow(job: WorkflowJobDefinition): Promise<WorkflowResult> {
  const logger = new WorkflowLogger(job.name);
  const startTime = Date.now();
  let stepCount = 0;
  let instance: BrowserInstance | undefined;
  const extractedFields: Record<string, string> = {};
  const filesWritten: string[] = [];
  const errors: string[] = [];
  const previousActions: string[] = [];

  try {
    logger.info("Starting workflow", { startUrl: job.startUrl, configUrl: job.configUrl });

    // Resolve session file — explicit path or auto-derived from domain
    const resolvedSession = resolveSessionFile(job.sessionFile, job.startUrl);
    const hasSession = await sessionFileExists(resolvedSession);

    if (hasSession) {
      logger.info("[SESSION] Loaded existing session", { file: resolvedSession });
    } else {
      logger.info("[SESSION] No session found, starting fresh", { checked: resolvedSession });
    }

    // Launch browser with session if available
    instance = await launchBrowser({
      headless: true,
      storageStatePath: hasSession ? resolvedSession : undefined,
    });

    logger.info("Browser launched");

    // Navigate to start URL first to check session validity
    validateDomain(job.startUrl, job.allowedDomains);
    await navigateTo(instance.page, job.startUrl);

    // Wait for SPA redirects to settle before checking session
    await instance.page.waitForLoadState("networkidle").catch(() => {});

    // Check if loaded session is still valid
    let sessionWasInvalid = false;
    if (hasSession) {
      const sessionValid = await isSessionValid(instance.page, job.authSelector);
      if (!sessionValid) {
        sessionWasInvalid = true;
        logger.warn("[SESSION] Invalid session detected, falling back to fresh context");
        await closeBrowser(instance);
        instance = await launchBrowser({ headless: true });
        logger.info("Browser relaunched without session");
        await navigateTo(instance.page, job.startUrl);
      } else {
        logger.info("[SESSION] Session is valid");
      }
    }

    // Direct extract mode — skip reasoning loop entirely
    if (job.mode === "direct") {
      return await runDirectExtract(instance, job, logger, startTime, resolvedSession, sessionWasInvalid);
    }

    // Start URL already navigated above
    logger.step(++stepCount, "goto", job.startUrl);
    previousActions.push(`goto ${job.startUrl}`);

    // Main action loop
    let consecutiveValidationFailures = 0;
    const MAX_VALIDATION_FAILURES = 3;
    const MAX_REPEAT_COUNT = 2;

    while (stepCount < job.maxSteps) {
      const pageSummary = await getPageSummary(instance.page);

      // Build validation feedback if previous action was rejected
      const validationFeedback = consecutiveValidationFailures > 0
        ? `\n\n## Validation Feedback\nYour previous action was REJECTED: ${errors[errors.length - 1]}. Fix the issue and try a different approach.`
        : "";

      const rawAction = await withRetry(
        () =>
          requestNextAction({
            task: buildTaskDescription(job),
            pageSummary,
            previousActions,
            workflowHints: buildWorkflowHints(job) + validationFeedback,
          }),
        {
          maxRetries: job.maxRetries,
          delayMs: 2000,
          onRetry: (attempt, err) =>
            logger.warn(`OpenAI retry ${attempt}`, { error: err.message }),
        },
      );

      const validation = validateAction(rawAction);

      if (!validation.valid || !validation.action) {
        consecutiveValidationFailures++;
        const msg = `Validation failure (${consecutiveValidationFailures}/${MAX_VALIDATION_FAILURES}): ${validation.errors.join("; ")}`;
        logger.warn(msg);
        errors.push(msg);
        previousActions.push(`REJECTED: ${validation.errors.join("; ")}`);

        if (consecutiveValidationFailures >= MAX_VALIDATION_FAILURES) {
          logger.error("Too many consecutive validation failures — aborting");
          errors.push("Aborted: exceeded validation failure limit.");
          break;
        }
        continue;
      }

      // Reset validation failure counter on success
      consecutiveValidationFailures = 0;

      const action = validation.action;

      // Detect repeated identical actions
      const actionKey = `${action.action}:${action.selector ?? ""}:${action.text ?? ""}:${action.key ?? ""}:${(action.fields ?? []).join(",")}`;
      const repeatCount = previousActions.filter((a) => a === actionKey).length;
      if (repeatCount >= MAX_REPEAT_COUNT) {
        const msg = `Repeated action detected (${repeatCount + 1}x): ${actionKey}`;
        logger.warn(msg);
        errors.push(msg);
        errors.push("Aborted: agent is stuck in a loop.");
        previousActions.push(`REJECTED: repeated action ${actionKey}`);
        break;
      }

      logger.step(++stepCount, action.action, action.thought);
      previousActions.push(actionKey);

      // Execute action
      const actionResult = await executeAction(instance, action, job, logger);

      if (actionResult.type === "done") {
        logger.result("Workflow completed", { reason: action.reason ?? "done" });
        break;
      }

      if (actionResult.type === "fail") {
        logger.error("Workflow failed", { reason: action.reason ?? "unknown" });
        errors.push(action.reason ?? "Agent reported failure.");
        break;
      }

      if (actionResult.type === "extracted") {
        Object.assign(extractedFields, actionResult.fields);
        const populatedCount = Object.values(extractedFields).filter((v) => v.length > 0).length;
        logger.info("Fields extracted", { count: Object.keys(actionResult.fields).length, populated: populatedCount });

        // Auto-terminate if we have extracted data
        if (populatedCount > 0) {
          logger.result("Auto-terminating — fields extracted successfully", { populated: populatedCount });
          break;
        }
      }
    }

    if (stepCount >= job.maxSteps) {
      logger.warn("Max steps reached");
      errors.push("Max steps reached without completion.");
    }

    // Save session only if workflow succeeded (or session was invalid and needs refresh)
    const workflowOk = errors.length === 0;
    if (instance && (workflowOk || sessionWasInvalid)) {
      try {
        await saveSession(instance.context, resolvedSession);
        if (sessionWasInvalid && workflowOk) {
          logger.info("[SESSION] Session refreshed and saved", { file: resolvedSession });
        } else {
          logger.info("Session saved", { file: resolvedSession });
        }
      } catch (err) {
        logger.warn("Failed to save session", { error: err instanceof Error ? err.message : "unknown" });
      }
    }

    // Write outputs only if workflow succeeded or extracted data
    const hasExtractedData = Object.values(extractedFields).some((v) => v.length > 0);
    if (errors.length === 0 || hasExtractedData) {
      const outputFiles = await writeOutputs(job, extractedFields, {
        stepCount,
        durationMs: Date.now() - startTime,
        errors,
        logger,
      });
      filesWritten.push(...outputFiles);
    } else {
      logger.warn("Skipping output files — workflow failed with no extracted data");
    }

    const durationMs = Date.now() - startTime;
    logger.result("Workflow complete", {
      ok: errors.length === 0,
      stepCount,
      fieldsExtracted: Object.keys(extractedFields).length,
      filesWritten: filesWritten.length,
      durationMs,
    });

    return {
      ok: errors.length === 0,
      workflow: job.name,
      stepCount,
      extractedFields,
      filesWritten,
      errors,
      durationMs,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error("Fatal workflow error", { error: message });
    errors.push(message);

    return {
      ok: false,
      workflow: job.name,
      stepCount,
      extractedFields,
      filesWritten,
      errors,
      durationMs: Date.now() - startTime,
    };
  } finally {
    if (instance) {
      await closeBrowser(instance);
      logger.info("Browser closed");
    }
  }
}

interface ActionExecutionResult {
  type: "continue" | "done" | "fail" | "extracted";
  fields: Record<string, string>;
}

async function runDirectExtract(
  instance: BrowserInstance,
  job: WorkflowJobDefinition,
  logger: WorkflowLogger,
  startTime: number,
  resolvedSession: string,
  sessionWasInvalid: boolean,
): Promise<WorkflowResult> {
  let stepCount = 0;
  const errors: string[] = [];
  const filesWritten: string[] = [];

  try {
    // startUrl already navigated by runWorkflow (including session check)
    logger.step(++stepCount, "goto", job.startUrl);

    let extractedFields: Record<string, string> = {};

    if (job.steps && job.steps.length > 0) {
      // Multi-step workflow: execute steps in sequence, merge extractions
      for (const step of job.steps) {
        if (step.type === "goto") {
          validateDomain(step.url, job.allowedDomains);
          await navigateTo(instance.page, step.url);
          await instance.page.waitForLoadState("networkidle").catch(() => {});
          await instance.page.waitForTimeout(1500);
          logger.step(++stepCount, "goto", step.url);
        } else if (step.type === "extract") {
          const result = await extractFields(instance.page, step.fields, step.selector);
          Object.assign(extractedFields, result);
          logger.step(++stepCount, "extract", `${step.fields.length} fields${step.selector ? ` (scoped: ${step.selector})` : ""}`);
        }
      }
    } else {
      // Legacy single-page: goto configUrl then extract all targetFields
      if (job.configUrl && job.configUrl !== job.startUrl) {
        validateDomain(job.configUrl, job.allowedDomains);
        await navigateTo(instance.page, job.configUrl);
        logger.step(++stepCount, "goto", job.configUrl);
      }

      await instance.page.waitForLoadState("networkidle").catch(() => {});
      await instance.page.waitForTimeout(1500);

      extractedFields = await extractFields(instance.page, job.targetFields);
      logger.step(++stepCount, "extract", `${Object.keys(extractedFields).length} fields`);
    }

    // Step 4: write outputs
    const outputFiles = await writeOutputs(job, extractedFields, {
      stepCount,
      durationMs: Date.now() - startTime,
      errors,
      logger,
    });
    filesWritten.push(...outputFiles);

    // Step 5: save session
    try {
      await saveSession(instance.context, resolvedSession);
      if (sessionWasInvalid) {
        logger.info("[SESSION] Session refreshed and saved", { file: resolvedSession });
      } else {
        logger.info("Session saved", { file: resolvedSession });
      }
    } catch {
      logger.warn("Failed to save session");
    }

    const durationMs = Date.now() - startTime;
    logger.result("Direct extract complete", {
      ok: true,
      stepCount,
      fieldsExtracted: Object.keys(extractedFields).length,
      filesWritten: filesWritten.length,
      durationMs,
    });

    return {
      ok: true,
      workflow: job.name,
      stepCount,
      extractedFields,
      filesWritten,
      errors,
      durationMs,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error("Direct extract failed", { error: message });
    errors.push(message);

    return {
      ok: false,
      workflow: job.name,
      stepCount,
      extractedFields: {},
      filesWritten,
      errors,
      durationMs: Date.now() - startTime,
    };
  } finally {
    await closeBrowser(instance);
    logger.info("Browser closed");
  }
}

async function executeAction(
  instance: BrowserInstance,
  action: AgentAction,
  job: WorkflowJobDefinition,
  logger: WorkflowLogger,
): Promise<ActionExecutionResult> {
  const { page } = instance;

  switch (action.action) {
    case "goto": {
      const url = action.text ?? "";
      validateDomain(url, job.allowedDomains);
      await navigateTo(page, url);
      return { type: "continue", fields: {} };
    }
    case "click":
      await clickElement(page, action.selector ?? "");
      return { type: "continue", fields: {} };
    case "type":
      await typeText(page, action.selector ?? "", action.text ?? "");
      return { type: "continue", fields: {} };
    case "press":
      await pressKey(page, action.selector ?? "", action.key ?? "");
      return { type: "continue", fields: {} };
    case "wait":
      if (action.selector) {
        await waitForSelector(page, action.selector);
      } else {
        await waitForTimeout(page, 2000);
      }
      return { type: "continue", fields: {} };
    case "extract": {
      const fields = await extractFields(page, action.fields ?? job.targetFields);
      return { type: "extracted", fields };
    }
    case "done":
      return { type: "done", fields: {} };
    case "fail":
      return { type: "fail", fields: {} };
    default:
      logger.error(`Unknown action: ${String((action as AgentAction).action)}`);
      return { type: "continue", fields: {} };
  }
}

async function isSessionValid(page: import("playwright").Page, authSelector: string): Promise<boolean> {
  // Strategy 1: If authSelector is provided, check for its presence
  if (authSelector) {
    try {
      const el = await page.$(authSelector);
      return el !== null;
    } catch {
      return false;
    }
  }

  // Strategy 2: URL contains login-related paths (check after SPA redirect)
  const url = page.url().toLowerCase();
  if (url.includes("/login") || url.includes("/signin") || url.includes("/auth")) {
    return false;
  }

  // Strategy 3: Heuristic — page has a login form = session is invalid
  const hasLoginSignals = await page.evaluate(() => {
    // Traditional password form
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    if (passwordInputs.length > 0) return true;

    // OAuth / SSO button patterns (common in SaaS login pages)
    const buttons = Array.from(document.querySelectorAll("button, a[role='button'], a"));
    const oauthPattern = /continue with|sign in with|log in with|login with/i;
    const oauthButtons = buttons.filter((b) => oauthPattern.test(b.textContent ?? ""));
    if (oauthButtons.length >= 2) return true;

    return false;
  });

  if (hasLoginSignals) {
    return false;
  }

  // No login signals found — session appears valid
  return true;
}

function validateDomain(url: string, allowedDomains: string[]): void {
  if (allowedDomains.length === 0) {
    return;
  }

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const allowed = allowedDomains.some((domain) => {
      const d = domain.toLowerCase();
      return hostname === d || hostname.endsWith(`.${d}`);
    });

    if (!allowed) {
      throw new Error(`Domain "${hostname}" is not in the allowed list: ${allowedDomains.join(", ")}`);
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("not in the allowed list")) {
      throw err;
    }
    throw new Error(`Invalid URL: ${url}`);
  }
}

function buildTaskDescription(job: WorkflowJobDefinition): string {
  return [
    `Navigate to the config/settings page at: ${job.configUrl}`,
    `Extract these fields: ${job.targetFields.join(", ")}`,
    `If you are already on the config page, extract the fields immediately.`,
    `If you need to log in first, navigate to the start URL and complete login.`,
    `When all fields are extracted, respond with "done".`,
    `Do not modify any settings. Read only.`,
  ].join("\n");
}

function buildWorkflowHints(job: WorkflowJobDefinition): string {
  return [
    `Workflow: ${job.name}`,
    `Start URL: ${job.startUrl}`,
    `Config URL: ${job.configUrl}`,
    `Allowed domains: ${job.allowedDomains.join(", ")}`,
    `Target fields: ${job.targetFields.join(", ")}`,
    `Read-only operation. Do not click save, submit, delete, or modify.`,
  ].join("\n");
}

async function writeOutputs(
  job: WorkflowJobDefinition,
  fields: Record<string, string>,
  meta: { stepCount: number; durationMs: number; errors: string[]; logger: WorkflowLogger },
): Promise<string[]> {
  const written: string[] = [];
  const outputBase = path.resolve("output");

  const csvPath = path.join(outputBase, "csv", `${job.outputPrefix}.csv`);
  const mdPath = path.join(outputBase, "md", `${job.outputPrefix}-report.md`);
  const envPath = path.join(outputBase, "env", `${job.outputPrefix}.env`);

  try {
    await writeCsv(csvPath, Object.keys(fields), [fields]);
    written.push(csvPath);
    meta.logger.info("CSV written", { path: csvPath });
  } catch (err) {
    meta.logger.error("Failed to write CSV", { error: err instanceof Error ? err.message : "unknown" });
  }

  try {
    await writeMdReport(mdPath, {
      title: `Config Export: ${job.name}`,
      task: `Extract fields from ${job.configUrl}`,
      fields,
      notes: meta.errors.length > 0 ? meta.errors : ["Completed successfully."],
      timestamp: new Date().toISOString(),
      workflow: job.name,
      stepCount: meta.stepCount,
      duration: `${(meta.durationMs / 1000).toFixed(1)}s`,
    });
    written.push(mdPath);
    meta.logger.info("Markdown report written", { path: mdPath });
  } catch (err) {
    meta.logger.error("Failed to write MD report", { error: err instanceof Error ? err.message : "unknown" });
  }

  try {
    await writeEnvTemplate(envPath, fields);
    written.push(envPath);
    meta.logger.info("Env template written", { path: envPath });
  } catch (err) {
    meta.logger.error("Failed to write env template", { error: err instanceof Error ? err.message : "unknown" });
  }

  return written;
}
