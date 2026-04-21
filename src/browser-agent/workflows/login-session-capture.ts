import path from "node:path";
import {
  launchBrowser,
  closeBrowser,
  navigateTo,
  type BrowserInstance,
} from "../browser.js";
import { loadSession, saveSession } from "../session-manager.js";
import { WorkflowLogger } from "../logger.js";

export interface LoginSessionCaptureInput {
  loginUrl: string;
  allowedDomains: string[];
  sessionFile: string;
  /** CSS selector that indicates authenticated state (e.g. ".avatar", "#dashboard") */
  authSelector?: string | undefined;
  /** Max seconds to wait for manual login before timing out */
  loginTimeoutSeconds?: number | undefined;
  /** If true, skip login and just validate existing session */
  validateOnly?: boolean | undefined;
}

export interface LoginSessionCaptureResult {
  ok: boolean;
  workflow: string;
  sessionFile: string;
  authenticated: boolean;
  method: "existing-session" | "manual-login" | "none";
  errors: string[];
  durationMs: number;
}

export async function runLoginSessionCapture(
  input: LoginSessionCaptureInput,
): Promise<LoginSessionCaptureResult> {
  const logger = new WorkflowLogger("login-session-capture");
  const startTime = Date.now();
  const errors: string[] = [];
  let instance: BrowserInstance | undefined;
  let method: LoginSessionCaptureResult["method"] = "none";

  const sessionFile = input.sessionFile || `sessions/${extractDomain(input.loginUrl)}.json`;
  const resolvedSessionFile = path.resolve(sessionFile);
  const loginTimeout = (input.loginTimeoutSeconds ?? 120) * 1000;

  try {
    logger.info("Starting login-session-capture", { loginUrl: input.loginUrl, sessionFile: resolvedSessionFile });

    // Step 1: Launch browser (headful for manual login) with existing session if available
    instance = await launchBrowser({
      headless: false,
      storageStatePath: resolvedSessionFile,
    });
    logger.info("Browser launched (headful)");

    // Step 2: Navigate to login URL
    validateDomain(input.loginUrl, input.allowedDomains);
    await navigateTo(instance.page, input.loginUrl);
    // Wait for SPA redirects to settle
    await instance.page.waitForLoadState("networkidle").catch(() => {});
    logger.step(1, "goto", input.loginUrl);

    // Step 3: Check if session is already valid (already authenticated)
    const alreadyAuthed = await detectAuth(instance, input);
    if (alreadyAuthed) {
      logger.info("Existing session is valid — already authenticated");
      method = "existing-session";

      // Re-save session to refresh it
      await saveSession(instance.context, resolvedSessionFile);
      logger.info("Session refreshed", { file: resolvedSessionFile });

      return buildResult(true, resolvedSessionFile, true, method, errors, startTime);
    }

    // Step 4: If validate-only, stop here
    if (input.validateOnly) {
      logger.warn("Session not valid and --validate-only was set");
      errors.push("Session is not authenticated. Re-run without --validate-only to log in.");
      return buildResult(false, resolvedSessionFile, false, method, errors, startTime);
    }

    // Step 5: Wait for manual login
    logger.info("Waiting for manual login...", { timeoutSeconds: loginTimeout / 1000 });
    logger.info("Complete login in the browser window. The workflow will detect authentication automatically.");

    const loginSucceeded = await waitForAuth(instance, input, loginTimeout, logger);

    if (!loginSucceeded) {
      logger.error("Login timeout — authentication not detected");
      errors.push(`Login timeout after ${loginTimeout / 1000}s. Authentication was not detected.`);
      return buildResult(false, resolvedSessionFile, false, method, errors, startTime);
    }

    method = "manual-login";
    logger.info("Authentication detected after manual login");

    // Step 6: Capture session
    await saveSession(instance.context, resolvedSessionFile);
    logger.result("Session captured", { file: resolvedSessionFile });

    return buildResult(true, resolvedSessionFile, true, method, errors, startTime);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error("Login session capture failed", { error: message });
    errors.push(message);
    return buildResult(false, resolvedSessionFile, false, method, errors, startTime);
  } finally {
    if (instance) {
      await closeBrowser(instance);
      logger.info("Browser closed");
    }
  }
}

// --- Auth detection ---

async function detectAuth(
  instance: BrowserInstance,
  input: LoginSessionCaptureInput,
): Promise<boolean> {
  const { page } = instance;

  // Strategy 1: Custom auth selector
  if (input.authSelector) {
    try {
      const el = await page.$(input.authSelector);
      if (el) return true;
    } catch {
      // selector invalid or not found
    }
  }

  // Strategy 2: URL contains login-related paths (after SPA redirect)
  const url = page.url().toLowerCase();
  if (url.includes("/login") || url.includes("/signin") || url.includes("/auth")) {
    return false;
  }

  // Strategy 3: No login form present on the page
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
  if (!hasLoginSignals) {
    // Page loaded without login signals — likely authenticated
    // But only if we're NOT on an error page
    if (!url.includes("error") && !url.includes("404")) {
      return true;
    }
  }

  return false;
}

async function waitForAuth(
  instance: BrowserInstance,
  input: LoginSessionCaptureInput,
  timeoutMs: number,
  logger: WorkflowLogger,
): Promise<boolean> {
  const { page } = instance;
  const startTime = Date.now();
  const pollIntervalMs = 2000;

  while (Date.now() - startTime < timeoutMs) {
    // Check auth after each poll
    const authed = await detectAuth(instance, input);
    if (authed) return true;

    // Also check for URL change away from login page
    const currentUrl = page.url();
    if (!currentUrl.includes("login") && !currentUrl.includes("signin") && !currentUrl.includes("auth")) {
      // URL changed away from login paths — likely redirected after auth
      const stillHasPassword = await page.evaluate(
        () => document.querySelectorAll('input[type="password"]').length > 0,
      );
      if (!stillHasPassword) {
        return true;
      }
    }

    // Wait before polling again
    await page.waitForTimeout(pollIntervalMs);

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    if (elapsed % 10 === 0) {
      logger.info(`Still waiting for login... (${elapsed}s / ${timeoutMs / 1000}s)`);
    }
  }

  return false;
}

// --- Helpers ---

function validateDomain(url: string, allowedDomains: string[]): void {
  if (allowedDomains.length === 0) return;

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
    if (err instanceof Error && err.message.includes("not in the allowed list")) throw err;
    throw new Error(`Invalid URL: ${url}`);
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/\./g, "-");
  } catch {
    return "unknown";
  }
}

function buildResult(
  ok: boolean,
  sessionFile: string,
  authenticated: boolean,
  method: LoginSessionCaptureResult["method"],
  errors: string[],
  startTime: number,
): LoginSessionCaptureResult {
  return {
    ok,
    workflow: "login-session-capture",
    sessionFile,
    authenticated,
    method,
    errors,
    durationMs: Date.now() - startTime,
  };
}
