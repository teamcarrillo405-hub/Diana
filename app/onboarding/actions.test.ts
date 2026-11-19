import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), getUser: vi.fn(), from: vi.fn(), upsert: vi.fn(), update: vi.fn(), eq: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { revalidatePath } from "next/cache";
import { completeScreenDesignOnboarding } from "./actions";

const choices = { learningHurdle: "time_management", studySchedulePreference: "morning", sleepGoal: 8, movementGoal: 4 };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "student-one" } } });
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.eq.mockResolvedValue({ error: null });
  mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.from.mockImplementation((table: string) => table === "wellness_weekly_targets" ? { upsert: mocks.upsert } : { update: mocks.update });
  mocks.createClient.mockResolvedValue({ auth: { getUser: mocks.getUser }, from: mocks.from });
});

describe("saving preferences before the optional school connection", () => {
  it("persists the authenticated student's choices without refreshing away the second step", async () => {
    await expect(completeScreenDesignOnboarding(choices)).resolves.toEqual({ ok: true });
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ owner_id: "student-one", sleep_hours: 8, movement_days: 4 }), { onConflict: "owner_id" });
    expect(mocks.update).toHaveBeenCalledWith({ learning_hurdle: "time_management", study_schedule_preference: "morning", onboarded_at: expect.any(String) });
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "student-one");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("does not write choices without a signed-in student", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(completeScreenDesignOnboarding(choices)).resolves.toMatchObject({ ok: false, reason: "auth" });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("does not complete the profile when wellness targets cannot save", async () => {
    mocks.upsert.mockResolvedValueOnce({ error: { message: "temporarily unavailable" } });
    await expect(completeScreenDesignOnboarding(choices)).resolves.toMatchObject({ ok: false, reason: "persistence" });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("keeps profile persistence errors recoverable", async () => {
    mocks.eq.mockResolvedValueOnce({ error: { message: "temporarily unavailable" } });
    await expect(completeScreenDesignOnboarding(choices)).resolves.toMatchObject({ ok: false, reason: "persistence" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
