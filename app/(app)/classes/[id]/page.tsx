import Link from "next/link";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  ClipboardCheck,
  ExternalLink,
  GraduationCap,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { deriveConceptSeeds, gapBridgeSuggestion, isWeakConceptName } from "@/lib/mastery/concepts";
import { formatDueAt } from "@/lib/format";
import { fetchCanvasGrades, fetchCanvasCourseScores } from "@/lib/lms/canvas";
import { gradeInsights, type CourseGradeSnapshot } from "@/lib/grades/insights";
import { RubricForm } from "./rubric-form";
import { openStaxForClassName } from "@/lib/content/openstax";
import { MasteryPanel, type MasteryConceptView } from "./mastery-panel";
import { AppTopNav } from "../../app-top-nav";
import { classTheme } from "../../dashboard/classes-grid";

const SF = "var(--font-display)";
const BODY = "var(--font-body)";

type ClassAssignment = {
  id: string;
  title: string;
  status: string;
  due_at: string | null;
};

type ClassRubric = {
  id: string;
  title: string;
  parse_status: string | null;
  created_at: string;
};

function dueMs(value: string | null) {
  return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;
}

function rubricStatus(status: string | null) {
  if (status === "parsed") return "parsed rulebrick";
  if (status === "manual" || status === "parse_issue") return "saved as text";
  return "processing";
}

