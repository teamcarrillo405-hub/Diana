import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  saveLmsConnectionWithCredential: vi.fn(),
  resolveCanvasInstitutionFromRequest: vi.fn(),
  from: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/integrations/credential-vault", () => ({
  saveLmsConnectionWithCredential: mocks.saveLmsConnectionWithCredential,
}));
vi.mock("@/lib/security/canvas-institutions", () => ({
  resolveCanvasInstitutionFromRequest: mocks.resolveCanvasInstitutionFromRequest,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: "owner-a" } } })),
    },
    from: mocks.from,
  })),
}));

import { connectCanvas } from "./lms-actions";

function canvasForm(): FormData {
  const form = new FormData();
  form.set("base_url", "https://school.instructure.com");
  form.set("token", "canvas-token");
  return form;
}

describe("Canvas settings credential write", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveCanvasInstitutionFromRequest.mockResolvedValue({
      id: "school-a",
      origin: "https://school.instructure.com",
    });
    mocks.saveLmsConnectionWithCredential.mockResolvedValue({
      id: "connection-a",
      atomic: true,
    });
  });

  it("routes retries through the same idempotent owner/provider write", async () => {
    const first = await connectCanvas(canvasForm());
    const retry = await connectCanvas(canvasForm());

    expect(first).toEqual({ ok: true, message: "Canvas connected" });
    expect(retry).toEqual(first);
    expect(mocks.saveLmsConnectionWithCredential).toHaveBeenCalledTimes(2);
    expect(mocks.saveLmsConnectionWithCredential.mock.calls[0][1]).toEqual(
      mocks.saveLmsConnectionWithCredential.mock.calls[1][1],
    );
    expect(mocks.saveLmsConnectionWithCredential).toHaveBeenCalledWith(
      expect.any(Object),
      {
        ownerId: "owner-a",
        provider: "canvas",
        config: {
          institution_id: "school-a",
          base_url: "https://school.instructure.com",
        },
        accessToken: "canvas-token",
      },
    );
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledTimes(2);
  });

  it("returns a retryable result without performing a second write path", async () => {
    mocks.saveLmsConnectionWithCredential.mockRejectedValueOnce(new Error("rpc transaction rolled back"));

    const result = await connectCanvas(canvasForm());

    expect(result).toEqual({
      ok: false,
      message: "Could not save the connection: try again in a moment",
    });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
