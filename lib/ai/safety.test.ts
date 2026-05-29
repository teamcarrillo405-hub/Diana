import { describe, it, expect, vi } from "vitest";
import {
  checkTokenBudget,
  resetBudgetIfNewDay,
  logInteraction,
  todayIsoDate,
} from "./safety";

// Helper to build a minimal SupabaseClient mock
function makeMockSupabase(overrides: {
  profileData?: Record<string, unknown> | null;
  updateError?: unknown;
  insertError?: unknown;
} = {}) {
  const { profileData = null, updateError = null, insertError = null } = overrides;

  return {
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({ data: profileData, error: null })
              ),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: updateError })),
          })),
        };
      }
      if (table === "ai_interactions") {
        return {
          insert: vi.fn(() =>
            Promise.resolve({ error: insertError })
          ),
        };
      }
      return {};
    }),
  };
}

describe("todayIsoDate", () => {
  it("returns YYYY-MM-DD from a known date", () => {
    const d = new Date("2026-05-29T15:30:00Z");
    expect(todayIsoDate(d)).toBe("2026-05-29");
  });
});

describe("checkTokenBudget", () => {
  it("returns allowed=true, remaining=50000 when tokens_used_today=0", async () => {
    const supabase = makeMockSupabase({
      profileData: { daily_token_budget: 50000, tokens_used_today: 0 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await checkTokenBudget("user-1", supabase as any);
    expect(result).toEqual({ allowed: true, remaining: 50000 });
  });

  it("returns allowed=false, remaining=0 when tokens_used_today >= daily_token_budget", async () => {
    const supabase = makeMockSupabase({
      profileData: { daily_token_budget: 50000, tokens_used_today: 50000 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await checkTokenBudget("user-1", supabase as any);
    expect(result).toEqual({ allowed: false, remaining: 0 });
  });

  it("returns allowed=true, remaining=100 when tokens_used_today=49900", async () => {
    const supabase = makeMockSupabase({
      profileData: { daily_token_budget: 50000, tokens_used_today: 49900 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await checkTokenBudget("user-1", supabase as any);
    expect(result).toEqual({ allowed: true, remaining: 100 });
  });
});

describe("resetBudgetIfNewDay", () => {
  it("calls UPDATE when stored token_reset_date is yesterday", async () => {
    const yesterday = todayIsoDate(new Date(Date.now() - 86400000));
    // Build a mock that tracks update calls separately
    const updateMock = vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    }));
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: { token_reset_date: yesterday },
                    error: null,
                  })
                ),
              })),
            })),
            update: updateMock,
          };
        }
        return {};
      }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await resetBudgetIfNewDay("user-1", supabase as any);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ tokens_used_today: 0 })
    );
  });

  it("is a no-op when token_reset_date already equals today", async () => {
    const today = todayIsoDate();
    const updateMock = vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    }));
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: { token_reset_date: today },
                    error: null,
                  })
                ),
              })),
            })),
            update: updateMock,
          };
        }
        return {};
      }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await resetBudgetIfNewDay("user-1", supabase as any);
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("logInteraction", () => {
  it("calls insert on ai_interactions with correct params", async () => {
    const supabase = makeMockSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await logInteraction(
      {
        ownerId: "user-1",
        assignmentId: "assign-1",
        feature: "math_step",
        model: "claude-sonnet-4-6",
        promptSummary: "What is the derivative of x^2?",
        tokensUsed: 150,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any
    );
    const aiTable = supabase.from.mock.results.find(
      (_, i) => supabase.from.mock.calls[i]?.[0] === "ai_interactions"
    );
    expect(aiTable?.value.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_id: "user-1",
        assignment_id: "assign-1",
        feature: "math_step",
        model: "claude-sonnet-4-6",
        tokens_used: 150,
      })
    );
  });

  it("truncates prompt_summary to 200 chars", async () => {
    const supabase = makeMockSupabase();
    const longSummary = "x".repeat(300);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await logInteraction(
      {
        ownerId: "user-1",
        feature: "writing_aid",
        model: "claude-haiku-4-5",
        promptSummary: longSummary,
        tokensUsed: 200,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any
    );
    const aiTable = supabase.from.mock.results.find(
      (_, i) => supabase.from.mock.calls[i]?.[0] === "ai_interactions"
    );
    const insertCall = aiTable?.value.insert.mock.calls[0][0];
    expect(insertCall.prompt_summary.length).toBe(200);
  });

  it("swallows errors and does not throw even on insert failure", async () => {
    const supabase = makeMockSupabase({ insertError: new Error("DB down") });
    // Should not throw
    await expect(
      logInteraction(
        {
          ownerId: "user-1",
          feature: "citation_gen",
          model: "claude-haiku-4-5",
          promptSummary: "test",
          tokensUsed: 50,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase as any
      )
    ).resolves.toBeUndefined();
  });
});
