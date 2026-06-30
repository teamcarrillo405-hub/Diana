"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "diana-fullbody-src";
const SF = "var(--font-saira-condensed), 'Saira Condensed', sans-serif";

/**
 * Hero player-photo slot. Reads the background-removed cutout the student
 * uploads in Settings (stored as a base64 data URL in localStorage) and shows
 * it; when there's no photo, shows the dashed "Tap to add your photo" prompt
 * that links to Settings. Updates live via the `diana-photo-changed` event and
 * cross-tab `storage` events. Carries `gl-player` so it hides on mobile.
 */
export function PlayerPhotoSlot() {
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    const read = () => {
      try {
        setPhoto(localStorage.getItem(STORAGE_KEY));
      } catch {
        /* localStorage unavailable */
      }
    };
    read();
    window.addEventListener("diana-photo-changed", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("diana-photo-changed", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="gl-player"
        src={photo}
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "50%",
          bottom: 0,
          transform: "translateX(-50%)",
          height: "92%",
          objectFit: "contain",
          zIndex: 4,
          pointerEvents: "none",
        }}
      />
    );
  }

  return (
    <Link
      className="gl-player"
      href="/settings"
      aria-label="Add your photo"
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -54%)",
        width: 300,
        height: 440,
        zIndex: 4,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        border: "2px dashed rgba(41,208,255,.35)",
        borderRadius: 8,
        background: "rgba(4,8,20,.4)",
        textDecoration: "none",
        color: "rgba(170,184,224,1)",
      }}
    >
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="rgba(41,208,255,.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <span style={{ fontFamily: SF, fontWeight: 700, fontSize: 13, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(170,184,224,1)" }}>
        Tap to add your photo
      </span>
    </Link>
  );
}
