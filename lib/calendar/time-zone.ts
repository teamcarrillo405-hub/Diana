import { todayDateKey } from "@/lib/dashboard/today-view";

export function calendarTimeZone(value: string | null | undefined): string {
  try { new Intl.DateTimeFormat("en-US", { timeZone: value ?? "UTC" }).format(); return value ?? "UTC"; } catch { return "UTC"; }
}
export function calendarLocalTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: calendarTimeZone(timeZone), hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
}
export function calendarInstant(day: string, time: string, timeZone: string): Date {
  const target = Date.parse(`${day}T${time}:00Z`);
  let instant = target;
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: calendarTimeZone(timeZone), year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = formatter.formatToParts(new Date(instant));
    const part = (type: string) => Number(parts.find(value => value.type === type)?.value);
    const observed = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
    const offset = target - observed;
    instant += offset;
    if (!offset) break;
  }
  return new Date(instant);
}
export { todayDateKey as calendarDayKey };
