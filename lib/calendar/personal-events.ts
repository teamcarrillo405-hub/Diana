import { addDays, differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import { dayKey, expandCalendarItem, type CalendarItem } from "./calendar-items";
import { calendarInstant, calendarTimeChoices, calendarTimeZone } from "./time-zone";

export const EVENT_CATEGORIES = ["Sports", "Performance", "School", "Personal", "Study"] as const;
export type EventCategory = typeof EVENT_CATEGORIES[number];
export type PersonalEvent = {
  id: string;
  timeZone?: string;
  title: string;
  day: string;
  time: string;
  endTime: string;
  /** Inclusive last date for all-day events, actual end date for timed events. Defaults to day. */
  endDay?: string;
  assignmentId?: string;
  allDay: boolean;
  category: EventCategory;
  location: string;
  notes: string;
  repeat: "none" | "weekly";
  repeatUntil: string;
  reminder: string;
  photo: string;
};
export const REMINDERS = [{ value: "none", label: "None" }, { value: "15", label: "15 minutes before" }, { value: "30", label: "30 minutes before" }, { value: "60", label: "1 hour before" }, { value: "1440", label: "1 day before" }];
export const EVENT_ART: Record<EventCategory, { image: string; imageAlt: string; color: string }> = {
  Sports: { image: "/assets/calendar-review/basketball-court.jpg", imageAlt: "An indoor basketball court with a wooden floor", color: "#91ddeb" },
  Performance: { image: "/assets/calendar-review/theater.jpg", imageAlt: "A theater stage with red curtains and audience seating", color: "#ffa495" },
  School: { image: "/images/onboarding-study-sunlight.png", imageAlt: "A bright student study environment", color: "#ffcf7c" },
  Personal: { image: "/assets/today-now/diana-signature-studio-v1-1678.webp", imageAlt: "Diana's signature studio", color: "#b9d6d4" },
  Study: { image: "/images/onboarding-study-sunlight.png", imageAlt: "A bright student study environment", color: "#92c7ff" },
};

export function newPersonalEvent(day: string): PersonalEvent {
  return { id: "", title: "", day, time: "16:00", endTime: "17:00", allDay: false, category: "Personal", location: "", notes: "", repeat: "none", repeatUntil: dayKey(addDays(parseISO(day), 28)), reminder: "none", photo: "" };
}

function validDay(day: string) {
  return typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day) && isValid(parseISO(day)) && format(parseISO(day), "yyyy-MM-dd") === day;
}

export function personalEventOccurrenceDays(event: PersonalEvent): string[] {
  if (event.repeat !== "weekly") return [event.day];
  const days: string[] = [];
  for (let day = parseISO(event.day); dayKey(day) <= event.repeatUntil; day = addDays(day, 7)) days.push(dayKey(day));
  return days;
}

export function personalEventEndDay(event: PersonalEvent, occurrenceDay = event.day): string {
  const offset = differenceInCalendarDays(parseISO(event.endDay || event.day), parseISO(event.day));
  return dayKey(addDays(parseISO(occurrenceDay), offset));
}

export function validatePersonalEvent(event: PersonalEvent, timeZone?: string): string | null {
  if (!event || typeof event !== "object" || Array.isArray(event)) return "Check your event details and try again.";
  if (typeof event.title !== "string" || !event.title.trim()) return "Add a title for your event.";
  if (event.title.trim().length > 100) return "Keep the event title within 100 characters.";
  if (typeof event.id !== "string" || /[\r\n]/.test(event.id) || event.id.length > 100
    || typeof event.allDay !== "boolean" || !EVENT_CATEGORIES.includes(event.category)
    || !["none", "weekly"].includes(event.repeat) || typeof event.repeatUntil !== "string"
    || typeof event.time !== "string" || event.time.length > 5 || typeof event.endTime !== "string" || event.endTime.length > 5
    || (event.endDay !== undefined && typeof event.endDay !== "string")
    || (event.assignmentId !== undefined && typeof event.assignmentId !== "string")
    || (event.timeZone !== undefined && typeof event.timeZone !== "string")
    || typeof event.photo !== "string" || event.photo.length > 4_200_000) return "Check your event details and try again.";
  if (typeof event.location !== "string" || event.location.length > 120) return "Keep the location within 120 characters.";
  if (typeof event.notes !== "string" || event.notes.length > 1000) return "Keep the notes within 1,000 characters.";
  if (typeof event.reminder !== "string" || !REMINDERS.some(reminder => reminder.value === event.reminder)) return "Choose a calendar reminder from the list.";
  if ([event.title, event.location, event.notes].some(value => /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))) return "Remove unsupported characters from your event details.";
  if (!validDay(event.day)) return "Choose a date for your event.";
  const endDay = event.endDay || event.day;
  if (!validDay(endDay) || endDay < event.day) return "Choose an end date on or after the start date.";
  if (differenceInCalendarDays(parseISO(endDay), parseISO(event.day)) > 366) return "Keep each event within one year.";
  if (event.assignmentId && (event.category !== "Study" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(event.assignmentId))) return "Choose an assignment for your study block.";
  if (!event.allDay) {
    const time = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!time.test(event.time) || !time.test(event.endTime)) return "Choose a start and end time.";
    if (endDay === event.day && event.endTime <= event.time) return "Choose an end time after the start time.";
  }
  if (event.repeat === "weekly") {
    if (!validDay(event.repeatUntil) || event.repeatUntil < event.day) return "Choose a repeat-until date on or after the event date.";
    if (differenceInCalendarDays(parseISO(event.repeatUntil), parseISO(event.day)) > 366) return "Choose a repeat-until date within one year.";
  }
  if (!event.allDay && (timeZone ?? event.timeZone)) {
    const zone = calendarTimeZone(timeZone ?? event.timeZone);
    for (const day of personalEventOccurrenceDays(event)) {
      for (const [date, time] of [[day, event.time], [personalEventEndDay(event, day), event.endTime]]) {
        if (!calendarTimeChoices(date, time, zone).length) return `The time ${time} on ${date} does not exist in ${zone} because the clocks change. Choose another time.`;
      }
    }
  }
  return null;
}

