/**
 * Browser Tool — headless browser operations via browser-use CLI.
 *
 * Allowed operations:
 *   - open_url    : navigate to a URL and return page title
 *   - click       : click an element by CSS selector
 *   - input       : type text into an element
 *   - screenshot  : capture a screenshot (returns base64 PNG)
 *
 * NOTE: Requires `browser-use` CLI available on PATH, or a compatible
 *       Playwright/Puppeteer runtime.  Operations are sandboxed — only
 *       http/https URLs are permitted.  No credentials may be typed.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const TAG = "[BROWSER-TOOL]";

export type BrowserOp = "open_url" | "click" | "input" | "screenshot";

export interface BrowserParams {
  op: BrowserOp;
  url?: string;
  selector?: string;
  text?: string;
}

export interface BrowserResult {
  ok: boolean;
  output?: unknown;
  error?: string;
}

const BLOCKED_URL_PATTERNS = [/^file:/i, /^javascript:/i, /^data:/i, /localhost/i, /127\.0\.0\.1/, /0\.0\.0\.0/];

function isAllowedUrl(url: string): boolean {
  if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
  return !BLOCKED_URL_PATTERNS.some((p) => p.test(url));
}

function isBlockedInput(text: string): boolean {
  const lower = text.toLowerCase();
  return ["password", "secret", "token", "api_key", "credential"].some((t) => lower.includes(t));
}

async function runBrowserUseCli(args: string[]): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync("browser-use", args, {
      timeout: 30_000,
      env: { ...process.env },
    });
    return { stdout, stderr };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`browser-use CLI error: ${msg}`);
  }
}

export async function runBrowserTool(params: BrowserParams): Promise<BrowserResult> {
  try {
    if (params.op === "open_url") {
      if (!params.url || !isAllowedUrl(params.url)) {
        return { ok: false, error: "Invalid or blocked URL." };
      }
      console.log(`${TAG} open_url ${params.url}`);
      const { stdout } = await runBrowserUseCli(["open", params.url, "--format", "json"]);
      return { ok: true, output: safeJson(stdout) ?? stdout.trim() };
    }

    if (params.op === "click") {
      if (!params.url || !isAllowedUrl(params.url)) {
        return { ok: false, error: "Invalid or blocked URL." };
      }
      if (!params.selector) return { ok: false, error: "selector is required for click." };
      console.log(`${TAG} click ${params.selector} on ${params.url}`);
      const { stdout } = await runBrowserUseCli(["click", params.url, "--selector", params.selector, "--format", "json"]);
      return { ok: true, output: safeJson(stdout) ?? stdout.trim() };
    }

    if (params.op === "input") {
      if (!params.url || !isAllowedUrl(params.url)) {
        return { ok: false, error: "Invalid or blocked URL." };
      }
      if (!params.selector) return { ok: false, error: "selector is required for input." };
      if (!params.text) return { ok: false, error: "text is required for input." };
      if (isBlockedInput(params.text)) return { ok: false, error: "Input text contains blocked content." };
      console.log(`${TAG} input selector=${params.selector} on ${params.url}`);
      const { stdout } = await runBrowserUseCli([
        "input",
        params.url,
        "--selector",
        params.selector,
        "--text",
        params.text,
        "--format",
        "json",
      ]);
      return { ok: true, output: safeJson(stdout) ?? stdout.trim() };
    }

    if (params.op === "screenshot") {
      if (!params.url || !isAllowedUrl(params.url)) {
        return { ok: false, error: "Invalid or blocked URL." };
      }
      console.log(`${TAG} screenshot ${params.url}`);
      const { stdout } = await runBrowserUseCli(["screenshot", params.url, "--format", "base64"]);
      return { ok: true, output: { base64: stdout.trim() } };
    }

    return { ok: false, error: "Unknown browser operation." };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function safeJson(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
