import type { EnergyLevel } from "@/lib/scoring/next-five-minutes";
import type { LobbyEnergy } from "./lobby-check-in";
import type { TodayTask } from "./today-view";

export type LobbyRecommendation = {
  energy: EnergyLevel;
  signalId: string | null;
  topByEnergy: Record<EnergyLevel, string | null>;
};

export type LobbyCheckInUpdate = {
  energy: LobbyEnergy;
  signalId: string;
  before: LobbyRecommendation | undefined;
  previousTask: TodayTask | undefined;
};

export function energyFromLobbyCheckIn(energy: LobbyEnergy): EnergyLevel {
  if (energy === "good") return "high";
  if (energy === "okay") return "medium";
  return "low";
}

export function lobbyRecommendationReason(
  saved: LobbyCheckInUpdate,
  after: LobbyRecommendation | undefined,
  task: TodayTask | undefined,
): string | null {
  const { before, previousTask } = saved;
  if (!before || !after || !previousTask || !task || after.signalId !== saved.signalId) return null;

  const reportedEnergy = energyFromLobbyCheckIn(saved.energy);
  if (before.energy === reportedEnergy || after.energy !== reportedEnergy || task.id === previousTask.id) return null;

  // Replay each energy against both snapshots. A task added, removed or
  // reprioritized for a separate reason cannot stand in for a check-in effect.
  if (before.topByEnergy[before.energy] !== previousTask.id ||
      before.topByEnergy[reportedEnergy] !== task.id ||
      after.topByEnergy[before.energy] !== previousTask.id ||
      after.topByEnergy[reportedEnergy] !== task.id) return null;

  if (saved.energy === "low") {
    const shorter = task.minutes > 0 && previousTask.minutes > task.minutes;
    return shorter
      ? "Diana moved this shorter assignment up because you reported low energy."
      : "Diana moved this assignment up because you reported low energy.";
  }
  const energy = saved.energy === "good" ? "good" : "okay";
  return `Diana moved this assignment up because you reported your energy was ${energy}.`;
}
