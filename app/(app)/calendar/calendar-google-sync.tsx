"use client";

import { CalendarCheck2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { safeCalendarReturnHref } from "@/lib/calendar-return";
import { calendarTimeZone } from "@/lib/calendar/time-zone";
import styles from "./calendar-google-sync.module.css";

type Props = {
  connected: boolean;
  available: boolean;
  returnTo?: string;
  lastSyncedAt?: string | null;
  rangeStart?: string | null;
  rangeEnd?: string | null;
  timeZone?: string;
  initialStatus?: string;
};

const MESSAGES: Record<string, string> = {
  "calendar-connected": "Google Calendar connected and synced.",
  "calendar-connected-sync-later": "Google Calendar connected. Sync again to bring in your events.",
  denied: "Google Calendar permission wasn’t added. Connect when you’re ready.",
  "scope-error": "Google Calendar permission is needed. Reconnect to choose it.",
  "token-error": "Google Calendar could not connect. Try connecting again.",
  "state-mismatch": "The connection session expired. Try connecting again.",
  "invalid-response": "Google Calendar could not confirm the connection. Try again.",
  "save-error": "Google Calendar could not save the connection. Try again.",
  "not-configured": "Google Calendar isn’t configured here yet.",
  "vault-unavailable": "Google Calendar is temporarily unavailable. Try again later.",
  disabled: "Google Calendar syncing is unavailable here.",
  "sign-in": "Sign in again to connect Google Calendar.",
  reconnect_required: "Reconnect Google Calendar to continue syncing.",
};

export function CalendarGoogleSync({ connected, available, returnTo, lastSyncedAt, rangeStart, rangeEnd, timeZone, initialStatus }: Props) {
  const initialMessage = initialStatus && Object.hasOwn(MESSAGES, initialStatus) ? MESSAGES[initialStatus] : "";
  const router = useRouter();
  const [state, setState] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [code, setCode] = useState(initialStatus ?? "");
  const [message, setMessage] = useState(initialMessage);
  const [successfulSync, setSuccessfulSync] = useState(lastSyncedAt);
  const [range, setRange] = useState({ start: rangeStart, end: rangeEnd });
  const calendar = safeCalendarReturnHref(returnTo) ?? "/calendar";
  const connectHref = `/api/lms/google-oauth/start?${new URLSearchParams({ calendar: "1", return_to: calendar })}`;
  const reconnect = ["reconnect_required", "scope-error", "calendar_permission_required", "connection_required"].includes(code);
  const attention = state === "error" || reconnect || (state === "idle" && Boolean(initialMessage) && initialStatus !== "calendar-connected");
  const zone = calendarTimeZone(timeZone);
  const date = (value?: string | null) => {
    const parsed = value ? new Date(value) : null;
    return parsed && Number.isFinite(parsed.getTime())
      ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: zone }).format(parsed) : null;
  };
  const updated = successfulSync && Number.isFinite(Date.parse(successfulSync))
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: zone }).format(new Date(successfulSync)) : null;

  async function sync() {
    setState("syncing");
    setMessage("");
    setCode("");
    try {
      const response = await fetch("/api/calendar/google-sync", { method: "POST" });
      const payload = await response.json() as { imported?: number; error?: string; code?: string; syncedAt?: string; rangeStart?: string; rangeEnd?: string };
      if (!response.ok) {
        setCode(payload.code ?? "");
        setMessage(payload.code === "reconnect_required" ? MESSAGES.reconnect_required : payload.error ?? "Google Calendar could not sync. Try again.");
        setState("error");
        return;
      }
      setMessage(`${payload.imported ?? 0} event${payload.imported === 1 ? "" : "s"} synced.`);
      setSuccessfulSync(payload.syncedAt ?? successfulSync);
      setRange({ start: payload.rangeStart ?? range.start, end: payload.rangeEnd ?? range.end });
      setState("done");
      router.refresh();
    } catch {
      setMessage("Google Calendar could not sync. Try again shortly.");
      setState("error");
    }
  }

  return <section className={`sd-calendar-google-sync ${styles.card}`} aria-labelledby="google-calendar-heading">
    <CalendarCheck2 className={styles.mark} aria-hidden="true" />
    <div className={styles.details}>
      <p className={styles.title} id="google-calendar-heading">Google Calendar</p>
      <span className={connected ? styles.meta : styles.description}>{connected ? `Primary calendar · ${updated ? `Last synced ${updated}` : "Not synced yet"}` : "Keep your schedule beside your school work."}</span>
      {connected && date(range.start) && date(range.end) ? <span className={styles.range}>Events from {date(range.start)} through {date(range.end)}</span> : null}
    </div>
    {!available ? <span className={`sd-calendar-google-unavailable ${styles.unavailable}`}>Unavailable here</span>
      : !connected || reconnect ? <a className={styles.action} data-reconnect={reconnect || undefined} href={connectHref}>{reconnect ? "Reconnect Google Calendar" : "Connect Google Calendar"}</a>
        : <button className={styles.action} type="button" onClick={sync} disabled={state === "syncing"}>
          <RefreshCw aria-hidden="true" data-spinning={state === "syncing" || undefined} />
          {state === "syncing" ? "Syncing" : "Sync"}
        </button>}
    {message ? <output className={styles.feedback} data-attention={attention || undefined} role="status" aria-live="polite">{message}</output> : null}
  </section>;
}
