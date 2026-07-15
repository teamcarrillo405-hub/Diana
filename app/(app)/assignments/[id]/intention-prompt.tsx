"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { saveIntention } from "./actions";

export function IntentionPrompt({ assignmentId }: { assignmentId: string }) {
  const router   = useRouter();
  const pathname = usePathname() ?? `/assignments/${assignmentId}`;
  const [pending, startTransition] = useTransition();
  const [cue, setCue]     = useState("");
  const [status, setStatus] = useState<"idle" | "saved">("idle");

  // Pitfall 6 guard: remove ?intent=new from URL immediately on mount
  useEffect(() => {
    router.replace(pathname);
  }, [router, pathname]);

  function skip() {
    // URL already cleaned by useEffect — nothing else needed
  }

  function save() {
    if (!cue.trim()) return;
    startTransition(async () => {
      const result = await saveIntention({ assignmentId, cueValue: cue.trim() });
      if (result.ok) setStatus("saved");
    });
  }

  if (status === "saved") {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted">Got it. You&apos;ve got a plan.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <p className="font-medium">When and where will you start?</p>
      <p className="text-sm text-muted">
        For example: &ldquo;After dinner, at my desk&rdquo; or &ldquo;Study hall tomorrow.&rdquo;
      </p>
      <textarea
        value={cue}
        onChange={(e) => setCue(e.target.value)}
        rows={2}
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
        placeholder="After dinner, at my desk..."
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending || !cue.trim()}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Saving\u2026" : "Save"}
        </button>
        <button
          type="button"
          onClick={skip}
          className="rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:bg-border/30"
        >
          Skip for now
        </button>
      </div>
    </section>
  );
}