export function calendarTimeChoiceNotice(event: PersonalEvent, timeZone: string): string | null {
  if (validatePersonalEvent(event, timeZone) || event.allDay) return null;
  const repeats = personalEventOccurrenceDays(event).some(day => calendarTimeChoices(day, event.time, timeZone).length > 1 || calendarTimeChoices(personalEventEndDay(event, day), event.endTime, timeZone).length > 1);
  return repeats ? "This clock time occurs twice when daylight saving ends. Diana uses the first occurrence." : null;
}

export function expandPersonalEvents(events: PersonalEvent[], from: string, through: string, displayZone?: string): CalendarItem[] {
  return events.flatMap(event => {
    const sourceZone = event.timeZone ?? displayZone ?? "UTC";
    if (validatePersonalEvent(event, sourceZone)) return [];
    return personalEventOccurrenceDays(event).flatMap(day => {
      const endDay = personalEventEndDay(event, day);
      const startsAt = event.allDay ? undefined : calendarInstant(day, event.time, sourceZone).toISOString();
      const endsAt = event.allDay ? undefined : calendarInstant(endDay, event.endTime, sourceZone).toISOString();
      return expandCalendarItem({
        id: `${event.id}@${day}`, personalId: event.id, assignmentId: event.assignmentId, day, title: event.title, subject: event.category,
        kind: event.category === "Study" ? "session" as const : "event" as const,
        time: event.time, endTime: event.allDay ? undefined : event.endTime, allDay: event.allDay,
        startsAt, endsAt, endDay: event.allDay ? dayKey(addDays(parseISO(endDay), 1)) : endDay,
        minutes: event.category === "Study" && startsAt && endsAt ? (Date.parse(endsAt) - Date.parse(startsAt)) / 60_000 : undefined,
        ...EVENT_ART[event.category], ...(event.photo ? { image: event.photo, imageAlt: `Your photo for ${event.title}` } : {}),
        source: "Diana", location: event.location, brief: event.notes, category: event.category,
        repeatUntil: event.repeat === "weekly" ? event.repeatUntil : undefined, reminder: event.reminder,
      }, displayZone ?? sourceZone, from, through);
    });
  });
}

export function chronological(items: CalendarItem[]) {
  return [...items].sort((a, b) => Number(Boolean(b.allDay)) - Number(Boolean(a.allDay)) || a.time.localeCompare(b.time) || a.title.localeCompare(b.title));
}

export function overlappingEvents(item: CalendarItem, items: CalendarItem[]) {
  if (item.kind === "deadline" || item.allDay || !item.endTime) return [];
  return items.filter(other => {
    if (other.id === item.id || (item.occurrenceId && item.occurrenceId === other.occurrenceId) || other.day !== item.day || other.kind === "deadline" || other.allDay || !other.endTime) return false;
    if (item.startsAt && item.endsAt && other.startsAt && other.endsAt) return Date.parse(item.startsAt) < Date.parse(other.endsAt) && Date.parse(other.startsAt) < Date.parse(item.endsAt);
    return item.time < other.endTime && other.time < item.endTime!;
  });
}

