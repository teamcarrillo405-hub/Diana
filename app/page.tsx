import { PublicHomeFunnel } from "./public-home-funnel";
import { isLandingPageEditor } from "@/lib/landing-page/access";
import { getPublishedLandingPageConfig } from "@/lib/landing-page/store";
import { createClient } from "@/lib/supabase/server";

export default async function DianaLandingPage() {
  const [config, supabase] = await Promise.all([
    getPublishedLandingPageConfig(),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <PublicHomeFunnel
      config={config}
      showEditorLink={isLandingPageEditor(user)}
    />
  );
}
