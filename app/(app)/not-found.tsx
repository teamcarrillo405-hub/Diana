import { DianaRecoveryScreen } from "@/components/screen-design/diana-recovery-screen";

export default function NotFound() {
  return <DianaRecoveryScreen eyebrow="Page unavailable" title="This page is not here anymore." message="Choose a page from the Lobby to continue." backHref="/dashboard" backLabel="Back to Lobby" />;
}
