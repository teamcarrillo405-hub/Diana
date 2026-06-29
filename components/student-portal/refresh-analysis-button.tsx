"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";

export function RefreshAnalysisButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
      className="student-nexus-secondary touch-target pm-refresh-button"
      aria-label="Refresh Diana analysis"
    >
      <RefreshCw size={16} className={pending ? "pm-refresh-spin" : undefined} />
      {pending ? "Refreshing" : "Refresh analysis"}
    </button>
  );
}
