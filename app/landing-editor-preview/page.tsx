import { notFound } from "next/navigation";

import { LandingEditorPreview } from "@/components/landing-page/landing-editor-preview";
import { isLandingPageEditor } from "@/lib/landing-page/access";
import { getLandingPageEditorState } from "@/lib/landing-page/store";
import { createClient } from "@/lib/supabase/server";

export default async function LandingEditorPreviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isLandingPageEditor(user)) notFound();

  const state = await getLandingPageEditorState();
  return <LandingEditorPreview initialConfig={state.draft} />;
}
