import { DianaRecoveryScreen } from "@/components/screen-design/diana-recovery-screen";

export default function OfflinePage() {
  return (
    <DianaRecoveryScreen
      eyebrow="Connection paused"
      title="You are offline"
      message="Your recent pages stay available. Diana will sync queued changes when the connection returns."
      backHref="/dashboard"
      backLabel="Back to today"
    />
  );
}
