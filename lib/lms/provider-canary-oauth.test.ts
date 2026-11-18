import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildCalendarReturnHref } from "../calendar-return";

import {
  issueLmsOAuthState,
  LMS_OAUTH_STATE_TTL_MS,
  verifyLmsOAuthState,
} from "./oauth-state";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  cookies: vi.fn(),
  assertLmsCredentialVaultAvailable: vi.fn(),
  fetchCanvasAssignments: vi.fn(),
  fetchClassroomAssignments: vi.fn(),
  fetchCanvasDestination: vi.fn(),
  resolveCanvasInstitutionFromRequest: vi.fn(),
  resolveCanvasInstitutionById: vi.fn(),
  saveLmsConnectionForRuntime: vi.fn(),
  syncGoogleCalendarEvents: vi.fn(),
  syncLmsAssignments: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

vi.mock("@/lib/lms/canvas", async () => {
  const actual = await vi.importActual<typeof import("./canvas")>("./canvas");
  return {
    ...actual,
    fetchCanvasAssignments: mocks.fetchCanvasAssignments,
  };
});

vi.mock("@/lib/lms/google", async () => {
  const actual = await vi.importActual<typeof import("./google")>("./google");
  return {
    ...actual,
    fetchClassroomAssignments: mocks.fetchClassroomAssignments,
  };
});

vi.mock("@/lib/lms/credential-policy", async () => {
  const actual = await vi.importActual<typeof import("./credential-policy")>("./credential-policy");
  return {
    ...actual,
    assertLmsCredentialVaultAvailable: mocks.assertLmsCredentialVaultAvailable,
    saveLmsConnectionForRuntime: mocks.saveLmsConnectionForRuntime,
  };
});

vi.mock("@/lib/lms/sync", () => ({
  syncLmsAssignments: mocks.syncLmsAssignments,
}));

vi.mock("@/lib/lms/google-calendar", () => ({
  syncGoogleCalendarEvents: mocks.syncGoogleCalendarEvents,
}));

vi.mock("@/lib/security/canvas-institutions", async () => {
  const actual = await vi.importActual<typeof import("../security/canvas-institutions")>(
    "../security/canvas-institutions",
  );
  return {
    ...actual,
    fetchCanvasDestination: mocks.fetchCanvasDestination,
    resolveCanvasInstitutionFromRequest: mocks.resolveCanvasInstitutionFromRequest,
    resolveCanvasInstitutionById: mocks.resolveCanvasInstitutionById,
  };
});

type CookieValues = Record<string, string | undefined>;

function cookieStore(values: CookieValues) {
  return {
    get: vi.fn((name: string) => values[name] === undefined ? undefined : { value: values[name] }),
  };
}

function supabaseDouble(ownerId = "student-1", existingConfig?: Record<string, unknown>) {
  const query: Record<string, unknown> = {};
  Object.assign(query, {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    update: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: existingConfig ? { config: existingConfig } : null, error: null })),
    then: (
      resolve: (value: { data: null; error: null }) => unknown,
      reject: (reason: unknown) => unknown,
    ) => Promise.resolve({ data: null, error: null }).then(resolve, reject),
  });
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: ownerId } } })) },
    from: vi.fn(() => query),
  };
}

function redirectStatus(response: Response, provider: "canvas" | "classroom"): string | null {
  const location = response.headers.get("location");
  if (!location) throw new Error("OAuth callback did not redirect");
  return new URL(location).searchParams.get(provider);
}

function enableOnly(feature: "canvas_submission" | "google_submission"): void {
  vi.stubEnv("DIANA_LMS_CANVAS_IMPORT_ENABLED", "false");
  vi.stubEnv("DIANA_LMS_CANVAS_SUBMISSION_ENABLED", feature === "canvas_submission" ? "true" : "false");
  vi.stubEnv("DIANA_LMS_GOOGLE_IMPORT_ENABLED", "false");
  vi.stubEnv("DIANA_LMS_GOOGLE_SUBMISSION_ENABLED", feature === "google_submission" ? "true" : "false");
}

