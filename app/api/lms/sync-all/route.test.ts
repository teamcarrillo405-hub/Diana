import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  fetchCanvasAssignments: vi.fn(),
  fetchClassroomAssignments: vi.fn(),
  getValidCanvasToken: vi.fn(),
  getValidGoogleToken: vi.fn(),
  hydrate: vi.fn(),
  persistRefresh: vi.fn(),
  provision: vi.fn(),
  syncAssignments: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/lms/canvas", () => ({
  fetchCanvasAssignments: mocks.fetchCanvasAssignments,
  getValidCanvasToken: mocks.getValidCanvasToken,
}));
vi.mock("@/lib/lms/google", () => ({
  fetchClassroomAssignments: mocks.fetchClassroomAssignments,
  getValidGoogleToken: mocks.getValidGoogleToken,
}));
vi.mock("@/lib/lms/credential-policy", () => ({
  hydrateLmsConnectionForRuntime: mocks.hydrate,
  persistLmsTokenRefreshForRuntime: mocks.persistRefresh,
}));
vi.mock("@/lib/lms/course-mode-identity", () => ({
  provisionCourseModeLmsStudentLinksFromImport: mocks.provision,
}));
vi.mock("@/lib/lms/sync", () => ({ syncLmsAssignments: mocks.syncAssignments }));

import { POST } from "./route";

const userId = "11111111-1111-4111-8111-111111111111";

function storeWithConnections() {
  const connections = [
    {
      id: "22222222-2222-4222-8222-222222222222",
      provider: "canvas",
      config: { institution_id: "school", base_url: "https://canvas.example" },
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      provider: "google_classroom",
      config: {},
    },
  ];
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: userId } } })) },
    from: vi.fn(() => {
      let update = false;
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      Object.assign(builder, {
        select: chain,
        eq: chain,
        in: chain,
        update: vi.fn(() => {
          update = true;
          return builder;
        }),
        then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve(update
            ? { data: null, error: null }
            : { data: connections, error: null }).then(resolve, reject),
      });
      return builder;
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("DIANA_LMS_CANVAS_IMPORT_ENABLED", "true");
  vi.stubEnv("DIANA_LMS_GOOGLE_IMPORT_ENABLED", "true");
  mocks.createClient.mockResolvedValue(storeWithConnections());
  mocks.hydrate.mockImplementation(async (_ownerId: string, connection: Record<string, unknown>) => ({
    ...connection,
    config: connection.provider === "canvas"
      ? { institution_id: "school", base_url: "https://canvas.example", token: "canvas-token" }
      : { access_token: "google-token" },
  }));
  mocks.getValidCanvasToken.mockResolvedValue({ token: "canvas-token" });
  mocks.getValidGoogleToken.mockResolvedValue({ token: "google-token" });
  mocks.fetchCanvasAssignments.mockResolvedValue({ items: [], skipped: 0 });
  mocks.fetchClassroomAssignments.mockResolvedValue({ items: [], skipped: 0 });
  mocks.provision.mockResolvedValue({ linked: 0 });
  mocks.syncAssignments.mockImplementation(async (_store, _owner, source) => ({
    imported: 0,
    skipped: 0,
    source,
    removed: 0,
    reconciliation: { providerMissing: 0, preserved: 0, deleted: 0 },
  }));
});

describe("sync-all LMS identity provisioning", () => {
  it("provisions Canvas and Google identities even for empty complete imports", async () => {
    const response = await POST();
    expect(response.status).toBe(200);
    expect(mocks.provision).toHaveBeenCalledTimes(2);
    expect(mocks.provision).toHaveBeenCalledWith(expect.objectContaining({
      identityConnectionId: "22222222-2222-4222-8222-222222222222",
      provider: "canvas",
      assignments: [],
      canvasInstitutionId: "school",
      canvasBaseUrl: "https://canvas.example",
    }));
    expect(mocks.provision).toHaveBeenCalledWith(expect.objectContaining({
      identityConnectionId: "33333333-3333-4333-8333-333333333333",
      provider: "google_classroom",
      assignments: [],
    }));
  });
});
