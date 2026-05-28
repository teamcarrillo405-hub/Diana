"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import {
  toggleChecklistItem,
  setSubmissionUrl,
  transitionAssignment,
  addChecklistItem,
  deleteChecklistItem,
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

  const requiredOk = items.filter((i) => i.required).every((i) => i.checked);

  function toggle(item: Item) {
    const next = !item.checked;
    setItems((xs) => xs.map((x) => (x.id === item.id ? { ...x, checked: next } : x)));
    startTransition(async () => {
      const result = await toggleChecklistItem({ itemId: item.id, checked: next });
      if (result?.error) {
        setItems((xs) => xs.map((x) => (x.id === item.id ? { ...x, checked: !next } : x)));
        setError(result.error);
      }
    });
  }

  function addItem() {
    const label = newItemLabel.trim();
    if (!label) return;
    startTransition(async () => {
      const result = await addChecklistItem({ assignmentId, label });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setNewItemLabel("");
      router.refresh();
    });
  }

  function removeItem(itemId: string) {
    startTransition(async () => {
      const result = await deleteChecklistItem({ itemId });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setItems((xs) => xs.filter((x) => x.id !== itemId));
    });
  }

  function saveUrl() {
    const trimmed = url.trim();
    startTransition(async () => {
      await setSubmissionUrl({
        id: assignmentId,
        url: trimmed.length > 0 ? trimmed : null,
      });
    });
  }

  function markSubmitted() {
    setError(null);
    if (!requiredOk) {
      setError("Some required boxes aren't checked yet.");
      return;
    }
    startTransition(async () => {
      const result = await transitionAssignment({
        id: assignmentId,
        from: "exporting",
        to: "submitted",
      });
      if ("error" in result && result.error) return setError(result.error);
      router.push(`/assignments/${assignmentId}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {items.map((item) => (
          <li key={item.id} className="flex items-stretch">
            <button
              type="button"
              onClick={() => toggle(item)}
              className="flex flex-1 items-start gap-3 px-4 py-3 text-left hover:bg-border/30"
            >
              <span
                className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border ${
                  item.checked
                    ? "border-accent bg-accent text-white"
                    : "border-border bg-transparent"
                }`}
              >
                {item.checked && <Check size={14} />}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block font-medium ${
                    item.checked ? "line-through opacity-60" : ""
                  }`}
                >
                  {item.label}{" "}
                  {item.required && (
                    <span className="text-xs font-normal text-muted">(required)</span>
                  )}
                </span>
                {item.detail && (
                  <span className="block text-xs text-muted">{item.detail}</span>
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              aria-label={`Remove ${item.label}`}
              className="px-3 text-xs text-muted hover:text-fg hover:bg-border/30"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          addItem();
        }}
        className="flex gap-2 rounded-xl border border-dashed border-border bg-card p-3"
      >
        <input
          type="text"
          value={newItemLabel}
          onChange={(e) => setNewItemLabel(e.target.value)}
          placeholder="Add your own check (e.g. 'attach the rubric')"
          maxLength={200}
          className="flex-1 rounded-md border border-border bg-transparent px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending || !newItemLabel.trim()}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-border/30 disabled:opacity-50"
        >
          Add
        </button>
      </form>

      <div className="space-y-2 rounded-xl border border-border bg-card p-4">
        <label htmlFor="submission-url" className="block text-sm font-medium">
          Where did you submit it? (optional)
        </label>
        <div className="flex gap-2">
          <input
            id="submission-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={saveUrl}
            placeholder="https://classroom.google.com/…"
            className="flex-1 rounded-md border border-border bg-transparent px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={markSubmitted}
        disabled={pending || !requiredOk}
        className="w-full rounded-lg bg-accent px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {requiredOk ? "I clicked submit — mark it done" : "Finish the required boxes first"}
      </button>
    </div>
  );
}
