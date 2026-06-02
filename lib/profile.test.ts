// lib/profile.test.ts
import { describe, it, expect } from "vitest";
import { profileBodyClass } from "./profile";
import type { ProfilePrefs } from "./profile";

const BASE: ProfilePrefs = {
  user_id: "u1",
  display_name: "Test",
  age_bracket: "teen",
  class_count_hint: null,
  diagnoses: [],
  accommodations: [],
  ai_verbosity_by_subject: {},
  school_year: null,
  extra_time_pct: 0,
  interests: [],
  mastery_signals: {},
  session_mood: null,
  last_mood_checkin_at: null,
  last_weekly_reflection_at: null,
  mood_checkin_disabled: false,
  notification_preferences: {},
  privacy_preferences: {},
  rough_mode_until: null,
  bionic_reading: false,
  visual_pacing: "off",
  line_focus: false,
  reading_letter_spacing: "normal",
  reading_word_spacing: "normal",
  font_size: "normal",
  line_spacing: "normal",
  dyslexia_font: false,
  reduced_motion: false,
  high_contrast: false,
  tts_enabled: false,
  tts_provider: "browser",
  tts_speed: 1,
  tts_pitch: 1,
  tts_voice: "nova",
  onboarded_at: null,
  consent_ai: false,
  timezone: "UTC",
  reading_font: "system",
  daily_token_budget: 50000,
  tokens_used_today: 0,
  token_reset_date: "2026-05-29",
};

describe("profileBodyClass reading_font", () => {
  it("returns reading-font-atkinson for reading_font=atkinson", () => {
    const classes = profileBodyClass({ ...BASE, reading_font: "atkinson" });
    expect(classes).toContain("reading-font-atkinson");
  });

  it("returns reading-font-opendyslexic for reading_font=opendyslexic", () => {
    const classes = profileBodyClass({ ...BASE, reading_font: "opendyslexic" });
    expect(classes).toContain("reading-font-opendyslexic");
  });

  it("returns dyslexia-font for reading_font=lexend", () => {
    const classes = profileBodyClass({ ...BASE, reading_font: "lexend" });
    expect(classes).toContain("dyslexia-font");
  });

  it("returns no reading font class for reading_font=system", () => {
    const classes = profileBodyClass({ ...BASE, reading_font: "system" });
    expect(classes).not.toContain("reading-font");
  });

  it("returns empty string for null profile", () => {
    expect(profileBodyClass(null)).toBe("");
  });

  it("does not duplicate dyslexia-font when dyslexia_font=true and reading_font=lexend", () => {
    const classes = profileBodyClass({ ...BASE, dyslexia_font: true, reading_font: "lexend" });
    const parts = classes.split(" ").filter((c) => c === "dyslexia-font");
    expect(parts).toHaveLength(1);
  });

  it("returns reading mode classes for Phase 13 preferences", () => {
    const classes = profileBodyClass({
      ...BASE,
      bionic_reading: true,
      visual_pacing: "line",
      line_focus: true,
      reading_letter_spacing: "wide",
      reading_word_spacing: "wider",
    });
    expect(classes).toContain("bionic-reading");
    expect(classes).toContain("line-focus");
    expect(classes).toContain("visual-pacing-line");
    expect(classes).toContain("reading-letter-wide");
    expect(classes).toContain("reading-word-wider");
  });
});
