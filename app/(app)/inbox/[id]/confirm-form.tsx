"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmInboxItem, dismissInboxItem } from "./actions";

type ClassOption = { id: string; name: string; color: string };

type AssignmentKind =
  | "essay"
  | "lab"
  | "problem_set"
  | "presentation"
  | "test_prep"
  | "reading"
  | "other";

const KIND_OPTIONS: { value: AssignmentKind; label: string }[] = [
  { value: "essay", label: "Essay" },
  { value: "lab", label: "Lab" },
  { value: "problem_set", label: "Problem set" },
  { value: "presentation", label: "Presentation" },
  { value: "test_prep", label: "Test prep" },
  { value: "reading", label: "Reading" },
  { value: "other", label: "Other" },
];

type Props = {
  inboxItemId: string;
  classes: ClassOption[];
  suggestedClassId: string | null;
  suggestedKind: string | null;
  suggestedDueAt: string | null;
};

export function ConfirmForm({
  inboxItemId,
  classes,
  suggestedClassId,
  suggestedKind,
  suggestedDueAt,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [classId, setClassId] = useState(suggestedClassId ?? classes[0]?.id ?? "");
  const [kind, setKind] = useState<AssignmentKind>(
    (suggestedKind as AssignmentKind) ?? "other"
  );
  const [dueAt, setDueAt] = useState(
    suggestedDueAt ? new Date(suggestedDueAt).toISOString().slice(0, 16) : ""
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!classId) return setErrorMsg("Pick a class.");
    setErrorMsg(null);
    setConfirming(true);

    startTransition(async () => {
      const result = await confirmInboxItem(inboxItemId, {
        classId,
        kind,
        dueAt: dueAt || null,
      });
      if (result.ok) {
        router.push(`/assignments/${result.assignmentId}`);
      } else {
        setErrorMsg(result.error);
        setConfirming(false);
      }
    });
  }

  function handleDismiss() {
    setDismissing(true);
    startTransition(async () => {
      await dismissInboxItem(inboxItemId);
      router.push("/inbox");
    });
  }

  if (classes.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted">
        Add a class first, then you can convert this capture.
      </div>
    );
  }

  return (
    <form onSubmit={handleConfirm} className="space-y-4 rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        Convert to assignment
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block space-y-1 text-sm font-medium">
          <span>Class</span>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 text-sm font-medium">
          <span>Type</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as AssignmentKind)}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            {KIND_OPTIONS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-1 text-sm font-medium">
        <span>Due (optional)</span>
        <input
          type="datetime-local"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
      </label>

      {errorMsg && (
        <p className="rounded-lg bg-border/50 px-3 py-2 text-sm">{errorMsg}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={confirming || dismissing}
          className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {confirming ? "Converting…" : "Convert to assignment"}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          disabled={confirming || dismissing}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:bg-border/30 disabled:opacity-50"
        >
          {dismissing ? "Dismissing…" : "Dismiss"}
        </button>
      </div>
    </form>
  );
}
