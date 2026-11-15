import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  upload: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { uploadHistoryMapImage, uploadMathPhoto } from "./ai-tools-actions";

const OWNER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const png = new Uint8Array(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
));
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

function form(field: "historyMap" | "mathPhoto", file: File): FormData {
  const data = new FormData();
  data.set(field, file);
  return data;
}

describe("AI tool image uploads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upload.mockResolvedValue({ error: null });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: OWNER_ID } } }) },
      storage: { from: vi.fn().mockReturnValue({ upload: mocks.upload }) },
    });
  });

  it.each([
    ["history map", uploadHistoryMapImage, "historyMap" as const],
    ["math photo", uploadMathPhoto, "mathPhoto" as const],
  ])("rejects %s arbitrary bytes despite a valid extension and MIME", async (_label, uploadAction, field) => {
    const result = await uploadAction(form(field, new File(["not-an-image"], "scan.png", { type: "image/png" })));

    expect(result).toMatchObject({ ok: false });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("rejects extension and MIME disagreement and empty files before storage", async () => {
    const mismatch = await uploadHistoryMapImage(form(
      "historyMap",
      new File([png], "map.png", { type: "image/jpeg" }),
    ));
    const empty = await uploadMathPhoto(form(
      "mathPhoto",
      new File([], "problem.jpg", { type: "image/jpeg" }),
    ));

    expect(mismatch).toMatchObject({ ok: false });
    expect(empty).toMatchObject({ ok: false });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("stores valid images with canonical extensions and content types", async () => {
    const history = await uploadHistoryMapImage(form(
      "historyMap",
      new File([jpeg], "map.JPEG", { type: "image/jpg" }),
    ));
    const math = await uploadMathPhoto(form(
      "mathPhoto",
      new File([png], "problem.png", { type: "image/png" }),
    ));

    expect(history).toMatchObject({ ok: true, storageKey: expect.stringMatching(/\/history-map-\d+\.jpg$/u) });
    expect(math).toMatchObject({ ok: true, storageKey: expect.stringMatching(/\/math-\d+\.png$/u) });
    expect(mocks.upload).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\.jpg$/u),
      expect.any(File),
      { contentType: "image/jpeg" },
    );
    expect(mocks.upload).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\.png$/u),
      expect.any(File),
      { contentType: "image/png" },
    );
  });
});
