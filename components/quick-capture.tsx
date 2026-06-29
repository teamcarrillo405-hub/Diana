"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { MessageSquarePlus, X } from "lucide-react";
import { saveQuickCapture } from "./quick-capture-actions";
import { VoiceTextarea } from "@/components/voice-textarea";

export function QuickCapture({ placement = "fixed" }: { placement?: "fixed" | "inline" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  function close() {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (placement === "fixed" && pathname === "/dashboard") {
    return null;
  }

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => {
          setOpen(true);
          setStatus(null);
        }}
        className={
          placement === "inline"
            ? "nexus-button nexus-button-secondary inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold"
            : "nexus-button nexus-button-secondary fixed bottom-6 left-6 z-40 inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
        }
      >
        <MessageSquarePlus size={16} />
        Capture
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-4 backdrop-blur-sm md:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-capture-title"
            className="nexus-panel w-full max-w-md space-y-3 rounded-2xl border border-border bg-card p-4 shadow-lg"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="quick-capture-title" className="text-sm font-medium">Quick capture</h2>
              <button type="button" onClick={close} className="touch-target inline-flex items-center justify-center rounded-xl border border-border">
                <X size={16} />
              </button>
            </div>
            <VoiceTextarea
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              onTranscript={addTranscript}
              rows={4}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              placeholder="Type it or use the mic. Diana can turn it into a next move."
              autoFocus
            />
            {status && <p className="text-sm text-muted">{status}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={close} className="touch-target rounded-xl border border-border px-3 py-2 text-sm">
                Close
              </button>
              <button type="button" onClick={save} disabled={pending} className="nexus-button nexus-button-primary press-scale touch-target rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-50">
                Capture
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
