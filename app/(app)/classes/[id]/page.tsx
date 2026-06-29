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
import { RubricForm } from "./rubric-form";
import { openStaxForClassName } from "@/lib/content/openstax";
import { MasteryPanel, type MasteryConceptView } from "./mastery-panel";
import {
  NexusEmptyState,
  NexusKicker,
  NexusMetric,
  NexusPageShell,
  NexusPanel,
} from "@/components/nexus/nexus-ui";

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
  if (status === "manual") return "rules saved";
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

  const [{ data: rubrics }, { data: assignments }] = await Promise.all([
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
  ]);
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
  const toneStyle = cls.color ? ({ "--class-color": cls.color } as CSSProperties) : undefined;

  return (
    <NexusPageShell className="class-detail-page space-y-8" style={toneStyle}>
      <section className="class-detail-hero">
        <div className="class-detail-hero-copy">
          <Link href="/classes" className="class-back-link">
            <ArrowLeft size={15} />
            All classes
          </Link>
          <NexusKicker tone="blue">Class lane</NexusKicker>
          <h1>{cls.name}</h1>
          <p>{cls.teacher ? `${cls.teacher} / ` : ""}Teacher rules, mastery gaps, homework, and sources stay attached to this subject.</p>
          <div className="class-detail-actions">
            <Link href={`/classes/${id}/settings`} className="nexus-button nexus-button-secondary">
              AI mode: {cls.ai_mode ?? "green"}
            </Link>
            {nextAssignment ? (
              <Link href={`/assignments/${nextAssignment.id}`} className="nexus-button nexus-button-primary">
                Open next work
                <ArrowRight size={17} />
              </Link>
            ) : null}
          </div>
        </div>

        <div className="class-detail-command">
          <NexusMetric label="Open work" value={openAssignments.length} detail="in this lane" tone="cyan" />
          <NexusMetric label="Rulebricks" value={classRubrics.length} detail="teacher rules" tone="gold" />
          <NexusMetric label="Concepts" value={concepts.length} detail="mastery map" tone="pink" />
          <NexusMetric label="Sources" value={books.length} detail="free texts" tone="blue" />
        </div>
      </section>

      <div className="class-detail-grid">
        <NexusPanel className="class-next-panel" tone="cyan">
          <NexusKicker>
            <SlidersHorizontal size={14} />
            Next in this lane
          </NexusKicker>
          {nextAssignment ? (
            <div className="class-next-copy">
              <h2>{nextAssignment.title}</h2>
              <p>{nextAssignment.due_at ? formatDueAt(nextAssignment.due_at) : "No due date"} / {nextAssignment.status}</p>
              <Link href={`/assignments/${nextAssignment.id}`} className="nexus-button nexus-button-primary">
                Open assignment
                <ArrowRight size={17} />
              </Link>
            </div>
          ) : (
            <NexusEmptyState eyebrow="Clear lane" title="No open schoolwork.">
              <p>When a teacher adds something, it will show up here with this class context.</p>
            </NexusEmptyState>
          )}
        </NexusPanel>

        <NexusPanel className="class-rulebrick-panel" tone="gold">
          <NexusKicker>
            <ClipboardCheck size={14} />
            Rulebricks
          </NexusKicker>
          {classRubrics.length === 0 ? (
            <p className="class-muted-copy">Paste the teacher rubric below so Diana can turn expectations into checkable moves.</p>
          ) : (
            <div className="class-rubric-list">
              {classRubrics.map((rubric) => (
                <div key={rubric.id} className="class-rubric-row">
                  <strong>{rubric.title}</strong>
                  <span>{rubricStatus(rubric.parse_status)}</span>
                </div>
              ))}
            </div>
          )}
          <details className="class-rubric-disclosure" open={classRubrics.length === 0}>
            <summary>{classRubrics.length === 0 ? "Add teacher rules" : "Add or update teacher rules"}</summary>
            <RubricForm classId={id} />
          </details>
        </NexusPanel>
      </div>

      {concepts.length > 0 && (
        <MasteryPanel
          classId={id}
          concepts={concepts}
          reviewNext={reviewNext}
          bridge={bridge}
        />
      )}

      {books.length > 0 && (
        <section className="class-resource-section">
          <div className="class-section-head">
            <div>
              <NexusKicker tone="purple">
                <BookOpenCheck size={14} />
                Free source lane
              </NexusKicker>
              <h2>Use real sources when this class needs proof.</h2>
            </div>
            <p>OpenStax stays attached here for study, citations, and source-backed notes.</p>
          </div>
          <div className="class-resource-grid">
            {books.map((book) => (
              <a key={book.url} href={book.url} target="_blank" rel="noreferrer" className="class-resource-card">
                <span>OpenStax</span>
                <strong>{book.title}</strong>
                <em>Citable source</em>
                <ExternalLink size={15} />
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="class-assignment-section">
        <div className="class-section-head">
          <div>
            <NexusKicker>
              <GraduationCap size={14} />
              Assignments in this class
            </NexusKicker>
            <h2>Everything connected to {cls.name}.</h2>
          </div>
          <p>{classAssignments.length} saved item{classAssignments.length === 1 ? "" : "s"} connected to {cls.name}.</p>
        </div>
        {classAssignments.length === 0 ? (
          <NexusEmptyState eyebrow="No work yet" title="This lane is ready.">
            <p>Assignments will appear here when they are added or imported.</p>
          </NexusEmptyState>
        ) : (
          <div className="class-detail-assignment-list">
            {classAssignments.map((assignment) => (
              <Link key={assignment.id} href={`/assignments/${assignment.id}`} className="class-detail-assignment-row">
                <span className="class-assignment-title">
                  <ShieldCheck size={14} />
                  <span>{assignment.title}</span>
                </span>
                <span className="class-assignment-meta">
                  <small>{assignmentStatusLabel(assignment.status)}</small>
                  <em>{assignment.due_at ? formatDueAt(assignment.due_at) : "No due date"}</em>
                </span>
                <span className="class-assignment-open" aria-hidden="true">
                  Open work
                  <ArrowRight size={13} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </NexusPageShell>
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
    ...(rubrics ?? []).flatMap((rubric) => [
      rubric.title,
      rubric.raw_text ?? "",
    ]),
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
          .update({
            name,
            source: "seeded",
            updated_at: new Date().toISOString(),
          })
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
      missing.map((name) => ({
        owner_id: ownerId,
        class_id: classId,
        name,
        source: "seeded",
      })),
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
