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
  const [title, setTitle] = useState("Untitled note");
  const [body, setBody] = useState("");
  const [tab, setTab] = useState<NoteCaptureMode>(initialMode);
  const [classId, setClassId] = useState<string | null>(initialClassId);

  const queueLocalDraft = useCallback(async (targetNoteId: string | null, source: NoteSource) => {
    const tempId = targetNoteId ?? `new-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

  // The saver closure uses the latest title/body/classId and creates the row on first call.
  const saver = useCallback(async () => {
    const source = sourceForTab(tab);
    try {
      if (!noteId) {
        const res = await createNote({ title, assignmentId, classId, source });
        if (!res.ok) {
          return !navigator.onLine
            ? queueLocalDraft(null, source)
            : { ok: false as const, error: res.error };
        }
        setNoteId(res.id);
        noteIdRef.current = res.id;
        const upd = await saveNote({
          id:         res.id,
          title,
          bodyText:   body,
          classId,
          source,
        });
        if (!upd.ok && !navigator.onLine) return queueLocalDraft(res.id, source);
        return upd.ok ? { ok: true as const } : { ok: false as const, error: upd.error };
      }
      const upd = await saveNote({ id: noteId, title, bodyText: body, classId });
      if (!upd.ok && !navigator.onLine) return queueLocalDraft(noteId, source);
      return upd.ok ? { ok: true as const } : { ok: false as const, error: upd.error };
    } catch (error) {
      if (!navigator.onLine) return queueLocalDraft(noteId, source);
      return { ok: false as const, error: error instanceof Error ? error.message : "Save paused." };
    }
  }, [assignmentId, body, classId, noteId, queueLocalDraft, tab, title]);

  const { status, save, flushNow } = useAutoSaveNote(saver);

  /** Called by upload tabs before upload. Creates the note row if it doesn't exist yet. */
  const ensureNoteId = useCallback(async (source: NoteSource = sourceForTab(tab)): Promise<string | null> => {
    if (noteId) return noteId;
    if (noteIdRef.current) return noteIdRef.current;
    if (!navigator.onLine) {
      await queueLocalDraft(null, source);
      return null;
    }
    const res = await createNote({ title, assignmentId, classId, source });
    if (!res.ok) return null;
    setNoteId(res.id);
    noteIdRef.current = res.id;
    return res.id;
  }, [assignmentId, classId, noteId, queueLocalDraft, tab, title]);

  // Schedule a save whenever title or body changes (after first character).
  useEffect(() => {
    if (title === "Untitled note" && body === "") return;
    save();
  }, [title, body, save]);

  async function handleDone() {
    await flushNow();
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
          onChange={(e) => setTitle(e.target.value)}
          className="notes-editor-input notes-editor-title"
          placeholder="Note title"
        />
      </label>

      {/* One capture surface: words, voice, and attached source material. */}
      <div className="notes-tab-control">
        {(["text", "voice", "photo-pdf", "audio"] as const).map((t) => (
          <button
            key={t}
            type="button"
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
        <p>
          {status === "pending" && "Will save in a few seconds\u2026"}
          {status === "saving"  && "Saving\u2026"}
          {status === "saved"   && "Saved."}
          {status === "error"   && "Saving when you're back online: nothing lost."}
        </p>
        <button
          type="button"
          onClick={handleDone}
          className="notes-editor-done"
        >
          Done
        </button>
      </div>
    </div>
  );
}
