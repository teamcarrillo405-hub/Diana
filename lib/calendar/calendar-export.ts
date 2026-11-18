import { addDays, format, parseISO } from "date-fns";
import { personalEventEndDay, personalEventOccurrenceDays, validatePersonalEvent, type PersonalEvent } from "./personal-events";
import { calendarInstant, calendarTimeZone } from "./time-zone";

const escape = (value: string) => value.replaceAll("\\", "\\\\").replaceAll("\r\n", "\n").replaceAll("\r", "\n").replaceAll("\n", "\\n").replaceAll(";", "\\;").replaceAll(",", "\\,");
const date = (value: string) => value.replaceAll("-", "");
const stamp = (value: Date) => value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

function offsetLabel(seconds: number) {
  const absolute = Math.abs(seconds);
  const hours = String(Math.floor(absolute / 3600)).padStart(2, "0");
  const minutes = String(Math.floor(absolute / 60) % 60).padStart(2, "0");
  const remainder = absolute % 60;
  return `${seconds < 0 ? "-" : "+"}${hours}${minutes}${remainder ? String(remainder).padStart(2, "0") : ""}`;
}

/** Finite observances cover every exported occurrence plus one year on each side. RFC 5545 section 3.6.5. */
function timezoneLines(zone: string, firstDay: string, lastDay: string) {
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" });
  const offsetAt = (seconds: number) => {
    const label = formatter.formatToParts(new Date(seconds * 1000)).find(part => part.type === "timeZoneName")?.value;
    if (label === "GMT") return 0;
    const match = /^GMT([+-])(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(label ?? "");
    if (!match) throw new RangeError("The calendar time zone could not be exported.");
    return (Number(match[2]) * 3600 + Number(match[3]) * 60 + Number(match[4] ?? 0)) * (match[1] === "-" ? -1 : 1);
  };
  const padding = 370 * 86400;
  const start = Date.parse(`${firstDay}T00:00:00Z`) / 1000 - padding;
  const end = Date.parse(`${lastDay}T23:59:59Z`) / 1000 + padding;
  const initialOffset = offsetAt(start);
  const transitions: Array<{ at: number; from: number; to: number }> = [];
  let previousOffset = initialOffset;
  // Six-hour samples and second-level bisection include non-hour political and DST changes.
  for (let previous = start, next = Math.min(start + 21600, end); previous < end; previous = next, next = Math.min(next + 21600, end)) {
    const offset = offsetAt(next);
    if (offset !== previousOffset) {
      let low = previous;
      let high = next;
      while (high - low > 1) {
        const middle = Math.floor((low + high) / 2);
        if (offsetAt(middle) === previousOffset) low = middle; else high = middle;
      }
      transitions.push({ at: high, from: previousOffset, to: offset });
      previousOffset = offset;
    }
  }
  const observance = (kind: "STANDARD" | "DAYLIGHT", at: number, from: number, to: number) => [
    `BEGIN:${kind}`, `DTSTART:${stamp(new Date((at + from) * 1000)).slice(0, -1)}`,
    `TZOFFSETFROM:${offsetLabel(from)}`, `TZOFFSETTO:${offsetLabel(to)}`, `END:${kind}`,
  ];
  const baselineKind = transitions[0] && transitions[0].to < initialOffset ? "DAYLIGHT" : "STANDARD";
  return ["BEGIN:VTIMEZONE", `TZID:${escape(zone)}`,
    ...observance(baselineKind, start, initialOffset, initialOffset),
    ...transitions.flatMap(value => observance(value.to > value.from ? "DAYLIGHT" : "STANDARD", value.at, value.from, value.to)),
    "END:VTIMEZONE"];
}

export function personalEventCalendar(event: PersonalEvent, timeZone: string, now = new Date()) {
  const zone = calendarTimeZone(timeZone);
  const validation = validatePersonalEvent(event, zone);
  if (validation) throw new RangeError(validation);
  const occurrenceDays = personalEventOccurrenceDays(event);
  const lastEndDay = personalEventEndDay(event, occurrenceDays[occurrenceDays.length - 1]);
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Diana//Personal Calendar//EN", "CALSCALE:GREGORIAN",
    ...(event.allDay ? [] : timezoneLines(zone, event.day, lastEndDay))];
  const parameter = /[;:,]/.test(zone) ? `"${zone}"` : zone;
  const localStart = (day: string) => `${date(day)}T${event.time.replace(":", "")}00`;
  const eventLines = (day: string, exception = false) => {
    const endDay = personalEventEndDay(event, day);
    const result = ["BEGIN:VEVENT", `UID:${event.id}@diana`, `DTSTAMP:${stamp(now)}`, `SUMMARY:${escape(event.title)}`];
    if (exception) result.push(`RECURRENCE-ID;TZID=${parameter}:${localStart(day)}`);
    if (event.allDay) {
      result.push(`DTSTART;VALUE=DATE:${date(day)}`, `DTEND;VALUE=DATE:${date(format(addDays(parseISO(endDay), 1), "yyyy-MM-dd"))}`);
    } else {
      result.push(`DTSTART;TZID=${parameter}:${localStart(day)}`, `DTEND;TZID=${parameter}:${date(endDay)}T${event.endTime.replace(":", "")}00`);
    }
    if (event.repeat === "weekly" && !exception) result.push(`RRULE:FREQ=WEEKLY;COUNT=${occurrenceDays.length}`);
    if (event.location) result.push(`LOCATION:${escape(event.location)}`);
    if (event.notes) result.push(`DESCRIPTION:${escape(event.notes)}`);
    if (event.reminder !== "none") result.push("BEGIN:VALARM", "ACTION:DISPLAY", `TRIGGER:-PT${Number(event.reminder)}M`, `DESCRIPTION:${escape(event.title)}`, "END:VALARM");
    return [...result, "END:VEVENT"];
  };
  lines.push(...eventLines(event.day));
  if (!event.allDay && event.repeat === "weekly") {
    const duration = (day: string) => calendarInstant(personalEventEndDay(event, day), event.endTime, zone).getTime() - calendarInstant(day, event.time, zone).getTime();
    const baseDuration = duration(event.day);
    // DTEND gives the series an exact duration; exceptions retain the student's local end time on clock-change weeks.
    for (const day of occurrenceDays.slice(1)) if (duration(day) !== baseDuration) lines.push(...eventLines(day, true));
  }
  lines.push("END:VCALENDAR");
  // Fold by UTF-8 bytes, retaining unicode characters across continuation lines.
  return lines.map(line => {
    let current = ""; let bytes = 0; const folded: string[] = [];
    for (const character of line) { const size = new TextEncoder().encode(character).length; if (bytes + size > 75) { folded.push(current); current = " "; bytes = 1; } current += character; bytes += size; }
    folded.push(current); return folded.join("\r\n");
  }).join("\r\n") + "\r\n";
}
