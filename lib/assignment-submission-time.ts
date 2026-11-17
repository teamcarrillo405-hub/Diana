import { calendarTimeZone } from "@/lib/calendar/time-zone";

export function formatHandInTime(value: string | null, timeZone?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: calendarTimeZone(timeZone),
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}
