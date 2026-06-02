"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { LifeBuoy } from "lucide-react";
import { recordOverwhelmed } from "./overwhelmed-actions";

export function OverwhelmedButton() {
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

  return (
    <div className="fixed bottom-20 left-4 z-50 md:bottom-6 md:left-auto md:right-6">
      {open && (
        <div className="mb-2 w-72 rounded-xl border border-border bg-card p-4 shadow-lg">
          <p className="text-sm font-medium">Smallest next step</p>
          <p className="mt-1 text-sm text-muted">
            {message ?? "Making the next step smaller..."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {childId && (
              <Link
                href={`/assignments/${childId}`}
                className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white"
              >
                Open it
              </Link>
            )}
            <Link
              href="/timer?mode=rough"
              className="rounded-md border border-border px-3 py-2 text-sm hover:bg-border/30"
            >
              5 min timer
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-border px-3 py-2 text-sm text-muted hover:bg-border/30"
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
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-sm font-medium shadow-lg hover:bg-border/30 disabled:opacity-50"
      >
        <LifeBuoy size={18} />
        I&apos;m overwhelmed
      </button>
    </div>
  );
}
