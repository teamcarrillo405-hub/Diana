import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  revalidatePath: vi.fn(),
  select: vi.fn(),
  selectEq: vi.fn(),
  update: vi.fn(),
  updateEq: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { saveProfileCenter } from "./actions";

const INPUT = {
  display_name: "Student",
  school_year: 9,
  timezone: "America/Los_Angeles",
  learning_hurdle: null,
  study_schedule_preference: null,
  consent_ai: false,
} as const;

function currentProfile(overrides: Record<string, unknown> = {}) {
  return {
    user_id: "student-1",
    age_bracket: "13_to_17",
    consent_ai: false,
    teen_guardian_permission_attested_at: null,
    teen_guardian_permission_policy_version: null,
    teen_guardian_permission_source: null,
    teen_guardian_permission_withdrawn_at: null,
    ...overrides,
  };
}

describe("saveProfileCenter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "student-1" } } });
    mocks.maybeSingle.mockResolvedValue({ data: currentProfile(), error: null });
    mocks.selectEq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
    mocks.select.mockReturnValue({ eq: mocks.selectEq });
    mocks.updateEq.mockResolvedValue({ error: null });
    mocks.update.mockReturnValue({ eq: mocks.updateEq });
    mocks.from.mockReturnValue({ select: mocks.select, update: mocks.update });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: mocks.getUser },
      from: mocks.from,
    });
  });

  it("allows a teen to enable AI without guardian permission metadata", async () => {
    const result = await saveProfileCenter({
      ...INPUT,
      consent_ai: true,
    });

    expect(result).toEqual({ ok: true, message: "Settings saved." });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      consent_ai: true,
    }));
  });

  it("allows an adult to enable AI without guardian permission metadata", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: currentProfile({ age_bracket: "adult" }),
      error: null,
    });

    const result = await saveProfileCenter({ ...INPUT, consent_ai: true });

    expect(result).toEqual({ ok: true, message: "Settings saved." });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ consent_ai: true }));
    expect(mocks.update.mock.calls[0]?.[0]).not.toHaveProperty(
      "teen_guardian_permission_attested_at",
    );
  });

  it("keeps an under-13 profile blocked", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: currentProfile({ age_bracket: "under_13" }),
      error: null,
    });

    await expect(saveProfileCenter({
      ...INPUT,
      consent_ai: true,
    })).resolves.toEqual({
      ok: false,
      message: "Diana accounts are not available for students under 13.",
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
