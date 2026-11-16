"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { loadAssignmentHomeworkKernel } from "@/lib/assignment-help/server-understanding";
import { ASSIGNMENT_DELIVERABLES, ASSIGNMENT_SETUP_SUBJECTS, resolveAssignmentProfile, setupSubjectForAssignmentProfile } from "@/lib/assignment-profile";
import { createClient } from "@/lib/supabase/server";
import type { AssignmentKind, Json } from "@/lib/supabase/types";

const HomeworkSetup = z.object({
  assignmentId: z.string().uuid(),
  subject: z.enum(ASSIGNMENT_SETUP_SUBJECTS),
  deliverable: z.union([z.enum(ASSIGNMENT_DELIVERABLES), z.literal("")]),
}).strict();

export async function saveHomeworkSetup(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = HomeworkSetup.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose a subject and assignment type." };
  const { assignmentId, subject, deliverable } = parsed.data;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to save your workspace setup." };

  const kernel = await loadAssignmentHomeworkKernel({ supabase, ownerId: user.id, assignmentId, eventSource: "homework_setup" });
  if (!kernel) return { ok: false, error: "Open the assignment again to change its setup." };
  const subjectOverride = subject === setupSubjectForAssignmentProfile(kernel.profile) ? undefined : subject;
  const deliverableOverride = deliverable && deliverable !== kernel.profile.deliverable ? deliverable : undefined;
  if (!subjectOverride && !deliverableOverride) return { ok: true };
  const { assignment, sourcePacket } = kernel;
  const profile = resolveAssignmentProfile({
    kind: assignment.kind as AssignmentKind,
    className: assignment.class_name,
    title: assignment.title,
    description: assignment.description,
    rubric: assignment.rubric_text,
    sourceText: [sourcePacket.directions, sourcePacket.rubric, sourcePacket.materialText].join("\n"),
    profile: kernel.profile,
    subjectOverride,
    deliverableOverride,
  });

  const { data, error } = await supabase.from("assignments").update({
    assignment_profile: {
      ...profile,
      safetyClass: kernel.profile.safetyClass === "standard" ? profile.safetyClass : kernel.profile.safetyClass,
    } as unknown as Json,
    assignment_profile_version: profile.schemaVersion,
    work_profile: profile.legacyMode,
    work_profile_source: "student_selected",
  }).eq("id", assignmentId).eq("owner_id", user.id).in("status", ["todo", "drafting", "checking", "exporting"]).select("id").maybeSingle();

  if (error || !data) return { ok: false, error: "The setup could not be saved. Your draft is still here." };
  revalidatePath(`/assignments/${assignmentId}/workspace`);
  return { ok: true };
}
