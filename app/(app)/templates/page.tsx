import Link from "next/link";
import { ClipboardCheck, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { KIND_LABEL } from "@/lib/checklists/templates";
import { parseTemplateRow } from "@/lib/templates/templates";
import type { AssignmentKind } from "@/lib/supabase/types";

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assignment_templates")
    .select("id, name, kind, checklist_items, rubric_items")
    .order("name", { ascending: true });
  const templates = (data ?? []).map(parseTemplateRow);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-strong dark:text-brand">Templates</p>
        <h1 className="text-display">Start with a structure, then make it yours</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted">
          Templates add a checklist and rubric shape to a new assignment so the first move is already visible.
        </p>
      </header>

      {templates.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-border bg-surface-raised p-8 text-center">
          <p className="font-semibold">No templates are loaded yet.</p>
          <p className="mt-2 text-sm text-muted">The seed templates come from the Supabase migration set.</p>
        </section>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <article key={template.id} className="rounded-3xl border border-border bg-surface-raised p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                  <FileText size={18} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold">{template.name}</h2>
                  <p className="mt-1 text-xs text-muted">{KIND_LABEL[template.kind as AssignmentKind] ?? template.kind}</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-border bg-surface p-3">
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                    <ClipboardCheck size={13} />
                    Checklist
                  </p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {template.checklistItems.slice(0, 4).map((item) => (
                      <li key={item.label}>{item.label}</li>
                    ))}
                  </ul>
                </div>
                {template.rubricItems.length > 0 && (
                  <div className="rounded-2xl border border-border bg-surface p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">Rubric signals</p>
                    <ul className="mt-2 space-y-1 text-sm text-muted">
                      {template.rubricItems.slice(0, 3).map((item) => (
                        <li key={item.criterion}>{item.criterion} ({item.weight}%)</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <Link
                href={`/assignments/new?template=${template.id}`}
                className="touch-target mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white"
              >
                Use this template
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
