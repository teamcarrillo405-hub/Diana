import {
  fetchCanvasAssignments,
  getValidCanvasToken,
} from "@/lib/lms/canvas";
import {
  fetchClassroomAssignments,
  getValidGoogleToken,
  GOOGLE_CLASSROOM_SCOPES,
} from "@/lib/lms/google";
import {
  claimSubmissionReceipt,
  completeSubmissionReceipt,
  inspectCanvasSubmission,
  inspectGoogleClassroomSubmission,
  providerSubmissionReceiptStatus,
  reconcileSubmissionReceipt,
  resolveProviderSubmissionStatus,
  submitCanvasFile,
  submitCanvasText,
  submitGoogleClassroomFile,
  updateSubmissionReceiptStatus,
  type SubmissionFile,
} from "@/lib/lms/submission";
import { sha256Hex } from "@/lib/security/submission-file-integrity";
import { isAllowedDianaOrigin } from "../../supabase/functions/_shared/cors";

export type ProviderCanaryMode = "mock" | "staging";

export type ProviderCanaryCheck = {
  id: string;
  name: string;
  ok: boolean;
  detail: string;
};

export type ProviderCanaryReport = {
  ok: boolean;
  mode: ProviderCanaryMode;
  network: "intercepted" | "blocked" | "staging-providers";
  checks: ProviderCanaryCheck[];
};

type Env = Record<string, string | undefined>;
type FetchLike = typeof fetch;

const CANVAS_MOCK_ORIGIN = "https://93.184.216.34";
const CANVAS_MOCK_UPLOAD_ORIGIN = "https://93.184.216.35";
const CANARY_INSTITUTION_ID = "diana-canary";
const CANARY_IDEMPOTENCY_KEY = "11111111-1111-4111-8111-111111111111";

export const PROVIDER_CANARY_STAGING_ENV = [
  "DIANA_PROVIDER_CANARY_ALLOW_WRITES",
  "DIANA_CANARY_PREVIEW_ORIGIN",
  "DIANA_CANARY_CANVAS_BASE_URL",
  "DIANA_CANARY_CANVAS_INSTITUTION_ID",
  "DIANA_CANARY_CANVAS_ACCESS_TOKEN",
  "DIANA_CANARY_CANVAS_REFRESH_TOKEN",
  "DIANA_CANARY_CANVAS_CLIENT_ID",
  "DIANA_CANARY_CANVAS_CLIENT_SECRET",
  "DIANA_CANARY_CANVAS_COURSE_ID",
  "DIANA_CANARY_CANVAS_TEXT_ASSIGNMENT_ID",
  "DIANA_CANARY_CANVAS_FILE_ASSIGNMENT_ID",
  "DIANA_CANARY_GOOGLE_ACCESS_TOKEN",
  "DIANA_CANARY_GOOGLE_REFRESH_TOKEN",
  "DIANA_CANARY_GOOGLE_CLIENT_ID",
  "DIANA_CANARY_GOOGLE_CLIENT_SECRET",
  "DIANA_CANARY_GOOGLE_GRANTED_SCOPES",
  "DIANA_CANARY_GOOGLE_COURSE_ID",
  "DIANA_CANARY_GOOGLE_FILE_COURSEWORK_ID",
] as const;

export function missingGoogleCanaryScopes(grantedScopes: readonly string[]): string[] {
  const granted = new Set(grantedScopes.map((scope) => scope.trim()).filter(Boolean));
  return GOOGLE_CLASSROOM_SCOPES.filter((scope) => !granted.has(scope));
}

