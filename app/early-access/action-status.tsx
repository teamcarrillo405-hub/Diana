"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function EarlyAccessActionStatus({ action, token }: { action: "confirm" | "unsubscribe"; token: string | undefined }) {
  const [state, setState] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }
    const supabase = createClient();
    supabase.functions.invoke(`early-access-${action}`, { body: { token } })
      .then(({ data, error }) => setState(error || data?.error || data?.ok === false ? "error" : "success"))
      .catch(() => setState("error"));
  }, [action, token]);

  if (state === "loading") return <p role="status">Updating your early-access preferences...</p>;
  if (state === "success") return <p role="status">{action === "confirm" ? "Your email is confirmed. We will email you when your invitation is ready." : "You have been removed from the early-access list."}</p>;
  return <p role="status">We could not use this link. Open the latest email from Diana or return to the early-access form.</p>;
}
