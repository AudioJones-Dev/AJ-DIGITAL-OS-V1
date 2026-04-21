import type { Page } from "playwright";

export interface ExtractedFields {
  [key: string]: string;
}

export async function extractFields(page: Page, fieldNames: string[], rootSelector?: string): Promise<ExtractedFields> {
  const result = await page.evaluate(({ fields, rootSel }: { fields: string[]; rootSel: string | null }) => {
    const root: Element | Document = rootSel ? (document.querySelector(rootSel) ?? document) : document;
    const extracted: Record<string, string> = {};

    // Well-known semantic field mappings
    const semanticExtract = (field: string): string | null => {
      const lower = field.toLowerCase();

      // Page title — prefer visible h1 heading over document.title
      if (lower === "title") {
        const h1 = root.querySelector("h1");
        if (h1?.textContent?.trim()) return h1.textContent.trim();
        return document.title || null;
      }

      // Meta tags (description, keywords, author, etc.)
      const meta = root.querySelector(`meta[name="${lower}"]`) as HTMLMetaElement | null;
      if (meta?.content) return meta.content;

      // Open Graph meta
      const og = root.querySelector(`meta[property="og:${lower}"]`) as HTMLMetaElement | null;
      if (og?.content) return og.content;

      // HTML tag selectors (h1, h2, h3, h4, h5, h6, p)
      if (/^h[1-6]$/.test(lower) || lower === "p") {
        const el = root.querySelector(lower);
        if (el?.textContent?.trim()) return el.textContent.trim();
      }

      return null;
    };

    for (const field of fields) {
      // Try semantic extraction first
      const semantic = semanticExtract(field);
      if (semantic !== null) {
        extracted[field] = semantic;
        continue;
      }

      // Try input/select/textarea by name
      const byName = root.querySelector(`[name="${field}"]`) as HTMLInputElement | null;
      if (byName) {
        extracted[field] = byName.value || byName.textContent?.trim() || "";
        continue;
      }

      // Try by id
      const byId = root.querySelector(`#${CSS.escape(field)}`) as HTMLElement | null;
      if (byId) {
        extracted[field] = (byId as HTMLInputElement).value || byId.textContent?.trim() || "";
        continue;
      }

      // Try by aria-label
      const byLabel = root.querySelector(`[aria-label="${field}"]`) as HTMLElement | null;
      if (byLabel) {
        extracted[field] = (byLabel as HTMLInputElement).value || byLabel.textContent?.trim() || "";
        continue;
      }

      // Try by data-testid (common in React SPAs)
      const byTestId = root.querySelector(`[data-testid="${field}"]`) as HTMLElement | null;
      if (byTestId) {
        extracted[field] = (byTestId as HTMLInputElement).value || byTestId.textContent?.trim() || "";
        continue;
      }

      // Try with underscores replaced by hyphens (data-testid="project-id" for field "project_id")
      const hyphenated = field.replace(/_/g, "-");
      if (hyphenated !== field) {
        const byHyphenTestId = root.querySelector(`[data-testid="${hyphenated}"]`) as HTMLElement | null;
        if (byHyphenTestId) {
          extracted[field] = (byHyphenTestId as HTMLInputElement).value || byHyphenTestId.textContent?.trim() || "";
          continue;
        }
      }

      // Try by label text content
      const labels = Array.from(root.querySelectorAll("label"));
      const matchedLabel = labels.find((l) =>
        (l.textContent ?? "").toLowerCase().includes(field.toLowerCase()),
      );
      if (matchedLabel) {
        const forAttr = matchedLabel.getAttribute("for");
        if (forAttr) {
          const target = root.querySelector(`#${CSS.escape(forAttr)}`) as HTMLInputElement | null;
          if (target) {
            extracted[field] = target.value || target.textContent?.trim() || "";
            continue;
          }
        }
        const nested = matchedLabel.querySelector("input, select, textarea") as HTMLInputElement | null;
        if (nested) {
          extracted[field] = nested.value || "";
          continue;
        }
      }

      // Try by heading or text content containing the field name,
      // then look for an adjacent/sibling element with the value.
      // Sort by text length (shortest first) to prefer the most specific match.
      const humanLabel = field.replace(/_/g, " ").toLowerCase();
      const allElements = Array.from(
        root.querySelectorAll("h1, h2, h3, h4, h5, h6, p, span, div, td, th, dt, dd, li, code, pre, strong, em"),
      ).filter((el) => {
        const text = el.textContent?.trim() ?? "";
        const lower = text.toLowerCase();
        return text.length > 0 && text.length < 200 && (lower.includes(field.toLowerCase()) || lower.includes(humanLabel));
      }).sort((a, b) => (a.textContent?.trim().length ?? 0) - (b.textContent?.trim().length ?? 0));

      for (const el of allElements) {
        const text = el.textContent?.trim() ?? "";

        // If the element is a short label (close match), try to get the adjacent value
        if (text.length < 40) {
          // Check next sibling for a value
          const sibling = el.nextElementSibling;
          if (sibling?.textContent?.trim() && sibling.textContent.trim().length < 200) {
            extracted[field] = sibling.textContent.trim();
            break;
          }
          // Check parent's next sibling (common in card/definition-list layouts)
          const parentSibling = el.parentElement?.nextElementSibling;
          if (parentSibling?.textContent?.trim() && parentSibling.textContent.trim().length < 200) {
            extracted[field] = parentSibling.textContent.trim();
            break;
          }
        }

        // For short elements that are the value itself (not a container), use directly
        if (text.length < 80 && el.children.length === 0) {
          extracted[field] = text;
          break;
        }
      }

      // Scoped fallback: if scoped to a specific element and no strategy matched,
      // grab the first leaf element's text. The workflow author explicitly narrowed
      // the DOM scope, so the first visible text is likely the intended value.
      if (!(field in extracted) && rootSel && root !== document) {
        const leaves = Array.from(
          root.querySelectorAll("span, code, strong, em, td, dd, li"),
        ).filter((l) => l.children.length === 0 && (l.textContent?.trim() ?? "").length > 0);
        const first = leaves[0];
        if (first) {
          extracted[field] = (first.textContent ?? "").trim();
        }
      }

      if (!(field in extracted)) {
        extracted[field] = "";
      }
    }

    return extracted;
  }, { fields: fieldNames, rootSel: rootSelector ?? null });

  return result;
}
