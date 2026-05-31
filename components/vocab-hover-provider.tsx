'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

type Popover = {
  word: string;
  definition: string;
  x: number;
  y: number;
} | null;

// Matches: starts with a letter, followed by 0-19 letters/apostrophes/hyphens.
// Rejects: numbers, spaces, strings >20 chars.
const WORD_RE = /^[a-zA-Z][a-zA-Z'-]{0,19}$/;

export function VocabHoverProvider({ children }: { children: React.ReactNode }) {
  const [popover, setPopover] = useState<Popover>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleDoubleClick = useCallback(async (e: React.MouseEvent) => {
    const selection = window.getSelection?.()?.toString().trim() ?? '';
    if (!selection || !WORD_RE.test(selection)) return;

    const x = e.clientX;
    const y = e.clientY;

    // Grab small context window from the clicked element
    const target = e.target as HTMLElement;
    const context = target?.textContent?.slice(0, 200) ?? '';

    try {
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
      const url = baseUrl
        ? `${baseUrl}/functions/v1/vocab-hover`
        : '/functions/v1/vocab-hover';

      // Get auth token if available — omit on failure (best-effort)
      let authHeader = '';
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          authHeader = `Bearer ${session.access_token}`;
        }
      } catch {
        // no auth — proceed without token (edge function will handle 401)
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authHeader) headers['Authorization'] = authHeader;

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ word: selection, context }),
      });

      if (!res.ok) return; // silent failure — calm invariant
      const data = await res.json();
      if (!data.definition) return;
      setPopover({ word: selection, definition: data.definition, x, y });
    } catch {
      // silent failure
    }
  }, []);

  useEffect(() => {
    if (!popover) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopover(null);
    };
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopover(null);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [popover]);

  return (
    <div onDoubleClick={handleDoubleClick}>
      {children}
      {popover && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={`Definition of ${popover.word}`}
          className="fixed z-50 max-w-xs rounded-md border border-border bg-card p-3 text-sm shadow-lg"
          style={{
            left: Math.min(popover.x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 320),
            top: Math.min(popover.y + 12, (typeof window !== 'undefined' ? window.innerHeight : 800) - 100),
          }}
        >
          <div className="font-medium text-foreground">{popover.word}</div>
          <div className="mt-1 text-muted-foreground">{popover.definition}</div>
        </div>
      )}
    </div>
  );
}
