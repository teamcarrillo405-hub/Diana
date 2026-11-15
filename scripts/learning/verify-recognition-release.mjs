import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const origin = new URL(process.argv[2] ?? "");
if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash
  || !/^diana(?:-[a-z0-9-]+)?\.vercel\.app$/u.test(origin.hostname)) throw new Error("An explicit Diana HTTPS deployment origin is required.");
const local = JSON.parse(await readFile("public/vendor/diana-recognition/runtime-manifest.json", "utf8"));
const checks = [];
async function request(route) {
  const response = await fetch(new URL(route, origin), { redirect: "manual", signal: AbortSignal.timeout(90_000) });
  if (response.status !== 200) throw new Error(`${route}: expected public 200, received ${response.status}`);
  return response;
}
const health = await (await request("/api/health")).json();
if (health.status !== "ok") throw new Error("Application health probe did not pass.");
const login = await request("/login");
const csp = login.headers.get("content-security-policy") ?? "";
if (!csp.includes("'wasm-unsafe-eval'") || !csp.includes("https://us.aws.cdn.hf.co") || csp.includes(" 'unsafe-eval'")) throw new Error("Production recognition CSP differs from the approved policy.");
const remote = await (await request("/vendor/diana-recognition/runtime-manifest.json")).json();
if (JSON.stringify(remote) !== JSON.stringify(local)) throw new Error("Deployed runtime manifest differs from the reviewed local build.");
for (const [name, expected] of Object.entries(local.files)) {
  if (!/^[a-zA-Z0-9.-]+$/u.test(name)) throw new Error("Unexpected runtime asset name.");
  const response = await request(`/vendor/diana-recognition/${name}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (bytes.length !== expected.bytes || sha256 !== expected.sha256) throw new Error(`Runtime asset mismatch: ${name}`);
  if (name.endsWith(".wasm") && !response.headers.get("content-type")?.includes("application/wasm")) throw new Error("WASM content type is unavailable.");
  checks.push({ name, bytes: bytes.length, sha256, status: 200 });
}
for (const route of ["/api/learning/course-practice", "/api/learning/local-recognition", "/vendor/diana-recognition/private.json"]) {
  const response = await fetch(new URL(route, origin), { redirect: "manual", signal: AbortSignal.timeout(30_000) });
  if (response.status !== 307 || new URL(response.headers.get("location") ?? "", origin).pathname !== "/login") throw new Error(`Private route lost authentication: ${route}`);
}
const result = { version: "recognition-web-release-v1", origin: origin.origin, createdAt: new Date().toISOString(), status: "passed", health, publicRuntimeHashes: checks, privateRoutesRequireAuth: true,
  qualification: "Public HTTP, CSP and byte parity only. Authenticated practice and actual recognition need separate browser verification." };
const directory = path.resolve("artifacts/learning-engine/research/web-release");
await mkdir(directory, { recursive: true });
const output = path.join(directory, `canary-${Date.now()}.json`);
await writeFile(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ status: result.status, origin: result.origin, runtimeFiles: checks.length, output }));
