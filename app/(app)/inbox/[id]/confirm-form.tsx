"use client";

import { CalendarDays, CheckCircle2, Library, Shapes, X } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { confirmInboxItem, dismissInboxItem } from "./actions";

type ClassOption = { id: string; name: string; color: string | null };

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
    (suggestedKind as AssignmentKind) ?? "other",
  );
  const [dueAt, setDueAt] = useState(
    suggestedDueAt ? new Date(suggestedDueAt).toISOString().slice(0, 16) : "",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"confirm" | "dismiss" | null>(null);

  function handleConfirm(event: React.FormEvent) {
    event.preventDefault();
    if (!classId) {
      setErrorMsg("Choose a class first.");
      return;
    }
    setErrorMsg(null);
    setBusyAction("confirm");

    startTransition(async () => {
      const result = await confirmInboxItem(inboxItemId, {
        classId,
        kind,
        dueAt: dueAt || null,
      });
      if (result.ok) {
        router.push(`/assignments/${result.assignmentId}`);
        return;
      }
      setErrorMsg(result.error);
      setBusyAction(null);
    });
  }

  function handleDismiss() {
    setErrorMsg(null);
    setBusyAction("dismiss");
    startTransition(async () => {
      const result = await dismissInboxItem(inboxItemId);
      if (result.ok) {
        router.push("/inbox");
        return;
      }
      setErrorMsg(result.error);
      setBusyAction(null);
    });
  }

  if (classes.length === 0) {
    return (
      <section className="sd-inbox-no-class">
        <Library aria-hidden="true" />
        <h2>Add a class before confirming this play.</h2>
        <button type="button" onClick={() => router.push("/classes/new")}>
          Add class
        </button>
      </section>
    );
  }

  return (
    <form className="sd-inbox-confirm-form" onSubmit={handleConfirm}>
      <p>Confirm the play</p>

      <label>
        <span>
          <Library aria-hidden="true" />
          Class
        </span>
        <select value={classId} onChange={(event) => setClassId(event.target.value)}>
          {classes.map((classOption) => (
            <option key={classOption.id} value={classOption.id}>
              {classOption.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>
          <Shapes aria-hidden="true" />
          Work type
        </span>
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value as AssignmentKind)}
        >
          {KIND_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>
          <CalendarDays aria-hidden="true" />
          Due date, optional
        </span>
        <input
          type="datetime-local"
          value={dueAt}
          onChange={(event) => setDueAt(event.target.value)}
        />
      </label>

      {errorMsg ? <div className="sd-calm-form-error" role="status">{errorMsg}</div> : null}

      <button
        type="submit"
        className="sd-inbox-convert"
        disabled={busyAction !== null}
      >
        <CheckCircle2 aria-hidden="true" />
        {busyAction === "confirm" ? "Adding to work board..." : "Add to work board"}
      </button>
      <button
        type="button"
        className="sd-inbox-dismiss"
        onClick={handleDismiss}
        disabled={busyAction !== null}
      >
        <X aria-hidden="true" />
        {busyAction === "dismiss" ? "Setting aside..." : "Set aside"}
      </button>
    </form>
  );
}
