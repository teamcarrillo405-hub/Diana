"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { LifeBuoy } from "lucide-react";
import { recordOverwhelmed } from "./overwhelmed-actions";
import { usesAppTopNav } from "@/lib/navigation";

export function OverwhelmedButton({ placement = "fixed" }: { placement?: "fixed" | "inline" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [childId, setChildId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function activate() {
    setOpen(true);
    setMessage(null);
    startTransition(async () => {
      const result = await recordOverwhelmed({ path: pathname });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setChildId(result.childId);
      setMessage(result.message);
    });
  }

  // Hidden on pages that own a top nav (rule centralized in usesAppTopNav).
  if (placement === "fixed" && usesAppTopNav(pathname)) {
    return null;
  }

  return (
    <div className={placement === "inline" ? "relative" : "fixed bottom-6 right-6 z-50"}>
      {open && (
        <div role="status" className="nexus-panel mb-2 rounded-xl border border-border bg-card p-4 shadow-lg md:w-72">
          <p className="text-sm font-medium">Smallest next step</p>
          <p className="mt-1 text-sm text-muted">
            {message ?? "Making the next step smaller..."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {childId && (
              <Link
                href={`/assignments/${childId}`}
                className="nexus-button nexus-button-primary touch-target rounded-xl px-3 py-2 text-sm font-medium"
              >
                Open next step
              </Link>
            )}
            {!childId && (
              <Link
                href="/dashboard"
                className="nexus-button nexus-button-primary touch-target rounded-xl px-3 py-2 text-sm font-medium"
              >
                Show one move
              </Link>
            )}
            <Link
              href="/timer?mode=rough"
              className="touch-target rounded-xl border border-border px-3 py-2 text-sm hover:bg-surface-soft"
            >
              Add timer
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="touch-target rounded-xl border border-border px-3 py-2 text-sm text-muted hover:bg-surface-soft"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={activate}
        disabled={pending}
        className="nexus-button nexus-button-secondary inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold disabled:opacity-50 md:min-h-12 md:w-auto md:px-4 md:py-3"
      >
        <LifeBuoy size={18} />
        I&apos;m stuck
      </button>
    </div>
  );
}
