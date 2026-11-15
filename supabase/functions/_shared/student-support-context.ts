// Private student-support preferences become fixed instructional guidance only.
// Never interpolate stored free text, diagnoses or wellness values into a prompt.
type Result = { data: Record<string, unknown> | null; error: unknown };
type Query = {
  select(columns: string): Query;
  eq(column: string, value: string): Query;
  maybeSingle(): PromiseLike<Result>;
};
type Database = { from(table: string): Query };

const ACCOMMODATION_GUIDANCE: Record<string, string> = {
  extended_time: "Allow the student to work at their own pace. Do not impose a timer.",
  reduced_quantity: "Present one manageable part at a time; do not change assignment requirements.",
  alternate_format: "Offer another explanation format when useful, and let the student choose.",
  reader: "Use clear, short passages and offer to read or explain directions one part at a time.",
  scribe: "Support the student's own expression; do not complete or submit their work.",
  breaks: "Offer an optional pause between steps without interrupting the student's choice.",
  quiet_setting: "Keep guidance calm and uncluttered; do not assume the student's surroundings.",
};

const OPTIONAL_PAUSE = "A student requested an optional pause for a basic need. Offer a pause or a small next step; let the student choose. Do not infer a cause, mention a private check-in, or give medical advice.";
const GENTLE_PACING = "Offer a manageable next step and a choice of pacing. Do not infer a cause or mention a private check-in.";
const DAY_MS = 24 * 60 * 60 * 1000;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** The caller must first authenticate and authorize ownerId. Queries run under that user's RLS. */
export async function loadStudentSupportPersonalization(
  client: unknown,
  ownerId: string,
  now = Date.now(),
): Promise<string | null> {
  try {
    const db = client as Database;
    // A separate read ensures opt-out does not read either sensitive source.
    const permission = await db.from("profiles").select("tutor_personalization_enabled")
      .eq("user_id", ownerId).maybeSingle();
    if (permission.error || permission.data?.tutor_personalization_enabled !== true) return null;

    const [profile, daily] = await Promise.all([
      db.from("profiles").select("accommodations,session_mood,last_mood_checkin_at").eq("user_id", ownerId).maybeSingle(),
      db.from("student_daily_support_needs").select("need,updated_at,expires_at")
        .eq("owner_id", ownerId).maybeSingle(),
    ]);
    const choices = !profile.error && Array.isArray(profile.data?.accommodations)
      ? profile.data.accommodations : [];
    const lines = [...new Set(choices.filter((value): value is string =>
      typeof value === "string" && Object.hasOwn(ACCOMMODATION_GUIDANCE, value)))]
      .map((value) => ACCOMMODATION_GUIDANCE[value]);

    const moodAt = typeof profile.data?.last_mood_checkin_at === "string"
      ? Date.parse(profile.data.last_mood_checkin_at) : NaN;
    if (!profile.error && (profile.data?.session_mood === "rough" || profile.data?.session_mood === "meh") &&
      Number.isFinite(moodAt) && moodAt <= now && now - moodAt <= DAY_MS) {
      lines.push(GENTLE_PACING);
    }

    if (!daily.error && record(daily.data)) {
      const { need, updated_at: updatedAt, expires_at: expiresAt } = daily.data;
      const updated = typeof updatedAt === "string" ? Date.parse(updatedAt) : NaN;
      const expires = typeof expiresAt === "string" ? Date.parse(expiresAt) : NaN;
      if ((need === "food" || need === "water" || need === "break") &&
        Number.isFinite(updated) && Number.isFinite(expires) && updated <= now &&
        now - updated <= DAY_MS && expires > now && expires <= updated + DAY_MS + 1000) {
        lines.push(OPTIONAL_PAUSE);
      }
    }
    // A preference can be withdrawn while the sources are being read.
    const stillPermitted = await db.from("profiles").select("tutor_personalization_enabled")
      .eq("user_id", ownerId).maybeSingle();
    if (stillPermitted.error || stillPermitted.data?.tutor_personalization_enabled !== true) return null;
    return lines.length ? "Student-selected support preferences:\n" + lines.join("\n") : null;
  } catch {
    // Missing migration, revoked access or connectivity must not block schoolwork.
    return null;
  }
}
