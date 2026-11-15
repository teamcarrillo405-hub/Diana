import { constants } from "node:fs";
import { execFile } from "node:child_process";
import { lstat, open, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { privateIngestionPath } from "./ingestion-session";
import { renewIngestionSession, renewalRecordSchema, type RenewalPin, type RenewalRecord } from "./ingestion-renewal";

const runFile = promisify(execFile), MAX_BYTES = 24_000;
async function verifyPrivate(target: string, repository: string) {
  await privateIngestionPath(target, repository);
  if (process.platform === "win32") {
    const root = process.env.SystemRoot;
    if (!root || !path.isAbsolute(root)) throw new Error("renewal_private_acl_required");
    const powershell = path.join(root, "System32", "WindowsPowerShell", "v1.0");
    const env = { ...process.env }; for (const key of Object.keys(env)) if (key.toLowerCase() === "psmodulepath") delete env[key];
    env.PSModulePath = path.join(powershell, "Modules");
    for (const candidate of [path.dirname(target), target]) await runFile(path.join(powershell, "powershell.exe"),
      ["-NoProfile", "-NonInteractive", "-File", fileURLToPath(new URL("../../scripts/learning/verify-private-acl.ps1", import.meta.url)), "-LiteralPath", candidate],
      { windowsHide: true, timeout: 10_000, maxBuffer: 4096, env });
  } else {
    for (const candidate of [path.dirname(target), target]) {
      const stat = await lstat(candidate);
      if ((stat.mode & 0o077) || (typeof process.getuid === "function" && stat.uid !== process.getuid())) throw new Error("renewal_private_acl_required");
    }
  }
}
async function readPrivate(target: string, repository: string): Promise<string> {
  await verifyPrivate(target, repository);
  const file = await open(target, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const before = await file.stat();
    if (!before.isFile() || before.nlink !== 1 || before.size > MAX_BYTES) throw new Error("renewal_private_file_required");
    const bytes = Buffer.alloc(MAX_BYTES + 1), read = await file.read(bytes, 0, bytes.length, 0);
    const after = await file.stat(), current = await lstat(target);
    if (read.bytesRead !== before.size || after.size !== before.size || after.mtimeMs !== before.mtimeMs ||
        current.ino !== before.ino || current.dev !== before.dev || current.isSymbolicLink()) throw new Error("renewal_store_changed");
    await verifyPrivate(target, repository);
    return bytes.subarray(0, read.bytesRead).toString("utf8");
  } finally { await file.close(); }
}

/** Existing operator-provisioned file only. Never creates a delegation or acquires a credential. */
export async function loadRenewingIngestionSession(options: {
  filename: string; repository: string; pin: RenewalPin; signal?: AbortSignal; fetch?: typeof fetch; now?: () => number;
}) {
  const target = await privateIngestionPath(options.filename, options.repository);
  await verifyPrivate(target, options.repository);
  const lockName = target + ".lock";
  // A surviving crash lock requires operator reconciliation; no stale-lock auto-delete.
  const lock = await open(lockName, "wx", 0o600);
  try {
    let previous = await readPrivate(target, options.repository);
    const persist = async (record: RenewalRecord) => {
      const next = JSON.stringify(renewalRecordSchema.parse(record));
      if (Buffer.byteLength(next) > MAX_BYTES || await readPrivate(target, options.repository) !== previous) throw new Error("renewal_store_changed");
      const temporary = target + "." + randomUUID() + ".tmp";
      const handle = await open(temporary, "wx", 0o600);
      try { await handle.writeFile(next, "utf8"); await handle.sync(); } finally { await handle.close(); }
      try {
        await verifyPrivate(temporary, options.repository);
        if (await readPrivate(target, options.repository) !== previous) throw new Error("renewal_store_changed");
        await rename(temporary, target);
        if (process.platform !== "win32") { const directory = await open(path.dirname(target), constants.O_RDONLY); try { await directory.sync(); } finally { await directory.close(); } }
        previous = next;
      } finally { await unlink(temporary).catch(() => undefined); }
    };
    return await renewIngestionSession({ record: JSON.parse(previous), pin: options.pin, persist,
      signal: options.signal, fetch: options.fetch, now: options.now });
  } finally { await lock.close(); await unlink(lockName); }
}
