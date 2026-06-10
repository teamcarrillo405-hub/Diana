"use client";

// Haptics — the Respond motion verb, in the hand (Quiet Command).
// Native shells get a soft tap on meaningful confirmations; web and SSR
// no-op silently. Same manners as motion: confirm, never celebrate at.

import { Capacitor } from "@capacitor/core";

type Strength = "light" | "medium";

export async function hapticTap(strength: Strength = "light"): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform()) return;
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: strength === "medium" ? ImpactStyle.Medium : ImpactStyle.Light });
  } catch {
    // haptics are garnish — never an error surface
  }
}
