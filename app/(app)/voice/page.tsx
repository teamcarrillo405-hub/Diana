import { Mic } from "lucide-react";
import { VoiceCommandSurface } from "./voice-command-surface";
import { isDianaVoiceSidecarEnabled } from "@/lib/integrations/diana-voice-sidecar";
import { DianaWordmark } from "@/components/screen-design/primitives";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";

export default function VoicePage() {
  const sidecarEnabled = isDianaVoiceSidecarEnabled();

  return (
    <div className="sd-support-screen">
      <header className="sd-support-header">
        <DianaWordmark />
        <p><Mic size={14} aria-hidden="true" /> Talk to Diana</p>
        <h1>Think out loud.</h1>
        <span>Talk through what you are working on and Diana turns it into a clear next move.</span>
      </header>
      <VoiceCommandSurface sidecarEnabled={sidecarEnabled} />
      <StudentBottomNav />
    </div>
  );
}
