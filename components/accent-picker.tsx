"use client";

import { useState, useEffect } from "react";

const ACCENTS = [
  { key: "indigo",  label: "Indigo",  hex: "#6366f1" },
  { key: "violet",  label: "Violet",  hex: "#8b5cf6" },
  { key: "emerald", label: "Emerald", hex: "#10b981" },
  { key: "rose",    label: "Rose",    hex: "#f43f5e" },
  { key: "amber",   label: "Amber",   hex: "#f59e0b" },
  { key: "sky",     label: "Sky",     hex: "#0ea5e9" },
] as const;

type AccentKey = typeof ACCENTS[number]["key"];

export function AccentPicker() {
  const [current, setCurrent] = useState<AccentKey>("indigo");

  useEffect(() => {
    const stored = localStorage.getItem("diana_accent") as AccentKey | null;
    if (stored) setCurrent(stored);
  }, []);

  function pick(key: AccentKey) {
    setCurrent(key);
    localStorage.setItem("diana_accent", key);
    document.body.dataset.accent = key;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Color</p>
      <div className="flex gap-3 flex-wrap">
        {ACCENTS.map(({ key, label, hex }) => (
          <button
            key={key}
            type="button"
            aria-label={label}
            onClick={() => pick(key)}
            className={`h-8 w-8 rounded-full transition-transform active:scale-95 ${
              current === key ? "ring-2 ring-offset-2 ring-current scale-110" : ""
            }`}
            style={{ background: hex }}
          />
        ))}
      </div>
      <p className="text-xs text-muted">Changes apply right away.</p>
    </div>
  );
}
