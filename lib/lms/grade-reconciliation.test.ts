import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  GradeReconciliationError,
  reconcileCanvasGradePayload,
  reconcileConfirmedGrade,
  reconcileGoogleClassroomGradePayload,
  type GradeReconciliationInput,
} from "@/lib/lms/grade-reconciliation";

const canvasInput: GradeReconciliationInput = {
  provider: "canvas",
  token: "grade-token",
  canvasInstitutionId: "school",
  canvasBaseUrl: "https://93.184.216.34",
  providerConnectionId: "connection-1",
  externalCourseId: "course-1",
  externalAssignmentId: "assignment-1",
  externalStudentId: "student-1",
  score: 18,
};

const originalRegistry = process.env.CANVAS_INSTITUTIONS_JSON;
const originalAllowlist = process.env.CANVAS_ALLOWED_ORIGINS;

beforeEach(() => {
  process.env.CANVAS_INSTITUTIONS_JSON = JSON.stringify({ school: "https://93.184.216.34" });
  delete process.env.CANVAS_ALLOWED_ORIGINS;
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalRegistry === undefined) delete process.env.CANVAS_INSTITUTIONS_JSON;
  else process.env.CANVAS_INSTITUTIONS_JSON = originalRegistry;
  if (originalAllowlist === undefined) delete process.env.CANVAS_ALLOWED_ORIGINS;
  else process.env.CANVAS_ALLOWED_ORIGINS = originalAllowlist;
});

describe("LMS grade reconciliation", () => {
  it("confirms Canvas only from an identifiable provider score", () => {
    expect(reconcileCanvasGradePayload({
      id: 44,
      workflow_state: "graded",
      score: 18,
    }, 18, "write_response")).toMatchObject({
      status: "confirmed",
      providerReceiptId: "44",
      observedScore: 18,
      providerResponse: { verification: "write_response" },
    });

    expect(reconcileCanvasGradePayload({
      id: 44,
      workflow_state: "graded",
    }, 18, "write_response")).toMatchObject({
      status: "not_confirmed",
      observedScore: null,
    });
  });

  it("requires both assigned and draft Classroom grades", () => {
    expect(reconcileGoogleClassroomGradePayload({
      id: "submission-1",
      state: "RETURNED",
      assignedGrade: 18,
    }, 18, "write_response")).toMatchObject({
      status: "not_confirmed",
      observedScore: 18,
      observedDraftScore: null,
    });

    expect(reconcileGoogleClassroomGradePayload({
      id: "submission-1",
      state: "RETURNED",
      assignedGrade: 18,
      draftGrade: 18,
      associatedWithDeveloper: true,
    }, 18, "write_response")).toMatchObject({
      status: "confirmed",
      providerReceiptId: "submission-1",
      observedScore: 18,
      observedDraftScore: 18,
    });
  });

  it("reads back a Canvas grade without issuing a write", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      id: 44,
      workflow_state: "graded",
      score: 18,
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await expect(reconcileConfirmedGrade(canvasInput)).resolves.toMatchObject({
      status: "confirmed",
      provider: "canvas",
      providerReceiptId: "44",
      observedScore: 18,
      providerResponse: {
        verification: "provider_readback",
        provider_target: {
          connection_id: "connection-1",
          canvas_institution_id: "school",
          canvas_origin: "https://93.184.216.34",
        },
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://93.184.216.34/api/v1/courses/course-1/assignments/assignment-1/submissions/student-1"),
      expect.not.objectContaining({ method: "PUT" }),
    );
  });

  it("reads the exact Classroom assigned and draft grade", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      studentSubmissions: [{
        id: "submission-1",
        state: "RETURNED",
        assignedGrade: 18,
        draftGrade: 18,
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await expect(reconcileConfirmedGrade({
      ...canvasInput,
      provider: "google_classroom",
      token: "google-token",
    })).resolves.toMatchObject({
      status: "confirmed",
      provider: "google_classroom",
      providerReceiptId: "submission-1",
      observedScore: 18,
      observedDraftScore: 18,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("fields=studentSubmissions(id,state,assignedGrade,draftGrade,associatedWithDeveloper)"),
      expect.not.objectContaining({ method: "PATCH" }),
    );
  });

  it("fails closed when provider read-back has no identifiable grade state", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      studentSubmissions: [{}],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await expect(reconcileConfirmedGrade({
      ...canvasInput,
      provider: "google_classroom",
      token: "google-token",
    })).rejects.toBeInstanceOf(GradeReconciliationError);
  });
});
