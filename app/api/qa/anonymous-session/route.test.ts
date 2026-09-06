import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  users: [] as Array<{ id: string; email: string }>,
  createUser: vi.fn(),
  updateUserById: vi.fn(),
  signInWithPassword: vi.fn(),
  profileUpsert: vi.fn(),
  seedGraysonFreshmanDemo: vi.fn(),
  seedScreenDesignScenario: vi.fn(),
  resetScreenDesignOwner: vi.fn(),
  getScreenDesignFixtureScenario: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    auth: {
      admin: {
        listUsers: vi.fn(async () => ({ data: { users: mocks.users }, error: null })),
        createUser: mocks.createUser,
        updateUserById: mocks.updateUserById,
      },
    },
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { signInWithPassword: mocks.signInWithPassword },
    from: () => ({ upsert: mocks.profileUpsert }),
  }),
}));

vi.mock("@/lib/qa/grayson-demo", () => ({
  resetScreenDesignOwner: mocks.resetScreenDesignOwner,
  seedGraysonFreshmanDemo: mocks.seedGraysonFreshmanDemo,
  seedScreenDesignScenario: mocks.seedScreenDesignScenario,
}));

vi.mock("@/lib/qa/screendesign-fixtures", () => ({
  getScreenDesignFixtureScenario: mocks.getScreenDesignFixtureScenario,
}));

import { GET } from "./route";

describe("anonymous QA session bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("QA_CREATE_USER", "true");
    mocks.users = [];
    mocks.createUser.mockResolvedValue({ data: { user: { id: "qa-user" } }, error: null });
    mocks.updateUserById.mockResolvedValue({ data: { user: { id: "qa-user" } }, error: null });
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    mocks.profileUpsert.mockResolvedValue({ error: null });
    mocks.getScreenDesignFixtureScenario.mockReturnValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates a disposable teen account with the same required signup attestation", async () => {
    const response = await GET(new Request("http://diana.test/api/qa/anonymous-session"));

    expect(response.status).toBe(200);
    expect(mocks.createUser).toHaveBeenCalledWith(expect.objectContaining({
      user_metadata: expect.objectContaining({
        date_of_birth: "2009-09-01",
        teen_guardian_permission_attested: true,
        teen_guardian_permission_policy_version: "teen_openai_beta_v1",
        teen_guardian_permission_source: "signup_attestation",
      }),
    }));
  });

  it("repairs existing disposable accounts with the same signup metadata", async () => {
    mocks.users = [{ id: "qa-user", email: "diana-qa-student@local.test" }];

    const response = await GET(new Request("http://diana.test/api/qa/anonymous-session"));

    expect(response.status).toBe(200);
    expect(mocks.updateUserById).toHaveBeenCalledWith("qa-user", expect.objectContaining({
      user_metadata: expect.objectContaining({
        teen_guardian_permission_attested: true,
        teen_guardian_permission_source: "signup_attestation",
      }),
    }));
  });

  it("resumes an existing scenario without replacing its fixture records", async () => {
    mocks.users = [{ id: "qa-user", email: "diana-qa-student@local.test" }];
    mocks.getScreenDesignFixtureScenario.mockReturnValue({
      id: "assignment-detail:default",
      ownerAlias: "qa-primary",
    });

    const response = await GET(new Request(
      "http://diana.test/api/qa/anonymous-session?scenario=assignment-detail%3Adefault&operation=resume",
    ));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      resumed: true,
      scenarioId: "assignment-detail:default",
    });
    expect(mocks.seedScreenDesignScenario).not.toHaveBeenCalled();
    expect(mocks.resetScreenDesignOwner).not.toHaveBeenCalled();
  });

  it("permits the signed loopback browser gate in production mode", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("QA_SERVER_MODE", "production");
    vi.stubEnv("QA_LOCAL_BROWSER_GATE", "true");
    vi.stubEnv("NEXT_PUBLIC_DIANA_BETA_BROWSER_QA", "true");
    vi.stubEnv("QA_BROWSER_SESSION_TOKEN", "local-only-beta-bootstrap-token-12345");
    vi.stubEnv("QA_BASE_URL", "http://127.0.0.1:4317");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://127.0.0.1:4317");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");

    const response = await GET(new Request("http://127.0.0.1:4317/api/qa/anonymous-session", {
      headers: { "x-diana-beta-qa-session": "local-only-beta-bootstrap-token-12345" },
    }));

    expect(response.status).toBe(200);
  });

  it("does not expose the bootstrap to a public production host", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("QA_SERVER_MODE", "production");
    vi.stubEnv("QA_LOCAL_BROWSER_GATE", "true");
    vi.stubEnv("NEXT_PUBLIC_DIANA_BETA_BROWSER_QA", "true");
    vi.stubEnv("QA_BROWSER_SESSION_TOKEN", "local-only-beta-bootstrap-token-12345");
    vi.stubEnv("QA_BASE_URL", "http://127.0.0.1:4317");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://127.0.0.1:4317");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");

    const response = await GET(new Request("https://diana.example/api/qa/anonymous-session", {
      headers: { "x-diana-beta-qa-session": "local-only-beta-bootstrap-token-12345" },
    }));

    expect(response.status).toBe(404);
    expect(mocks.createUser).not.toHaveBeenCalled();
  });
});
