import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpenCheck, LockKeyhole, PencilRuler, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AppTopNav } from "../../../app-top-nav";
import { saveClassAiMode } from "./actions";

const SF = "var(--font-display)";
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
    <div style={{ minHeight: "100vh", background: "var(--gl-bg-base)", color: "var(--gl-text-primary)" }}>
      <AppTopNav active="Classes" />
      <div style={{ maxWidth: "var(--layout-max-width)", margin: "0 auto", padding: "var(--space-17) var(--space-17) var(--space-24)", display: "grid", gap: "var(--space-17)" }}>

        {/* Hero */}
        <header style={{ display: "grid", gap: "var(--space-8)" }}>
          <Link
            href={`/classes/${id}`}
            style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-4)", fontFamily: BODY, fontSize: "var(--text-12)", fontWeight: "var(--weight-600)", color: "var(--gl-text-muted)", textDecoration: "none" }}
          >
            <ArrowLeft size={13} />
            Back to {cls.name}
          </Link>
          <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-gold)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <ShieldCheck size={13} />
            Class AI rules
          </p>
          <h1 style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-50)", lineHeight: "var(--leading-tight)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0, maxWidth: "22ch" }}>
            AI mode for {cls.name}
          </h1>
          <p style={{ fontFamily: BODY, fontSize: "var(--text-16)", lineHeight: "var(--leading-body)", color: "var(--gl-text-secondary)", maxWidth: "44ch", margin: 0 }}>
            Pick how Diana can help in this subject. This setting applies before any assignment-level override.
          </p>
        </header>

        {/* Form */}
        <form action={action}>
          <input type="hidden" name="classId" value={id} />
          <div className="class-ai-mode-panel nexus-panel nexus-tone-gold nexus-panel-default">
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
          <button type="submit" className="nexus-button nexus-button-primary class-settings-save">
            Save class rule
          </button>
        </form>
      </div>
    </div>
  );
}
