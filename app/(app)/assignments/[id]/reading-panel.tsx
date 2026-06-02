"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { AccessibleReadingText, type ReadingPrefs } from "@/components/accessible-reading-text";
import { TtsHighlightButton } from "@/components/tts-highlight-button";
import { VocabHoverProvider } from "@/components/vocab-hover-provider";
import type { TtsProvider } from "@/lib/supabase/types";
import { fetchScaffold } from "./reading-panel-actions";

interface ReadingPanelProps {
  text: string;
  ownerId: string;
  assignmentId: string;
  classAiMode: "red" | "yellow" | "green";
  readingPrefs: ReadingPrefs;
  ttsProvider: TtsProvider;
  ttsSpeed: number;
  ttsPitch: number;
  ttsVoice: string;
}

export function ReadingPanel({
  text,
  ownerId,
  assignmentId,
  classAiMode,
  readingPrefs,
  ttsProvider,
  ttsSpeed,
  ttsPitch,
  ttsVoice,
}: ReadingPanelProps) {
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

  return (
    <section className="reading-view space-y-4 rounded-2xl border border-border p-5" aria-label="Reading support">
      <TtsHighlightButton
        text={text}
        provider={ttsProvider}
        speed={ttsSpeed}
        pitch={ttsPitch}
        voice={ttsVoice}
      />

      <div className="reading-content space-y-3">
        <VocabHoverProvider ownerId={ownerId} aiMode={classAiMode} sourceType="assignment" sourceId={assignmentId}>
          <AccessibleReadingText text={text} prefs={readingPrefs} />
        </VocabHoverProvider>
      </div>

      {classAiMode !== "red" && (
        <div className="border-t border-border pt-3">
          {!scaffoldOpen ? (
            <button
              type="button"
              onClick={() => setScaffoldOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-foreground"
            >
              <HelpCircle size={13} />
              Help me with this reading
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                Reading support
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => requestScaffold("pre")}
                  disabled={loadingScaffold}
                  aria-pressed={scaffoldType === "pre"}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs transition-colors hover:bg-border/30 disabled:opacity-50"
                >
                  Key vocabulary
                </button>
                <button
                  type="button"
                  onClick={() => requestScaffold("mid")}
                  disabled={loadingScaffold}
                  aria-pressed={scaffoldType === "mid"}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs transition-colors hover:bg-border/30 disabled:opacity-50"
                >
                  What just happened?
                </button>
                <button
                  type="button"
                  onClick={() => requestScaffold("post")}
                  disabled={loadingScaffold}
                  aria-pressed={scaffoldType === "post"}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs transition-colors hover:bg-border/30 disabled:opacity-50"
                >
                  Check understanding
                </button>
              </div>

              {loadingScaffold && (
                <p className="text-xs text-muted">Thinking...</p>
              )}

              {scaffoldError && (
                <p className="text-xs text-muted">
                  Support not available right now. Try again in a moment.
                </p>
              )}

              {scaffoldResult && !loadingScaffold && (
                <div className="whitespace-pre-wrap rounded-xl border border-border bg-card/60 p-4 text-sm leading-relaxed">
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
