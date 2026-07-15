"use client";

import { useEffect, useState } from "react";
import {
  LOBBY_BG_OPTIONS,
  LOBBY_BG_STORAGE_KEY,
  isLobbyBgKey,
  type LobbyBgKey,
} from "../dashboard/lobby-background-layer";

export function LobbyBackgroundPicker() {
  const [current, setCurrent] = useState<LobbyBgKey>("football");

  useEffect(() => {
    const stored = localStorage.getItem(LOBBY_BG_STORAGE_KEY);
    if (isLobbyBgKey(stored)) setCurrent(stored);
  }, []);

  function pick(key: LobbyBgKey) {
    setCurrent(key);
    localStorage.setItem(LOBBY_BG_STORAGE_KEY, key);
  }

  return (
    <div className="space-y-2">
      <p className="diana-kicker text-sm font-medium">Lobby background</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LOBBY_BG_OPTIONS.map(({ key, label, thumb }) => (
          <button
            key={key}
            type="button"
            onClick={() => pick(key)}
            aria-pressed={current === key}
            className={`overflow-hidden rounded-xl border-2 text-left transition ${
              current === key ? "border-accent" : "border-border hover:border-accent/50"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb} alt="" className="h-16 w-full object-cover" />
            <span className="block px-2 py-1.5 text-xs font-semibold uppercase tracking-wide">{label}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">Changes your Today lobby background on this device.</p>
    </div>
  );
}
