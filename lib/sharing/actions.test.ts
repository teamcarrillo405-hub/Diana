import { describe, it, expect, vi, beforeEach } from "vitest";
import { createShareLink, revokeShareLink } from "./actions";

const mockSingle = vi.fn();
const mockInsertChain = { select: vi.fn().mockReturnValue({ single: mockSingle }) };
const mockUpdateChain = { eq: vi.fn().mockReturnThis() };
const mockFrom = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: "user-123" } } })) },
    from: mockFrom,
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockImplementation(() => ({
    insert: vi.fn().mockReturnValue(mockInsertChain),
    update: vi.fn().mockReturnValue(mockUpdateChain),
  }));
});

describe("createShareLink", () => {
  it("returns token and expiresAt on success", async () => {
    mockSingle.mockResolvedValue({
      data: { token: "tok-abc", expires_at: "2026-06-05T00:00:00Z" },
      error: null,
    });
    const result = await createShareLink("parent_summary");
    expect(result).toEqual({ token: "tok-abc", expiresAt: "2026-06-05T00:00:00Z" });
  });

  it("calls supabase insert with correct owner_id and share_type", async () => {
    mockSingle.mockResolvedValue({
      data: { token: "tok-xyz", expires_at: "2026-06-05T00:00:00Z" },
      error: null,
    });
    await createShareLink("parent_summary");
    const fromResult = mockFrom.mock.results[0].value;
    expect(fromResult.insert).toHaveBeenCalledWith({
      owner_id: "user-123",
      share_type: "parent_summary",
    });
  });

  it("returns error for invalid share type", async () => {
    const result = await createShareLink("invalid_type" as never);
    expect(result).toEqual({ error: "Invalid share type." });
  });

  it("returns error when no user is signed in", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
      from: mockFrom,
    } as never);
    const result = await createShareLink("parent_summary");
    expect(result).toEqual({ error: "Not signed in." });
  });
});

describe("revokeShareLink", () => {
  it("calls update with revoked_at, id, and owner_id", async () => {
    mockUpdateChain.eq.mockReturnThis();
    // The last .eq call returns the final result
    const lastEq = vi.fn().mockResolvedValue({ error: null });
    mockUpdateChain.eq
      .mockReturnValueOnce({ eq: lastEq })
      .mockReturnValueOnce({ eq: lastEq });

    mockFrom.mockImplementation(() => ({
      insert: vi.fn().mockReturnValue(mockInsertChain),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: lastEq }) }),
    }));

    const result = await revokeShareLink("uuid-here");
    expect(result).toEqual({ ok: true });
  });

  it("returns ok:true on success", async () => {
    const lastEq = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation(() => ({
      insert: vi.fn().mockReturnValue(mockInsertChain),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: lastEq }) }),
    }));

    const result = await revokeShareLink("some-id");
    expect(result).toEqual({ ok: true });
  });
});
