"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { disconnectCanva } from "@/components/canva-actions";

export function CanvaDisconnectButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await disconnectCanva();
          router.refresh();
        })
      }
      className="touch-target rounded-xl border border-border px-3 py-2 text-sm text-muted hover:bg-surface-soft disabled:opacity-50"
    >
      {pending ? "Disconnecting…" : "Disconnect"}
    </button>
  );
}
