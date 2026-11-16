"use server";

import { createRequire } from "node:module";
import { revalidatePath } from "next/cache";
import { normalizeSchoolColor, normalizeSchoolName, type SchoolBrandingInput } from "@/lib/school-branding";
import { validateUpload } from "@/lib/security/upload-validation";
import { createClient } from "@/lib/supabase/server";

type SharpPipeline = {
  metadata: () => Promise<{ format?: string; width?: number; height?: number; pages?: number }>;
  rotate: () => SharpPipeline;
  resize: (options: { width: number; height: number; fit: "inside"; withoutEnlargement: boolean }) => SharpPipeline;
  webp: (options: { quality: number; effort: number }) => SharpPipeline;
  toBuffer: () => Promise<Buffer>;
};
type SharpFactory = (input: Uint8Array, options: {
  failOn: "error";
  limitInputPixels: number;
  sequentialRead: boolean;
}) => SharpPipeline;
const sharp = createRequire(import.meta.url)("sharp") as SharpFactory;

const MAX_LOGO_INPUT_BYTES = 1_200_000;
const MAX_LOGO_OUTPUT_BYTES = 200_000;
const MAX_LOGO_PIXELS = 16_000_000;
const MAX_DATA_URL_LENGTH = Math.ceil(MAX_LOGO_INPUT_BYTES / 3) * 4 + 32;
const LOGO_DATA_URL = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/u;
const STRICT_BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u;
type Result = { ok: true } | { ok: false; error: string };

async function canonicalLogo(value: string): Promise<string | null> {
  if (value.length > MAX_DATA_URL_LENGTH) return null;
  const match = LOGO_DATA_URL.exec(value);
  if (!match || !STRICT_BASE64.test(match[2])) return null;
  const [, mimeType, encoded] = match;
  const decoded = Buffer.from(encoded, "base64");
  if (!decoded.length || decoded.length > MAX_LOGO_INPUT_BYTES || decoded.toString("base64") !== encoded) return null;
  const extension = mimeType === "image/jpeg" ? "jpg" : mimeType.slice(6);
  const validation = validateUpload("quickAddPhoto", {
    name: `school-logo.${extension}`, mimeType, size: decoded.length, bytes: decoded,
  });
  if (!validation.ok || validation.value.mimeType !== mimeType) return null;
  try {
    const image = sharp(decoded, { failOn: "error", limitInputPixels: MAX_LOGO_PIXELS, sequentialRead: true });
    const metadata = await image.metadata();
    const expectedFormat = mimeType === "image/jpeg" ? "jpeg" : mimeType.slice(6);
    if (metadata.format !== expectedFormat || !metadata.width || !metadata.height ||
        metadata.width * metadata.height > MAX_LOGO_PIXELS || (metadata.pages ?? 1) > 1) return null;
    const canonical = await image.rotate()
      .resize({ width: 384, height: 384, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86, effort: 4 }).toBuffer();
    if (!canonical.length || canonical.length > MAX_LOGO_OUTPUT_BYTES) return null;
    return `data:image/webp;base64,${canonical.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Validate an existing, already-sized WebP without encoding it a second time. */
async function isStoredLogoValid(value: string): Promise<boolean> {
  const match = LOGO_DATA_URL.exec(value);
  if (!match || match[1] !== "image/webp" || !STRICT_BASE64.test(match[2])) return false;
  const decoded = Buffer.from(match[2], "base64");
  if (!decoded.length || decoded.length > MAX_LOGO_OUTPUT_BYTES || decoded.toString("base64") !== match[2]) return false;
  const validation = validateUpload("quickAddPhoto", {
    name: "school-logo.webp", mimeType: "image/webp", size: decoded.length, bytes: decoded,
  });
  if (!validation.ok || validation.value.mimeType !== "image/webp") return false;
  try {
    const metadata = await sharp(decoded, { failOn: "error", limitInputPixels: MAX_LOGO_PIXELS, sequentialRead: true }).metadata();
    return metadata.format === "webp" && !!metadata.width && !!metadata.height &&
      metadata.width <= 384 && metadata.height <= 384 && (metadata.pages ?? 1) <= 1;
  } catch {
    return false;
  }
}

/** Save only the signed-in student's optional colors and logo. */
export async function saveSchoolBranding(input: SchoolBrandingInput): Promise<Result> {
  if (!input || typeof input !== "object") return { ok: false, error: "Choose valid school colors." };
  const primaryColor = normalizeSchoolColor(input.primaryColor);
  const secondaryColor = normalizeSchoolColor(input.secondaryColor);
  const schoolName = input.schoolName === undefined ? undefined : normalizeSchoolName(input.schoolName);
  if (primaryColor === undefined || secondaryColor === undefined ||
      (input.schoolName !== undefined && schoolName === undefined) ||
      (input.logoDataUrl !== null && typeof input.logoDataUrl !== "string")) {
    return { ok: false, error: "Choose a school name up to 80 characters, valid colors, and a logo." };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in to save your school look." };

  let logo: string | null = null;
  if (input.logoDataUrl !== null) {
    let existingLogo: string | null = null;
    if (input.logoDataUrl.startsWith("data:image/webp;base64,") && input.logoDataUrl.length <= MAX_DATA_URL_LENGTH) {
      const { data: profile, error: profileError } = await supabase.from("profiles")
        .select("school_logo_url").eq("user_id", user.id).maybeSingle();
      if (profileError || !profile) return { ok: false, error: "Your school look did not save. Please try again." };
      existingLogo = profile.school_logo_url;
    }
    logo = input.logoDataUrl === existingLogo && await isStoredLogoValid(input.logoDataUrl)
      ? input.logoDataUrl
      : await canonicalLogo(input.logoDataUrl);
  }
  if (input.logoDataUrl !== null && logo === null) {
    return { ok: false, error: "Choose a PNG, JPG, or WebP logo under 1.2 MB." };
  }
  const { data, error } = await supabase.from("profiles").update({
    ...(schoolName !== undefined ? { school_name: schoolName } : {}),
    school_primary_color: primaryColor,
    school_secondary_color: secondaryColor,
    school_logo_url: logo,
  }).eq("user_id", user.id).select("user_id").maybeSingle();
  if (error || !data) return { ok: false, error: "Your school look did not save. Please try again." };

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/onboarding");
  return { ok: true };
}
