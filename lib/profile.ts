import { createClient } from "@/lib/supabase/server";
import type {
  AgeBracket,
  FontSize,
  LineSpacing,
  ReadingSpacing,
  Tables,
  TablesInsert,
  TablesUpdate,
  TtsProvider,
  VisualPacing,
} from "@/lib/supabase/types";
import {
  isTeenGuardianPermissionSource,
  type TeenGuardianPermissionSource,
} from "@/lib/learner-access-policy";

export type TeenGuardianPermissionProfileFields = {
  teen_guardian_permission_attested_at: string | null;
  teen_guardian_permission_policy_version: string | null;
  teen_guardian_permission_source: TeenGuardianPermissionSource | null;
  teen_guardian_permission_withdrawn_at: string | null;
};

export type AppProfileInsert = TablesInsert<"profiles">
  & Partial<TeenGuardianPermissionProfileFields>;
export type AppProfileUpdate = TablesUpdate<"profiles">
  & Partial<TeenGuardianPermissionProfileFields>;

type ProfileRow = Pick<
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
  | "learning_loop_paused"
  | "learning_loop_reset_at"
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
  | "photo_url"          // 20260613 migration: cross-device lobby photo (data URL)
  | "photo_offset_x"     // 20260709 migration: drag-to-reposition crop offset (0-100)
  | "photo_offset_y"
  | "tutor_persona"
  | "tutor_style"
  | "tutor_complexity"
  | "learning_hurdle"
  | "study_schedule_preference"
> & TeenGuardianPermissionProfileFields;

export type TutorPersona = "diana" | "xavier" | "maya";
export type TutorStyle = "socratic" | "supportive" | "direct";
export type TutorComplexity = "simple" | "balanced" | "advanced";
export type LearningHurdle =
  | "time_management"
  | "exam_stress"
  | "complex_concepts"
  | "staying_consistent";
export type StudySchedulePreference = "morning" | "after_practice" | "late_night";

type NarrowedProfileFields = {
  age_bracket: AgeBracket;
  font_size: FontSize;
  line_spacing: LineSpacing;
  visual_pacing: VisualPacing;
  reading_letter_spacing: ReadingSpacing;
  reading_word_spacing: ReadingSpacing;
  tts_provider: TtsProvider;
  tutor_persona: TutorPersona;
  tutor_style: TutorStyle;
  tutor_complexity: TutorComplexity;
  learning_hurdle: LearningHurdle | null;
  study_schedule_preference: StudySchedulePreference | null;
};

export type ProfilePrefs = Omit<ProfileRow, keyof NarrowedProfileFields> &
  NarrowedProfileFields;

const AGE_BRACKETS = ["under_13", "13_to_17", "adult"] as const;
const FONT_SIZES = ["small", "normal", "large", "xlarge"] as const;
const LINE_SPACINGS = ["compact", "normal", "loose"] as const;
const VISUAL_PACING = ["off", "word", "line"] as const;
const READING_SPACING = ["normal", "wide", "wider"] as const;
const TTS_PROVIDERS = ["browser", "openai", "elevenlabs"] as const;
const TUTOR_PERSONAS = ["diana", "xavier", "maya"] as const;
const TUTOR_STYLES = ["socratic", "supportive", "direct"] as const;
const TUTOR_COMPLEXITIES = ["simple", "balanced", "advanced"] as const;
const LEARNING_HURDLES = [
  "time_management",
  "exam_stress",
  "complex_concepts",
  "staying_consistent",
] as const;
const STUDY_SCHEDULE_PREFERENCES = ["morning", "after_practice", "late_night"] as const;

function enumValue<const Values extends readonly string[]>(
  value: unknown,
  values: Values,
  fallback: Values[number],
): Values[number] {
  return typeof value === "string" && values.some((candidate) => candidate === value)
    ? value as Values[number]
    : fallback;
}

function nullableEnumValue<const Values extends readonly string[]>(
  value: unknown,
  values: Values,
): Values[number] | null {
  return typeof value === "string" && values.some((candidate) => candidate === value)
    ? value as Values[number]
    : null;
}

export function normalizeTutorPersona(value: unknown): TutorPersona {
  return enumValue(value, TUTOR_PERSONAS, "diana");
}

export function normalizeTutorStyle(value: unknown): TutorStyle {
  return enumValue(value, TUTOR_STYLES, "socratic");
}

export function normalizeTutorComplexity(value: unknown): TutorComplexity {
  return enumValue(value, TUTOR_COMPLEXITIES, "balanced");
}

function normalizeProfile(row: ProfileRow): ProfilePrefs {
  return {
    ...row,
    age_bracket: enumValue(row.age_bracket, AGE_BRACKETS, "adult"),
    font_size: enumValue(row.font_size, FONT_SIZES, "normal"),
    line_spacing: enumValue(row.line_spacing, LINE_SPACINGS, "normal"),
    visual_pacing: enumValue(row.visual_pacing, VISUAL_PACING, "off"),
    reading_letter_spacing: enumValue(row.reading_letter_spacing, READING_SPACING, "normal"),
    reading_word_spacing: enumValue(row.reading_word_spacing, READING_SPACING, "normal"),
    tts_provider: enumValue(row.tts_provider, TTS_PROVIDERS, "browser"),
    tutor_persona: normalizeTutorPersona(row.tutor_persona),
    tutor_style: normalizeTutorStyle(row.tutor_style),
    tutor_complexity: normalizeTutorComplexity(row.tutor_complexity),
    learning_hurdle: nullableEnumValue(row.learning_hurdle, LEARNING_HURDLES),
    study_schedule_preference: nullableEnumValue(
      row.study_schedule_preference,
      STUDY_SCHEDULE_PREFERENCES,
    ),
    teen_guardian_permission_source: isTeenGuardianPermissionSource(
      row.teen_guardian_permission_source,
    )
      ? row.teen_guardian_permission_source
      : null,
  };
}

export async function loadProfile(): Promise<ProfilePrefs | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (!data) return null;

  // The app-level fields intentionally stay outside generated database types.
  // Missing columns are treated as no permission, so an app ahead of its
  // migration fails closed for teen AI access.
  const extended = data as typeof data & Partial<TeenGuardianPermissionProfileFields>;
  return normalizeProfile({
    ...data,
    learning_hurdle: data.learning_hurdle ?? null,
    study_schedule_preference: data.study_schedule_preference ?? null,
    teen_guardian_permission_attested_at:
      extended.teen_guardian_permission_attested_at ?? null,
    teen_guardian_permission_policy_version:
      extended.teen_guardian_permission_policy_version ?? null,
    teen_guardian_permission_source:
      extended.teen_guardian_permission_source ?? null,
    teen_guardian_permission_withdrawn_at:
      extended.teen_guardian_permission_withdrawn_at ?? null,
  });
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
