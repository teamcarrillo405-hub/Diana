import { addDays, format, parseISO, startOfWeek } from "date-fns";


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
  const [hours, minutes] = time.split(":").map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
}
export function itemTime(item: CalendarItem) {
  if (item.allDay) return "All day";
  const start = clockLabel(item.time);
  return item.endTime ? `${start} - ${clockLabel(item.endTime)}` : start;
}
export const itemsForDay = (items: CalendarItem[], day: string) => items.filter(item => item.day === day);


