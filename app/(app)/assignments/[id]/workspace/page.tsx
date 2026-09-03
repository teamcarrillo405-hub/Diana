import { notFound, redirect } from "next/navigation";

import { AssignmentWorkspace } from "@/components/assignment-workspace";
import { parseStoredAssignmentArtifactBlocks } from "@/lib/assignment-artifact";
import { loadAssignmentHomeworkKernel } from "@/lib/assignment-help/server-understanding";
import { legacySavedWorkForUnifiedUnit } from "@/lib/assignment-legacy-work";
import {
  assignmentProfilePersistencePatch,
  reconcileWorkspaceWithAssignmentProfile,
} from "@/lib/assignment-profile";
import { parseAssignmentPracticalGate } from "@/lib/course-mode/practical-gate";
import { subjectPresentationFor } from "@/lib/assignment-subject-presentation";
import {
  classifyWorkspaceMode,
  parseWorkspaceMode,
  workProfilePersistencePatch,
} from "@/lib/assignment-workspace";
import { createClient } from "@/lib/supabase/server";
import type { AssignmentKind, Json } from "@/lib/supabase/types";
import type { BreakdownStep } from "@/lib/task-breakdown/types";
import { assignmentFocusSessionMetadata } from "@/lib/timer/assignment-focus-actions";
import type {
  AssignmentPaperStyle,
  AssignmentProblemMessage,
  AssignmentWorkspacePreference,
  ChatAttachment,
} from "@/lib/assignment-workspace-contracts";

export const maxDuration = 300;

type SavedWork = Record<string, unknown>;
type ArtifactRow = {
  id: string;
  block_key: string;
  block_type: string;
  capability: string;
  label: string;
  position: number;
  content: Json;
  plain_text: string;
  source_anchors: Json;
};
type FocusSessionRow = {
  id: number;
  started_at: string;
  target_ends_at: string | null;
  client_session_id: string | null;
};
type ArtifactQuery = {
  eq(column: string, value: string): ArtifactQuery;
  order(column: string, options: { ascending: boolean }): Promise<{ data: ArtifactRow[] | null }>;
};
type ArtifactClient = {
  from(table: "artifact_blocks"): { select(columns: string): ArtifactQuery };
};
type SafetyRpcClient = {
  rpc(
    name: "get_assignment_practical_gate",
    args: { p_assignment_id: string },
  ): Promise<{ data: Json | null; error: { message: string } | null }>;
};

function asSavedWork(value: Json | null | undefined): SavedWork {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as unknown as SavedWork
    : {};
}

function parseStoredAttachments(value: Json): ChatAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const attachment = entry as Record<string, Json | undefined>;
    if (typeof attachment.id !== "string" || typeof attachment.name !== "string" || typeof attachment.mimeType !== "string") return [];
    const status = attachment.status === "uploading" || attachment.status === "needs_attention" ? attachment.status : "ready";
    return [{
      id: attachment.id,
      sourceId: typeof attachment.sourceId === "string" ? attachment.sourceId : null,
      name: attachment.name,
      mimeType: attachment.mimeType,
      previewUrl: null,
      status,
      error: typeof attachment.error === "string" ? attachment.error : null,
    }];
  });
}

