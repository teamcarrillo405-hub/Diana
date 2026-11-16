import { redirect } from "next/navigation";

import { loadProfile } from "@/lib/profile";
import { rankAssignments } from "@/lib/scoring/next-five-minutes";
import { createClient } from "@/lib/supabase/server";
import type { AssignmentKind, AssignmentStatus } from "@/lib/supabase/types";
import {
  WorkCommandCenter,
  type WorkCommandItem,
} from "./work-command-center";

type AssignmentRow = {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  status: AssignmentStatus;
  estimated_minutes: number | null;
  difficulty: number | null;
  class_id: string;
  kind: AssignmentKind;
  reading_load: number;
  writing_load: number;
  classes: { name: string; color: string | null } | null;
};

type RankedAssignment = AssignmentRow & {
  score: number;
  reasons: string[];
  effective_minutes: number | null;
};

export default async function AssignmentsPage({ searchParams }: { searchParams: Promise<{ view?: string; return?: string }> }) {
  const { view, return: returnToBoard } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await loadProfile();
  const fixedNow = new Date();
  const fourHoursAgoIso = new Date(
    fixedNow.getTime() - 4 * 60 * 60 * 1000,
  ).toISOString();
  const [{ data: assignments, error: assignmentsError }, { data: signals }, captures] =
    await Promise.all([
      supabase
        .from("assignments")
        .select(
          "id, title, description, due_at, status, estimated_minutes, difficulty, class_id, kind, reading_load, writing_load, classes(name, color)",
        )
        .eq("owner_id", user.id)
        .neq("status", "abandoned")
        .order("due_at", { ascending: true, nullsFirst: false }),
      supabase
        .from("task_signals")
        .select("assignment_id, occurred_at")
        .eq("owner_id", user.id)
        .in("kind", ["started", "completed"])
        .gte("occurred_at", fourHoursAgoIso)
        .order("occurred_at", { ascending: false }),
      supabase.from("inbox_items").select("id",{count:"exact",head:true}).eq("owner_id",user.id).in("status",["unclassified","classified"]),
    ]);

  const rows = (assignments ?? []) as AssignmentRow[];
  const recentSignals = (signals ?? []).filter(
    (signal): signal is { assignment_id: string; occurred_at: string } =>
      signal.assignment_id !== null,
  );
  const ranked = rankAssignments(
    rows,
    recentSignals,
    fixedNow,
    "medium",
    {
      diagnoses: profile?.diagnoses ?? [],
      extra_time_pct: profile?.extra_time_pct ?? 0,
    },
  ) as RankedAssignment[];
  const collection = [...ranked, ...rows.filter(assignment => ["submitted", "graded"].includes(assignment.status))];

  return (
    <WorkCommandCenter
      initialCategory={view === "review" || view === "ready" || view === "submitted" ? view : "active"}
      studentId={user.id}
      restoreContext={!view && returnToBoard === "1"}
      schoolName={profile?.school_name}
      captureCount={captures.count ?? 0}
      assignments={collection.map(
        (assignment): WorkCommandItem => ({
          id: assignment.id,
          title: assignment.title,
          description: assignment.description,
          className: assignment.classes?.name ?? "Class",
          classColor: safeClassColor(assignment.classes?.color),
          dueAt: assignment.due_at,
          minutes: workMinutes(assignment as RankedAssignment),
          kind: assignment.kind,
          status: assignment.status,
          reasons: "reasons" in assignment ? (assignment as RankedAssignment).reasons : [],
        }),
      )}
      displayName={profile?.display_name}
      photoUrl={profile?.photo_url}
      photoOffsetX={profile?.photo_offset_x}
      photoOffsetY={profile?.photo_offset_y}
      nowIso={fixedNow.toISOString()}
      timeZone={profile?.timezone || "America/Los_Angeles"}
      unavailable={Boolean(assignmentsError)}
    />
  );
}

function workMinutes(assignment: RankedAssignment) {
  const minutes = assignment.effective_minutes ?? assignment.estimated_minutes;
  return typeof minutes === "number" && Number.isFinite(minutes) && minutes > 0
    ? Math.max(1, Math.round(minutes))
    : null;
}

function safeClassColor(value: string | null | undefined) {
  return value && /^#[\da-f]{6}$/iu.test(value) ? value : "#8b96bd";
}
