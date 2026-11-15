import { afterEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadIngestionSession, validateIngestionSession } from "./ingestion-session";

const ownerId = "11111111-1111-4111-8111-111111111111";
const pin = { ownerId, url: "https://example.supabase.co" };
const jwt = (payload: object) => "eyJhbGciOiJIUzI1NiJ9." + Buffer.from(JSON.stringify(payload)).toString("base64url") + ".synthetic";
const session = (overrides = {}) => ({ url: pin.url, publicKey: "sb_publishable_synthetic", accessToken: jwt({ role: "authenticated", sub: ownerId, exp: 2_000_000_000 }), ...overrides });
const directories: string[] = [];
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "diana-ingestion-test-")); directories.push(root);
  if (process.platform === "win32") execFileSync("icacls.exe", [root, "/inheritance:r", "/grant:r", os.userInfo().username + ":(OI)(CI)F"], { windowsHide: true, stdio: "pipe" });
  const repository = path.join(root, "repository"); await mkdir(repository);
  const filename = path.join(root, "session.json");
  await writeFile(filename, JSON.stringify(session()), { mode: 0o600 });
  return { root, repository, filename };
}
afterEach(async () => { for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true }); });

// Exercise actual Windows ACL subprocesses without changing the ACL checks.
describe("private ingestion credentials", { timeout: 30_000 }, () => {
  it("reads current bounded private credentials and accepts same-owner rotation", async () => {
    const { filename, repository } = await fixture();
    const initial = await loadIngestionSession(filename, repository, pin, 1_900_000_000_000);
    const rotated = session({ accessToken: jwt({ role: "authenticated", sub: ownerId, exp: 2_100_000_000 }) });
    await writeFile(filename, JSON.stringify(rotated));
    expect((await loadIngestionSession(filename, repository, pin, 1_900_000_000_000)).accessToken).not.toBe(initial.accessToken);
  });
  it("rejects another owner, endpoint, expired token and service credentials", () => {
    expect(() => validateIngestionSession(session({ url: "https://other.supabase.co" }), pin)).toThrow("endpoint_changed");
    expect(() => validateIngestionSession(session({ accessToken: jwt({ role: "authenticated", sub: "other", exp: 2_000_000_000 }) }), pin)).toThrow("owner_changed");
    expect(() => validateIngestionSession(session(), pin, 2_000_000_000_000)).toThrow("session_expired");
    expect(() => validateIngestionSession(session({ publicKey: jwt({ role: "service_role" }) }), pin)).toThrow("public_key_required");
    expect(() => validateIngestionSession(session({ accessToken: jwt({ role: "service_role", sub: ownerId, exp: 2_000_000_000 }) }), pin)).toThrow("owner_changed");
  });
  it("rejects endpoint credentials, paths, query strings, remote HTTP and oversized fields", () => {
    for (const url of ["https://user:password@example.supabase.co", pin.url + "/other", pin.url + "?token=secret", "http://example.supabase.co"]) {
      expect(() => validateIngestionSession(session({ url }), { ...pin, url })).toThrow();
    }
    expect(() => validateIngestionSession(session({ accessToken: "x".repeat(8193) }), pin)).toThrow();
  });
  it("rejects repository and public files while allowing a sibling with a shared prefix", async () => {
    const { root, repository } = await fixture();
    const publicDirectory = path.join(repository, "public"); await mkdir(publicDirectory);
    for (const dir of [repository, publicDirectory]) {
      const filename = path.join(dir, "session.json"); await writeFile(filename, JSON.stringify(session()), { mode: 0o600 });
      await expect(loadIngestionSession(filename, repository, pin)).rejects.toThrow("private_path_required");
    }
    const sibling = path.join(root, "repository-private"); await mkdir(sibling, { mode: 0o700 });
    if (process.platform === "win32") execFileSync("icacls.exe", [sibling, "/inheritance:r", "/grant:r", os.userInfo().username + ":(OI)(CI)F"], { windowsHide: true, stdio: "pipe" });
    const filename = path.join(sibling, "session.json"); await writeFile(filename, JSON.stringify(session()), { mode: 0o600 });
    expect((await loadIngestionSession(filename, repository, pin)).url).toBe(pin.url);
  });
  it("rejects a junction or symlink ancestor even when its destination is outside the repository", async () => {
    const { root, repository } = await fixture();
    const privateDirectory = path.join(root, "private"); await mkdir(privateDirectory);
    await writeFile(path.join(privateDirectory, "session.json"), JSON.stringify(session()), { mode: 0o600 });
    const linked = path.join(root, "linked"); await symlink(privateDirectory, linked, process.platform === "win32" ? "junction" : "dir");
    await expect(loadIngestionSession(path.join(linked, "session.json"), repository, pin)).rejects.toThrow("symlink_rejected");
  });
  it("rejects oversized files, directories and relative paths", async () => {
    const { filename, repository, root } = await fixture();
    await writeFile(filename, "x".repeat(16_001));
    await expect(loadIngestionSession(filename, repository, pin)).rejects.toThrow("private_file_required");
    await expect(loadIngestionSession(root, repository, pin)).rejects.toThrow();
    await expect(loadIngestionSession("session.json", repository, pin)).rejects.toThrow("private_path_required");
  });
  it("rejects a credential file with broad permissions", async () => {
    const { filename, repository } = await fixture();
    if (process.platform === "win32") {
      execFileSync("icacls.exe", [filename, "/grant", "*S-1-1-0:R"], { windowsHide: true, stdio: "pipe" });
    } else {
      const { chmod } = await import("node:fs/promises"); await chmod(filename, 0o644);
    }
    await expect(loadIngestionSession(filename, repository, pin)).rejects.toThrow(/private_(acl|file)_required/);
  });
});
