"use client";

import { useEffect, useState } from "react";
import { Bell, Download, RefreshCcw, WifiOff } from "lucide-react";
import { offlineQueueCounts, registerOfflineSync } from "@/lib/offline/store";

const REMINDER_KEY = "diana_pwa_reminders";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaSettings() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [reminders, setReminders] = useState(false);
  const [counts, setCounts] = useState({ notes: 0, assignments: 0, flashcards: 0 });
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);

  useEffect(() => {
    setReminders(window.localStorage.getItem(REMINDER_KEY) === "on");
    void refreshCounts();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(() => setServiceWorkerReady(true)).catch(() => {});
    }

    function onPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function refreshCounts() {
    setCounts(await offlineQueueCounts());
  }

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    setInstallPrompt(null);
  }

  async function toggleReminders() {
    if (!("Notification" in window)) return;
    const next = !reminders;
    if (next && Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
    }
    window.localStorage.setItem(REMINDER_KEY, next ? "on" : "off");
    setReminders(next);
  }

  async function syncNow() {
    await registerOfflineSync();
    await refreshCounts();
  }

  const queuedTotal = counts.notes + counts.assignments + counts.flashcards;

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div>
        <h2 className="text-sm font-semibold">Offline app</h2>
        <p className="text-sm text-muted">Install, sync queued work, and opt into calm reminders.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatusTile icon={WifiOff} label="Offline queue" value={`${queuedTotal}`} />
        <StatusTile icon={RefreshCcw} label="Sync worker" value={serviceWorkerReady ? "Ready" : "Starting"} />
        <StatusTile icon={Bell} label="Reminders" value={reminders ? "On" : "Off"} />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={install}
          disabled={!installPrompt}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50"
        >
          <Download size={16} />
          Install Diana
        </button>
        <button
          type="button"
          onClick={syncNow}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
        >
          <RefreshCcw size={16} />
          Sync now
        </button>
        <button
          type="button"
          onClick={toggleReminders}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white"
        >
          <Bell size={16} />
          {reminders ? "Turn reminders off" : "Turn reminders on"}
        </button>
      </div>
    </section>
  );
}

function StatusTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bell;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Icon size={14} />
        {label}
      </div>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}
