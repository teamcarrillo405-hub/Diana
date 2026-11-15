// lib/notes/auto-save.ts
// Debounced auto-save hook for the note editor. 30-second debounce per F08 spec.
// Tone: status strings never use "wrong"/"failed"/red colors — the consumer renders them.
"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

export interface SaveResult {
  ok: boolean;
  error?: string;
}

export interface UseAutoSaveNoteOptions {
  /** ms between last edit and server call. Defaults to 30000 (30 s, F08 spec). */
  debounceMs?: number;
}

export interface UseAutoSaveNoteApi {
  status: SaveStatus;
  lastSavedAt: Date | null;
  /** Mark dirty; server call will fire after debounceMs. */
  save: () => void;
  /** Bypass debounce — fire server call now (e.g. on unmount / route change). */
  flushNow: () => Promise<SaveResult>;
}

/**
 * Hook that schedules a debounced call to `saver`. The latest call wins —
 * multiple save() calls within debounceMs coalesce into one server call.
 *
 * The hook does NOT track the note body itself; the caller is responsible for
 * closing over the latest body inside `saver`. This keeps the hook generic.
 */
export function useAutoSaveNote(
  saver: () => Promise<SaveResult>,
  opts: UseAutoSaveNoteOptions = {},
): UseAutoSaveNoteApi {
  const debounceMs = opts.debounceMs ?? 30000;
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saverRef = useRef(saver);
  const inFlightRef = useRef<Promise<SaveResult> | null>(null);
  const revisionRef = useRef(0);

  // Always call the latest saver closure.
  useEffect(() => {
    saverRef.current = saver;
  }, [saver]);

  const fire = useCallback((): Promise<SaveResult> => {
    if (inFlightRef.current) return inFlightRef.current;
    const pending = (async (): Promise<SaveResult> => {
      setStatus("saving");
      try {
        let savedRevision: number;
        do {
          savedRevision = revisionRef.current;
          const result = await saverRef.current();
          if (!result.ok) {
            setStatus("error");
            return result;
          }
          setLastSavedAt(new Date());
        } while (savedRevision !== revisionRef.current);
        setStatus("saved");
        return { ok: true };
      } catch {
        setStatus("error");
        return { ok: false, error: "Your note could not be saved. Try again." };
      } finally {
        inFlightRef.current = null;
      }
    })();
    inFlightRef.current = pending;
    return pending;
  }, []);

  const save = useCallback(() => {
    revisionRef.current += 1;
    setStatus("pending");
    if (timerRef.current) clearTimeout(timerRef.current);
    if (inFlightRef.current) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void fire();
    }, debounceMs);
  }, [debounceMs, fire]);

  const flushNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    return fire();
  }, [fire]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { status, lastSavedAt, save, flushNow };
}
