"use client";

import { createClient } from "@/lib/supabase/client";
import type { TtsProvider } from "@/lib/supabase/types";

export async function requestRemoteSpeech(input: {
  text: string;
  provider: Exclude<TtsProvider, "browser">;
  voice: string;
  speed: number;
}): Promise<Response> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  if (!supabaseUrl || !publishableKey) {
    throw new Error("Remote reading is not configured.");
  }

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Sign in to use remote reading.");

  return fetch(`${supabaseUrl}/functions/v1/tts-generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: publishableKey,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(input),
  });
}
