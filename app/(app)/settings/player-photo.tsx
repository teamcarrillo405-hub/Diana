"use client";

import { useRef, useState, useTransition, type PointerEvent as ReactPointerEvent } from "react";
import { savePlayerPhoto, clearPlayerPhoto, savePlayerPhotoOffset } from "./player-photo-actions";

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

// Cuts the photo out of its background entirely on-device (WASM/WebGL model) —
// no API key, no upload to a third party. Package is lazy-loaded on first use
// since the model weights are a multi-MB download.
async function removeBackgroundClientSide(file: File): Promise<Blob> {
  const { removeBackground } = await import("@imgly/background-removal");
  return removeBackground(file);
}

const clampOffset = (v: number) => Math.min(100, Math.max(0, v));

export function PlayerPhoto({
  initialPhoto,
  initialOffsetX = 50,
  initialOffsetY = 50,
}: {
  initialPhoto: string | null;
  initialOffsetX?: number;
  initialOffsetY?: number;
}) {
  const [photo, setPhoto] = useState<string | null>(initialPhoto);
  const [offset, setOffset] = useState({ x: clampOffset(initialOffsetX), y: clampOffset(initialOffsetY) });
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Working…");
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragOrigin = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  const working = busy || pending;

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setMessage("Please choose an image file.");
      return;
    }
    setBusy(true);
    setMessage(null);

    let cutout: Blob = file;
    let bgRemoved = true;
    try {
      setBusyLabel("Removing background…");
      cutout = await removeBackgroundClientSide(file);
    } catch {
      bgRemoved = false;
    }

    try {
      setBusyLabel("Saving…");
      const dataUrl = await downscaleToDataUrl(cutout);
      startTransition(async () => {
        const result = await savePlayerPhoto(dataUrl);
        if (!result.ok) {
          setMessage(result.error);
          return;
        }
        setPhoto(dataUrl);
        setOffset({ x: 50, y: 50 });
        setMessage(
          bgRemoved
            ? "Saved. Your photo now shows in your lobby, on every device."
            : "Saved with the original background: the cutout tool wasn't available on this device.",
        );
      });
    } catch {
      setMessage("The upload did not finish. Try again.");
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
      setOffset({ x: 50, y: 50 });
    });
  }

  function onFramePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!photo || working) return;
    frameRef.current?.setPointerCapture(e.pointerId);
    dragOrigin.current = { startX: e.clientX, startY: e.clientY, originX: offset.x, originY: offset.y };
    setDragging(true);
  }

  function onFramePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const origin = dragOrigin.current;
    const frame = frameRef.current;
    if (!origin || !frame) return;
    const rect = frame.getBoundingClientRect();
    const dxPct = ((e.clientX - origin.startX) / rect.width) * 100;
    const dyPct = ((e.clientY - origin.startY) / rect.height) * 100;
    // Dragging the photo right should reveal more of its left side, so the
    // object-position offset moves opposite the pointer.
    setOffset({ x: clampOffset(origin.originX - dxPct), y: clampOffset(origin.originY - dyPct) });
  }

  function onFramePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragOrigin.current) return;
    dragOrigin.current = null;
    setDragging(false);
    frameRef.current?.releasePointerCapture(e.pointerId);
    startTransition(async () => {
      const result = await savePlayerPhotoOffset(offset.x, offset.y);
      if (!result.ok) setMessage(result.error);
    });
  }

  return (
    <section className="nexus-panel nexus-panel-dense space-y-3">
      <span className="nexus-kicker">Player photo</span>
      <h2 className="text-xl font-semibold">Your lobby photo</h2>
      <p className="text-sm text-muted">
        Upload a photo and Diana removes the background so it sits cleanly in your lobby. This runs privately on your
        device, with no account or key needed. It syncs to your account, so it shows up on any device you sign in on.
      </p>

      <div className="flex items-center gap-4">
        <div
          ref={frameRef}
          onPointerDown={onFramePointerDown}
          onPointerMove={onFramePointerMove}
          onPointerUp={onFramePointerUp}
          onPointerCancel={onFramePointerUp}
          className="grid size-20 shrink-0 touch-none select-none place-items-center overflow-hidden rounded-full border border-border bg-surface-soft"
          style={{ cursor: photo && !working ? (dragging ? "grabbing" : "grab") : "default" }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt="Your lobby photo"
              draggable={false}
              className="pointer-events-none size-full object-cover"
              style={{ objectPosition: `${offset.x}% ${offset.y}%` }}
            />
          ) : (
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted">No photo</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            aria-label="Choose a lobby photo"
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
            {working ? busyLabel : photo ? "Replace photo" : "Upload photo"}
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

      {photo && !working && <p className="text-xs text-dim">Drag your photo above to reposition it.</p>}

      {message && (
        <p role="status" className="text-sm text-muted">
          {message}
        </p>
      )}
    </section>
  );
}
