export type LobbyEnergy = "low" | "okay" | "good";
export type LobbySleep = "under_5" | "five_to_six" | "seven_to_nine";
export type LobbyMeals = "not_yet" | "snack" | "meal";

export type LobbyCheckInValue = Readonly<{
  energy: LobbyEnergy;
  sleep: LobbySleep;
  meals: LobbyMeals;
}>;

export function lobbyCheckInFromSignalValue(
  value: unknown,
): LobbyCheckInValue | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const energy = record.energy;
  const sleep = record.sleep;
  const meals = record.meals;

  if (!isEnergy(energy) || !isSleep(sleep) || !isMeals(meals)) return null;
  return { energy, sleep, meals };
}

function isEnergy(value: unknown): value is LobbyEnergy {
  return value === "low" || value === "okay" || value === "good";
}

function isSleep(value: unknown): value is LobbySleep {
  return (
    value === "under_5" ||
    value === "five_to_six" ||
    value === "seven_to_nine"
  );
}

function isMeals(value: unknown): value is LobbyMeals {
  return value === "not_yet" || value === "snack" || value === "meal";
}
