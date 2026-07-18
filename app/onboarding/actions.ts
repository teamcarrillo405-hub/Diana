"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  buildScreenDesignOnboardingUpdate,
  type ScreenDesignOnboardingResult,
} from "@/lib/onboarding/screendesign";
import { createClient } from "@/lib/supabase/server";
import { normalizeInterestIds } from "@/lib/student-identity/interests";

const DIAGNOSES = z.enum([
  "adhd","dyslexia","dyscalculia","dysgraphia","asd","anxiety","other","none",
]);
const ACCOMMODATIONS = z.enum([
  "extended_time","reduced_quantity","alternate_format","reader","scribe","breaks","quiet_setting","other",
]);
const FONT_SIZE = z.enum(["small","normal","large","xlarge"]);
const LINE_SPACING = z.enum(["compact","normal","loose"]);

type ScreenDesignFieldErrors = Extract<
  ScreenDesignOnboardingResult,
  { ok: false }
>["fieldErrors"];

export type CompleteScreenDesignOnboardingResult =
  | { ok: true }
  | { ok: false; reason: "validation"; fieldErrors: ScreenDesignFieldErrors }
  | { ok: false; reason: "auth" | "persistence"; error: string };

const Input = z.object({
  diagnoses: z.array(DIAGNOSES),
  accommodations: z.array(ACCOMMODATIONS),
  school_year: z.number().int().min(9).max(13).nullable(),
  extra_time_pct: z.number().int().min(0).max(100),
  class_count_hint: z.number().int().min(1).max(8).nullable(),
  interests: z.array(z.string()).max(5).optional(),
  dyslexia_font: z.boolean().optional(),
  tts_enabled: z.boolean().optional(),
  line_spacing: LINE_SPACING.optional(),
  font_size: FONT_SIZE.optional(),
});

export async function saveOnboarding(input: z.infer<typeof Input>) {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const patch = {
    diagnoses: parsed.data.diagnoses,
    accommodations: parsed.data.accommodations,
    school_year: parsed.data.school_year,
    extra_time_pct: parsed.data.extra_time_pct,
    class_count_hint: parsed.data.class_count_hint,
    interests: normalizeInterestIds(parsed.data.interests),
    onboarded_at: new Date().toISOString(),
    ...(parsed.data.dyslexia_font !== undefined && { dyslexia_font: parsed.data.dyslexia_font }),
    ...(parsed.data.tts_enabled !== undefined && { tts_enabled: parsed.data.tts_enabled }),
    ...(parsed.data.line_spacing && { line_spacing: parsed.data.line_spacing }),
    ...(parsed.data.font_size && { font_size: parsed.data.font_size }),
  };

  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function completeScreenDesignOnboarding(
  input: unknown,
): Promise<CompleteScreenDesignOnboardingResult> {
  const validated = buildScreenDesignOnboardingUpdate(input);
  if (!validated.ok) {
    return {
      ok: false,
      reason: "validation",
      fieldErrors: validated.fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      reason: "auth",
      error: "Please sign in to finish setup.",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update(validated.update)
    .eq("user_id", user.id);

  if (error) {
    return {
      ok: false,
      reason: "persistence",
      error: "Those choices did not save yet. Your other settings are still here.",
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
