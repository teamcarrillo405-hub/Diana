import { loadProfile } from "@/lib/profile";
import { AccessibilityClient } from "./accessibility-client";

export default async function Page() {
  const profile = await loadProfile();

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-strong dark:text-brand">Accessibility</p>
        <h1 className="text-2xl font-bold">Make reading feel easier to enter</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted">
          Choose reading supports for dyslexia, ADHD, eye strain, or high-focus days. These controls stay student-owned.
        </p>
      </header>
      <AccessibilityClient
        initial={{
          bionic_reading: Boolean(profile?.bionic_reading),
          visual_pacing: profile?.visual_pacing === "word" || profile?.visual_pacing === "line" ? profile.visual_pacing : "off",
          line_focus: Boolean(profile?.line_focus),
          dyslexia_font: Boolean(profile?.dyslexia_font),
          high_contrast: Boolean(profile?.high_contrast),
          reduced_motion: Boolean(profile?.reduced_motion),
          font_size: profile?.font_size ?? "normal",
          line_spacing: profile?.line_spacing ?? "normal",
        }}
      />
    </div>
  );
}
