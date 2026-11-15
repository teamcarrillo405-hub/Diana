import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { deleteDataCategory, exportUserDataJson } from "./actions";

function makeClient(options: { owner?: string | null; failNeedRead?: boolean } = {}) {
  const owner = options.owner === undefined ? "student-a" : options.owner;
  const calls: Array<{ table: string; operation: string; key: string; value: string }> = [];
  const from = vi.fn((table: string) => {
    let operation = "read";
    const result = () => table === "student_daily_support_needs"
      ? { data: [{ need: "water", updated_at: "2026-01-01T00:00:00Z", expires_at: "2026-01-02T00:00:00Z" }], error: options.failNeedRead && operation === "read" ? { message: "unavailable" } : null }
      : { data: table === "profiles" ? { user_id: owner, tutor_personalization_enabled: false } : [], error: null };
    const query = {
      select: vi.fn(() => query),
      delete: vi.fn(() => { operation = "delete"; return query; }),
      eq: vi.fn((key: string, value: string) => { calls.push({ table, operation, key, value }); return query; }),
      single: vi.fn(async () => result()),
      then: (resolve: (value: ReturnType<typeof result>) => void) => resolve(result()),
    };
    return query;
  });
  mocks.createClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: owner ? { id: owner } : null } }) }, from });
  return { calls, from };
}

beforeEach(() => vi.clearAllMocks());

describe("daily support privacy", () => {
  it("includes the owner's saved choice and sharing preference in JSON export", async () => {
    const { calls } = makeClient();
    const result = await exportUserDataJson();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = JSON.parse(result.data);
    expect(data.dailySupportChoices).toEqual([{ need: "water", updated_at: "2026-01-01T00:00:00Z", expires_at: "2026-01-02T00:00:00Z" }]);
    expect(data.profile.tutor_personalization_enabled).toBe(false);
    expect(calls).toContainEqual({ table: "student_daily_support_needs", operation: "read", key: "owner_id", value: "student-a" });
  });

  it("does not issue an incomplete export if the choice cannot be read", async () => {
    makeClient({ failNeedRead: true });
    expect(await exportUserDataJson()).toMatchObject({ ok: false });
  });

  it("limits category deletion to the authenticated owner", async () => {
    const { calls } = makeClient();
    expect(await deleteDataCategory({ category: "student_daily_support_needs" })).toEqual({ ok: true, label: "Daily support choices" });
    expect(calls).toContainEqual({ table: "student_daily_support_needs", operation: "delete", key: "owner_id", value: "student-a" });
  });

  it("does not query data for a signed-out user", async () => {
    const { from } = makeClient({ owner: null });
    expect(await exportUserDataJson()).toMatchObject({ ok: false });
    expect(await deleteDataCategory({ category: "student_daily_support_needs" })).toMatchObject({ ok: false });
    expect(from).not.toHaveBeenCalled();
  });
});
