"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { enqueueInboxItem, getQueuedItems, removeQueuedItem } from "@/lib/inbox/queue";
import type { CaptureMode } from "@/lib/inbox/types";
import { saveInboxItem, uploadInboxPhoto } from "./actions";
import { VoiceTextarea } from "@/components/voice-textarea";

type Tab = "text" | "voice" | "photo";
type Status = "idle" | "saved" | "offline" | "error";

export function CaptureForm() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<Tab>("text");
  const [raw, setRaw] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [photoStorageKey, setPhotoStorageKey] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drainingRef = useRef(false);

  // Drain queued items when online
  async function drainQueue() {
    if (drainingRef.current) return;
    drainingRef.current = true;
    try {
      const queued = await getQueuedItems();
      for (const item of queued) {
        const result = await saveInboxItem({
          raw: item.raw,
          captureMode: item.captureMode,
          photoStorageKey: item.photoStorageKey,
        });
        if (result.ok) {
          await removeQueuedItem(item.tempId);
        }
      }
    } catch {
      // Silent — items stay queued
    } finally {
      drainingRef.current = false;
    }
  }

  useEffect(() => {
    // Drain on mount
    drainQueue();

    // Drain when connectivity is restored
    function onOnline() {
      drainQueue();
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const result = await uploadInboxPhoto(formData);
      if (result.ok) {
        setPhotoStorageKey(result.storageKey);
        // Use filename as raw text for photo captures
        setRaw(file.name);
      } else {
        setErrorMsg(result.error);
      }
    } catch {
      setErrorMsg("Photo upload did not go through. Try again.");
    } finally {
      setPhotoUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const text = raw.trim();
    if (!text && activeTab !== "photo") {
      setErrorMsg("Write something first — even a word is enough.");
      return;
    }
    if (activeTab === "photo" && !photoStorageKey) {
      setErrorMsg("Add a photo first.");
      return;
    }

    const captureMode: CaptureMode =
      activeTab === "voice" ? "voice" : activeTab === "photo" ? "photo" : "text";
    const tempId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const rawText = activeTab === "photo" ? (text || "photo") : text;

    // 1. Enqueue immediately — optimistic local save
    startTransition(async () => {
      await enqueueInboxItem({
        tempId,
        raw: rawText,
        captureMode,
        photoStorageKey: photoStorageKey ?? undefined,
        queuedAt: new Date().toISOString(),
      });

      // Show saved immediately — don't block on server
      setStatus("saved");

      // 2. Attempt server save in background
      try {
        const result = await saveInboxItem({
          raw: rawText,
          captureMode,
          photoStorageKey: photoStorageKey ?? undefined,
        });

        if (result.ok) {
          await removeQueuedItem(tempId);
          router.push("/inbox");
        } else if (result.error === "Not signed in.") {
          // Keep in queue — will drain after re-auth
          setStatus("offline");
        } else {
          // Server error but item is queued — show offline state
          setStatus("offline");
        }
      } catch {
        // Offline or network error — item stays in queue
        setStatus("offline");
      }
    });
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "text", label: "Text" },
    { id: "voice", label: "Voice" },
    { id: "photo", label: "Photo" },
  ];

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              setErrorMsg(null);
              setStatus("idle");
            }}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-accent text-white"
                : "text-muted hover:bg-border/30"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Text mode */}
        {activeTab === "text" && (
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            placeholder="What do you need to remember?"
            autoFocus
          />
        )}

        {/* Voice mode */}
        {activeTab === "voice" && (
          <VoiceTextarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onTranscript={(chunk) =>
              setRaw((prev) => (prev ? prev + " " + chunk : chunk))
            }
            rows={4}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            placeholder="Tap the mic to dictate, or type here."
          />
        )}

        {/* Photo mode */}
        {activeTab === "photo" && (
          <div className="space-y-3">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-card p-6 text-sm text-muted transition-colors hover:border-accent/50 hover:text-fg">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="sr-only"
              />
              {photoUploading ? (
                <span>Uploading photo…</span>
              ) : photoStorageKey ? (
                <span className="font-medium text-accent">Photo added — ready to save</span>
              ) : (
                <>
                  <span className="text-2xl">📷</span>
                  <span>Take a photo of your assignment sheet</span>
                </>
              )}
            </label>
            {photoStorageKey && (
              <textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                placeholder="Add a note (optional)"
              />
            )}
          </div>
        )}

        {/* Status feedback */}
        {status === "offline" && (
          <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
            Saving when you're back online — nothing lost.
          </p>
        )}
        {status === "saved" && (
          <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
            Saved — sending you to your inbox.
          </p>
        )}
        {errorMsg && (
          <p className="rounded-lg bg-border/50 px-3 py-2 text-sm">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={status === "saved" || photoUploading}
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {status === "saved" ? "Saved…" : "Save to inbox"}
        </button>
      </form>
    </div>
  );
}
