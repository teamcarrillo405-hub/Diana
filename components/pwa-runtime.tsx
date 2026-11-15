"use client";

import { useCallback, useEffect, useRef } from "react";
import {createClient} from "@/lib/supabase/client";
import {
  getOfflineAssignmentStatuses,
  getOfflineFlashcardReviews,
  getOfflineNoteSaves,
  registerOfflineSync,
  removeOfflineFlashcardReview,
  removeOfflineNoteSave,
  offlineOwner,
} from "@/lib/offline/store";

const REMINDER_KEY = "diana_pwa_reminders";
const REMINDER_SEEN_KEY = "diana_pwa_reminder_seen";

export function PwaRuntime() {
  const draining = useRef(false);

  const drain = useCallback(async () => {
    if (draining.current) return;
    if (!navigator.onLine) return;
    draining.current = true;
    try {
      const ownerId = await offlineOwner();
      if (!ownerId) return;
      const sync = async (payload: unknown): Promise<boolean> => {
        if (await offlineOwner() !== ownerId) return false;
        const response = await fetch("/api/learning/sync", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(() => null);
        const result = response?.ok ? await response.json().catch(() => null) : null;
        if (!response?.ok) window.dispatchEvent(new CustomEvent("diana-offline-sync-status", {
          detail: { message: response?.status === 409 ? "Saved work needs a review before syncing." : "Sync is paused. Your work is saved on this device." },
        }));
        return result?.status === "applied";
      };
      for (const item of await getOfflineNoteSaves(ownerId)) {
        if (await sync({ ownerId, kind: "note", eventId: "note:" + item.tempId + ":" + item.updatedAt, item })) {
          await removeOfflineNoteSave(item.tempId, ownerId, item.updatedAt);
        }
      }

      if ((await getOfflineAssignmentStatuses(ownerId)).length) {
        window.dispatchEvent(new CustomEvent("diana-offline-sync-status", {
          detail: { message: "Open your assignment to confirm its saved status change." },
        }));
      }

      const reviews = (await getOfflineFlashcardReviews(ownerId)).sort((a,b) => a.queuedAt.localeCompare(b.queuedAt));
      for (const item of reviews) {
        if (await sync({ ownerId, kind: "review", eventId: "review:" + item.tempId, item })) {
          await removeOfflineFlashcardReview(item.tempId, ownerId);
        }
      }
    } catch {
      // Preserve queued data when storage, authentication or network is unavailable.
    } finally {
      draining.current = false;
    }
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Only register the service worker in production. In development it serves
    // pages/bundles from Cache Storage before the network and is NOT cleared by a
    // hard refresh, so stale cached bundles mask real code changes during design
    // work. In dev, actively unregister any existing worker and drop its caches.
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.filter((reg) => [reg.active,reg.waiting,reg.installing].some((worker)=>worker?.scriptURL.endsWith("/sw.js")))
          .forEach((reg) => void reg.unregister());
      });
      if ("caches" in window) {
        void caches.keys().then((keys) => keys.filter((key) => key.startsWith("diana-pwa-")).forEach((key) => void caches.delete(key)));
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {});

    function onMessage(event: MessageEvent) {
      if (event.data?.type === "DRAIN_OFFLINE_QUEUE") void drain();
    }
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [drain]);

  useEffect(() => {
    void drain();
    function onOnline() {
      void drain();
      void registerOfflineSync();
      void showReminderIfEnabled();
    }
    window.addEventListener("online", onOnline);
    function onSyncRequest(){void drain();}
    window.addEventListener("diana-request-offline-sync",onSyncRequest);
    window.addEventListener("focus",onSyncRequest);
    const {data:{subscription}}=createClient().auth.onAuthStateChange(()=>{setTimeout(onSyncRequest,0);});
    return () => {window.removeEventListener("online", onOnline);window.removeEventListener("diana-request-offline-sync",onSyncRequest);window.removeEventListener("focus",onSyncRequest);subscription.unsubscribe();};
  }, [drain]);

  useEffect(() => {
    void showReminderIfEnabled();
  }, []);

  return null;
}

async function showReminderIfEnabled() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (window.localStorage.getItem(REMINDER_KEY) !== "on") return;
  if (Notification.permission !== "granted") return;

  const today = new Date().toISOString().slice(0, 10);
  if (window.localStorage.getItem(REMINDER_SEEN_KEY) === today) return;

  const response = await fetch("/api/pwa/reminders").catch(() => null);
  if (!response?.ok) return;
  const body = (await response.json().catch(() => null)) as { count?: number; nextTitle?: string } | null;
  if (!body?.count) return;

  const registration = await navigator.serviceWorker.ready.catch(() => null);
  await registration?.showNotification("Diana", {
    body: body.nextTitle ? `One task is ready: ${body.nextTitle}` : "A task is ready when you are.",
    icon: "/icons/diana-icon.svg",
    badge: "/icons/diana-icon.svg",
    tag: "diana-reminder",
    data: { url: "/dashboard" },
  });
  window.localStorage.setItem(REMINDER_SEEN_KEY, today);
}
