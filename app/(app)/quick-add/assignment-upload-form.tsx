"use client";

import { ArrowRight, FileText, FileUp, ClipboardPaste, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { createAssignmentFromInstructions, createAssignmentFromUpload } from "./actions";
import styles from "./intake.module.css";

type ClassOption = { id: string; name: string };
type IntakeMode = "file" | "text";

export function AssignmentUploadForm({ classes, initialClassId }: {
  classes: readonly ClassOption[];
  initialClassId?: string;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const chooseFile = useRef<HTMLButtonElement>(null);
  const requestId = useRef<string | null>(null);
  const sending = useRef(false);
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<IntakeMode>("file");
  const [classId, setClassId] = useState(classes.find(({ id }) => id === initialClassId)?.id ?? classes[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [instructions, setInstructions] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = pending || Boolean(savedId) || uncertain;

  function selectMode(nextMode: IntakeMode) {
    setError(null);
    setMode(nextMode);
  }

  function selectFile(nextFile: File | null) {
    setError(null);
    setFile(nextFile);
    if (!nextFile && fileInput.current) fileInput.current.value = "";
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    setError(null);
    if (!classId) return setError("Choose a class.");
    if (mode === "file" && !file) return setError("Choose a file.");
    if (mode === "text" && instructions.trim().length < 2) return setError("Paste the assignment instructions.");

    const dueDate = dueAt ? new Date(dueAt) : null;
    if (dueDate && Number.isNaN(dueDate.getTime())) return setError("Choose a valid due date.");
    const date = dueDate?.toISOString() ?? null;
    const id = requestId.current ??= crypto.randomUUID();
    sending.current = true;

    startTransition(async () => {
      try {
        let result;
        if (mode === "file" && file) {
          const data = new FormData();
          data.set("requestId", id);
          data.set("classId", classId);
          data.set("title", title.trim());
          data.set("file", file);
          if (date) data.set("dueAt", date);
          result = await createAssignmentFromUpload(data);
        } else {
          result = await createAssignmentFromInstructions({ requestId: id, classId, title, dueAt: date, instructions });
        }
        if (!result.ok) {
          if ("assignmentId" in result && result.assignmentId) setSavedId(result.assignmentId);
          if ("uncertain" in result && result.uncertain) setUncertain(true);
          setError(result.error);
          return;
        }
        router.push(`/assignments/${result.assignmentId}/workspace`);
      } catch {
        setUncertain(true);
        setError("Diana couldn’t confirm the save. Try again with the same assignment details.");
      } finally {
        sending.current = false;
      }
    });
  }

  return (
    <form className={`${styles.panel} ${styles.form}`} onSubmit={submit}>
      <div className={styles.tabs} role="group" aria-label="Assignment source">
        <button type="button" aria-pressed={mode === "file"} disabled={locked} onClick={() => selectMode("file")}>
          <FileUp size={16} aria-hidden="true" /> Upload file
        </button>
        <button type="button" aria-pressed={mode === "text"} disabled={locked} onClick={() => selectMode("text")}>
          <ClipboardPaste size={16} aria-hidden="true" /> Paste instructions
        </button>
      </div>

      <fieldset className={styles.fields} disabled={locked} aria-label="Assignment details">
        <label>
          Class
          <select value={classId} onChange={event => setClassId(event.target.value)}>
            {classes.map(course => <option key={course.id} value={course.id}>{course.name}</option>)}
          </select>
        </label>
        <label>
          <span>Assignment name <small>optional</small></span>
          <input value={title} onChange={event => setTitle(event.target.value)} maxLength={160} />
        </label>
        <label>
          <span>Due date and time <small>optional</small></span>
          <input type="datetime-local" value={dueAt} onChange={event => setDueAt(event.target.value)} />
        </label>
      </fieldset>

      {mode === "file" ? (
        <div className={styles.drop} data-dragging={dragging || undefined}
          onDragOver={event => { event.preventDefault(); if (!locked) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={event => {
            event.preventDefault();
            setDragging(false);
            if (!locked && event.dataTransfer.files[0]) selectFile(event.dataTransfer.files[0]);
          }}>
          <input
            ref={fileInput}
            hidden
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.txt,application/pdf,image/jpeg,image/png,image/webp,image/gif,text/plain"
            onChange={event => { if (event.target.files?.[0]) selectFile(event.target.files[0]); }}
          />
          <FileText size={22} aria-hidden="true" />
          <div className={styles.dropCopy} aria-live="polite">
            <strong>{file?.name ?? "Drop a file here"}</strong>
            <span className={styles.muted}>{file ? `${Math.max(1, Math.round(file.size / 1024))} KB` : "Photo, PDF, or text · 20 MB max"}</span>
          </div>
          <button ref={chooseFile} type="button" className={styles.secondary} disabled={locked} onClick={() => fileInput.current?.click()}>
            {file ? "Change file" : "Choose file"}
          </button>
          {file && !locked ? (
            <button className={`${styles.secondary} ${styles.full}`} type="button" onClick={() => { selectFile(null); chooseFile.current?.focus(); }}>
              <X size={16} aria-hidden="true" /> Remove file
            </button>
          ) : null}
        </div>
      ) : (
        <fieldset className={styles.fields} disabled={locked}>
          <label className={styles.full}>
            Assignment instructions
            <textarea value={instructions} onChange={event => setInstructions(event.target.value)} rows={5} maxLength={50000} />
          </label>
        </fieldset>
      )}

      {error ? <p className={styles.problem} role="status">{error}</p> : null}
      <div className={styles.actions}>
        {savedId ? <Link className={styles.secondary} href={`/assignments/${savedId}/workspace`}>Open saved assignment</Link> : null}
        <button type="submit" className={styles.primary} disabled={pending}>
          {pending ? "Saving…" : savedId ? "Retry attachment" : uncertain ? "Retry save" : "Add to Work"}
          <ArrowRight size={17} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
