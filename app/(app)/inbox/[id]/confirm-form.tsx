"use client";

import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { confirmInboxItem, dismissInboxItem } from "./actions";
import styles from "../../quick-add/intake.module.css";

type ClassOption = { id: string; name: string };
const kinds = [
  { value: "other", label: "Other" },
  { value: "essay", label: "Essay" },
  { value: "lab", label: "Lab" },
  { value: "problem_set", label: "Problem set" },
  { value: "presentation", label: "Presentation" },
  { value: "test_prep", label: "Test prep" },
  { value: "reading", label: "Reading" },
] as const;
type Kind = typeof kinds[number]["value"];

type Props = {
  inboxItemId: string;
  classes: ClassOption[];
  classLoadError: boolean;
  defaultTitle: string;
  suggestedClassId: string | null;
  suggestedKind: string | null;
  suggestedDueAt: string | null;
};

export function ConfirmForm(props: Props) {
  const { inboxItemId, classes, classLoadError, defaultTitle, suggestedClassId, suggestedKind, suggestedDueAt } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const action = useRef<"confirm" | "dismiss" | null>(null);
  const dueEdited = useRef(false);
  const [title, setTitle] = useState(defaultTitle);
  const [classId, setClassId] = useState(classes.find(({ id }) => id === suggestedClassId)?.id ?? classes[0]?.id ?? "");
  const [kind, setKind] = useState<Kind>(kinds.find(option => option.value === suggestedKind)?.value ?? "other");
  const [dueAt, setDueAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!suggestedDueAt || dueEdited.current) return;
    const date = new Date(suggestedDueAt);
    if (Number.isNaN(date.getTime())) return;
    const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    setDueAt(localTime.toISOString().slice(0, 16));
  }, [suggestedDueAt]);

  function run(nextAction: "confirm" | "dismiss", work: () => Promise<{ ok: boolean; error?: string }>) {
    if (action.current) return;
    action.current = nextAction;
    setError(null);
    startTransition(async () => {
      try {
        const result = await work();
        if (result.ok) router.refresh();
        else setError(result.error ?? "Diana couldn’t save this change. Try again.");
      } catch {
        setError("Diana couldn’t confirm this change. Try again.");
      } finally {
        action.current = null;
      }
    });
  }

  function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !classId) return setError("Add an assignment name and choose a class.");
    const date = dueAt ? new Date(dueAt) : null;
    if (date && Number.isNaN(date.getTime())) return setError("Choose a valid due date.");
    run("confirm", () => confirmInboxItem(inboxItemId, { title, classId, kind, dueAt: date?.toISOString() ?? null }));
  }

  return (
    <form className={`${styles.panel} ${styles.reviewForm}`} onSubmit={confirm}>
      <h2>Assignment details</h2>
      {classLoadError ? (
        <div className={styles.notice}>
          <p>Classes couldn’t load.</p>
          <Link className={styles.secondary} href={`/assignments/captures/${inboxItemId}`}>Try again</Link>
        </div>
      ) : classes.length ? (
        <fieldset className={styles.fields} disabled={pending} aria-label="Editable assignment details">
          <label className={styles.full}>Assignment name<input required maxLength={160} value={title} onChange={event => setTitle(event.target.value)} /></label>
          <label>Class
            <select value={classId} onChange={event => setClassId(event.target.value)}>
              {classes.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
          </label>
          <label>Work type
            <select value={kind} onChange={event => setKind(event.target.value as Kind)}>
              {kinds.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className={styles.full}>
            <span>Due date and time <small>optional</small></span>
            <input type="datetime-local" value={dueAt} onChange={event => { dueEdited.current = true; setDueAt(event.target.value); }} />
          </label>
        </fieldset>
      ) : (
        <div className={styles.notice}>
          <p>Add a class to save this as an assignment.</p>
          <Link className={styles.primary} href={`/classes?create=1&intake=${inboxItemId}`}>Add class <Plus size={17} aria-hidden="true" /></Link>
        </div>
      )}
      {error ? <p className={styles.problem} role="status">{error}</p> : null}
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} disabled={pending} onClick={() => run("dismiss", () => dismissInboxItem(inboxItemId))}>
          {pending && action.current === "dismiss" ? "Setting aside…" : "Set aside"}
        </button>
        {!classLoadError && classes.length ? (
          <button type="submit" className={styles.primary} disabled={pending}>
            {pending && action.current === "confirm" ? "Adding…" : "Add to Work"} <ArrowRight size={17} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </form>
  );
}
