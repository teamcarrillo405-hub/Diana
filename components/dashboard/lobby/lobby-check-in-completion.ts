"use client";

import { createContext, useContext } from "react";
import type { LobbyEnergy } from "@/lib/dashboard/lobby-check-in";

export const LobbyCheckInCompletion = createContext<((energy: LobbyEnergy, signalId: string) => void) | undefined>(undefined);

export function useLobbyCheckInCompletion() {
  return useContext(LobbyCheckInCompletion);
}
