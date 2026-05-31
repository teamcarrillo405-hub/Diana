// F7 — Smart reminders pure-function rules.
// All checks operate in LOCAL time (caller passes new Date() from client useEffect).
// Server components run UTC (Pitfall 1 in research) — never call these from a Server Component.

export const QUIET_HOURS_START = 20; // 20:00 local — reminders suppressed
export const QUIET_HOURS_END = 7;    // 07:00 local — reminders resume
export const DUE_SOON_HOURS = 48;    // surface reminder when ≤48h until due

export function isQuietHours(now: Date): boolean {
  const h = now.getHours();
  return h >= QUIET_HOURS_START || h < QUIET_HOURS_END;
}

export function isWeekend(now: Date): boolean {
  const d = now.getDay();
  return d === 0 || d === 6;
}

export function isPastDue(dueAt: string | null, now: Date): boolean {
  if (!dueAt) return false;
  return new Date(dueAt) < now;
}

export function hoursUntilDue(dueAt: string | null, now: Date): number | null {
  if (!dueAt) return null;
  const diffMs = new Date(dueAt).getTime() - now.getTime();
  if (diffMs < 0) return null; // past due → undefined window
  return Math.floor(diffMs / (60 * 60 * 1000));
}

export function shouldShowReminder(input: {
  dueAt: string | null;
  pastDue: boolean;
  quietHours: boolean;
  weekend: boolean;
}): boolean {
  // D-04: past-due bypasses BOTH quiet hours and weekend
  if (input.pastDue) return true;
  if (!input.dueAt) return false;
  if (input.quietHours) return false;
  if (input.weekend) return false;
  return true; // due within window during waking weekday → show
}
