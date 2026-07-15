"use client";
import { useState, useTransition } from "react";
import {
  validateAudioFile,
  ALLOWED_EXTENSIONS,
} from "@/lib/notes/upload-validation";
import { uploadNoteAudio, triggerAudioTranscription } from "../actions";
import type { ClassCandidate } from "@/lib/notes/class-router";
import { scoreClassMatch } from "@/lib/notes/class-router";

export interface AudioUploadTabProps {
  /** Parent provides the noteId, creating the row on first call if needed. */
  ensureNoteId: () => Promise<string | null>;
  /** Called when Whisper returns the raw transcript — parent updates body state. */
  onTranscriptReady: (text: string) => void;
  /** Called with the routed class id (or null). Parent updates dropdown selection. */
  onClassSuggested: (classId: string | null) => void;
  /** Candidates for the keyword router. Passed in from server page. */
  classCandidates: ClassCandidate[];
}

type UploadStatus =
  | { kind: "idle" }
  | { kind: "validating" }
  | { kind: "uploading" }
  | { kind: "processing" }      // Whisper running
  | { kind: "structuring" }     // Claude cleanup fire-and-forget kicked off
  | { kind: "done" }
  | { kind: "tooShort" }        // Pitfall 7: < 20 chars returned from Whisper
  | { kind: "error"; message: string };

const ACCEPT_ATTR = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",") + ",audio/*";

export function AudioUploadTab({
  ensureNoteId,
  onTranscriptReady,
  onClassSuggested,
  classCandidates,
}: AudioUploadTabProps) {
  const [status, setStatus] = useState<UploadStatus>({ kind: "idle" });
  const [warning, setWarning] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setWarning(null);
    setStatus({ kind: "validating" });

    // 1. Client-side gate using 10-01's pure validator
    const v = validateAudioFile(file);
    if (!v.ok) {
      setStatus({ kind: "error", message: v.error ?? "Pick a .m4a, .mp3, .wav, or .webm file." });
      return;
    }
    if (v.warning) {
      setWarning(v.warning);
    }

    startTransition(async () => {
      try {
        // 2. Pitfall 4 — ensure the note row exists BEFORE upload.
        setStatus({ kind: "uploading" });
        const noteId = await ensureNoteId();
        if (!noteId) {
          setStatus({ kind: "error", message: "We couldn't create your note. Try refreshing the page." });
          return;
        }

        // 3. Upload to Supabase Storage via existing server action
        const formData = new FormData();
        formData.append("audio", file);
        const up = await uploadNoteAudio(formData);
        if (!up.ok) {
          setStatus({ kind: "error", message: "We couldn't upload that file. Try a smaller clip." });
          return;
        }

        // 4. Whisper + bodyText write
        setStatus({ kind: "processing" });
        const tr = await triggerAudioTranscription({
          noteId,
          storageKey: up.storageKey,
        });
        if (!tr.ok) {
          setStatus({ kind: "error", message: tr.error });
          return;
        }
        if ("bodyTooShort" in tr && tr.bodyTooShort) {
          setStatus({ kind: "tooShort" });
          return;
        }

        // 5. Hand transcript to parent for body state
        onTranscriptReady(tr.text);

        // 6. Auto-route to a class. Pure keyword scorer — no LLM.
        const suggestedId = scoreClassMatch(tr.text, classCandidates);
        onClassSuggested(suggestedId);

        // 7. Claude cleanup is fire-and-forget on the server. Surface a calm
        //    "structuring…" message; revalidatePath in the action means the
        //    note detail picks up the outline on next view.
        setStatus({ kind: "structuring" });
        setTimeout(() => setStatus({ kind: "done" }), 1500);
      } catch (err) {
        console.warn("audio upload error", err);
        setStatus({ kind: "error", message: "Something didn't go through. Try again in a moment." });
      }
    });
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="block text-sm font-medium text-foreground mb-2">
          Pick an audio file from your device
        </span>
        <input
          type="file"
          accept={ACCEPT_ATTR}
          onChange={handleFileSelect}
          disabled={isPending || status.kind === "uploading" || status.kind === "processing"}
          className="block w-full rounded-lg border border-border bg-card px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
        <p className="mt-1 text-xs text-muted">
          Supports .m4a, .mp3, .wav, .webm. Whisper works best with clips under 20 MB.
        </p>
      </label>

      {warning && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          {warning}
        </p>
      )}

      {status.kind === "uploading" && (
        <p className="text-sm text-muted">Uploading your recording…</p>
      )}
      {status.kind === "processing" && (
        <p className="text-sm text-muted">Processing your recording…</p>
      )}
      {status.kind === "structuring" && (
        <p className="text-sm text-muted">
          Got it. We&apos;re shaping the transcript into headings and bullets: refresh in a moment to see the outline.
        </p>
      )}
      {status.kind === "done" && (
        <p className="text-sm text-muted">All set. Edit anything below, then tap Done.</p>
      )}
      {status.kind === "tooShort" && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          The recording didn&apos;t pick up enough speech. You can type or paste notes below instead.
        </p>
      )}
      {status.kind === "error" && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          {status.message}
        </p>
      )}
    </div>
  );
}
