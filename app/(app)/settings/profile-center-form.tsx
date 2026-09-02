"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { hasCurrentTeenGuardianPermission } from "@/lib/learner-access-policy";
import type { ProfilePrefs } from "@/lib/profile";
import { saveProfileCenter } from "./actions";
import { profileSchoolYearLabel } from "./source-models";

export function ProfileCenterForm({
  profile,
  formId = "profile-center-form",
}: {
  profile: ProfilePrefs;
  formId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "warn">("ok");
  const isTeen = profile.age_bracket === "13_to_17";
  const isUnder13 = profile.age_bracket === "under_13";
  const currentTeenPermission = isTeen && hasCurrentTeenGuardianPermission(profile);
  const [teenGuardianPermissionAttested, setTeenGuardianPermissionAttested] = useState(
    currentTeenPermission,
  );
  const [aiConsent, setAiConsent] = useState(
    profile.consent_ai && !isUnder13 && (!isTeen || currentTeenPermission),
  );

  return (
    <form
      id={formId}
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
            teen_guardian_permission_attested: teenGuardianPermissionAttested,
            consent_ai: aiConsent,
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
            {Array.from({ length: 11 }, (_, index) => index + 6).map((year) => (
              <option key={year} value={year}>{profileSchoolYearLabel(year)}</option>
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
        {isTeen ? (
          <div className="sd-profile-permission-group">
            <label className="sd-profile-check">
              <input
                name="teen_guardian_permission_attested"
                type="checkbox"
                checked={teenGuardianPermissionAttested}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setTeenGuardianPermissionAttested(checked);
                  if (!checked) setAiConsent(false);
                }}
              />
              <span>
                I confirm that my parent or guardian has given permission for me to use the
                13+ Diana AI beta.
              </span>
            </label>
            <p>
              This is your attestation, not identity verification or verified COPPA consent.
              Diana does not collect identity documents here. Clearing it turns off AI when
              these settings are saved.
            </p>
          </div>
        ) : null}
        <label className="sd-profile-check">
          <input
            name="consent_ai"
            type="checkbox"
            checked={aiConsent}
            disabled={isUnder13 || (isTeen && !teenGuardianPermissionAttested)}
            onChange={(event) => setAiConsent(event.target.checked)}
          />
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
