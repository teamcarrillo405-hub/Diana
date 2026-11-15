import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  GradeSyncDeliveryError,
  syncCanvasConfirmedGrade,
  syncGoogleClassroomConfirmedGrade,
  validateConfirmedGradeSync,
  type ConfirmedGradeSyncInput,
} from "@/lib/lms/grades";

const input: ConfirmedGradeSyncInput = {
  provider: "canvas",
  token: "token",
  canvasInstitutionId: "school",
  canvasBaseUrl: "https://school.instructure.com",
  providerConnectionId: "connection-1",
  externalCourseId: "course-1",
  externalAssignmentId: "assignment-1",
  externalStudentId: "student-1",
  score: 18,
  pointsPossible: 20,
  confirmedBy: "teacher-1",
  confirmedAt: "2026-07-30T18:00:00.000Z",
};

const originalRegistry = process.env.CANVAS_INSTITUTIONS_JSON;
const originalAllowlist = process.env.CANVAS_ALLOWED_ORIGINS;

beforeEach(() => {
  process.env.CANVAS_INSTITUTIONS_JSON = JSON.stringify({
    school: "https://93.184.216.34",
  });
  delete process.env.CANVAS_ALLOWED_ORIGINS;
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalRegistry === undefined) delete process.env.CANVAS_INSTITUTIONS_JSON;
  else process.env.CANVAS_INSTITUTIONS_JSON = originalRegistry;
  if (originalAllowlist === undefined) delete process.env.CANVAS_ALLOWED_ORIGINS;
  else process.env.CANVAS_ALLOWED_ORIGINS = originalAllowlist;
});

function canvasInput(overrides: Partial<ConfirmedGradeSyncInput> = {}): ConfirmedGradeSyncInput {
  return {
    ...input,
    canvasBaseUrl: "https://93.184.216.34",
    ...overrides,
  };
}

