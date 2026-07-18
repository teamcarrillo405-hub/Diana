import { loadProfile } from "@/lib/profile";

import { StudyBuddyClient } from "./study-buddy-client";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; q?: string; classId?: string; sdScenario?: string }>;
}) {
  const { source, q, classId, sdScenario } = await searchParams;
  const profile = await loadProfile();
  const tutorName = profile?.tutor_persona === "xavier"
    ? "Tutor Xavier"
    : profile?.tutor_persona === "maya"
      ? "Tutor Maya"
      : "Coach Diana";
  const tutorStyle = profile?.tutor_style ?? "socratic";
  const initialMode = tutorStyle === "direct" ? "hint" : "guide";

  return (
    <StudyBuddyClient
      initialSource={source}
      initialQuestion={q}
      initialMode={initialMode}
      tutorName={tutorName}
      tutorStyle={tutorStyle}
      complexity={profile?.tutor_complexity ?? "balanced"}
      classId={classId}
      qaScenario={sdScenario === "tutor-chat:default" ? sdScenario : undefined}
    />
  );
}
