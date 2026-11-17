import { todayDateKey } from "@/lib/dashboard/today-view";

export function calendarTimeZone(value: string | null | undefined): string {
  try { new Intl.DateTimeFormat("en-US", { timeZone: value ?? "UTC" }).format(); return value ?? "UTC"; } catch { return "UTC"; }
}
export function calendarLocalTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: calendarTimeZone(timeZone), hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
}

/** All real instants for a local clock time, ordered so a repeated time uses its first occurrence. */
export function calendarTimeChoices(day: string, time: string, timeZone: string): Date[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return [];
  const target = Date.parse(`${day}T${time}:00Z`);
  if (!Number.isFinite(target) || new Date(target).toISOString().slice(0, 10) !== day) return [];
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: calendarTimeZone(timeZone), year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  const wallTime = (instant: number) => {
    const parts = formatter.formatToParts(new Date(instant));
    const part = (type: string) => Number(parts.find(value => value.type === type)?.value);
    return Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
  };
  // Sample both sides of a transition, including half-hour and date-line changes.
  const offsets = new Set<number>();
  for (let hours = -36; hours <= 36; hours += 12) {
    const instant = target + hours * 3_600_000;
    offsets.add(wallTime(instant) - instant);
  }
  return [...offsets].map(offset => target - offset).filter(instant => wallTime(instant) === target).sort((a, b) => a - b).map(instant => new Date(instant));
}

export function calendarInstant(day: string, time: string, timeZone: string): Date {
  const first = calendarTimeChoices(day, time, timeZone)[0];
  if (!first) throw new RangeError(`The time ${time} on ${day} does not exist in ${calendarTimeZone(timeZone)} because the clocks change. Choose another time.`);
  return first;
}
export { todayDateKey as calendarDayKey };
