"use client";

import { useState,useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error,setError]=useState<string|null>(null);

  return (
    <><button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const client = createClient();
          setError(null);
          const result=await client.auth.signOut();
          if(result.error){setError("Sign out is unavailable. Please try again.");return;}
          // Retain unsynced drafts in the signed-out owner's partition. Another
          // account cannot load or replay them through the offline store.
          router.push("/");
          router.refresh();
        });
      }}
      className="rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-border/30 disabled:opacity-50"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>{error&&<p role="status">{error}</p>}</>
  );
}