export default async function AssignmentWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, description, rubric_text, kind, status, saved_work, work_profile, work_profile_source, assignment_profile, assignment_profile_version, source_import_status, external_url, external_source, estimated_minutes, ai_mode_override, classes(name, ai_mode)")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!assignment) notFound();

  const artifactStore = supabase as unknown as ArtifactClient;
  const safetyStore = supabase as unknown as SafetyRpcClient;
  const [homeworkKernel, { data: stepsRow }, { data: problems }, { data: artifactRows }, { data: practicalGateData }, { data: problemMessages }, { data: workspacePreferences }, { data: openFocusSession }] = await Promise.all([
    loadAssignmentHomeworkKernel({
      supabase,
      ownerId: user.id,
      assignmentId: id,
      eventSource: "assignment_workspace",
    }),
    supabase
      .from("assignment_steps")
      .select("steps")
      .eq("assignment_id", id)
      .eq("owner_id", user.id)
      .maybeSingle(),
    supabase
      .from("assignment_problems")
      .select("id, problem_number, problem_text, student_work, scaffold, progress_status, reviewed_at, completed_at")
      .eq("assignment_id", id)
      .eq("owner_id", user.id)
      .order("problem_number", { ascending: true }),
    artifactStore
      .from("artifact_blocks")
      .select("id, block_key, block_type, capability, label, position, content, plain_text, source_anchors")
      .eq("assignment_id", id)
      .eq("owner_id", user.id)
      .order("position", { ascending: true }),
    safetyStore.rpc("get_assignment_practical_gate", { p_assignment_id: id }),
    supabase
      .from("assignment_problem_messages")
      .select("id, problem_id, role, content, attachments, visual_aid, completion_state, client_turn_id, created_at")
      .eq("assignment_id", id)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("assignment_workspace_preferences")
      .select("problem_id, paper_style, work_height")
      .eq("assignment_id", id)
      .eq("owner_id", user.id),
    supabase
      .from("assignment_time_log")
      .select("id, started_at, target_ends_at, client_session_id")
      .eq("assignment_id", id)
      .eq("owner_id", user.id)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!homeworkKernel) notFound();

  const savedWork = asSavedWork(assignment.saved_work);
  const className = assignment.classes?.name ?? homeworkKernel.assignment.class_name ?? "Class";
  const sourcePacket = homeworkKernel.sourcePacket;
  const assignmentProfile = homeworkKernel.profile;
  const presentation = subjectPresentationFor(assignmentProfile, sourcePacket);
  const assignmentUnderstanding = homeworkKernel.understanding;
  const sources = homeworkKernel.sources;
  const legacyMode = parseWorkspaceMode(savedWork.workspaceMode);
  const profileInput = {
    kind: assignment.kind as AssignmentKind,
    className,
    title: assignment.title,
    description: assignment.description,
    rubric: assignment.rubric_text,
    sourceText: [sourcePacket.directions, sourcePacket.rubric, sourcePacket.materialText].join("\n"),
  };
  const detectedClassification = classifyWorkspaceMode(profileInput, legacyMode
    ? { mode: legacyMode, source: "student_selected" }
    : { mode: assignment.work_profile, source: assignment.work_profile_source });
  const classification = reconcileWorkspaceWithAssignmentProfile(
    detectedClassification,
    assignmentProfile,
    Boolean(legacyMode),
  );
  const mode = classification.mode;
  const profilePatch = workProfilePersistencePatch(classification);
  const compositePatch = assignmentProfilePersistencePatch(assignmentProfile);
  if (
    assignment.work_profile !== profilePatch.work_profile ||
    assignment.work_profile_source !== profilePatch.work_profile_source ||
    !assignment.assignment_profile
  ) {
    await supabase.from("assignments").update({
      ...profilePatch,
      assignment_profile: compositePatch.assignment_profile as unknown as Json,
      assignment_profile_version: assignmentProfile.schemaVersion,
    }).eq("id", id).eq("owner_id", user.id);
  }
  const steps = Array.isArray(stepsRow?.steps) ? stepsRow.steps as unknown as BreakdownStep[] : [];
  const aiMode = homeworkKernel.trustDecision.aiMode;
  // Every subject opens in the shared work-unit shell. Imported source questions
  // replace generic seeds, and older saved work is carried into the first unit.
  let workspaceProblems = problems ?? [];
  if (workspaceProblems.length === 0 && presentation.units.length > 0) {
    const legacy = legacySavedWorkForUnifiedUnit(mode, savedWork);
    const { data: created, error: createUnitsError } = await supabase
      .from("assignment_problems")
      .insert(presentation.units.map((unit, index) => ({
        owner_id: user.id,
        assignment_id: id,
        problem_number: index + 1,
        problem_text: unit.prompt,
        source: "assignment_source",
        student_work: index === 0 ? legacy.studentWork as unknown as Json : {} as Json,
        progress_status: index === 0 && legacy.hasStudentWork ? "in_progress" : "not_started",
        scaffold: {
          unitLabel: unit.label,
          unitType: unit.type,
          sourceAnchor: unit.sourceAnchor ?? null,
          unitMetadata: unit.metadata ?? {},
        } as unknown as Json,
      })))
      .select("id, problem_number, problem_text, student_work, scaffold, progress_status, reviewed_at, completed_at");
    if (!createUnitsError && created) workspaceProblems = created;
  }

  return (
    <AssignmentWorkspace
      assignmentId={assignment.id}
      title={assignment.title}
      courseLabel={className}
      kind={assignment.kind as AssignmentKind}
      description={assignment.description ?? ""}
      sourcePacket={sourcePacket}
      assignmentUnderstanding={assignmentUnderstanding}
      sources={sources.map((source) => ({
        id: source.id ?? `${source.title}-${source.source_location ?? "source"}`,
        source_type: source.source_type,
        title: source.title,
        url: source.url ?? null,
        extracted_text: source.extracted_text,
        source_location: source.source_location,
        import_status: source.import_status ?? "ready",
      }))}
      steps={steps}
      aiMode={aiMode}
      initialMode={mode}
      assignmentProfile={assignmentProfile}
      initialArtifactBlocks={parseStoredAssignmentArtifactBlocks(artifactRows)}
      practicalGate={parseAssignmentPracticalGate(practicalGateData)}
      initialSavedWork={savedWork}
      initialProblems={workspaceProblems.map((problem) => ({
        id: problem.id,
        problemNumber: problem.problem_number,
        problemText: problem.problem_text,
        studentWork: asSavedWork(problem.student_work),
        scaffold: asSavedWork(problem.scaffold),
        progressStatus: problem.progress_status as "not_started" | "in_progress" | "done",
        reviewedAt: problem.reviewed_at,
        completedAt: problem.completed_at,
      }))}
      initialProblemMessages={[...(problemMessages ?? [])].sort((left, right) => left.created_at.localeCompare(right.created_at)).map((message): AssignmentProblemMessage => ({
        id: message.id,
        problemId: message.problem_id,
        role: message.role === "student" ? "student" : "assistant",
        content: message.content,
        attachments: parseStoredAttachments(message.attachments),
        visualAid: message.visual_aid && typeof message.visual_aid === "object" && !Array.isArray(message.visual_aid)
          ? message.visual_aid as Record<string, unknown>
          : null,
        completionState: message.completion_state === "streaming" || message.completion_state === "interrupted"
          ? message.completion_state
          : "complete",
        clientTurnId: message.client_turn_id,
        createdAt: message.created_at,
      }))}
      initialWorkspacePreferences={(workspacePreferences ?? []).map((preference): AssignmentWorkspacePreference => ({
        problemId: preference.problem_id,
        paperStyle: (preference.paper_style === "blank" || preference.paper_style === "graph" ? preference.paper_style : "lined") as AssignmentPaperStyle,
        workHeight: Math.max(220, Math.min(1_200, preference.work_height)),
      }))}
      initialFocusServerState={{
        session: openFocusSession
          ? assignmentFocusSessionMetadata(openFocusSession as FocusSessionRow)
          : null,
        endedSession: null,
      }}
      externalUrl={assignment.external_url}
      externalSource={assignment.external_source}
      estimatedMinutes={assignment.estimated_minutes}
    />
  );
}
