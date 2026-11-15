import { StudentShell } from "@/components/student-shell/student-shell";
import styles from "@/components/student-shell/collection.module.css";
import support from "@/components/student-shell/support.module.css";
import { ActionSubmit } from "@/components/student-shell/action-submit";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookOpenCheck, LockKeyhole, PencilRuler } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import { saveClassAiMode } from "./actions";

const AI_MODES = [
  {
    value: "green",
    Icon: BookOpenCheck,
    label: "Full help",
    description: "Guidance, practice, planning, and citations.",
    status: "Available",
  },
  {
    value: "yellow",
    Icon: PencilRuler,
    label: "Citations only",
    description: "Sources and citations only.",
    status: "Citations",
  },
  {
    value: "red",
    Icon: LockKeyhole,
    label: "AI off",
    description: "Keep work organized without AI help.",
    status: "Off",
  },
] as const;

export default async function ClassAiSettingsPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{notice?:string}>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {data:{user}} = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const {notice} = await searchParams;

  const { data: cls } = await supabase
    .from("classes")
    .select("id, name, ai_mode")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();
  if (!cls) notFound();

  const currentMode = (cls.ai_mode ?? "green") as "green" | "yellow" | "red";

  async function action(formData: FormData) {
    "use server";
    const aiMode = String(formData.get("aiMode")) as "green" | "yellow" | "red";
    const classId = String(formData.get("classId"));
    const result = await saveClassAiMode({ classId, aiMode });
    if (result.error) redirect(`/classes/${encodeURIComponent(classId)}/settings?notice=save-paused`);
    redirect(`/classes/${classId}`);
  }

  return <StudentShell active="Classes" version="12">
    <main id="main-content" className={styles.main}>
      <header className={styles.heading}><h1>Help rules</h1><Link href={`/classes/${id}`}>Back to {cls.name}</Link></header>
      {notice ? <p role="status">Your change could not be saved. Try again.</p> : null}
      <div className={support.panel}>
        <form action={action}>
          <input type="hidden" name="classId" value={id} />
          <fieldset><legend>How Diana can help in {cls.name}</legend>
            {AI_MODES.map(({value,Icon,label,description})=><label className={support.option} key={value}>
              <input type="radio" name="aiMode" value={value} defaultChecked={currentMode===value} />
              <Icon size={22} aria-hidden="true" /><span><strong>{label}</strong><small>{description}</small></span>
            </label>)}
          </fieldset>
          <ActionSubmit pendingLabel="Saving" className={support.primary}>Save class rule</ActionSubmit>
        </form>
      </div>
    </main>
  </StudentShell>;
}
