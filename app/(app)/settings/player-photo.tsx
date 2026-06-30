"use client";

import { useEffect, useRef, useState } from "react";

// Same key the lobby reads. Per the handoff photo system: the background-removed
// cutout is stored client-side as a base64 data URL and shown in the lobby hero.
const STORAGE_KEY = "diana-fullbody-src";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(blob);
  });
}

export function PlayerPhoto() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      setPhoto(localStorage.getItem(STORAGE_KEY));
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setMessage("Please choose an image file.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("image_file", file);
      form.append("size", "auto");
      const res = await fetch("/api/remove-bg", { method: "POST", body: form });

      if (!res.ok) {
        let detail = "";
        try {
          detail = (await res.json())?.error ?? "";
        } catch {
          /* non-json error body */
        }
        setMessage(
          res.status === 503
            ? "Photo background removal isn't set up yet (the remove.bg key is missing). Ask your admin to add REMOVEBG_API_KEY."
            : `Couldn't process that photo. ${detail}`.trim(),
        );
        return;
      }

      const dataUrl = await blobToDataUrl(await res.blob());
      try {
        localStorage.setItem(STORAGE_KEY, dataUrl);
      } catch {
        setMessage("Photo processed, but it couldn't be saved on this device.");
        return;
      }
      setPhoto(dataUrl);
      window.dispatchEvent(new Event("diana-photo-changed"));
      setMessage("Saved. Your photo now shows in your lobby.");
    } catch {
      setMessage("Something went wrong uploading. Try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removePhoto() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setPhoto(null);
    setMessage(null);
    window.dispatchEvent(new Event("diana-photo-changed"));
  }

  return (
    <section className="nexus-panel nexus-panel-dense space-y-3">
      <span className="nexus-kicker">Player photo</span>
      <h2 className="text-xl font-semibold">Your lobby photo</h2>
      <p className="text-sm text-muted">
        Upload a photo and Diana removes the background so it sits cleanly in your lobby. It stays on this device.
      </p>

      <div className="flex items-center gap-4">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-border bg-surface-soft">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="Your lobby photo" className="size-full object-contain" />
          ) : (
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted">No photo</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="nexus-button nexus-button-primary w-fit px-3 py-2 text-sm disabled:opacity-50"
          >
            {busy ? "Processing…" : photo ? "Replace photo" : "Upload photo"}
          </button>
          {photo && (
            <button
              type="button"
              disabled={busy}
              onClick={removePhoto}
              className="nexus-button nexus-button-ghost w-fit px-3 py-2 text-sm disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {message && (
        <p role="status" className="text-sm text-muted">
          {message}
        </p>
      )}
    </section>
  );
}
