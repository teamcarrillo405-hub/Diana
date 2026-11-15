import { constants } from "node:fs";
import { execFile } from "node:child_process";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { z } from "zod";

const MAX_BYTES = 16_000;
const runFile = promisify(execFile);
const sessionSchema = z.object({
  url: z.string().max(2048),
  publicKey: z.string().min(1).max(4096),
  accessToken: z.string().min(1).max(8192),
}).strict();
export type IngestionSession = z.infer<typeof sessionSchema>;
export type IngestionIdentity = { ownerId: string; url: string };

export function ingestionEndpoint(value: string): string {
  const url = new URL(value);
  if (value.length > 2048 || url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))) {
    throw new Error("ingestion_endpoint_invalid");
  }
  return url.origin;
}

function claims(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts.every(part => /^[A-Za-z0-9_-]+$/.test(part))) throw new Error("ingestion_session_invalid");
  return z.record(z.string(), z.unknown()).parse(JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")));
}

/** Local claims reject unsafe inputs; the adapter MUST also verify the token with Supabase. */
export function validateIngestionSession(value: unknown, pin: IngestionIdentity, now = Date.now()): IngestionSession {
  z.string().uuid().parse(pin.ownerId);
  const session = sessionSchema.parse(value);
  session.url = ingestionEndpoint(session.url);
  if (session.url !== ingestionEndpoint(pin.url)) throw new Error("ingestion_endpoint_changed");
  const access = claims(session.accessToken);
  if (access.role !== "authenticated" || access.sub !== pin.ownerId) throw new Error("ingestion_owner_changed");
  if (typeof access.exp !== "number" || !Number.isSafeInteger(access.exp) || access.exp * 1000 <= now) throw new Error("ingestion_session_expired");
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(session.publicKey) && claims(session.publicKey).role !== "anon") {
    throw new Error("ingestion_public_key_required");
  }
  return session;
}

function inside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === "" || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(".." + path.sep));
}

/** Reject checkout files and every symlink/junction component, including links outside the checkout. */
export async function privateIngestionPath(filename: string, repository: string): Promise<string> {
  if (!path.isAbsolute(filename)) throw new Error("ingestion_private_path_required");
  const absolute = path.resolve(filename), root = await realpath(repository);
  if (inside(path.resolve(repository), absolute) || inside(root, absolute)) throw new Error("ingestion_private_path_required");
  let cursor = absolute;
  while (true) {
    if ((await lstat(cursor)).isSymbolicLink()) throw new Error("ingestion_symlink_rejected");
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  const canonical = await realpath(absolute);
  if (inside(root, canonical) || path.relative(absolute, canonical) !== "") throw new Error("ingestion_private_path_required");
  return canonical;
}

export async function loadIngestionSession(filename: string, repository: string, pin: IngestionIdentity, now = Date.now()): Promise<IngestionSession> {
  const target = await privateIngestionPath(filename, repository);
  if (process.platform === "win32") {
    const verifier = fileURLToPath(new URL("../../scripts/learning/verify-private-acl.ps1", import.meta.url));
    const windowsDirectory = process.env.SystemRoot;
    if (!windowsDirectory || !path.isAbsolute(windowsDirectory)) throw new Error("ingestion_private_acl_required");
    const powershellDirectory = path.join(windowsDirectory, "System32", "WindowsPowerShell", "v1.0");
    // Node preserves differently cased environment keys; Windows selects the first one.
    const windowsEnvironment = { ...process.env };
    for (const key of Object.keys(windowsEnvironment)) if (key.toLowerCase() === "psmodulepath") delete windowsEnvironment[key];
    windowsEnvironment.PSModulePath = path.join(powershellDirectory, "Modules");
    try {
      for (const candidate of [path.dirname(target), target]) {
        await runFile(path.join(powershellDirectory, "powershell.exe"), ["-NoProfile", "-NonInteractive", "-File", verifier, "-LiteralPath", candidate],
          { windowsHide: true, timeout: 10_000, maxBuffer: 4096, env: windowsEnvironment });
      }
    } catch { throw new Error("ingestion_private_acl_required"); }
  } else {
    const directory = await lstat(path.dirname(target));
    if ((directory.mode & 0o077) !== 0 || (typeof process.getuid === "function" && directory.uid !== process.getuid())) throw new Error("ingestion_private_acl_required");
  }
  const handle = await open(target, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.size > MAX_BYTES || before.nlink !== 1 ||
        (process.platform !== "win32" && ((before.mode & 0o077) !== 0 || (typeof process.getuid === "function" && before.uid !== process.getuid())))) throw new Error("ingestion_private_file_required");
    const buffer = Buffer.alloc(MAX_BYTES + 1);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const after = await handle.stat(), current = await lstat(target);
    await privateIngestionPath(filename, repository);
    if (bytesRead > MAX_BYTES || bytesRead !== before.size || after.size !== before.size || after.mtimeMs !== before.mtimeMs ||
        current.ino !== before.ino || current.dev !== before.dev || current.isSymbolicLink()) throw new Error("ingestion_session_changed_during_read");
    return validateIngestionSession(JSON.parse(buffer.subarray(0, bytesRead).toString("utf8")), pin, now);
  } finally { await handle.close(); }
}
