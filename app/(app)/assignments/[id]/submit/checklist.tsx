"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Send, Trash2 } from "lucide-react";
import {
  addChecklistItem,
  deleteChecklistItem,
  setSubmissionUrl,
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
  currentUrl,
}: {
  assignmentId: string;
  items: Item[];
  currentUrl: string | null;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [url, setUrl] = useState(currentUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [newItemLabel, setNewItemLabel] = useState("");
  const [confirmed, setConfirmed] = useState(false);
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

  function saveUrl() {
    const value = url.trim();
    startTransition(async () => {
      const result = await setSubmissionUrl({
        id: assignmentId,
        url: value.length > 0 ? value : null,
      });
      if (result?.error) setError(result.error);
    });
  }

  function confirmSubmission() {
    setError(null);
    if (confirmed) return;
    if (!requiredOk) {
      setError("Check each required item when you are ready.");
      return;
    }
    startTransition(async () => {
      const result = await transitionAssignment({
        id: assignmentId,
        from: "exporting",
        to: "submitted",
      });
      if ("error" in result && result.error) return setError(result.error);
      setConfirmed(true);
    });
  }

  return (
    <div className="sd-submit-checklist-shell">
      <section className="sd-submit-checklist" aria-labelledby="submission-checks-title">
        <div className="sd-submit-checklist-heading">
          <h2 id="submission-checks-title">FINAL CHECKS</h2>
          <span>{items.filter((item) => item.checked).length}/{items.length}</span>
        </div>
        {items.length > 0 ? (
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => toggle(item)} disabled={pending}>
                  <span className="sd-submit-checkbox" data-checked={item.checked} aria-hidden="true">
                    {item.checked ? <Check size={16} strokeWidth={3} /> : null}
                  </span>
                  <span>
                    <strong>{item.label}</strong>
                    {item.detail ? <small>{item.detail}</small> : null}
                  </span>
                  {item.required ? <em>REQUIRED</em> : null}
                </button>
                <button type="button" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.label}`} disabled={pending}>
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="sd-submit-empty">Add any checks you want to make before submitting.</p>
        )}

        <details className="sd-submit-options">
          <summary>Customize review</summary>
          <form onSubmit={(event) => { event.preventDefault(); addItem(); }}>
            <label htmlFor="new-submission-check">Add a check</label>
            <div>
              <input
                id="new-submission-check"
                value={newItemLabel}
                onChange={(event) => setNewItemLabel(event.target.value)}
                maxLength={200}
                placeholder="Attach the rubric"
              />
              <button type="submit" disabled={pending || !newItemLabel.trim()}>ADD</button>
            </div>
          </form>
          <label htmlFor="submission-url">Submission link, optional</label>
          <input
            id="submission-url"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onBlur={saveUrl}
            placeholder="https://classroom.google.com/..."
          />
        </details>

        {error ? <p className="sd-source-calm-error" role="status">{error}</p> : null}
      </section>

      <footer className="sd-submit-footer">
        <button
          type="button"
          onClick={confirmSubmission}
          disabled={pending || !requiredOk || confirmed}
          aria-label="Confirm submission"
        >
          {pending ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <Send size={20} aria-hidden="true" />}
          {pending ? "CONFIRMING" : confirmed ? "SUBMISSION CONFIRMED" : requiredOk ? "CONFIRM SUBMISSION" : "CHECK REQUIRED ITEMS"}
        </button>
      </footer>
    </div>
  );
}
