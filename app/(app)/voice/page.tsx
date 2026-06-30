import { VoiceCommandSurface } from "./voice-command-surface";
import { isDianaVoiceSidecarEnabled } from "@/lib/integrations/diana-voice-sidecar";
import { AppTopNav } from "../app-top-nav";

export default function VoicePage() {
  const sidecarEnabled = isDianaVoiceSidecarEnabled();

  return (
    <>
      <AppTopNav active="Work" />
      <div className="diana-page">
        <VoiceCommandSurface sidecarEnabled={sidecarEnabled} />
      </div>
    </>
  );
}
