import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpenCheck, LockKeyhole, PencilRuler, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "../../../page-shell";
import { saveClassAiMode } from "./actions";

const BODY = "var(--font-body)";

export default async function ClassAiSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: cls } = await supabase
    .from("classes")
    .select("id, name, ai_mode")
    .eq("id", id)
    .single();
  if (!cls) notFound();

  const currentMode = (cls.ai_mode ?? "green") as "green" | "yellow" | "red";

  async function action(formData: FormData) {
    "use server";
    const aiMode = String(formData.get("aiMode")) as "green" | "yellow" | "red";
    const classId = String(formData.get("classId"));
    await saveClassAiMode({ classId, aiMode });
    redirect(`/classes/${classId}`);
  }

  return (
    <PageShell
      active="Classes"
      eyebrow="Class AI rules"
      title={`AI mode for ${cls.name}`}
      subtitle="Pick how Diana can help in this subject. This setting applies before any assignment-level override."
      accent="var(--gl-gold)"
      icon={ShieldCheck}
    >
      <Link
        href={`/classes/${id}`}
        style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-4)", fontFamily: BODY, fontSize: "var(--text-12)", fontWeight: "var(--weight-600)", color: "var(--gl-text-muted)", textDecoration: "none" }}
      >
        <ArrowLeft size={13} />
        Back to {cls.name}
      </Link>

      {/* Form */}
      <form action={action}>
          <input type="hidden" name="classId" value={id} />
          <div className="class-ai-mode-panel diana-panel diana-tone-gold diana-panel-default">
            {[
              { value: "green", Icon: BookOpenCheck, label: "Full help", desc: "Study help, planning, citation support, and guided scaffolds are available for this class.", modeLabel: "Green" },
              { value: "yellow", Icon: PencilRuler, label: "Citations only", desc: "Diana can help with sources and citations, but not content-generating support.", modeLabel: "Yellow" },
              { value: "red", Icon: LockKeyhole, label: "AI off", desc: "AI help stays unavailable for this class. Diana still keeps assignments, sources, and rules organized.", modeLabel: "Off" },
            ].map(({ value, Icon, label, desc, modeLabel }) => (
              <label key={value} className="class-ai-mode-option" data-mode={value}>
                <input
                  type="radio"
                  name="aiMode"
                  value={value}
                  defaultChecked={currentMode === value}
                />
                <span className="class-ai-mode-icon"><Icon size={18} /></span>
                <span className="class-ai-mode-copy">
                  <strong>{label}</strong>
                  <span>{desc}</span>
                </span>
                <span className="class-ai-mode-status">{modeLabel}</span>
              </label>
            ))}
          </div>
        <button type="submit" className="diana-button diana-button-primary class-settings-save">
          Save class rule
        </button>
      </form>
    </PageShell>
  );
}
