import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

export interface BrowserInstance {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

export interface LaunchOptions {
  headless?: boolean | undefined;
  storageStatePath?: string | undefined;
}

export async function launchBrowser(options: LaunchOptions = {}): Promise<BrowserInstance> {
  const browser = await chromium.launch({
    headless: options.headless ?? true,
  });

  let context: BrowserContext;

  if (options.storageStatePath) {
    try {
      context = await browser.newContext({ storageState: options.storageStatePath });
    } catch {
      // Storage state file doesn't exist or is invalid — start fresh
      context = await browser.newContext();
    }
  } else {
    context = await browser.newContext();
  }

  const page = await context.newPage();

  return { browser, context, page };
}

export async function closeBrowser(instance: BrowserInstance): Promise<void> {
  await instance.page.close().catch(() => {});
  await instance.context.close().catch(() => {});
  await instance.browser.close().catch(() => {});
}

export async function navigateTo(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
}

export async function clickElement(page: Page, selector: string): Promise<void> {
  await page.click(selector, { timeout: 10_000 });
}

export async function typeText(page: Page, selector: string, text: string): Promise<void> {
  await page.fill(selector, text, { timeout: 10_000 });
}

export async function pressKey(page: Page, selector: string, key: string): Promise<void> {
  await page.press(selector, key, { timeout: 10_000 });
}

export async function waitForSelector(page: Page, selector: string): Promise<void> {
  await page.waitForSelector(selector, { timeout: 15_000 });
}

export async function waitForTimeout(page: Page, ms: number): Promise<void> {
  await page.waitForTimeout(Math.min(ms, 5_000));
}

export async function takeScreenshot(page: Page, outputPath: string): Promise<void> {
  await page.screenshot({ path: outputPath, fullPage: false });
}

export async function getPageSummary(page: Page): Promise<string> {
  const title = await page.title();
  const url = page.url();

  const summary = await page.evaluate(() => {
    const meta = document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";

    const inputs = Array.from(document.querySelectorAll("input, select, textarea")).slice(0, 20).map((el) => {
      const tag = el.tagName.toLowerCase();
      const type = el.getAttribute("type") ?? "";
      const name = el.getAttribute("name") ?? el.getAttribute("id") ?? "";
      const label = el.getAttribute("aria-label") ?? el.getAttribute("placeholder") ?? "";
      return `${tag}[name="${name}" type="${type}" label="${label}"]`;
    });

    const links = Array.from(document.querySelectorAll("a[href]")).slice(0, 15).map((el) => {
      const text = (el.textContent ?? "").trim().slice(0, 50);
      const href = el.getAttribute("href") ?? "";
      return `<a href="${href}">${text}</a>`;
    });

    const buttons = Array.from(document.querySelectorAll("button, [role=button], input[type=submit]")).slice(0, 10).map((el) => {
      const text = (el.textContent ?? "").trim().slice(0, 50);
      const id = el.getAttribute("id") ?? "";
      return `button[id="${id}"]: ${text}`;
    });

    const headings = Array.from(document.querySelectorAll("h1, h2, h3")).slice(0, 10).map((el) => {
      return `${el.tagName}: ${(el.textContent ?? "").trim().slice(0, 80)}`;
    });

    const bodyText = (document.body?.innerText ?? "").slice(0, 500);

    return JSON.stringify({ meta, inputs, links, buttons, headings, bodyText });
  });

  return `URL: ${url}\nTitle: ${title}\n\n${summary}`;
}
