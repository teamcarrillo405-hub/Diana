import {
  canvasOAuthScopes,
  fetchCanvasAssignments,
  getValidCanvasToken,
} from "./canvas";
import {
  fetchClassroomAssignments,
  getValidGoogleToken,
  googleClassroomAssignmentKey,
  googleClassroomOAuthScopes,
} from "./google";
import {
  lmsProviderCapabilities,
} from "./provider-features";
import { planRemovedAssignmentReconciliation } from "./reconciliation";
import {
  inspectGoogleClassroomSubmission,
  submissionCapabilities,
  submitCanvasFile,
  submitCanvasText,
  submitGoogleClassroomFile,
  type SubmissionFile,
} from "./submission";
import { sha256Hex } from "../security/submission-file-integrity";

type Env = Record<string, string | undefined>;
type FetchLike = typeof fetch;

export type ProviderCanaryMockFixture = Readonly<{
  id: string;
  name: string;
  run: () => Promise<string> | string;
}>;

const CANVAS_ORIGIN = "https://93.184.216.34";
const CANVAS_INSTITUTION_ID = "diana-canary";

function assertFixture(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
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

function canvasEnv(): Env {
  return {
    CANVAS_INSTITUTIONS_JSON: JSON.stringify({ [CANVAS_INSTITUTION_ID]: CANVAS_ORIGIN }),
    CANVAS_ALLOWED_ORIGINS: undefined,
  };
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

async function mockFeatureFlagIsolation(): Promise<string> {
  const names = [
    "DIANA_LMS_CANVAS_IMPORT_ENABLED",
    "DIANA_LMS_CANVAS_SUBMISSION_ENABLED",
    "DIANA_LMS_GOOGLE_IMPORT_ENABLED",
    "DIANA_LMS_GOOGLE_SUBMISSION_ENABLED",
  ] as const;

  for (const enabledName of names) {
    const env = Object.fromEntries(names.map((name) => [name, name === enabledName ? "true" : "false"]));
    const capabilities = lmsProviderCapabilities({ NODE_ENV: "production", ...env });
    const enabled = [
      capabilities.canvas.import,
      capabilities.canvas.submission,
      capabilities.google.import,
      capabilities.google.submission,
    ];
    assertFixture(enabled.filter(Boolean).length === 1, `${enabledName} was not isolated`);
  }

  let unexpectedNetwork = 0;
  await withEnv({
    DIANA_LMS_CANVAS_IMPORT_ENABLED: "false",
    DIANA_LMS_CANVAS_SUBMISSION_ENABLED: "false",
    DIANA_LMS_GOOGLE_IMPORT_ENABLED: "false",
    DIANA_LMS_GOOGLE_SUBMISSION_ENABLED: "false",
  }, () => withFetch(async () => {
    unexpectedNetwork += 1;
    throw new Error("disabled provider operation reached the network");
  }, async () => {
    const failures = await Promise.all([
      fetchCanvasAssignments({
        institution_id: CANVAS_INSTITUTION_ID,
        base_url: CANVAS_ORIGIN,
        token: "disabled",
      }).catch((error) => error),
      fetchClassroomAssignments("disabled").catch((error) => error),
      submitCanvasText({
        institutionId: CANVAS_INSTITUTION_ID,
        baseUrl: CANVAS_ORIGIN,
        token: "disabled",
        courseId: "course",
        assignmentId: "assignment",
        text: "disabled",
      }).catch((error) => error),
      inspectGoogleClassroomSubmission({
        token: "disabled",
        courseId: "course",
        courseWorkId: "assignment",
      }).catch((error) => error),
    ]);
    assertFixture(
      failures.every((error) => error && typeof error === "object" && "code" in error && error.code === "provider_feature_disabled"),
      "a disabled provider operation did not return provider_feature_disabled",
    );
  }));
  assertFixture(unexpectedNetwork === 0, "a disabled provider operation contacted the network");
  return "isolated all four import/submission switches and blocked disabled operations before fetch";
}

function mockOAuthScopeIsolation(): string {
  const canvasImport = canvasOAuthScopes({ importEnabled: true, submissionEnabled: false });
  const canvasSubmission = canvasOAuthScopes({ importEnabled: false, submissionEnabled: true });
  assertFixture(canvasImport.some((scope) => scope.includes("/assignments")), "Canvas import scopes are incomplete");
  assertFixture(canvasImport.every((scope) => !scope.startsWith("url:POST|")), "Canvas import requested a write scope");
  assertFixture(canvasSubmission.some((scope) => scope.startsWith("url:POST|")), "Canvas submission scopes are incomplete");
  assertFixture(!canvasSubmission.includes("url:GET|/api/v1/courses"), "Canvas submission requested the course import scope");

  const googleImport = googleClassroomOAuthScopes({
    importEnabled: true,
    submissionEnabled: false,
    teacher: false,
  });
  const googleSubmission = googleClassroomOAuthScopes({
    importEnabled: false,
    submissionEnabled: true,
    teacher: false,
  });
  assertFixture(googleImport.some((scope) => scope.endsWith("/drive.readonly")), "Google import scope is incomplete");
  assertFixture(!googleImport.some((scope) => scope.endsWith("/drive.file")), "Google import requested Drive write access");
  assertFixture(googleSubmission.some((scope) => scope.endsWith("/drive.file")), "Google submission scope is incomplete");
  assertFixture(!googleSubmission.some((scope) => scope.endsWith("/drive.readonly")), "Google submission requested Drive import access");
  return "kept Canvas and Google import scopes separate from submission write scopes";
}

async function mockOAuthRevocation(): Promise<string> {
  const requests: string[] = [];
  const fetchMock: FetchLike = async (input) => {
    const url = new URL(String(input));
    requests.push(url.toString());
    if (
      (url.origin === CANVAS_ORIGIN && url.pathname === "/login/oauth2/token")
      || (url.origin === "https://oauth2.googleapis.com" && url.pathname === "/token")
    ) {
      return json({ error: "invalid_grant" }, 400);
    }
    throw new Error(`unexpected OAuth revocation request: ${url}`);
  };

  return withEnv({
    ...canvasEnv(),
    CANVAS_CLIENT_ID: "mock-canvas-client",
    CANVAS_CLIENT_SECRET: "mock-canvas-secret",
    GOOGLE_CLIENT_ID: "mock-google-client",
    GOOGLE_CLIENT_SECRET: "mock-google-secret",
  }, () => withFetch(fetchMock, async () => {
    const [canvas, google] = await Promise.all([
      getValidCanvasToken({
        institution_id: CANVAS_INSTITUTION_ID,
        base_url: CANVAS_ORIGIN,
        token: "revoked-canvas-token",
        oauth: true,
        refresh_token: "revoked-canvas-refresh",
        expires_at: "2000-01-01T00:00:00.000Z",
      }).catch((error) => error),
      getValidGoogleToken({
        access_token: "revoked-google-token",
        oauth: true,
        refresh_token: "revoked-google-refresh",
        expires_at: "2000-01-01T00:00:00.000Z",
      }).catch((error) => error),
    ]);
    assertFixture(canvas?.code === "reconnect_required" && canvas?.provider === "canvas", "Canvas revocation did not require reconnect");
    assertFixture(google?.code === "reconnect_required" && google?.provider === "google_classroom", "Google revocation did not require reconnect");
    assertFixture(requests.length === 2, "revocation fixture did not exercise both token endpoints");
    return "mapped Canvas and Google invalid_grant responses to reconnect_required";
  }));
}

async function mockMissingRefreshReconnect(): Promise<string> {
  let unexpectedNetwork = 0;
  return withFetch(async () => {
    unexpectedNetwork += 1;
    throw new Error("missing refresh token reached the network");
  }, async () => {
    const [canvas, google] = await Promise.all([
      getValidCanvasToken({
        institution_id: CANVAS_INSTITUTION_ID,
        base_url: CANVAS_ORIGIN,
        token: "orphaned-canvas-token",
        oauth: true,
        expires_at: "2035-01-01T00:00:00.000Z",
      }).catch((error) => error),
      getValidGoogleToken({
        access_token: "orphaned-google-token",
        oauth: true,
        expires_at: "2035-01-01T00:00:00.000Z",
      }).catch((error) => error),
    ]);
    assertFixture(canvas?.code === "reconnect_required", "Canvas accepted an OAuth token without a refresh path");
    assertFixture(google?.code === "reconnect_required", "Google accepted an OAuth token without a refresh path");
    assertFixture(unexpectedNetwork === 0, "missing refresh credentials contacted a token endpoint");
    return "required reconnect for incomplete Canvas and Google OAuth credentials without fetching";
  });
}

async function mockPagination(): Promise<string> {
  const canvasPages: string[] = [];
  const googlePages: string[] = [];
  const fetchMock: FetchLike = async (input) => {
    const url = new URL(String(input));
    if (url.origin === CANVAS_ORIGIN) {
      canvasPages.push(url.toString());
      if (url.pathname === "/api/v1/courses") {
        if (url.searchParams.get("page") === "2") return json([{ id: 102, name: "Canary Physics" }]);
        return json(
          [{ id: 101, name: "Canary Algebra" }],
          200,
          { Link: `<${CANVAS_ORIGIN}/api/v1/courses?page=2>; rel="next"` },
        );
      }
      if (url.pathname === "/api/v1/courses/101/assignments") {
        if (url.searchParams.get("page") === "2") {
          return json([{ id: 502, name: "Second page", description: null, due_at: null }]);
        }
        return json(
          [{ id: 501, name: "First page", description: null, due_at: null }],
          200,
          { Link: `<${CANVAS_ORIGIN}/api/v1/courses/101/assignments?page=2>; rel="next"` },
        );
      }
      if (url.pathname === "/api/v1/courses/102/assignments") {
        return json([{ id: 503, name: "Second course", description: null, due_at: null }]);
      }
    }

    if (url.origin === "https://classroom.googleapis.com") {
      googlePages.push(url.toString());
      if (url.pathname === "/v1/courses") {
        if (url.searchParams.get("pageToken") === "courses-2") {
          return json({ courses: [{ id: "course-202", name: "Canary Chemistry" }] });
        }
        return json({
          courses: [{ id: "course-201", name: "Canary Biology" }],
          nextPageToken: "courses-2",
        });
      }
      if (url.pathname === "/v1/courses/course-201/courseWork") {
        if (url.searchParams.get("pageToken") === "work-2") {
          return json({ courseWork: [{ id: "work-602", title: "Second page" }] });
        }
        return json({
          courseWork: [{ id: "work-601", title: "First page" }],
          nextPageToken: "work-2",
        });
      }
      if (url.pathname === "/v1/courses/course-202/courseWork") {
        return json({ courseWork: [{ id: "work-603", title: "Second course" }] });
      }
    }
    throw new Error(`unexpected pagination request: ${url}`);
  };

  return withEnv(canvasEnv(), () => withFetch(fetchMock, async () => {
    const [canvas, google] = await Promise.all([
      fetchCanvasAssignments({
        institution_id: CANVAS_INSTITUTION_ID,
        base_url: CANVAS_ORIGIN,
        token: "mock-canvas-token",
      }),
      fetchClassroomAssignments("mock-google-token"),
    ]);
    assertFixture(canvas.items.length === 3, "Canvas pagination did not collect all assignments");
    assertFixture(new Set(canvas.items.map((item) => item.external_id)).size === 3, "Canvas pagination produced duplicate identities");
    assertFixture(google.items.length === 3, "Google pagination did not collect all assignments");
    assertFixture(new Set(google.items.map((item) => item.external_id)).size === 3, "Google pagination produced duplicate identities");
    assertFixture(canvasPages.some((url) => url.includes("page=2")), "Canvas next link was not followed");
    assertFixture(googlePages.some((url) => url.includes("pageToken=courses-2")), "Google course page token was not followed");
    assertFixture(googlePages.some((url) => url.includes("pageToken=work-2")), "Google coursework page token was not followed");
    return "followed multi-page course and assignment collections with three stable identities per provider";
  }));
}

async function mockAssignmentVariants(): Promise<string> {
  const fetchMock: FetchLike = async (input) => {
    const url = new URL(String(input));
    if (url.origin === CANVAS_ORIGIN && url.pathname === "/api/v1/courses") {
      return json([{ id: 101, name: "Canary Algebra" }]);
    }
    if (url.origin === CANVAS_ORIGIN && url.pathname === "/api/v1/courses/101/assignments") {
      return json([
        {
          id: 511,
          name: "Rubric and attachment",
          description: "Show each step.",
          due_at: "2030-02-01T23:59:00.000Z",
          html_url: `${CANVAS_ORIGIN}/courses/101/assignments/511`,
          rubric: [{ description: "Reasoning", long_description: "Explain each step", points: 4 }],
          attachments: [{ id: 71, filename: "prompt.pdf", url: `${CANVAS_ORIGIN}/files/71`, "content-type": "application/pdf" }],
        },
        {
          id: 512,
          name: "Undated partial attachment",
          description: null,
          due_at: null,
          attachments: [{ id: 72, filename: "pending.pdf", "content-type": "application/pdf" }],
        },
      ]);
    }
    if (url.origin === "https://classroom.googleapis.com" && url.pathname === "/v1/courses") {
      return json({ courses: [{ id: "course-211", name: "Canary Biology" }] });
    }
    if (url.origin === "https://classroom.googleapis.com" && url.pathname === "/v1/courses/course-211/courseWork") {
      return json({ courseWork: [
        {
          id: "work-611",
          title: "Timed mixed materials",
          description: "Use every source.",
          dueDate: { year: 2030, month: 2, day: 2 },
          dueTime: { hours: 8, minutes: 30 },
          alternateLink: "https://classroom.google.com/c/course-211/a/work-611/details",
          materials: [
            { driveFile: { driveFile: { id: "drive-11", title: "Lab prompt", alternateLink: "https://drive.google.com/open?id=drive-11" } } },
            { link: { title: "Reference", url: "https://example.edu/reference" } },
            { youtubeVideo: { id: "video-11", title: "Demonstration", alternateLink: "https://youtu.be/video-11" } },
            { form: { title: "Exit ticket", formUrl: "https://docs.google.com/forms/d/form-11" } },
          ],
        },
        { id: "work-612", title: "Undated empty work" },
      ] });
    }
    throw new Error(`unexpected assignment variant request: ${url}`);
  };

  return withEnv(canvasEnv(), () => withFetch(fetchMock, async () => {
    const [canvas, google] = await Promise.all([
      fetchCanvasAssignments({
        institution_id: CANVAS_INSTITUTION_ID,
        base_url: CANVAS_ORIGIN,
        token: "mock-canvas-token",
      }),
      fetchClassroomAssignments("mock-google-token"),
    ]);
    const canvasRich = canvas.items.find((item) => item.external_id === "511");
    const canvasPartial = canvas.items.find((item) => item.external_id === "512");
    assertFixture(canvasRich?.rubric_text === "Reasoning - Explain each step - 4 pts", "Canvas rubric was not normalized");
    assertFixture(canvasRich?.sources?.map((source) => source.source_type).join(",") === "instructions,rubric,attachment", "Canvas source variants were not retained");
    assertFixture(canvasPartial?.due_at === null && canvasPartial.sources?.[0]?.import_status === "partial", "Canvas undated partial attachment was not preserved");

    const googleRich = google.items.find((item) => item.external_id === "course-211:work-611");
    const googleEmpty = google.items.find((item) => item.external_id === "course-211:work-612");
    assertFixture(googleRich?.due_at === "2030-02-02T08:30:00.000Z", "Google due date and time were not reconstructed");
    assertFixture(googleRich?.sources?.length === 5, "Google mixed materials were not normalized");
    assertFixture(googleRich?.sources?.[1]?.source_type === "attachment", "Google Drive material was not an attachment");
    assertFixture(googleEmpty?.due_at === null && googleEmpty.sources?.length === 0, "Google undated empty work was not retained");
    return "normalized dated, undated, rubric, ready/partial attachment, link, video, and form variants";
  }));
}

function mockIdentityAndRemoval(): string {
  const first = googleClassroomAssignmentKey("course-a", "work-1");
  const replay = googleClassroomAssignmentKey("course-a", "work-1");
  const otherCourse = googleClassroomAssignmentKey("course-b", "work-1");
  const ownerProviderIndex = new Map<string, string>();
  for (const externalId of [first, replay, otherCourse]) {
    ownerProviderIndex.set(`owner-1:google_classroom:${externalId}`, externalId);
  }
  assertFixture(first === replay, "Google assignment identity changed across replay");
  assertFixture(first !== otherCourse, "Google assignment identity did not include the course");
  assertFixture(ownerProviderIndex.size === 2, "replayed provider identity was not deduplicated");

  const complete = planRemovedAssignmentReconciliation({
    provider: "google_classroom",
    existing: [
      { id: "local-1", external_id: first },
      { id: "local-2", external_id: "course-a:removed" },
      { id: "manual", external_id: null },
    ],
    incomingExternalIds: [replay, replay, otherCourse],
    snapshot: "complete",
  });
  const partial = planRemovedAssignmentReconciliation({
    provider: "google_classroom",
    existing: [{ id: "local-2", external_id: "course-a:removed" }],
    incomingExternalIds: [],
    snapshot: "partial",
  });
  assertFixture(complete.removed.length === 1, "complete snapshot did not identify one removed assignment");
  assertFixture(complete.removed[0].preserveStudentWork && !complete.removed[0].deleteAssignment, "removed assignment was not preserved");
  assertFixture(partial.removed.length === 0, "partial snapshot inferred a provider removal");
  return "deduplicated stable provider identities and preserved provider-missing local work only after a complete snapshot";
}

function mockSubmissionCapabilityVariants(): string {
  const canvasText = submissionCapabilities("canvas", {
    provider: "canvas",
    data: { submissionTypes: ["online_text_entry"], canSubmit: true, lockedForUser: false },
  });
  const canvasFile = submissionCapabilities("canvas", {
    provider: "canvas",
    data: { submissionTypes: ["online_upload"], canSubmit: true, lockedForUser: false, allowedExtensions: ["pdf"] },
  });
  const canvasLocked = submissionCapabilities("canvas", {
    provider: "canvas",
    data: { submissionTypes: ["online_text_entry", "online_upload"], canSubmit: false, lockedForUser: true },
  });
  const googleEditable = submissionCapabilities("google_classroom", {
    provider: "google_classroom",
    data: {
      courseWorkType: "ASSIGNMENT",
      associatedWithDeveloper: true,
      submissionId: "submission-1",
      submissionState: "CREATED",
    },
  });
  const googleUnassociated = submissionCapabilities("google_classroom", {
    provider: "google_classroom",
    data: {
      courseWorkType: "ASSIGNMENT",
      associatedWithDeveloper: false,
      submissionId: "submission-2",
      submissionState: "CREATED",
    },
  });
  const googleTurnedIn = submissionCapabilities("google_classroom", {
    provider: "google_classroom",
    data: {
      courseWorkType: "ASSIGNMENT",
      associatedWithDeveloper: true,
      submissionId: "submission-3",
      submissionState: "TURNED_IN",
    },
  });

  assertFixture(canvasText.capabilities.includes("submit_text") && !canvasText.capabilities.includes("upload_file"), "Canvas text-only assignment was misclassified");
  assertFixture(canvasFile.capabilities.includes("upload_file") && canvasFile.allowedExtensions[0] === "pdf", "Canvas file-only assignment was misclassified");
  assertFixture(canvasLocked.capabilities.length === 1 && canvasLocked.capabilities[0] === "open_external", "locked Canvas assignment allowed a direct submission");
  assertFixture(googleEditable.capabilities.includes("upload_file"), "developer-associated Google work was not editable");
  assertFixture(!googleUnassociated.capabilities.includes("upload_file"), "unassociated Google work allowed a direct upload");
  assertFixture(!googleTurnedIn.capabilities.includes("upload_file") && googleTurnedIn.note.includes("turned in"), "turned-in Google work allowed a duplicate upload");
  return "classified Canvas text/file/locked and Google editable/unassociated/turned-in submission variants";
}

async function mockSubmissionDigest(): Promise<string> {
  const original = canaryFile();
  const tampered: SubmissionFile = {
    ...original,
    bytes: new Uint8Array(original.bytes),
  };
  tampered.bytes[tampered.bytes.length - 1] ^= 1;

  let canvasReads = 0;
  let googleReads = 0;
  let providerWrites = 0;
  const fetchMock: FetchLike = async (input, init) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    if (method !== "GET") providerWrites += 1;
    if (url.origin === CANVAS_ORIGIN) {
      canvasReads += 1;
      throw new Error("Canvas should reject the digest before resolving or fetching");
    }
    if (url.origin === "https://classroom.googleapis.com" && url.pathname.endsWith("/studentSubmissions")) {
      googleReads += 1;
      return json({ studentSubmissions: [{
        id: "submission-901",
        state: "CREATED",
        courseWorkType: "ASSIGNMENT",
        associatedWithDeveloper: true,
      }] });
    }
    throw new Error(`unexpected digest fixture request: ${url}`);
  };

  return withEnv(canvasEnv(), () => withFetch(fetchMock, async () => {
    const [canvas, google] = await Promise.all([
      submitCanvasFile({
        institutionId: CANVAS_INSTITUTION_ID,
        baseUrl: CANVAS_ORIGIN,
        token: "mock-canvas-token",
        courseId: "101",
        assignmentId: "901",
        file: tampered,
      }).catch((error) => error),
      submitGoogleClassroomFile({
        token: "mock-google-token",
        courseId: "course-201",
        courseWorkId: "work-901",
        file: tampered,
      }).catch((error) => error),
    ]);
    assertFixture(canvas instanceof Error && canvas.message.includes("changed after it was attached"), "Canvas accepted a digest mismatch");
    assertFixture(google instanceof Error && google.message.includes("changed after it was attached"), "Google accepted a digest mismatch");
    assertFixture(canvasReads === 0, "Canvas digest mismatch reached the provider adapter");
    assertFixture(googleReads === 1 && providerWrites === 0, "Google digest mismatch crossed the read-only inspection boundary");
    return "rejected changed bytes against the bound SHA-256 digest before any provider write";
  }));
}

export function providerCanaryMockFixtures(): readonly ProviderCanaryMockFixture[] {
  return Object.freeze([
    { id: "feature-flags", name: "Independent provider feature flags", run: mockFeatureFlagIsolation },
    { id: "oauth-scopes", name: "Operation-scoped OAuth grants", run: mockOAuthScopeIsolation },
    { id: "pagination", name: "Provider pagination and stable identity", run: mockPagination },
    { id: "assignment-variants", name: "Assignment normalization variants", run: mockAssignmentVariants },
    { id: "identity-removal", name: "Deduplication and removal preservation", run: mockIdentityAndRemoval },
    { id: "submission-capabilities", name: "Assignment submission variants", run: mockSubmissionCapabilityVariants },
    { id: "submission-digest", name: "Submission digest enforcement", run: mockSubmissionDigest },
    { id: "oauth-revoked", name: "Revoked OAuth credentials", run: mockOAuthRevocation },
    { id: "oauth-reconnect", name: "Incomplete OAuth reconnect", run: mockMissingRefreshReconnect },
  ]);
}
