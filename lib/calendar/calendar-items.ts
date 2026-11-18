import { addDays, format, isValid, parseISO, startOfWeek } from "date-fns";
import { calendarDayKey, calendarInstant, calendarLocalTime } from "./time-zone";


export type CalendarItem = {
  id: string;
  href?: string;
  external?: boolean;
  day: string;
  title: string;
  subject: string;
  kind: "deadline" | "session" | "event";
  time: string;
  endTime?: string;
  /** Original end date; exclusive for all-day events. day/time/endTime describe the displayed day slice. */
  endDay?: string;
  startsAt?: string;
  endsAt?: string;
  occurrenceId?: string;
  continuesBefore?: boolean;
  continuesAfter?: boolean;
  assignmentId?: string;
  allDay?: boolean;
  personalId?: string;
  category?: string;
  repeatUntil?: string;
  reminder?: string;
  minutes?: number;
  status?: string;
  image: string;
  imageAlt: string;
  color: string;
  source: string;
  location?: string;
  brief: string;
};

export const dayKey = (day: Date) => format(day, "yyyy-MM-dd");
export const weekDays = (day: string) => {
  const start = startOfWeek(parseISO(day), { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};
export function clockLabel(time: string) {
  if (time === "24:00") return "Midnight";
  const [hours, minutes] = time.split(":").map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
}
export function itemTime(item: CalendarItem) {
  if (item.allDay) return "All day";
  const start = clockLabel(item.time);
  return item.endTime ? `${start} - ${clockLabel(item.endTime)}` : start;
}
export const itemsForDay = (items: CalendarItem[], day: string) => items.filter(item => item.day === day);

/** Split occupied dates for display while retaining the original interval for planning and conflicts. */
export function expandCalendarItem(item: CalendarItem, timeZone: string, from?: string, through?: string): CalendarItem[] {
  if (item.kind === "deadline") return (!from || item.day >= from) && (!through || item.day <= through) ? [item] : [];
  const occurrenceId = item.occurrenceId ?? item.id;
  if (item.allDay) {
    const validDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value)) && dayKey(parseISO(value)) === value;
    if (!validDay(item.day)) return [];
    const endDay = item.endDay ?? dayKey(addDays(parseISO(item.day), 1));
    if (!validDay(endDay) || endDay <= item.day) return [];
    const slices: CalendarItem[] = [];
    for (let day = from && from > item.day ? from : item.day; day < endDay && (!through || day <= through); day = dayKey(addDays(parseISO(day), 1))) {
      slices.push({ ...item, id: day === item.day ? item.id : `${item.id}~${day}`, occurrenceId, day, endDay, time: "00:00", endTime: undefined, continuesBefore: day > item.day, continuesAfter: dayKey(addDays(parseISO(day), 1)) < endDay });
    }
    return slices;
  }
  const start = item.startsAt ? new Date(item.startsAt) : calendarInstant(item.day, item.time, timeZone);
  if (!Number.isFinite(start.getTime())) return [];
  const firstDay = calendarDayKey(start, timeZone);
  const end = item.endsAt ? new Date(item.endsAt) : item.endTime ? calendarInstant(item.endDay ?? item.day, item.endTime, timeZone) : null;
  if (!end || !Number.isFinite(end.getTime()) || end <= start) {
    return (!from || firstDay >= from) && (!through || firstDay <= through) ? [{ ...item, day: firstDay, time: calendarLocalTime(start.toISOString(), timeZone), endTime: undefined, startsAt: start.toISOString(), endsAt: undefined, occurrenceId }] : [];
  }
  const endDay = calendarDayKey(end, timeZone);
  // Subtract one millisecond so midnight belongs only to the preceding occupied date.
  const lastDay = calendarDayKey(new Date(end.getTime() - 1), timeZone);
  const slices: CalendarItem[] = [];
  for (let day = from && from > firstDay ? from : firstDay; day <= lastDay && (!through || day <= through); day = dayKey(addDays(parseISO(day), 1))) {
    slices.push({
      ...item, id: day === firstDay ? item.id : `${item.id}~${day}`, occurrenceId, day, endDay,
      time: day === firstDay ? calendarLocalTime(start.toISOString(), timeZone) : "00:00",
      endTime: day < endDay ? "24:00" : calendarLocalTime(end.toISOString(), timeZone),
      startsAt: start.toISOString(), endsAt: end.toISOString(), continuesBefore: day > firstDay, continuesAfter: day < lastDay,
    });
  }
  return slices;
}


