import { Mic } from "lucide-react";
import { VoiceCommandSurface } from "./voice-command-surface";
import { isDianaVoiceSidecarEnabled } from "@/lib/integrations/diana-voice-sidecar";
import { PageShell } from "../page-shell";

export default function VoicePage() {
  const sidecarEnabled = isDianaVoiceSidecarEnabled();

  return (
    <PageShell
      active="Work"
      eyebrow="Talk to Diana"
      title="Think out loud."
      subtitle="Talk through what you're working on and Diana turns it into a next move — hands-free."
      accent="var(--gl-lime)"
      icon={Mic}
    >
      <VoiceCommandSurface sidecarEnabled={sidecarEnabled} />
    </PageShell>
  );
}
