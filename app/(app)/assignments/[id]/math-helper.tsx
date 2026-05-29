"use client";
import { useState } from "react";
import { Calculator } from "lucide-react";
import { requestMathStep } from "./ai-tools-actions";

interface MathHelperProps {
  assignmentId: string;
  classAiMode: "red" | "yellow" | "green";
}

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export function MathHelper({ assignmentId, classAiMode }: MathHelperProps) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Math step organizer is hidden on red (AI fully off) and yellow (citations only)
  if (classAiMode === "red" || classAiMode === "yellow") return null;

  async function send() {
    if (!prompt.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    const userTurn: ChatTurn = { role: "user", content: prompt };
    const nextHistory = [...history, userTurn];
    const res = await requestMathStep({
      assignmentId,
      aiMode: classAiMode,
      prompt,
      history,
    });
    if ("error" in res) {
      setErrorMsg(res.error);
    } else {
      setHistory([...nextHistory, { role: "assistant", content: res.content }]);
      setPrompt("");
    }
    setLoading(false);
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
        >
          <Calculator size={13} />
          Help me with this math
        </button>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Math step organizer
            </p>
            <p className="text-xs text-muted">Diana hints, never solves.</p>
          </div>

          {history.length > 0 && (
            <div className="max-h-[400px] space-y-2 overflow-y-auto">
              {history.map((t, i) => (
                <div
                  key={i}
                  className={
                    t.role === "user"
                      ? "rounded-lg bg-border/20 px-3 py-2 text-sm"
                      : "rounded-lg border border-border bg-card/60 px-3 py-2 text-sm whitespace-pre-wrap"
                  }
                >
                  {t.content}
                </div>
              ))}
            </div>
          )}

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Paste the problem or describe what's stuck."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            rows={3}
          />

          {errorMsg && (
            <p className="rounded border border-amber-500/40 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
              {errorMsg}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={send}
              disabled={loading || !prompt.trim()}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "Thinking…" : "Get a hint"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
