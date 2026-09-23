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
    let active = true;
    const supabase = createClient();
    supabase.functions.invoke(`early-access-${action}`, { body: { token } })
      .then(({ error }) => { if (active) setState(error ? "error" : "success"); })
      .catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, [action, token]);

  return <p role="status">{state === "loading"
    ? "Updating your early-access preferences..."
    : state === "success"
      ? action === "confirm" ? "Your early access is confirmed." : "You have been removed from the early-access list."
      : "We could not use this link. Please return to Diana and join the early-access list again."}</p>;
}
