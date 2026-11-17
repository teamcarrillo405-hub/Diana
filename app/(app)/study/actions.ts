"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { generateStudyArtifact } from "@/app/(app)/study-artifacts/actions";
import { loadAssignmentHomeworkKernel } from "@/lib/assignment-help/server-understanding";
import {
  selectStudentStudySkill,
  type StudentStudyDestination,
} from "@/lib/study-helper/student-skills";
import { createClient } from "@/lib/supabase/server";
import type { AssignmentKind, Json } from "@/lib/supabase/types";

const StartStudyInput = z.object({
  assignmentId: z.string().uuid(),
  requestedSkill: z.string().trim().max(40).optional(),
});

export async function createQuiz(formData: FormData): Promise<void> {
  const classId = z.string().uuid().safeParse(formData.get("classId"));
  const classQuery = classId.success ? `classId=${encodeURIComponent(classId.data)}` : "";
  const classPrefix = classQuery ? `${classQuery}&` : "";
  const source = z.string().regex(/^(assignment|note):[0-9a-f-]{36}$/i).safeParse(formData.get("source"));
  const count = z.coerce.number().int().min(3).max(20).safeParse(formData.get("questionCount") ?? 6);
  if (!source.success || !count.success) redirect(`/study?${classPrefix}notice=choose-source`);
  const [sourceType, sourceId] = source.data.split(":") as ["assignment" | "note", string];
  const result = await generateStudyArtifact({ sourceType, sourceId, artifactType: "practice_test", studyMode: "retrieval_quiz", questionCount: count.data });
  if (!result.ok) redirect(`/study?${classPrefix}source=${encodeURIComponent(source.data)}&questionCount=${count.data}&notice=${encodeURIComponent(result.error)}`);
  redirect(`/study-artifacts/${result.id}${classQuery ? `?${classQuery}` : ""}`);
}


export async function startStudentStudy(formData: FormData): Promise<void> {
  const parsed = StartStudyInput.safeParse({
    assignmentId: formData.get("assignmentId"),
    requestedSkill: formData.get("requestedSkill") || undefined,
  });
  if (!parsed.success) redirect("/study?notice=assignment-not-found");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/study")}`);

  const assignmentId = parsed.data.assignmentId;
  const [kernel, { data: problemRows }, { data: artifactRows }] = await Promise.all([
    loadAssignmentHomeworkKernel({
      supabase,
      ownerId: user.id,
      assignmentId,
      eventSource: "study_router",
    }),
    supabase
      .from("assignment_problems")
      .select("id, student_work")
      .eq("assignment_id", assignmentId)
      .eq("owner_id", user.id)
      .limit(30),
    supabase
      .from("artifact_blocks")
      .select("id, plain_text")
      .eq("assignment_id", assignmentId)
      .eq("owner_id", user.id)
      .limit(30),
  ]);
  if (!kernel) redirect("/study?notice=assignment-not-found");

  const assignment = kernel.assignment;
  const aiMode = kernel.trustDecision.aiMode;
  const supportIntensity = kernel.supportIntensity;
  const selection = selectStudentStudySkill({
    assignmentKind: assignment.kind as AssignmentKind,
    profile: kernel.profile,
    aiMode,
    hasSourceMaterial: kernel.understanding.sourceState !== "no_source",
    hasStudentWork:
      (problemRows ?? []).some((problem) => hasMeaningfulWork(problem.student_work)) ||
      (artifactRows ?? []).some((block) => Boolean(block.plain_text?.trim())),
    supportIntensity: kernel.supportIntensity,
    requestedSkill: parsed.data.requestedSkill,
  });

  const { error: signalError } = await supabase.from("task_signals").insert({
    owner_id: user.id,
    assignment_id: assignmentId,
    kind: "study_helper_event",
    value: {
      event: "student_study_routed",
      skillId: selection.skill.id,
      reason: selection.reason,
      requestedSkill: parsed.data.requestedSkill ?? null,
      requestedSkillHonored: selection.requestedSkillHonored,
      policyFallback: selection.policyFallback,
      aiMode,
      supportIntensity,
    } as Json,
  });
  if (signalError) console.warn("[study-router] telemetry skipped", signalError.message);

  await routeStudyDestination({
    assignmentId,
    destination: selection.skill.destination,
  });
}

async function routeStudyDestination({
  assignmentId,
  destination,
}: {
  assignmentId: string;
  destination: StudentStudyDestination;
}): Promise<never> {
  if (destination.kind === "artifact") {
    const result = await generateStudyArtifact({
      sourceType: "assignment",
      sourceId: assignmentId,
      artifactType: destination.artifactType,
      studyMode: destination.studyMode,
    });
    if (result.ok) redirect(`/study-artifacts/${result.id}`);
    redirect(`/study?assignmentId=${assignmentId}&notice=${encodeURIComponent(result.error)}`);
  }

  if (destination.kind === "coach") {
    // Coaching now happens beside the student's work, not on a second chat
    // screen. The assignment workspace carries the source packet and draft.
    redirect(`/assignments/${assignmentId}/workspace#ask-diana`);
  }

  redirect(`/assignments/${assignmentId}/workspace#${destination.anchor}`);
}

function hasMeaningfulWork(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasMeaningfulWork);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, child]) => (
    !["workspaceMode", "workspaceModeSource", "workspaceModeSelectedAt"].includes(key) &&
    hasMeaningfulWork(child)
  ));
}
