"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAutoSaveNote } from "@/lib/notes/auto-save";
import type { ClassCandidate } from "@/lib/notes/class-router";
import { queueOfflineNoteSave, registerOfflineSync } from "@/lib/offline/store";
import { createNote, saveNote } from "../actions";
import { AudioUploadTab } from "./audio-upload-tab";
import { DocUploadTab } from "./doc-upload-tab";

type NoteSource = "manual" | "voice" | "audio_upload" | "doc_upload" | "lecture";
type NoteCaptureMode = "text" | "voice" | "audio" | "photo-pdf";

function sourceForTab(tab: NoteCaptureMode): NoteSource {
  if (tab === "voice") return "voice";
  if (tab === "audio") return "audio_upload";
  if (tab === "photo-pdf") return "doc_upload";
  return "manual";
}

export function NoteEditor({
  assignmentId,
  initialClassId = null,
  initialMode = "text",
  classCandidates = [],
}: {
  assignmentId: string | null;
  initialClassId?: string | null;
  initialMode?: NoteCaptureMode;
  classCandidates?: ClassCandidate[];
}) {
  const router = useRouter();
  const [noteId, setNoteId] = useState<string | null>(null);
  const noteIdRef = useRef<string | null>(null);
  const creationRef = useRef<Promise<string | null> | null>(null);
  const offlineDraftId = useRef(`new-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const [finishing, setFinishing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [title, setTitle] = useState("Untitled note");
  const [body, setBody] = useState("");
  const [tab, setTab] = useState<NoteCaptureMode>(initialMode);
  const [classId, setClassId] = useState<string | null>(initialClassId);

  const queueLocalDraft = useCallback(async (targetNoteId: string | null, source: NoteSource) => {
    const tempId = targetNoteId ?? offlineDraftId.current;
    await queueOfflineNoteSave({
      tempId,
      noteId: targetNoteId,
      title,
      bodyText: body,
      classId,
      assignmentId,
      source,
      updatedAt: new Date().toISOString(),
    });
    await registerOfflineSync();
    return { ok: true as const };
  }, [assignmentId, body, classId, title]);

  const ensureNoteId = useCallback(async (source: NoteSource = sourceForTab(tab)): Promise<string | null> => {
    if (noteIdRef.current) return noteIdRef.current;
    if (creationRef.current) return creationRef.current;
    if (!navigator.onLine) return null;
    creationRef.current = (async () => {
      try {
        const res = await createNote({ title, assignmentId, classId, source });
        if (!res.ok) { setSaveError(res.error); return null; }
        noteIdRef.current = res.id;
        setNoteId(res.id);
        return res.id;
      } finally { creationRef.current = null; }
    })();
    return creationRef.current;
  }, [assignmentId, classId, tab, title]);

  const saver = useCallback(async () => {
    const source = sourceForTab(tab);
    try {
      if (!navigator.onLine) return queueLocalDraft(noteIdRef.current, source);
      const id = await ensureNoteId(source);
      if (!id) return { ok: false as const, error: "Your note could not be created. Try again." };
      const result = await saveNote({ id, title, bodyText: body, classId, source });
      if (!result.ok && !navigator.onLine) return queueLocalDraft(id, source);
      return result;
    } catch (error) {
      if (!navigator.onLine) return queueLocalDraft(noteIdRef.current, source);
      return { ok: false as const, error: error instanceof Error ? error.message : "Save paused." };
    }
  }, [body, classId, ensureNoteId, queueLocalDraft, tab, title]);

  const { status, save, flushNow } = useAutoSaveNote(saver);

  // Schedule a save whenever title or body changes (after first character).
  useEffect(() => {
    if (title === "Untitled note" && body === "") return;
    save();
  }, [title, body, classId, save]);

  async function handleDone() {
    setFinishing(true);
    setSaveError(null);
    const result = await flushNow();
    if (!result.ok) {
      setSaveError(result.error ?? "Your note could not be saved. Try again.");
      setFinishing(false);
      return;
    }
    const id = noteId ?? noteIdRef.current;
    if (id) {
      router.push(`/notes/${id}`);
      return;
    }
    router.push("/notes");
  }

  return (
    <div className="notes-editor-shell">
      {/* Class follows the note everywhere. Course entry points preselect it. */}
      {classCandidates.length > 0 && (
        <label className="notes-editor-field">
          <span>Class <small>optional</small></span>
          <select
            value={classId ?? "__choose_class__"}
            disabled={finishing}
            onChange={(e) => {
              if (e.target.value !== "__choose_class__") setClassId(e.target.value || null);
            }}
            className="notes-editor-input"
          >
            <option value="__choose_class__" disabled>Choose a class</option>
            {classCandidates.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            <option value="">General note</option>
          </select>
        </label>
      )}

      <label className="notes-editor-field notes-editor-title-field">
        <span>Capture title</span>
        <input
          type="text"
          value={title}
          disabled={finishing}
          onChange={(e) => setTitle(e.target.value)}
          className="notes-editor-input notes-editor-title"
          placeholder="Note title"
        />
      </label>

      {/* One capture surface: words, voice, and attached source material. */}
      <div className="notes-tab-control" role="tablist" aria-label="Capture format">
        {(["text", "voice", "photo-pdf", "audio"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            tabIndex={tab === t ? 0 : -1}
            disabled={finishing}
            onKeyDown={(event) => {
              const tabs = ["text", "voice", "photo-pdf", "audio"] as const;
              const index = tabs.indexOf(t);
              const next = event.key === "Home" ? 0 : event.key === "End" ? 3 : event.key === "ArrowRight" ? (index + 1) % 4 : event.key === "ArrowLeft" ? (index + 3) % 4 : null;
              if (next === null) return;
              event.preventDefault();
              setTab(tabs[next]);
              (event.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus();
            }}
            onClick={() => setTab(t)}
            className={tab === t ? "is-active" : undefined}
          >
            {t === "text" ? "Write"
              : t === "voice" ? "Record"
              : t === "photo-pdf" ? "Photo or PDF"
              : "Audio file"}
          </button>
        ))}
      </div>

      {tab === "text" && (
        <textarea
          value={body}
          disabled={finishing}
          aria-label="Note"
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          className="notes-editor-textarea"
          placeholder="Write the thought, class note, or detail you want to keep."
          autoFocus
        />
      )}
      {tab === "voice" && (
        <AudioUploadTab
          mode="record"
          ensureNoteId={() => ensureNoteId("voice")}
          onTranscriptReady={(text) => { setBody(text); setTab("text"); }}
          onClassSuggested={(id) => { if (id) setClassId(id); }}
          classCandidates={classCandidates}
        />
      )}
      {tab === "audio" && (
        <AudioUploadTab
          mode="file"
          ensureNoteId={() => ensureNoteId("audio_upload")}
          onTranscriptReady={(text) => { setBody(text); setTab("text"); }}
          onClassSuggested={(id) => { if (id) setClassId(id); }}
          classCandidates={classCandidates}
        />
      )}
      {tab === "photo-pdf" && (
        <DocUploadTab
          ensureNoteId={() => ensureNoteId("doc_upload")}
          onTranscriptReady={(text) => { setBody(text); setTab("text"); }}
          onClassSuggested={(id) => { if (id) setClassId(id); }}
          classCandidates={classCandidates}
        />
      )}

      <div className="notes-editor-footer">
        <p role="status">
          {saveError}
          {!saveError && status === "pending" && "Will save in a few seconds\u2026"}
          {status === "saving"  && "Saving\u2026"}
          {!saveError && status === "saved" && (navigator.onLine ? "Saved." : "Saved on this device. Syncs when online.")}
          {!saveError && status === "error" && "Your note could not be saved. Try Done again."}
        </p>
        <button
          type="button"
          onClick={handleDone}
          disabled={finishing}
          className="notes-editor-done"
        >
          {finishing ? "Saving…" : "Done"}
        </button>
      </div>
    </div>
  );
}
