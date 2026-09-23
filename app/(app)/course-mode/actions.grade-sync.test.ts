import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getValidCanvasToken: vi.fn(),
  getValidGoogleToken: vi.fn(),
  hydrateLmsConnectionCredentials: vi.fn(),
  persistLmsTokenRefresh: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  syncConfirmedGrade: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/lms/canvas", () => ({ getValidCanvasToken: mocks.getValidCanvasToken }));
vi.mock("@/lib/lms/google", () => ({ getValidGoogleToken: mocks.getValidGoogleToken }));
vi.mock("@/lib/integrations/credential-vault", () => ({
  hydrateLmsConnectionCredentials: mocks.hydrateLmsConnectionCredentials,
  persistLmsTokenRefresh: mocks.persistLmsTokenRefresh,
}));
vi.mock("@/lib/lms/grades", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/lms/grades")>();
  return { ...actual, syncConfirmedGrade: mocks.syncConfirmedGrade };
});

import { syncConfirmedAssessmentGrade } from "@/app/(app)/course-mode/actions";
import { GradeSyncDeliveryError } from "@/lib/lms/grades";

const attemptId = "11111111-1111-4111-8111-111111111111";
const blueprintId = "22222222-2222-4222-8222-222222222222";
const courseId = "33333333-3333-4333-8333-333333333333";
const connectionId = "44444444-4444-4444-8444-444444444444";
const receiptId = "55555555-5555-4555-8555-555555555555";
const userId = "66666666-6666-4666-8666-666666666666";

class RedirectSignal extends Error {
  constructor(readonly url: string) {
    super(url);
  }
}

type ReceiptUpdate = { table: string; payload: Record<string, unknown> };

function formData(): FormData {
  const form = new FormData();
  form.set("attemptId", attemptId);
  form.set("externalStudentId", "student-1");
  return form;
}

function setupStore(claim: ReturnType<typeof vi.fn>) {
  const updates: ReceiptUpdate[] = [];
  const completion = vi.fn(async (
    args: Record<string, unknown>,
  ): Promise<{ data: unknown; error: unknown }> => ({
    data: [{
      receipt_id: receiptId,
      receipt_status: args.p_final_status,
      completed: true,
    }],
    error: null,
  }));
  const rows: Record<string, Record<string, unknown>> = {
    assessment_attempts: {
      id: attemptId,
      status: "confirmed",
      final_score: 18,
      points_possible: 20,
      confirmed_by: userId,
      confirmed_at: "2026-07-31T18:00:00.000Z",
      blueprint_id: blueprintId,
    },
    assessment_blueprints: {
      course_id: courseId,
      external_assignment_id: "assignment-1",
    },
    course_mode_lms_links: {
      provider: "canvas",
      external_course_id: "course-1",
      connection_id: connectionId,
    },
    lms_connections: {
      id: connectionId,
      provider: "canvas",
      config: { institution_id: "school", base_url: "https://93.184.216.34" },
    },
  };
  const rpc = vi.fn((name: string, args: Record<string, unknown>) => {
    if (name === "claim_lms_grade_sync_receipt") return claim(args);
    if (name === "complete_lms_grade_sync_receipt") return completion(args);
    throw new Error(`Unexpected RPC: ${name}`);
  });
  const store = {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: userId } } })) },
    rpc,
    from: vi.fn((table: string) => {
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      Object.assign(builder, {
        select: chain,
        eq: chain,
        limit: chain,
        maybeSingle: vi.fn(async () => ({ data: rows[table] ?? null, error: null })),
        update: vi.fn((payload: Record<string, unknown>) => {
          updates.push({ table, payload });
          return builder;
        }),
        then: (
          resolve: (value: { data: null; error: null }) => unknown,
          reject: (reason: unknown) => unknown,
        ) => Promise.resolve({ data: null, error: null }).then(resolve, reject),
      });
      return builder;
    }),
  };
  mocks.createClient.mockResolvedValue(store);
  return { store, updates, completion, rpc };
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.redirect.mockImplementation((url: string) => {
    throw new RedirectSignal(url);
  });
  mocks.hydrateLmsConnectionCredentials.mockResolvedValue({
    id: connectionId,
    provider: "canvas",
    config: {
      institution_id: "school",
      base_url: "https://93.184.216.34",
      token: "grade-token",
    },
  });
  mocks.getValidCanvasToken.mockResolvedValue({ token: "grade-token" });
  mocks.syncConfirmedGrade.mockResolvedValue({
    provider: "canvas",
    providerReceiptId: "77",
    providerState: "graded",
    score: 18,
  });
});

