"use client";

import { useEffect, useState } from "react";

// Lobby background theme — a device-local look preference, same tier as
// ThemePicker/AccentPicker (components/theme-picker.tsx, accent-picker.tsx):
// stored in localStorage, not synced cross-device. Matches the locked design's
// own storage (`localStorage['diana-selected-bg']`).
export const LOBBY_BG_STORAGE_KEY = "diana-lobby-bg";

const THEMES = {
  football: { src: "/stadium-bg.jpg", tint: "rgba(0,0,0,.68)" },
  science: { src: "/lobby-bg/science.jpg", tint: "rgba(0,0,0,.42)" },
  music: { src: "/lobby-bg/music.jpg", tint: "rgba(0,0,0,.70)" },
  default: { src: "/lobby-bg/default.jpg", tint: "rgba(0,0,0,.45)" },
} as const;

export type LobbyBgKey = keyof typeof THEMES;

export function isLobbyBgKey(v: string | null): v is LobbyBgKey {
  return !!v && v in THEMES;
}

export const LOBBY_BG_OPTIONS: { key: LobbyBgKey; label: string; thumb: string }[] = [
  { key: "football", label: "Stadium", thumb: THEMES.football.src },
  { key: "science", label: "Sci Lab", thumb: THEMES.science.src },
  { key: "music", label: "Music", thumb: THEMES.music.src },
  { key: "default", label: "Default", thumb: THEMES.default.src },
];

export function LobbyBackgroundLayer() {
  const [theme, setTheme] = useState<LobbyBgKey>("football");

  useEffect(() => {
    const stored = localStorage.getItem(LOBBY_BG_STORAGE_KEY);
    if (isLobbyBgKey(stored)) setTheme(stored);
  }, []);

  const { src, tint } = THEMES[theme];

  return (
    <div style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0, background: "#000" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: tint, zIndex: 1, transition: "background .5s" }} />
    </div>
  );
}
