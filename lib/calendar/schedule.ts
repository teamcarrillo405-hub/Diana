import { isSameDay, isValid, parseISO } from "date-fns";

export const CALENDAR_DAY_MINUTES = 24 * 60;
export const CALENDAR_MIN_EVENT_MINUTES = 30;

export type ScheduleSource = {
  startsAt: string;
  endsAt?: string | null;
  allDay?: boolean;
};

export type TimedScheduleItem<T extends ScheduleSource> = {
  item: T;
  startMinute: number;
  durationMinutes: number;
};

export type DaySchedule<T extends ScheduleSource> = {
  allDay: T[];
  timed: TimedScheduleItem<T>[];
};

export function buildDaySchedule<T extends ScheduleSource>(items: T[], day: Date): DaySchedule<T> {
  const allDay: T[] = [];
  const timed: TimedScheduleItem<T>[] = [];

  for (const item of items) {
    const startsAt = parseISO(item.startsAt);
    if (!isValid(startsAt) || !isSameDay(startsAt, day)) continue;

    if (item.allDay) {
      allDay.push(item);
      continue;
    }

    const startMinute = startsAt.getHours() * 60 + startsAt.getMinutes();
    const parsedEnd = item.endsAt ? parseISO(item.endsAt) : null;
    const endMinute = parsedEnd && isValid(parsedEnd) && isSameDay(parsedEnd, startsAt)
      ? parsedEnd.getHours() * 60 + parsedEnd.getMinutes()
      : startMinute + CALENDAR_MIN_EVENT_MINUTES;
    const availableMinutes = Math.max(CALENDAR_MIN_EVENT_MINUTES, CALENDAR_DAY_MINUTES - startMinute);

    timed.push({
      item,
      startMinute,
      durationMinutes: Math.min(
        availableMinutes,
        Math.max(CALENDAR_MIN_EVENT_MINUTES, endMinute - startMinute),
      ),
    });
  }

  timed.sort((left, right) => left.startMinute - right.startMinute);
  return { allDay, timed };
}
