import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deriveConceptSeeds, gapBridgeSuggestion } from "@/lib/mastery/concepts";
import { RubricForm } from "./rubric-form";
import { MasteryPanel, type MasteryConceptView } from "./mastery-panel";

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
  const concepts = user ? await ensureClassConcepts(supabase, user.id, id) : [];
  const reviewNext = concepts
    .slice()
    .sort((a, b) => Number(a.mastery_level) - Number(b.mastery_level) || a.name.localeCompare(b.name))[0] ?? null;
  const strongest = concepts
    .slice()
    .sort((a, b) => Number(b.mastery_level) - Number(a.mastery_level))[0] ?? null;
  const bridge = reviewNext ? gapBridgeSuggestion(strongest?.name ?? null, reviewNext.name) : "";

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <span className={`size-3 rounded-full bg-${cls.color}-500`} />
          <h1 className="text-2xl font-bold">{cls.name}</h1>
        </div>
        {cls.teacher && <p className="text-muted">{cls.teacher}</p>}
        <div className="flex items-center gap-1">
          <Link href="/classes" className="inline-block text-xs text-muted hover:underline">
            ← All classes
          </Link>
          <Link href={`/classes/${id}/settings`} className="ml-3 text-xs text-muted hover:underline">
            AI mode: {cls.ai_mode ?? "green"}
          </Link>
        </div>
      </header>

      {concepts.length > 0 && (
        <MasteryPanel
          classId={id}
          concepts={concepts}
          reviewNext={reviewNext}
          bridge={bridge}
        />
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
            Rubrics
          </h2>
        </div>
        {(!rubrics || rubrics.length === 0) ? (
          <p className="rounded-lg border border-dashed border-border bg-card px-4 py-4 text-sm text-muted">
            No rubric on file. Paste one below — Diana will use it when you submit.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {rubrics.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-muted">
                  {r.parse_status === "parsed"
                    ? "Parsed"
                    : r.parse_status === "manual"
                    ? "Stored as text"
                    : r.parse_status === "failed"
                    ? "Couldn’t parse — using as text"
                    : "Parsing…"}
                </p>
              </li>
            ))}
          </ul>
        )}
        <RubricForm classId={id} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
          Assignments in this class
        </h2>
        {(!assignments || assignments.length === 0) ? (
          <p className="text-sm text-muted">None yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {assignments.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/assignments/${a.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-border/30"
                >
                  <span className="truncate">{a.title}</span>
                  <span className="text-xs text-muted">{a.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

async function ensureClassConcepts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  classId: string,
): Promise<MasteryConceptView[]> {
  const { data: existing } = await supabase
    .from("mastery_concepts")
    .select("id, name, mastery_level, self_confidence")
    .eq("owner_id", ownerId)
    .eq("class_id", classId)
    .order("mastery_level", { ascending: true });

  if ((existing ?? []).length >= 5) return (existing ?? []) as MasteryConceptView[];

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

  const existingNames = new Set((existing ?? []).map((concept) => concept.name));
  const missing = deriveConceptSeeds(parts)
    .filter((name) => !existingNames.has(name))
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
