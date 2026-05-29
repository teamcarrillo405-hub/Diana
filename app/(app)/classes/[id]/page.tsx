import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RubricForm } from "./rubric-form";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

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
