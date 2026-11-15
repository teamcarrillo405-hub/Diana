import { DianaRecoveryScreen } from "@/components/screen-design/diana-recovery-screen";

export default function NotFound() {
  return <DianaRecoveryScreen eyebrow="Page unavailable" title="This page is not here anymore." message="Your work is still saved. Return to Today and continue from there." backHref="/dashboard" backLabel="Back to Today" />;
}
