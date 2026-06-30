"use client";

import { useRef, useState, useTransition } from "react";
import { savePlayerPhoto, clearPlayerPhoto } from "./player-photo-actions";

// Downscale the background-removed cutout so the stored data URL stays small
// (it lives on the profile row and is read on the dashboard). WebP keeps
// transparency and is compact; PNG is the fallback.
async function downscaleToDataUrl(blob: Blob, maxHeight = 560): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, maxHeight / bitmap.height);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas-unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const webp = canvas.toDataURL("image/webp", 0.85);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
}

export function PlayerPhoto({ initialPhoto }: { initialPhoto: string | null }) {
  const [photo, setPhoto] = useState<string | null>(initialPhoto);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
          /* non-json body */
        }
        setMessage(
          res.status === 503
            ? "Photo background removal isn't set up yet (the remove.bg key is missing). Ask your admin to add REMOVEBG_API_KEY."
            : `Couldn't process that photo. ${detail}`.trim(),
        );
        return;
      }

      const dataUrl = await downscaleToDataUrl(await res.blob());
      startTransition(async () => {
        const result = await savePlayerPhoto(dataUrl);
        if (!result.ok) {
          setMessage(result.error);
          return;
        }
        setPhoto(dataUrl);
        setMessage("Saved. Your photo now shows in your lobby, on every device.");
      });
    } catch {
      setMessage("Something went wrong uploading. Try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removePhoto() {
    setMessage(null);
    startTransition(async () => {
      const result = await clearPlayerPhoto();
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setPhoto(null);
    });
  }

  const working = busy || pending;

  return (
    <section className="nexus-panel nexus-panel-dense space-y-3">
      <span className="nexus-kicker">Player photo</span>
      <h2 className="text-xl font-semibold">Your lobby photo</h2>
      <p className="text-sm text-muted">
        Upload a photo and Diana removes the background so it sits cleanly in your lobby. It syncs to your account, so it
        shows up on any device you sign in on.
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
            disabled={working}
            onClick={() => inputRef.current?.click()}
            className="nexus-button nexus-button-primary w-fit px-3 py-2 text-sm disabled:opacity-50"
          >
            {working ? "Working…" : photo ? "Replace photo" : "Upload photo"}
          </button>
          {photo && (
            <button
              type="button"
              disabled={working}
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