function canvasState(ownerId = "student-1", now = Date.now()) {
  return issueLmsOAuthState({
    provider: "canvas",
    ownerId,
    secret: "test-oauth-state-secret",
    now,
    context: {
      institutionId: "diana-canary",
      courseMode: false,
      returnTo: "/settings",
    },
  });
}

function googleState(ownerId = "student-1", now = Date.now()) {
  return issueLmsOAuthState({
    provider: "google_classroom",
    ownerId,
    secret: "test-oauth-state-secret",
    now,
    context: {
      courseMode: false,
      calendar: false,
      returnTo: "/settings",
    },
  });
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("LMS_OAUTH_STATE_SECRET", "test-oauth-state-secret");
  vi.stubEnv("CANVAS_CLIENT_ID", "canvas-client");
  vi.stubEnv("CANVAS_CLIENT_SECRET", "canvas-secret");
  vi.stubEnv("GOOGLE_CLIENT_ID", "google-client");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-secret");
  vi.stubEnv("DIANA_GOOGLE_CALENDAR_ENABLED", "false");
  vi.stubEnv("DIANA_LMS_GOOGLE_IMPORT_ENABLED", "false");
  vi.stubEnv("DIANA_LMS_GOOGLE_SUBMISSION_ENABLED", "false");
  mocks.createClient.mockResolvedValue(supabaseDouble());
  mocks.assertLmsCredentialVaultAvailable.mockResolvedValue(undefined);
  mocks.resolveCanvasInstitutionFromRequest.mockResolvedValue({
    id: "diana-canary",
    origin: "https://93.184.216.34",
  });
  mocks.resolveCanvasInstitutionById.mockResolvedValue({
    id: "diana-canary",
    origin: "https://93.184.216.34",
  });
  mocks.saveLmsConnectionForRuntime.mockResolvedValue(undefined);
  mocks.syncGoogleCalendarEvents.mockResolvedValue({ imported: 0, skipped: 0 });
  mocks.syncLmsAssignments.mockResolvedValue({
    imported: 0,
    skipped: 0,
    source: "canvas",
    removed: 0,
    reconciliation: { providerMissing: 0, preserved: 0, deleted: 0 },
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("provider canary OAuth callback fixtures", () => {
  const calendarScopes = ["openid", "email", "https://www.googleapis.com/auth/calendar.readonly"];
  function calendarState() {
    return issueLmsOAuthState({ provider: "google_classroom", ownerId: "student-1", secret: "test-oauth-state-secret",
      context: { calendar: true, courseMode: false, returnTo: buildCalendarReturnHref({ day: "2026-11-18", view: "week", item: "google-one~2026-11-18" }) as `/calendar?${string}` } });
  }

  it("requests only read-only Calendar and identity scopes even when Classroom features are enabled", async () => {
    vi.stubEnv("DIANA_GOOGLE_CALENDAR_ENABLED", "true");
    vi.stubEnv("DIANA_LMS_GOOGLE_IMPORT_ENABLED", "true");
    vi.stubEnv("DIANA_LMS_GOOGLE_SUBMISSION_ENABLED", "true");
    const { GET } = await import("@/app/api/lms/google-oauth/start/route");
    const response = await GET(new Request("https://diana.example/api/lms/google-oauth/start?calendar=1&return_to=%2Fcalendar"));
    const location = new URL(response.headers.get("location")!);
    expect(location.origin).toBe("https://accounts.google.com");
    expect(location.searchParams.get("scope")?.split(" ")).toEqual(calendarScopes);
    expect(location.searchParams.get("include_granted_scopes")).toBe("true");
    expect(location.searchParams.get("redirect_uri")).toBe("https://diana.example/api/lms/google-oauth/callback");
  });

  it("allows Calendar-only connection without enabling or importing Classroom", async () => {
    vi.stubEnv("DIANA_GOOGLE_CALENDAR_ENABLED", "true");
    const issued = calendarState();
    mocks.cookies.mockResolvedValue(cookieStore({ google_oauth_state: issued.cookieVerifier }));
    const network = vi.fn(async () => new Response(JSON.stringify({ access_token: "calendar-access", refresh_token: "calendar-refresh", scope: calendarScopes.join(" ") })));
    vi.stubGlobal("fetch", network);
    const { GET } = await import("@/app/api/lms/google-oauth/callback/route");
    const response = await GET(new Request(`https://diana.example/api/lms/google-oauth/callback?code=code-1&state=${encodeURIComponent(issued.state)}`));
    expect(redirectStatus(response, "classroom")).toBe("calendar-connected");
    expect(new URL(response.headers.get("location")!).searchParams.get("item")).toBe("google-one~2026-11-18");
    expect(mocks.syncGoogleCalendarEvents).toHaveBeenCalledWith(expect.anything(), "student-1", "calendar-access");
    expect(mocks.fetchClassroomAssignments).not.toHaveBeenCalled();
    expect(mocks.syncLmsAssignments).not.toHaveBeenCalled();
    expect(mocks.saveLmsConnectionForRuntime).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      config: expect.objectContaining({ calendar_enabled: true, granted_scopes: calendarScopes }),
    }));
  });

  it("preserves an existing teacher connection and prior grants on Calendar reconnect without a Classroom import", async () => {
    vi.stubEnv("DIANA_GOOGLE_CALENDAR_ENABLED", "true");
    vi.stubEnv("DIANA_LMS_GOOGLE_IMPORT_ENABLED", "true");
    const priorScopes = ["openid", "email", "https://www.googleapis.com/auth/classroom.coursework.students.readonly", "https://www.googleapis.com/auth/drive.readonly"];
    mocks.createClient.mockResolvedValue(supabaseDouble("student-1", {
      connection_mode: "teacher", granted_scopes: priorScopes, calendar_last_synced_at: "2026-11-17T00:00:00Z",
    }));
    const issued = calendarState();
    mocks.cookies.mockResolvedValue(cookieStore({ google_oauth_state: issued.cookieVerifier }));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ access_token: "combined-access", refresh_token: "combined-refresh", scope: [...new Set([...priorScopes, ...calendarScopes])].join(" ") }))));
    const { GET } = await import("@/app/api/lms/google-oauth/callback/route");
    const response = await GET(new Request(`https://diana.example/api/lms/google-oauth/callback?code=code-1&state=${encodeURIComponent(issued.state)}`));
    expect(redirectStatus(response, "classroom")).toBe("calendar-connected");
    expect(mocks.saveLmsConnectionForRuntime).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ config: expect.objectContaining({
      connection_mode: "teacher", calendar_last_synced_at: "2026-11-17T00:00:00Z", calendar_enabled: true,
    }) }));
    expect(mocks.fetchClassroomAssignments).not.toHaveBeenCalled();
  });

  it("does not overwrite existing LMS credentials when Google returns a narrower Calendar grant", async () => {
    vi.stubEnv("DIANA_GOOGLE_CALENDAR_ENABLED", "true");
    mocks.createClient.mockResolvedValue(supabaseDouble("student-1", { connection_mode: "student",
      granted_scopes: ["openid", "email", "https://www.googleapis.com/auth/drive.readonly"] }));
    const issued = calendarState();
    mocks.cookies.mockResolvedValue(cookieStore({ google_oauth_state: issued.cookieVerifier }));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ access_token: "narrow-access", scope: calendarScopes.join(" ") }))));
    const { GET } = await import("@/app/api/lms/google-oauth/callback/route");
    const response = await GET(new Request(`https://diana.example/api/lms/google-oauth/callback?code=code-1&state=${encodeURIComponent(issued.state)}`));
    expect(redirectStatus(response, "classroom")).toBe("scope-error");
    expect(mocks.saveLmsConnectionForRuntime).not.toHaveBeenCalled();
    expect(mocks.syncGoogleCalendarEvents).not.toHaveBeenCalled();
  });

  it.each([false, true])("preserves a legacy LMS connection with Calendar enabled=%s when its prior scopes cannot be verified", async calendarEnabled => {
    vi.stubEnv("DIANA_GOOGLE_CALENDAR_ENABLED", "true");
    mocks.createClient.mockResolvedValue(supabaseDouble("student-1", { connection_mode: calendarEnabled ? "teacher" : "student", oauth: true, calendar_enabled: calendarEnabled }));
    const issued = calendarState();
    mocks.cookies.mockResolvedValue(cookieStore({ google_oauth_state: issued.cookieVerifier }));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ access_token: "narrow-access", scope: calendarScopes.join(" ") }))));
    const { GET } = await import("@/app/api/lms/google-oauth/callback/route");
    const response = await GET(new Request(`https://diana.example/api/lms/google-oauth/callback?code=code-1&state=${encodeURIComponent(issued.state)}`));
    expect(redirectStatus(response, "classroom")).toBe("scope-error");
    expect(mocks.saveLmsConnectionForRuntime).not.toHaveBeenCalled();
  });

  it("keeps Calendar disabled in both OAuth endpoints when only Classroom is enabled", async () => {
    vi.stubEnv("DIANA_LMS_GOOGLE_IMPORT_ENABLED", "true");
    const issued = calendarState();
    mocks.cookies.mockResolvedValue(cookieStore({ google_oauth_state: issued.cookieVerifier }));
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    const { GET: start } = await import("@/app/api/lms/google-oauth/start/route");
    const { GET: callback } = await import("@/app/api/lms/google-oauth/callback/route");
    expect(redirectStatus(await start(new Request("https://diana.example/api/lms/google-oauth/start?calendar=1")), "classroom")).toBe("disabled");
    expect(redirectStatus(await callback(new Request(`https://diana.example/api/lms/google-oauth/callback?code=code-1&state=${encodeURIComponent(issued.state)}`)), "classroom")).toBe("disabled");
    expect(network).not.toHaveBeenCalled();
    expect(mocks.saveLmsConnectionForRuntime).not.toHaveBeenCalled();
  });

  it("does not enable either standard Classroom OAuth endpoint when only Calendar is enabled", async () => {
    vi.stubEnv("DIANA_GOOGLE_CALENDAR_ENABLED", "true");
    const issued = googleState();
    mocks.cookies.mockResolvedValue(cookieStore({ google_oauth_state: issued.cookieVerifier }));
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    const { GET: start } = await import("@/app/api/lms/google-oauth/start/route");
    const { GET: callback } = await import("@/app/api/lms/google-oauth/callback/route");
    expect(redirectStatus(await start(new Request("https://diana.example/api/lms/google-oauth/start")), "classroom")).toBe("disabled");
    expect(redirectStatus(await callback(new Request(`https://diana.example/api/lms/google-oauth/callback?code=code-1&state=${encodeURIComponent(issued.state)}`)), "classroom")).toBe("disabled");
    expect(network).not.toHaveBeenCalled();
    expect(mocks.saveLmsConnectionForRuntime).not.toHaveBeenCalled();
  });

  it("preserves an existing Calendar grant through a standard Classroom reconnect", async () => {
    enableOnly("google_submission");
    vi.stubEnv("DIANA_GOOGLE_CALENDAR_ENABLED", "true");
    mocks.createClient.mockResolvedValue(supabaseDouble("student-1", { calendar_enabled: true,
      calendar_last_synced_at: "2026-11-17T00:00:00Z", granted_scopes: calendarScopes, connection_mode: "student" }));
    const issued = googleState();
    mocks.cookies.mockResolvedValue(cookieStore({ google_oauth_state: issued.cookieVerifier }));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ access_token: "combined-access", refresh_token: "combined-refresh",
      scope: [...calendarScopes, "https://www.googleapis.com/auth/classroom.courses.readonly", "https://www.googleapis.com/auth/classroom.coursework.me", "https://www.googleapis.com/auth/drive.file"].join(" ") }))));
    const { GET } = await import("@/app/api/lms/google-oauth/callback/route");
    const response = await GET(new Request(`https://diana.example/api/lms/google-oauth/callback?code=code-1&state=${encodeURIComponent(issued.state)}`));
    expect(redirectStatus(response, "classroom")).toBe("connected");
    expect(mocks.saveLmsConnectionForRuntime).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ config: expect.objectContaining({ calendar_enabled: true, calendar_last_synced_at: "2026-11-17T00:00:00Z" }) }));
    expect(mocks.syncGoogleCalendarEvents).toHaveBeenCalledOnce();
    expect(mocks.fetchClassroomAssignments).not.toHaveBeenCalled();
  });

  it("rejects a Calendar callback missing Calendar permission before saving or importing", async () => {
    vi.stubEnv("DIANA_GOOGLE_CALENDAR_ENABLED", "true");
    const issued = calendarState();
    mocks.cookies.mockResolvedValue(cookieStore({ google_oauth_state: issued.cookieVerifier }));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ access_token: "partial-access", scope: "openid email" }))));
    const { GET } = await import("@/app/api/lms/google-oauth/callback/route");
    const response = await GET(new Request(`https://diana.example/api/lms/google-oauth/callback?code=code-1&state=${encodeURIComponent(issued.state)}`));
    expect(redirectStatus(response, "classroom")).toBe("scope-error");
    expect(mocks.saveLmsConnectionForRuntime).not.toHaveBeenCalled();
    expect(mocks.syncGoogleCalendarEvents).not.toHaveBeenCalled();
  });

  it("returns Calendar configuration errors to the selected date and view", async () => {
    vi.stubEnv("DIANA_GOOGLE_CALENDAR_ENABLED", "true");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    const { GET } = await import("@/app/api/lms/google-oauth/start/route");
    const returnTo = "/calendar?day=2026-11-17&view=week&item=google-one";
    const request = new URL("https://diana.example/api/lms/google-oauth/start");
    request.searchParams.set("calendar", "1");
    request.searchParams.set("return_to", returnTo);
    const response = await GET(new Request(request));
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/calendar");
    expect(location.searchParams.get("day")).toBe("2026-11-17");
    expect(location.searchParams.get("view")).toBe("week");
    expect(location.searchParams.get("item")).toBe("google-one");
    expect(location.searchParams.get("classroom")).toBe("not-configured");
  });

  it("returns declined Google consent to Calendar without a token exchange", async () => {
    vi.stubEnv("DIANA_GOOGLE_CALENDAR_ENABLED", "true");
    const returnTo = buildCalendarReturnHref({ day: "2026-11-18", view: "month", item: "google-one~2026-11-18" }) as `/calendar?${string}`;
    const issued = issueLmsOAuthState({ provider: "google_classroom", ownerId: "student-1", secret: "test-oauth-state-secret",
      context: { calendar: true, courseMode: false, returnTo } });
    mocks.cookies.mockResolvedValue(cookieStore({ google_oauth_state: issued.cookieVerifier }));
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    const { GET } = await import("@/app/api/lms/google-oauth/callback/route");
    const request = new URL("https://diana.example/api/lms/google-oauth/callback");
    request.searchParams.set("state", issued.state);
    request.searchParams.set("error", "access_denied");
    const response = await GET(new Request(request));
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/calendar");
    expect(location.searchParams.get("day")).toBe("2026-11-18");
    expect(location.searchParams.get("view")).toBe("month");
    expect(location.searchParams.get("item")).toBe("google-one~2026-11-18");
    expect(location.searchParams.get("classroom")).toBe("denied");
    expect(network).not.toHaveBeenCalled();
    expect(mocks.saveLmsConnectionForRuntime).not.toHaveBeenCalled();
  });

  it("issues Canvas and Google start states bound to the initiating Diana user", async () => {
    vi.stubEnv("CANVAS_ALLOWED_ORIGINS", "https://canvas.example.edu");

    enableOnly("canvas_submission");
    const { GET: startCanvas } = await import("@/app/api/lms/canvas-oauth/start/route");
    const canvasResponse = await startCanvas(new Request(
      "https://diana.example/api/lms/canvas-oauth/start?base_url=https%3A%2F%2Fcanvas.example.edu",
    ));
    const canvasRedirect = new URL(canvasResponse.headers.get("location") ?? "");
    const canvasVerifier = canvasResponse.cookies.get("canvas_oauth_state")?.value;
    const canvasVerification = verifyLmsOAuthState({
      state: canvasRedirect.searchParams.get("state"),
      cookieVerifier: canvasVerifier,
      provider: "canvas",
      authenticatedOwnerId: "student-1",
      secret: "test-oauth-state-secret",
    });

    enableOnly("google_submission");
    const { GET: startGoogle } = await import("@/app/api/lms/google-oauth/start/route");
    const googleResponse = await startGoogle(new Request(
      "https://diana.example/api/lms/google-oauth/start?return_to=%2Fsettings",
    ));
    const googleRedirect = new URL(googleResponse.headers.get("location") ?? "");
    const googleVerifier = googleResponse.cookies.get("google_oauth_state")?.value;
    const googleVerification = verifyLmsOAuthState({
      state: googleRedirect.searchParams.get("state"),
      cookieVerifier: googleVerifier,
      provider: "google_classroom",
      authenticatedOwnerId: "student-1",
      secret: "test-oauth-state-secret",
    });

    expect(canvasVerification).toMatchObject({
      ok: true,
      payload: {
        context: {
          institutionId: "diana-canary",
          courseMode: false,
          returnTo: "/settings",
        },
      },
    });
    expect(googleVerification).toMatchObject({
      ok: true,
      payload: { context: { courseMode: false, calendar: false, returnTo: "/settings" } },
    });
    expect(canvasRedirect.searchParams.get("state")).not.toBe(canvasVerifier);
    expect(googleRedirect.searchParams.get("state")).not.toBe(googleVerifier);
    expect(canvasResponse.headers.get("set-cookie")).toContain("HttpOnly");
    expect(googleResponse.headers.get("set-cookie")).toContain("Max-Age=600");
  });

  it("fails Canvas denial and state mismatch closed without token exchange", async () => {
    enableOnly("canvas_submission");
    const issued = canvasState();
    mocks.cookies
      .mockResolvedValueOnce(cookieStore({ canvas_oauth_state: issued.cookieVerifier }))
      .mockResolvedValueOnce(cookieStore({ canvas_oauth_state: "wrong-cookie-verifier" }));
    const ambientFetch = vi.fn(async () => {
      throw new Error("ambient network must not be used");
    });
    vi.stubGlobal("fetch", ambientFetch);
    const { GET } = await import("@/app/api/lms/canvas-oauth/callback/route");

    const denied = await GET(new Request(
      `https://diana.example/api/lms/canvas-oauth/callback?error=access_denied&state=${encodeURIComponent(issued.state)}`,
    ));
    const mismatched = await GET(new Request(
      `https://diana.example/api/lms/canvas-oauth/callback?code=code-1&state=${encodeURIComponent(issued.state)}`,
    ));

    expect(redirectStatus(denied, "canvas")).toBe("denied");
    expect(redirectStatus(mismatched, "canvas")).toBe("state-mismatch");
    expect(mocks.fetchCanvasDestination).not.toHaveBeenCalled();
    expect(mocks.saveLmsConnectionForRuntime).not.toHaveBeenCalled();
    expect(ambientFetch).not.toHaveBeenCalled();
  });

  it("consumes Canvas state so a successful callback cannot be replayed", async () => {
    enableOnly("canvas_submission");
    const issued = canvasState();
    mocks.cookies
      .mockResolvedValueOnce(cookieStore({
        canvas_oauth_state: issued.cookieVerifier,
      }))
      .mockResolvedValueOnce(cookieStore({}));
    mocks.fetchCanvasDestination.mockResolvedValue(new Response(JSON.stringify({
      access_token: "canvas-access",
      refresh_token: "canvas-refresh",
      expires_in: 3600,
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const ambientFetch = vi.fn(async () => {
      throw new Error("ambient network must not be used");
    });
    vi.stubGlobal("fetch", ambientFetch);
    const { GET } = await import("@/app/api/lms/canvas-oauth/callback/route");
    const requestUrl = `https://diana.example/api/lms/canvas-oauth/callback?code=code-1&state=${encodeURIComponent(issued.state)}`;

    const accepted = await GET(new Request(requestUrl));
    const replay = await GET(new Request(requestUrl));

    expect(redirectStatus(accepted, "canvas")).toBe("connected");
    expect(accepted.headers.get("set-cookie")).toContain("canvas_oauth_state=;");
    expect(accepted.headers.get("set-cookie")).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    expect(redirectStatus(replay, "canvas")).toBe("state-mismatch");
    expect(mocks.fetchCanvasDestination).toHaveBeenCalledTimes(1);
    expect(mocks.saveLmsConnectionForRuntime).toHaveBeenCalledTimes(1);
    expect(ambientFetch).not.toHaveBeenCalled();
  });

  it("rejects an OAuth callback after the signed-in Diana account changes", async () => {
    const canvasIssued = canvasState("student-1");
    const googleIssued = googleState("student-1");
    mocks.createClient.mockResolvedValue(supabaseDouble("student-2"));
    mocks.cookies
      .mockResolvedValueOnce(cookieStore({ canvas_oauth_state: canvasIssued.cookieVerifier }))
      .mockResolvedValueOnce(cookieStore({ google_oauth_state: googleIssued.cookieVerifier }));
    const fetchMock = vi.fn(async () => {
      throw new Error("account-switched callback must not reach a provider");
    });
    vi.stubGlobal("fetch", fetchMock);

    enableOnly("canvas_submission");
    const { GET: canvasCallback } = await import("@/app/api/lms/canvas-oauth/callback/route");
    const canvasResponse = await canvasCallback(new Request(
      `https://diana.example/api/lms/canvas-oauth/callback?code=code-1&state=${encodeURIComponent(canvasIssued.state)}`,
    ));

    enableOnly("google_submission");
    const { GET: googleCallback } = await import("@/app/api/lms/google-oauth/callback/route");
    const googleResponse = await googleCallback(new Request(
      `https://diana.example/api/lms/google-oauth/callback?code=code-1&state=${encodeURIComponent(googleIssued.state)}`,
    ));

    expect(redirectStatus(canvasResponse, "canvas")).toBe("state-mismatch");
    expect(redirectStatus(googleResponse, "classroom")).toBe("state-mismatch");
    expect(mocks.fetchCanvasDestination).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.saveLmsConnectionForRuntime).not.toHaveBeenCalled();
  });

  it("rejects expired and malformed state in both provider callbacks", async () => {
    const expiredAt = Date.now() - LMS_OAUTH_STATE_TTL_MS - 1;
    const expiredCanvas = canvasState("student-1", expiredAt);
    const expiredGoogle = googleState("student-1", expiredAt);
    mocks.cookies
      .mockResolvedValueOnce(cookieStore({ canvas_oauth_state: expiredCanvas.cookieVerifier }))
      .mockResolvedValueOnce(cookieStore({ canvas_oauth_state: "malformed-cookie" }))
      .mockResolvedValueOnce(cookieStore({ google_oauth_state: expiredGoogle.cookieVerifier }))
      .mockResolvedValueOnce(cookieStore({ google_oauth_state: "malformed-cookie" }));
    const fetchMock = vi.fn(async () => {
      throw new Error("invalid state must not reach a provider");
    });
    vi.stubGlobal("fetch", fetchMock);

    enableOnly("canvas_submission");
    const { GET: canvasCallback } = await import("@/app/api/lms/canvas-oauth/callback/route");
    const expiredCanvasResponse = await canvasCallback(new Request(
      `https://diana.example/api/lms/canvas-oauth/callback?code=code-1&state=${encodeURIComponent(expiredCanvas.state)}`,
    ));
    const malformedCanvasResponse = await canvasCallback(new Request(
      "https://diana.example/api/lms/canvas-oauth/callback?code=code-1&state=malformed",
    ));

    enableOnly("google_submission");
    const { GET: googleCallback } = await import("@/app/api/lms/google-oauth/callback/route");
    const expiredGoogleResponse = await googleCallback(new Request(
      `https://diana.example/api/lms/google-oauth/callback?code=code-1&state=${encodeURIComponent(expiredGoogle.state)}`,
    ));
    const malformedGoogleResponse = await googleCallback(new Request(
      "https://diana.example/api/lms/google-oauth/callback?code=code-1&state=malformed",
    ));

    expect(redirectStatus(expiredCanvasResponse, "canvas")).toBe("state-mismatch");
    expect(redirectStatus(malformedCanvasResponse, "canvas")).toBe("state-mismatch");
    expect(redirectStatus(expiredGoogleResponse, "classroom")).toBe("state-mismatch");
    expect(redirectStatus(malformedGoogleResponse, "classroom")).toBe("state-mismatch");
    expect(mocks.fetchCanvasDestination).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.saveLmsConnectionForRuntime).not.toHaveBeenCalled();
  });

  it("fails Google denial and state mismatch closed without token exchange", async () => {
    enableOnly("google_submission");
    const issued = googleState();
    mocks.cookies
      .mockResolvedValueOnce(cookieStore({ google_oauth_state: issued.cookieVerifier }))
      .mockResolvedValueOnce(cookieStore({ google_oauth_state: "wrong-cookie-verifier" }));
    const fetchMock = vi.fn(async () => {
      throw new Error("token exchange must not run");
    });
    vi.stubGlobal("fetch", fetchMock);
    const { GET } = await import("@/app/api/lms/google-oauth/callback/route");

    const denied = await GET(new Request(
      `https://diana.example/api/lms/google-oauth/callback?error=access_denied&state=${encodeURIComponent(issued.state)}`,
    ));
    const mismatched = await GET(new Request(
      `https://diana.example/api/lms/google-oauth/callback?code=code-1&state=${encodeURIComponent(issued.state)}`,
    ));

    expect(redirectStatus(denied, "classroom")).toBe("denied");
    expect(redirectStatus(mismatched, "classroom")).toBe("state-mismatch");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.saveLmsConnectionForRuntime).not.toHaveBeenCalled();
  });

  it("consumes Google state so a successful callback cannot be replayed", async () => {
    enableOnly("google_submission");
    const issued = googleState();
    mocks.cookies
      .mockResolvedValueOnce(cookieStore({
        google_oauth_state: issued.cookieVerifier,
      }))
      .mockResolvedValueOnce(cookieStore({}));
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      access_token: "google-access",
      refresh_token: "google-refresh",
      expires_in: 3600,
      scope: [
        "openid",
        "email",
        "https://www.googleapis.com/auth/classroom.courses.readonly",
        "https://www.googleapis.com/auth/classroom.coursework.me",
        "https://www.googleapis.com/auth/drive.file",
      ].join(" "),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const { GET } = await import("@/app/api/lms/google-oauth/callback/route");
    const requestUrl = `https://diana.example/api/lms/google-oauth/callback?code=code-1&state=${encodeURIComponent(issued.state)}`;

    const accepted = await GET(new Request(requestUrl));
    const replay = await GET(new Request(requestUrl));

    expect(redirectStatus(accepted, "classroom")).toBe("connected");
    expect(accepted.headers.get("set-cookie")).toContain("google_oauth_state=;");
    expect(accepted.headers.get("set-cookie")).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    expect(redirectStatus(replay, "classroom")).toBe("state-mismatch");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.saveLmsConnectionForRuntime).toHaveBeenCalledTimes(1);
  });

  it("rejects an incomplete Google grant before saving credentials", async () => {
    enableOnly("google_submission");
    const issued = googleState();
    mocks.cookies.mockResolvedValue(cookieStore({
      google_oauth_state: issued.cookieVerifier,
    }));
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      access_token: "scope-limited-access",
      refresh_token: "scope-limited-refresh",
      expires_in: 3600,
      scope: [
        "openid",
        "email",
        "https://www.googleapis.com/auth/classroom.courses.readonly",
        "https://www.googleapis.com/auth/classroom.coursework.me",
      ].join(" "),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const { GET } = await import("@/app/api/lms/google-oauth/callback/route");

    const response = await GET(new Request(
      `https://diana.example/api/lms/google-oauth/callback?code=code-1&state=${encodeURIComponent(issued.state)}`,
    ));

    expect(redirectStatus(response, "classroom")).toBe("scope-error");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.saveLmsConnectionForRuntime).not.toHaveBeenCalled();
  });
});
