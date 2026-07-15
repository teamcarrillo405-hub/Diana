// "Needs attention" — the 4-category rollup on the Student Lobby (locked design,
// handoff_for_claude_code/designs/Student Lobby.dc.html §4). Categories, accents,
// and empty-state copy are pixel-locked; the underlying data source is real:
//   - Quizzes & tests: assignments with kind "test_prep" due in the future
//   - Overdue: assignments past due_at that aren't submitted/graded/abandoned
//   - Not turned in: assignments in the checking/exporting finishing stages
//   - Feedback: teacher notes left in the last 7 days
import type { Assignment } from "@/lib/scoring/next-five-minutes";

export type NeedsAttentionItem = {
  id: string;
  title: string;
  meta: string;
  when: string;
  href: string;
};

export type NeedsAttentionCategory = {
  key: "tests" | "due_earlier" | "not_turned_in" | "feedback";
  label: string;
  accent: string;
  soft: string;
  emptyMsg: string;
  items: NeedsAttentionItem[];
};

export type FeedbackNote = {
  id: string;
  note_text: string;
  created_at: string;
  assignment_id: string | null;
  assignments: { title: string } | { title: string }[] | null;
};

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function classNameOf(a: Assignment): string | null {
  const c = a.classes;
  if (!c) return null;
  if (Array.isArray(c)) return c[0]?.name ?? null;
  return c.name ?? null;
}

function relatedTitle(row: FeedbackNote): string {
  const a = row.assignments;
  if (!a) return "General note";
  return Array.isArray(a) ? (a[0]?.title ?? "General note") : (a.title ?? "General note");
}

function daysAgoLabel(iso: string, now: Date): string {
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "TODAY";
  if (days === 1) return "1D AGO";
  return `${days}D AGO`;
}

export function buildNeedsAttention(
  assignments: Assignment[],
  feedbackNotes: FeedbackNote[],
  now: Date,
): NeedsAttentionCategory[] {
  const tests = assignments
    .filter((a) => a.kind === "test_prep" && a.due_at && new Date(a.due_at) >= now)
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());

  const dueEarlier = assignments
    .filter((a) => a.due_at && new Date(a.due_at) < now)
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());

  const notTurnedIn = assignments.filter((a) => a.status === "checking" || a.status === "exporting");

  return [
    {
      key: "tests",
      label: "Quizzes & tests",
      accent: "#b79bff",
      soft: "rgba(167,139,250,.45)",
      emptyMsg: "Nothing coming up",
      items: tests.map((a) => {
        const due = new Date(a.due_at!);
        return {
          id: a.id,
          title: a.title,
          meta: classNameOf(a) ?? "Test prep",
          when: WEEKDAYS[due.getDay()],
          href: `/assignments/${a.id}`,
        };
      }),
    },
    {
      key: "due_earlier",
      label: "Due earlier",
      accent: "#e8b85d",
      soft: "rgba(232,184,93,.45)",
      emptyMsg: "Nothing needs review",
      items: dueEarlier.map((a) => {
        const days = Math.max(1, Math.floor((now.getTime() - new Date(a.due_at!).getTime()) / 86400000));
        return {
          id: a.id,
          title: a.title,
          meta: classNameOf(a) ?? "Assignment",
          when: days === 1 ? "1 DAY" : `${days} DAYS`,
          href: `/assignments/${a.id}`,
        };
      }),
    },
    {
      key: "not_turned_in",
      label: "Not turned in",
      accent: "#ffd24a",
      soft: "rgba(255,210,74,.45)",
      emptyMsg: "All submitted",
      items: notTurnedIn.map((a) => ({
        id: a.id,
        title: a.title,
        meta: classNameOf(a) ?? "Assignment",
        when: "READY",
        href: `/assignments/${a.id}`,
      })),
    },
    {
      key: "feedback",
      label: "Feedback",
      accent: "#4be08e",
      soft: "rgba(54,224,122,.45)",
      emptyMsg: "No new feedback",
      items: feedbackNotes.map((row) => ({
        id: row.id,
        title: relatedTitle(row),
        meta: row.note_text.length > 72 ? `${row.note_text.slice(0, 72)}…` : row.note_text,
        when: daysAgoLabel(row.created_at, now),
        href: row.assignment_id ? `/assignments/${row.assignment_id}` : "/messages",
      })),
    },
  ];
}
