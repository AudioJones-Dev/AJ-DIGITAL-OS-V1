/**
 * Dollar-quote-aware SQL statement splitter.
 *
 * The Neon HTTP driver executes one statement per request, so a migration
 * file must be split into individual statements. A naive split on ";" corrupts
 * PL/pgSQL function bodies and DO blocks, which contain their own semicolons
 * inside `$$ ... $$` (or `$tag$ ... $tag$`) quoting. This splitter tracks
 * dollar-quote tags, single/double quotes, and line/block comments so those
 * inner semicolons are ignored.
 *
 * It is intentionally dependency-free and pure so it can be unit-tested
 * without a database.
 */

export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let i = 0;
  const n = sql.length;

  // State: at most one of these is active at a time.
  let inLineComment = false;
  let inBlockComment = false;
  let inSingle = false; // '...'
  let inDouble = false; // "..." (quoted identifiers)
  let dollarTag: string | null = null; // e.g. "$$" or "$body$"

  const peek = (offset = 0): string => sql[i + offset] ?? "";

  while (i < n) {
    const ch = sql[i]!;
    const two = ch + peek(1);

    if (inLineComment) {
      current += ch;
      if (ch === "\n") inLineComment = false;
      i += 1;
      continue;
    }
    if (inBlockComment) {
      current += ch;
      if (two === "*/") {
        current += peek(1);
        i += 2;
        inBlockComment = false;
        continue;
      }
      i += 1;
      continue;
    }
    if (inSingle) {
      current += ch;
      // '' is an escaped quote inside a single-quoted string.
      if (ch === "'" && peek(1) === "'") {
        current += peek(1);
        i += 2;
        continue;
      }
      if (ch === "'") inSingle = false;
      i += 1;
      continue;
    }
    if (inDouble) {
      current += ch;
      if (ch === '"' && peek(1) === '"') {
        current += peek(1);
        i += 2;
        continue;
      }
      if (ch === '"') inDouble = false;
      i += 1;
      continue;
    }
    if (dollarTag !== null) {
      if (sql.startsWith(dollarTag, i)) {
        current += dollarTag;
        i += dollarTag.length;
        dollarTag = null;
        continue;
      }
      current += ch;
      i += 1;
      continue;
    }

    // Not inside any quoted/comment context — look for openers.
    if (two === "--") {
      inLineComment = true;
      current += two;
      i += 2;
      continue;
    }
    if (two === "/*") {
      inBlockComment = true;
      current += two;
      i += 2;
      continue;
    }
    if (ch === "'") {
      inSingle = true;
      current += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      current += ch;
      i += 1;
      continue;
    }
    if (ch === "$") {
      const tag = matchDollarTag(sql, i);
      if (tag) {
        dollarTag = tag;
        current += tag;
        i += tag.length;
        continue;
      }
    }
    if (ch === ";") {
      const trimmed = current.trim();
      if (trimmed.length > 0) statements.push(trimmed);
      current = "";
      i += 1;
      continue;
    }

    current += ch;
    i += 1;
  }

  const tail = current.trim();
  if (tail.length > 0) statements.push(tail);

  // Drop statements that are only comments (no executable SQL).
  return statements.filter((s) => !isCommentOnly(s));
}

/**
 * If a dollar-quote tag opens at position `i` (`$$` or `$identifier$`), return
 * the full tag including both dollars; otherwise null. Postgres tag names
 * follow identifier rules: start with a letter/underscore, then
 * letters/digits/underscores.
 */
function matchDollarTag(sql: string, i: number): string | null {
  if (sql[i] !== "$") return null;
  let j = i + 1;
  while (j < sql.length) {
    const c = sql[j]!;
    if (c === "$") return sql.slice(i, j + 1);
    const isTagChar = /[A-Za-z0-9_]/.test(c);
    // The first char after $ must not be a digit (identifier rule); but $1,
    // $2 param placeholders are handled by rejecting a run that never closes.
    if (!isTagChar) return null;
    j += 1;
  }
  return null;
}

function isCommentOnly(stmt: string): boolean {
  const withoutComments = stmt
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n")
    .trim();
  return withoutComments.length === 0;
}
