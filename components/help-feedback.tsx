"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { recordHelpFeedback } from "./help-feedback-actions";

/**
 * One-tap effectiveness signal. Optimistic and fire-and-forget: the tap is
 * acknowledged immediately and a failed write is silently dropped — this is
 * a learning signal, not a form.
 */
export function HelpFeedback({
  features,
  assignmentId = null,
  className = "",
}: {
  features: string[];
  assignmentId?: string | null;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "answered">("idle");

  function send(helpful: boolean) {
    setState("answered");
    void recordHelpFeedback({ features, assignmentId, helpful }).catch(() => {});
  }

  if (state === "answered") {
    return (
      <p className={`text-xs text-muted ${className}`} role="status">
        Noted — Diana adapts to what works for you.
      </p>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-xs text-muted">Did this kind of help work for you?</span>
      <button
        type="button"
        onClick={() => send(true)}
        className="touch-target inline-flex items-center gap-1.5 rounded-xl border border-border px-2.5 py-1.5 text-xs text-muted transition hover:bg-surface-soft hover:text-fg"
      >
        <ThumbsUp size={13} /> Helped
      </button>
      <button
        type="button"
        onClick={() => send(false)}
        className="touch-target inline-flex items-center gap-1.5 rounded-xl border border-border px-2.5 py-1.5 text-xs text-muted transition hover:bg-surface-soft hover:text-fg"
      >
        <ThumbsDown size={13} /> Not really
      </button>
    </div>
  );
}
