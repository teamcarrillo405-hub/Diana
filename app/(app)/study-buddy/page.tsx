import { redirect } from "next/navigation";

import {
  formatHomeworkKernelForTutor,
  loadAssignmentHomeworkKernel,
} from "@/lib/assignment-help/server-understanding";
import { loadProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

import { StudyBuddyClient } from "./study-buddy-client";

type StudyBuddyMode = "guide" | "hint" | "quiz";

type StudyBuddySearchParams = {
  source?: string;
  q?: string;
  classId?: string;
  assignmentId?: string;
  mode?: string;
  sdScenario?: string;
};
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;


export default async function Page({
  searchParams,
}: {
  searchParams: Promise<StudyBuddySearchParams>;
}) {
  const params = await searchParams;
  const profile = await loadProfile();
  const tutorName = profile?.tutor_persona === "xavier"
    ? "Tutor Xavier"
    : profile?.tutor_persona === "maya"
      ? "Tutor Maya"
      : "Coach Diana";
  const tutorStyle = profile?.tutor_style ?? "socratic";
  const profileMode: StudyBuddyMode = tutorStyle === "direct" ? "hint" : "guide";
  const requestedMode = normalizeMode(params.mode);

  let initialSource = params.source;
  let initialQuestion = params.q;
  let classId = params.classId;
  let verifiedAssignmentId: string | undefined;

  if (params.assignmentId) {
    if (!UUID_PATTERN.test(params.assignmentId)) redirect("/study?notice=assignment-not-found");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/login?next=${encodeURIComponent(`/study-buddy?assignmentId=${params.assignmentId}`)}`);

    const kernel = await loadAssignmentHomeworkKernel({
      supabase,
      ownerId: user.id,
      assignmentId: params.assignmentId,
      eventSource: "study_buddy_page",
    });
    if (!kernel) redirect("/study?notice=assignment-not-found");
    verifiedAssignmentId = kernel.assignment.id;

    initialSource = formatHomeworkKernelForTutor(kernel, { maxChars: 20_000 });
    initialQuestion = params.q?.trim() || `Help me begin ${kernel.assignment.title}. Ask one useful question before giving guidance.`;
    classId = kernel.assignment.class_id ?? undefined;
  }

  return (
    <StudyBuddyClient
      initialSource={initialSource}
      initialQuestion={initialQuestion}
      initialMode={requestedMode ?? profileMode}
      tutorName={tutorName}
      tutorStyle={tutorStyle}
      complexity={profile?.tutor_complexity ?? "balanced"}
      classId={classId}
      assignmentId={verifiedAssignmentId}
      qaScenario={params.sdScenario === "tutor-chat:default" ? params.sdScenario : undefined}
    />
  );
}

function normalizeMode(value: string | undefined): StudyBuddyMode | null {
  return value === "guide" || value === "hint" || value === "quiz" ? value : null;
}
