"use client";
import { useState } from "react";
import { BookOpen, Copy, Check } from "lucide-react";
import { requestCitation } from "./ai-tools-actions";
import { AiTooltip } from "@/components/ai-tooltip";

interface CitationToolProps {
  assignmentId: string;
  classAiMode: "red" | "yellow" | "green";
}

export function CitationTool({ assignmentId, classAiMode }: CitationToolProps) {
  const [open, setOpen] = useState(false);
  const [sourceType, setSourceType] = useState<"url" | "book" | "paste">("url");
  const [sourceText, setSourceText] = useState("");
  const [result, setResult] = useState<{
    mla?: string;
    apa?: string;
    chicago?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Citations work in 'yellow' but not 'red' (F16 traffic-light: yellow = citation-help only)
  if (classAiMode === "red") return null;

  async function send() {
    if (!sourceText.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    setResult(null);
    const res = await requestCitation({
      assignmentId,
      aiMode: classAiMode,
      sourceType,
      sourceText,
      formats: ["mla", "apa", "chicago"],
    });
    if ("error" in res) {
      setErrorMsg(res.error);
    } else {
      // Edge Function returns content as JSON string per its system prompt
      try {
        const parsed = JSON.parse(res.content) as Record<string, string>;
        setResult(parsed);
      } catch {
        // Fallback: display raw text under mla key
        setResult({ mla: res.content });
      }
    }
    setLoading(false);
  }

  function copy(key: string, value: string) {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1200);
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
        >
          <BookOpen size={13} />
          Format a citation
        </button>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                Citation generator
              </p>
              {result && <AiTooltip feature="citation_gen" />}
            </div>
          </div>

          <div className="flex gap-2 text-xs">
            {(["url", "book", "paste"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSourceType(t)}
                className={`rounded-md border px-3 py-1.5 ${
                  sourceType === t
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-card text-muted"
                }`}
              >
                {t === "url" ? "URL" : t === "book" ? "Book" : "Paste"}
              </button>
            ))}
          </div>

          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder={
              sourceType === "url"
                ? "Paste the URL"
                : sourceType === "book"
                  ? "Title, author, publisher, year"
                  : "Paste source text or metadata"
            }
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
              disabled={loading || !sourceText.trim()}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "Formatting…" : "Generate"}
            </button>
          </div>

          {result && (
            <div className="space-y-2">
              {(["mla", "apa", "chicago"] as const).map(
                (k) =>
                  result[k] && (
                    <div
                      key={k}
                      className="rounded-lg border border-border bg-card/60 p-3"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted">
                          {k.toUpperCase()}
                        </span>
                        <button
                          type="button"
                          onClick={() => copy(k, result[k]!)}
                          className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
                        >
                          {copiedKey === k ? (
                            <Check size={12} />
                          ) : (
                            <Copy size={12} />
                          )}
                          {copiedKey === k ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{result[k]}</p>
                    </div>
                  ),
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
