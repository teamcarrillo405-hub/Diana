import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(), hydrate: vi.fn(), getValidGoogleToken: vi.fn(),
  fetchClassroomAssignments: vi.fn(), persist: vi.fn(), provision: vi.fn(), sync: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/lms/google", () => ({ getValidGoogleToken: mocks.getValidGoogleToken, fetchClassroomAssignments: mocks.fetchClassroomAssignments }));
vi.mock("@/lib/lms/credential-policy", () => ({ hydrateLmsConnectionForRuntime: mocks.hydrate, persistLmsTokenRefreshForRuntime: mocks.persist }));
vi.mock("@/lib/lms/course-mode-identity", () => ({ provisionCourseModeLmsStudentLinksFromImport: mocks.provision }));
vi.mock("@/lib/lms/sync", () => ({ syncLmsAssignments: mocks.sync }));
import { POST } from "./route";

function store(config: Record<string, unknown>) {
  const connection = { id: "connection", owner_id: "student", provider: "google_classroom", config };
  const builder = { select: vi.fn(), eq: vi.fn(), single: vi.fn(), update: vi.fn() };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);
  builder.single.mockResolvedValue({ data: connection, error: null });
  return { auth: { getUser: vi.fn(async () => ({ data: { user: { id: "student" } } })) }, from: vi.fn(() => builder) };
}
function request() {
  return new Request("https://diana.example/api/lms/classroom-sync", { method: "POST", body: JSON.stringify({ connectionId: "connection" }) });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("DIANA_LMS_GOOGLE_IMPORT_ENABLED", "true");
  mocks.hydrate.mockImplementation(async (_owner, connection) => connection);
  mocks.getValidGoogleToken.mockResolvedValue({ token: "classroom-token" });
  mocks.fetchClassroomAssignments.mockResolvedValue({ items: [], skipped: 0 });
  mocks.provision.mockResolvedValue({ linked: 0 });
  mocks.sync.mockResolvedValue({ imported: 0, skipped: 0, source: "google_classroom" });
});
afterEach(() => vi.unstubAllEnvs());

describe("Classroom sync excludes known Calendar-only connections", () => {
  it.each(["false", "true"])("does not hydrate or contact Classroom for a Calendar-only connection with import=%s", async enabled => {
    vi.stubEnv("DIANA_LMS_GOOGLE_IMPORT_ENABLED", enabled);
    mocks.createClient.mockResolvedValue(store({ calendar_enabled: true, granted_scopes: ["openid", "email", "https://www.googleapis.com/auth/calendar.readonly"] }));
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ imported: 0, skipped: 0, source: "google_classroom", notApplicable: true });
    expect(mocks.hydrate).not.toHaveBeenCalled();
    expect(mocks.getValidGoogleToken).not.toHaveBeenCalled();
    expect(mocks.fetchClassroomAssignments).not.toHaveBeenCalled();
    expect(mocks.sync).not.toHaveBeenCalled();
  });

  it.each([
    { calendar_enabled: true, granted_scopes: ["https://www.googleapis.com/auth/calendar.readonly", "https://www.googleapis.com/auth/classroom.courses.readonly"] },
    { calendar_enabled: true, connection_mode: "teacher", oauth: true },
  ])("preserves normal imports for mixed or legacy connections: %j", async config => {
    mocks.createClient.mockResolvedValue(store(config));
    expect((await POST(request())).status).toBe(200);
    expect(mocks.fetchClassroomAssignments).toHaveBeenCalledWith("classroom-token");
    expect(mocks.sync).toHaveBeenCalledOnce();
  });

  it("keeps the Classroom feature flag enforced for a mixed grant", async () => {
    vi.stubEnv("DIANA_LMS_GOOGLE_IMPORT_ENABLED", "false");
    mocks.createClient.mockResolvedValue(store({ calendar_enabled: true, granted_scopes: ["https://www.googleapis.com/auth/calendar.readonly", "https://www.googleapis.com/auth/classroom.courses.readonly"] }));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "provider_feature_disabled" });
    expect(mocks.hydrate).not.toHaveBeenCalled();
    expect(mocks.fetchClassroomAssignments).not.toHaveBeenCalled();
  });
});
