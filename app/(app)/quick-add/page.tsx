import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { loadProfile } from "@/lib/profile";
import { CaptureForm } from "./capture-form";
import { PageShell } from "../page-shell";

export default async function QuickAddPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await loadProfile();
  const ttsProvider = profile?.tts_provider === "openai" ? "openai" : "browser";

  return (
    <PageShell
      active="Work"
      eyebrow="Capture"
      title="Quick add."
      subtitle="Snap a photo, talk it out, or jot a quick note — Diana routes it to the right class."
      accent="var(--gl-cyan)"
      icon={Camera}
    >
      <CaptureForm ttsProvider={ttsProvider} />
    </PageShell>
  );
}
