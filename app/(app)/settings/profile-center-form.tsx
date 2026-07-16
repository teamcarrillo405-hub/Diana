"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { ProfilePrefs } from "@/lib/profile";
import { saveProfileCenter } from "./actions";

export function ProfileCenterForm({ profile }: { profile: ProfilePrefs }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "warn">("ok");

  return (
    <form
      id="profile-center-form"
      className="sd-profile-form"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const schoolYear = String(formData.get("school_year") ?? "").trim();
        startTransition(async () => {
          const result = await saveProfileCenter({
            display_name: String(formData.get("display_name") ?? ""),
            school_year: schoolYear ? Number(schoolYear) : null,
            timezone: String(formData.get("timezone") ?? ""),
            learning_hurdle: nullableValue(formData.get("learning_hurdle")) as ProfilePrefs["learning_hurdle"],
            study_schedule_preference: nullableValue(formData.get("study_schedule_preference")) as ProfilePrefs["study_schedule_preference"],
            consent_ai: formData.get("consent_ai") === "on",
          });
          setTone(result.ok ? "ok" : "warn");
          setMessage(result.message);
          if (result.ok) router.refresh();
        });
      }}
    >
      <fieldset disabled={pending}>
        <label>
          <span>Display name</span>
          <input name="display_name" defaultValue={profile.display_name ?? ""} maxLength={80} />
        </label>
        <label>
          <span>School year</span>
          <select name="school_year" defaultValue={profile.school_year ?? ""}>
            <option value="">Not set</option>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((year) => (
              <option key={year} value={year}>Year {year}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Timezone</span>
          <input name="timezone" defaultValue={profile.timezone} maxLength={80} />
        </label>
        <label>
          <span>Main learning hurdle</span>
          <select name="learning_hurdle" defaultValue={profile.learning_hurdle ?? ""}>
            <option value="">Not set</option>
            <option value="time_management">Managing time</option>
            <option value="exam_stress">Exam stress</option>
            <option value="complex_concepts">Complex concepts</option>
            <option value="staying_consistent">Staying consistent</option>
          </select>
        </label>
        <label>
          <span>Best study time</span>
          <select name="study_schedule_preference" defaultValue={profile.study_schedule_preference ?? ""}>
            <option value="">Not set</option>
            <option value="morning">Morning</option>
            <option value="after_practice">After practice</option>
            <option value="late_night">Late night</option>
          </select>
        </label>
        <label className="sd-profile-check">
          <input name="consent_ai" type="checkbox" defaultChecked={profile.consent_ai} />
          <span>Allow age-appropriate AI coaching</span>
        </label>
      </fieldset>
      {message ? <p className="sd-profile-form-message" data-tone={tone}>{message}</p> : null}
    </form>
  );
}

function nullableValue(value: FormDataEntryValue | null): string | null {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || null;
}
