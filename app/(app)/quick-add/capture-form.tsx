"use client";

import { ArrowLeft, Camera, Keyboard, Mic2, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { SourceMedia } from "@/components/screen-design/source-media";
import { VoiceTextarea } from "@/components/voice-textarea";
import { enqueueInboxItem, getQueuedItems, removeQueuedItem } from "@/lib/inbox/queue";
import type { CaptureMode } from "@/lib/inbox/types";
import { saveInboxItem, uploadInboxPhoto } from "./actions";

type Tab = "text" | "voice" | "photo";
type Status = "idle" | "saved" | "offline";

export function CaptureForm({
  ttsProvider = "browser",
}: {
  ttsProvider?: "browser" | "openai";
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<Tab | null>(null);
  const [raw, setRaw] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [photoStorageKey, setPhotoStorageKey] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    let active = true;
    const drainQueue = async () => {
      try {
        const queued = await getQueuedItems();
        for (const item of queued) {
          const result = await saveInboxItem({
            raw: item.raw,
            captureMode: item.captureMode,
            photoStorageKey: item.photoStorageKey,
          });
          if (active && result.ok) await removeQueuedItem(item.tempId);
        }
      } catch {
        // Queued captures remain local until the next online event.
      }
    };

    void drainQueue();
    const onOnline = () => void drainQueue();
    window.addEventListener("online", onOnline);
    return () => {
      active = false;
      window.removeEventListener("online", onOnline);
    };
  }, []);

  function chooseMode(mode: Tab) {
    setActiveTab(mode);
    setStatus("idle");
    setErrorMsg(null);
    if (mode !== "photo") setPhotoStorageKey(null);
  }

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const result = await uploadInboxPhoto(formData);
      if (result.ok) {
        setPhotoStorageKey(result.storageKey);
        setRaw(file.name);
      } else {
        setErrorMsg(result.error);
      }
    } catch {
      setErrorMsg("The photo is still with you. Try the upload once more.");
    } finally {
      setPhotoUploading(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!activeTab) return;
    setErrorMsg(null);

    const text = raw.trim();
    if (!text && activeTab !== "photo") {
      setErrorMsg("Add a short note first. Even a few words are enough.");
      return;
    }
    if (activeTab === "photo" && !photoStorageKey) {
      setErrorMsg("Choose a photo first.");
      return;
    }

    const captureMode: CaptureMode = activeTab;
    const tempId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const rawText = activeTab === "photo" ? text || "Schoolwork photo" : text;

    startTransition(async () => {
      await enqueueInboxItem({
        tempId,
        raw: rawText,
        captureMode,
        photoStorageKey: photoStorageKey ?? undefined,
        queuedAt: new Date().toISOString(),
      });
      setStatus("saved");

      try {
        const result = await saveInboxItem({
          raw: rawText,
          captureMode,
          photoStorageKey: photoStorageKey ?? undefined,
        });
        if (result.ok) {
          await removeQueuedItem(tempId);
          router.push(`/inbox/${result.id}`);
          return;
        }
        setStatus("offline");
      } catch {
        setStatus("offline");
      }
    });
  }

  return (
    <>
      <header className="sd-quick-add-header">
        <DianaWordmark />
        <button type="button" onClick={() => router.back()} aria-label="Close quick add">
          <X aria-hidden="true" />
        </button>
      </header>

      <main className="sd-quick-add-main" data-mode={activeTab ?? "menu"}>
        <div className="sd-quick-add-intro">
          <h1>{activeTab ? modeHeading(activeTab) : "Ready for input"}</h1>
          <p>Diana is standing by</p>
        </div>

        <div className="sd-quick-add-mascot" aria-hidden="true">
          <i />
          <SourceMedia
            assetId="diana-mascot"
            width={192}
            height={192}
            decorative
            priority
          />
        </div>

        {activeTab ? (
          <form className="sd-capture-editor" onSubmit={handleSubmit}>
            <button
              type="button"
              className="sd-capture-change-mode"
              onClick={() => setActiveTab(null)}
            >
              <ArrowLeft aria-hidden="true" />
              Change mode
            </button>

            {activeTab === "text" ? (
              <label>
                <span>Type task</span>
                <textarea
                  value={raw}
                  onChange={(event) => setRaw(event.target.value)}
                  placeholder="What do you need to remember?"
                  rows={4}
                  autoFocus
                />
              </label>
            ) : null}

            {activeTab === "voice" ? (
              <label>
                <span>Voice memo</span>
                <VoiceTextarea
                  value={raw}
                  onChange={(event) => setRaw(event.target.value)}
                  onTranscript={(chunk) =>
                    setRaw((previous) => (previous ? `${previous} ${chunk}` : chunk))
                  }
                  placeholder="Tap the mic and talk it out."
                  rows={4}
                  provider={ttsProvider}
                />
              </label>
            ) : null}

            {activeTab === "photo" ? (
              <div className="sd-capture-photo-editor">
                <label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    capture="environment"
                    onChange={handlePhotoChange}
                  />
                  <Camera aria-hidden="true" />
                  <strong>
                    {photoUploading
                      ? "Adding photo..."
                      : photoStorageKey
                        ? "Photo ready"
                        : "Choose schoolwork photo"}
                  </strong>
                </label>
                {photoStorageKey ? (
                  <textarea
                    value={raw}
                    onChange={(event) => setRaw(event.target.value)}
                    placeholder="Add a note, optional"
                    rows={2}
                  />
                ) : null}
              </div>
            ) : null}

            {status === "offline" ? (
              <p className="sd-capture-status" role="status">
                Saved here. Diana will send it when you are online.
              </p>
            ) : null}
            {status === "saved" ? (
              <p className="sd-capture-status" role="status">
                Saved. Opening your scout review.
              </p>
            ) : null}
            {errorMsg ? (
              <p className="sd-calm-form-error" role="status">{errorMsg}</p>
            ) : null}

            <button
              type="submit"
              className="sd-capture-submit"
              disabled={status === "saved" || photoUploading}
            >
              Add item
            </button>
            <button type="button" className="sd-capture-cancel" onClick={() => router.back()}>
              Cancel
            </button>
          </form>
        ) : (
          <div className="sd-capture-mode-list">
            <button type="button" data-mode="photo" onClick={() => chooseMode("photo")}>
              <span><Camera aria-hidden="true" /></span>
              <strong>Scan whiteboard</strong>
              <small>Instant note digestion</small>
            </button>
            <button type="button" data-mode="voice" onClick={() => chooseMode("voice")}>
              <span><Mic2 aria-hidden="true" /></span>
              <strong>Voice memo</strong>
              <small>Thinking out loud</small>
            </button>
            <button type="button" data-mode="text" onClick={() => chooseMode("text")}>
              <span><Keyboard aria-hidden="true" /></span>
              <strong>Type task</strong>
              <small>Manual strategic entry</small>
            </button>
          </div>
        )}
      </main>
    </>
  );
}

function modeHeading(mode: Tab) {
  if (mode === "photo") return "Scan the play";
  if (mode === "voice") return "Talk it out";
  return "Type the play";
}
