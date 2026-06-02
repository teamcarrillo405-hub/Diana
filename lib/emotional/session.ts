export type SessionMood = "good" | "meh" | "rough";

export type SessionAdaptation = {
  mood: SessionMood | null;
  workMinutes: number;
  breakMinutes: number;
  visibleTaskCount: number;
  energyOverride: "low" | "medium" | null;
  headline: string;
  nextStep: string;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function sessionAdaptationForMood(mood: string | null | undefined): SessionAdaptation {
  if (mood === "rough") {
    return {
      mood: "rough",
      workMinutes: 10,
      breakMinutes: 5,
      visibleTaskCount: 2,
      energyOverride: "low",
      headline: "Rough mode",
      nextStep: "One small step, then a real break.",
    };
  }
  if (mood === "meh") {
    return {
      mood: "meh",
      workMinutes: 15,
      breakMinutes: 5,
      visibleTaskCount: 3,
      energyOverride: "medium",
      headline: "Light mode",
      nextStep: "Keep the next choice small and clear.",
    };
  }
  return {
    mood: mood === "good" ? "good" : null,
    workMinutes: 25,
    breakMinutes: 5,
    visibleTaskCount: 3,
    energyOverride: null,
    headline: "Standard mode",
    nextStep: "Pick the next useful step.",
  };
}

export function shouldShowMoodCheckIn(input: {
  disabled?: boolean | null;
  lastCheckInAt?: string | null;
  now?: Date;
}): boolean {
  if (input.disabled) return false;
  if (!input.lastCheckInAt) return true;
  const now = input.now ?? new Date();
  const last = new Date(input.lastCheckInAt);
  if (Number.isNaN(last.getTime())) return true;
  return now.toDateString() !== last.toDateString();
}

export function roughModeUntil(now: Date = new Date()): string {
  return new Date(now.getTime() + ONE_DAY_MS).toISOString();
}

export function startOfWeekIsoDate(now: Date = new Date()): string {
  const date = new Date(now);
  const day = date.getDay();
  const diff = day === 0 ? 0 : day;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

export function shouldShowWeeklyReflection(input: {
  lastReflectedAt?: string | null;
  now?: Date;
}): boolean {
  const now = input.now ?? new Date();
  if (now.getDay() !== 0 || now.getHours() < 17) return false;
  if (!input.lastReflectedAt) return true;
  const last = new Date(input.lastReflectedAt);
  if (Number.isNaN(last.getTime())) return true;
  return startOfWeekIsoDate(last) !== startOfWeekIsoDate(now);
}

export function shouldOfferDifferentApproach(input: {
  needsSupportCount: number;
  threshold?: number;
}): boolean {
  const threshold = input.threshold ?? 3;
  return input.needsSupportCount >= threshold;
}

export function burnoutSignal(input: {
  minutesToday: number;
  openSessionMinutes?: number;
  overwhelmedSignals?: number;
  mood?: string | null;
}): { show: boolean; message: string } {
  const total = input.minutesToday + (input.openSessionMinutes ?? 0);
  const overwhelmed = input.overwhelmedSignals ?? 0;
  if (total >= 150) {
    return { show: true, message: "Your brain has done a lot today. A short reset is a useful next step." };
  }
  if (input.mood === "rough" && total >= 60) {
    return { show: true, message: "Rough day plus steady work is enough data. Take the next step smaller." };
  }
  if (overwhelmed >= 3) {
    return { show: true, message: "You have asked for smaller steps a few times. Switch to a lighter block for now." };
  }
  return { show: false, message: "" };
}

export function quietMilestone(countThisWeek: number): string | null {
  if (countThisWeek >= 20) return `${countThisWeek} things finished this week. That is a lot of real work.`;
  if (countThisWeek >= 10) return `${countThisWeek} things finished this week. Worth noticing.`;
  if (countThisWeek >= 5) return `${countThisWeek} things finished this week. Keep it quiet and real.`;
  return null;
}

export function fallbackReflection(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "You checked in. That counts as useful data for next week.";
  const firstSentence = trimmed.split(/[.!?]/).map((part) => part.trim()).find(Boolean);
  return firstSentence
    ? `You named this clearly: "${firstSentence.slice(0, 140)}." Keep one small carry-forward for next week.`
    : "You named what the week felt like. Keep one small carry-forward for next week.";
}
