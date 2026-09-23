"use client";

import { FileUp, Plus, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import { addAssignmentSourceFile, addAssignmentSourceText, materializeConnectedAssignmentSources } from "@/app/(app)/assignments/[id]/workspace/source-actions";

type Props = { assignmentId: string };

export function AssignmentSourceImporter({ assignmentId }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("Assignment material");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [canRetryImport, setCanRetryImport] = useState(false);
  const [operation, setOperation] = useState<"adding" | "importing">("adding");
  const [pending, startTransition] = useTransition();

  const importConnectedSources = useCallback((isActive: () => boolean = () => true) => {
    setOperation("importing");
    startTransition(async () => {
      const result = await materializeConnectedAssignmentSources({ assignmentId });
      if (!isActive()) return;
      if (!result.ok) {
        setCanRetryImport(true);
        setMessage(result.error);
        return;
      }
      setCanRetryImport(result.partial > 0);
      if (result.imported > 0 || result.partial > 0) {
        router.refresh();
        const importedMessage = result.imported > 0
          ? `${result.imported} assignment file${result.imported === 1 ? "" : "s"} imported. `
          : "";
        setMessage(result.partial > 0
          ? `${importedMessage}${result.partial} assignment file${result.partial === 1 ? " is" : "s are"} ready to try again.`
          : `${result.imported} assignment file${result.imported === 1 ? "" : "s"} imported.`);
      }
    });
  }, [assignmentId, router]);

  useEffect(() => {
    let active = true;
    importConnectedSources(() => active);
    return () => { active = false; };
  }, [importConnectedSources]);

  function addText() {
    setOperation("adding");
    startTransition(async () => {
      const result = await addAssignmentSourceText({ assignmentId, title, text });
      setMessage(result.ok ? "Assignment material added." : result.error);
      if (result.ok) {
        setText("");
        router.refresh();
      }
    });
  }

  function addFile() {
    if (!file) return setMessage("Choose a file first.");
    const formData = new FormData();
    formData.set("assignmentId", assignmentId);
    formData.set("file", file);
    setOperation("adding");
    startTransition(async () => {
      const result = await addAssignmentSourceFile(formData);
      setMessage(result.ok ? "File added to this assignment." : result.error);
      if (result.ok) {
        setFile(null);
        router.refresh();
      }
    });
  }

  return <details className="sd-assignment-source-importer">
    <summary className="cursor-pointer text-sm font-semibold text-slate-100">Add assignment material</summary>
    <div className="mt-3 grid gap-3">
      <label className="text-sm font-semibold text-slate-200">Title<input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 block w-full border border-white/25 bg-white px-3 py-2 text-slate-950" /></label>
      <label className="text-sm font-semibold text-slate-200">Paste directions, worksheet text, or rubric<textarea value={text} onChange={(event) => setText(event.target.value)} rows={5} className="mt-1 block w-full border border-white/25 bg-white p-3 text-slate-950" /></label>
      <button type="button" onClick={addText} disabled={pending || !text.trim()} className="inline-flex min-h-10 w-fit items-center gap-2 border border-cyan-300 px-3 font-display text-sm font-extrabold uppercase text-cyan-300 disabled:opacity-50"><Plus size={15} /> Add text</button>
      <div className="flex flex-wrap items-end gap-3 border-t border-white/15 pt-3"><label className="text-sm font-semibold text-slate-200">PDF, image, or text file<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.txt" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-1 block max-w-full text-sm" /></label><button type="button" onClick={addFile} disabled={pending || !file} className="inline-flex min-h-10 items-center gap-2 border border-cyan-300 px-3 font-display text-sm font-extrabold uppercase text-cyan-300 disabled:opacity-50"><FileUp size={15} /> Add file</button></div>
      {canRetryImport ? <button type="button" onClick={() => importConnectedSources()} disabled={pending} className="inline-flex min-h-10 w-fit items-center gap-2 border border-cyan-300 px-3 font-display text-sm font-extrabold uppercase text-cyan-300 disabled:opacity-50"><RefreshCw size={15} /> Try file import again</button> : null}
      {message || pending ? <p className="m-0 text-sm text-slate-200" role="status">{pending ? operation === "importing" ? "Importing assignment files..." : "Adding material..." : message}</p> : null}
    </div>
  </details>;
}