describe("teacher-confirmed LMS grade sync", () => {
  it("rejects unconfirmed or out-of-range grade requests", () => {
    expect(validateConfirmedGradeSync({ ...input, confirmedBy: "", score: 22 })).toEqual([
      "A verified teacher confirmation is required.",
      "Grade score must fit the approved points possible.",
    ]);
  });

  it("posts a confirmed Canvas grade to the selected student submission", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 44,
        workflow_state: "unsubmitted",
        score: null,
      }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 44,
        workflow_state: "graded",
        score: 18,
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
    await expect(syncCanvasConfirmedGrade(canvasInput())).resolves.toMatchObject({
      provider: "canvas",
      providerReceiptId: "44",
      score: 18,
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      new URL("https://93.184.216.34/api/v1/courses/course-1/assignments/assignment-1/submissions/student-1"),
      expect.objectContaining({ method: "PUT", redirect: "manual" }),
    );
  });

  it("does not rewrite a Canvas grade already proven by provider read-back", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
      id: 44,
      workflow_state: "graded",
      score: 18,
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await expect(syncCanvasConfirmedGrade(canvasInput())).resolves.toMatchObject({
      providerReceiptId: "44",
      providerState: "graded",
      score: 18,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]).not.toMatchObject({ method: "PUT" });
  });

  it("requires the server-issued Canvas institution ID", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(syncCanvasConfirmedGrade(canvasInput({ canvasInstitutionId: null }))).rejects.toMatchObject({
      receiptStatus: "not_accepted",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["https://127.0.0.1", "https://10.0.0.8"])(
    "blocks loopback or private Canvas institutions before sending a bearer token: %s",
    async (origin) => {
      process.env.CANVAS_INSTITUTIONS_JSON = JSON.stringify({ school: origin });
      const fetchMock = vi.spyOn(globalThis, "fetch");
      await expect(syncCanvasConfirmedGrade(canvasInput({ canvasBaseUrl: origin }))).rejects.toMatchObject({
        receiptStatus: "not_accepted",
      });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("does not forward the Canvas bearer token across a redirect", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 44,
        workflow_state: "unsubmitted",
        score: null,
      }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(null, {
        status: 302,
        headers: { Location: "https://127.0.0.1/admin" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 44,
        workflow_state: "unsubmitted",
        score: null,
      }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const error = await syncCanvasConfirmedGrade(canvasInput({ token: "grade-secret" }))
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(GradeSyncDeliveryError);
    expect(error).toMatchObject({ receiptStatus: "confirmation_pending" });
    expect((error as Error).message).not.toContain("grade-secret");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [destination, init] = fetchMock.mock.calls[1];
    expect(String(destination)).toBe(
      "https://93.184.216.34/api/v1/courses/course-1/assignments/assignment-1/submissions/student-1",
    );
    expect(init).toMatchObject({
      redirect: "manual",
      headers: expect.objectContaining({ Authorization: "Bearer grade-secret" }),
    });
  });

  it("marks a lost Canvas response as confirmation pending", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 44, workflow_state: "unsubmitted", score: null })))
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 44, workflow_state: "unsubmitted", score: null })));
    await expect(syncCanvasConfirmedGrade(canvasInput())).rejects.toMatchObject({
      receiptStatus: "confirmation_pending",
    });
  });

  it("recovers a lost Canvas response only when read-back proves the score", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 44, workflow_state: "unsubmitted", score: null })))
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 44, workflow_state: "graded", score: 18 })));

    await expect(syncCanvasConfirmedGrade(canvasInput())).resolves.toMatchObject({
      providerReceiptId: "44",
      providerState: "graded",
      score: 18,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("marks Canvas 5xx responses as confirmation pending", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 44, workflow_state: "unsubmitted", score: null })))
      .mockResolvedValueOnce(new Response("temporarily unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 44, workflow_state: "unsubmitted", score: null })));
    await expect(syncCanvasConfirmedGrade(canvasInput())).rejects.toMatchObject({
      receiptStatus: "confirmation_pending",
    });
  });

  it("marks definitive Canvas 4xx responses as not accepted", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 44, workflow_state: "unsubmitted", score: null })))
      .mockResolvedValueOnce(new Response("invalid score", { status: 422 }));
    await expect(syncCanvasConfirmedGrade(canvasInput())).rejects.toMatchObject({
      receiptStatus: "not_accepted",
    });
  });

  it("marks malformed Canvas success responses as confirmation pending", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 44, workflow_state: "unsubmitted", score: null })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        workflow_state: "graded",
      }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 44, workflow_state: "unsubmitted", score: null })));
    await expect(syncCanvasConfirmedGrade(canvasInput())).rejects.toMatchObject({
      receiptStatus: "confirmation_pending",
    });
  });

  it("finds and grades a Google Classroom student submission", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        studentSubmissions: [{
          id: "submission-1",
          state: "TURNED_IN",
          assignedGrade: null,
          draftGrade: null,
          associatedWithDeveloper: true,
        }],
      }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "submission-1",
        state: "RETURNED",
        assignedGrade: 18,
        draftGrade: 18,
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
    await expect(syncGoogleClassroomConfirmedGrade({
      ...input,
      provider: "google_classroom",
      token: "google-token",
    })).resolves.toMatchObject({
      provider: "google_classroom",
      providerReceiptId: "submission-1",
      score: 18,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("recovers a lost Classroom response only when read-back proves both grades", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        studentSubmissions: [{ id: "submission-1", state: "TURNED_IN", associatedWithDeveloper: true }],
      })))
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        studentSubmissions: [{
          id: "submission-1",
          state: "RETURNED",
          assignedGrade: 18,
          draftGrade: 18,
        }],
      })));

    await expect(syncGoogleClassroomConfirmedGrade({
      ...input,
      provider: "google_classroom",
      token: "google-token",
    })).resolves.toMatchObject({
      provider: "google_classroom",
      providerReceiptId: "submission-1",
      providerState: "RETURNED",
      score: 18,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not report Classroom success when the provider omits grade proof", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        studentSubmissions: [{ id: "submission-1", state: "TURNED_IN", associatedWithDeveloper: true }],
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "submission-1",
        state: "RETURNED",
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        studentSubmissions: [{ id: "submission-1", state: "RETURNED" }],
      })));

    await expect(syncGoogleClassroomConfirmedGrade({
      ...input,
      provider: "google_classroom",
      token: "google-token",
    })).rejects.toMatchObject({ receiptStatus: "confirmation_pending" });
  });

  it("does not PATCH ordinary imported Classroom coursework without client ownership proof", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
      studentSubmissions: [{
        id: "submission-1",
        state: "TURNED_IN",
        assignedGrade: null,
        draftGrade: null,
        associatedWithDeveloper: false,
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await expect(syncGoogleClassroomConfirmedGrade({
      ...input,
      provider: "google_classroom",
      token: "google-token",
    })).rejects.toMatchObject({ receiptStatus: "not_accepted" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]).not.toMatchObject({ method: "PATCH" });
  });
});
