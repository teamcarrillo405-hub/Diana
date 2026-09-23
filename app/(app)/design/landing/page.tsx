import { notFound } from "next/navigation";

import { isLandingPageEditor } from "@/lib/landing-page/access";
import { getLandingPageEditorState } from "@/lib/landing-page/store";
import { createClient } from "@/lib/supabase/server";

import { LandingPageEditor } from "./landing-page-editor";

export default async function LandingPageEditorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isLandingPageEditor(user)) notFound();

  const state = await getLandingPageEditorState();
  return (
    <LandingPageEditor
      initialDraft={state.draft}
      initialPublished={state.published}
      draftUpdatedAt={state.draftUpdatedAt}
      publishedAt={state.publishedAt}
      storageReady={state.storageReady}
    />
  );
}
