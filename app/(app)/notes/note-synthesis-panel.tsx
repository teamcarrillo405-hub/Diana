"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { synthesizeNotes, type NoteSynthesisResult } from "./actions";

type ChatTurn = {
  role: "student" | "diana";
  text: string;
  citations?: NoteSynthesisResult["citations"];
};

export function NoteSynthesisPanel({
  classId = null,
  scopeLabel = "all notes",
  generalOnly = false,
}: {
  classId?: string | null;
  scopeLabel?: string;
  generalOnly?: boolean;
}) {
  const subjectScoped = Boolean(classId || generalOnly);
  const [query, setQuery] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function runSynthesis() {
    setError(null);
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setError("Enter a note question.");
      return;
    }
    const context = turns.slice(-6).map((turn) => `${turn.role === "student" ? "Student" : "Diana"}: ${turn.text}`).join("\n\n");
    setTurns((current) => [...current, { role: "student", text: trimmed }]);
    setQuery("");
    startTransition(async () => {
      const res = await synthesizeNotes({
        query: context ? `Conversation so far:\n${context}\n\nStudent: ${trimmed}` : trimmed,
        classId,
        generalOnly,
      });
      if (res.ok) {
        setTurns((current) => [...current, {
          role: "diana",
          text: res.result.summary,
          citations: res.result.citations,
        }]);
      } else {
        setTurns((current) => current.slice(0, -1));
        setError(res.error);
      }
    });
  }

  return (
    <section className="sd-notes-chat" aria-labelledby="notes-chat-title">
      <div className="sd-notes-chat-head">
        <h2 id="notes-chat-title"><Sparkles size={18} aria-hidden="true" /> Ask Diana</h2>
        <p>Diana uses {scopeLabel.toLowerCase()} as context for this conversation.</p>
      </div>
      <div className="sd-notes-chat-history" aria-live="polite">
        {turns.map((turn, index) => (
          <div className={`sd-notes-chat-turn sd-notes-chat-turn--${turn.role}`} key={`${turn.role}-${index}`}>
            {turn.text}
            {turn.citations && turn.citations.length > 0 ? (
              <ul className="mt-3 grid gap-1 text-sm">
                {turn.citations.map((citation) => (
                  <li key={`${citation.label}-${citation.noteId}`}>
                    <Link href={`/notes/${citation.noteId}`} className="underline underline-offset-2">
                      {citation.label ? `[${citation.label}] ` : ""}{citation.title}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
        {turns.length === 0 ? <p>Ask a question about {subjectScoped ? "this subject's notes" : "your notes"}.</p> : null}
      </div>
      <div className="sd-notes-chat-composer">
        <label>
          <span className="sr-only">Message Diana</span>
          <textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                runSynthesis();
              }
            }}
            placeholder="Message Diana about these notes"
          />
        </label>
        <div className="sd-notes-chat-actions">
          <button type="button" onClick={runSynthesis} disabled={pending} aria-label="Send message to Diana">
            {pending ? "Thinking" : <ArrowUp size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {error ? <p role="status">{error}</p> : null}
    </section>
  );
}
