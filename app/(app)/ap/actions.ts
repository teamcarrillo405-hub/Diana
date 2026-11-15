"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { AP_SUBJECTS, scoreBand, type ApSubjectId } from "@/lib/ap/command";

const subjectIds = AP_SUBJECTS.map((subject) => subject.id) as [ApSubjectId, ...ApSubjectId[]];

const PlanInput = z.object({
  subject: z.enum(subjectIds),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  goalBand: z.string().trim().max(20).optional(),
  currentFocus: z.string().trim().max(500).optional(),
});

const PracticeInput = z.object({
  planId: z.string().uuid().nullable().optional(),
  subject: z.enum(subjectIds),
  practiceType: z.enum(["mcq", "frq", "mixed"]),
  correctCount: z.number().int().min(0).nullable(),
  totalCount: z.number().int().min(1).max(300).nullable(),
  notes: z.string().trim().max(600).optional(),
}).refine((value) => {
  if (value.correctCount === null || value.totalCount === null) return true;
  return value.correctCount <= value.totalCount;
}, { message: "Practice counts should match the set." });

export async function saveApPlan(
  input: z.infer<typeof PlanInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = PlanInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the AP plan fields." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase.from("ap_exam_plans").insert({
    owner_id: user.id,
    subject: parsed.data.subject,
    exam_date: parsed.data.examDate,
    goal_band: parsed.data.goalBand || null,
    current_focus: parsed.data.currentFocus || null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/ap");
  return { ok: true };
}

export async function saveApPractice(
  input: z.infer<typeof PracticeInput>,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const parsed = PracticeInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the practice numbers." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const band = parsed.data.correctCount !== null && parsed.data.totalCount !== null
    ? scoreBand(parsed.data.correctCount, parsed.data.totalCount)
    : { band: null, message: "Practice saved. Add MCQ counts anytime for a band estimate." };

  let ownedPlanId: string | null = null;
  if (parsed.data.planId) {
    const { data: ownedPlan, error: planError } = await supabase
      .from("ap_exam_plans")
      .select("id, subject")
      .eq("id", parsed.data.planId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (planError || !ownedPlan || ownedPlan.subject !== parsed.data.subject) {
      return { ok: false, error: "Choose one of your saved AP plans." };
    }
    ownedPlanId = ownedPlan.id;
  }

  const { error } = await supabase.from("ap_practice_attempts").insert({
    owner_id: user.id,
    plan_id: ownedPlanId,
    subject: parsed.data.subject,
    practice_type: parsed.data.practiceType,
    correct_count: parsed.data.correctCount,
    total_count: parsed.data.totalCount,
    score_band: band.band,
    notes: parsed.data.notes || null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/ap");
  return { ok: true, message: band.message };
}
