import type {
  ScreenDesignActionKind,
  ScreenDesignAuthClass,
} from "@/lib/screendesign/screens";

export const SCREEN_DESIGN_FIXED_CLOCK = "2026-09-14T16:30:00.000Z" as const;

export const SCREEN_DESIGN_OWNER_ALIASES = [
  "qa-primary",
  "qa-secondary",
  "qa-public-owner",
] as const;

export type ScreenDesignOwnerAlias =
  (typeof SCREEN_DESIGN_OWNER_ALIASES)[number];

export const SCREEN_DESIGN_RECORD_KINDS = [
  "profile",
  "class",
  "rubric",
  "assignment",
  "assignment-checklist",
  "assignment-signal",
  "assignment-time-log",
  "inbox-item",
  "note",
  "flashcard",
  "flashcard-review",
  "study-artifact",
  "mastery-concept",
  "mastery-event",
  "ap-exam-plan",
  "ap-practice-attempt",
  "lms-connection",
  "portfolio",
  "portfolio-item",
  "privacy-evidence",
  "wellness-activity",
  "wellness-goal",
  "sleep-log",
  "study-group",
  "study-group-membership",
  "study-group-session",
  "ai-interaction",
  "authorship-log",
  "share-token",
] as const;

export type ScreenDesignRecordKind =
  (typeof SCREEN_DESIGN_RECORD_KINDS)[number];

export const SCREEN_DESIGN_GUARDED_STATES = [
  "populated",
  "honest-empty",
  "ai-green",
  "ai-yellow",
  "ai-red",
  "billing-unavailable",
  "billing-configured",
  "lms-disconnected",
  "lms-error",
  "lms-connected",
  "share-active",
  "share-expired",
  "share-revoked",
  "group-member",
  "group-nonmember",
  "practice-no-score",
  "onboarding-invalid",
  "onboarding-valid",
  "reduced-motion",
] as const;

export type ScreenDesignGuardedState =
  (typeof SCREEN_DESIGN_GUARDED_STATES)[number];

export interface ScreenDesignFixtureRecordFactory {
  readonly kind: ScreenDesignRecordKind;
  readonly alias: string;
  readonly dependsOn?: readonly string[];
  readonly values?: Readonly<Record<string, unknown>>;
}

export interface ScreenDesignFixtureRoute {
  readonly pathname: `/${string}`;
  readonly params: Readonly<Record<string, string>>;
  readonly stateSelector: string | null;
}

export interface ScreenDesignFixtureCopy {
  readonly studentName: "Grayson";
  readonly heading: string;
  readonly primaryActionLabel: string;
  readonly emptyStateLabel?: string;
}

export type ScreenDesignExpectedPersistedResult =
  | {
      readonly kind: "record";
      readonly recordKind: ScreenDesignRecordKind;
      readonly alias: string;
      readonly field: string;
      readonly value: unknown;
    }
  | {
      readonly kind: "navigation";
      readonly destination: `/${string}`;
    }
  | {
      readonly kind: "none";
      readonly reason: string;
    };

export interface ScreenDesignFixtureScenario {
  readonly id: string;
  readonly screenId: string;
  readonly variant: string;
  readonly isDefault: boolean;
  readonly authClass: ScreenDesignAuthClass;
  readonly ownerAlias: ScreenDesignOwnerAlias;
  readonly fixedClock: typeof SCREEN_DESIGN_FIXED_CLOCK;
  readonly displayCopy: ScreenDesignFixtureCopy;
  readonly route: ScreenDesignFixtureRoute;
  readonly records: readonly ScreenDesignFixtureRecordFactory[];
  readonly guardedStates: readonly ScreenDesignGuardedState[];
  readonly expectedPrimaryAction: Readonly<{
    label: string;
    kind: ScreenDesignActionKind;
  }>;
  readonly expectedPersistedResult: ScreenDesignExpectedPersistedResult;
}

// TDD RED scaffold: Task 1 fills this catalog after coverage tests demonstrate
// the missing canonical and guarded scenarios.
export const SCREEN_DESIGN_FIXTURE_SCENARIOS: readonly ScreenDesignFixtureScenario[] =
  Object.freeze([]);

