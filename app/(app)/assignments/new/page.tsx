import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewAssignmentForm } from "./form";
import type { CalibrationStats } from "@/lib/time-budget/calibration";
import { parseTemplateRow, type AssignmentTemplate } from "@/lib/templates/templates";

export default async function NewAssignmentPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { template: initialTemplateId } = await searchParams;

  const [{ data: classes }, { data: estimates }, { data: templates }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, color")
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    user
      ? supabase
          .from("assignment_type_estimates")
          .select("kind, mean_minutes, n_samples")
          .eq("owner_id", user.id)
      : Promise.resolve({ data: [] }),
    supabase
      .from("assignment_templates")
      .select("id, name, kind, checklist_items, rubric_items")
      .order("name", { ascending: true }),
  ]);

  // Build a map of kind -> CalibrationStats for hint display
  const calibrationMap: Record<string, CalibrationStats> = {};
  for (const row of estimates ?? []) {
    if (row.kind && row.mean_minutes != null && row.n_samples != null) {
      calibrationMap[row.kind] = { mean: row.mean_minutes, n: row.n_samples };
    }
  }

  const parsedTemplates: AssignmentTemplate[] = (templates ?? []).map(parseTemplateRow);

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
      <NewAssignmentForm
        classes={classes}
        calibrationMap={calibrationMap}
        templates={parsedTemplates}
        initialTemplateId={initialTemplateId ?? ""}
      />
    </div>
  );
}
