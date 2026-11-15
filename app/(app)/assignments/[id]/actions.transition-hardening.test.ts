import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  recordStudentStateSnapshot: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/student-state/server", () => ({
  recordStudentStateSnapshot: mocks.recordStudentStateSnapshot,
}));
vi.mock("@/lib/time-budget/calibration", () => ({
  openTimeLog: vi.fn(),
  recordElapsedTime: vi.fn(),
}));

import { markExternalSubmission, transitionAssignment } from "./actions";

const assignmentId = "11111111-1111-4111-8111-111111111111";
const ownerId = "22222222-2222-4222-8222-222222222222";

function setupAssignment(value: Record<string, unknown>) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(async () => ({ data: value, error: null })),
    update: vi.fn(),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);
  const client = {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: ownerId } } })),
    },
    from: vi.fn(() => builder),
  };
  mocks.createClient.mockResolvedValue(client);
  return { builder, client };
}

describe("assignment provider transition hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["canvas", "google_classroom"])(
    "does not let the generic transition mark a %s assignment submitted",
    async (externalSource) => {
      const { builder } = setupAssignment({
        status: "exporting",
        external_source: externalSource,
      });

      const result = await transitionAssignment({
        id: assignmentId,
        from: "exporting",
        to: "submitted",
      });

      expect(result).toEqual({
        error: "Use the school-system submission review so Diana can verify the provider receipt.",
      });
      expect(builder.update).not.toHaveBeenCalled();
      expect(mocks.recordStudentStateSnapshot).not.toHaveBeenCalled();
    },
  );

  it.each(["canvas", "google_classroom"])(
    "does not accept self-reported success for a %s assignment",
    async (externalSource) => {
      const { builder } = setupAssignment({ external_source: externalSource });

      const result = await markExternalSubmission({
        id: assignmentId,
        status: "marked_submitted",
      });

      expect(result).toEqual({
        error: "Check the school-system submission status so Diana can verify the receipt.",
      });
      expect(builder.update).not.toHaveBeenCalled();
    },
  );
});
