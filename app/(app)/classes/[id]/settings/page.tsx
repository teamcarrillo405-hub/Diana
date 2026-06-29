import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpenCheck, LockKeyhole, PencilRuler, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NexusKicker, NexusPageShell, NexusPanel } from "@/components/nexus/nexus-ui";
import { saveClassAiMode } from "./actions";

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
    <NexusPageShell className="class-settings-page space-y-8">
      <section className="class-settings-hero">
        <Link href={`/classes/${id}`} className="class-back-link">
          <ArrowLeft size={15} />
          Back to {cls.name}
        </Link>
        <NexusKicker tone="gold">
          <ShieldCheck size={14} />
          Class AI rules
        </NexusKicker>
        <h1>AI mode for {cls.name}</h1>
        <p>
          Pick how Diana can help in this subject. This setting applies before any assignment-level override.
        </p>
      </section>

      <form action={action} className="class-settings-form">
        <input type="hidden" name="classId" value={id} />

        <NexusPanel className="class-ai-mode-panel" tone="gold">
          <label className="class-ai-mode-option" data-mode="green">
            <input
              type="radio"
              name="aiMode"
              value="green"
              defaultChecked={currentMode === "green"}
            />
            <span className="class-ai-mode-icon"><BookOpenCheck size={18} /></span>
            <span className="class-ai-mode-copy">
              <strong>Full help</strong>
              <span>Study help, planning, citation support, and guided scaffolds are available for this class.</span>
            </span>
            <span className="class-ai-mode-status">Green</span>
          </label>

          <label className="class-ai-mode-option" data-mode="yellow">
            <input
              type="radio"
              name="aiMode"
              value="yellow"
              defaultChecked={currentMode === "yellow"}
            />
            <span className="class-ai-mode-icon"><PencilRuler size={18} /></span>
            <span className="class-ai-mode-copy">
              <strong>Citations only</strong>
              <span>Diana can help with sources and citations, but not content-generating support.</span>
            </span>
            <span className="class-ai-mode-status">Yellow</span>
          </label>

          <label className="class-ai-mode-option" data-mode="red">
            <input
              type="radio"
              name="aiMode"
              value="red"
              defaultChecked={currentMode === "red"}
            />
            <span className="class-ai-mode-icon"><LockKeyhole size={18} /></span>
            <span className="class-ai-mode-copy">
              <strong>AI off</strong>
              <span>AI help stays unavailable for this class. Diana still keeps assignments, sources, and rules organized.</span>
            </span>
            <span className="class-ai-mode-status">Off</span>
          </label>
        </NexusPanel>

        <button type="submit" className="nexus-button nexus-button-primary class-settings-save">
          Save class rule
        </button>
      </form>
    </NexusPageShell>
  );
}
