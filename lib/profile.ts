import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type ProfilePrefs = Pick<
  Tables<"profiles">,
  | "user_id"
  | "display_name"
  | "age_bracket"
  | "class_count_hint"
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
  | "reading_font" // F19: reading font picker
>;

export async function loadProfile(): Promise<ProfilePrefs | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select(
      "user_id, display_name, age_bracket, class_count_hint, diagnoses, accommodations, school_year, extra_time_pct, font_size, line_spacing, dyslexia_font, reduced_motion, high_contrast, tts_enabled, onboarded_at, consent_ai, timezone, reading_font",
    )
    .eq("user_id", user.id)
    .single();
  return data;
}

export function profileBodyClass(p: ProfilePrefs | null): string {
  if (!p) return "";

  // reading_font → CSS class. 'lexend' reuses existing .dyslexia-font class.
  const readingFontClass =
    p.reading_font === "atkinson" ? "reading-font-atkinson" :
    p.reading_font === "opendyslexic" ? "reading-font-opendyslexic" :
    p.reading_font === "lexend" ? "dyslexia-font" : "";

  return [
    `font-size-${p.font_size}`,
    `line-spacing-${p.line_spacing}`,
    p.dyslexia_font ? "dyslexia-font" : "",
    readingFontClass,
    p.reduced_motion ? "reduced-motion" : "",
    p.high_contrast ? "high-contrast" : "",
  ]
    .filter(Boolean)
    // deduplicate (dyslexia_font=true AND reading_font=lexend both add dyslexia-font)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(" ");
}
