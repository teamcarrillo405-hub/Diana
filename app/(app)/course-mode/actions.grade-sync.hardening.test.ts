import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
  getValidCanvasToken: vi.fn(),
  getValidGoogleToken: vi.fn(),
  hydrateLmsConnectionForRuntime: vi.fn(),
  persistLmsTokenRefreshForRuntime: vi.fn(),
  reconcileConfirmedGrade: vi.fn(),
  redirect: vi.fn(),
  syncConfirmedGrade: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: mocks.createServiceClient }));
vi.mock("@/lib/lms/canvas", () => ({ getValidCanvasToken: mocks.getValidCanvasToken }));
vi.mock("@/lib/lms/google", () => ({ getValidGoogleToken: mocks.getValidGoogleToken }));
vi.mock("@/lib/lms/credential-policy", () => ({
  hydrateLmsConnectionForRuntime: mocks.hydrateLmsConnectionForRuntime,
  persistLmsTokenRefreshForRuntime: mocks.persistLmsTokenRefreshForRuntime,
}));
vi.mock("@/lib/lms/grade-reconciliation", () => ({
  reconcileConfirmedGrade: mocks.reconcileConfirmedGrade,
}));
vi.mock("@/lib/lms/grades", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/lms/grades")>();
  return { ...actual, syncConfirmedGrade: mocks.syncConfirmedGrade };
});

import { syncConfirmedAssessmentGrade } from "./actions";
import { LmsReconnectRequiredError } from "@/lib/lms/errors";

const attemptId = "11111111-1111-4111-8111-111111111111";
const userId = "66666666-6666-4666-8666-666666666666";

class RedirectSignal extends Error {
  constructor(readonly url: string) {
    super(url);
  }
}

function formData(): FormData {
  const form = new FormData();
  form.set("attemptId", attemptId);
  form.set("externalStudentId", "attacker-controlled-student");
  return form;
}

function setupStore(options: { studentLink?: Record<string, unknown> | null } = {}) {
  const rows: Record<string, Record<string, unknown>> = {
    assessment_attempts: {
      id: attemptId,
      status: "confirmed",
      final_score: 18,
      points_possible: 20,
      confirmed_by: userId,
      confirmed_at: "2026-08-30T18:00:00.000Z",
      blueprint_id: "22222222-2222-4222-8222-222222222222",
      student_id: userId,
    },
    assessment_blueprints: {
      course_id: "33333333-3333-4333-8333-333333333333",
      external_assignment_id: "assignment-1",
    },
    course_mode_lms_links: {
      provider: "canvas",
      external_course_id: "course-1",
      connection_id: "44444444-4444-4444-8444-444444444444",
    },
    lms_connections: {
      id: "44444444-4444-4444-8444-444444444444",
      provider: "canvas",
      config: { institution_id: "school-a", base_url: "https://canvas.example" },
    },
    course_mode_lms_student_links: options.studentLink === undefined
      ? { external_student_id: "student-1" }
      : options.studentLink ?? {},
  };
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    if (name === "claim_lms_grade_sync_receipt") {
      return options.studentLink === null
        ? { data: [], error: null }
        : {
            data: [{
              receipt_id: "55555555-5555-4555-8555-555555555555",
              receipt_status: "syncing",
              claimed: true,
              provider: "canvas",
              connection_id: "44444444-4444-4444-8444-444444444444",
              canvas_institution_id: "school-a",
              canvas_origin: "https://canvas.example",
              external_course_id: "course-1",
              external_assignment_id: "assignment-1",
              external_student_id: "student-1",
              score: 18,
              points_possible: 20,
              confirmed_by: userId,
              confirmed_at: "2026-08-30T18:00:00.000Z",
            }],
            error: null,
          };
    }
    if (name === "complete_lms_grade_sync_receipt") {
      return {
        data: [{
          receipt_id: args.p_receipt_id,
          receipt_status: args.p_final_status,
          completed: true,
        }],
        error: null,
      };
    }
    throw new Error(`Unexpected RPC: ${name}`);
  });
  const store = {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: userId } } })) },
    rpc,
    from: vi.fn((table: string) => {
      const builder = {
        select: vi.fn(),
        eq: vi.fn(),
        limit: vi.fn(),
        maybeSingle: vi.fn(async () => ({ data: rows[table] ?? null, error: null })),
      };
      builder.select.mockReturnValue(builder);
      builder.eq.mockReturnValue(builder);
      builder.limit.mockReturnValue(builder);
      return builder;
    }),
  };
  mocks.createClient.mockResolvedValue(store);
  mocks.createServiceClient.mockReturnValue(store);
  return { rpc };
}

describe("course-mode LMS credential hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DIANA_LMS_CANVAS_SUBMISSION_ENABLED = "true";
    mocks.redirect.mockImplementation((url: string) => {
      throw new RedirectSignal(url);
    });
  });

  afterEach(() => {
    process.env.DIANA_LMS_CANVAS_SUBMISSION_ENABLED = "true";
  });

  it("binds the claim before loading credentials and records a no-write failure", async () => {
    const { rpc } = setupStore();
    mocks.hydrateLmsConnectionForRuntime.mockRejectedValue(new LmsReconnectRequiredError("canvas"));

    await expect(syncConfirmedAssessmentGrade(formData())).rejects.toMatchObject({
      url: "/course-mode?status=reconnect_required",
    });
    expect(rpc).toHaveBeenCalledWith("claim_lms_grade_sync_receipt", expect.objectContaining({
      p_attempt_id: attemptId,
      p_provider: "canvas",
    }));
    expect(rpc).toHaveBeenCalledWith("complete_lms_grade_sync_receipt", expect.objectContaining({
      p_final_status: "not_accepted",
      p_provider_response: {},
    }));
    expect(mocks.syncConfirmedGrade).not.toHaveBeenCalled();
  });

  it("checks the Canvas submission flag before loading credentials or claiming a receipt", async () => {
    process.env.DIANA_LMS_CANVAS_SUBMISSION_ENABLED = "false";
    const { rpc } = setupStore();

    await expect(syncConfirmedAssessmentGrade(formData())).rejects.toMatchObject({
      url: "/course-mode?status=provider_feature_disabled",
    });
    expect(mocks.hydrateLmsConnectionForRuntime).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("does not write when the claimed Canvas origin changed before credential loading", async () => {
    setupStore();
    mocks.hydrateLmsConnectionForRuntime.mockResolvedValue({
      id: "44444444-4444-4444-8444-444444444444",
      provider: "canvas",
      config: { institution_id: "school-b", base_url: "https://other-canvas.example" },
    });

    await expect(syncConfirmedAssessmentGrade(formData())).rejects.toMatchObject({
      url: "/course-mode?status=reconnect_required",
    });
    expect(mocks.getValidCanvasToken).not.toHaveBeenCalled();
    expect(mocks.syncConfirmedGrade).not.toHaveBeenCalled();
  });

  it("rejects a client-supplied grade target when no verified student link exists", async () => {
    const { rpc } = setupStore({ studentLink: null });

    await expect(syncConfirmedAssessmentGrade(formData())).rejects.toMatchObject({
      url: "/course-mode?status=grade-receipt-not-created",
    });
    expect(mocks.hydrateLmsConnectionForRuntime).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(mocks.syncConfirmedGrade).not.toHaveBeenCalled();
  });
});
