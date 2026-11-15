"use client";

import { useEffect, useRef } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import type { PreviewTask } from "./preview-data";
import styles from "./today-lobby-review.module.css";
import feedback from "./today-launch-feedback.module.css";
import { containDialogTab } from "./dialog-keyboard";

export function TodayLaunchDialog({ task, error, onRetry, onBack, authoredMotion = false, returnLabel = "Back to Today" }: { task: PreviewTask; error: boolean; onRetry: () => void; onBack: () => void; authoredMotion?: boolean; returnLabel?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    title.current?.focus();
    return () => element?.close();
  }, []);
  return <dialog ref={dialog} className={styles.sessionDialog} data-authored-session={authoredMotion || undefined} aria-labelledby="launch-title" onKeyDown={containDialogTab} onCancel={event => { event.preventDefault(); onBack(); }}>
    <div className={styles.sessionBody}>
      <header className={styles.sessionHeader}><button type="button" title={returnLabel} aria-label={returnLabel} onClick={onBack}><ArrowLeft size={21} /></button><span>Focus session</span><small>Preview only</small></header>
      <p className={styles.sessionSubject}>{task.subject}</p>
      <h2 id="launch-title" ref={title} tabIndex={-1}>{task.title}</h2>
      <p role="status" className={error ? feedback.error : undefined}>{error ? "The session could not open. Your work is unchanged." : "Opening session..."}</p>
      {error && <button type="button" className={styles.finishSession} onClick={onRetry}><RotateCcw size={18} />Retry</button>}
    </div>
  </dialog>;
}
