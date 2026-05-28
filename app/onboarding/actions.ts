"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const DIAGNOSES = z.enum([
  "adhd","dyslexia","dyscalculia","dysgraphia","asd","anxiety","other","none",
]);
const ACCOMMODATIONS = z.enum([
  "extended_time","reduced_quantity","alternate_format","reader","scribe","breaks","quiet_setting","other",
]);
const FONT_SIZE = z.enum(["small","normal","large","xlarge"]);
const LINE_SPACING = z.enum(["compact","normal","loose"]);

const Input = z.object({
  diagnoses: z.array(DIAGNOSES),
  accommodations: z.array(ACCOMMODATIONS),
  school_year: z.number().int().min(9).max(13).nullable(),
  extra_time_pct: z.number().int().min(0).max(100),
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
