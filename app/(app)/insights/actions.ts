"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isExperimentSurfaceAllowed } from "@/lib/platform/analytics";
import { createClient } from "@/lib/supabase/server";

const Key = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9_.-]+$/i);

const FeatureFlagInput = z.object({
  flagKey: Key,
  description: z.string().trim().max(300).nullable(),
  enabled: z.boolean(),
  rolloutPct: z.number().int().min(0).max(100),
  audience: z.enum(["self", "beta", "all"]),
});

const ExperimentInput = z.object({
  experimentKey: Key,
  description: z.string().trim().max(300).nullable(),
  surface: z.string().trim().min(2).max(120),
  enabled: z.boolean(),
  allocationPct: z.number().int().min(0).max(100),
});

type ActionResult = { ok: true } | { ok: false; error: string };

export async function upsertFeatureFlag(input: z.infer<typeof FeatureFlagInput>): Promise<ActionResult> {
  const parsed = FeatureFlagInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the feature flag fields." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to update feature flags." };

  const { error } = await supabase.from("feature_flags").upsert(
    {
      owner_id: user.id,
      flag_key: parsed.data.flagKey.toLowerCase(),
      description: parsed.data.description || null,
      enabled: parsed.data.enabled,
      rollout_pct: parsed.data.rolloutPct,
      audience: parsed.data.audience,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_id,flag_key" },
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/insights");
  return { ok: true };
}

export async function upsertExperiment(input: z.infer<typeof ExperimentInput>): Promise<ActionResult> {
  const parsed = ExperimentInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the experiment fields." };
  if (!isExperimentSurfaceAllowed(parsed.data.surface)) {
    return { ok: false, error: "Use UI-only surfaces for experiments." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to update experiments." };

  const { error } = await supabase.from("experiments").upsert(
    {
      owner_id: user.id,
      experiment_key: parsed.data.experimentKey.toLowerCase(),
      description: parsed.data.description || null,
      surface: parsed.data.surface,
      variants: ["control", "variant"],
      enabled: parsed.data.enabled,
      allocation_pct: parsed.data.allocationPct,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_id,experiment_key" },
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/insights");
  return { ok: true };
}
