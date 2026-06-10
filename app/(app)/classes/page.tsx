import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ClassForm } from "./class-form";

export default async function ClassesPage() {
  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, teacher, color, created_at")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-display">Classes</h1>
        <p className="text-muted">One row per course this term.</p>
      </header>

      <ClassForm />

      <section className="space-y-2">
        {(!classes || classes.length === 0) ? (
          <p className="rounded-lg border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted">
            No classes yet. Add one above.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {classes.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/classes/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-border/30"
                >
                  <span className={`size-3 shrink-0 rounded-full bg-${c.color}-500`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{c.name}</p>
                    {c.teacher && (
                      <p className="text-xs text-muted">{c.teacher}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
