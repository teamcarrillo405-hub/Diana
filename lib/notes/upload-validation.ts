import { getExtension } from "./mime";

/**
 * Whisper API hard file-size cap. Files at or above this size return 413
 * from OpenAI, so we hard-block before upload.
 * Source: https://platform.openai.com/docs/api-reference/audio/createTranscription
 */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/**
 * Soft amber-warning threshold. Above this the user sees a calm note
 * recommending shorter clips, but the upload still proceeds.
 */
export const WARN_FILE_BYTES = 20 * 1024 * 1024;

export const ALLOWED_EXTENSIONS = ["m4a", "mp3", "wav", "webm"] as const;
export type AllowedExtension = typeof ALLOWED_EXTENSIONS[number];

export interface ValidationResult {
  ok: boolean;
  /** Calm amber notice — file proceeds but user is informed. */
  warning?: string;
  /** Hard block — file is rejected before upload. Calm copy, no shame. */
  error?: string;
}

function isAllowed(ext: string): ext is AllowedExtension {
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
}

export function validateAudioFile(file: File): ValidationResult {
  const ext = getExtension(file.name);
  if (!isAllowed(ext)) {
    return {
      ok: false,
      error: "Only .m4a, .mp3, .wav, and .webm audio files are supported. Pick a recording in one of those formats.",
    };
  }

  if (file.size >= MAX_FILE_BYTES) {
    return {
      ok: false,
      error: "This recording is at or above 25 MB. Whisper works best with shorter clips — try a recording under 25 minutes.",
    };
  }

  if (file.size >= WARN_FILE_BYTES) {
    return {
      ok: true,
      warning: "This is a large recording. Whisper works best under 20 MB — we'll still try, but shorter clips transcribe faster.",
    };
  }

  return { ok: true };
}
