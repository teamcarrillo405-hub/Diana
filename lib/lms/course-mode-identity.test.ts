import { afterEach, describe, expect, it, vi } from "vitest";

import type { NormalizedAssignment } from "./types";

const canvasMocks = vi.hoisted(() => ({
  resolve: vi.fn(async () => ({ id: "staging-school", origin: "https://canvas-sandbox.example.test" })),
  fetch: vi.fn(async () => new Response(JSON.stringify({ id: 42 }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })),
}));

vi.mock("@/lib/security/canvas-institutions", () => ({
  resolveCanvasConnectionDestination: canvasMocks.resolve,
  fetchCanvasDestination: canvasMocks.fetch,
}));

import {
  provisionCourseModeLmsStudentLinksFromImport,
  readCanvasCourseModeProviderIdentity,
  readGoogleCourseModeProviderIdentity,
} from "./course-mode-identity";

function assignment(courseId: string | null): NormalizedAssignment {
  return {
    external_id: `assignment-${courseId ?? "none"}`,
    title: "Synthetic assignment",
    description: null,
    due_at: null,
    external_source: "google_classroom",
    external_course_id: courseId,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("course mode LMS provider identity provisioning", () => {
  it("provisions only from verified Google identity and observed imported courses", async () => {
    vi.stubEnv("DIANA_LMS_GOOGLE_IMPORT_ENABLED", "true");
    vi.stubEnv("DIANA_LMS_GOOGLE_SUBMISSION_ENABLED", "false");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      sub: "google-student-123",
      email: "student@example.test",
      email_verified: true,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const rpc = vi.fn(async () => ({ data: 2, error: null }));
    const token = "synthetic-token-must-not-be-persisted";

    await expect(provisionCourseModeLmsStudentLinksFromImport({
      studentId: "00000000-0000-4000-8000-000000000001",
      identityConnectionId: "00000000-0000-4000-8000-000000000002",
      provider: "google_classroom",
      token,
      assignments: [assignment("course-b"), assignment("course-a"), assignment("course-b")],
      store: { rpc },
      now: () => new Date("2026-09-01T15:00:00.000Z"),
    })).resolves.toEqual({ linked: 2, provider: "google_classroom" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://openidconnect.googleapis.com/v1/userinfo",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: `Bearer ${token}` }) }),
    );
    expect(rpc).toHaveBeenCalledWith(
      "provision_course_mode_lms_student_links_from_provider",
      expect.objectContaining({
        p_external_student_id: "google-student-123",
        p_identity_connection_id: "00000000-0000-4000-8000-000000000002",
        p_observed_external_course_ids: ["course-a", "course-b"],
        p_provider: "google_classroom",
      }),
    );
    const rpcPayload = JSON.stringify(rpc.mock.calls[0]);
    expect(rpcPayload).not.toContain(token);
    expect(rpcPayload).not.toContain("student@example.test");
  });

  it("keeps import provisioning disabled when only submission is enabled", async () => {
    vi.stubEnv("DIANA_LMS_GOOGLE_IMPORT_ENABLED", "false");
    vi.stubEnv("DIANA_LMS_GOOGLE_SUBMISSION_ENABLED", "true");
    const fetchMock = vi.fn();
    const rpc = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(provisionCourseModeLmsStudentLinksFromImport({
      studentId: "00000000-0000-4000-8000-000000000001",
      identityConnectionId: "00000000-0000-4000-8000-000000000002",
      provider: "google_classroom",
      token: "synthetic-token",
      assignments: [assignment("course-a")],
      store: { rpc },
    })).rejects.toMatchObject({ code: "provider_feature_disabled" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("requires Google verified identity and preserves reconnect_required", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      sub: "google-student-123",
      email_verified: false,
    }), { status: 200 })));
    await expect(readGoogleCourseModeProviderIdentity({ token: "synthetic-token" }))
      .rejects.toThrow(/verified account identity/iu);

    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 401 })));
    await expect(readGoogleCourseModeProviderIdentity({ token: "synthetic-token" }))
      .rejects.toMatchObject({ code: "reconnect_required", provider: "google_classroom" });
  });

  it("uses the Canvas authenticated profile and preserves reconnect_required", async () => {
    await expect(readCanvasCourseModeProviderIdentity({
      institutionId: "staging-school",
      token: "synthetic-token",
    })).resolves.toEqual({
      provider: "canvas",
      externalStudentId: "42",
      verificationSource: "provider_profile_readback",
      canvasInstitutionId: "staging-school",
      canvasOrigin: "https://canvas-sandbox.example.test",
    });
    expect(canvasMocks.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ origin: "https://canvas-sandbox.example.test" }),
      "https://canvas-sandbox.example.test/api/v1/users/self/profile",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer synthetic-token" }) }),
    );

    canvasMocks.fetch.mockResolvedValueOnce(new Response(null, { status: 403 }));
    await expect(readCanvasCourseModeProviderIdentity({ token: "synthetic-token" }))
      .rejects.toMatchObject({ code: "reconnect_required", provider: "canvas" });
  });

  it("provisions an empty complete snapshot so stale links can be revoked", async () => {
    vi.stubEnv("DIANA_LMS_GOOGLE_IMPORT_ENABLED", "true");
    const rpc = vi.fn();
    rpc.mockResolvedValue({ data: 0, error: null });
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      sub: "google-student-123",
      email_verified: true,
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(provisionCourseModeLmsStudentLinksFromImport({
      studentId: "00000000-0000-4000-8000-000000000001",
      identityConnectionId: "00000000-0000-4000-8000-000000000002",
      provider: "google_classroom",
      token: "synthetic-token",
      assignments: [assignment(null)],
      store: { rpc },
    })).resolves.toEqual({ linked: 0, provider: "google_classroom" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      "provision_course_mode_lms_student_links_from_provider",
      expect.objectContaining({ p_observed_external_course_ids: [] }),
    );
  });
});
