// Weekly parent digest — the growth story, delivered.
//
// Same rules as every parent surface: trajectory over snapshots, no grades,
// no assignment names, no comparisons, a dip is a rhythm. One short email a
// week, student-controlled (the student enters and can remove the address).

import type { GrowthStory } from "@/lib/portal/growth";

export type WeekStats = {
  completedThisWeek: number;
  minutesThisWeek: number;
  upcomingNext7Days: number;
};

export type DigestEmail = {
  subject: string;
  text: string;
  html: string;
};

export function buildParentDigestEmail(input: {
  studentName: string;
  story: GrowthStory;
  stats: WeekStats;
}): DigestEmail {
  const name = input.studentName.trim() || "Your student";
  const subject = `${name}'s week with Diana — ${input.story.headline}`;

  const statLines = [
    `${input.stats.completedThisWeek} piece${input.stats.completedThisWeek === 1 ? "" : "s"} of work finished this week`,
    `${input.stats.minutesThisWeek} minutes of focused study time`,
    `${input.stats.upcomingNext7Days} thing${input.stats.upcomingNext7Days === 1 ? "" : "s"} coming up in the next 7 days`,
  ];

  const text = [
    `${input.story.headline}`,
    "",
    ...input.story.facts.map((fact) => `• ${fact}`),
    "",
    "This week:",
    ...statLines.map((line) => `• ${line}`),
    "",
    "What this email never includes: grades, assignment names, AI conversations, or comparisons to other students. It comes from real activity, and your student controls whether it's sent.",
  ].join("\n");

  const html = `
<div style="font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; max-width: 540px; margin: 0 auto; color: #0f172a;">
  <p style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #7c3aed; font-weight: 600;">✦ Diana — weekly note</p>
  <h1 style="font-size: 20px; margin: 8px 0 16px;">${escapeHtml(input.story.headline)}</h1>
  <ul style="padding-left: 18px; line-height: 1.7; margin: 0 0 20px;">
    ${input.story.facts.map((fact) => `<li>${escapeHtml(fact)}</li>`).join("\n    ")}
  </ul>
  <table style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">
    ${statLines
      .map(
        (line) =>
          `<tr><td style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px;">${escapeHtml(line)}</td></tr>`,
      )
      .join("\n    ")}
  </table>
  <p style="font-size: 12px; color: #64748b; line-height: 1.6;">
    This note never includes grades, assignment names, AI conversations, or comparisons to other
    students. It comes from real activity in Diana, and ${escapeHtml(name)} controls whether it's sent.
  </p>
</div>`.trim();

  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
