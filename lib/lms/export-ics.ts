export type CalendarAssignment = {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  classes?: { name: string | null } | null;
};

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

export function formatIcsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildAssignmentsIcs(
  assignments: CalendarAssignment[],
  opts: { now?: Date; productId?: string } = {},
): string {
  const nowStamp = formatIcsDate((opts.now ?? new Date()).toISOString());
  const productId = opts.productId ?? "-//Diana//Due Dates//EN";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${productId}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const assignment of assignments) {
    if (!assignment.due_at) continue;
    const due = formatIcsDate(assignment.due_at);
    const description = [
      assignment.classes?.name ? `Class: ${assignment.classes.name}` : "",
      assignment.description ?? "",
    ].filter(Boolean).join("\n\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeIcsText(`${assignment.id}@diana`)}`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART:${due}`,
      `SUMMARY:${escapeIcsText(assignment.title)}`,
      `DESCRIPTION:${escapeIcsText(description || "Diana assignment due date")}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
