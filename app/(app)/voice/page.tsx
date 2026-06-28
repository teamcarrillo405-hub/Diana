import { VoiceCommandSurface } from "./voice-command-surface";
import { isDianaVoiceSidecarEnabled } from "@/lib/integrations/diana-voice-sidecar";

export default function VoicePage() {
  const sidecarEnabled = isDianaVoiceSidecarEnabled();

  return (
    <div className="diana-page">
      <VoiceCommandSurface sidecarEnabled={sidecarEnabled} />
    </div>
  );
}
