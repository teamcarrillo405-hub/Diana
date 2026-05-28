import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type ProfilePrefs = Pick<
  Tables<"profiles">,
  | "user_id"
  | "display_name"
  | "age_bracket"
  | "diagnoses"
  | "accommodations"
  | "school_year"
  | "extra_time_pct"
  | "font_size"
  | "line_spacing"
  | "dyslexia_font"
  | "reduced_motion"
  | "high_contrast"
  | "tts_enabled"
  | "onboarded_at"
  | "consent_ai"
  | "timezone"
>;

export async function loadProfile(): Promise<ProfilePrefs | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select(
      "user_id, display_name, age_bracket, diagnoses, accommodations, school_year, extra_time_pct, font_size, line_spacing, dyslexia_font, reduced_motion, high_contrast, tts_enabled, onboarded_at, consent_ai, timezone",
    )
    .eq("user_id", user.id)
    .single();
  return data;
}

export function profileBodyClass(p: ProfilePrefs | null): string {
  if (!p) return "";
  return [
    `font-size-${p.font_size}`,
    `line-spacing-${p.line_spacing}`,
    p.dyslexia_font ? "dyslexia-font" : "",
    p.reduced_motion ? "reduced-motion" : "",
    p.high_contrast ? "high-contrast" : "",
  ]
    .filter(Boolean)
    .join(" ");
}