export function validatePreviewCors(env: Env): { ok: boolean; detail: string } {
  const rawOrigin = env.DIANA_CANARY_PREVIEW_ORIGIN?.trim();
  if (!rawOrigin) return { ok: false, detail: "DIANA_CANARY_PREVIEW_ORIGIN is missing" };

  let origin: string;
  try {
    const parsed = new URL(rawOrigin);
    if (parsed.protocol !== "https:" || parsed.origin !== rawOrigin || parsed.pathname !== "/") {
      return { ok: false, detail: "preview origin must be one exact HTTPS origin without a path" };
    }
    origin = parsed.origin;
  } catch {
    return { ok: false, detail: "preview origin is not a valid URL" };
  }

  const envReader = (name: string) => env[name];
  if (!isAllowedDianaOrigin(origin, envReader)) {
    return {
      ok: false,
      detail: `${origin} is not covered by DIANA_ALLOWED_ORIGINS or the restricted preview suffix`,
    };
  }
  const exact = new Set((env.DIANA_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean));
  return exact.has(origin)
    ? { ok: true, detail: `${origin} is explicitly allowlisted` }
    : { ok: true, detail: `${origin} matches the restricted Diana Vercel preview policy` };
}

function missingStagingConfig(env: Env): string[] {
  return PROVIDER_CANARY_STAGING_ENV.filter((name) => !env[name]?.trim());
}

function splitScopes(value: string | undefined): string[] {
  return value?.split(/[\s,]+/u).map((scope) => scope.trim()).filter(Boolean) ?? [];
}

function canaryFile(): SubmissionFile {
  const bytes = new Uint8Array(Buffer.from("%PDF-1.7\nDiana provider canary\n%%EOF", "utf8"));
  return {
    name: "diana-provider-canary.pdf",
    mimeType: "application/pdf",
    bytes,
    byteSize: bytes.byteLength,
    sha256Digest: sha256Hex(bytes),
    storageVersion: "22222222-2222-4222-8222-222222222222",
  };
}

function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

async function withFetch<T>(mock: FetchLike, operation: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = mock;
  try {
    return await operation();
  } finally {
    globalThis.fetch = original;
  }
}

