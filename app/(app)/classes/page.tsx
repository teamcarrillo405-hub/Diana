import { BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClassForm } from "./class-form";
import { AppTopNav } from "../app-top-nav";
import { MyClassesGrid, type ClassCardModel, type CtaVariant } from "./my-classes-grid";

const SF = "var(--font-saira-condensed), 'Saira Condensed', sans-serif";
const BODY = "var(--font-body)";

type ClassRow = { id: string; name: string; created_at: string };
type AssignmentRow = {
  id: string;
  title: string;
  class_id: string | null;
  status: string;
  due_at: string | null;
  estimated_minutes: number | null;
  kind: string;
};

const CLOSED = ["submitted", "graded", "abandoned"];

function dueMs(value: string | null) {
  return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;
}

function dueShort(iso: string) {
  return new Date(iso)
    .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    .replace(",", "")
    .toUpperCase();
}

function deriveCard(
  cls: ClassRow,
  assignments: AssignmentRow[],
  tookMin: Map<string, number>,
  now: Date,
): { card: ClassCardModel; urgency: number; dueEarlierCount: number; notTurnedInCount: number } {
  const mine = assignments.filter((a) => a.class_id === cls.id);
  const open = mine.filter((a) => !CLOSED.includes(a.status));
  const byDue = [...open].sort((a, b) => dueMs(a.due_at) - dueMs(b.due_at));
  const dueEarlier = byDue.filter((a) => a.due_at && new Date(a.due_at).getTime() < now.getTime());
  const doneNotSubmitted = open.find((a) => a.status === "exporting") ?? null;
  const recentDone = [...mine.filter((a) => a.status === "submitted" || a.status === "graded")].sort(
    (a, b) => dueMs(b.due_at) - dueMs(a.due_at),
  )[0] ?? null;

  // Upcoming quiz/test in the next week → quiz row.
  const quizSoon = byDue.find((a) => {
    if (a.kind !== "test_prep" || !a.due_at) return false;
    const days = (new Date(a.due_at).getTime() - now.getTime()) / 86_400_000;
    return days >= -0.5 && days <= 7;
  });
  const quiz = quizSoon
    ? (() => {
        const days = Math.round((new Date(quizSoon.due_at!).getTime() - now.getTime()) / 86_400_000);
        const label = days <= 0 ? "Quiz today" : days === 1 ? "Quiz tomorrow" : `Quiz in ${days} days`;
        return { label, flashcardsHref: "/flashcards", quizHref: "/flashcards" };
      })()
    : null;

  const base = { id: cls.id, name: cls.name, eventPill: null as string | null, quiz, href: `/classes/${cls.id}` };

  // No work at all.
  if (open.length === 0 && !recentDone) {
    return {
      card: { ...base, statusLabel: "No work yet", statusTone: "muted", isNow: false, taskTitle: null, taskBadge: null, doneBar: false, timeLabel: null, progressPct: 0, cta: { label: "Open class", href: `/classes/${cls.id}`, variant: "cyanOutline" } },
      urgency: 0, dueEarlierCount: 0, notTurnedInCount: 0,
    };
  }

  // Done, not turned in.
  if (doneNotSubmitted) {
    const took = tookMin.get(doneNotSubmitted.id) ?? 0;
    return {
      card: {
        ...base,
        statusLabel: "Not turned in",
        statusTone: "muted",
        isNow: false,
        taskTitle: doneNotSubmitted.title,
        taskBadge: doneNotSubmitted.due_at ? { text: dueShort(doneNotSubmitted.due_at), tone: "neutral" } : null,
        doneBar: true,
        timeLabel: took > 0 ? `took ${took} min` : null,
        progressPct: 100,
        cta: { label: "Turn in now", href: `/assignments/${doneNotSubmitted.id}/submit`, variant: "goldFilled" },
      },
      urgency: 4, dueEarlierCount: 0, notTurnedInCount: 1,
    };
  }

  // Has open work → in progress or not started.
  if (open.length > 0) {
    const focus = dueEarlier[0] ?? byDue[0];
    const dueDatePassed = Boolean(focus.due_at && new Date(focus.due_at).getTime() < now.getTime());
    const started = focus.status === "drafting" || focus.status === "checking";
    const dueSoon = Boolean(focus.due_at && (new Date(focus.due_at).getTime() - now.getTime()) / 86_400_000 <= 2);
    const cta = started
      ? dueDatePassed || dueSoon
        ? { label: "Open now", href: `/assignments/${focus.id}?focus=next-step`, variant: "cyanFilled" as const }
        : { label: "Continue", href: `/assignments/${focus.id}?focus=next-step`, variant: "cyanOutline" as const }
      : { label: "Start now", href: `/assignments/${focus.id}?focus=next-step`, variant: (dueDatePassed ? "goldFilled" : "cyanFilled") as CtaVariant };
    return {
      card: {
        ...base,
        statusLabel: started ? "In progress" : "Not started",
        statusTone: "cyan",
        isNow: false,
        taskTitle: focus.title,
        taskBadge: dueDatePassed ? { text: "Needs review", tone: "dueEarlier" } : focus.due_at ? { text: dueShort(focus.due_at), tone: "neutral" } : null,
        doneBar: false,
        timeLabel: focus.estimated_minutes ? `est. ${focus.estimated_minutes} min` : null,
        progressPct: started ? 55 : 0,
        cta,
      },
      urgency: dueDatePassed ? 3 : dueSoon ? 2 : 1,
      dueEarlierCount: dueEarlier.length,
      notTurnedInCount: 0,
    };
  }

  // Everything turned in.
  const took = recentDone ? tookMin.get(recentDone.id) ?? 0 : 0;
  return {
    card: {
      ...base,
      statusLabel: "Turned in",
      statusTone: "muted",
      isNow: false,
      taskTitle: recentDone?.title ?? null,
      taskBadge: { text: "Done ✓", tone: "done" },
      doneBar: true,
      timeLabel: took > 0 ? `took ${took} min` : null,
      progressPct: 100,
      cta: { label: "Review", href: recentDone ? `/assignments/${recentDone.id}` : `/classes/${cls.id}`, variant: "dark" },
    },
    urgency: 0, dueEarlierCount: 0, notTurnedInCount: 0,
  };
}

