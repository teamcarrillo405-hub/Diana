import { notFound, redirect } from "next/navigation";

import { AssignmentWorkspace } from "@/components/assignment-workspace";
import { parseStoredAssignmentArtifactBlocks } from "@/lib/assignment-artifact";
import { buildSourcePacket } from "@/lib/assignment-sources";
import {
  assignmentProfilePersistencePatch,
  reconcileWorkspaceWithAssignmentProfile,
  resolveAssignmentProfile,
} from "@/lib/assignment-profile";
import { parseAssignmentPracticalGate } from "@/lib/course-mode/practical-gate";
import {
  classifyWorkspaceMode,
  parseWorkspaceMode,
  workProfilePersistencePatch,
} from "@/lib/assignment-workspace";
import { effectiveAiMode, type AiMode } from "@/lib/portal/teacher";
import { createClient } from "@/lib/supabase/server";
import type { AssignmentKind, AssignmentStatus, Json } from "@/lib/supabase/types";
import type { BreakdownStep } from "@/lib/task-breakdown/types";

export const maxDuration = 300;

type SavedWork = Record<string, unknown>;
type SourceRow = {
  id: string;
  source_type: string;
  title: string;
  url: string | null;
  extracted_text: string | null;
  source_location: string | null;
  import_status: "ready" | "extracting" | "imported" | "partial" | "failed";
};
type SourceQuery = {
  eq(column: string, value: string): SourceQuery;
  order(column: string, options: { ascending: boolean }): Promise<{ data: SourceRow[] | null }>;
};
type SourceClient = {
  from(table: "assignment_sources"): { select(columns: string): SourceQuery };
};
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

function classAiMode(value: string | null | undefined): AiMode {
  return value === "red" || value === "yellow" ? value : "green";
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

  const sourceStore = supabase as unknown as SourceClient;
  const artifactStore = supabase as unknown as ArtifactClient;
  const safetyStore = supabase as unknown as SafetyRpcClient;
  const [{ data: stepsRow }, { data: problems }, { data: sources }, { data: artifactRows }, { data: practicalGateData }] = await Promise.all([
    supabase
      .from("assignment_steps")
      .select("steps")
      .eq("assignment_id", id)
      .eq("owner_id", user.id)
      .maybeSingle(),
    supabase
      .from("assignment_problems")
      .select("id, problem_number, problem_text, student_work, scaffold")
      .eq("assignment_id", id)
      .eq("owner_id", user.id)
      .order("problem_number", { ascending: true }),
    sourceStore
      .from("assignment_sources")
      .select("id, source_type, title, url, extracted_text, source_location, import_status")
      .eq("assignment_id", id)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true }),
    artifactStore
      .from("artifact_blocks")
      .select("id, block_key, block_type, capability, label, position, content, plain_text, source_anchors")
      .eq("assignment_id", id)
      .eq("owner_id", user.id)
      .order("position", { ascending: true }),
    safetyStore.rpc("get_assignment_practical_gate", { p_assignment_id: id }),
  ]);

  const savedWork = asSavedWork(assignment.saved_work);
  const className = assignment.classes?.name ?? "Class";
  const sourcePacket = buildSourcePacket({
    description: assignment.description,
    rubric_text: assignment.rubric_text,
  }, sources ?? []);
  const legacyMode = parseWorkspaceMode(savedWork.workspaceMode);
  const profileInput = {
    kind: assignment.kind as AssignmentKind,
    className,
    title: assignment.title,
    description: assignment.description,
    rubric: assignment.rubric_text,
    sourceText: [sourcePacket.directions, sourcePacket.rubric, sourcePacket.materialText].join("\n"),
  };
  const assignmentProfile = resolveAssignmentProfile({
    ...profileInput,
    profile: assignment.assignment_profile,
  });
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
  const override: AiMode | null = assignment.ai_mode_override === "red" || assignment.ai_mode_override === "yellow" || assignment.ai_mode_override === "green"
    ? assignment.ai_mode_override
    : null;
  const aiMode = effectiveAiMode(classAiMode(assignment.classes?.ai_mode), override);

  return (
    <AssignmentWorkspace
      assignmentId={assignment.id}
      title={assignment.title}
      courseLabel={className}
      kind={assignment.kind as AssignmentKind}
      status={assignment.status as AssignmentStatus}
      description={assignment.description ?? ""}
      sourcePacket={sourcePacket}
      sources={sources ?? []}
      steps={steps}
      aiMode={aiMode}
      initialMode={mode}
      assignmentProfile={assignmentProfile}
      initialArtifactBlocks={parseStoredAssignmentArtifactBlocks(artifactRows)}
      practicalGate={parseAssignmentPracticalGate(practicalGateData)}
      initialSavedWork={savedWork}
      initialProblems={(problems ?? []).map((problem) => ({
        id: problem.id,
        problemNumber: problem.problem_number,
        problemText: problem.problem_text,
        studentWork: asSavedWork(problem.student_work),
        scaffold: asSavedWork(problem.scaffold),
      }))}
      externalUrl={assignment.external_url}
      externalSource={assignment.external_source}
      estimatedMinutes={assignment.estimated_minutes}
    />
  );
}
