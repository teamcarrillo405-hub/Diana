import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireLandingPageEditorUser: vi.fn(),
  createServiceClient: vi.fn(),
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
}));

vi.mock("@/lib/landing-page/require-editor", () => ({
  requireLandingPageEditorUser: mocks.requireLandingPageEditorUser,
}));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: mocks.createServiceClient }));

import { POST } from "./route";

const OWNER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function requestFor(file: File): Request {
  const body = new FormData();
  body.set("asset", file);
  return new Request("http://localhost/api/design/landing-assets", { method: "POST", body });
}

describe("landing editor asset uploads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireLandingPageEditorUser.mockResolvedValue({ id: OWNER_ID });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.getPublicUrl.mockReturnValue({ data: { publicUrl: "https://assets.test/hero.jpg" } });
    mocks.createServiceClient.mockReturnValue({
      storage: {
        from: vi.fn().mockReturnValue({ upload: mocks.upload, getPublicUrl: mocks.getPublicUrl }),
      },
    });
  });

  it("rejects arbitrary bytes despite a valid extension and MIME", async () => {
    const response = await POST(requestFor(
      new File(["not-an-image"], "hero.webp", { type: "image/webp" }),
    ));

    expect(response.status).toBe(415);
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("rejects extension/MIME mismatches and empty files", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const mismatch = await POST(requestFor(
      new File([png], "hero.png", { type: "image/jpeg" }),
    ));
    const empty = await POST(requestFor(
      new File([], "hero.png", { type: "image/png" }),
    ));

    expect(mismatch.status).toBe(415);
    expect(empty.status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("stores valid JPEG and AVIF assets using canonical metadata", async () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const avif = new Uint8Array(16);
    new DataView(avif.buffer).setUint32(0, avif.length);
    avif.set(Buffer.from("ftypavif", "ascii"), 4);

    const jpegResponse = await POST(requestFor(
      new File([jpeg], "hero.JPEG", { type: "image/jpg" }),
    ));
    const avifResponse = await POST(requestFor(
      new File([avif], "hero.avif", { type: "image/avif" }),
    ));

    expect(jpegResponse.status).toBe(200);
    expect(avifResponse.status).toBe(200);
    expect(mocks.upload).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\.jpg$/u),
      expect.any(Buffer),
      { contentType: "image/jpeg", upsert: false },
    );
    expect(mocks.upload).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\.avif$/u),
      expect.any(Buffer),
      { contentType: "image/avif", upsert: false },
    );
  });
});
