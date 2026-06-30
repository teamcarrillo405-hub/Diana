"use client";

import { useCallback, useEffect, useRef } from "react";
import { transitionAssignment } from "@/app/(app)/assignments/[id]/actions";
import { rateCard } from "@/app/(app)/flashcards/[id]/actions";
import { createNote, saveNote } from "@/app/(app)/notes/actions";
import {
  getOfflineAssignmentStatuses,
  getOfflineFlashcardReviews,
  getOfflineNoteSaves,
  registerOfflineSync,
  removeOfflineAssignmentStatus,
  removeOfflineFlashcardReview,
  removeOfflineNoteSave,
} from "@/lib/offline/store";

const REMINDER_KEY = "diana_pwa_reminders";
const REMINDER_SEEN_KEY = "diana_pwa_reminder_seen";

export function PwaRuntime() {
  const draining = useRef(false);

  const drain = useCallback(async () => {
    if (draining.current) return;
    draining.current = true;
    try {
      for (const item of await getOfflineNoteSaves()) {
        if (item.noteId) {
          const result = await saveNote({
            id: item.noteId,
            title: item.title,
            bodyText: item.bodyText,
            classId: item.classId,
            source: item.source,
          });
          if (result.ok) await removeOfflineNoteSave(item.tempId);
        } else {
          const created = await createNote({
            title: item.title,
            assignmentId: item.assignmentId,
            classId: item.classId,
            source: item.source,
          });
          if (created.ok) {
            const saved = await saveNote({
              id: created.id,
              title: item.title,
              bodyText: item.bodyText,
              classId: item.classId,
              source: item.source,
            });
            if (saved.ok) await removeOfflineNoteSave(item.tempId);
          }
        }
      }

      for (const item of await getOfflineAssignmentStatuses()) {
        const result = await transitionAssignment({
          id: item.assignmentId,
          from: item.from as never,
          to: item.to as never,
        });
        if (!("error" in result)) await removeOfflineAssignmentStatus(item.tempId);
      }

      for (const item of await getOfflineFlashcardReviews()) {
        const result = await rateCard({ id: item.cardId, rating: item.rating });
        if (result.ok) await removeOfflineFlashcardReview(item.tempId);
      }
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
        regs.forEach((reg) => void reg.unregister());
      });
      if ("caches" in window) {
        void caches.keys().then((keys) => keys.forEach((key) => void caches.delete(key)));
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
    return () => window.removeEventListener("online", onOnline);
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
