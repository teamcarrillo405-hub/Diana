"use client";

import { useEffect, useState } from "react";
import { AudioLines, Sparkles } from "lucide-react";
import {
  FUTURE_MODE_EVENT,
  readStoredExperienceMode,
  setStoredExperienceMode,
  type DianaExperienceMode,
} from "@/components/future-mode-provider";

type FutureModeToggleProps = {
  compact?: boolean;
  className?: string;
};

export function FutureModeToggle({ compact = false, className = "" }: FutureModeToggleProps) {
  const [mode, setMode] = useState<DianaExperienceMode>("calm");

  useEffect(() => {
    setMode(readStoredExperienceMode());

    function handleModeEvent(event: Event) {
      const nextMode = (event as CustomEvent<DianaExperienceMode>).detail;
      if (nextMode === "future" || nextMode === "calm") setMode(nextMode);
    }

    window.addEventListener(FUTURE_MODE_EVENT, handleModeEvent);
    return () => window.removeEventListener(FUTURE_MODE_EVENT, handleModeEvent);
  }, []);

  const enabled = mode === "future";

  return (
    <button
      type="button"
      aria-pressed={enabled}
      onClick={() => setStoredExperienceMode(enabled ? "calm" : "future")}
      className={`future-toggle touch-target inline-flex max-w-full min-w-0 items-center justify-center gap-2 overflow-hidden rounded-full border border-brand/25 bg-surface-raised/90 px-3 py-2 text-sm font-semibold text-fg shadow-sm transition hover:border-brand/45 hover:bg-brand/10 ${className}`}
    >
      {enabled ? <AudioLines size={16} className="shrink-0 text-subject-science" /> : <Sparkles size={16} className="shrink-0 text-brand" />}
      <span className="min-w-0 truncate">{enabled ? "Diana OS on" : compact ? "Future mode" : "Try Diana OS"}</span>
    </button>
  );
}
