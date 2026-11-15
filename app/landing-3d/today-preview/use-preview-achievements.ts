"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createAchievementLedger, getAchievements, parseAchievementLedger, recordAchievementEvent, type AchievementEvent, type AchievementLedger } from "@/lib/dashboard/achievements";
import type { PreviewScenario } from "./preview-data";

export const PREVIEW_ACHIEVEMENTS_KEY = "diana.design-preview.achievements.v1";

export function seedPreviewAchievements(scenario: PreviewScenario): AchievementLedger {
  const counts = scenario === "new" ? [0, 0, 0, 0] : scenario === "complete" ? [8, 12, 8, 1] : [5, 6, 3, 1];
  const events: AchievementEvent[] = [];
  for (const [index, kind] of (["work", "focus", "submitted", "check-in"] as const).entries()) {
    for (let item = 0; item < counts[index]; item++) {
      events.push({ id: `sample-${kind}-${item + 1}`, kind, occurredAt: new Date(Date.UTC(2026, 7, 25 + item, 16 + index)).toISOString() });
    }
  }
  return createAchievementLedger(events);
}

export function usePreviewAchievements(scenario: PreviewScenario, enabled = true) {
  const [ledger, setLedger] = useState(() => seedPreviewAchievements(scenario));
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const current = useRef(ledger);
  const [instanceId] = useState(() => crypto.randomUUID());
  const key = `${PREVIEW_ACHIEVEMENTS_KEY}.${scenario}`;

  useEffect(() => {
    if (!enabled) return;
    let next = seedPreviewAchievements(scenario);
    try {
      next = parseAchievementLedger(localStorage.getItem(key)) ?? next;
      localStorage.setItem(key, JSON.stringify(next));
      setStorageUnavailable(false);
    } catch { setStorageUnavailable(true); }
    current.current = next;
    setLedger(next);
  }, [scenario, key, enabled]);

  const persist = useCallback((next: AchievementLedger) => {
    current.current = next;
    setLedger(next);
    try { localStorage.setItem(key, JSON.stringify(next)); setStorageUnavailable(false); }
    catch { setStorageUnavailable(true); }
  }, [key]);

  const recordSession = useCallback((sessionId: string) => {
    persist(recordAchievementEvent(current.current, { id: `${instanceId}:${sessionId}`, kind: "focus", occurredAt: new Date().toISOString() }));
  }, [instanceId, persist]);

  const recordCheckIn = useCallback(() => {
    if (!enabled || scenario === "unavailable") return;
    const now = new Date();
    const localDate = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
    persist(recordAchievementEvent(current.current, { id: localDate, kind: "check-in", occurredAt: now.toISOString() }));
  }, [enabled, scenario, persist]);

  const reset = useCallback((target: PreviewScenario = scenario) => {
    const next = seedPreviewAchievements(target);
    if (target === scenario) { persist(next); return; }
    try { localStorage.setItem(`${PREVIEW_ACHIEVEMENTS_KEY}.${target}`, JSON.stringify(next)); }
    catch { setStorageUnavailable(true); }
  }, [scenario, persist]);
  return { achievements: getAchievements(scenario === "unavailable" ? null : ledger), recordSession, recordCheckIn, reset, storageUnavailable };
}
