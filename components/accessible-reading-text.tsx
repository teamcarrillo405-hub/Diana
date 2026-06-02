"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  bionicWordParts,
  clampReadingIndex,
  splitIntoReadingLines,
} from "@/lib/accessibility/reading-tools";

export type VisualPacing = "off" | "word" | "line";
export type ReadingSpacing = "normal" | "wide" | "wider";

export type ReadingPrefs = {
  bionic_reading: boolean;
  visual_pacing: VisualPacing;
  line_focus: boolean;
};

export function AccessibleReadingText({
  text,
  prefs,
  className = "",
}: {
  text: string;
  prefs: ReadingPrefs;
  className?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const lines = useMemo(() => splitIntoReadingLines(text), [text]);
  const words = useMemo(() => text.match(/\S+/g) ?? [], [text]);
  const mode = prefs.visual_pacing;
  const useLineView = mode === "line" || prefs.line_focus;
  const count = mode === "word" ? words.length : useLineView ? lines.length : 0;
  const active = clampReadingIndex(activeIndex, count);
  const showControls = count > 1;

  function move(delta: number) {
    if (count <= 1) return;
    setActiveIndex((current) => clampReadingIndex(current + delta, count));
  }

  return (
    <div
      className={className}
      role="region"
      aria-label="Reading text"
      data-reading-surface="true"
      tabIndex={showControls ? 0 : undefined}
      onKeyDown={(event) => {
        if (!showControls) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          move(-1);
        }
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          move(1);
        }
      }}
    >
      {showControls && (
        <div className="mb-3 flex items-center justify-between gap-2 text-xs text-muted">
          <span aria-live="polite">
            {mode === "word" ? `Word ${active + 1} of ${count}` : `Line ${active + 1} of ${count}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => move(-1)}
              disabled={active <= 0}
              aria-label={mode === "word" ? "Previous word" : "Previous line"}
              title={mode === "word" ? "Previous word" : "Previous line"}
              className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-card text-muted hover:bg-border/30 disabled:opacity-40"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              disabled={active >= count - 1}
              aria-label={mode === "word" ? "Next word" : "Next line"}
              title={mode === "word" ? "Next word" : "Next line"}
              className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-card text-muted hover:bg-border/30 disabled:opacity-40"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {mode === "word" ? (
        <p className="text-sm leading-relaxed">
          <WordPacedText text={text} activeIndex={active} bionic={prefs.bionic_reading} />
        </p>
      ) : useLineView ? (
        <div className="space-y-2 text-sm leading-relaxed">
          {lines.map((line, index) => (
            <p
              key={line.id}
              aria-current={index === active ? "true" : undefined}
              className={
                index === active
                  ? "rounded-md bg-accent/10 px-2 py-1 text-foreground"
                  : prefs.line_focus
                  ? "px-2 py-1 text-muted opacity-45"
                  : "px-2 py-1"
              }
            >
              <BionicText text={line.text} enabled={prefs.bionic_reading} />
            </p>
          ))}
        </div>
      ) : (
        <div className="space-y-3 text-sm leading-relaxed">
          {text.split(/\n{2,}/).filter(Boolean).map((paragraph, index) => (
            <p key={index}>
              <BionicText text={paragraph} enabled={prefs.bionic_reading} />
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function WordPacedText({
  text,
  activeIndex,
  bionic,
}: {
  text: string;
  activeIndex: number;
  bionic: boolean;
}) {
  let wordIndex = -1;
  return (
    <>
      {text.split(/(\s+)/).map((token, index) => {
        if (/^\s+$/.test(token)) return token;
        wordIndex += 1;
        return (
          <span
            key={`${token}-${index}`}
            aria-current={wordIndex === activeIndex ? "true" : undefined}
            className={wordIndex === activeIndex ? "rounded-sm bg-accent/15 text-accent" : undefined}
          >
            <BionicText text={token} enabled={bionic} />
          </span>
        );
      })}
    </>
  );
}

function BionicText({ text, enabled }: { text: string; enabled: boolean }) {
  return (
    <>
      {text.split(/(\s+)/).map((token, index) => {
        if (/^\s+$/.test(token)) return token;
        const lookup = vocabularyValue(token);
        const content = !enabled ? (
          token
        ) : (
          <>
            <strong className="font-semibold">{bionicWordParts(token).prefix}</strong>
            {bionicWordParts(token).rest}
          </>
        );
        if (!lookup) return <span key={`${token}-${index}`}>{content}</span>;
        return (
          <span key={`${token}-${index}`} data-vocab-word={lookup}>
            {content}
          </span>
        );
      })}
    </>
  );
}

function vocabularyValue(token: string): string | null {
  const value = token.replace(/^[^a-zA-Z]+|[^a-zA-Z'-]+$/g, "");
  return /^[a-zA-Z][a-zA-Z'-]{0,31}$/.test(value) ? value : null;
}
