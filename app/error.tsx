"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { reportClientError } from "@/lib/monitoring/client";
import { retryErrorBoundary } from "@/lib/error-recovery";
import { DianaRecoveryScreen } from "@/components/screen-design/diana-recovery-screen";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  const retry = () => {
    retryErrorBoundary({
      reset,
      refresh: router.refresh,
      reload: () => window.location.reload(),
    });
  };

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") console.error(error);
    reportClientError(error, window.location.pathname);
  }, [error]);

  return <DianaRecoveryScreen eyebrow="Connection paused" title="This page needs another try." message="Try refreshing. Changes that were not saved may need to be entered again." backHref="/" backLabel="Back to start" onRetry={retry} />;
}
