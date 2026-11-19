import type { Metadata } from "next";
import { DianaRecoveryScreen } from "@/components/screen-design/diana-recovery-screen";

// Recovery rewrites must render with the current request's nonce.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: false },
};

export default function PublicNotFoundPage() {
  return (
    <DianaRecoveryScreen
      eyebrow="Page unavailable"
      title="This page is not here anymore."
      message="Return to the start and choose where you want to go next."
      backHref="/"
      backLabel="Back to start"
    />
  );
}
