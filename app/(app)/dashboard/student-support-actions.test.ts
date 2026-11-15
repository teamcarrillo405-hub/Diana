import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { getStudentSupportPreferences, saveStudentDailySupportNeed, saveTutorPersonalizationPreference } from "./actions";

function client(userId: string | null = "student-a") {
  const need = {
    select: vi.fn(), eq: vi.fn(), gt: vi.fn(), maybeSingle: vi.fn(),
    upsert: vi.fn(), delete: vi.fn(),
  };
  const profile = { select: vi.fn(), eq: vi.fn(), update: vi.fn(), maybeSingle: vi.fn() };
  need.select.mockReturnValue(need);
  need.eq.mockReturnValue(need);
  need.gt.mockReturnValue(need);
  need.delete.mockReturnValue(need);
  need.upsert.mockResolvedValue({ error: null });
  need.maybeSingle.mockResolvedValue({ data: null, error: null });
  // delete().eq() awaits this thenable; all query chain operations remain inspectable.
  Object.assign(need, { then: (resolve: (value: { error: null }) => void) => resolve({ error: null }) });
  profile.select.mockReturnValue(profile);
  profile.eq.mockReturnValue(profile);
  profile.update.mockReturnValue(profile);
  profile.maybeSingle.mockResolvedValue({ data: { user_id: userId, tutor_personalization_enabled: false }, error: null });
  const from = vi.fn((table: string) => table === "profiles" ? profile : need);
  const auth = { getUser: vi.fn(async () => ({ data: { user: userId ? { id: userId } : null } })) };
  mocks.createClient.mockResolvedValue({ auth, from });
  return { need, profile, from };
}

beforeEach(() => vi.clearAllMocks());

describe("student support preferences", () => {
  it("rejects invalid input and unauthenticated writes", async () => {
    const { from } = client(null);
    expect(await saveStudentDailySupportNeed("free text about food")).toMatchObject({ ok: false });
    expect(await saveTutorPersonalizationPreference("true")).toMatchObject({ ok: false });
    expect(await saveStudentDailySupportNeed("water")).toMatchObject({ ok: false });
    expect(from).not.toHaveBeenCalled();
  });

  it("reads only the signed-in owner's unexpired choice and separate sharing preference", async () => {
    const { need, profile } = client();
    need.maybeSingle.mockResolvedValue({ data: { need: "water", expires_at: "2099-01-01T00:00:00Z" }, error: null });
    expect(await getStudentSupportPreferences()).toEqual({ ok: true, need: "water", personalizationEnabled: false });
    expect(need.eq).toHaveBeenCalledWith("owner_id", "student-a");
    expect(need.gt).toHaveBeenCalledWith("expires_at", expect.any(String));
    expect(profile.eq).toHaveBeenCalledWith("user_id", "student-a");
  });

  it("saves only the authenticated owner, and clearing deletes only their row", async () => {
    const { need } = client();
    expect(await saveStudentDailySupportNeed("food")).toEqual({ ok: true });
    expect(need.upsert).toHaveBeenCalledWith({ owner_id: "student-a", need: "food" });
    expect(await saveStudentDailySupportNeed(null)).toEqual({ ok: true });
    expect(need.delete).toHaveBeenCalledOnce();
    expect(need.eq).toHaveBeenCalledWith("owner_id", "student-a");
  });

  it("updates sharing only for the authenticated owner and reports errors", async () => {
    const { profile } = client();
    expect(await saveTutorPersonalizationPreference(true)).toEqual({ ok: true });
    expect(profile.update).toHaveBeenCalledWith({ tutor_personalization_enabled: true });
    expect(profile.eq).toHaveBeenCalledWith("user_id", "student-a");
    profile.maybeSingle.mockResolvedValue({ data: null, error: { message: "unavailable" } });
    expect(await saveTutorPersonalizationPreference(false)).toMatchObject({ ok: false });
  });
});
