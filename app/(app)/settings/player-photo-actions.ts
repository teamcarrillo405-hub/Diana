"use server";

import { createRequire } from "node:module";
import { revalidatePath } from "next/cache";
import { validateUpload } from "@/lib/security/upload-validation";
import { createClient } from "@/lib/supabase/server";

type SharpPipeline = {
  metadata: () => Promise<{ format?: string; width?: number; height?: number }>;
  rotate: () => SharpPipeline;
  webp: (options: { quality: number; effort: number }) => SharpPipeline;
  toBuffer: () => Promise<Buffer>;
};

type SharpFactory = (
  input: Uint8Array,
  options: { failOn: "error"; limitInputPixels: number; sequentialRead: boolean },
) => SharpPipeline;

const sharp = createRequire(import.meta.url)("sharp") as SharpFactory;

const MAX_PHOTO_BYTES = 1_200_000;
const MAX_PHOTO_PIXELS = 16_000_000;
const MAX_DATA_URL_LEN = Math.ceil(MAX_PHOTO_BYTES / 3) * 4 + 32;
const PHOTO_DATA_URL = /^data:(image\/(?:png|webp));base64,([A-Za-z0-9+/=]+)$/u;
const STRICT_BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u;

type Result = { ok: true } | { ok: false; error: string };

async function setPhoto(value: string | null): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({ photo_url: value, photo_offset_x: 50, photo_offset_y: 50 })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { ok: true };
}

export async function savePlayerPhoto(dataUrl: string): Promise<Result> {
  if (typeof dataUrl !== "string" || dataUrl.length > MAX_DATA_URL_LEN) {
    return { ok: false, error: "Photo is too large. Try a smaller image." };
  }
  const match = PHOTO_DATA_URL.exec(dataUrl);
  if (!match || !STRICT_BASE64.test(match[2])) {
    return { ok: false, error: "That doesn't look like an image." };
  }
  const [, mimeType, encoded] = match;
  const decoded = Buffer.from(encoded, "base64");
  if (decoded.length === 0 || decoded.toString("base64") !== encoded) {
    return { ok: false, error: "That doesn't look like an image." };
  }
  if (decoded.length > MAX_PHOTO_BYTES) {
    return { ok: false, error: "Photo is too large. Try a smaller image." };
  }

  const extension = mimeType === "image/png" ? "png" : "webp";
  const validation = validateUpload("quickAddPhoto", {
    name: `player-photo.${extension}`,
    mimeType,
    size: decoded.length,
    bytes: decoded,
  });
  if (!validation.ok || validation.value.mimeType !== mimeType) {
    return { ok: false, error: "That doesn't look like an image." };
  }
  try {
    const image = sharp(decoded, {
      failOn: "error",
      limitInputPixels: MAX_PHOTO_PIXELS,
      sequentialRead: true,
    });
    const metadata = await image.metadata();
    const expectedFormat = mimeType === "image/png" ? "png" : "webp";
    if (
      metadata.format !== expectedFormat
      || !metadata.width
      || !metadata.height
      || metadata.width * metadata.height > MAX_PHOTO_PIXELS
    ) return { ok: false, error: "That doesn't look like an image." };

    const canonical = await image
      .rotate()
      .webp({ quality: 88, effort: 4 })
      .toBuffer();
    if (canonical.length === 0 || canonical.length > MAX_PHOTO_BYTES) {
      return { ok: false, error: "Photo is too large. Try a smaller image." };
    }
    return setPhoto(`data:image/webp;base64,${canonical.toString("base64")}`);
  } catch {
    return { ok: false, error: "That doesn't look like an image." };
  }
}

export async function clearPlayerPhoto(): Promise<Result> {
  return setPhoto(null);
}

// Drag-to-reposition: crop offset only, photo itself is unchanged.
export async function savePlayerPhotoOffset(offsetX: number, offsetY: number): Promise<Result> {
  const x = Math.round(offsetX);
  const y = Math.round(offsetY);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100) {
    return { ok: false, error: "Invalid photo position." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({ photo_offset_x: x, photo_offset_y: y })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { ok: true };
}
