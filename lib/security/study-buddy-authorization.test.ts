import { beforeEach, describe, expect, it, vi } from "vitest";
import { studyBuddyEligibility } from "@/lib/assignment-help/study-buddy-eligibility";

const mocks = vi.hoisted(() => ({ client: null as unknown, accounting: null as unknown,
  kernel: vi.fn(), local: vi.fn(), invoke: vi.fn(), log: vi.fn(), access: vi.fn(), retrieve: vi.fn(),
  reference: vi.fn(), learner: vi.fn(), rpc: vi.fn(), formatKernel: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mocks.client }));
vi.mock("@/lib/supabase/ai-service", () => ({ createAiServiceClient: () => mocks.accounting }));
vi.mock("@/lib/ai/safety", () => ({ logInteraction: mocks.log }));
vi.mock("@/lib/math/linear-equation-tutor", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/math/linear-equation-tutor")>(), createLinearEquationStudyResponse: mocks.local,
}));
vi.mock("@/lib/learning-engine/server", () => ({ learningAccess: mocks.access,
  retrieveForAssignment: mocks.retrieve, curriculumPromptContext: vi.fn(), tutorLearningContext: mocks.learner }));
vi.mock("@/lib/assignment-help/server-understanding", () => ({ loadAssignmentHomeworkKernel: mocks.kernel,
  inferStudyHelperEvent: () => "help_requested", formatHomeworkKernelForTutor: mocks.formatKernel,
  homeworkAuthorshipMetadata: vi.fn(), homeworkModelRouting: vi.fn() }));
vi.mock("@/lib/assignment-submission-server", () => ({
  formatCanonicalSpecialistContextsForPrompt: vi.fn(), loadCanonicalSpecialistContextsForAssignment: vi.fn(),
}));
vi.mock("@/lib/learning-engine/textbook-tutor", () => ({ referenceBookSelectionSchema: { safeParse: (data: unknown) => ({ success: true, data }) },
  retrieveTextbookForTutor: mocks.reference, textbookTutorPromptContext: vi.fn(), textbookResponseAnchor: vi.fn() }));
import { POST } from "@/app/api/diana/study-buddy/route";
import { createTutorResponseEvidence } from "@/lib/ai/tutor-response-evidence";
import { resolveVisibleTutorProviderState } from "@/lib/assignment-help/provider-state";

const OWNER = "11111111-1111-4111-8111-111111111111";
const FOREIGN = "99999999-9999-4999-8999-999999999999";
const CLASS = "22222222-2222-4222-8222-222222222222";
const OTHER_CLASS = "33333333-3333-4333-8333-333333333333";
const ASSIGNMENT = "44444444-4444-4444-8444-444444444444";
type Row = Record<string, unknown>;
let rows: Record<string, Row[]>, errors: Set<string>, signedIn: boolean;
let queries: { table: string; filters: [string, unknown][] }[];
function client() {
  return {
    auth: { getUser: async () => ({ data: { user: signedIn ? { id: OWNER } : null } }) },
    functions: { invoke: mocks.invoke },
    rpc: mocks.rpc,
    from(table: string) {
      const filters: [string, unknown][] = [];
      let excludeClosed = false;
      queries.push({ table, filters });
      const result = () => ({ data: (rows[table] ?? []).filter(row => filters.every(([key, value]) => row[key] === value))
        .filter(row => !excludeClosed || !["completed", "cancelled"].includes(String(row.status))),
        error: errors.has(table) ? { message: "unavailable" } : null, count: 0 });
      const chain = {
        select: () => chain,
        eq(key: string, value: unknown) { filters.push([key, value]); return chain; },
        not(key: string, operation: string, value: string) {
          expect([key, operation, value]).toEqual(["status", "in", "(completed,cancelled)"]);
          excludeClosed = true; return chain;
        },
        gte: () => chain, limit: () => chain,
        maybeSingle: async () => { const value = result(); return { ...value, data: value.data[0] ?? null }; },
        insert: async () => ({ error: null }),
        then: <T>(resolve: (value: ReturnType<typeof result>) => T) => Promise.resolve(result()).then(resolve),
      };
      return chain;
    },
  };
}
function request(extra: Record<string, unknown> = {}, idempotencyKey?: string) {
  return new Request("https://diana.example/api/diana/study-buddy", {
    method: "POST", headers: { "Content-Type": "application/json", ...(idempotencyKey ? { "x-idempotency-key": idempotencyKey } : {}) },
    body: JSON.stringify({ source: "2x + 1 = 5", question: "I am stuck", ...extra }),
  });
}
beforeEach(() => {
  vi.clearAllMocks(); vi.unstubAllEnvs();
  signedIn = true; errors = new Set(); queries = [];
  rows = { profiles: [{ user_id: OWNER, age_bracket: "13_to_17", consent_ai: true }],
    classes: [{ id: CLASS, owner_id: OWNER, ai_mode: "green" }],
    assignments: [{ id: ASSIGNMENT, owner_id: OWNER, class_id: CLASS, ai_mode_override: null }],
    data_deletion_requests: [] };
  mocks.client = client(); mocks.accounting = client();
  mocks.local.mockReturnValue({ title: "One step", main: "Subtract one from both sides.", reason: "Keep the equation balanced.",
    steps: ["Find the constant.", "Subtract it from both sides.", "What remains?"], anchor: "The equation" });
  mocks.invoke.mockResolvedValue({ error: { context: new Response(JSON.stringify({ error: "No access." }), { status: 403 }) }, data: null });
  mocks.kernel.mockResolvedValue(null);
  mocks.access.mockResolvedValue(false);
  mocks.formatKernel.mockImplementation((kernel, options) => JSON.stringify({ assignment: kernel.assignment, sources: kernel.sources, visibleWork: options.visibleWork }));
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202" } });
});

