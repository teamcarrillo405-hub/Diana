"use server";

import { createClient } from "@/lib/supabase/server";
import {
  resetLearnerProfile,
  setLearnerPersonalizationPaused,
} from "@/lib/learning-loop/server";

export async function resetLearningLoopAction(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await resetLearnerProfile({ supabase, ownerId: user.id });
}

export async function pauseLearningLoopAction(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await setLearnerPersonalizationPaused({ supabase, ownerId: user.id, paused: true });
}

export async function resumeLearningLoopAction(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await setLearnerPersonalizationPaused({ supabase, ownerId: user.id, paused: false });
}
