"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { VoiceTextarea } from "@/components/voice-textarea";
import { useAutoSaveNote } from "@/lib/notes/auto-save";
import { createNote, saveNote } from "../actions";

export function NoteEditor({
  assignmentId,
  ttsProvider = "browser",
}: {
  assignmentId: string | null;
  ttsProvider?: "browser" | "openai";
}) {
  const router = useRouter();
  const [noteId, setNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState("Untitled note");
  const [body, setBody] = useState("");
  const [tab, setTab] = useState<"text" | "voice">("text");

  // The saver closure uses the latest title/body and creates the row on first call.
  const saver = useCallback(async () => {
    if (!noteId) {
      const res = await createNote({ title, assignmentId });
      if (!res.ok) return { ok: false as const, error: res.error };
      setNoteId(res.id);
      const upd = await saveNote({
        id:         res.id,
        title,
        bodyText:   body,
      });
      return upd.ok ? { ok: true as const } : { ok: false as const, error: upd.error };
    }
    const upd = await saveNote({ id: noteId, title, bodyText: body });
    return upd.ok ? { ok: true as const } : { ok: false as const, error: upd.error };
  }, [noteId, title, body, assignmentId]);

  const { status, save, flushNow } = useAutoSaveNote(saver);

  // Schedule a save whenever title or body changes (after first character).
  useEffect(() => {
    if (title === "Untitled note" && body === "") return;
    save();
  }, [title, body, save]);

  async function handleDone() {
    await flushNow();
    if (noteId) router.push(`/notes/${noteId}`);
  }

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-accent/50"
        placeholder="Note title"
      />

      {/* Tab switcher — voice (browser Web Speech API) vs plain text */}
      <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
        {(["text", "voice"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t ? "bg-accent text-white" : "text-muted hover:bg-border/30"
            }`}
          >
            {t === "text" ? "Text" : "Voice"}
          </button>
        ))}
      </div>

      {tab === "text" ? (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          placeholder="Type what you're hearing in class."
          autoFocus
        />
      ) : (
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
