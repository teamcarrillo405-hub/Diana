import { createClient } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/profile";
import { classCompletionAnalytics } from "@/lib/portal/teacher";
import { IepImport } from "../settings/iep-import";
import { TeacherPortalClient } from "./teacher-portal-client";

export default async function TeacherPortalPage() {
  const supabase = await createClient();
  const profile = await loadProfile();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ownerId = user?.id ?? "";
  const [{ data: classes }, { data: assignments }, { data: roster }, { data: notes }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, ai_mode")
      .eq("owner_id", ownerId)
      .order("name"),
    supabase
      .from("assignments")
      .select("id, title, class_id, status, ai_mode_override")
      .eq("owner_id", ownerId)
      .order("updated_at", { ascending: false })
      .limit(80),
    supabase
      .from("class_roster_members")
      .select("id, class_id, display_name, role, status, email")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("teacher_progress_notes")
      .select("id, author_name, note_text, visible_to_parent, created_at")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const classRows = (classes ?? []) as Array<{ id: string; name: string; ai_mode: string }>;
  const assignmentRows = (assignments ?? []) as Array<{
    id: string;
    title: string;
    class_id: string;
    status: string;
    ai_mode_override: string | null;
  }>;
  const analytics = classCompletionAnalytics(classRows.map((row) => row.id), assignmentRows);

  const { data: aiRows } = await supabase
    .from("ai_interactions")
    .select("assignment_id, feature")
    .eq("owner_id", ownerId)
    .not("assignment_id", "is", null)
    .limit(500);
  const receiptMap = new Map<string, Map<string, number>>();
  for (const row of aiRows ?? []) {
    const assignmentId = row.assignment_id as string;
    const features = receiptMap.get(assignmentId) ?? new Map<string, number>();
    features.set(row.feature as string, (features.get(row.feature as string) ?? 0) + 1);
    receiptMap.set(assignmentId, features);
  }
  const receipts = assignmentRows
    .filter((row) => receiptMap.has(row.id))
    .slice(0, 10)
    .map((row) => ({
      id: row.id,
      title: row.title,
      uses: [...(receiptMap.get(row.id) ?? new Map<string, number>()).entries()]
        .map(([feature, count]) => `${featureLabel(feature)} x${count}`)
        .join(", "),
    }));

  return (
    <div className="diana-page space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">Teacher portal</p>
        <h1 className="text-display">Assignments, roster, and accommodations</h1>
        <p className="text-sm text-muted">
          Student-controlled tools for teacher-created work, class contacts, AI policy, progress notes, and IEP / 504 setup.
        </p>
      </header>

      <TeacherPortalClient
        classes={classRows}
        assignments={assignmentRows}
        roster={(roster ?? []) as Array<{ id: string; class_id: string; display_name: string; role: string; status: string; email: string | null }>}
        notes={(notes ?? []) as Array<{ id: string; author_name: string; note_text: string; visible_to_parent: boolean; created_at: string }>}
        analytics={analytics}
        profile={{
          extra_time_pct: Number(profile?.extra_time_pct ?? 0),
          tts_enabled: Boolean(profile?.tts_enabled),
          dyslexia_font: Boolean(profile?.dyslexia_font),
          accommodations: (profile?.accommodations ?? []) as string[],
        }}
      />

      <details className="nexus-settings-disclosure">
        <summary>
          <span>
            <small>Receipts</small>
            <strong>AI authorship detail</strong>
          </span>
        </summary>
        <div className="nexus-settings-disclosure-body">
          <section className="nexus-panel nexus-panel-dense space-y-3">
            <h2 className="text-sm font-semibold">AI authorship receipts</h2>
            <p className="text-sm text-muted">
              How AI help was used per assignment: Socratic hints and scaffolds, never written work. The
              work itself stayed the student&apos;s. Full detail lives in the AI history the student can export.
            </p>
            {receipts.length === 0 ? (
              <p className="text-sm text-muted">No AI help has been used on tracked assignments yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {receipts.map((receipt) => (
                  <li key={receipt.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                    <span className="min-w-0 text-sm font-medium">{receipt.title}</span>
                    <span className="text-xs text-muted">{receipt.uses}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </details>

      <details className="nexus-settings-disclosure">
        <summary>
          <span>
            <small>Documents</small>
            <strong>IEP / 504 import</strong>
          </span>
        </summary>
        <div className="nexus-settings-disclosure-body">
          <IepImport />
        </div>
      </details>
    </div>
  );
}

function featureLabel(feature: string): string {
  const labels: Record<string, string> = {
    task_breakdown: "Task breakdown",
    math_step: "Math hints",
    math_example: "Worked example",
    math_scaffold: "Math scaffold",
    writing_aid: "Writing rule help",
    writing_cowrite: "Writing structure help",
    reading_scaffold: "Reading scaffold",
    citation_gen: "Citation formatting",
    science_scaffold: "Science scaffold",
    history_scaffold: "History scaffold",
    cs_scaffold: "Coding hints",
    language_scaffold: "Language practice",
    arts_scaffold: "Arts reflection",
    health_scaffold: "Health questions",
    ap_scaffold: "AP practice",
    vocab_hover: "Vocabulary help",
    reading_level: "Reading level adapt",
    note_synthesis: "Note synthesis",
    note_tags: "Note tags",
    visual_tool: "Visual learning",
    weekly_reflection: "Weekly reflection",
  };
  return labels[feature] ?? feature.replaceAll("_", " ");
}
