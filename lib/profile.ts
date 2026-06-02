import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type ProfilePrefs = Pick<
  Tables<"profiles">,
  | "user_id"
  | "display_name"
  | "ai_verbosity_by_subject"
  | "age_bracket"
  | "class_count_hint"
  | "diagnoses"
  | "accommodations"
  | "school_year"
  | "extra_time_pct"
  | "interests"
  | "mastery_signals"
  | "session_mood"
  | "bionic_reading"
  | "visual_pacing"
  | "line_focus"
  | "reading_letter_spacing"
  | "reading_word_spacing"
  | "font_size"
  | "line_spacing"
  | "last_mood_checkin_at"
  | "last_weekly_reflection_at"
  | "dyslexia_font"
  | "mood_checkin_disabled"
  | "notification_preferences"
  | "privacy_preferences"
  | "reduced_motion"
  | "rough_mode_until"
  | "high_contrast"
  | "tts_enabled"
  | "tts_provider" // F4/F6/F8/F31: browser, OpenAI, or ElevenLabs TTS provider
  | "tts_speed"
  | "tts_pitch"
  | "tts_voice"
  | "onboarded_at"
  | "consent_ai"
  | "timezone"
  | "reading_font" // F19: reading font picker
  | "daily_token_budget" // AI-SAFETY-01: per-user daily token ceiling
  | "tokens_used_today"  // AI-SAFETY-01: running total for today
  | "token_reset_date"   // AI-SAFETY-01: UTC date of last reset
>;

export async function loadProfile(): Promise<ProfilePrefs | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select(
      "user_id, display_name, age_bracket, class_count_hint, diagnoses, accommodations, school_year, extra_time_pct, interests, mastery_signals, session_mood, last_mood_checkin_at, last_weekly_reflection_at, mood_checkin_disabled, rough_mode_until, ai_verbosity_by_subject, notification_preferences, privacy_preferences, bionic_reading, visual_pacing, line_focus, reading_letter_spacing, reading_word_spacing, font_size, line_spacing, dyslexia_font, reduced_motion, high_contrast, tts_enabled, tts_provider, tts_speed, tts_pitch, tts_voice, onboarded_at, consent_ai, timezone, reading_font, daily_token_budget, tokens_used_today, token_reset_date",
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
    p.bionic_reading ? "bionic-reading" : "",
    p.line_focus ? "line-focus" : "",
    `visual-pacing-${p.visual_pacing}`,
    `reading-letter-${p.reading_letter_spacing}`,
    `reading-word-${p.reading_word_spacing}`,
  ]
    .filter(Boolean)
    // deduplicate (dyslexia_font=true AND reading_font=lexend both add dyslexia-font)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(" ");
}
