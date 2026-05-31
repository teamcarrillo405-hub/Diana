/**
 * MIME type lookup for audio uploads. Used by:
 *   1. transcribe-voice Edge Function (Deno copy; same mapping)
 *   2. upload-validation.ts (extension whitelist)
 *
 * Whisper API accepts these MIME types. Fallback "audio/webm" matches the
 * existing transcribe-voice fallback so behavior is unchanged for unknown ext.
 */
const MIME_BY_EXT: Record<string, string> = {
  m4a:  "audio/mp4",
  mp3:  "audio/mpeg",
  wav:  "audio/wav",
  webm: "audio/webm",
};

export function getExtension(filename: string): string {
  const base = filename.split("/").pop() ?? filename;
  const dotIdx = base.lastIndexOf(".");
  if (dotIdx === -1) return "";
  return base.slice(dotIdx + 1).toLowerCase();
}

export function getMimeType(filename: string): string {
  const ext = getExtension(filename);
  return MIME_BY_EXT[ext] ?? "audio/webm";
}
