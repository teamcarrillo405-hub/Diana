"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { VoiceTextarea } from "@/components/voice-textarea";
import { useAutoSaveNote } from "@/lib/notes/auto-save";
import type { ClassCandidate } from "@/lib/notes/class-router";
import { queueOfflineNoteSave, registerOfflineSync } from "@/lib/offline/store";
import { createNote, saveNote, triggerNoteStructuring } from "../actions";
import { AudioUploadTab } from "./audio-upload-tab";
import { DocUploadTab } from "./doc-upload-tab";

type NoteSource = "manual" | "voice" | "audio_upload" | "doc_upload" | "lecture";

export function NoteEditor({
  assignmentId,
  ttsProvider = "browser",
  classCandidates = [],
}: {
  assignmentId: string | null;
  ttsProvider?: "browser" | "openai";
  classCandidates?: ClassCandidate[];
}) {
  const router = useRouter();
  const [noteId, setNoteId] = useState<string | null>(null);
  const noteIdRef = useRef<string | null>(null);
  const [title, setTitle] = useState("Untitled note");
  const [body, setBody] = useState("");
  const [tab, setTab] = useState<"text" | "voice" | "lecture" | "audio" | "photo-pdf">("text");
  // classId is captured here; 10-03 wires it into saveNote + createNote payloads.
  const [classId, setClassId] = useState<string | null>(null);

  function sourceForCurrentTab(): NoteSource {
    if (tab === "voice") return "voice";
    if (tab === "lecture") return "lecture";
    return "manual";
  }

  async function queueLocalDraft(targetNoteId: string | null, source: NoteSource) {
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
  }

  // The saver closure uses the latest title/body/classId and creates the row on first call.
  const saver = useCallback(async () => {
    const source = sourceForCurrentTab();
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
  }, [noteId, title, body, assignmentId, classId, tab]);

  const { status, save, flushNow } = useAutoSaveNote(saver);

  /** Called by upload tabs before upload. Creates the note row if it doesn't exist yet. */
  const ensureNoteId = useCallback(async (source: NoteSource = sourceForCurrentTab()): Promise<string | null> => {
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
  }, [noteId, title, assignmentId, classId, tab]);

  // Schedule a save whenever title or body changes (after first character).
  useEffect(() => {
    if (title === "Untitled note" && body === "") return;
    save();
  }, [title, body, save]);

  async function handleDone() {
    await flushNow();
    const id = noteId ?? noteIdRef.current;
    if (id) {
      if (tab === "lecture" && body.trim().length >= 5) {
        await triggerNoteStructuring({ noteId: id });
      }
      router.push(`/notes/${id}`);
      return;
    }
    router.push("/notes");
  }

  return (
    <div className="space-y-4">
      {/* Class dropdown — visible on all tabs; pre-selected by AudioUploadTab via scoreClassMatch */}
      {classCandidates.length > 0 && (
        <label className="block">
          <span className="block text-sm font-medium text-foreground mb-1">Class</span>
          <select
            value={classId ?? ""}
            onChange={(e) => setClassId(e.target.value || null)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="">No class</option>
            {classCandidates.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      )}

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-accent/50"
        placeholder="Note title"
      />

      {/* Tab switcher — Text / Voice (browser Web Speech API) / Audio / Photo/PDF */}
      <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
        {(["text", "voice", "lecture", "audio", "photo-pdf"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t ? "bg-accent text-white" : "text-muted hover:bg-border/30"
            }`}
          >
            {t === "text"      ? "Text"
              : t === "voice"  ? "Voice"
              : t === "lecture" ? "Lecture"
              : t === "audio"  ? "Audio"
              : "Photo/PDF"}
          </button>
        ))}
      </div>

      {tab === "text" && (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          placeholder="Type what you're hearing in class."
          autoFocus
        />
      )}
      {tab === "voice" && (
        <VoiceTextarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onTranscript={(chunk) =>
            setBody((prev) => (prev ? prev + " " + chunk : chunk))
          }
          rows={12}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          placeholder="Tap the mic to dictate, or type here."
          provider={ttsProvider}
        />
      )}
      {tab === "lecture" && (
        <div className="space-y-2">
          <VoiceTextarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onTranscript={(chunk) =>
              setBody((prev) => (prev ? prev + " " + chunk : chunk))
            }
            rows={14}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            placeholder="Start the mic, then let lecture notes land here."
            provider={ttsProvider}
          />
          <p className="text-xs text-muted">
            Lecture notes are marked for action-item extraction when you generate an outline.
          </p>
        </div>
      )}
      {tab === "audio" && (
        <AudioUploadTab
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

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {status === "pending" && "Will save in a few seconds\u2026"}
          {status === "saving"  && "Saving\u2026"}
          {status === "saved"   && "Saved."}
          {status === "error"   && "Saving when you're back online \u2014 nothing lost."}
        </p>
        <button
          type="button"
          onClick={handleDone}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          Done
        </button>
      </div>
    </div>
  );
}
