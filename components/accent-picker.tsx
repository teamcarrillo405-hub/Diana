"use client";

import { useState, useEffect } from "react";

const ACCENTS = [
  { key: "sky",     label: "Nexus cyan",   hex: "#35DDF2" },
  { key: "rose",    label: "Nexus pink",   hex: "#F45BA8" },
  { key: "amber",   label: "Nexus gold",   hex: "#E8B85D" },
  { key: "indigo",  label: "Nexus blue",   hex: "#5E8CFF" },
  { key: "violet",  label: "Nexus purple", hex: "#A477FF" },
] as const;

type AccentKey = typeof ACCENTS[number]["key"];

export function AccentPicker() {
  const [current, setCurrent] = useState<AccentKey>("indigo");

  useEffect(() => {
    const stored = localStorage.getItem("diana_accent") as AccentKey | null;
    if (stored && ACCENTS.some((accent) => accent.key === stored)) {
      setCurrent(stored);
      document.body.dataset.accent = stored;
    }
  }, []);

  function pick(key: AccentKey) {
    setCurrent(key);
    localStorage.setItem("diana_accent", key);
    document.body.dataset.accent = key;
  }

  return (
    <div className="space-y-2">
      <p className="nexus-kicker text-sm font-medium">Color</p>
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
