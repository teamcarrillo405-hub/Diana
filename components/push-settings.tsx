"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";

type PushState = "unsupported" | "off" | "on" | "blocked" | "working";

/**
 * Real Web Push opt-in (one calm digest a day, only when something is on
 * deck). Distinct from the local PWA reminders: this works when the app is
 * closed. Student-controlled on a per-device basis.
 */
export function PushSettings() {
  const [state, setState] = useState<PushState>("unsupported");
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "denied") {
      setState("blocked");
      return;
    }
    void navigator.serviceWorker.ready.then(async (registration) => {
      const existing = await registration.pushManager.getSubscription();
      setState(existing ? "on" : "off");
    });
  }, [publicKey]);

  async function enable() {
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      setState(res.ok ? "on" : "off");
    } catch {
      setState("off");
    }
  }

  async function disable() {
    setState("working");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setState("off");
    } catch {
      setState("on");
    }
  }

  if (!publicKey || state === "unsupported") return null;

  return (
    <section className="space-y-2 rounded-xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <BellRing size={15} className="text-brand" /> Daily heads-up
      </h2>
      <p className="text-sm text-muted">
        At most one notification a day — and only when a test is coming or something is due. Works
        even when Diana is closed. No streaks, no nagging.
      </p>
      {state === "blocked" ? (
        <p className="text-xs text-muted">
          Notifications are blocked for this site in your browser settings — allow them there first.
        </p>
      ) : (
        <button
          type="button"
          disabled={state === "working"}
          onClick={state === "on" ? disable : enable}
          className={`touch-target rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50 ${
            state === "on"
              ? "border border-border text-muted hover:bg-surface-soft"
              : "bg-brand text-white hover:bg-brand-strong"
          }`}
        >
          {state === "working" ? "One sec…" : state === "on" ? "Turn off on this device" : "Turn on"}
        </button>
      )}
    </section>
  );
}
