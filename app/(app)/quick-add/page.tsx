import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { loadProfile } from "@/lib/profile";
import { CaptureForm } from "./capture-form";

export default async function QuickAddPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await loadProfile();
  const ttsProvider = profile?.tts_provider === "openai" ? "openai" : "browser";

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-display">Quick add</h1>
        <p className="text-sm text-muted">What do you need to remember?</p>
      </header>
      <CaptureForm ttsProvider={ttsProvider} />
    </div>
  );
}
