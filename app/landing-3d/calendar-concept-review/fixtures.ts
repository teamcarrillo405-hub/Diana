import { addDays, format, parseISO, startOfWeek } from "date-fns";

export const CALENDAR_TIME_ZONE = "America/Los_Angeles";
export type CalendarItem = {
  id: string;
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
  status?: "In progress" | "Not started" | "Ready to submit" | "Submitted";
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

// Synthetic review records move with the current week. Nothing is imported or saved.
export function createCalendarItems(today: string): CalendarItem[] {
  const days = weekDays(today).map(dayKey);
  const art = (subject: string) => `/assets/landing-10k/subjects/${subject}.webp`;
  return [
    { id: "algebra-submitted", day: days[0], title: "Patterns & sequences", subject: "Algebra I", kind: "deadline", time: "15:30", minutes: 20, status: "Submitted", image: art("math"), imageAlt: "Equations and function graphs on a blackboard", color: "#92c7ff", source: "Canvas", brief: "Identify the pattern in each sequence and explain the rule using an equation." },
    { id: "english", day: days[1], title: "A point of view", subject: "English 9", kind: "deadline", time: "20:00", minutes: 30, status: "Submitted", image: art("english"), imageAlt: "Books and printed pages for English literature", color: "#ffa495", source: "Google Classroom", brief: "Support a claim about the narrator with two passages from the text." },
    { id: "biology", day: days[2], title: "Cell structure & function", subject: "Biology", kind: "deadline", time: "20:00", minutes: 25, status: "In progress", image: art("biology"), imageAlt: "Plant cell structures seen through a microscope", color: "#6cebbb", source: "Canvas", brief: "Label the cell structures and explain how each one supports the cell. Include your annotated diagram and short response." },
    { id: "biology-session", day: days[2], title: "Cell diagram review", subject: "Biology", kind: "session", time: "16:00", endTime: "16:25", minutes: 25, image: art("biology"), imageAlt: "Plant cell structures seen through a microscope", color: "#6cebbb", source: "Personal plan", location: "Library", brief: "A planned study block for reviewing the cell diagram before the assignment deadline at 8:00 PM." },
    { id: "robotics", day: days[2], title: "Robotics club", subject: "After school", kind: "event", time: "17:00", endTime: "18:00", image: art("computer-science"), imageAlt: "Processors and electronic components on a circuit board", color: "#68def4", source: "Google Calendar", location: "Engineering lab", brief: "Team workshop: assemble and test the sensor circuit for the next robotics project." },
    { id: "algebra", day: days[3], title: "Functions & graphs", subject: "Algebra I", kind: "deadline", time: "15:30", minutes: 35, status: "Not started", image: art("math"), imageAlt: "Mathematical equations and function graphs", color: "#92c7ff", source: "Canvas", brief: "Match each linear function to its graph. Explain how the slope and intercept determine the line." },
    { id: "chemistry-lab", day: days[3], title: "Reaction lab", subject: "Chemistry", kind: "event", time: "10:00", endTime: "11:00", image: art("chemistry"), imageAlt: "Colorful solutions and glassware in a chemistry laboratory", color: "#68def4", source: "Google Calendar", location: "Science lab 204", brief: "Observe the reactions at each station and record the evidence in your lab notebook." },
    { id: "chemistry", day: days[4], title: "Reaction lab notes", subject: "Chemistry", kind: "deadline", time: "15:30", minutes: 20, status: "Ready to submit", image: art("chemistry"), imageAlt: "Colorful solutions and laboratory glassware", color: "#68def4", source: "Canvas", brief: "Your lab notes are complete. Review the observations and attached diagrams before confirming submission." },
    { id: "history", day: days[4], title: "Reading the archive", subject: "World History", kind: "deadline", time: "23:59", minutes: 40, status: "Not started", image: art("history"), imageAlt: "Historical photographs and source documents in an archive", color: "#ffcf7c", source: "Google Classroom", brief: "Compare two primary sources. Explain each author's perspective and support your comparison with evidence." },
    { id: "media", day: days[5], title: "A story in three frames", subject: "Digital Media", kind: "deadline", time: "17:00", minutes: 30, status: "In progress", image: art("computer-science"), imageAlt: "Electronic components and a computer processor", color: "#b8e47d", source: "Canvas", brief: "Create a three-frame visual sequence with a clear beginning, middle, and end." },
  ];
}
