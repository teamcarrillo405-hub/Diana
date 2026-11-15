import { afterEach, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadRenewingIngestionSession } from "./ingestion-renewal-store";

const dirs: string[] = [], now = 1_900_000_000_000;
const pin = { ownerId: "11111111-1111-4111-8111-111111111111", sessionId: "22222222-2222-4222-8222-222222222222", url: "https://example.supabase.co" };
const jwt = (seconds: number) => "header." + Buffer.from(JSON.stringify({ sub: pin.ownerId, role: "authenticated", session_id: pin.sessionId, exp: now / 1000 + seconds })).toString("base64url") + ".signature";
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "diana-renewal-")); dirs.push(root);
  if (process.platform === "win32") execFileSync("icacls.exe", [root, "/inheritance:r", "/grant:r", os.userInfo().username + ":(OI)(CI)F"], { windowsHide: true, stdio: "pipe" });
  const repository = path.join(root, "repo"); await mkdir(repository);
  const filename = path.join(root, "delegation.json");
  await writeFile(filename, JSON.stringify({ version: "ingestion-renewal-v1", state: "ready", url: pin.url,
    publicKey: "sb_publishable_synthetic", accessToken: jwt(60), refreshToken: "synthetic-refresh-old",
    delegatedAt: now - 1000, delegationExpiresAt: now + 3_600_000 }), { mode: 0o600 });
  return { filename, repository, pin, now: () => now };
}
afterEach(async () => { for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true }); });
// Exercise actual Windows ACL subprocesses without changing the ACL checks.
describe("private rotating ingestion store", { timeout: 30_000 }, () => {
  it("atomically journals and rotates the actual private file", async () => {
    const options = await fixture();
    const transport = vi.fn(async (input: string | URL | Request) => {
      expect(JSON.parse(await readFile(options.filename, "utf8")).state).toBe("refreshing");
      return String(input).endsWith("/user") ? Response.json({ id: pin.ownerId }) : Response.json({ access_token: jwt(3600),
        refresh_token: "synthetic-refresh-new", token_type: "bearer", user: { id: pin.ownerId } });
    });
    expect((await loadRenewingIngestionSession({ ...options, fetch: transport })).accessToken).toBe(jwt(3600));
    expect(JSON.parse(await readFile(options.filename, "utf8"))).toMatchObject({ state: "ready", refreshToken: "synthetic-refresh-new" });
  }, 30_000);
  it("retains an ambiguous journal and will not retry after restart", async () => {
    const options = await fixture(), transport = vi.fn(async () => { throw new Error("network"); });
    await expect(loadRenewingIngestionSession({ ...options, fetch: transport })).rejects.toThrow("reauthorization_required");
    await expect(loadRenewingIngestionSession({ ...options, fetch: transport })).rejects.toThrow("ambiguous_previous_attempt");
    expect(transport).toHaveBeenCalledTimes(1);
  }, 30_000);
  it("will not remove an existing lock or load credentials from a checkout", async () => {
    const options = await fixture(), transport = vi.fn();
    await writeFile(options.filename + ".lock", "existing", { mode: 0o600 });
    await expect(loadRenewingIngestionSession({ ...options, fetch: transport })).rejects.toThrow();
    expect(await readFile(options.filename + ".lock", "utf8")).toBe("existing");
    const checkoutFile = path.join(options.repository, "delegation.json");
    await writeFile(checkoutFile, await readFile(options.filename), { mode: 0o600 });
    await expect(loadRenewingIngestionSession({ ...options, filename: checkoutFile, fetch: transport })).rejects.toThrow("private_path_required");
    expect(transport).not.toHaveBeenCalled();
  }, 30_000);
});
