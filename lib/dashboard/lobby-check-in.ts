export type LobbyEnergy = "low" | "okay" | "good";
export type LobbyMovement =
  | "walk"
  | "run"
  | "bike"
  | "team_sport"
  | "strength"
  | "stretch"
  | "dance"
  | "other";

export type LobbyCheckInValue = Readonly<{
  energy: LobbyEnergy;
  sleepHours: number;
  movementType: LobbyMovement;
  movementMinutes: number;
}>;

const CHECK_IN_RESET_OFFSET_MS = 60 * 1000;

export function lobbyCheckInDayKey(
  value: Date | string,
  timeZone: string,
): string {
  const date = value instanceof Date ? value : new Date(value);
  const shifted = new Date(date.getTime() - CHECK_IN_RESET_OFFSET_MS);
  const format = (zone: string) => new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(shifted);
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = format(timeZone);
  } catch {
    parts = format("UTC");
  }
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function lobbyCheckInFromSignalValue(
  value: unknown,
): LobbyCheckInValue | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const energy = record.energy;
  const sleepHours = record.sleepHours;
  const movementType = record.movementType;
  const movementMinutes = record.movementMinutes;

  if (
    !isEnergy(energy) ||
    !isSleepHours(sleepHours) ||
    !isMovement(movementType) ||
    !isMovementMinutes(movementMinutes)
  ) return null;
  return { energy, sleepHours, movementType, movementMinutes };
}

function isEnergy(value: unknown): value is LobbyEnergy {
  return value === "low" || value === "okay" || value === "good";
}

function isSleepHours(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 12;
}

function isMovement(value: unknown): value is LobbyMovement {
  return value === "walk" || value === "run" || value === "bike" ||
    value === "team_sport" || value === "strength" || value === "stretch" ||
    value === "dance" || value === "other";
}

function isMovementMinutes(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 180;
}
