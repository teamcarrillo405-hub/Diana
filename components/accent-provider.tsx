"use client";

import { useEffect } from "react";

const VALID = ["indigo","violet","emerald","rose","amber","sky"] as const;

export function AccentProvider() {
  useEffect(() => {
    const stored = localStorage.getItem("diana_accent");
    const accent = (stored && (VALID as readonly string[]).includes(stored)) ? stored : "indigo";
    document.body.dataset.accent = accent;
  }, []);
  return null;
}
