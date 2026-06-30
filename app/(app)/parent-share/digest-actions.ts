"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Input = z.object({
  email: z.string().trim().email().max(200).or(z.literal("")),
  enabled: z.boolean(),
});

/**
 * Student-controlled parent digest opt-in. The student enters (and can
 * remove) the address — Diana never collects parent contacts another way.
 */
export async function saveParentDigest(input: z.infer<typeof Input>): Promise<{ ok: boolean; error?: string }> {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the email address." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("notification_preferences")
    .eq("user_id", user.id)
    .maybeSingle();

  const current = (profile?.notification_preferences ?? {}) as Record<string, unknown>;
  const next = {
    ...current,
    parentDigest: {
      email: parsed.data.email,
      enabled: parsed.data.enabled && parsed.data.email.length > 0,
    },
  };

  const { error } = await supabase
    .from("profiles")
    .update({ notification_preferences: next })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "Couldn't save just now — try again." };

  revalidatePath("/sharing");
  return { ok: true };
}
