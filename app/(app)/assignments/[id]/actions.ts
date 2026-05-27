"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { canTransition } from "@/lib/state-machine/assignment";

const STATUSES = ["todo","drafting","checking","exporting","submitted","graded","abandoned"] as const;

const Input = z.object({
  id: z.string().uuid(),
  from: z.enum(STATUSES),
  to: z.enum(STATUSES),
});

const DEFAULT_CHECKLIST: Array<{ label: string; detail: string | null; required: boolean }> = [
  { label: "Your name is on the file", detail: "Or required in the document header.", required: true },
  { label: "File is in the format the teacher asked for", detail: "PDF, .docx, link, etc.", required: true },
  { label: "Reread the rubric for what's worth points", detail: "Even the parts that feel obvious.", required: true },
  { label: "You actually answered the prompt — not a tangent", detail: null, required: true },
  { label: "Spell-check finished without red", detail: null, required: false },
  { label: "Citations or sources included if needed", detail: null, required: false },
];

export async function transitionAssignment(input: z.infer<typeof Input>) {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };
  const { id, from, to } = parsed.data;

  if (!canTransition(from, to)) return { error: "Not allowed from here." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const patch: { status: typeof to; submitted_at?: string } = { status: to };
  if (to === "submitted") patch.submitted_at = new Date().toISOString();

  const { error } = await supabase
    .from("assignments")
    .update(patch)
    .eq("id", id)
    .eq("status", from);
  if (error) return { error: error.message };

  if (to === "drafting" || to === "submitted") {
    await supabase.from("task_signals").insert({
      owner_id: user.id,
      kind: to === "drafting" ? "started" : "completed",
      assignment_id: id,
    });
  }

  if (to === "exporting") {
    const { count } = await supabase
      .from("submission_checklist")
      .select("*", { count: "exact", head: true })
      .eq("assignment_id", id);

    if (!count) {
      await supabase.from("submission_checklist").insert(
        DEFAULT_CHECKLIST.map((c, i) => ({
          owner_id: user.id,
          assignment_id: id,
          label: c.label,
          detail: c.detail,
          required: c.required,
          position: i,
        })),
      );
    }
  }

  revalidatePath(`/assignments/${id}`);
  revalidatePath("/assignments");
  revalidatePath("/dashboard");

  if (to === "exporting") {
    return { redirect: `/assignments/${id}/submit` as const };
  }
  return { ok: true } as { ok: true; redirect?: undefined };
}

const Toggle = z.object({ itemId: z.string().uuid(), checked: z.boolean() });
export async function toggleChecklistItem(input: z.infer<typeof Toggle>) {
  const parsed = Toggle.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("submission_checklist")
    .update({ checked: parsed.data.checked })
    .eq("id", parsed.data.itemId);
  if (error) return { error: error.message };
  return { ok: true };
}

const Url = z.object({ id: z.string().uuid(), url: z.string().url().nullable() });
export async function setSubmissionUrl(input: z.infer<typeof Url>) {
  const parsed = Url.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("assignments")
    .update({ submission_url: parsed.data.url })
    .eq("id", parsed.data.id);
  if (error) return { error: error.message };
  revalidatePath(`/assignments/${parsed.data.id}/submit`);
  return { ok: true };
}
