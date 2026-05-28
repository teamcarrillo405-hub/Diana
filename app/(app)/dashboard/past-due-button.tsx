"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMicroTask } from "@/app/(app)/assignments/[id]/actions";

export function PastDueMicroTaskButton({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function go() {
    startTransition(async () => {
      const result = await createMicroTask({ originalId: assignmentId });
      if ("error" in result && result.error) return;
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={pending}
      className="mt-2 inline-flex items-center justify-center rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-500/20 disabled:opacity-50 dark:text-amber-300"
    >
      {pending ? "Creating…" : "Create a 5-min task"}
    </button>
  );
}
