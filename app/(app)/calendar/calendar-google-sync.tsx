"use client";

import { CalendarCheck2, RefreshCw } from "lucide-react";
import { useState } from "react";

type Props = { connected: boolean; available: boolean };

export function CalendarGoogleSync({ connected, available }: Props) {
  const [state, setState] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function sync() {
    setState("syncing");
    setMessage("");
    try {
      const response = await fetch("/api/calendar/google-sync", { method: "POST" });
      const payload = await response.json() as { imported?: number; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Calendar sync could not finish.");
      setMessage(`${payload.imported ?? 0} event${payload.imported === 1 ? "" : "s"} synced.`);
      setState("done");
      window.setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Calendar sync could not finish.");
      setState("error");
    }
  }

  if (!connected) {
    return (
      <section className="sd-calendar-google-sync" aria-labelledby="google-calendar-heading">
        <CalendarCheck2 aria-hidden="true" />
        <div>
          <p id="google-calendar-heading">Google Calendar</p>
          <span>Keep your schedule beside your school work.</span>
        </div>
        {available ? (
          <a href="/api/lms/google-oauth/start?calendar=1&return_to=/calendar">Connect</a>
        ) : (
          <span className="sd-calendar-google-unavailable">Unavailable here</span>
        )}
      </section>
    );
  }

  return (
    <section className="sd-calendar-google-sync" aria-labelledby="google-calendar-heading">
      <CalendarCheck2 aria-hidden="true" />
      <div>
        <p id="google-calendar-heading">Google Calendar</p>
        <span>{state === "done" ? message : "Connected"}</span>
      </div>
      <button type="button" onClick={sync} disabled={state === "syncing"}>
        <RefreshCw aria-hidden="true" data-spinning={state === "syncing" || undefined} />
        {state === "syncing" ? "Syncing" : "Sync"}
      </button>
      {state === "error" ? <output>{message}</output> : null}
    </section>
  );
}
