import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { isRetiredStudentRoute } from "../lib/student-route-policy";

const root = process.cwd();
const app = path.join(root, "app");
const posix = (value: string) => value.replaceAll(path.sep, "/");
const unique = (items: string[]) => [...new Set(items)].sort();

async function filesIn(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(file));
    else files.push(file);
  }
  return files;
}

function routeFor(file: string) {
  const parts = posix(path.relative(app, path.dirname(file))).split("/")
    .filter(part => part && !part.startsWith("(") && !part.startsWith("@"));
  return `/${parts.join("/")}`;
}

function designFamily(route: string, kind: string, retired: boolean) {
  if (retired) return "Retired: preserve 404 boundary";
  if (["loading", "error", "not-found"].includes(kind)) return "Shared recovery and loading";
  if (kind === "layout") return "Shared shell and route guards";
  if (route.startsWith("/landing-3d/")) return "Existing review reference";
  if (route.startsWith("/qa/")) return "Internal QA fixture";
  if (route === "/dashboard" || route === "/more") return "Lobby and utility menu";
  if (route === "/assignments") return "Work schedule and selection";
  if (route === "/quick-add" || route.includes("/captures/")) return "Source capture and review";
  if (route.endsWith("/workspace")) return "Active work HUD";
  if (route.endsWith("/submit")) return "Explicit submission confirmation";
  if (route.startsWith("/assignments/")) return "Assignment briefing";
  if (route.startsWith("/classes")) return "Class roster and profile";
  if (route === "/calendar") return "Personal schedule and event detail";
  if (route === "/settings" || route === "/me") return "Account and options menu";
  if (route === "/sharing" || route.startsWith("/share/")) return "Sharing and audience permissions";
  if (route === "/wellness") return "Private check-in history";
  if (route === "/proof") return "Evidence collection and record";
  if (route === "/search") return "Search directory";
  if (route.startsWith("/notes")) return "Notes library and editor";
  if (route === "/study" || route.startsWith("/study-artifacts")) return "Practice selection and study session";
  if (["/login", "/signup"].includes(route) || route.startsWith("/onboarding")) return "Entry and player setup";
  if (route === "/offline" || route === "/public-not-found") return "Shared recovery and loading";
  return "Public product and trust";
}

function sourceFacts(file: string, source: string) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const imports: string[] = [], components: string[] = [], headings: string[] = [], redirects: string[] = [], states: string[] = [];
  let inlineStyles = false;
  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text);
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(tree);
      if (/^[A-Z]/.test(tag)) components.push(tag);
      if (["dialog", "Dialog", "AlertDialog", "Sheet", "Tabs", "form", "Form"].includes(tag)) states.push(tag);
      if (tag === "style") inlineStyles = true;
    }
    if (ts.isJsxElement(node) && /^h[1-3]$/.test(node.openingElement.tagName.getText(tree))) {
      const text = node.children.filter(ts.isJsxText).map(item => item.text).join(" ").replace(/\s+/g, " ").trim();
      if (text) headings.push(text);
    }
    if (ts.isCallExpression(node) && node.expression.getText(tree) === "redirect") {
      const target = node.arguments[0];
      redirects.push(target && ts.isStringLiteral(target) ? target.text : "dynamic");
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return { imports: unique(imports), components: unique(components), literalHeadings: unique(headings), redirectCalls: unique(redirects), directUiElements: unique(states), inlineStyles };
}

async function inventory() {
  const sourceFiles = (await filesIn(app)).filter(file => /^(?:page|loading|error|not-found|layout)\.(?:tsx|jsx|ts|js)$/.test(path.basename(file)));
  const records = [];
  for (const file of sourceFiles.sort()) {
    const source = await readFile(file, "utf8");
    const route = routeFor(file);
    const kind = path.basename(file).split(".")[0];
    const relative = posix(path.relative(root, file));
    const area = route.startsWith("/landing-3d/") ? "review" : relative.includes("(app)/qa/") ? "qa" : relative.includes("(app)/") ? "student" : relative.includes("(auth)/") ? "auth" : "public";
    const retired = isRetiredStudentRoute(route);
    records.push({ route, kind, source: relative, area, retired, family: designFamily(route, kind, retired), dynamic: route.includes("["), evidence: "source-inventoried", ...sourceFacts(file, source) });
  }
  const staticScreens = [
    { route: "/privacy.html", source: "public/privacy.html", kind: "static-html", status: "canonical" },
    { route: "/trust.html", source: "public/trust.html", kind: "static-html", status: "redirected by next.config.ts to /privacy.html#privacy" },
    { route: "/landing-3d/today-idle-review", source: "app/landing-3d/today-idle-review/route.ts", kind: "html-route-handler", status: "development review only" },
  ];
  const pages = records.filter(record => record.kind === "page");
  const result = {
    generatedAt: new Date().toISOString(),
    evidence: "Source inventory only. Counts are route files, not distinct UI states or rendered verification. Area identifies source grouping, not anonymous reachability; onboarding is auth-gated and /me has a signed-out middleware 404 gap.",
    totals: {
      pageFiles: pages.length,
      retiredPageFiles: pages.filter(record => record.retired).length,
      activeStudentPageFiles: pages.filter(record => record.area === "student" && !record.retired).length,
      publicAndAuthPageFiles: pages.filter(record => ["public", "auth"].includes(record.area)).length,
      reviewPageFiles: pages.filter(record => record.area === "review").length,
      qaPageFiles: pages.filter(record => record.area === "qa").length,
      boundaries: records.filter(record => ["loading", "error", "not-found"].includes(record.kind)).length,
      layouts: records.filter(record => record.kind === "layout").length,
      additionalStaticScreens: staticScreens.length,
    },
    records, staticScreens,
  };
  const output = path.join(root, "docs/design/system-audit/routes.generated.json");
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
  const matrix = [
    "# Route Coverage Matrix",
    "",
    "Generated from route source and retirement policy. This is NOT rendered verification or approval. Source area is not access policy: onboarding requires auth and /me currently returns a middleware 404 when signed out. See README.md and the specialist audits for states and evidence.",
    "",
    "| Route | Kind | Source disposition | Design family | Source |",
    "| --- | --- | --- | --- | --- |",
    ...records.map(record => `| \`${record.route}\` | ${record.kind} | ${record.retired ? "Retired" : record.area} | ${record.family} | [source](../../../${record.source}) |`),
    ...staticScreens.map(record => `| \`${record.route}\` | ${record.kind} | ${record.status} | ${record.route.includes("landing-3d") ? "Existing review reference" : "Public product and trust"} | [source](../../../${record.source}) |`),
    "",
  ].join("\n");
  await writeFile(path.join(path.dirname(output), "routes.generated.md"), matrix);
  console.log(JSON.stringify(result.totals, null, 2));
  console.log(`Wrote ${posix(path.relative(root, output))}`);
  for (const record of pages) console.log(`${record.retired ? "retired" : record.area}\t${record.route}\t${record.source}`);
}

void inventory();
