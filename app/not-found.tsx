import { DianaRecoveryScreen } from "@/components/screen-design/diana-recovery-screen";

export default function RootNotFound() {
  return <DianaRecoveryScreen eyebrow="Page unavailable" title="This page is not here anymore." message="Return to the start and choose where you want to go next." backHref="/" backLabel="Back to start" />;
}
