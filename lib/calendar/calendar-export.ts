import { addDays, format, parseISO } from "date-fns";
import type { PersonalEvent } from "./personal-events";

const escape = (value: string) => value.replaceAll("\\", "\\\\").replaceAll("\r\n", "\n").replaceAll("\r", "\n").replaceAll("\n", "\\n").replaceAll(";", "\\;").replaceAll(",", "\\,");
const date = (value: string) => value.replaceAll("-", "");
const stamp = (value: Date) => value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function personalEventCalendar(event: PersonalEvent, timeZone: string, now = new Date()) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Diana//Personal Calendar//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT", `UID:${event.id}@diana`, `DTSTAMP:${stamp(now)}`, `SUMMARY:${escape(event.title)}`];
  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${date(event.day)}`, `DTEND;VALUE=DATE:${date(format(addDays(parseISO(event.day), 1), "yyyy-MM-dd"))}`);
  } else {
    lines.push(`DTSTART;TZID=${timeZone}:${date(event.day)}T${event.time.replace(":", "")}00`, `DTEND;TZID=${timeZone}:${date(event.day)}T${event.endTime.replace(":", "")}00`);
  }
  if (event.repeat === "weekly") {
    const count = Math.floor((Date.parse(event.repeatUntil) - Date.parse(event.day)) / (7 * 86400000)) + 1;
    lines.push(`RRULE:FREQ=WEEKLY;COUNT=${count}`);
  }
  if (event.location) lines.push(`LOCATION:${escape(event.location)}`);
  if (event.notes) lines.push(`DESCRIPTION:${escape(event.notes)}`);
  if (event.reminder !== "none") lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `TRIGGER:-PT${Number(event.reminder)}M`, `DESCRIPTION:${escape(event.title)}`, "END:VALARM");
  lines.push("END:VEVENT", "END:VCALENDAR");
  // Fold by UTF-8 bytes, retaining unicode characters across continuation lines.
  return lines.map(line => {
    let current = ""; let bytes = 0; const folded: string[] = [];
    for (const character of line) { const size = new TextEncoder().encode(character).length; if (bytes + size > 75) { folded.push(current); current = " "; bytes = 1; } current += character; bytes += size; }
    folded.push(current); return folded.join("\r\n");
  }).join("\r\n") + "\r\n";
}
