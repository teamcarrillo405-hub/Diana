"use client";

import { useTransition, useState } from "react";

import { emailAiHistoryExport } from "@/app/(app)/export/actions";

export function AiHistoryExport() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function requestExport() {
    setMessage(null);
    startTransition(async () => {
      const result = await emailAiHistoryExport();
      setMessage(
        result.ok
          ? `Your last 45 days of AI activity (${result.recordCount} records) are on their way to your email.`
          : result.error,
      );
    });
  }

  return (
    <div className="sd-settings-account-row" id="ai-history-export">
      <div>
        <strong>AI activity export</strong>
        <p>Email yourself the last 45 days of AI activity.</p>
        {message ? <p role="status">{message}</p> : null}
      </div>
      <button type="button" onClick={requestExport} disabled={pending}>
        {pending ? "Preparing" : "Email me"}
      </button>
    </div>
  );
}