function assignmentStatusLabel(status: string) {
  if (status === "todo") return "Ready";
  if (status === "planned") return "Planned";
  if (status === "in_progress") return "In motion";
  if (status === "done") return "Done";
  if (status === "submitted") return "Submitted";
  if (status === "graded") return "Graded";
  return status.replaceAll("_", " ");
}

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: cls } = await supabase
    .from("classes")
    .select("id, name, teacher, color, notes, ai_mode")
    .eq("id", id)
    .single();
  if (!cls) notFound();

  const [{ data: rubrics }, { data: assignments }, { data: lmsConnections }] = await Promise.all([
    supabase
      .from("rubrics")
      .select("id, title, parse_status, created_at")
      .eq("class_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("assignments")
      .select("id, title, status, due_at")
      .eq("class_id", id)
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("lms_connections")
      .select("config")
      .eq("provider", "canvas")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  type CanvasConfig = { base_url: string; token: string };
  const canvasConfig = (lmsConnections?.[0]?.config ?? null) as CanvasConfig | null;
  let classGrade: CourseGradeSnapshot | null = null;
  if (canvasConfig?.base_url && canvasConfig?.token) {
    try {
      const [records, courseScores] = await Promise.all([
        fetchCanvasGrades(canvasConfig),
        fetchCanvasCourseScores(canvasConfig),
      ]);
      const { courses } = gradeInsights(records, courseScores);
      const nameLower = cls.name.toLowerCase();
      classGrade = courses.find((s) =>
        s.courseName.toLowerCase().includes(nameLower) || nameLower.includes(s.courseName.toLowerCase())
      ) ?? null;
    } catch {
      // Canvas unavailable — skip grade panel
    }
  }
  const classRubrics = (rubrics ?? []) as ClassRubric[];
  const classAssignments = (assignments ?? []) as ClassAssignment[];
  const openAssignments = classAssignments.filter((a) => !["submitted", "graded", "abandoned"].includes(a.status));
  const nextAssignment = openAssignments.slice().sort((a, b) => dueMs(a.due_at) - dueMs(b.due_at))[0] ?? null;
  const concepts = user ? await ensureClassConcepts(supabase, user.id, id, cls.name, cls.teacher) : [];
  const reviewNext = concepts
    .slice()
    .sort((a, b) => Number(a.mastery_level) - Number(b.mastery_level) || a.name.localeCompare(b.name))[0] ?? null;
  const strongest = concepts
    .slice()
    .sort((a, b) => Number(b.mastery_level) - Number(a.mastery_level))[0] ?? null;
  const bridge = reviewNext ? gapBridgeSuggestion(strongest?.name ?? null, reviewNext.name) : "";
  const books = openStaxForClassName(cls.name);
  const theme = classTheme({ id: cls.id, name: cls.name, color: cls.color });

  return (
    <div style={{ minHeight: "100vh", background: "var(--gl-bg-base)", color: "var(--gl-text-primary)" }}>
      <AppTopNav active="Today" />
      <style>{`
        .cd-hero { display: grid; gap: var(--space-13); }
        @media (min-width: 1024px) { .cd-hero { grid-template-columns: 1.2fr 0.8fr; align-items: start; } }
        .cd-panels { display: grid; gap: var(--space-9); }
        @media (min-width: 1024px) { .cd-panels { grid-template-columns: 1fr 1fr; } }
        .cd-resource-grid { display: grid; gap: var(--space-9); grid-template-columns: 1fr 1fr; }
        @media (max-width: 640px) { .cd-resource-grid { grid-template-columns: 1fr; } }
      `}</style>
      <div style={{ maxWidth: "var(--layout-max-width)", margin: "0 auto", padding: "var(--space-17) var(--space-17) var(--space-24)", display: "grid", gap: "var(--space-17)" }}>

        {/* Hero */}
        <section className="cd-hero">
          <header style={{ display: "grid", gap: "var(--space-8)" }}>
            <Link href="/classes" style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-4)", fontFamily: BODY, fontSize: "var(--text-12)", fontWeight: "var(--weight-600)", color: "var(--gl-text-muted)", textDecoration: "none" }}>
              <ArrowLeft size={13} />
              All classes
            </Link>
            <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: theme.accent, margin: 0, display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <SlidersHorizontal size={13} />
              Class lane
            </p>
            <h1 style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-50)", lineHeight: "var(--leading-tight)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0, maxWidth: "20ch" }}>
              {cls.name}
            </h1>
            <p style={{ fontFamily: BODY, fontSize: "var(--text-16)", lineHeight: "var(--leading-body)", color: "var(--gl-text-secondary)", maxWidth: "44ch", margin: 0 }}>
              {cls.teacher ? `${cls.teacher} · ` : ""}Teacher rules, mastery gaps, homework, and sources stay attached to this subject.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-6)" }}>
              <Link
                href={`/classes/${id}/settings`}
                style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-5)", padding: "var(--space-9) var(--space-14)", borderRadius: "var(--radius-pill)", border: "1px solid var(--gl-border-neutral)", color: "var(--gl-text-secondary)", fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-13)", textDecoration: "none" }}
              >
                AI mode: {cls.ai_mode ?? "green"}
              </Link>
              {nextAssignment && (
                <Link
                  href={`/assignments/${nextAssignment.id}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-5)", padding: "var(--space-9) var(--space-14)", borderRadius: "var(--radius-pill)", background: theme.accent, color: "#04080f", fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-13)", textDecoration: "none" }}
                >
                  Open next work
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </header>

          {/* Metrics panel */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-9)" }}>
            {[
              { label: "Open work", value: openAssignments.length, detail: "in this lane" },
              { label: "Rulebricks", value: classRubrics.length, detail: "teacher rules" },
              { label: "Concepts", value: concepts.length, detail: "mastery map" },
              { label: "Sources", value: books.length, detail: "free texts" },
            ].map((m) => (
              <div key={m.label} style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", padding: "var(--space-12)" }}>
                <p style={{ fontFamily: BODY, fontSize: "var(--text-10)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-text-muted)", margin: "0 0 var(--space-3)" }}>{m.label}</p>
                <p style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-36)", lineHeight: 1, color: "var(--gl-text-primary)", margin: "0 0 var(--space-2)" }}>{m.value}</p>
                <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", color: "var(--gl-text-muted)", margin: 0 }}>{m.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Next in lane + rulebricks panels */}
        <div className="cd-panels">
          {/* Next in lane */}
          <div style={{ borderRadius: "var(--radius-card)", border: `1px solid ${theme.accent}44`, background: "var(--gl-bg-card)", padding: "var(--space-14)", display: "grid", gap: "var(--space-9)", alignContent: "start" }}>
            <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: theme.accent, margin: 0, display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <SlidersHorizontal size={13} />
              Next in this lane
            </p>
            {nextAssignment ? (
              <div style={{ display: "grid", gap: "var(--space-6)" }}>
                <h2 style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-28)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0 }}>{nextAssignment.title}</h2>
                <p style={{ fontFamily: BODY, fontSize: "var(--text-13)", color: "var(--gl-text-muted)", margin: 0 }}>
                  {nextAssignment.due_at ? formatDueAt(nextAssignment.due_at) : "No due date"} · {nextAssignment.status}
                </p>
                <Link
                  href={`/assignments/${nextAssignment.id}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-5)", padding: "var(--space-9) var(--space-14)", borderRadius: "var(--radius-pill)", background: theme.accent, color: "#04080f", fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-13)", textDecoration: "none", width: "fit-content" }}
                >
                  Open assignment
                  <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <div style={{ borderRadius: "var(--radius-card)", border: "1px dashed var(--gl-border-neutral)", padding: "var(--space-14)", display: "grid", gap: "var(--space-5)" }}>
                <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-text-muted)", margin: 0 }}>Clear lane</p>
                <p style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-22)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0 }}>No open schoolwork.</p>
                <p style={{ fontFamily: BODY, fontSize: "var(--text-13)", color: "var(--gl-text-secondary)", margin: 0 }}>When a teacher adds something, it will show up here with this class context.</p>
              </div>
            )}
          </div>

          {/* Rulebricks panel */}
          <div style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", padding: "var(--space-14)", display: "grid", gap: "var(--space-9)", alignContent: "start" }}>
            <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-gold)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <ClipboardCheck size={13} />
              Rulebricks
            </p>
            {classRubrics.length === 0 ? (
              <p style={{ fontFamily: BODY, fontSize: "var(--text-14)", color: "var(--gl-text-muted)", margin: 0 }}>
                Paste the teacher rubric below so Diana can turn expectations into checkable moves.
              </p>
            ) : (
              <div style={{ display: "grid", gap: "var(--space-6)" }}>
                {classRubrics.map((rubric) => (
                  <div key={rubric.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-8)", padding: "var(--space-9) var(--space-10)", borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-base)" }}>
                    <span style={{ fontFamily: BODY, fontWeight: "var(--weight-600)", fontSize: "var(--text-13)", color: "var(--gl-text-primary)" }}>{rubric.title}</span>
                    <span style={{ fontFamily: BODY, fontSize: "var(--text-11)", color: "var(--gl-text-muted)", whiteSpace: "nowrap" }}>{rubricStatus(rubric.parse_status)}</span>
                  </div>
                ))}
              </div>
            )}
            <details open={classRubrics.length === 0} style={{ marginTop: "var(--space-4)" }}>
              <summary style={{ fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-13)", color: "var(--gl-gold)", cursor: "pointer" }}>
                {classRubrics.length === 0 ? "Add teacher rules" : "Add or update teacher rules"}
              </summary>
              <div style={{ marginTop: "var(--space-8)" }}>
                <RubricForm classId={id} />
              </div>
            </details>
          </div>
        </div>

        {/* Grade panel — shown when Canvas is connected and a matching course is found */}
        {classGrade && (
          <section style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-green-28, rgba(54,224,122,.28))", background: "var(--gl-green-08, rgba(54,224,122,.08))", padding: "var(--space-14)", display: "grid", gap: "var(--space-9)" }}>
            <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-green)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <GraduationCap size={13} />
              Current grade
            </p>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "var(--space-8)", flexWrap: "wrap" }}>
              <div>
                <p style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-50)", lineHeight: 1, color: "var(--gl-green)", margin: 0 }}>
                  {classGrade.currentScorePct !== null ? `${Math.round(classGrade.currentScorePct)}%` : "—"}
                </p>
                <p style={{ fontFamily: BODY, fontSize: "var(--text-13)", color: "var(--gl-text-secondary)", margin: "var(--space-3) 0 0" }}>
                  {classGrade.gradedCount} graded item{classGrade.gradedCount === 1 ? "" : "s"} ·{" "}
                  {classGrade.trend === "rising" ? "trending up" : classGrade.trend === "settling" ? "dipping slightly" : "holding steady"}
                </p>
              </div>
              <Link
                href="/grades"
                style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-5)", padding: "var(--space-9) var(--space-14)", borderRadius: "var(--radius-pill)", border: "1px solid var(--gl-green-28, rgba(54,224,122,.28))", color: "var(--gl-green)", fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-13)", textDecoration: "none" }}
              >
                Full grade view
                <ArrowRight size={13} />
              </Link>
            </div>
          </section>
        )}

        {/* Mastery panel — client component */}
        {concepts.length > 0 && (
          <MasteryPanel
            classId={id}
            concepts={concepts}
            reviewNext={reviewNext}
            bridge={bridge}
          />
        )}

        {/* Free sources */}
        {books.length > 0 && (
          <section style={{ display: "grid", gap: "var(--space-12)" }}>
            <div style={{ display: "grid", gap: "var(--space-6)" }}>
              <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-purple-light)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <BookOpenCheck size={13} />
                Free source lane
              </p>
              <h2 style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-28)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0 }}>
                Use real sources when this class needs proof.
              </h2>
              <p style={{ fontFamily: BODY, fontSize: "var(--text-14)", color: "var(--gl-text-secondary)", margin: 0 }}>
                OpenStax stays attached here for study, citations, and source-backed notes.
              </p>
            </div>
            <div className="cd-resource-grid">
              {books.map((book) => (
                <a
                  key={book.url}
                  href={book.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "grid", gap: "var(--space-5)", borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", padding: "var(--space-14)", textDecoration: "none" }}
                >
                  <span style={{ fontFamily: BODY, fontSize: "var(--text-10)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-12)", textTransform: "uppercase", color: "var(--gl-purple-light)" }}>OpenStax</span>
                  <strong style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-20)", textTransform: "uppercase", color: "var(--gl-text-primary)" }}>{book.title}</strong>
                  <em style={{ fontFamily: BODY, fontSize: "var(--text-12)", color: "var(--gl-text-muted)", fontStyle: "normal" }}>Citable source</em>
                  <ExternalLink size={14} style={{ color: "var(--gl-purple-light)" }} />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Assignment list */}
        <section style={{ display: "grid", gap: "var(--space-12)" }}>
          <div style={{ display: "grid", gap: "var(--space-6)" }}>
            <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-text-muted)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <GraduationCap size={13} />
              Assignments in this class
            </p>
            <h2 style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-28)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0 }}>
              Everything connected to {cls.name}.
            </h2>
            <p style={{ fontFamily: BODY, fontSize: "var(--text-14)", color: "var(--gl-text-secondary)", margin: 0 }}>
              {classAssignments.length} saved item{classAssignments.length === 1 ? "" : "s"} connected to {cls.name}.
            </p>
          </div>
          {classAssignments.length === 0 ? (
            <div style={{ borderRadius: "var(--radius-card)", border: "1px dashed var(--gl-border-neutral)", padding: "var(--space-16)", display: "grid", gap: "var(--space-5)" }}>
              <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-text-muted)", margin: 0 }}>No work yet</p>
              <p style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-22)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0 }}>This lane is ready.</p>
              <p style={{ fontFamily: BODY, fontSize: "var(--text-14)", color: "var(--gl-text-secondary)", margin: 0 }}>Assignments will appear here when they are added or imported.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "var(--space-4)" }}>
              {classAssignments.map((assignment) => (
                <Link
                  key={assignment.id}
                  href={`/assignments/${assignment.id}`}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-8)", padding: "var(--space-10) var(--space-12)", borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", textDecoration: "none" }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "var(--space-5)", fontFamily: BODY, fontWeight: "var(--weight-600)", fontSize: "var(--text-14)", color: "var(--gl-text-primary)", minWidth: 0 }}>
                    <ShieldCheck size={14} style={{ color: theme.accent, flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{assignment.title}</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "var(--space-8)", flexShrink: 0 }}>
                    <span style={{ fontFamily: BODY, fontSize: "var(--text-12)", color: "var(--gl-text-muted)" }}>{assignmentStatusLabel(assignment.status)}</span>
                    <span style={{ fontFamily: BODY, fontSize: "var(--text-12)", color: "var(--gl-text-muted)" }}>{assignment.due_at ? formatDueAt(assignment.due_at) : "No due date"}</span>
                    <span style={{ fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-12)", color: theme.accent, display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                      Open <ArrowRight size={11} />
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

async function ensureClassConcepts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  classId: string,
  className: string,
  teacherName: string | null,
): Promise<MasteryConceptView[]> {
  const { data: existing } = await supabase
    .from("mastery_concepts")
    .select("id, name, mastery_level, self_confidence")
    .eq("owner_id", ownerId)
    .eq("class_id", classId)
    .order("mastery_level", { ascending: true });

  const [{ data: notes }, { data: assignments }, { data: rubrics }] = await Promise.all([
    supabase
      .from("notes")
      .select("title, body_text, transcript_text, tags, ai_suggested_tags")
      .eq("class_id", classId)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("assignments")
      .select("title, description, kind")
      .eq("class_id", classId)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("rubrics")
      .select("title, raw_text")
      .eq("class_id", classId)
      .order("updated_at", { ascending: false })
      .limit(10),
  ]);

  const parts = [
    className,
    ...(notes ?? []).flatMap((note) => [
      note.title,
      note.body_text,
      note.transcript_text ?? "",
      ...((note.tags ?? []) as string[]),
      ...((note.ai_suggested_tags ?? []) as string[]),
    ]),
    ...(assignments ?? []).flatMap((assignment) => [
      assignment.title,
      assignment.description ?? "",
      assignment.kind ?? "",
    ]),
    ...(rubrics ?? []).flatMap((rubric) => [rubric.title, rubric.raw_text ?? ""]),
  ];

  const existingNames = new Set((existing ?? []).map((concept) => concept.name.toLowerCase().trim()));
  const candidateSeeds = deriveConceptSeeds(parts, 5, { className, teacherName });
  const existingRows = (existing ?? []) as MasteryConceptView[];
  const seenStrong = new Set<string>();
  const weakSeededRows = existingRows
    .filter((concept) => {
      const normalizedName = concept.name.toLowerCase().trim();
      const weak = isWeakConceptName(concept.name, { className, teacherName });
      const duplicate = seenStrong.has(normalizedName);
      if (!weak && !duplicate) seenStrong.add(normalizedName);
      return weak || duplicate;
    })
    .slice(0, 5);

  if (weakSeededRows.length > 0) {
    const replacementNames = candidateSeeds.filter((name) => !existingNames.has(name.toLowerCase().trim())).slice(0, weakSeededRows.length);
    await Promise.all(
      weakSeededRows.map((concept, index) => {
        const name = replacementNames[index];
        if (!name) return Promise.resolve(null);
        existingNames.delete(concept.name.toLowerCase().trim());
        existingNames.add(name.toLowerCase().trim());
        return supabase
          .from("mastery_concepts")
          .update({ name, source: "seeded", updated_at: new Date().toISOString() })
          .eq("id", concept.id)
          .eq("owner_id", ownerId);
      }),
    );
  }

  const missing = candidateSeeds
    .filter((name) => !existingNames.has(name.toLowerCase().trim()))
    .slice(0, Math.max(0, 5 - (existing ?? []).length));

  if (missing.length > 0) {
    await supabase.from("mastery_concepts").insert(
      missing.map((name) => ({ owner_id: ownerId, class_id: classId, name, source: "seeded" })),
    );
  }

  const { data: next } = await supabase
    .from("mastery_concepts")
    .select("id, name, mastery_level, self_confidence")
    .eq("owner_id", ownerId)
    .eq("class_id", classId)
    .order("mastery_level", { ascending: true })
    .limit(12);

  return (next ?? []) as MasteryConceptView[];
}
