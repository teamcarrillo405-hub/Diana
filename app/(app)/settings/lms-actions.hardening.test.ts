import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  revalidatePath: vi.fn(),
  resolveCanvasInstitutionFromRequest: vi.fn(),
  saveLmsConnectionForRuntime: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/lms/credential-policy", () => ({
  saveLmsConnectionForRuntime: mocks.saveLmsConnectionForRuntime,
}));
vi.mock("@/lib/security/canvas-institutions", () => ({
  resolveCanvasInstitutionFromRequest: mocks.resolveCanvasInstitutionFromRequest,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: "owner-a" } } })) },
    from: mocks.from,
  })),
}));

import { connectCanvas } from "./lms-actions";
import { LmsCredentialVaultUnavailableError } from "@/lib/lms/errors";

function canvasForm(): FormData {
  const form = new FormData();
  form.set("base_url", "https://school.instructure.com");
  form.set("token", "canvas-token");
  return form;
}

describe("Canvas settings hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DIANA_LMS_CANVAS_IMPORT_ENABLED = "true";
    process.env.DIANA_LMS_CANVAS_SUBMISSION_ENABLED = "true";
    mocks.resolveCanvasInstitutionFromRequest.mockResolvedValue({
      id: "school-a",
      origin: "https://school.instructure.com",
    });
  });

  afterEach(() => {
    process.env.DIANA_LMS_CANVAS_IMPORT_ENABLED = "true";
    process.env.DIANA_LMS_CANVAS_SUBMISSION_ENABLED = "true";
  });

  it("surfaces a fail-closed vault write without falling back to a legacy row", async () => {
    mocks.saveLmsConnectionForRuntime.mockRejectedValue(new LmsCredentialVaultUnavailableError());

    const result = await connectCanvas(canvasForm());

    expect(result).toEqual({
      ok: false,
      code: "credential_vault_unavailable",
      message: "Connection credentials are not available.",
    });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("does not write credentials when both Canvas provider features are disabled", async () => {
    process.env.DIANA_LMS_CANVAS_IMPORT_ENABLED = "false";
    process.env.DIANA_LMS_CANVAS_SUBMISSION_ENABLED = "false";

    const result = await connectCanvas(canvasForm());

    expect(result).toEqual({
      ok: false,
      code: "provider_feature_disabled",
      message: "Canvas connections are not enabled.",
    });
    expect(mocks.saveLmsConnectionForRuntime).not.toHaveBeenCalled();
  });
});
