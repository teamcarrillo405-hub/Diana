"use client";

import { useState, useTransition } from "react";
import { MessageSquarePlus, X } from "lucide-react";
import { saveQuickCapture } from "./quick-capture-actions";
import { VoiceTextarea } from "@/components/voice-textarea";

export function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    const text = raw.trim();
    if (!text) {
      setStatus("Write a quick note first.");
      return;
    }
    startTransition(async () => {
      const result = await saveQuickCapture({ raw: text });
      if (result.ok) {
        setRaw("");
        setStatus("Captured to inbox.");
        setOpen(false);
      } else {
        setStatus(result.error);
      }
    });
  }

  function addTranscript(chunk: string) {
    setRaw((current) => [current.trim(), chunk.trim()].filter(Boolean).join(" "));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setStatus(null);
        }}
        className="fixed bottom-24 left-4 z-40 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm shadow-lg hover:bg-border/30 md:bottom-6"
      >
        <MessageSquarePlus size={16} />
        Quick capture
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-4 backdrop-blur-sm md:items-center">
          <div className="w-full max-w-md space-y-3 rounded-2xl border border-border bg-card p-4 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium">Quick capture</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-border p-1">
                <X size={16} />
              </button>
            </div>
            <VoiceTextarea
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              onTranscript={addTranscript}
              rows={4}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Type it or use the mic. Diana can turn it into a next move."
              autoFocus
            />
            {status && <p className="text-sm text-muted">{status}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-border px-3 py-2 text-sm">
                Close
              </button>
              <button type="button" onClick={save} disabled={pending} className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                Capture
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
