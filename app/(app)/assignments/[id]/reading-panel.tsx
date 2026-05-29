// app/(app)/assignments/[id]/reading-panel.tsx
// F06 + F07: Reading panel with TTS word highlight + comprehension scaffolds.
// Anti-pattern guards:
//   - Never autoplay TTS (student taps "Read aloud")
//   - Scaffold buttons opt-in (hidden until "Help me with this reading" tapped)
//   - Pitfall 5: scaffold buttons hidden when classAiMode='red'
//   - No numeric scores anywhere in the UI
"use client";
import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { TtsHighlightButton } from "@/components/tts-highlight-button";
import { fetchScaffold } from "./reading-panel-actions";

interface ReadingPanelProps {
  text: string;
  classAiMode: "red" | "yellow" | "green";
}

export function ReadingPanel({ text, classAiMode }: ReadingPanelProps) {
  const [scaffoldOpen, setScaffoldOpen] = useState(false);
  const [scaffoldType, setScaffoldType] = useState<"pre" | "mid" | "post" | null>(null);
  const [scaffoldResult, setScaffoldResult] = useState<string | null>(null);
  const [loadingScaffold, setLoadingScaffold] = useState(false);
  const [scaffoldError, setScaffoldError] = useState<string | null>(null);

  async function requestScaffold(type: "pre" | "mid" | "post") {
    setLoadingScaffold(true);
    setScaffoldError(null);
    setScaffoldType(type);
    const res = await fetchScaffold({ type, text, aiMode: classAiMode });
    if ("error" in res) {
      setScaffoldError(res.error);
    } else {
      setScaffoldResult(res.content);
    }
    setLoadingScaffold(false);
  }

  // Split text into paragraphs for structured reading view
  const paragraphs = text.split(/\n\n+/).filter(Boolean);

  return (
    <section className="reading-view space-y-4 rounded-2xl border border-border p-5">
      {/* TTS controls — student taps to start, never autoplays */}
      <TtsHighlightButton text={text} />

      {/* Reading text with dyslexia typography (reading-view class provides the CSS) */}
      <div className="reading-content space-y-3">
        {paragraphs.length > 1
          ? paragraphs.map((p, i) => (
              <p key={i} className="text-sm">
                {p}
              </p>
            ))
          : <p className="text-sm">{text}</p>
        }
      </div>

      {/* Comprehension scaffolds — opt-in, hidden on red traffic-light */}
      {classAiMode !== "red" && (
        <div className="border-t border-border pt-3">
          {!scaffoldOpen ? (
            <button
              type="button"
              onClick={() => setScaffoldOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors"
            >
              <HelpCircle size={13} />
              Help me with this reading
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted uppercase tracking-wider">
                Reading support
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => requestScaffold("pre")}
                  disabled={loadingScaffold}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs hover:bg-border/30 disabled:opacity-50 transition-colors"
                >
                  Key vocabulary
                </button>
                <button
                  type="button"
                  onClick={() => requestScaffold("mid")}
                  disabled={loadingScaffold}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs hover:bg-border/30 disabled:opacity-50 transition-colors"
                >
                  What just happened?
                </button>
                <button
                  type="button"
                  onClick={() => requestScaffold("post")}
                  disabled={loadingScaffold}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs hover:bg-border/30 disabled:opacity-50 transition-colors"
                >
                  Check understanding
                </button>
              </div>

              {loadingScaffold && (
                <p className="text-xs text-muted">Thinking…</p>
              )}

              {scaffoldError && (
                <p className="text-xs text-muted">
                  Support not available right now. Try again in a moment.
                </p>
              )}

              {scaffoldResult && !loadingScaffold && (
                <div className="rounded-xl border border-border bg-card/60 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {scaffoldResult}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
