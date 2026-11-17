type CalendarView = "schedule" | "week" | "month";

function validDay(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(parsed.getTime())
    && parsed.toISOString().slice(0, 10) === value;
}

export function buildCalendarReturnHref({ day, view, item }: { day: string; view: CalendarView; item?: string }) {
  const query = new URLSearchParams();
  if (validDay(day)) query.set("day", day);
  if (["schedule", "week", "month"].includes(view)) query.set("view", view);
  if (item && /^[A-Za-z0-9@._:~-]{1,180}$/.test(item)) query.set("item", item);
  return `/calendar${query.size ? `?${query}` : ""}`;
}

export function safeCalendarReturnHref(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 600 || !/^\/calendar(?:\?|$)/.test(value)) return null;
  const url = new URL(value, "https://diana.invalid");
  if (url.pathname !== "/calendar" || url.hash || url.origin !== "https://diana.invalid") return null;
  const day = url.searchParams.get("day");
  const view = url.searchParams.get("view");
  const item = url.searchParams.get("item");
  if ((day && !validDay(day)) || (view && !["schedule", "week", "month"].includes(view))
    || (item && !/^[A-Za-z0-9@._:~-]{1,180}$/.test(item))) return null;
  const query = new URLSearchParams();
  if (day) query.set("day", day);
  if (view) query.set("view", view);
  if (item) query.set("item", item);
  return `/calendar${query.size ? `?${query}` : ""}`;
}

export function withCalendarReturn(href: string, returnTo: unknown) {
  const calendar = safeCalendarReturnHref(returnTo);
  if (!calendar) return href;
  const url = new URL(href, "https://diana.invalid");
  if (url.origin !== "https://diana.invalid") return href;
  url.searchParams.set("calendarReturn", calendar);
  return `${url.pathname}${url.search}${url.hash}`;
}
