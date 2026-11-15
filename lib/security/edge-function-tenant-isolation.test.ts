import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const functionsRoot = join(process.cwd(), "supabase/functions");
const compatibilityEntries = new Set(["assignment-review-v2"]);
const publicTokenFunctions = new Set([
  "early-access-confirm",
  "early-access-signup",
  "early-access-unsubscribe",
]);
const studentFunctions = readdirSync(functionsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== "_shared" && !compatibilityEntries.has(entry.name) && !publicTokenFunctions.has(entry.name))
  .map((entry) => ({
    name: entry.name,
    source: readFileSync(join(functionsRoot, entry.name, "index.ts"), "utf8"),
  }));

describe("Edge Function tenant boundary", () => {
  it("routes every student-callable handler through the shared security guard", () => {
    expect(studentFunctions.length).toBeGreaterThan(20);
    for (const fn of studentFunctions) {
      if (fn.name === "learning-integrated-execution") {
        // The research handler additionally binds a server-owned plan and
        // repeats the shared authentication/policy check before each release.
        expect(fn.source).toContain("Deno.serve(withStudentCors(");
        expect(fn.source).toContain("createIntegratedExecutionHandler({");
        expect(fn.source).toContain("requireStudentContext(request, { assignmentId, requireAiGreen: true })");
        expect(fn.source).toContain("runSafeBudgetedAiCall({");
        expect(fn.source).toContain("recordIntegratedResearchAssistance(auth.serviceClient, auth.ownerId, plan, row)");
        continue;
      }
      expect(fn.source, `${fn.name} must import the shared handler`).toContain(
        'from "../_shared/student-handler.ts"',
      );
      expect(fn.source, `${fn.name} must use the shared handler`).toContain(
        `Deno.serve(withStudentSecurity("${fn.name}"`,
      );
    }
  });

  it("keeps the research execution handler scoped to its approved operator and current owned sources", () => {
    const handler = readFileSync(join(functionsRoot, "_shared/learning/integrated-execution-handler.ts"), "utf8");
    expect(handler).toContain("request.method !== 'POST'");
    expect(handler).toContain("deps.env('DIANA_INTEGRATED_EXECUTION_ENABLED') !== 'true'");
    expect(handler).toContain("auth.ownerId !== plan.operatorId");
    expect(handler).toContain("await deps.authenticate(request, row.assignmentId)");
    expect(handler).toContain("await deps.verifySources(auth, row)");
    expect(handler).toContain("await deps.recordAssistance(current, row,");
    expect(handler).toContain("policy_changed_before_screening");
    expect(handler).toContain("policy_or_approval_changed");
    expect(handler).toContain("beforeRelease.ownerId !== plan.operatorId");
  });

  it("keeps the compatibility entry pointed at the guarded implementation", () => {
    const source = readFileSync(join(functionsRoot, "assignment-review-v2/index.ts"), "utf8");
    expect(source).toContain('import "../assignment-review/index.ts"');
  });

  it("keeps public confirmation separate from authenticated student handlers and scoped to an unguessable token", () => {
    const source = readFileSync(join(functionsRoot, "early-access-confirm/index.ts"), "utf8");
    expect(source).toContain('request.method !== "POST"');
    expect(source).toContain("parseEarlyAccessToken(parsedBody.value)");
    expect(source).toContain('.eq("confirmation_token", token)');
    expect(source).toContain('.eq("status", "pending_confirmation")');
    expect(source).toContain('.gte("confirmation_sent_at", confirmationCutoff)');
    expect(source).not.toContain('"Access-Control-Allow-Origin": "*"');
  });

  it("keeps public early-access handlers method-limited, origin-scoped, and non-enumerating", () => {
    for (const functionName of publicTokenFunctions) {
      const source = readFileSync(join(functionsRoot, `${functionName}/index.ts`), "utf8");
      expect(source, `${functionName} must require POST`).toContain('request.method !== "POST"');
      expect(source, `${functionName} must not allow wildcard origins`).not.toContain('"Access-Control-Allow-Origin": "*"');
    }
    const signup = readFileSync(join(functionsRoot, "early-access-signup/index.ts"), "utf8");
    expect(signup).toContain("reserveEarlyAccessRateLimits(supabase, rateLimitKeys)");
    expect(signup).toContain("does not reveal whether the email was already on the list");
    const unsubscribe = readFileSync(join(functionsRoot, "early-access-unsubscribe/index.ts"), "utf8");
    expect(unsubscribe).toContain("parseEarlyAccessToken(parsedBody.value)");
    expect(unsubscribe).toContain('.eq("confirmation_token", token)');
    expect(unsubscribe).toContain('.in("status", ["pending_confirmation", "confirmed"])');
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