async function withEnv<T>(values: Env, operation: () => Promise<T>): Promise<T> {
  const previous = new Map<string, string | undefined>();
  for (const [name, value] of Object.entries(values)) {
    previous.set(name, process.env[name]);
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  try {
    return await operation();
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

async function recordCheck(
  checks: ProviderCanaryCheck[],
  id: string,
  name: string,
  operation: () => Promise<string> | string,
): Promise<void> {
  try {
    checks.push({ id, name, ok: true, detail: await operation() });
  } catch (error) {
    checks.push({
      id,
      name,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

function assertCanary(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function canvasEnv(origin: string, institutionId = CANARY_INSTITUTION_ID): Env {
  return {
    CANVAS_INSTITUTIONS_JSON: JSON.stringify({ [institutionId]: origin }),
    CANVAS_ALLOWED_ORIGINS: undefined,
  };
}

async function mockCanvasImport(): Promise<string> {
  const fetchMock: FetchLike = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/v1/courses") {
      return json([{ id: 101, name: "Canary Algebra" }]);
    }
    if (url.pathname === "/api/v1/courses/101/assignments") {
      return json([{
        id: 501,
        name: "Canary response",
        description: "Show the reasoning.",
        due_at: "2030-01-02T23:59:00.000Z",
        html_url: `${CANVAS_MOCK_ORIGIN}/courses/101/assignments/501`,
        attachments: [{ id: 77, filename: "prompt.pdf", url: `${CANVAS_MOCK_ORIGIN}/files/77`, "content-type": "application/pdf" }],
      }]);
    }
    throw new Error(`unexpected Canvas import request: ${url}`);
  };
  return withEnv(canvasEnv(CANVAS_MOCK_ORIGIN), () => withFetch(fetchMock, async () => {
    const result = await fetchCanvasAssignments({
      institution_id: CANARY_INSTITUTION_ID,
      base_url: CANVAS_MOCK_ORIGIN,
      token: "mock-canvas-token",
    });
    assertCanary(result.items.length === 1, "Canvas import did not return one assignment");
    assertCanary(result.items[0].external_course_id === "101", "Canvas course identity was not retained");
    assertCanary(result.items[0].sources?.length === 2, "Canvas source packet was not normalized");
    return "imported one course assignment with instructions and attachment";
  }));
}

async function mockClassroomImport(): Promise<string> {
  const fetchMock: FetchLike = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/v1/courses") {
      return json({ courses: [{ id: "course-201", name: "Canary Biology" }] });
    }
    if (url.pathname === "/v1/courses/course-201/courseWork") {
      return json({ courseWork: [{
        id: "work-601",
        title: "Canary lab",
        description: "Attach the lab response.",
        dueDate: { year: 2030, month: 1, day: 3 },
        materials: [{ driveFile: { driveFile: { id: "drive-1", title: "Lab prompt", alternateLink: "https://drive.google.com/open?id=drive-1" } } }],
      }] });
    }
    throw new Error(`unexpected Classroom import request: ${url}`);
  };
  return withFetch(fetchMock, async () => {
    const result = await fetchClassroomAssignments("mock-google-token");
    assertCanary(result.items.length === 1, "Classroom import did not return one assignment");
    assertCanary(result.items[0].external_id === "course-201:work-601", "Classroom composite identity was not retained");
    assertCanary(result.items[0].sources?.length === 2, "Classroom source packet was not normalized");
    return "imported one course assignment with instructions and Drive material";
  });
}

async function mockCanvasSubmissions(): Promise<string> {
  let textSubmissions = 0;
  let fileSubmissions = 0;
  const fetchMock: FetchLike = async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/submissions/self/files")) {
      return json({ upload_url: `${CANVAS_MOCK_UPLOAD_ORIGIN}/upload`, upload_params: { key: "canary" } });
    }
    if (url.origin === CANVAS_MOCK_UPLOAD_ORIGIN && url.pathname === "/upload") {
      return json({ id: 991 });
    }
    if (url.pathname.endsWith("/submissions")) {
      const body = String(init?.body ?? "");
      if (body.includes("online_text_entry")) textSubmissions += 1;
      if (body.includes("online_upload")) fileSubmissions += 1;
      return json({ id: textSubmissions ? 701 : 702, workflow_state: "submitted" });
    }
    throw new Error(`unexpected Canvas submission request: ${url}`);
  };
  return withEnv(canvasEnv(CANVAS_MOCK_ORIGIN), () => withFetch(fetchMock, async () => {
    const destination = {
      institutionId: CANARY_INSTITUTION_ID,
      baseUrl: CANVAS_MOCK_ORIGIN,
      token: "mock-canvas-token",
      courseId: "101",
      assignmentId: "501",
    };
    const text = await submitCanvasText({ ...destination, text: "Canary text response" });
    const file = await submitCanvasFile({ ...destination, assignmentId: "502", file: canaryFile() });
    assertCanary(text.workflow_state === "submitted", "Canvas text receipt was not submitted");
    assertCanary(file.workflow_state === "submitted", "Canvas file receipt was not submitted");
    assertCanary(textSubmissions === 1 && fileSubmissions === 1, "Canvas submission count was not deterministic");
    return "exercised one text submission and one integrity-bound file submission";
  }));
}

async function mockClassroomFileSubmission(): Promise<string> {
  const calls: string[] = [];
  const fetchMock: FetchLike = async (input) => {
    const url = new URL(String(input));
    calls.push(url.pathname);
    if (url.pathname.endsWith("/studentSubmissions")) {
      return json({ studentSubmissions: [{
        id: "submission-801",
        state: "CREATED",
        courseWorkType: "ASSIGNMENT",
        associatedWithDeveloper: true,
      }] });
    }
    if (url.pathname === "/upload/drive/v3/files") return json({ id: "drive-canary-1" });
    if (url.pathname.endsWith(":modifyAttachments")) return json({});
    if (url.pathname.endsWith(":turnIn")) return json({});
    throw new Error(`unexpected Classroom submission request: ${url}`);
  };
  return withFetch(fetchMock, async () => {
    const result = await submitGoogleClassroomFile({
      token: "mock-google-token",
      courseId: "course-201",
      courseWorkId: "work-601",
      file: canaryFile(),
    });
    assertCanary(result.id === "submission-801", "Classroom submission receipt was missing");
    assertCanary(calls.some((path) => path.endsWith(":modifyAttachments")), "Classroom file was not attached");
    assertCanary(calls.some((path) => path.endsWith(":turnIn")), "Classroom work was not turned in");
    return "uploaded a Drive file, attached it, and turned in developer-associated work";
  });
}

async function mockExpiredOAuth(): Promise<string> {
  const fetchMock: FetchLike = async (input) => {
    const url = new URL(String(input));
    if (url.origin === CANVAS_MOCK_ORIGIN && url.pathname === "/login/oauth2/token") {
      return json({ access_token: "fresh-canvas-token", expires_in: 3600 });
    }
    if (url.origin === "https://oauth2.googleapis.com" && url.pathname === "/token") {
      return json({ access_token: "fresh-google-token", expires_in: 3600 });
    }
    throw new Error(`unexpected OAuth refresh request: ${url}`);
  };
  return withEnv({
    ...canvasEnv(CANVAS_MOCK_ORIGIN),
    CANVAS_CLIENT_ID: "mock-canvas-client",
    CANVAS_CLIENT_SECRET: "mock-canvas-secret",
    GOOGLE_CLIENT_ID: "mock-google-client",
    GOOGLE_CLIENT_SECRET: "mock-google-secret",
  }, () => withFetch(fetchMock, async () => {
    const [canvas, google] = await Promise.all([
      getValidCanvasToken({
        institution_id: CANARY_INSTITUTION_ID,
        base_url: CANVAS_MOCK_ORIGIN,
        token: "expired-canvas-token",
        oauth: true,
        refresh_token: "mock-canvas-refresh",
        expires_at: "2000-01-01T00:00:00.000Z",
      }),
      getValidGoogleToken({
        access_token: "expired-google-token",
        refresh_token: "mock-google-refresh",
        expires_at: "2000-01-01T00:00:00.000Z",
        oauth: true,
      }),
    ]);
    assertCanary(canvas.refreshed?.token === "fresh-canvas-token", "Canvas expired token was not refreshed");
    assertCanary(google?.refreshed?.access_token === "fresh-google-token", "Google expired token was not refreshed");
    return "refreshed expired Canvas and Google OAuth access tokens";
  }));
}

async function mockDeniedScope(): Promise<string> {
  const granted = GOOGLE_CLASSROOM_SCOPES.filter((scope) => !scope.endsWith("/drive.file"));
  const missing = missingGoogleCanaryScopes(granted);
  assertCanary(missing.some((scope) => scope.endsWith("/drive.file")), "denied Drive scope was not detected");

  const error = await withFetch(async () => json({ error: { status: "PERMISSION_DENIED" } }, 403), () =>
    fetchClassroomAssignments("scope-denied-token").catch((caught) => caught));
  assertCanary(error instanceof Error && error.message.includes("403"), "provider scope denial did not fail closed");
  return "detected a missing Drive scope and rejected a provider 403";
}

type StoredReceipt = {
  id: string;
  assignmentId: string;
  provider: string;
  capability: string;
  idempotencyKey: string;
  status: "prepared" | "confirmation_pending" | "submitted" | "not_accepted";
  detail: string | null;
};

class InMemoryReceiptClient {
  private readonly receipts: StoredReceipt[] = [];

  async rpc(functionName: string, args: Record<string, unknown>): Promise<{ data: unknown; error: null }> {
    if (functionName === "claim_assignment_submission") {
      const existing = this.receipts.find((receipt) =>
        receipt.assignmentId === args.p_assignment_id
        && receipt.provider === args.p_provider
        && (receipt.idempotencyKey === args.p_idempotency_key || receipt.status !== "not_accepted"));
      if (existing) return { data: this.claimPayload(existing, false), error: null };
      const receipt: StoredReceipt = {
        id: `receipt-${this.receipts.length + 1}`,
        assignmentId: String(args.p_assignment_id),
        provider: String(args.p_provider),
        capability: String(args.p_capability),
        idempotencyKey: String(args.p_idempotency_key),
        status: "prepared",
        detail: null,
      };
      this.receipts.push(receipt);
      return { data: this.claimPayload(receipt, true), error: null };
    }

    const receipt = this.receipts.find((candidate) => candidate.id === args.p_receipt_id);
    if (!receipt) throw new Error("receipt not found");
    if (functionName === "complete_assignment_submission") {
      receipt.status = "submitted";
      receipt.detail = String(args.p_detail ?? "");
      return { data: null, error: null };
    }
    if (functionName === "update_assignment_submission_receipt") {
      receipt.status = String(args.p_status) as StoredReceipt["status"];
      receipt.detail = String(args.p_detail ?? "");
      return { data: null, error: null };
    }
    if (functionName === "reconcile_assignment_submission_receipt") {
      const terminal = receipt.status === "submitted" || receipt.status === "not_accepted";
      if (!terminal) {
        receipt.status = String(args.p_status) as StoredReceipt["status"];
        receipt.detail = String(args.p_detail ?? "");
      }
      return {
        data: {
          receipt_id: receipt.id,
          status: receipt.status,
          transitioned: !terminal,
          detail: receipt.detail,
        },
        error: null,
      };
    }
    throw new Error(`unexpected receipt RPC: ${functionName}`);
  }

  private claimPayload(receipt: StoredReceipt, claimed: boolean) {
    return {
      receipt_id: receipt.id,
      status: receipt.status,
      claimed,
      detail: receipt.detail,
    };
  }
}

async function mockDuplicateSubmitProtection(): Promise<string> {
  const client = new InMemoryReceiptClient();
  let providerWrites = 0;
  const submit = async () => {
    const claim = await claimSubmissionReceipt(client, {
      assignmentId: "33333333-3333-4333-8333-333333333333",
      provider: "canvas",
      capability: "submit_text",
      idempotencyKey: CANARY_IDEMPOTENCY_KEY,
    });
    if (claim.claimed) {
      providerWrites += 1;
      await completeSubmissionReceipt(client, {
        receiptId: claim.receiptId,
        providerReceiptId: "canvas-receipt-1",
        detail: "Canvas accepted the canary submission.",
      });
    }
    return claim;
  };

  const first = await submit();
  const replay = await submit();
  assertCanary(first.claimed, "first receipt was not claimed");
  assertCanary(!replay.claimed && replay.status === "submitted", "duplicate receipt did not replay submitted state");
  assertCanary(providerWrites === 1, "duplicate attempt reached the provider");
  return "replayed the submitted receipt and kept provider writes at one";
}

async function mockAmbiguousReconciliation(): Promise<string> {
  const client = new InMemoryReceiptClient();
  const claim = await claimSubmissionReceipt(client, {
    assignmentId: "44444444-4444-4444-8444-444444444444",
    provider: "canvas",
    capability: "submit_text",
    idempotencyKey: "55555555-5555-4555-8555-555555555555",
  });
  assertCanary(claim.claimed, "ambiguous receipt was not claimed");

  const ambiguous = await withEnv(canvasEnv(CANVAS_MOCK_ORIGIN), () => withFetch(
    async () => json({}, 503),
    () => submitCanvasText({
      institutionId: CANARY_INSTITUTION_ID,
      baseUrl: CANVAS_MOCK_ORIGIN,
      token: "mock-canvas-token",
      courseId: "101",
      assignmentId: "503",
      text: "Ambiguous canary response",
    }).catch((caught) => caught),
  ));
  const pendingStatus = providerSubmissionReceiptStatus(ambiguous);
  assertCanary(pendingStatus === "confirmation_pending", "ambiguous provider response was not held pending");
  await updateSubmissionReceiptStatus(client, {
    receiptId: claim.receiptId,
    status: pendingStatus,
    detail: "Provider response was ambiguous.",
  });

  const resolution = resolveProviderSubmissionStatus({
    provider: "canvas",
    capabilities: ["open_external"],
    note: "",
    allowedExtensions: [],
    providerSubmissionId: "canvas-receipt-503",
    providerState: "submitted",
  });
  const reconciled = await reconcileSubmissionReceipt(client, {
    receiptId: claim.receiptId,
    status: resolution.status,
    providerReceiptId: resolution.providerReceiptId,
    detail: resolution.detail,
    providerResponse: resolution.providerResponse,
  });
  const replay = await reconcileSubmissionReceipt(client, {
    receiptId: claim.receiptId,
    status: "not_accepted",
    providerReceiptId: null,
    detail: "late conflicting result",
  });
  assertCanary(reconciled.status === "submitted" && reconciled.transitioned, "pending receipt was not reconciled to submitted");
  assertCanary(replay.status === "submitted" && !replay.transitioned, "terminal receipt was overwritten");
  return "reconciled an ambiguous response once and preserved the terminal receipt";
}

function envValue(env: Env, name: typeof PROVIDER_CANARY_STAGING_ENV[number]): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is missing`);
  return value;
}

async function stagingExpiredTokens(env: Env): Promise<{ canvasToken: string; googleToken: string }> {
  const canvasOrigin = new URL(envValue(env, "DIANA_CANARY_CANVAS_BASE_URL")).origin;
  const institutionId = envValue(env, "DIANA_CANARY_CANVAS_INSTITUTION_ID");
  return withEnv({
    CANVAS_INSTITUTIONS_JSON: JSON.stringify({ [institutionId]: canvasOrigin }),
    CANVAS_ALLOWED_ORIGINS: undefined,
    CANVAS_CLIENT_ID: envValue(env, "DIANA_CANARY_CANVAS_CLIENT_ID"),
    CANVAS_CLIENT_SECRET: envValue(env, "DIANA_CANARY_CANVAS_CLIENT_SECRET"),
    GOOGLE_CLIENT_ID: envValue(env, "DIANA_CANARY_GOOGLE_CLIENT_ID"),
    GOOGLE_CLIENT_SECRET: envValue(env, "DIANA_CANARY_GOOGLE_CLIENT_SECRET"),
  }, async () => {
    const [canvas, google] = await Promise.all([
      getValidCanvasToken({
        institution_id: institutionId,
        base_url: canvasOrigin,
        token: envValue(env, "DIANA_CANARY_CANVAS_ACCESS_TOKEN"),
        oauth: true,
        refresh_token: envValue(env, "DIANA_CANARY_CANVAS_REFRESH_TOKEN"),
        expires_at: "2000-01-01T00:00:00.000Z",
      }),
      getValidGoogleToken({
        access_token: envValue(env, "DIANA_CANARY_GOOGLE_ACCESS_TOKEN"),
        refresh_token: envValue(env, "DIANA_CANARY_GOOGLE_REFRESH_TOKEN"),
        expires_at: "2000-01-01T00:00:00.000Z",
        oauth: true,
      }),
    ]);
    assertCanary(canvas.refreshed?.token, "Canvas staging refresh did not return a new access token");
    assertCanary(google?.refreshed?.access_token, "Google staging refresh did not return a new access token");
    return { canvasToken: canvas.token, googleToken: google.token };
  });
}

async function runStagingChecks(checks: ProviderCanaryCheck[], env: Env): Promise<void> {
  let tokens: { canvasToken: string; googleToken: string };
  try {
    tokens = await stagingExpiredTokens(env);
    checks.push({
      id: "oauth-expired",
      name: "Expired OAuth refresh",
      ok: true,
      detail: "refreshed dedicated Canvas and Google staging tokens",
    });
  } catch (error) {
    checks.push({
      id: "oauth-expired",
      name: "Expired OAuth refresh",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  const canvasOrigin = new URL(envValue(env, "DIANA_CANARY_CANVAS_BASE_URL")).origin;
  const institutionId = envValue(env, "DIANA_CANARY_CANVAS_INSTITUTION_ID");
  const canvasDestination = {
    institutionId,
    baseUrl: canvasOrigin,
    token: tokens.canvasToken,
    courseId: envValue(env, "DIANA_CANARY_CANVAS_COURSE_ID"),
  };
  const googleDestination = {
    token: tokens.googleToken,
    courseId: envValue(env, "DIANA_CANARY_GOOGLE_COURSE_ID"),
    courseWorkId: envValue(env, "DIANA_CANARY_GOOGLE_FILE_COURSEWORK_ID"),
  };

  await withEnv(canvasEnv(canvasOrigin, institutionId), async () => {
    await recordCheck(checks, "canvas-import", "Canvas assignment import", async () => {
      const result = await fetchCanvasAssignments({ institution_id: institutionId, base_url: canvasOrigin, token: tokens!.canvasToken });
      assertCanary(result.items.length > 0, "Canvas staging import returned no assignments");
      return `read ${result.items.length} staging assignment(s)`;
    });
    await recordCheck(checks, "canvas-text", "Canvas text submission", async () => {
      const assignmentId = envValue(env, "DIANA_CANARY_CANVAS_TEXT_ASSIGNMENT_ID");
      const capabilities = await inspectCanvasSubmission({ ...canvasDestination, assignmentId });
      assertCanary(capabilities.capabilities.includes("submit_text"), capabilities.note);
      const result = await submitCanvasText({ ...canvasDestination, assignmentId, text: "Diana staging provider canary text submission." });
      assertCanary(result.id, "Canvas did not return a text submission receipt");
      return `Canvas receipt ${String(result.id)}`;
    });
    await recordCheck(checks, "canvas-file", "Canvas file submission", async () => {
      const assignmentId = envValue(env, "DIANA_CANARY_CANVAS_FILE_ASSIGNMENT_ID");
      const capabilities = await inspectCanvasSubmission({ ...canvasDestination, assignmentId });
      assertCanary(capabilities.capabilities.includes("upload_file"), capabilities.note);
      const result = await submitCanvasFile({ ...canvasDestination, assignmentId, file: canaryFile() });
      assertCanary(result.id, "Canvas did not return a file submission receipt");
      return `Canvas receipt ${String(result.id)}`;
    });
  });

  await recordCheck(checks, "classroom-import", "Google Classroom assignment import", async () => {
    const result = await fetchClassroomAssignments(tokens!.googleToken);
    assertCanary(result.items.length > 0, "Classroom staging import returned no assignments");
    return `read ${result.items.length} staging assignment(s)`;
  });
  await recordCheck(checks, "classroom-file", "Google Classroom file submission", async () => {
    const capabilities = await inspectGoogleClassroomSubmission(googleDestination);
    assertCanary(capabilities.capabilities.includes("upload_file"), capabilities.note);
    const result = await submitGoogleClassroomFile({ ...googleDestination, file: canaryFile() });
    return `Classroom receipt ${result.id}`;
  });

  await recordCheck(checks, "duplicate-submit", "Duplicate-submit protection", mockDuplicateSubmitProtection);
  await recordCheck(checks, "ambiguous-reconciliation", "Ambiguous receipt reconciliation", mockAmbiguousReconciliation);
}

export async function runProviderCanary(options: {
  mode?: ProviderCanaryMode;
  env?: Env;
} = {}): Promise<ProviderCanaryReport> {
  const mode = options.mode ?? "mock";
  const env = options.env ?? process.env;
  const checks: ProviderCanaryCheck[] = [];
  let stagingNetworkEnabled = false;

  await recordCheck(checks, "scope-contract", "Google scope contract", () => {
    const missing = missingGoogleCanaryScopes(GOOGLE_CLASSROOM_SCOPES);
    assertCanary(missing.length === 0, `scope contract is missing: ${missing.join(", ")}`);
    return `${GOOGLE_CLASSROOM_SCOPES.length} required student scopes are declared`;
  });

  if (mode === "mock") {
    await recordCheck(checks, "preview-cors", "Preview CORS contract", () => {
      const exact = validatePreviewCors({
        DIANA_CANARY_PREVIEW_ORIGIN: "https://diana-canary-preview.example",
        DIANA_ALLOWED_ORIGINS: "https://diana.example,https://diana-canary-preview.example",
      });
      const wildcard = validatePreviewCors({
        DIANA_CANARY_PREVIEW_ORIGIN: "https://diana-canary-preview.example",
        DIANA_ALLOWED_ORIGINS: "https://*.example",
      });
      const restrictedPreview = validatePreviewCors({
        DIANA_CANARY_PREVIEW_ORIGIN: "https://diana-canary-git-main-teamcarrillo405-hubs-projects.vercel.app",
        DIANA_ALLOWED_PREVIEW_HOST_SUFFIX: "-teamcarrillo405-hubs-projects.vercel.app",
      });
      const lookalike = validatePreviewCors({
        DIANA_CANARY_PREVIEW_ORIGIN: "https://diana-canary-git-main-other-team.vercel.app",
        DIANA_ALLOWED_PREVIEW_HOST_SUFFIX: "-teamcarrillo405-hubs-projects.vercel.app",
      });
      assertCanary(exact.ok && !wildcard.ok && restrictedPreview.ok && !lookalike.ok, "preview CORS policy was not restrictive");
      return "accepted exact and restricted Diana preview origins; rejected wildcard and lookalike origins";
    });
    await recordCheck(checks, "canvas-import", "Canvas assignment import", mockCanvasImport);
    await recordCheck(checks, "classroom-import", "Google Classroom assignment import", mockClassroomImport);
    await recordCheck(checks, "canvas-submissions", "Canvas text and file submission", mockCanvasSubmissions);
    await recordCheck(checks, "classroom-file", "Google Classroom file submission", mockClassroomFileSubmission);
    await recordCheck(checks, "oauth-expired", "Expired OAuth refresh", mockExpiredOAuth);
    await recordCheck(checks, "scope-denied", "Denied Google scope", mockDeniedScope);
    await recordCheck(checks, "duplicate-submit", "Duplicate-submit protection", mockDuplicateSubmitProtection);
    await recordCheck(checks, "ambiguous-reconciliation", "Ambiguous receipt reconciliation", mockAmbiguousReconciliation);
  } else {
    await recordCheck(checks, "staging-config", "Staging credential contract", () => {
      const missing = missingStagingConfig(env);
      assertCanary(missing.length === 0, `missing staging configuration: ${missing.join(", ")}`);
      assertCanary(env.DIANA_PROVIDER_CANARY_ALLOW_WRITES === "true", "DIANA_PROVIDER_CANARY_ALLOW_WRITES must equal true");
      return "dedicated staging credentials and disposable assignment IDs are present";
    });
    await recordCheck(checks, "preview-cors", "Preview CORS contract", () => {
      const result = validatePreviewCors(env);
      assertCanary(result.ok, result.detail);
      return result.detail;
    });
    await recordCheck(checks, "scope-grant", "Granted Google scopes", () => {
      const missing = missingGoogleCanaryScopes(splitScopes(env.DIANA_CANARY_GOOGLE_GRANTED_SCOPES));
      assertCanary(missing.length === 0, `missing granted scopes: ${missing.join(", ")}`);
      return "all import and file-submission scopes are granted";
    });

    if (checks.every((check) => check.ok)) {
      stagingNetworkEnabled = true;
      await runStagingChecks(checks, env);
    }
  }

  return {
    ok: checks.every((check) => check.ok),
    mode,
    network: mode === "mock" ? "intercepted" : stagingNetworkEnabled ? "staging-providers" : "blocked",
    checks,
  };
}
