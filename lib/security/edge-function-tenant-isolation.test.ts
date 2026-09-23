import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const functionsRoot = join(process.cwd(), "supabase/functions");
const compatibilityEntries = new Set(["assignment-review-v2"]);
const publicTokenFunctions = new Set(["early-access-confirm", "early-access-signup", "early-access-unsubscribe"]);
const studentFunctions = readdirSync(functionsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== "_shared" && !compatibilityEntries.has(entry.name) && !publicTokenFunctions.has(entry.name))
  .map((entry) => ({
    name: entry.name,
    source: readFileSync(join(functionsRoot, entry.name, "index.ts"), "utf8"),
  }));

describe("Edge Function tenant boundary", () => {
  it("guards public waitlist endpoints with origin, method, and rate-limit checks", () => {
    for (const name of publicTokenFunctions) {
      const source = readFileSync(join(functionsRoot, name, "index.ts"), "utf8");
      expect(source).toContain("withEarlyAccessCors(withEarlyAccessFailureBoundary(");
      expect(source).toContain('request.method !== "POST"');
      expect(source).toContain("reserveEarlyAccessRateLimits(supabase, rateLimitKeys)");
      if (name !== "early-access-signup") {
        expect(source).toContain("parseEarlyAccessToken(parsedBody.value)");
        expect(source).toContain('.eq("confirmation_token", token)');
      }
    }
  });

  it("routes every student-callable handler through the shared security guard", () => {
    expect(studentFunctions.length).toBeGreaterThan(20);
    for (const fn of studentFunctions) {
      expect(fn.source, `${fn.name} must import the shared handler`).toContain(
        'from "../_shared/student-handler.ts"',
      );
      expect(fn.source, `${fn.name} must use the shared handler`).toContain(
        `Deno.serve(withStudentSecurity("${fn.name}"`,
      );
    }
  });

  it("keeps the compatibility entry pointed at the guarded implementation", () => {
    const source = readFileSync(join(functionsRoot, "assignment-review-v2/index.ts"), "utf8");
    expect(source).toContain('import "../assignment-review/index.ts"');
  });

  it("contains no wildcard CORS policy in a student handler", () => {
    for (const fn of studentFunctions) {
      expect(fn.source, `${fn.name} still has wildcard CORS`).not.toMatch(
        /["']Access-Control-Allow-Origin["']\s*:\s*["']\*["']/,
      );
    }
  });

  it("authenticates and checks profile state before creating service access", () => {
    const guard = readFileSync(join(functionsRoot, "_shared/student-auth.ts"), "utf8");
    const authIndex = guard.indexOf("userClient.auth.getUser()");
    const profileIndex = guard.indexOf('from("profiles")');
    const deletionIndex = guard.indexOf('from("data_deletion_requests")');
    const serviceIndex = guard.indexOf("serviceClient: createClient");
    expect(authIndex).toBeGreaterThan(-1);
    expect(profileIndex).toBeGreaterThan(authIndex);
    expect(deletionIndex).toBeGreaterThan(authIndex);
    expect(serviceIndex).toBeGreaterThan(profileIndex);
    expect(serviceIndex).toBeGreaterThan(deletionIndex);
    expect(guard).toContain('eligibility.code === "under_13"');
    expect(guard).toContain('"account_deletion_active"');
    expect(guard).toContain('"ai_policy_blocked"');
  });

  it("owner-scopes ID lookups before handlers can use service-role data", () => {
    const guard = readFileSync(join(functionsRoot, "_shared/student-auth.ts"), "utf8");
    const handler = readFileSync(join(functionsRoot, "_shared/student-handler.ts"), "utf8");
    expect(guard).toContain('.eq("owner_id", ownerId)');
    expect(handler).toContain("ownedResourceFor(functionName, body)");
    expect(guard).toContain("requireOwnedNote(userClient, ownerId, noteId)");
    expect(guard).toContain("requireOwnedAssignment(userClient, ownerId, policyAssignmentId)");
  });
});
