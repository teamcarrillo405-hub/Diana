import { execFileSync } from "node:child_process";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";

/** Read-only permission check for the operator's private research paths. */
export async function verifyPrivateResearchPath(candidate: string) {
  const absolute = path.resolve(candidate);
  const resolved = await realpath(absolute);
  if ((process.platform === "win32" ? absolute.toLowerCase() : absolute)
      !== (process.platform === "win32" ? resolved.toLowerCase() : resolved)) {
    throw new Error("Private research path must not be a link or redirected path.");
  }
  if (process.platform === "win32") {
    const verifier = path.resolve("scripts/learning/verify-private-acl.ps1");
    try {
      execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-File", verifier, "-LiteralPath", absolute],
        { windowsHide: true, timeout: 10000, stdio: ["ignore", "pipe", "pipe"] });
    } catch {
      throw new Error("Private Windows ACL could not be verified. Prepare an owner-controlled directory with inheritance disabled and no broad access rules.");
    }
    return;
  }
  const info = await stat(absolute);
  const required = info.isDirectory() ? 0o700 : 0o600;
  if ((info.mode & 0o777) !== required) {
    throw new Error("Private research path must have owner-only permissions (0700 directory, 0600 file).");
  }
}
