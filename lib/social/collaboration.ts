export const SHARED_SESSION_TARGET_MS = 30_000;
export const COLLAB_NOTE_REFRESH_MS = 500;

export type SharedDeckCardInput = {
  front: string;
  back: string;
};

export type DeckInstallCard = SharedDeckCardInput & {
  position: number;
};

export type ProjectTaskStatus = "open" | "in_progress" | "done";

export function normalizeJoinCode(value: string): string {
  return value.trim().replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 12);
}

export function isInviteOnlySurface(visibility: string): boolean {
  return visibility === "invite_only";
}

export function sharedSessionMeetsLatencyBudget(createdInMs: number): boolean {
  return createdInMs >= 0 && createdInMs <= SHARED_SESSION_TARGET_MS;
}

export function collaborativeNoteRefreshMeetsBudget(refreshMs: number): boolean {
  return refreshMs > 0 && refreshMs <= COLLAB_NOTE_REFRESH_MS;
}

export function buildDeckInstallCards(cards: SharedDeckCardInput[]): DeckInstallCard[] {
  return cards
    .map((card, index) => ({
      front: card.front.trim(),
      back: card.back.trim(),
      position: index,
    }))
    .filter((card) => card.front.length > 0 && card.back.length > 0);
}

export function statusLabel(status: ProjectTaskStatus): string {
  return ({
    open: "Open",
    in_progress: "In progress",
    done: "Done",
  } satisfies Record<ProjectTaskStatus, string>)[status];
}

export function socialCopyAvoidsRanking(copy: string): boolean {
  return !/\b(leaderboard|rank|ranking|winner|loser|streak)\b/i.test(copy);
}
