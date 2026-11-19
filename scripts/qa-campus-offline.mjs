import { chromium } from "playwright";
import { createHash, randomUUID } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { createServer, request as httpRequest } from "node:http";
import path from "node:path";

// Bounded local production-build QA. No real account or remote call is used.
const upstream = "http://127.0.0.1:3140";
let upstreamOnline = true;
const proxy = createServer((req, res) => {
  if (!upstreamOnline) { req.socket.destroy(); return; }
  const target = httpRequest(new URL(req.url, upstream), { method: req.method, headers: { ...req.headers, host: "127.0.0.1:3140" } }, response => {
    res.writeHead(response.statusCode, response.headers); response.pipe(res);
  });
  target.on("error", () => res.destroy());
  req.pipe(target);
});
await new Promise(resolve => proxy.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${proxy.address().port}`;
const output = "docs/design/full-app-experience-plan-2026-11-17/implementation-qa/offline";
await mkdir(output, { recursive: true });
const checks = [];
const note = (name, pass, detail = "") => { checks.push({ name, pass: Boolean(pass), detail }); console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? `: ${detail}` : ""}`); };
const pw = await chromium.launch({ headless: true });
const errors = [];
const context = await pw.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "allow" });
await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
const page = await context.newPage();
page.on("pageerror", err => errors.push(err.message));
if (process.argv.includes("--followup")) {
  try {
    await page.goto(`${origin}/offline`, { waitUntil: "networkidle" });
    await page.evaluate(async () => { await navigator.serviceWorker.ready; if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true })); });
    upstreamOnline = false;
    proxy.closeAllConnections();
    await context.setOffline(true);
    const response = await page.goto(`${origin}/assignments?offlineqa=${randomUUID()}`, { waitUntil: "domcontentloaded" });
    const info = await page.evaluate(() => ({ online: navigator.onLine, heading: document.querySelector('h1')?.innerText, href: location.pathname }));
    note("disconnected assignment route uses saved-packs fallback", info.heading?.toLowerCase() === "saved study packs" && info.online === false && response?.fromServiceWorker(), JSON.stringify({ status: response?.status(), fromWorker: response?.fromServiceWorker(), ...info }));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `${output}/offline-assignment-fallback-phone.png`, fullPage: true });
  } catch (e) { note("disconnected assignment route check", false, String(e)); }
  try {
    const source = await readFile("electron/main.cjs", "utf8");
    const mockApp = { whenReady: () => ({ then() {} }), on() {}, quit() {} };
    const sandbox = { require: id => id === "electron" ? { app: mockApp, BrowserWindow: function () {}, session: {}, shell: {} } : id === "node:path" ? path : (() => { throw new Error(`Unexpected require ${id}`); })(), process: { env: {}, platform: "win32" }, __dirname: path.resolve("electron"), URL, console };
    const render = runInNewContext(`${source}\nrenderLaunchError`, sandbox);
    const html = render(-105, '<img src=x onerror="alert(1)">', 'http://127.0.0.1:3140/?input="<svg onload=alert(1)>');
    const ep = await context.newPage();
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 760 }]) {
      await ep.setViewportSize(viewport);
      await ep.setContent(html);
      const info = await ep.evaluate(() => ({ img: document.querySelectorAll('img,svg,script').length, text: document.body.textContent, scroll: document.documentElement.scrollWidth, width: innerWidth, retryHeight: document.querySelector('a').getBoundingClientRect().height, summaryHeight: document.querySelector('summary').getBoundingClientRect().height, href: document.querySelector('a').getAttribute('href') }));
      note(`native error escapes inputs ${viewport.width}`, info.img === 0 && info.text.includes('<img src=x onerror="alert(1)">') && info.href === 'http://localhost:3000');
      note(`native recovery controls 44px ${viewport.width}`, info.retryHeight >= 44 && info.summaryHeight >= 44, JSON.stringify({ retry: info.retryHeight, summary: info.summaryHeight }));
      note(`native error no horizontal overflow ${viewport.width}`, info.scroll <= info.width, JSON.stringify({ scroll: info.scroll, width: info.width }));
      await ep.screenshot({ path: `${output}/native-error-fixed-${viewport.width}.png`, fullPage: true });
    }
    await ep.close();
  } catch (e) { note("native error followup", false, String(e)); }
  await context.close(); await pw.close(); await new Promise(resolve => proxy.close(resolve));
  await writeFile(`${output}/followup-results.json`, JSON.stringify({ generatedAt: new Date().toISOString(), origin, checks, pageErrors: errors }, null, 2));
  console.log(`Follow-up: ${checks.filter(c => c.pass).length}/${checks.length} passed.`);
  process.exit(checks.some(c => !c.pass) ? 1 : 0);
}
let worker;
try {
  const response = await page.goto(`${origin}/offline`, { waitUntil: "networkidle" });
  note("online offline-page response", response?.status() === 200, String(response?.status()));
  await page.getByRole("heading", { name: "Saved study packs" }).waitFor({ timeout: 30000 });
  worker = await page.evaluate(async () => {
    const r = await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }));
    return { script: r.active?.scriptURL, controlled: !!navigator.serviceWorker.controller };
  });
  note("production service worker active and controlling", worker.controlled && worker.script.endsWith("/sw.js"), JSON.stringify(worker));
  const assetPaths = ["/assets/fonts/roboto-slab-latin.woff2", "/assets/work/college-classroom-1920.webp"];
  const fetched = await page.evaluate(async paths => Promise.all(paths.map(async p => ({ path: p, status: (await fetch(p)).status }))), assetPaths);
  note("public campus assets requested online", fetched.every(x => x.status === 200), JSON.stringify(fetched));
  await page.waitForFunction(async paths => {
    const keys = await caches.keys();
    const all = await Promise.all(keys.map(k => caches.open(k)));
    return (await Promise.all(paths.map(async p => (await Promise.all(all.map(c => c.match(p)))).some(Boolean)))).every(Boolean);
  }, assetPaths, { timeout: 15000 });
  const before = await page.evaluate(async () => {
    const entries = [];
    for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys()) entries.push({ cache: name, path: new URL(request.url).pathname, query: new URL(request.url).search });
    return entries;
  });
  note("campus font and scene in shared cache", assetPaths.every(p => before.some(e => e.path === p)), `${before.length} cache entries`);
  const unsafe = before.filter(e => e.path !== "/offline" && (/^\/(?:api|auth|dashboard|assignments|notes|classes|storage|uploads)(?:\/|$)/i.test(e.path) || /student.?logo|\.pdf$/i.test(e.path) || /(?:^|[?&])_rsc=/.test(e.query)));
  note("no private route, RSC, API, upload, or student logo cached", unsafe.length === 0, JSON.stringify(unsafe));

  // Simulated owner and document exist only in this disposable browser context.
  // The fake session has no valid signature and all non-local requests are blocked.
  const environment = await readFile(".env.local", "utf8");
  const projectUrl = environment.match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^\s"']+)/m)?.[1];
  if (!projectUrl) throw new Error("Public Supabase URL missing; cannot construct isolated synthetic cookie name");
  const projectRef = new URL(projectUrl).hostname.split(".")[0];
  const ownerId = randomUUID(), deviceId = randomUUID(), assignmentId = randomUUID(), bundleId = randomUUID();
  const digest = "a".repeat(64), passage = "Chlorophyll helps plants capture light for photosynthesis.";
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const expiry = Math.floor(Date.now() / 1000) + 3600;
  const payload = Buffer.from(JSON.stringify({ sub: ownerId, exp: expiry, role: "authenticated" })).toString("base64url");
  const session = { access_token: `${header}.${payload}.fake`, refresh_token: "synthetic-only", expires_in: 3600, expires_at: expiry, token_type: "bearer", user: { id: ownerId, aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {} } };
  await context.addCookies([{ name: `sb-${projectRef}-auth-token`, value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`, url: origin, sameSite: "Lax" }]);
  const now = Date.now();
  const pack = { version: "offline-learning-v1", id: bundleId, ownerId, deviceId, assignmentId, classId: null, title: "Synthetic biology review", createdAt: new Date(now - 1000).toISOString(), expiresAt: new Date(now + 86400000).toISOString(), chunks: [{ id: digest, versionId: digest, ownerId, assignmentId, classId: null, subject: "math", text: passage, anchors: [{ versionId: digest, blockId: digest, contentHash: digest, location: { page: 1, pageLabel: "Page 1", startOffset: 0, endOffset: passage.length }, exactText: passage }], skillIds: [], problemNumber: null }], exercises: [{ label: "Explain", id: "exercise-1", prompt: "Explain how plants capture light.", skillId: "test-skill", check: { kind: "reading", rubric: ["Use the source."] } }] };
  pack.hash = createHash("sha256").update(JSON.stringify(pack)).digest("hex");
  await page.evaluate(async ({ ownerId, deviceId, pack }) => {
    localStorage.setItem("diana-learning-device-id", deviceId);
    const db = await new Promise((resolve, reject) => { const req = indexedDB.open("keyval-store", 1); req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains("keyval")) req.result.createObjectStore("keyval"); }; req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
    await new Promise((resolve, reject) => { const tx = db.transaction("keyval", "readwrite"); tx.objectStore("keyval").put(pack, `diana-offline:v2:${ownerId}:learning-package:${pack.id}`); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
    db.close();
  }, { ownerId, deviceId, pack });
  upstreamOnline = false;
  proxy.closeAllConnections();
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Saved study packs" }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(1600);
  note("offline reload renders saved study pack page", await page.getByRole("heading", { name: "Saved study packs" }).isVisible());
  const packVisible = await page.getByText("Synthetic biology review", { exact: true }).isVisible().catch(() => false);
  note("synthetic owner-bound pack opens after offline reload", packVisible, packVisible ? "" : "Synthetic session or pack was not accepted; real-account offline persistence unverified.");
  if (packVisible) {
    await page.getByLabel("Find a passage").fill("chlorophyll");
    note("offline saved pack search", await page.getByText(passage).isVisible());
    await page.getByLabel("Your response").fill("Plants use chlorophyll to capture light.");
    await page.getByRole("button", { name: "Save draft" }).click();
    const savedNotice = page.getByText("Draft saved. It will appear in Notes when connected.");
    await savedNotice.waitFor({ timeout: 10000 });
    note("offline draft save", await savedNotice.isVisible());
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByLabel("Your response").waitFor({ timeout: 15000 });
    await page.waitForFunction(() => document.querySelector('textarea')?.value === 'Plants use chlorophyll to capture light.', null, { timeout: 10000 });
    note("offline draft survives reload", await page.getByLabel("Your response").inputValue() === "Plants use chlorophyll to capture light.");
  }
  const desktop = await page.evaluate(() => ({ title: document.querySelector("h1")?.innerText, wordmark: document.querySelector('[data-student-navigation]')?.innerText.includes('DIANA'), scene: getComputedStyle(document.querySelector('[data-campus-family]')).getPropertyValue('--campus-scene-image'), body: getComputedStyle(document.body).backgroundColor, scroll: document.documentElement.scrollWidth, width: innerWidth, text: document.body.innerText }));
  note("offline page uses campus shell and wordmark", desktop.wordmark && desktop.scene.includes("/assets/work/"), JSON.stringify({ wordmark: desktop.wordmark, scene: desktop.scene, body: desktop.body }));
  note("no fabricated percentage on offline page", !/\b\d+\s*%/.test(desktop.text));
  await page.screenshot({ path: `${output}/offline-desktop.png`, fullPage: true });
  const offlineCached = await page.evaluate(async paths => Promise.all(paths.map(async p => ({ path: p, status: (await fetch(p)).status }))), assetPaths);
  note("cached campus assets available while offline", offlineCached.every(x => x.status === 200), JSON.stringify(offlineCached));
  const navResponse = await page.goto(`${origin}/offline-qa-unvisited-${randomUUID()}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const nav = await page.evaluate(() => ({ title: document.title, url: location.href, online: navigator.onLine, heading: document.querySelector('h1')?.innerText, text: document.body.innerText.slice(0, 300) }));
  const fallbackVisible = await page.getByRole("heading", { name: "Saved study packs" }).isVisible().catch(() => false);
  note("offline navigation falls back to saved packs", fallbackVisible, JSON.stringify({ status: navResponse?.status(), fromWorker: navResponse?.fromServiceWorker(), ...nav }));
  if (!fallbackVisible) await page.goto(`${origin}/offline`, { waitUntil: "domcontentloaded" });
  const assignmentsResponse = await page.goto(`${origin}/assignments?offlineqa=${randomUUID()}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  const assignmentFallback = await page.getByRole("heading", { name: "Saved study packs" }).isVisible().catch(() => false);
  note("offline assignment navigation falls back to saved packs", assignmentFallback, JSON.stringify({ status: assignmentsResponse?.status(), fromWorker: assignmentsResponse?.fromServiceWorker(), url: page.url() }));
  if (!assignmentFallback) await page.goto(`${origin}/offline`, { waitUntil: "domcontentloaded" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${output}/offline-phone.png`, fullPage: true });
  const phone = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  note("offline phone layout has no horizontal overflow", phone.scroll <= phone.width, JSON.stringify(phone));

  // Separate fresh context without a service-worker cache proves image failure.
  upstreamOnline = true;
  const failureContext = await pw.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  await failureContext.route("**/*", route => new URL(route.request().url()).origin !== origin || new URL(route.request().url()).pathname.startsWith('/assets/work/') ? route.abort() : route.continue());
  const failurePage = await failureContext.newPage();
  await failurePage.goto(`${origin}/offline`, { waitUntil: "networkidle" });
  const fallback = await failurePage.evaluate(() => { const root = document.querySelector('[data-campus-shell]'); const heading = document.querySelector('h1'); return { bg: getComputedStyle(root).backgroundColor, color: getComputedStyle(heading).color, heading: heading.innerText }; });
  note("failed scene image leaves readable fallback", fallback.heading.toLowerCase() === "saved study packs" && fallback.bg !== "rgba(0, 0, 0, 0)", JSON.stringify(fallback));
  await failurePage.screenshot({ path: `${output}/scene-failure-phone.png`, fullPage: true });
  await failureContext.close();
} catch (e) { note("browser test completed", false, String(e)); }

// Execute only the pure native error-rendering function in an Electron mock.
try {
  const source = await readFile("electron/main.cjs", "utf8");
  const mockApp = { whenReady: () => ({ then() {} }), on() {}, quit() {} };
  const sandbox = { require: id => id === "electron" ? { app: mockApp, BrowserWindow: function () {}, session: {}, shell: {} } : id === "node:path" ? path : (() => { throw new Error(`Unexpected require ${id}`); })(), process: { env: {}, platform: "win32" }, __dirname: path.resolve("electron"), URL, console };
  const render = runInNewContext(`${source}\nrenderLaunchError`, sandbox);
  const html = render(-105, '<img src=x onerror="alert(1)">', 'http://127.0.0.1:3140/?input="<svg onload=alert(1)>');
  const ep = await context.newPage();
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await ep.setViewportSize(viewport);
    await ep.setContent(html);
    const info = await ep.evaluate(() => ({ img: document.querySelectorAll('img,svg,script').length, text: document.body.textContent, scroll: document.documentElement.scrollWidth, width: innerWidth, retryHeight: document.querySelector('a').getBoundingClientRect().height, href: document.querySelector('a').getAttribute('href') }));
    note(`native error escapes untrusted text ${viewport.width}`, info.img === 0 && info.text.includes('<img src=x onerror="alert(1)">') && info.href === 'http://localhost:3000', JSON.stringify({ ...info, text: undefined }));
    note(`native error retry target at least 44px ${viewport.width}`, info.retryHeight >= 44, `${info.retryHeight}px`);
    note(`native error no horizontal overflow ${viewport.width}`, info.scroll <= info.width, JSON.stringify({ scroll: info.scroll, width: info.width }));
    await ep.screenshot({ path: `${output}/native-error-${viewport.width}.png`, fullPage: true });
  }
  await ep.close();
} catch (e) { note("native error renderer check", false, String(e)); }
await context.close();
await pw.close();
await new Promise(resolve => proxy.close(resolve));
await writeFile(`${output}/results.json`, JSON.stringify({ generatedAt: new Date().toISOString(), origin, checks, pageErrors: errors }, null, 2));
console.log(`Results: ${checks.filter(c => c.pass).length}/${checks.length} passed; ${errors.length} browser page errors.`);
process.exitCode = checks.some(c => !c.pass) ? 1 : 0;
