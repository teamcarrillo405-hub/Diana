/**
 * Phase 11: Pitfall 1 guard — Claude Vision does not accept HEIC/HEIF.
 *
 * iPhone photos default to HEIC. We convert client-side via heic2any BEFORE
 * the upload step. The bucket accepts HEIC as a fallback mime, but in
 * normal flow the converted JPEG is what reaches Storage and Claude.
 *
 * Lazy-import: heic2any is ~200 KB gzipped and only needed when the user
 * picks an HEIC file. Dynamic import keeps it out of the initial bundle.
 *
 * Pitfall 6 fallback: if dynamic import or conversion fails (Turbopack/WASM),
 * the caller should surface a calm message asking the user to share as JPEG.
 */

// No official @types/heic2any package exists as of 2026-05; declare locally.
type Heic2AnyOutput = Blob | Blob[];

interface Heic2AnyOptions {
  blob: Blob;
  toType?: "image/jpeg" | "image/png";
  quality?: number;
}

export async function convertHeicToJpeg(file: File): Promise<File> {
  // Dynamic import keeps heic2any out of the initial bundle.
  const mod = await import("heic2any");
  const heic2any = (mod as unknown as {
    default: (opts: Heic2AnyOptions) => Promise<Heic2AnyOutput>;
  }).default;

  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.85,
  });

  const blob = Array.isArray(converted) ? converted[0] : converted;
  const newName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
  return new File([blob], newName, { type: "image/jpeg" });
}
