import { createRequire } from "node:module";
import { beforeEach, describe, expect, it, vi } from "vitest";

type SharpPipeline = {
  png: () => SharpPipeline;
  webp: () => SharpPipeline;
  toBuffer: () => Promise<Buffer>;
  metadata: () => Promise<{ format?: string; width?: number; height?: number }>;
};

type SharpFactory = {
  (input: Buffer, options: { failOn: "error" }): SharpPipeline;
  (options: {
    create: {
      width: number;
      height: number;
      channels: 4;
      background: { r: number; g: number; b: number; alpha: number };
    };
  }): SharpPipeline;
};

const sharp = createRequire(import.meta.url)("sharp") as SharpFactory;

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { savePlayerPhoto } from "./player-photo-actions";

function dataUrl(mimeType: string, bytes: Uint8Array): string {
  return `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`;
}

async function imageBytes(format: "png" | "webp", width = 2, height = 2): Promise<Uint8Array> {
  const image = sharp({
    create: { width, height, channels: 4, background: { r: 28, g: 96, b: 180, alpha: 1 } },
  });
  return new Uint8Array(await (format === "png" ? image.png() : image.webp()).toBuffer());
}

describe("player photo validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eq.mockResolvedValue({ error: null });
    mocks.update.mockReturnValue({ eq: mocks.eq });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner-1" } } }) },
      from: vi.fn().mockReturnValue({ update: mocks.update }),
    });
  });

  it.each([
    ["image/png", "png"],
    ["image/webp", "webp"],
  ] as const)("decodes and stores a valid %s as canonical WebP", async (mimeType, format) => {
    const bytes = await imageBytes(format);
    const value = dataUrl(mimeType, bytes);

    await expect(savePlayerPhoto(value)).resolves.toEqual({ ok: true });
    const stored = mocks.update.mock.calls[0]?.[0]?.photo_url as string;
    expect(stored).toMatch(/^data:image\/webp;base64,/u);
    expect(stored).not.toBe(value);
    const canonical = Buffer.from(stored.split(",", 2)[1], "base64");
    await expect(sharp(canonical, { failOn: "error" }).metadata()).resolves.toMatchObject({
      format: "webp",
      width: 2,
      height: 2,
    });
  });

  it.each([
    "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
    "data:image/png;base64,%%%%",
    "data:image/png;base64,",
    "data:image/PNG;base64,iVBORw0KGgo=",
    "data:image/png;base64,AB==",
  ])("rejects a non-canonical image data URL: %s", async (value) => {
    await expect(savePlayerPhoto(value)).resolves.toMatchObject({ ok: false });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects MIME and magic-byte disagreement", async () => {
    const png = await imageBytes("png");

    await expect(savePlayerPhoto(dataUrl("image/webp", png))).resolves.toMatchObject({ ok: false });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it.each(["png", "webp"] as const)("rejects a %s with a trailing script payload", async (format) => {
    const image = await imageBytes(format);
    const polyglot = new Uint8Array([...image, ...Buffer.from("<script>alert(1)</script>", "ascii")]);

    await expect(savePlayerPhoto(dataUrl(`image/${format}`, polyglot))).resolves.toMatchObject({ ok: false });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects a valid compressed image over the decoded pixel limit", async () => {
    const oversizedDimensions = await imageBytes("png", 4001, 4001);
    expect(oversizedDimensions.length).toBeLessThan(1_200_000);

    await expect(savePlayerPhoto(dataUrl("image/png", oversizedDimensions))).resolves.toMatchObject({ ok: false });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects an oversized decoded photo", async () => {
    const oversized = new Uint8Array(1_200_001);
    oversized.set(Buffer.from("RIFF0000WEBP", "ascii"));

    await expect(savePlayerPhoto(dataUrl("image/webp", oversized))).resolves.toMatchObject({ ok: false });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
