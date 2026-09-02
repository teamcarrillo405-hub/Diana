"use client";

import { FileUp, ExternalLink } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { removeCourseMaterial, uploadCourseMaterial } from "./actions";

type MaterialKind = "rubric" | "syllabus";

export function CourseMaterialUpload({
  classId,
  kind,
  document,
}: {
  classId: string;
  kind: MaterialKind;
  document?: { id: string; name: string; href: string | null } | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const label = kind === "rubric" ? "rubric" : "syllabus";

  function upload(file: File) {
    setMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("classId", classId);
      formData.set("kind", kind);
      formData.set("file", file);
      const result = await uploadCourseMaterial(formData);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage(result.readByDiana ? `${result.fileName} is attached and ready for Diana.` : `${result.fileName} is attached.`);
      router.refresh();
    });
  }

  function remove() {
    if (!document) return;
    setMessage(null);
    startTransition(async () => {
      const result = await removeCourseMaterial({ classId, materialId: document.id, kind });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="class-material-upload">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.txt"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.currentTarget.value = "";
          if (file) upload(file);
        }}
      />
      <button
        type="button"
        className="class-material-upload-button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
      >
        <FileUp size={15} aria-hidden="true" />
        {pending ? "Uploading..." : `Upload ${label}`}
      </button>
      {document ? (
        <>
          {document.href ? <a href={document.href} target="_blank" rel="noreferrer" className="class-material-upload-link">
            <ExternalLink size={14} aria-hidden="true" /> Open attached file
          </a> : null}
          <button type="button" className="class-material-upload-remove" onClick={remove} disabled={pending}>Remove file</button>
        </>
      ) : null}
      <p className="class-material-upload-hint">PDF up to 8 MB, photo up to 10 MB, or text file up to 20 MB.</p>
      {message ? <p className="class-material-upload-message" role="status">{message}</p> : null}
    </div>
  );
}
