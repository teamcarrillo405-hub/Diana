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
      .then(({ error }) => setState(error ? "error" : "success"))
      .catch(() => setState("error"));
  }, [action, token]);

  if (state === "loading") return <p>Updating your early-access preferences...</p>;
  if (state === "success") return <p>{action === "confirm" ? "Your early access is confirmed." : "You have been removed from the early-access list."}</p>;
  return <p>We could not use this link. Please return to Diana and join the early-access list again.</p>;
}
