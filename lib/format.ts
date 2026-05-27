import { formatDistanceToNowStrict, isToday, isTomorrow, format } from "date-fns";

export function formatDueAt(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const past = d.getTime() < now.getTime();
  if (past) {
    return `Was due ${formatDistanceToNowStrict(d, { addSuffix: true })}`;
  }
  if (isToday(d)) return `Due today, ${format(d, "h:mm a")}`;
  if (isTomorrow(d)) return `Due tomorrow, ${format(d, "h:mm a")}`;
  return `Due ${format(d, "EEE MMM d")}`;
}
