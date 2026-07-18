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

export type MembershipScopedGroup = {
  id: string;
  owner_id: string;
};

export type OwnerMembership = {
  group_id: string;
  owner_id: string;
};

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

/**
 * Adds a defense-in-depth scope on top of study-group RLS. The authenticated
 * owner can see rooms they own or explicitly joined, and no other group rows.
 */
export function memberScopedGroupRows<T extends MembershipScopedGroup>(
  groups: readonly T[],
  memberships: readonly OwnerMembership[],
  authenticatedOwnerId: string,
): T[] {
  const joinedGroupIds = new Set(
    memberships
      .filter((membership) => membership.owner_id === authenticatedOwnerId)
      .map((membership) => membership.group_id),
  );
  return groups.filter(
    (group) => group.owner_id === authenticatedOwnerId || joinedGroupIds.has(group.id),
  );
}
