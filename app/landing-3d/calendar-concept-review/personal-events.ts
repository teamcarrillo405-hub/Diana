import { addDays, differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import { dayKey, weekDays, type CalendarItem } from "./fixtures";

export const EVENT_CATEGORIES = ["Sports", "Performance", "School", "Personal", "Study"] as const;
export type EventCategory = typeof EVENT_CATEGORIES[number];
export type PersonalEvent = {
  id: string;
  title: string;
  day: string;
  time: string;
  endTime: string;
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

export function createPersonalExamples(today: string): PersonalEvent[] {
  const days = weekDays(today).map(dayKey);
  return [
    { ...newPersonalEvent(days[2]), id: "sample-practice", title: "Basketball practice", time: "16:30", endTime: "18:00", category: "Sports", location: "School gym", notes: "Bring your water bottle and practice jersey.", repeat: "weekly", repeatUntil: dayKey(addDays(parseISO(days[2]), 28)), reminder: "30" },
    { ...newPersonalEvent(days[4]), id: "sample-play", title: "School play", time: "19:00", endTime: "21:00", category: "Performance", location: "School auditorium", notes: "Doors open at 6:30 PM. Meet friends in the lobby.", reminder: "60" },
  ];
}

function validDay(day: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && isValid(parseISO(day)) && format(parseISO(day), "yyyy-MM-dd") === day;
}

export function validatePersonalEvent(event: PersonalEvent): string | null {
  if (!event.title.trim()) return "Add a title for your event.";
  if (event.title.trim().length > 100) return "Keep the event title within 100 characters.";
  if (!validDay(event.day)) return "Choose a date for your event.";
  if (!event.allDay) {
    const time = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!time.test(event.time) || !time.test(event.endTime)) return "Choose a start and end time.";
    if (event.endTime <= event.time) return "Choose an end time after the start time. This preview supports same-day events.";
  }
  if (event.repeat === "weekly") {
    if (!validDay(event.repeatUntil) || event.repeatUntil < event.day) return "Choose a repeat-until date on or after the event date.";
    if (differenceInCalendarDays(parseISO(event.repeatUntil), parseISO(event.day)) > 366) return "Choose a repeat-until date within one year.";
  }
  return null;
}

export function expandPersonalEvents(events: PersonalEvent[], from: string, through: string): CalendarItem[] {
  return events.flatMap(event => {
    if (validatePersonalEvent(event)) return [];
    const dates: string[] = [];
    if (event.repeat === "none") {
      if (event.day >= from && event.day <= through) dates.push(event.day);
    } else {
      const start = parseISO(event.day);
      const first = Math.max(0, Math.ceil(differenceInCalendarDays(parseISO(from), start) / 7));
      for (let day = addDays(start, first * 7); dayKey(day) <= through && dayKey(day) <= event.repeatUntil; day = addDays(day, 7)) dates.push(dayKey(day));
    }
    return dates.map(day => ({
      id: `${event.id}@${day}`, personalId: event.id, day, title: event.title, subject: event.category,
      kind: event.category === "Study" ? "session" as const : "event" as const,
      time: event.time, endTime: event.allDay ? undefined : event.endTime, allDay: event.allDay,
      ...EVENT_ART[event.category], ...(event.photo ? { image: event.photo, imageAlt: `Your photo for ${event.title}` } : {}),
      source: "Diana", location: event.location, brief: event.notes, category: event.category,
      repeatUntil: event.repeat === "weekly" ? event.repeatUntil : undefined, reminder: event.reminder,
    }));
  });
}

export function chronological(items: CalendarItem[]) {
  return [...items].sort((a, b) => Number(Boolean(b.allDay)) - Number(Boolean(a.allDay)) || a.time.localeCompare(b.time) || a.title.localeCompare(b.title));
}

export function overlappingEvents(item: CalendarItem, items: CalendarItem[]) {
  if (item.kind === "deadline" || item.allDay || !item.endTime) return [];
  return items.filter(other => other.id !== item.id && other.day === item.day && other.kind !== "deadline" && !other.allDay && other.endTime && item.time < other.endTime && other.time < item.endTime!);
}
