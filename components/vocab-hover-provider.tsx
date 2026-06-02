"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Plus, Volume2 } from "lucide-react";
import {
  buildContextClue,
  fallbackVocabSupport,
  normalizeVocabularyWord,
  parseVocabSupport,
  type PhonicsBreakdown,
} from "@/lib/reading/vocabulary";
import { saveVocabularyCard } from "./reading-support-actions";

type SourceType = "note" | "assignment";

type Popover = {
  word: string;
  definition: string | null;
  contextClue: string;
  phonics: PhonicsBreakdown;
  context: string;
  x: number;
  y: number;
  loading: boolean;
  saved: boolean;
  status: string | null;
  seenBefore: boolean;
} | null;

const WORD_RE = /^[a-zA-Z][a-zA-Z'-]{0,31}$/;

export function VocabHoverProvider({
  children,
  ownerId,
  aiMode = "green",
  sourceType,
  sourceId,
}: {
  children: React.ReactNode;
  ownerId?: string;
  aiMode?: "red" | "yellow" | "green";
  sourceType?: SourceType;
  sourceId?: string;
}) {
  const [popover, setPopover] = useState<Popover>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const lookupDefinition = useCallback(async (word: string, context: string, x: number, y: number) => {
    const clean = normalizeVocabularyWord(word);
    if (!ownerId || aiMode === "red" || aiMode === "yellow") {
      setPopover((current) => current && current.word === clean
        ? { ...current, loading: false, status: aiMode === "green" ? null : "Definition support is off for this class." }
        : current);
      return;
    }

    setSeen(clean);
    setPopover((current) => current && current.word === clean ? { ...current, loading: true, status: null } : current);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      const url = baseUrl ? `${baseUrl}/functions/v1/vocab-hover` : "/functions/v1/vocab-hover";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      } catch {
        // Best effort only; Edge Function still receives ownerId in the body.
      }

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ ownerId, aiMode, word: clean, context }),
      });
      if (!res.ok) {
        setPopover((current) => current && current.word === clean ? { ...current, loading: false } : current);
        return;
      }
      const data = await res.json();
      const support = parseVocabSupport(data, clean, context);
      setPopover((current) => current && current.word === clean
        ? {
            ...current,
            definition: support.definition,
            contextClue: support.contextClue,
            phonics: support.phonics,
            x,
            y,
            loading: false,
            seenBefore: true,
          }
        : current);
    } catch {
      setPopover((current) => current && current.word === clean ? { ...current, loading: false } : current);
    }
  }, [aiMode, ownerId]);

  const openWord = useCallback((word: string, context: string, x: number, y: number, forceDefinition: boolean) => {
    const clean = normalizeVocabularyWord(word);
    if (!clean || !WORD_RE.test(clean)) return;
    const seenBefore = hasSeen(clean);
    const support = fallbackVocabSupport(clean, context);
    setPopover({
      word: clean,
      definition: null,
      contextClue: buildContextClue(clean, context) || support.contextClue,
      phonics: support.phonics,
      context,
      x,
      y,
      loading: false,
      saved: false,
      status: null,
      seenBefore,
    });
    if (forceDefinition || seenBefore) {
      void lookupDefinition(clean, context, x, y);
    }
  }, [lookupDefinition]);

  const handleMouseOver = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    const wordEl = target.closest<HTMLElement>("[data-vocab-word]");
    if (!wordEl) return;
    const word = wordEl.dataset.vocabWord ?? "";
    if (popover?.word === word) return;
    const surface = wordEl.closest<HTMLElement>("[data-reading-surface]");
    const context = (surface?.textContent ?? wordEl.parentElement?.textContent ?? "").slice(0, 700);
    openWord(word, context, event.clientX, event.clientY, false);
  }, [openWord, popover?.word]);

  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    const selection = window.getSelection?.()?.toString().trim() ?? "";
    const word = normalizeVocabularyWord(selection);
    if (!word || !WORD_RE.test(word)) return;
    const target = event.target as HTMLElement;
    const surface = target.closest<HTMLElement>("[data-reading-surface]");
    const context = (surface?.textContent ?? target.textContent ?? "").slice(0, 700);
    openWord(word, context, event.clientX, event.clientY, true);
  }, [openWord]);

  async function saveCard() {
    if (!popover?.definition || !sourceType || !sourceId) return;
    setPopover((current) => current ? { ...current, status: "Saving card..." } : current);
    const result = await saveVocabularyCard({
      sourceType,
      sourceId,
      word: popover.word,
      definition: popover.definition,
      contextText: popover.context,
      phonics: popover.phonics,
    });
    setPopover((current) => current
      ? { ...current, saved: result.ok, status: result.ok ? "Card saved." : result.error }
      : current);
  }

  useEffect(() => {
    if (!popover) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPopover(null);
    };
    const onClick = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setPopover(null);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [popover]);

  return (
    <div onMouseOver={handleMouseOver} onDoubleClick={handleDoubleClick}>
      {children}
      {popover && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={`Vocabulary support for ${popover.word}`}
          className="fixed z-50 max-w-sm rounded-md border border-border bg-card p-3 text-sm shadow-lg"
          style={{
            left: Math.min(popover.x, (typeof window !== "undefined" ? window.innerWidth : 1200) - 360),
            top: Math.min(popover.y + 12, (typeof window !== "undefined" ? window.innerHeight : 800) - 220),
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium text-foreground">{popover.word}</div>
              <div className="mt-1 text-xs text-muted">{popover.contextClue}</div>
            </div>
            {sourceType && sourceId && popover.definition && (
              <button
                type="button"
                onClick={() => void saveCard()}
                disabled={popover.saved}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted hover:bg-border/30 disabled:opacity-50"
                aria-label="Save vocabulary card"
                title="Save vocabulary card"
              >
                <Plus size={15} />
              </button>
            )}
          </div>

          <div className="mt-3 rounded-md bg-border/20 p-2 text-xs text-muted">
            <div className="inline-flex items-center gap-1 font-medium text-foreground">
              <Volume2 size={13} />
              Pronunciation
            </div>
            <p className="mt-1">{popover.phonics.pronunciation}</p>
            <p>{popover.phonics.stress}</p>
          </div>

          {popover.definition ? (
            <div className="mt-3">
              <div className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted">
                <BookOpen size={13} />
                Definition
              </div>
              <p className="mt-1 text-muted">{popover.definition}</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void lookupDefinition(popover.word, popover.context, popover.x, popover.y)}
              disabled={popover.loading}
              className="mt-3 rounded-md border border-border px-3 py-1.5 text-xs text-muted hover:bg-border/30 disabled:opacity-50"
            >
              {popover.loading ? "Opening definition..." : popover.seenBefore ? "Show definition" : "Check definition"}
            </button>
          )}
          {popover.status && <p className="mt-2 text-xs text-muted">{popover.status}</p>}
        </div>
      )}
    </div>
  );
}

function seenKey(word: string) {
  return `diana:vocab-seen:${word.toLowerCase()}`;
}

function hasSeen(word: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(seenKey(word)) === "1";
  } catch {
    return false;
  }
}

function setSeen(word: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(seenKey(word), "1");
  } catch {
    // Local storage may be unavailable; the popover still works.
  }
}