function noTutoring() {
  expect(mocks.local).not.toHaveBeenCalled(); expect(mocks.invoke).not.toHaveBeenCalled();
  expect(mocks.kernel).not.toHaveBeenCalled(); expect(mocks.log).not.toHaveBeenCalled();
}
describe("Study Buddy authorization before all response paths", () => {
  it("requires authentication before eligibility or tutoring", async () => {
    signedIn = false;
    expect((await POST(request())).status).toBe(401); expect(queries).toEqual([]); noTutoring();
  });
  it.each([
    { age_bracket: "under_13", consent_ai: true }, { age_bracket: "unknown", consent_ai: true },
    { age_bracket: null, consent_ai: true }, { age_bracket: "adult", consent_ai: false },
  ])("rejects an ineligible profile even in deterministic QA mode: %j", async profile => {
    rows.profiles = [{ user_id: OWNER, ...profile }];
    vi.stubEnv("QA_CREATE_USER", "true");
    expect((await POST(request({ qaScenario: "tutor-chat:default" }))).status).toBe(403); noTutoring();
  });
  it("rejects a missing owned profile", async () => {
    rows.profiles[0].user_id = FOREIGN;
    expect((await POST(request())).status).toBe(403); noTutoring();
  });
  it.each(["requested", "processing", "failed", "db_purge_failed", "unexpected_state"])("blocks deletion state %s", async status => {
    rows.data_deletion_requests = [{ owner_id: OWNER, status }];
    expect((await POST(request())).status).toBe(403); noTutoring();
  });
  it.each(["profiles", "data_deletion_requests", "classes", "assignments"])("fails closed when %s cannot be read", async table => {
    errors.add(table);
    expect((await POST(request({ assignmentId: ASSIGNMENT }))).status).toBe(503); noTutoring();
  });
  it.each(["red", "yellow", "unknown", null])("blocks class policy %s without requiring a reference book", async mode => {
    rows.classes[0].ai_mode = mode;
    expect((await POST(request({ classId: CLASS }))).status).toBe(403); noTutoring();
  });
  it.each(["red", "yellow", "unknown"])("blocks stored assignment override %s before kernel side effects", async mode => {
    rows.assignments[0].ai_mode_override = mode;
    expect((await POST(request({ assignmentId: ASSIGNMENT }))).status).toBe(403); noTutoring();
  });
  it.each(["classes", "assignments"])("rejects a foreign owned scope in %s", async table => {
    rows[table][0].owner_id = FOREIGN;
    expect((await POST(request({ assignmentId: ASSIGNMENT, classId: CLASS }))).status).toBe(404); noTutoring();
  });
  it("rejects an assignment/class mismatch even if both classes are owned", async () => {
    rows.classes.push({ id: OTHER_CLASS, owner_id: OWNER, ai_mode: "green" });
    expect((await POST(request({ assignmentId: ASSIGNMENT, classId: OTHER_CLASS }))).status).toBe(403); noTutoring();
  });
  it("requires the stored assignment class policy when the caller omits classId", async () => {
    rows.classes[0].ai_mode = "red";
    expect((await POST(request({ assignmentId: ASSIGNMENT }))).status).toBe(403); noTutoring();
    expect(queries.find(query => query.table === "classes")?.filters).toEqual([["id", CLASS], ["owner_id", OWNER]]);
  });
  it.each([400, 401, 403, 422, 429])("never turns Edge %s into a deterministic algebra success", async status => {
    mocks.invoke.mockResolvedValue({ error: { context: new Response(JSON.stringify({ error: "Access changed." }), { status }) }, data: null });
    const response = await POST(request({ classId: CLASS }));
    expect(response.status).toBe(status); expect(await response.json()).toMatchObject({ ok: false, error: "Access changed." });
    expect(mocks.local).toHaveBeenCalledOnce(); expect(mocks.invoke).toHaveBeenCalledOnce(); expect(mocks.log).not.toHaveBeenCalled();
  });
  it.each(["token_accounting_unavailable", "moderation_unavailable", "provider_start_not_recorded"])("preserves a structured 503 guard failure: %s", async code => {
    mocks.invoke.mockResolvedValue({ error: { context: new Response(JSON.stringify({ error: "Temporarily unavailable.", code }), { status: 503 }) }, data: null });
    const response = await POST(request());
    expect(response.status).toBe(503); expect((await response.json()).ok).toBe(false);
    expect(mocks.invoke).toHaveBeenCalledOnce();
  });
  it("keeps local-first deferred and checks the Edge authorization after local eligibility passes", async () => {
    const response = await POST(request());
    expect(response.status).toBe(403); expect(mocks.invoke).toHaveBeenCalledOnce();
  });
  it("uses the shared effective-override rule and excludes only completed/cancelled deletion requests", async () => {
    rows.classes[0].ai_mode = "yellow"; rows.assignments[0].ai_mode_override = "green";
    rows.data_deletion_requests = [{ owner_id: OWNER, status: "completed" }, { owner_id: OWNER, status: "cancelled" },
      { owner_id: FOREIGN, status: "requested" }];
    const value = await studyBuddyEligibility(mocks.client as Parameters<typeof studyBuddyEligibility>[0], {
      ownerId: OWNER, assignmentId: ASSIGNMENT, classId: null,
    });
    expect(value).toEqual({ ok: true, classId: CLASS });
  });
  it("stops a source conflict before reference retrieval, algebra, provider generation or learner assessment", async () => {
    mocks.kernel.mockResolvedValue({ assignment: { id: ASSIGNMENT, class_id: CLASS }, sources: [], trustDecision: { allowed: true } });
    mocks.access.mockResolvedValue(true);
    mocks.retrieve.mockResolvedValue({ version: "test", status: "source_conflict", method: "keyword", chunks: [] });
    const response = await POST(request({ assignmentId: ASSIGNMENT, referenceBook: { bookId: "reference-book", chapter: 1 } }));
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result).toMatchObject({ ok: true, provider: { called: false },
      evidence: { verificationLevel: "needs_more_information", confidence: 0, verifierResult: null, validatedAnchors: [] },
      learning: { interpretationVerified: false, eligibleForKnowledge: false, learner: null } });
    expect(result.response.steps.at(-1)).toBe("Which source version should we use?");
    expect(JSON.stringify(result.response).match(/\?/g)).toHaveLength(1);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.retrieve).toHaveBeenCalledOnce(); expect(mocks.reference).not.toHaveBeenCalled();
    expect(mocks.learner).not.toHaveBeenCalled(); expect(mocks.local).not.toHaveBeenCalled();
    expect(mocks.invoke).not.toHaveBeenCalled(); expect(mocks.log).not.toHaveBeenCalled();
  });
});