describe("confirmed assessment grade delivery receipts", () => {
  it.each(["syncing", "confirmation_pending"])(
    "blocks retries while the atomic receipt claim is %s",
    async (receiptStatus) => {
      const claim = vi.fn(async () => ({
        data: [{ receipt_id: receiptId, receipt_status: receiptStatus, claimed: false }],
        error: null,
      }));
      setupStore(claim);

      await expect(syncConfirmedAssessmentGrade(formData())).rejects.toMatchObject({
        url: "/course-mode?status=grade-sync-confirmation-pending",
      });
      expect(mocks.syncConfirmedGrade).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["confirmation_pending", "grade-sync-confirmation-pending"],
    ["not_accepted", "grade-sync-not-accepted"],
  ] as const)("persists a %s delivery outcome", async (receiptStatus, redirectStatus) => {
    const claim = vi.fn(async () => ({
      data: [{ receipt_id: receiptId, receipt_status: "syncing", claimed: true }],
      error: null,
    }));
    const { completion, updates } = setupStore(claim);
    mocks.syncConfirmedGrade.mockRejectedValue(
      new GradeSyncDeliveryError(receiptStatus, "provider result"),
    );

    await expect(syncConfirmedAssessmentGrade(formData())).rejects.toMatchObject({
      url: `/course-mode?status=${redirectStatus}`,
    });
    expect(completion).toHaveBeenCalledWith(expect.objectContaining({
      p_receipt_id: receiptId,
      p_final_status: receiptStatus,
      p_provider_receipt_id: null,
    }));
    expect(updates.filter(({ table }) => table === "lms_grade_sync_receipts")).toEqual([]);
  });

  it("allows only one provider request across concurrent attempts", async () => {
    let claimCount = 0;
    const claim = vi.fn(async () => {
      claimCount += 1;
      return {
        data: [{
          receipt_id: receiptId,
          receipt_status: "syncing",
          claimed: claimCount === 1,
        }],
        error: null,
      };
    });
    const { completion, updates } = setupStore(claim);

    let resolveDelivery!: (value: {
      provider: "canvas";
      providerReceiptId: string;
      providerState: string;
      score: number;
    }) => void;
    mocks.syncConfirmedGrade.mockImplementationOnce(() => new Promise((resolve) => {
      resolveDelivery = resolve;
    }));

    const firstAttempt = syncConfirmedAssessmentGrade(formData());
    await vi.waitFor(() => expect(mocks.syncConfirmedGrade).toHaveBeenCalledTimes(1));
    const concurrentAttempt = syncConfirmedAssessmentGrade(formData());

    await expect(concurrentAttempt).rejects.toMatchObject({
      url: "/course-mode?status=grade-sync-confirmation-pending",
    });
    expect(mocks.syncConfirmedGrade).toHaveBeenCalledTimes(1);

    resolveDelivery({
      provider: "canvas",
      providerReceiptId: "77",
      providerState: "graded",
      score: 18,
    });
    await expect(firstAttempt).rejects.toMatchObject({
      url: "/course-mode?status=grade-synced",
    });
    expect(claim).toHaveBeenCalledTimes(2);
    expect(completion).toHaveBeenCalledWith(expect.objectContaining({
      p_receipt_id: receiptId,
      p_final_status: "synced",
      p_provider_receipt_id: "77",
    }));
    expect(updates.filter(({ table }) => table === "lms_grade_sync_receipts")).toEqual([]);
  });

  it("fails closed when the completion RPC cannot finalize a successful provider result", async () => {
    const claim = vi.fn(async () => ({
      data: [{ receipt_id: receiptId, receipt_status: "syncing", claimed: true }],
      error: null,
    }));
    const { completion } = setupStore(claim);
    completion.mockResolvedValueOnce({ data: null, error: { message: "completion unavailable" } });

    await expect(syncConfirmedAssessmentGrade(formData())).rejects.toMatchObject({
      url: "/course-mode?status=grade-sync-confirmation-pending",
    });
  });
});
