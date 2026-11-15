"use client";

import { useCallback, useEffect, useState } from "react";
import { getPreviewData, type PreviewScenario } from "./preview-data";

export const PREVIEW_WEEKLY_AWARDS_KEY = "diana.design-preview.weekly-awards.v1";

const SAMPLE_WEEK_ID = "2026-09-07";
const SAMPLE_EARNED_AT = "2026-09-09T00:00:00.000Z";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type PreviewWeeklyAward = {
  weekLabel: string;
  completed: number;
  target: number;
  state: "in-progress" | "earned" | "no-goal" | "unavailable";
  earnedAt: string | null;
};

type WeeklyRecord = Readonly<{ goal: number; completed: number; earnedAt: string }>;
type WeeklyRecords = Readonly<{ version: 1; weeks: Readonly<Record<string, WeeklyRecord>> }>;

export function getPreviewWeeklyAward(scenario: PreviewScenario): PreviewWeeklyAward {
  const { finished, total, unavailable } = getPreviewData(scenario);
  const state = unavailable ? "unavailable" : total === 0 ? "no-goal"
    : finished >= total ? "earned" : "in-progress";
  return {
    weekLabel: "Sep 7 - Sep 13, 2026",
    completed: finished,
    target: total,
    state,
    earnedAt: state === "earned" ? SAMPLE_EARNED_AT : null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// This validates local preview data, not the authenticity of an earned award.
function parseWeeklyRecords(raw: string | null): WeeklyRecords | null {
  if (raw === null) return null;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!isRecord(value) || value.version !== 1 || Object.keys(value).length !== 2 || !isRecord(value.weeks)) return null;

  const weeks: Record<string, WeeklyRecord> = {};
  for (const [weekId, record] of Object.entries(value.weeks)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekId)) return null;
    const start = new Date(`${weekId}T00:00:00.000Z`);
    if (!Number.isFinite(start.getTime()) || start.toISOString().slice(0, 10) !== weekId || start.getUTCDay() !== 1) return null;
    if (
      !isRecord(record) || Object.keys(record).length !== 3 ||
      typeof record.goal !== "number" || !Number.isSafeInteger(record.goal) || record.goal <= 0 ||
      typeof record.completed !== "number" || !Number.isSafeInteger(record.completed) || record.completed < record.goal ||
      typeof record.earnedAt !== "string"
    ) return null;
    const earned = new Date(record.earnedAt);
    if (
      !Number.isFinite(earned.getTime()) || earned.toISOString() !== record.earnedAt ||
      earned.getTime() < start.getTime() || earned.getTime() >= start.getTime() + WEEK_MS ||
      record.earnedAt.slice(0, 10) > SAMPLE_EARNED_AT.slice(0, 10)
    ) return null;
    weeks[weekId] = { goal: record.goal, completed: record.completed, earnedAt: record.earnedAt };
  }
  return { version: 1, weeks };
}

function withSampleAward(records: WeeklyRecords, award: PreviewWeeklyAward): WeeklyRecords {
  if (award.state !== "earned" || award.earnedAt === null || records.weeks[SAMPLE_WEEK_ID]) return records;
  return {
    ...records,
    weeks: {
      ...records.weeks,
      [SAMPLE_WEEK_ID]: { goal: award.target, completed: award.completed, earnedAt: award.earnedAt },
    },
  };
}

export function usePreviewWeeklyAward(scenario: PreviewScenario, enabled = true) {
  const [saved, setSaved] = useState(() => ({ scenario, award: getPreviewWeeklyAward(scenario) }));
  const [storageUnavailable, setStorageUnavailable] = useState(false);

  const load = useCallback((target: PreviewScenario, resetWeek = false) => {
    let award = getPreviewWeeklyAward(target);
    if (!enabled) return award;
    try {
      const key = `${PREVIEW_WEEKLY_AWARDS_KEY}.${target}`;
      const raw = localStorage.getItem(key);
      let records = parseWeeklyRecords(raw) ?? { version: 1 as const, weeks: {} };
      if (resetWeek) {
        const { [SAMPLE_WEEK_ID]: _sample, ...weeks } = records.weeks;
        records = { version: 1, weeks };
      }
      records = withSampleAward(records, award);
      const snapshot = records.weeks[SAMPLE_WEEK_ID];
      // Only an eligible fixture can display this week's award, even with saved data.
      if (award.state === "earned" && snapshot) {
        award = { ...award, completed: snapshot.completed, target: snapshot.goal, earnedAt: snapshot.earnedAt };
      }
      const serialized = JSON.stringify(records);
      if (raw !== serialized) localStorage.setItem(key, serialized);
      setStorageUnavailable(false);
    } catch { setStorageUnavailable(true); }
    return award;
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    setSaved({ scenario, award: load(scenario) });
  }, [scenario, enabled, load]);

  const reset = useCallback((targetScenario: PreviewScenario = scenario) => {
    const award = load(targetScenario, true);
    if (targetScenario === scenario) setSaved({ scenario, award });
  }, [scenario, load]);

  return {
    award: enabled && saved.scenario === scenario ? saved.award : getPreviewWeeklyAward(scenario),
    storageUnavailable: enabled && storageUnavailable,
    reset,
  };
}