describe("Study Buddy durable assignment assistance before response release", () => {
  const PROBLEM = "55555555-5555-4555-8555-555555555555";
  const OTHER_ASSIGNMENT = "66666666-6666-4666-8666-666666666666";
  type Receipt = Record<string, unknown>;
  let receipts: Map<string, Receipt>;
  const receiptFor = (args: Record<string, unknown>): Receipt => ({ schemaVersion: "assignment-assistance-v1", scope: "assignment",
    requestId: args.p_request, ownerId: OWNER, assignmentId: args.p_assignment, selectedProblemId: args.p_selected_problem,
    payloadSha256: args.p_payload_sha256, channel: args.p_channel, kind: args.p_kind,
    recordedAt: "2026-09-29T02:00:00.123456+00:00", independenceBlocked: true });
  beforeEach(() => {
    vi.stubEnv("DIANA_DURABLE_TASK_ASSISTANCE_ENABLED", "true");
    receipts = new Map();
    mocks.kernel.mockImplementation(async ({ assignmentId }: { assignmentId: string }) => ({
      assignment: { id: assignmentId, class_id: CLASS }, sources: [], trustDecision: { allowed: true },
    }));
    mocks.invoke.mockResolvedValue({ error: null, data: { ok: true,
      response: { title: "One move", main: "Compare the two sides.", reason: "Keep the equality.",
        steps: ["Read the equation.", "Choose an operation.", "What happens to both sides?"], anchor: "The supplied equation." },
      evidence: createTutorResponseEvidence({ verificationLevel: "ai_guidance", confidence: 0 }),
      providerState: resolveVisibleTutorProviderState({ availability: "available" }), model: "synthetic-api", tokens: 12 } });
    mocks.rpc.mockImplementation(async (_name, args) => {
      const current = receiptFor(args), previous = receipts.get(String(args.p_request));
      if (previous && JSON.stringify(previous) !== JSON.stringify(current)) return { data: null, error: { code: "23505" } };
      receipts.set(String(args.p_request), current);
      return { data: current, error: null };
    });
  });

  it.each(["missing", "wrong_owner", "wrong_scope", "wrong_payload"])("blocks provider and output for %s assistance receipt", async failure => {
    mocks.rpc.mockImplementation(async (_name, args) => failure === "missing" ? { data: null, error: { code: "PGRST202" } }
      : { error: null, data: { ...receiptFor(args), ...(failure === "wrong_owner" ? { ownerId: FOREIGN }
        : failure === "wrong_scope" ? { scope: "task" } : { payloadSha256: "f".repeat(64) }) } });
    const response = await POST(request({ assignmentId: ASSIGNMENT }, "receipt-failure"));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.ok).toBe(false); expect(body).not.toHaveProperty("response");
    expect(mocks.invoke).not.toHaveBeenCalled(); expect(mocks.log).not.toHaveBeenCalled();
  });

  it("also blocks deterministic QA response release without a committed receipt", async () => {
    vi.stubEnv("QA_CREATE_USER", "true");
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "55000" } });
    const response = await POST(request({ assignmentId: ASSIGNMENT, qaScenario: "tutor-chat:default" }, "local-guard"));
    expect(response.status).toBe(503);
    expect(await response.json()).not.toHaveProperty("response");
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("waits for receipt commitment before provider invocation", async () => {
    let commit!: () => void;
    let entered!: () => void;
    const receiptStarted = new Promise<void>(resolve => { entered = resolve; });
    mocks.rpc.mockImplementation((_name, args) => new Promise(resolve => {
      commit = () => resolve({ data: receiptFor(args), error: null }); entered();
    }));
    const pending = POST(request({ assignmentId: ASSIGNMENT }, "wait-for-receipt"));
    await receiptStarted;
    expect(mocks.invoke).not.toHaveBeenCalled();
    commit();
    const response = await pending;
    expect(response.status).toBe(200);
    expect(mocks.invoke).toHaveBeenCalledOnce();
    expect(mocks.rpc.mock.invocationCallOrder[0]).toBeLessThan(mocks.invoke.mock.invocationCallOrder[0]);
  });

  it("keeps the same owner-bound request UUID on retries and rejects changed body or assignment scope", async () => {
    const call = (extra: Record<string, unknown> = {}) => POST(request({ assignmentId: ASSIGNMENT, ...extra }, "same-key"));
    expect((await call()).status).toBe(200);
    expect((await call()).status).toBe(200);
    expect(mocks.rpc.mock.calls[0][1].p_request).toBe(mocks.rpc.mock.calls[1][1].p_request);
    expect(mocks.rpc.mock.calls[0][1].p_request).toMatch(/^[a-f0-9-]{36}$/);
    expect(receipts.size).toBe(1);
    mocks.invoke.mockClear();
    for (const extra of [{ question: "Give a different explanation." }, { source: "3x + 2 = 11" }, { mode: "hint" }]) {
      expect((await call(extra)).status).toBe(503);
    }
    rows.assignments.push({ id: OTHER_ASSIGNMENT, owner_id: OWNER, class_id: CLASS, ai_mode_override: null });
    expect((await call({ assignmentId: OTHER_ASSIGNMENT })).status).toBe(503);
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(new Set(mocks.rpc.mock.calls.map(call => call[1].p_request)).size).toBe(1);
  });

  it("records assignment-wide scope with an owned selected problem and rejects changing selection on retry", async () => {
    rows.assignment_problems = [{ id: PROBLEM, owner_id: OWNER, assignment_id: ASSIGNMENT, problem_number: 1,
      problem_text: "Solve 2x+1=5.", source: "manual", unit_type: "problem", unit_label: null }];
    expect((await POST(request({ assignmentId: ASSIGNMENT, problemId: PROBLEM }, "selection-key"))).status).toBe(200);
    const [name, args] = mocks.rpc.mock.calls[0];
    expect(name).toBe("learning_begin_assignment_assistance");
    expect(args).toMatchObject({ p_assignment: ASSIGNMENT, p_selected_problem: PROBLEM, p_channel: "api" });
    expect(args).not.toHaveProperty("p_task"); expect(args).not.toHaveProperty("p_owner");
    expect(receipts.get(args.p_request)).toMatchObject({ scope: "assignment", selectedProblemId: PROBLEM });
    mocks.invoke.mockClear();
    expect((await POST(request({ assignmentId: ASSIGNMENT }, "selection-key"))).status).toBe(503);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it.each(["matched", "missing", "different", "hint"])("releases a worked solution only for its exact selected guide problem (%s)", async (scope) => {
    rows.assignment_problems = [{ id: PROBLEM, owner_id: OWNER, assignment_id: ASSIGNMENT, problem_number: 1,
      problem_text: "Find the slope of x² at x=2.", source: "manual", unit_type: "problem", student_work: { work: "I substituted into f(x) first." } }];
    mocks.local.mockReturnValue(null);
    const workedSolution = { answer: "4", steps: ["Differentiate x² to get 2x.", "Evaluate 2x at x=2."], checkQuestion: "What does the derivative measure?" };
    mocks.invoke.mockResolvedValue({ error: null, data: { ok: true,
      response: { title: "Tangent slope", main: "Connect the derivative to the tangent.", reason: "The derivative gives slope.",
        steps: ["Review the power rule."], anchor: "Selected problem", workedSolution },
      ...(scope !== "missing" ? { workedSolutionProblemId: scope === "different" ? FOREIGN : PROBLEM } : {}),
      evidence: createTutorResponseEvidence({ verificationLevel: "ai_guidance", confidence: 0 }),
      providerState: resolveVisibleTutorProviderState({ availability: "available" }), model: "synthetic-api", tokens: 12 } });
    const mode = scope === "hint" ? "hint" : "guide";
    const response = await POST(request({ assignmentId: ASSIGNMENT, problemId: PROBLEM, mode }, "worked-solution"));
    const body = await response.json();
    expect(mocks.invoke).toHaveBeenCalledWith("study-buddy", expect.objectContaining({
      body: expect.objectContaining({ assignmentId: ASSIGNMENT, problemId: PROBLEM, mode }),
    }));
    if (scope === "matched") {
      expect(response.status).toBe(200);
      expect(body.response.workedSolution).toEqual(workedSolution);
    } else {
      expect(response.status).toBe(503);
      expect(body).not.toHaveProperty("response");
    }
  });

  it("preserves the original API-channel receipt when provider unavailability uses local fallback", async () => {
    rows.assignment_problems = [{ id: PROBLEM, owner_id: OWNER, assignment_id: ASSIGNMENT, problem_number: 1,
      problem_text: "Solve 2x+1=5.", source: "manual", unit_type: "problem", unit_label: null }];
    mocks.invoke.mockResolvedValue({ error: { context: new Response(JSON.stringify({ error: "Provider unavailable." }), { status: 503 }) }, data: null });
    const response = await POST(request({ assignmentId: ASSIGNMENT, problemId: PROBLEM }, "fallback-key"));
    expect(response.status, JSON.stringify(await response.clone().json())).toBe(200);
    expect((await response.json()).ok).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.rpc.mock.calls[0][1].p_channel).toBe("api");
    expect(receipts.size).toBe(1);
  });

  const localRequest = () => request({ assignmentId: ASSIGNMENT, problemId: PROBLEM, source: '', question: 'How do I start?', mode: 'hint' }, 'initial-algebra');
  function ownedEquation() {
    rows.assignment_problems = [{ id: PROBLEM, owner_id: OWNER, assignment_id: ASSIGNMENT, problem_number: 1,
      problem_text: '2x + 3 = 9', source: 'manual', unit_type: 'problem', unit_label: null, student_work: {} }];
  }
  it('serves a bounded local initial hint without an Edge call or provider tokens', async () => {
    ownedEquation();
    vi.stubEnv('DIANA_STUDY_BUDDY_PROVIDER_ENABLED', 'false');
    mocks.access.mockResolvedValue(true);
    mocks.retrieve.mockResolvedValue({ status: 'no_evidence', chunks: [], method: 'keyword' });
    const response = await POST(localRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ response: { main: 'Subtract 3 from both sides.', anchor: 'Selected problem: 2x + 3 = 9' },
      provider: { called: false, responseOrigin: 'local', tokens: 0 },
      routing: { localCapability: 'owned-linear-initial-hint-v1' },
      evidence: { confidence: 0, verifierResult: { status: 'not_run' } } });
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(mocks.retrieve).toHaveBeenCalledWith(expect.objectContaining({ allowSemanticFallback: false }));
    expect(mocks.rpc.mock.calls[0][1]).toMatchObject({ p_channel: 'local', p_assignment: ASSIGNMENT, p_selected_problem: PROBLEM });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
  it('keeps unsupported work without calling a provider when server escalation is disabled', async () => {
    ownedEquation(); vi.stubEnv('DIANA_STUDY_BUDDY_PROVIDER_ENABLED', 'false');
    const response = await POST(request({ assignmentId: ASSIGNMENT, problemId: PROBLEM, question: 'Explain this proof' }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ provider: { called: false, tokens: 0 }, code: 'local_capability_unavailable' });
    expect(mocks.invoke).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('withholds the initial local hint until the assistance receipt commits', async () => {
    ownedEquation();
    let commit!: () => void;
    let entered!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    mocks.rpc.mockImplementation((_name, args) => new Promise(resolve => { commit = () => resolve({ data: receiptFor(args), error: null }); entered(); }));
    let finished = false;
    const pending = POST(localRequest()).then(value => { finished = true; return value; });
    await started;
    expect(finished).toBe(false); expect(mocks.invoke).not.toHaveBeenCalled();
    commit(); expect((await pending).status).toBe(200);
  });
  it('handles the actual Work chat initial request shape without a provider call', async () => {
    ownedEquation();
    const response = await POST(request({ assignmentId: ASSIGNMENT, problemId: PROBLEM,
      source: 'Work unit: 2x + 3 = 9', question: 'I am stuck',
      conversation: [{ role: 'student', text: 'I am stuck' }] }, 'work-chat-initial'));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ provider: { called: false }, response: { main: 'Subtract 3 from both sides.' } });
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('blocks the initial local hint when assistance recording is unavailable', async () => {
    ownedEquation(); mocks.rpc.mockResolvedValue({ data: null, error: { code: '55000' } });
    const response = await POST(localRequest());
    expect(response.status).toBe(503); expect(await response.json()).not.toHaveProperty('response');
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('does not route an unconfirmed imported equation locally or to Edge', async () => {
    ownedEquation(); rows.assignment_problems[0].source = 'ai_extracted';
    const response = await POST(localRequest());
    expect(response.status).toBe(409); expect(mocks.invoke).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each([{ work: 'Subtract 3' }, { answer: '3' }, { workInk: 'saved-ink' }, null])('keeps persisted work or unknown state on the broader path: %j', student_work => {
    ownedEquation(); rows.assignment_problems[0].student_work = student_work;
    return POST(localRequest()).then(async response => {
      expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ provider: { called: true, responseOrigin: 'api' } });
      expect(mocks.invoke).toHaveBeenCalledOnce();
    });
  });
});
