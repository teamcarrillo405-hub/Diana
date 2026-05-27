import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewAssignmentForm } from "./form";

export default async function NewAssignmentPage() {
  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, color")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (!classes || classes.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Add an assignment</h1>
        <p className="rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted">
          You need a class first.{" "}
          <Link href="/classes" className="text-accent underline-offset-2 hover:underline">
            Set one up
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Add an assignment</h1>
        <Link
          href="/assignments"
          className="text-xs text-muted hover:underline"
        >
          ← All tasks
        </Link>
      </header>
      <NewAssignmentForm classes={classes} />
    </div>
  );
}
