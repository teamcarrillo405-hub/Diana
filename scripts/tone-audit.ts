/**
 * F20 — Tone & Copy Audit.
 * Scans .tsx / .ts / .md files for banned UI copy patterns.
 * Exits 1 if any violations. Run via: npm run tone-audit
 */
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOT = process.cwd();

const SCAN_EXTENSIONS = [".tsx", ".ts", ".md"];

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  "dist",
  ".planning",
  ".git",
  ".claude",                          // worktrees and Claude tooling — not project source
  "supabase/functions/node_modules",
]);

// Whole-path skip prefixes (research docs may quote banned words for analysis).
const SKIP_PATH_PREFIXES = [
  "docs/",                  // all docs are design/architecture documents, not UI copy
  "supabase/functions/",    // Deno edge functions are server-side API code, not UI copy
  "lib/ai/",                // AI system-prompt templates — server-side prompt engineering, not UI copy
  "scripts/tone-audit.ts",  // the script itself names the banned words
];

// Line-level patterns that indicate a line is NOT user-facing copy.
// Lines matching these are skipped by the scanner.
const SKIP_LINE_PATTERNS = [
  /^\s*\/\//,                           // single-line comment
  /^\s*\*[\s/]/,                        // JSDoc / block comment body or close
  /^\s*\/\*/,                           // block comment open
  /console\.(error|warn|log|info|debug)\(/,  // developer log calls
  /^import\s+/,                         // import statements (component/identifier names)
  /^export\s+(function|class|const)\s/, // exported identifiers (component/function names)
  /[\w_](status|state|type|kind|mode)\s*===?\s*["']/, // DB/code enum comparisons
  /^\s*[<{]\s*[A-Z][A-Za-z]+/,          // JSX component usage (starts with <Component or {Component)
];

// Banned patterns: case-insensitive literal substrings.
// Each entry: { pattern: RegExp, label: string, severity: 'block' | 'warn' }
const BANNED_PATTERNS: Array<{ pattern: RegExp; label: string; severity: "block" | "warn" }> = [
  { pattern: /past[\s-]?due/i,    label: "'past due'",     severity: "block" },
  { pattern: /\boverdue\b/i,      label: "'overdue'",      severity: "block" },
  { pattern: /\bfailed\b/i,       label: "'failed'",       severity: "block" },
  { pattern: /\bmissed\b/i,       label: "'missed'",       severity: "block" },
  { pattern: /\bwrong\b/i,        label: "'wrong'",        severity: "block" },
  { pattern: /\bincorrect\b/i,    label: "'incorrect'",    severity: "block" },
  { pattern: /you[\u2019']re behind/i, label: "\"you're behind\"", severity: "block" },
  { pattern: /!!/,                label: "'!!' (double exclamation)", severity: "block" },
  { pattern: /\bdeadline\b/i,     label: "'deadline' (consider 'due')", severity: "warn" },
];

type Violation = { file: string; line: number; col: number; text: string; label: string; severity: "block" | "warn" };

async function walk(dir: string, acc: string[] = []): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = join(dir, ent.name);
    const rel = relative(ROOT, full).replace(/\\/g, "/");
    if (SKIP_DIRS.has(ent.name)) continue;
    if (SKIP_PATH_PREFIXES.some((p) => rel.startsWith(p))) continue;
    if (ent.isDirectory()) {
      await walk(full, acc);
    } else if (SCAN_EXTENSIONS.some((ext) => ent.name.endsWith(ext))) {
      acc.push(full);
    }
  }
  return acc;
}

async function scanFile(file: string): Promise<Violation[]> {
  const text = await readFile(file, "utf8");
  const lines = text.split(/\r?\n/);
  const out: Violation[] = [];
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comment lines and non-UI code (developer logs, imports)
    if (SKIP_LINE_PATTERNS.some((p) => p.test(line))) continue;
    for (const { pattern, label, severity } of BANNED_PATTERNS) {
      const m = line.match(pattern);
      if (m && m.index !== undefined) {
        out.push({ file: rel, line: i + 1, col: m.index + 1, text: m[0], label, severity });
      }
    }
  }
  return out;
}

async function main() {
  const files = await walk(ROOT);
  const allViolations: Violation[] = [];
  for (const f of files) {
    const v = await scanFile(f);
    allViolations.push(...v);
  }

  const blocks = allViolations.filter((v) => v.severity === "block");
  const warns  = allViolations.filter((v) => v.severity === "warn");

  if (blocks.length === 0 && warns.length === 0) {
    console.log("tone-audit: clean — 0 violations across " + files.length + " files.");
    process.exit(0);
  }

  if (warns.length > 0) {
    console.log("\ntone-audit warnings:");
    for (const v of warns) {
      console.log("  " + v.file + ":" + v.line + ":" + v.col + " " + v.label + " — " + JSON.stringify(v.text));
    }
  }

  if (blocks.length > 0) {
    console.log("\ntone-audit violations:");
    for (const v of blocks) {
      console.log("  " + v.file + ":" + v.line + ":" + v.col + " " + v.label + " — " + JSON.stringify(v.text));
    }
    console.log("\n" + blocks.length + " blocking violation(s). Exiting 1.");
    process.exit(1);
  }

  console.log("\n" + warns.length + " warning(s), 0 blocking. Exiting 0.");
  process.exit(0);
}

main().catch((err) => {
  console.error("tone-audit crashed:", err);
  process.exit(2);
});
