"use client";

import { FileText, ImagePlus, Keyboard, Upload, X } from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createAssignmentFromInstructions,
  createAssignmentFromUpload,
} from "./actions";

type ClassOption = { id: string; name: string; color: string };
type IntakeMode = "file" | "text";

export function AssignmentUploadForm({ classes }: { classes: readonly ClassOption[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<IntakeMode>("file");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileLabel = useMemo(() => {
    if (!file) return null;
    const size = file.size < 1024 * 1024
      ? `${Math.max(1, Math.round(file.size / 1024))} KB`
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    return `${file.name} · ${size}`;
  }, [file]);

  function selectFile(nextFile: File | null) {
    setError(null);
    setFile(nextFile);
    if (nextFile && !title.trim()) {
      setTitle(nextFile.name.replace(/\.[^.]+$/u, "").replace(/[_-]+/gu, " "));
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setMessage(null);

    if (!classId) {
      setError("Choose the class this belongs to.");
      return;
    }
    if (mode === "file" && !file) {
      setError("Choose a photo, PDF, or text file first.");
      return;
    }
    if (mode === "text" && !instructions.trim()) {
      setError("Paste the assignment instructions first.");
      return;
    }

    startTransition(async () => {
      const result = mode === "file"
        ? await (() => {
          const formData = new FormData();
          formData.set("classId", classId);
          formData.set("title", title.trim());
          formData.set("file", file as File);
          return createAssignmentFromUpload(formData);
        })()
        : await createAssignmentFromInstructions({
          classId,
          title: title.trim() || "New assignment",
          instructions: instructions.trim(),
        });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(result.warning ?? "Assignment ready. Opening your workspace.");
      router.push(`/assignments/${result.assignmentId}/workspace`);
      router.refresh();
    });
  }

  return (
    <form className="sd-assignment-upload-form" onSubmit={submit}>
      <div className="sd-assignment-upload-tabs" role="tablist" aria-label="How to add an assignment">
        <button type="button" role="tab" aria-selected={mode === "file"} onClick={() => { setMode("file"); setError(null); }}>
          <Upload aria-hidden="true" /> Upload file
        </button>
        <button type="button" role="tab" aria-selected={mode === "text"} onClick={() => { setMode("text"); setError(null); }}>
          <Keyboard aria-hidden="true" /> Paste instructions
        </button>
      </div>

      <div className="sd-assignment-upload-fields">
        <label>
          <span>Class</span>
          <select value={classId} onChange={(event) => setClassId(event.target.value)}>
            {classes.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
          </select>
        </label>
        <label>
          <span>Assignment name <small>optional</small></span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Diana can name it from the file" maxLength={160} />
        </label>
      </div>

      {mode === "file" ? (
        <section className="sd-assignment-dropzone" aria-labelledby="assignment-upload-title">
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.txt,application/pdf,image/jpeg,image/png,image/webp,image/gif,text/plain"
            capture="environment"
            onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
          />
          <ImagePlus aria-hidden="true" />
          <h2 id="assignment-upload-title">{file ? "Assignment file ready" : "Drop your assignment here"}</h2>
          <p>{fileLabel ?? "Photo, PDF, or text file. Up to 20 MB."}</p>
          <button type="button" onClick={() => fileInput.current?.click()}>
            {file ? "Choose another file" : "Choose a file"}
          </button>
          {file ? <button className="sd-assignment-upload-remove" type="button" onClick={() => selectFile(null)}><X aria-hidden="true" /> Remove file</button> : null}
        </section>
      ) : (
        <label className="sd-assignment-instructions">
          <span>Assignment instructions</span>
          <textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Paste the directions, rubric, or questions here." rows={9} maxLength={50000} />
          <small>Diana uses this to build the first work unit. You can add the original file later.</small>
        </label>
      )}

      {error ? <p className="sd-assignment-upload-message" data-state="error" role="status">{error}</p> : null}
      {message ? <p className="sd-assignment-upload-message" role="status">{message}</p> : null}

      <div className="sd-assignment-upload-actions">
        <p><FileText aria-hidden="true" /> Your original assignment stays attached to this workspace.</p>
        <button type="submit" disabled={pending}>{pending ? "Adding your assignment..." : "Add to Work"}</button>
      </div>
    </form>
  );
}
