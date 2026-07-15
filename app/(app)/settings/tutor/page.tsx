import { Bot } from "lucide-react";

import { loadProfile } from "@/lib/profile";
import { PageShell } from "../../page-shell";
import { TutorPreferences } from "./tutor-preferences";

export default async function TutorSettingsPage() {
  const profile = await loadProfile();
  if (!profile) return null;

  return (
    <PageShell active="More" eyebrow="Coach settings" title="Choose your tutor" subtitle="Pick the presentation and explanation style that helps you learn. Safety, class AI rules, and authorship boundaries do not change." icon={Bot}>
      <TutorPreferences initial={{ persona: profile.tutor_persona, style: profile.tutor_style, complexity: profile.tutor_complexity }} />
    </PageShell>
  );
}
