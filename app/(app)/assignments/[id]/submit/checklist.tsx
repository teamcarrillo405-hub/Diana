"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ClipboardCheck, Loader2, Send, Trash2 } from "lucide-react";
import styles from "@/components/student-shell/submission.module.css";
import {
  addChecklistItem,
  deleteChecklistItem,
  toggleChecklistItem,
  transitionAssignment,
} from "../actions";

type Item = {
  id: string;
  label: string;
  detail: string | null;
  required: boolean;
  checked: boolean;
  position: number;
};

export function SubmitChecklist({
  assignmentId,
  items: initial,
  showFinalConfirmation = true,
}: {
  assignmentId: string;
  items: Item[];
  showFinalConfirmation?: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [newItemLabel, setNewItemLabel] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [handedIn, setHandedIn] = useState(false);
  useEffect(() => setItems(initial), [initial]);
  const requiredOk = items.filter((item) => item.required).every((item) => item.checked);

  function toggle(item: Item) {
    const checked = !item.checked;
    setError(null);
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, checked } : entry));
    startTransition(async () => {
      const result = await toggleChecklistItem({ itemId: item.id, checked });
      if (result?.error) {
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, checked: !checked } : entry));
        setError(result.error);
      }
    });
  }

  function addItem() {
    const label = newItemLabel.trim();
    if (!label) return;
    setError(null);
    startTransition(async () => {
      const result = await addChecklistItem({ assignmentId, label });
      if (result?.error) return setError(result.error);
      setNewItemLabel("");
      router.refresh();
    });
  }

  function removeItem(itemId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteChecklistItem({ itemId });
      if (result?.error) return setError(result.error);
      setItems((current) => current.filter((item) => item.id !== itemId));
    });
  }

  function confirmSubmission() {
    if (confirmed || !handedIn || !requiredOk) return;
    setConfirmationError(null);
    startTransition(async () => {
      const result = await transitionAssignment({
        id: assignmentId,
        from: "exporting",
        to: "submitted",
      });
      if ("error" in result && result.error) return setConfirmationError(result.error);
      setConfirmed(true);
      router.refresh();
    });
  }

  return (
    <>
      <section className={styles.paper} aria-labelledby="submission-checks-title">
        <div className={styles.panelHeading}>
          <ClipboardCheck size={23} aria-hidden="true" />
          <h2 id="submission-checks-title">Final checks</h2>
          {items.length > 0 ? <span className={styles.checkCount}>{items.filter((item) => item.checked).length} of {items.length} complete</span> : null}
        </div>
        {items.length > 0 ? (
          <ul className={styles.checkList}>
            {items.map((item) => (
              <li key={item.id}>
                <button type="button" role="checkbox" aria-checked={item.checked} onClick={() => toggle(item)} disabled={pending}>
                  <span className={styles.checkboxMark} data-checked={item.checked} aria-hidden="true">
                    {item.checked ? <Check size={16} strokeWidth={3} /> : null}
                  </span>
                  <span>
                    <strong>{item.label}</strong>
                    {item.detail ? <small>{item.detail}</small> : null}
                  </span>
                  {item.required ? <em>Required</em> : null}
                </button>
                <button type="button" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.label}`} disabled={pending}>
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyChecks}>Add any checks you want to make before handing in your work.</p>
        )}

        <details className={styles.options}>
          <summary>Customize review</summary>
          <form className={styles.form} onSubmit={(event) => { event.preventDefault(); addItem(); }}>
            <label htmlFor="new-submission-check">Add a check</label>
            <div>
              <input
                id="new-submission-check"
                value={newItemLabel}
                onChange={(event) => setNewItemLabel(event.target.value)}
                maxLength={200}
                placeholder="Attach the rubric"
              />
              <button type="submit" className={styles.secondary} disabled={pending || !newItemLabel.trim()}>Add</button>
            </div>
          </form>
        </details>

        {error ? <p className={styles.notice} role="status">{error}</p> : null}
      </section>

      {showFinalConfirmation ? <section className={styles.sendPanel} aria-labelledby="record-handoff-title">
        <h2 id="record-handoff-title">Record hand-in</h2>
        <p>Diana saves your confirmation in your Record.</p>
        <label className={styles.confirmationCheckbox}><input type="checkbox" checked={handedIn} disabled={pending || confirmed} onChange={event => setHandedIn(event.target.checked)} />I handed this in using my teacher&apos;s required method.</label>
        <button
          type="button"
          onClick={confirmSubmission}
          disabled={pending || !requiredOk || !handedIn || confirmed}
          className={styles.primary}
        >
          {pending ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <Send size={20} aria-hidden="true" />}
          {pending ? "Recording hand-in" : confirmed ? "Hand-in recorded" : "Record hand-in in Diana"}
        </button>
        {!requiredOk ? <p className={styles.requiredNote}>Complete the required checks first.</p> : null}
        {confirmationError ? <p className={styles.notice} role="status">{confirmationError}</p> : null}
      </section> : null}
    </>
  );
}
