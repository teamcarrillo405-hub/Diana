"use client";
import { useState, useTransition } from "react";
import {
  validateDocFile,
  ALLOWED_DOC_EXTENSIONS,
} from "@/lib/notes/upload-validation-doc";
import { convertHeicToJpeg } from "@/lib/notes/heic-convert";
import { uploadNoteDoc, triggerDocExtraction } from "../actions";
import type { ClassCandidate } from "@/lib/notes/class-router";
import { scoreClassMatch } from "@/lib/notes/class-router";

export interface DocUploadTabProps {
  /** Parent provides the noteId, creating the row on first call if needed. */
  ensureNoteId: () => Promise<string | null>;
  /** Called when extraction returns the raw text — parent updates body state. */
  onTranscriptReady: (text: string) => void;
  /** Called with the routed class id (or null). Parent updates dropdown selection. */
  onClassSuggested: (classId: string | null) => void;
  /** Candidates for the keyword router. Passed in from server page. */
  classCandidates: ClassCandidate[];
}

type UploadStatus =
  | { kind: "idle" }
  | { kind: "validating" }
  | { kind: "heicConverting" }   // Pitfall 1: HEIC to JPEG before upload
  | { kind: "uploading" }
  | { kind: "processing" }       // Claude extraction running
  | { kind: "structuring" }      // transcribe-note fire-and-forget kicked off (from Edge Function)
  | { kind: "done" }
  | { kind: "tooShort" }         // Pitfall 5: < 20 chars
  | { kind: "error"; message: string };

// accept attr: extension list + image/*+application/pdf so iOS shows the right pickers.
const ACCEPT_ATTR =
  ALLOWED_DOC_EXTENSIONS.map((e) => `.${e}`).join(",") + ",image/*,application/pdf";

export function DocUploadTab({
  ensureNoteId,
  onTranscriptReady,
  onClassSuggested,
  classCandidates,
}: DocUploadTabProps) {
  const [status, setStatus] = useState<UploadStatus>({ kind: "idle" });
  const [warning, setWarning] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;

    setWarning(null);
    setStatus({ kind: "validating" });

    // 1. Client-side gate using 11-01's pure validator
    const v = validateDocFile(picked);
    if (!v.ok) {
      setStatus({ kind: "error", message: v.error ?? "Pick a .jpg, .png, .heic, .webp, or .pdf file." });
      return;
    }
    if (v.warning) {
      setWarning(v.warning);
    }

    startTransition(async () => {
      try {
        // 2. Pitfall 1 — HEIC must be converted to JPEG before Claude sees it.
        let file = picked;
        if (v.needsHeicConvert) {
          setStatus({ kind: "heicConverting" });
          try {
            file = await convertHeicToJpeg(picked);
          } catch (convErr) {
            // Pitfall 6 fallback: heic2any failed (Turbopack/WASM/etc).
            // Calm guidance — student can re-share from iPhone Files as JPEG.
            console.warn("heic2any conversion did not complete", convErr);
            setStatus({
              kind: "error",
              message: "We couldn't convert that photo. From your iPhone, open Files, tap Share, and pick \"Copy as JPEG\".",
            });
            return;
          }
        }

        // 3. Ensure the note row exists BEFORE upload (Pitfall 4 from Phase 10).
        setStatus({ kind: "uploading" });
        const noteId = await ensureNoteId();
        if (!noteId) {
          setStatus({ kind: "error", message: "We couldn't create your note. Try refreshing the page." });
          return;
        }

        // 4. Upload to Supabase Storage via new server action
        const formData = new FormData();
        formData.append("doc", file);
        const up = await uploadNoteDoc(formData);
        if (!up.ok) {
          setStatus({ kind: "error", message: "We couldn't upload that file. Try a smaller one." });
          return;
        }

        // 5. Claude Vision / PDF extraction (AWAITED)
        setStatus({ kind: "processing" });
        const tr = await triggerDocExtraction({
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

        // 6. Hand extracted text to parent for body state
        onTranscriptReady(tr.text);

        // 7. Auto-route to a class. Pure keyword scorer — no LLM.
        const suggestedId = scoreClassMatch(tr.text, classCandidates);
        onClassSuggested(suggestedId);

        // 8. Claude cleanup is fire-and-forget on the Edge Function side.
        //    Surface a calm "structuring..." message; revalidatePath in the
        //    action means the note detail picks up the outline on next view.
        setStatus({ kind: "structuring" });
        setTimeout(() => setStatus({ kind: "done" }), 1500);
      } catch (err) {
        console.warn("doc upload error", err);
        setStatus({ kind: "error", message: "Something didn't go through. Try again in a moment." });
      }
    });
  }

  const disabled =
    isPending ||
    status.kind === "heicConverting" ||
    status.kind === "uploading" ||
    status.kind === "processing" ||
    status.kind === "structuring";

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="block text-sm font-medium text-foreground mb-2">
          Pick a photo of your notes or a PDF
        </span>
        <input
          type="file"
          accept={ACCEPT_ATTR}
          onChange={handleFileSelect}
          disabled={disabled}
          className="block w-full rounded-lg border border-border bg-card px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
        <p className="mt-1 text-xs text-muted">
          Supports .jpg, .png, .heic, .webp, .gif, and .pdf. Photos work best under 10 MB.
        </p>
      </label>

      {warning && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          {warning}
        </p>
      )}

      {status.kind === "heicConverting" && (
        <p className="text-sm text-muted">Converting photo format...</p>
      )}
      {status.kind === "uploading" && (
        <p className="text-sm text-muted">Uploading your file...</p>
      )}
      {status.kind === "processing" && (
        <p className="text-sm text-muted">Processing your file...</p>
      )}
      {status.kind === "structuring" && (
        <p className="text-sm text-muted">
          Got it. We&apos;re shaping the text into headings and bullets — refresh in a moment to see the outline.
        </p>
      )}
      {status.kind === "done" && (
        <p className="text-sm text-muted">All set. Edit anything below, then tap Done.</p>
      )}
      {status.kind === "tooShort" && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          We couldn&apos;t read enough text from that file. You can type or paste notes below instead.
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
