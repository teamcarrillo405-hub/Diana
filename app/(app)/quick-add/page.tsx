import { redirect } from "next/navigation";

import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { loadProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
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
    <ScreenDesignViewport className="sd-capture-work-screen sd-quick-add">
      <CaptureForm ttsProvider={ttsProvider} />
    </ScreenDesignViewport>
  );
}
