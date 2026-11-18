import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
import { saveCalendarWeekPlan } from "./planning-actions";

describe("optional Calendar weekly capacity persistence", () => {
  let getUser: ReturnType<typeof vi.fn>;
  let from: ReturnType<typeof vi.fn>;
  let upsert: ReturnType<typeof vi.fn>;
  let deleteRows: ReturnType<typeof vi.fn>;
  let eq: ReturnType<typeof vi.fn>;
  let deletionResult: { error: { message: string } | null };

  beforeEach(() => {
    vi.clearAllMocks();
    getUser = vi.fn().mockResolvedValue({ data: { user: { id: "student-owner" } } });
    upsert = vi.fn().mockResolvedValue({ error: null });
    deletionResult = { error: null };
    const deletion: { eq: ReturnType<typeof vi.fn>; then: (resolve: (value: typeof deletionResult) => unknown) => Promise<unknown> } = {
      eq: vi.fn(),
      then: resolve => Promise.resolve(deletionResult).then(resolve),
    };
    eq = deletion.eq.mockReturnValue(deletion);
    deleteRows = vi.fn().mockReturnValue(deletion);
    from = vi.fn().mockReturnValue({ upsert, delete: deleteRows });
    mocks.createClient.mockResolvedValue({ auth: { getUser }, from });
  });

  it("saves only the signed-in student's capacity and ignores overposted ownership", async () => {
    const input = { weekStart: "2026-11-16", availableMinutes: 150, owner_id: "another-student", updated_at: "1999-01-01T00:00:00Z" };
    await expect(saveCalendarWeekPlan(input)).resolves.toEqual({ availableMinutes: 150 });
    expect(from).toHaveBeenCalledWith("calendar_week_plans");
    expect(upsert).toHaveBeenCalledWith({ owner_id: "student-owner", week_start: "2026-11-16", available_minutes: 150, updated_at: expect.any(String) }, { onConflict: "owner_id,week_start" });
    expect(deleteRows).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/calendar");
  });

  it.each([0, 10080])("keeps valid boundary capacity %i as a saved value", async availableMinutes => {
    await expect(saveCalendarWeekPlan({ weekStart: "2026-11-16", availableMinutes })).resolves.toEqual({ availableMinutes });
    expect(upsert.mock.calls[0][0].available_minutes).toBe(availableMinutes);
    expect(deleteRows).not.toHaveBeenCalled();
  });

  it("clears only the current owner's selected week and allows an already empty week", async () => {
    await expect(saveCalendarWeekPlan({ weekStart: "2026-11-16", availableMinutes: null })).resolves.toEqual({ availableMinutes: null });
    expect(deleteRows).toHaveBeenCalledOnce();
    expect(eq.mock.calls).toEqual([["owner_id", "student-owner"], ["week_start", "2026-11-16"]]);
    expect(upsert).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/calendar");
  });

  it.each([
    { weekStart: "2026-11-17", availableMinutes: 90 },
    { weekStart: "2026-02-30", availableMinutes: 90 },
    { weekStart: "2026-11-16T00:00:00Z", availableMinutes: 90 },
    { weekStart: "2026-11-16", availableMinutes: -1 },
    { weekStart: "2026-11-16", availableMinutes: 1.5 },
    { weekStart: "2026-11-16", availableMinutes: 10081 },
    { weekStart: "2026-11-16", availableMinutes: NaN },
    { weekStart: "2026-11-16", availableMinutes: Infinity },
    { weekStart: "2026-11-17", availableMinutes: null },
  ])("rejects an invalid save or clear before accessing the database: %j", async input => {
    expect((await saveCalendarWeekPlan(input)).error).toContain("Choose a Monday");
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects malformed runtime payloads before accessing the database", async () => {
    for (const input of [null, undefined, {}, { weekStart: "2026-11-16", availableMinutes: "90" }]) {
      expect((await saveCalendarWeekPlan(input as unknown as Parameters<typeof saveCalendarWeekPlan>[0])).error).toContain("Choose a Monday");
    }
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("requires authentication for saving and clearing", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    for (const availableMinutes of [90, null]) expect((await saveCalendarWeekPlan({ weekStart: "2026-11-16", availableMinutes })).error).toContain("Sign in");
    expect(from).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("does not report success or refresh data after a rejected save", async () => {
    upsert.mockResolvedValue({ error: { message: "database write rejected" } });
    await expect(saveCalendarWeekPlan({ weekStart: "2026-11-16", availableMinutes: 90 })).resolves.toEqual({ error: "Your available study time could not be saved. Try again." });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("does not report a successful clear when the database rejects deletion", async () => {
    deletionResult = { error: { message: "database deletion rejected" } };
    expect((await saveCalendarWeekPlan({ weekStart: "2026-11-16", availableMinutes: null })).error).toContain("could not be saved");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