export default async function ClassesPage() {
  const supabase = await createClient();
  const now = new Date();

  const [{ data: classes }, { data: assignments }, { data: logs }] = await Promise.all([
    supabase.from("classes").select("id, name, created_at").is("archived_at", null).order("created_at", { ascending: false }),
    supabase
      .from("assignments")
      .select("id, title, class_id, status, due_at, estimated_minutes, kind")
      .not("class_id", "is", null)
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase.from("assignment_time_log").select("assignment_id, started_at, ended_at").not("ended_at", "is", null),
  ]);

  const classRows = (classes ?? []) as ClassRow[];
  const assignmentRows = (assignments ?? []) as AssignmentRow[];

  const tookMin = new Map<string, number>();
  for (const log of (logs ?? []) as { assignment_id: string | null; started_at: string | null; ended_at: string | null }[]) {
    if (!log.assignment_id || !log.started_at || !log.ended_at) continue;
    const mins = Math.max(0, Math.round((new Date(log.ended_at).getTime() - new Date(log.started_at).getTime()) / 60000));
    tookMin.set(log.assignment_id, (tookMin.get(log.assignment_id) ?? 0) + mins);
  }

  const derived = classRows.map((c) => deriveCard(c, assignmentRows, tookMin, now));

  // Mark the single most-urgent class as the "Now" focal card.
  let nowIdx = -1;
  let bestUrgency = 0;
  derived.forEach((d, i) => {
    if (d.urgency > bestUrgency) {
      bestUrgency = d.urgency;
      nowIdx = i;
    }
  });
  if (nowIdx >= 0) derived[nowIdx].card.isNow = true;

  const cards = derived.map((d) => d.card);
  const dueEarlierCount = derived.reduce((s, d) => s + d.dueEarlierCount, 0);
  const notTurnedInCount = derived.reduce((s, d) => s + d.notTurnedInCount, 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--gl-bg-base)", color: "var(--gl-text-primary)" }}>
      <AppTopNav active="Classes" />
      <div style={{ maxWidth: "var(--layout-max-width)", margin: "0 auto", padding: "var(--space-17) var(--space-17) var(--space-24)", display: "grid", gap: "var(--space-17)" }}>
        {cards.length === 0 ? (
          <div style={{ display: "grid", gap: "var(--space-12)" }}>
            <h1 style={{ margin: 0, fontFamily: SF, fontWeight: 800, fontSize: 30, letterSpacing: ".02em", textTransform: "uppercase", color: "var(--gl-text-primary)" }}>My Classes</h1>
            <div style={{ borderRadius: 16, border: "1px dashed var(--gl-border-neutral)", padding: "44px 24px", textAlign: "center", display: "grid", gap: "var(--space-5)" }}>
              <span style={{ fontFamily: SF, fontWeight: 800, fontSize: 22, textTransform: "uppercase", color: "var(--gl-text-primary)" }}>Add your first class</span>
              <span style={{ fontFamily: BODY, fontSize: 14, color: "var(--gl-text-secondary)" }}>Set up a class so Diana can organize your work, notes, and grades by subject.</span>
            </div>
          </div>
        ) : (
          <MyClassesGrid cards={cards} dueEarlierCount={dueEarlierCount} notTurnedInCount={notTurnedInCount} />
        )}

        {/* Add a class */}
        <details style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", padding: "var(--space-12) var(--space-14)" }}>
          <summary style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "var(--space-4)", fontFamily: BODY, fontSize: "var(--text-12)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-12)", textTransform: "uppercase", color: "var(--gl-cyan)" }}>
            <BookOpen size={14} />
            Add a class
          </summary>
          <div style={{ marginTop: "var(--space-10)" }}>
            <ClassForm />
          </div>
        </details>
      </div>
    </div>
  );
}
