import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { effectiveAiMode, evaluateProfileEligibility, isDeletionActive } from "@/supabase/functions/_shared/auth-policy";

type Client = Pick<SupabaseClient<Database>, "from">;
type Eligibility = { ok: true; classId: string | null } | { ok: false; status: number; error: string };

/** Authorize all study-buddy output, including deterministic and QA branches. */
export async function studyBuddyEligibility(client: Client, input: {
  ownerId: string; assignmentId: string | null; classId: string | null;
}): Promise<Eligibility> {
  try {
    const [profile, deletion] = await Promise.all([
      client.from("profiles").select("age_bracket,consent_ai").eq("user_id", input.ownerId).maybeSingle(),
      client.from("data_deletion_requests").select("status").eq("owner_id", input.ownerId)
        .not("status", "in", "(completed,cancelled)").limit(1).maybeSingle(),
    ]);
    if (profile.error || deletion.error) return { ok: false, status: 503, error: "Account eligibility could not be verified." };
    if (!profile.data || !evaluateProfileEligibility(profile.data).allowed) {
      return { ok: false, status: 403, error: "Account age eligibility and AI consent are required for Diana study help." };
    }
    if (isDeletionActive(deletion.data?.status)) return { ok: false, status: 403, error: "Study help is unavailable while account deletion is active." };

    let classId = input.classId;
    let assignmentOverride: unknown = null;
    if (input.assignmentId) {
      const assignment = await client.from("assignments").select("class_id,ai_mode_override")
        .eq("id", input.assignmentId).eq("owner_id", input.ownerId).maybeSingle();
      if (assignment.error) return { ok: false, status: 503, error: "Assignment access could not be verified." };
      if (!assignment.data) return { ok: false, status: 404, error: "Assignment not found." };
      if (input.classId && input.classId !== assignment.data.class_id) {
        return { ok: false, status: 403, error: "The selected class does not match this assignment." };
      }
      classId = assignment.data.class_id;
      assignmentOverride = assignment.data.ai_mode_override;
      if (!classId) return { ok: false, status: 403, error: "Assignment policy could not be verified." };
    }
    if (classId) {
      const course = await client.from("classes").select("ai_mode").eq("id", classId).eq("owner_id", input.ownerId).maybeSingle();
      if (course.error) return { ok: false, status: 503, error: "Class access could not be verified." };
      if (!course.data) return { ok: false, status: 404, error: "Class not found." };
      if (effectiveAiMode(assignmentOverride, course.data.ai_mode) !== "green") {
        return { ok: false, status: 403, error: "This class or assignment does not allow tutoring help." };
      }
    }
    return { ok: true, classId };
  } catch {
    return { ok: false, status: 503, error: "Study help eligibility could not be verified." };
  }
}
