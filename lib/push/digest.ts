// Daily push digest — what is worth interrupting a student's day for.
//
// Push is the most intrusive surface Diana has, so the bar is high: at most
// one notification per day, only when something concrete is on deck, always
// calm. Pure logic; the cron route feeds it real data per student.

import { looksLikeTest } from "@/lib/test-prep/plan";

export type DigestAssignment = {
  title: string;
  kind: string | null;
  due_at: string | null;
};

export type PushDigest = {
  title: string;
  body: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * One calm notification for today, or null when silence is right.
 * Priority: a test soon beats due work; nothing on deck means no push.
 */
export function buildDailyDigest(assignments: DigestAssignment[], now: Date): PushDigest | null {
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const daysOut = (dueAt: string) =>
    Math.round(
      (new Date(new Date(dueAt).getFullYear(), new Date(dueAt).getMonth(), new Date(dueAt).getDate()).getTime() -
        dayStart.getTime()) /
        MS_PER_DAY,
    );

  const upcomingTests = assignments
    .filter((a) => a.due_at && looksLikeTest(a.title, a.kind))
    .map((a) => ({ ...a, days: daysOut(a.due_at as string) }))
    .filter((a) => a.days >= 0 && a.days <= 3)
    .sort((a, b) => a.days - b.days);

  if (upcomingTests.length > 0) {
    const test = upcomingTests[0];
    const when = test.days === 0 ? "today" : test.days === 1 ? "tomorrow" : `in ${test.days} days`;
    return {
      title: `${test.title} is ${when}`,
      body:
        test.days === 0
          ? "Light recall only today: your cards once through, then trust your prep."
          : "Your prep plan has one move for today. Ten minutes counts.",
    };
  }

  const dueToday = assignments.filter((a) => a.due_at && daysOut(a.due_at as string) === 0);
  if (dueToday.length > 0) {
    const first = dueToday[0];
    return {
      title: dueToday.length === 1 ? `${first.title} is due today` : `${dueToday.length} things are due today`,
      body: "Diana has your next five minutes ready when you are.",
    };
  }

  return null;
}
