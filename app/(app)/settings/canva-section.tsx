import { Palette } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { canvaEnv } from "@/lib/integrations/canva";
import { isCanvaConnected } from "@/lib/integrations/canva-server";
import { CanvaDisconnectButton } from "./canva-disconnect-button";

/** Canva (design tool) connection — distinct from the Canvas LMS sync. */
export async function CanvaSection() {
  const env = canvaEnv();
  const supabase = await createClient();
  const connected = env ? await isCanvaConnected(supabase) : false;

  return (
    <section className="space-y-2 rounded-xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Palette size={15} className="text-brand" /> Canva
      </h2>
      <p className="text-sm text-muted">
        For poster and slide assignments: Diana opens a draft in your Canva account with a brief
        built from your rubric and notes. The design stays yours.
      </p>
      {!env ? (
        <p className="text-xs text-muted">
          Not set up yet: an admin needs to add Canva developer keys (see docs/CANVA_SETUP.md).
        </p>
      ) : connected ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ok">Connected to your Canva account.</p>
          <CanvaDisconnectButton />
        </div>
      ) : (
        <a
          href="/api/canva/connect"
          className="touch-target inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong"
        >
          Connect Canva
        </a>
      )}
    </section>
  );
}
