"use client";

import { useEffect } from "react";

export type DianaExperienceMode = "calm" | "future";

export const FUTURE_MODE_STORAGE_KEY = "diana_experience_mode";
export const FUTURE_MODE_EVENT = "diana-experience-mode-change";

export function FutureModeProvider() {
  useEffect(() => {
    applyExperienceMode(readStoredExperienceMode());

    function handleStorage(event: StorageEvent) {
      if (event.key === FUTURE_MODE_STORAGE_KEY) applyExperienceMode(readStoredExperienceMode());
    }

    function handleModeEvent(event: Event) {
      const mode = (event as CustomEvent<DianaExperienceMode>).detail;
      if (mode === "future" || mode === "calm") applyExperienceMode(mode);
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(FUTURE_MODE_EVENT, handleModeEvent);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(FUTURE_MODE_EVENT, handleModeEvent);
    };
  }, []);

  return null;
}

export function readStoredExperienceMode(): DianaExperienceMode {
  if (typeof window === "undefined") return "calm";
  return localStorage.getItem(FUTURE_MODE_STORAGE_KEY) === "future" ? "future" : "calm";
}

export function setStoredExperienceMode(mode: DianaExperienceMode) {
  if (typeof window === "undefined") return;
  localStorage.setItem(FUTURE_MODE_STORAGE_KEY, mode);
  applyExperienceMode(mode);
  window.dispatchEvent(new CustomEvent(FUTURE_MODE_EVENT, { detail: mode }));
}

function applyExperienceMode(mode: DianaExperienceMode) {
  document.documentElement.dataset.experienceMode = mode;
  document.body.dataset.experienceMode = mode;
}
