import {
  SCREEN_DESIGN_SCREEN_BY_ID,
  type ScreenDesignActionKind,
  type ScreenDesignAuthClass,
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
  "class-syllabus",
  "assignment",
  "assignment-step",
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
  "analytics-event",
  "session-handoff",
  "data-deletion-request",
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

export const SCREEN_DESIGN_CANONICAL_SCREEN_IDS = [
  "ai-history-log",
  "ai-writing-coach",
  "ap-command-center",
  "assignment-detail",
  "concept-deep-dive",
  "dashboard-personalized",
  "external-scout-view",
  "flashcards-review",
  "focus-session-immersive",
  "global-leaderboard",
  "inbox-triage",
  "knowledge-graph",
  "library-empty-state",
  "lms-sync-center",
  "mastery-tracker",
  "mastery-transcript-view",
  "milestone-celebration",
  "mission-board",
  "notes-surface",
  "notification-center",
  "onboarding-welcome",
  "onboarding-educational",
  "onboarding-quiz-challenge",
  "onboarding-quiz-schedule",
  "paywall-social-proof",
  "paywall-standard",
  "portfolio-gallery",
  "practice-test-session",
  "privacy-export-hub",
  "progress-insights",
  "quick-add",
  "review-submit-checkpoint",
  "rubric-scout",
  "scout-share-view",
  "settings-profile-center",
  "smart-loading",
  "smart-search",
  "study-artifacts-hub",
  "study-calendar",
  "study-goal-wizard",
  "study-room-social",
  "subject-library",
  "task-breakdown-modal",
  "tutor-chat",
  "tutor-gallery",
  "tutor-personalization",
  "wellness-recovery-log",
] as const;

export type ScreenDesignScreenId =
  (typeof SCREEN_DESIGN_CANONICAL_SCREEN_IDS)[number];

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
  readonly screenId: ScreenDesignScreenId;
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

type ScenarioDefinition = Readonly<{
  screenId: ScreenDesignScreenId;
  variant?: string;
  isDefault?: boolean;
  heading: string;
  ownerAlias?: ScreenDesignOwnerAlias;
  params?: Readonly<Record<string, string>>;
  records: readonly ScreenDesignFixtureRecordFactory[];
  guardedStates?: readonly ScreenDesignGuardedState[];
  result?: ScreenDesignExpectedPersistedResult;
}>;

const record = (
  kind: ScreenDesignRecordKind,
  alias: string,
  values: Readonly<Record<string, unknown>> = {},
  dependsOn: readonly string[] = [],
): ScreenDesignFixtureRecordFactory =>
  Object.freeze({ kind, alias, values: Object.freeze(values), dependsOn });

const profile = (
  values: Readonly<Record<string, unknown>> = {},
): ScreenDesignFixtureRecordFactory =>
  record("profile", "profile-main", {
    displayName: "Grayson",
    schoolYear: 9,
    timezone: "America/Los_Angeles",
    consentAi: true,
    ...values,
  });

const academicCore = (
  aiMode: "green" | "yellow" | "red" = "green",
  assignmentValues: Readonly<Record<string, unknown>> = {},
): readonly ScreenDesignFixtureRecordFactory[] => [
  profile(),
  record("class", "class-main", {
    name: "English 9",
    teacher: "Ms. Rivera",
    aiMode,
  }),
  record(
    "assignment",
    "assignment-main",
    {
      title: "Identity quote response",
      status: "todo",
      dueAt: "2026-09-15T22:30:00.000Z",
      estimatedMinutes: 35,
      ...assignmentValues,
    },
    ["class-main"],
  ),
];

const assignmentSupport = (
  assignmentValues: Readonly<Record<string, unknown>> = {},
  checklistValues: Readonly<Record<string, unknown>> = {},
): readonly ScreenDesignFixtureRecordFactory[] => [
  ...academicCore("green", assignmentValues),
  record(
    "assignment-checklist",
    "checklist-main",
    { checked: false, label: "Quote and page number are attached", ...checklistValues },
    ["assignment-main"],
  ),
  record(
    "assignment-signal",
    "signal-main",
    { kind: "start", occurredAt: SCREEN_DESIGN_FIXED_CLOCK },
    ["assignment-main"],
  ),
  record(
    "assignment-time-log",
    "time-log-main",
    { startedAt: "2026-09-14T16:20:00.000Z", endedAt: null },
    ["assignment-main"],
  ),
];

const classMastery = (): readonly ScreenDesignFixtureRecordFactory[] => [
  profile(),
  record("class", "class-main", { name: "Algebra I", aiMode: "green" }),
  record(
    "mastery-concept",
    "concept-main",
    { name: "Solving linear equations", masteryLevel: 1.9 },
    ["class-main"],
  ),
  record(
    "mastery-event",
    "mastery-event-main",
    { source: "flashcard_review", evidence: "one supported practice pass" },
    ["concept-main"],
  ),
];

const shareRecords = (
  tokenState: "active" | "expired" | "revoked",
  scope: "portfolio" | "report",
): readonly ScreenDesignFixtureRecordFactory[] => [
  profile(),
  ...(scope === "portfolio"
    ? [
        record("portfolio", "portfolio-main", { title: "Freshman portfolio" }),
        record(
          "portfolio-item",
          "portfolio-item-main",
          { title: "Identity quote response", reflection: "I revised the explanation." },
          ["portfolio-main"],
        ),
      ]
    : [
        record("class", "class-main", { name: "English 9", aiMode: "green" }),
        record(
          "mastery-concept",
          "concept-main",
          { name: "Claim evidence reasoning", masteryLevel: 1.8 },
          ["class-main"],
        ),
      ]),
  record(
    "share-token",
    "share-token-main",
    { tokenAlias: `share-${tokenState}`, tokenState, scope },
    scope === "portfolio" ? ["portfolio-main"] : ["concept-main"],
  ),
];

const groupRecords = (
  membership: "member" | "nonmember",
): readonly ScreenDesignFixtureRecordFactory[] => [
  profile(),
  record("study-group", "group-main", {
    name: "Freshman study room",
    inviteCode: "QA-STUDY",
  }),
  ...(membership === "member"
    ? [
        record(
          "study-group-membership",
          "membership-main",
          { role: "member" },
          ["group-main"],
        ),
        record(
          "study-group-session",
          "group-session-main",
          { status: "scheduled", durationMinutes: 25 },
          ["group-main", "membership-main"],
        ),
      ]
    : []),
];

const navigation = (destination: `/${string}`): ScreenDesignExpectedPersistedResult => ({
  kind: "navigation",
  destination,
});

const mutation = (
  recordKind: ScreenDesignRecordKind,
  alias: string,
  field: string,
  value: unknown,
): ScreenDesignExpectedPersistedResult => ({
  kind: "record",
  recordKind,
  alias,
  field,
  value,
});

const noWrite = (reason: string): ScreenDesignExpectedPersistedResult => ({
  kind: "none",
  reason,
});

const DEFAULT_SCENARIOS: readonly ScenarioDefinition[] = [
  {
    screenId: "ai-history-log",
    heading: "AI activity",
    records: [
      profile(),
      record("ai-interaction", "ai-interaction-main", {
        feature: "writing_aid",
        model: "claude-sonnet-4-6",
      }),
      record(
        "authorship-log",
        "authorship-main",
        { feature: "writing_aid", promptExcerpt: "Help me strengthen my explanation." },
        ["ai-interaction-main"],
      ),
    ],
    guardedStates: ["populated"],
  },
  {
    screenId: "ai-writing-coach",
    heading: "Writing Coach",
    params: { id: "assignment-main" },
    records: [
      ...academicCore(),
      record(
        "ai-interaction",
        "ai-interaction-main",
        { feature: "writing_aid", aiMode: "green" },
        ["assignment-main"],
      ),
      record(
        "authorship-log",
        "authorship-main",
        { feature: "writing_aid" },
        ["assignment-main", "ai-interaction-main"],
      ),
    ],
    guardedStates: ["ai-green"],
    result: mutation("authorship-log", "authorship-main", "feature", "writing_aid"),
  },
  {
    screenId: "ap-command-center",
    heading: "AP Command Center",
    records: [
      profile(),
      record("ap-exam-plan", "ap-plan-main", {
        subject: "english_language",
        examDate: "2027-05-11",
        targetBand: "3-4",
      }),
      record(
        "ap-practice-attempt",
        "ap-attempt-main",
        { practiceType: "frq", correctCount: 0, totalCount: 0, scoreBand: null },
        ["ap-plan-main"],
      ),
    ],
    guardedStates: ["populated", "practice-no-score"],
  },
  {
    screenId: "assignment-detail",
    heading: "Assignment detail",
    params: { id: "assignment-main" },
    records: [
      ...assignmentSupport({}, { checked: true }),
      record(
        "assignment-step",
        "assignment-step-main",
        {
          steps: [
            { step: 1, action: "Write a one-sentence claim.", minutes: 5, done: false },
            { step: 2, action: "Choose the strongest quote.", minutes: 5, done: false },
            { step: 3, action: "Explain how the quote supports the claim.", minutes: 5, done: false },
          ],
        },
        ["assignment-main"],
      ),
    ],
    guardedStates: ["populated"],
    result: mutation("assignment", "assignment-main", "status", "in_progress"),
  },
  {
    screenId: "concept-deep-dive",
    heading: "Concept deep dive",
    params: { id: "concept-main" },
    records: classMastery(),
    guardedStates: ["populated"],
  },
  {
    screenId: "dashboard-personalized",
    heading: "Lobby",
    records: assignmentSupport(),
    guardedStates: ["populated"],
  },
  {
    screenId: "external-scout-view",
    heading: "Shared portfolio evidence",
    ownerAlias: "qa-public-owner",
    params: { token: "share-active" },
    records: shareRecords("active", "portfolio"),
    guardedStates: ["share-active"],
  },
  {
    screenId: "flashcards-review",
    heading: "Flashcard review",
    params: { id: "flashcard-main" },
    records: [
      ...classMastery(),
      record(
        "flashcard",
        "flashcard-main",
        { front: "What does slope describe?", back: "Rate of change", state: "review" },
        ["class-main", "concept-main"],
      ),
      record(
        "flashcard-review",
        "flashcard-review-main",
        { rating: 3, reviewedAt: SCREEN_DESIGN_FIXED_CLOCK },
        ["flashcard-main"],
      ),
    ],
    guardedStates: ["populated"],
    result: mutation("flashcard-review", "flashcard-review-main", "rating", 3),
  },
  {
    screenId: "focus-session-immersive",
    heading: "Focus session",
    records: assignmentSupport(),
    guardedStates: ["populated"],
    result: mutation("assignment-time-log", "time-log-main", "endedAt", null),
  },
  {
    screenId: "global-leaderboard",
    heading: "Community activity",
    records: groupRecords("member"),
    guardedStates: ["group-member"],
  },
  {
    screenId: "inbox-triage",
    heading: "Inbox",
    records: [
      profile(),
      record("class", "class-main", { name: "Biology", aiMode: "green" }),
      record(
        "inbox-item",
        "inbox-main",
        { raw: "Cell diagram needs labels and function notes.", status: "unclassified" },
        ["class-main"],
      ),
    ],
    guardedStates: ["populated"],
    result: mutation("inbox-item", "inbox-main", "status", "classified"),
  },
  {
    screenId: "knowledge-graph",
    heading: "Knowledge graph",
    records: classMastery(),
    guardedStates: ["populated"],
  },
  {
    screenId: "library-empty-state",
    heading: "Your classes",
    records: [profile()],
    guardedStates: ["honest-empty"],
  },
  {
    screenId: "lms-sync-center",
    heading: "Learning platform connections",
    records: [profile()],
    guardedStates: ["lms-disconnected", "honest-empty"],
  },
  {
    screenId: "mastery-tracker",
    heading: "Mastery tracker",
    records: classMastery(),
    guardedStates: ["populated"],
  },
  {
    screenId: "mastery-transcript-view",
    heading: "Mastery transcript",
    records: [
      ...classMastery(),
      record("lms-connection", "lms-main", {
        provider: "canvas",
        status: "connected",
      }),
    ],
    guardedStates: ["lms-connected", "populated"],
  },
  {
    screenId: "milestone-celebration",
    heading: "A quiet milestone",
    records: [
      ...academicCore(),
      record(
        "authorship-log",
        "authorship-main",
        { feature: "student_work", studentConfirmed: true },
        ["assignment-main"],
      ),
    ],
    guardedStates: ["populated"],
  },
  {
    screenId: "mission-board",
    heading: "Mission board",
    records: academicCore(),
    guardedStates: ["populated"],
  },
  {
    screenId: "notes-surface",
    heading: "Notes",
    params: { id: "note-main" },
    records: [
      ...academicCore(),
      record(
        "note",
        "note-main",
        { title: "Identity reading notes", bodyText: "Claim, quote, explanation." },
        ["class-main", "assignment-main"],
      ),
      record(
        "flashcard",
        "flashcard-main",
        { front: "What is the claim?", back: "Identity shapes choices." },
        ["class-main", "note-main"],
      ),
    ],
    guardedStates: ["populated"],
    result: mutation("note", "note-main", "bodyText", "Claim, quote, explanation."),
  },
  {
    screenId: "notification-center",
    heading: "Notifications",
    records: [
      ...academicCore(),
      record("lms-connection", "lms-main", {
        provider: "canvas",
        status: "connected",
        lastSyncError: null,
      }),
    ],
    guardedStates: ["populated", "lms-connected"],
  },
  {
    screenId: "onboarding-welcome",
    heading: "Welcome to Diana",
    records: [profile({ onboardedAt: null })],
    guardedStates: ["onboarding-invalid"],
  },
  {
    screenId: "onboarding-educational",
    heading: "Built around how you learn",
    records: [profile({ onboardedAt: null })],
    guardedStates: ["onboarding-invalid"],
  },
  {
    screenId: "onboarding-quiz-challenge",
    heading: "What gets in the way most?",
    records: [profile({ onboardedAt: null, learningHurdle: null })],
    guardedStates: ["onboarding-invalid"],
    result: noWrite("An invalid or missing hurdle does not persist."),
  },
  {
    screenId: "onboarding-quiz-schedule",
    heading: "When do you usually study?",
    records: [profile({ onboardedAt: null, studySchedulePreference: "after_school" })],
    guardedStates: ["onboarding-valid"],
    result: mutation("profile", "profile-main", "studySchedulePreference", "after_school"),
  },
  {
    screenId: "paywall-social-proof",
    heading: "Diana access",
    records: [profile()],
    guardedStates: ["billing-unavailable", "honest-empty"],
    result: noWrite("Billing is unavailable and no checkout is simulated."),
  },
  {
    screenId: "paywall-standard",
    heading: "Choose your access",
    records: [profile()],
    guardedStates: ["billing-unavailable"],
    result: noWrite("Billing is unavailable and no checkout is simulated."),
  },
  {
    screenId: "portfolio-gallery",
    heading: "Portfolio",
    records: shareRecords("active", "portfolio").filter(
      (item) => item.kind !== "share-token",
    ),
    guardedStates: ["populated"],
  },
  {
    screenId: "practice-test-session",
    heading: "Practice session",
    params: { id: "artifact-main" },
    records: [
      ...academicCore(),
      record(
        "study-artifact",
        "artifact-main",
        { artifactType: "practice_test", score: null, completed: false },
        ["class-main", "assignment-main"],
      ),
    ],
    guardedStates: ["practice-no-score"],
    result: mutation("study-artifact", "artifact-main", "completed", true),
  },
  {
    screenId: "privacy-export-hub",
    heading: "Privacy and export",
    records: [
      profile(),
      record("session-handoff", "handoff-main", {
        route: "/dashboard",
        updatedAt: SCREEN_DESIGN_FIXED_CLOCK,
      }),
      record("data-deletion-request", "deletion-main", {
        status: "cancelled",
        requestedAt: "2026-08-01T16:30:00.000Z",
      }),
    ],
    guardedStates: ["populated"],
    result: mutation("data-deletion-request", "deletion-main", "status", "pending"),
  },
  {
    screenId: "progress-insights",
    heading: "Progress insights",
    records: [
      ...assignmentSupport(),
      record("analytics-event", "analytics-main", {
        eventName: "assignment_opened",
        occurredAt: SCREEN_DESIGN_FIXED_CLOCK,
      }),
    ],
    guardedStates: ["populated"],
  },
  {
    screenId: "quick-add",
    heading: "Quick add",
    records: [
      profile(),
      record("inbox-item", "inbox-main", {
        raw: "Bring the biology diagram tomorrow.",
        status: "unclassified",
      }),
    ],
    guardedStates: ["populated"],
    result: mutation("inbox-item", "inbox-main", "status", "unclassified"),
  },
  {
    screenId: "review-submit-checkpoint",
    heading: "Review before submitting",
    params: { id: "assignment-main" },
    records: [
      ...assignmentSupport({ status: "exporting" }, { checked: true }),
      record(
        "authorship-log",
        "authorship-main",
        { feature: "submission_review", studentConfirmed: false },
        ["assignment-main"],
      ),
    ],
    guardedStates: ["populated"],
    result: mutation("assignment", "assignment-main", "status", "submitted"),
  },
  {
    screenId: "rubric-scout",
    heading: "Rubric scout",
    params: { id: "class-main" },
    records: [
      ...academicCore(),
      record(
        "rubric",
        "rubric-main",
        { title: "Identity response rubric", parseStatus: "parsed" },
        ["class-main"],
      ),
      record(
        "class-syllabus",
        "syllabus-main",
        { title: "English 9 course guide" },
        ["class-main"],
      ),
    ],
    guardedStates: ["populated"],
  },
  {
    screenId: "scout-share-view",
    heading: "Shared progress report",
    ownerAlias: "qa-public-owner",
    params: { token: "share-active" },
    records: shareRecords("active", "report"),
    guardedStates: ["share-active"],
  },
  {
    screenId: "settings-profile-center",
    heading: "Profile and settings",
    records: [profile({ reducedMotion: false, highContrast: false })],
    guardedStates: ["populated"],
    result: mutation("profile", "profile-main", "reducedMotion", false),
  },
  {
    screenId: "smart-loading",
    heading: "Getting your next view ready",
    records: [profile()],
    guardedStates: ["populated"],
    result: noWrite("Loading reflects the owning request and creates no record."),
  },
  {
    screenId: "smart-search",
    heading: "Search Diana",
    records: [
      ...academicCore(),
      record(
        "note",
        "note-main",
        { title: "Identity reading notes", bodyText: "Quote and explanation." },
        ["class-main", "assignment-main"],
      ),
      record(
        "mastery-concept",
        "concept-main",
        { name: "Claim evidence reasoning", masteryLevel: 1.8 },
        ["class-main"],
      ),
    ],
    guardedStates: ["populated"],
    result: noWrite("Search is RLS-scoped and does not mutate student data."),
  },
  {
    screenId: "study-artifacts-hub",
    heading: "Study artifacts",
    records: [
      ...academicCore(),
      record(
        "study-artifact",
        "artifact-main",
        { artifactType: "study_guide", title: "Identity study guide" },
        ["class-main", "assignment-main"],
      ),
    ],
    guardedStates: ["ai-green", "populated"],
    result: mutation("study-artifact", "artifact-main", "artifactType", "study_guide"),
  },
  {
    screenId: "study-calendar",
    heading: "Study calendar",
    records: academicCore(),
    guardedStates: ["populated"],
  },
  {
    screenId: "study-goal-wizard",
    heading: "Study goal",
    records: [profile({ studyGoal: "Finish one evidence paragraph" })],
    guardedStates: ["populated"],
    result: mutation("profile", "profile-main", "studyGoal", "Finish one evidence paragraph"),
  },
  {
    screenId: "study-room-social",
    heading: "Study room",
    records: groupRecords("member"),
    guardedStates: ["group-member"],
    result: mutation("study-group-membership", "membership-main", "role", "member"),
  },
  {
    screenId: "subject-library",
    heading: "Subject library",
    records: academicCore(),
    guardedStates: ["populated"],
  },
  {
    screenId: "task-breakdown-modal",
    heading: "Break this task down",
    records: [
      ...academicCore(),
      record(
        "assignment-step",
        "assignment-step-main",
        {
          steps: [
            { step: 1, action: "Pick the quote and page number.", minutes: 5, done: true },
            { step: 2, action: "Write a one-sentence claim.", minutes: 5, done: false },
            { step: 3, action: "Connect the quote to the claim.", minutes: 5, done: false },
            { step: 4, action: "Read the response against the rubric.", minutes: 5, done: false },
            { step: 5, action: "Prepare the final response for submission.", minutes: 5, done: false },
          ],
        },
        ["assignment-main"],
      ),
    ],
    guardedStates: ["ai-green"],
    result: mutation("assignment-step", "assignment-step-main", "accepted", true),
  },
  {
    screenId: "tutor-chat",
    heading: "Study Buddy",
    records: [
      profile({ tutorPersona: "diana", tutorStyle: "socratic", tutorComplexity: "balanced" }),
      record("ai-interaction", "ai-interaction-main", {
        feature: "study_buddy",
        model: "claude-sonnet-4-6",
      }),
      record(
        "authorship-log",
        "authorship-main",
        { feature: "study_buddy" },
        ["ai-interaction-main"],
      ),
    ],
    guardedStates: ["ai-green"],
    result: mutation("authorship-log", "authorship-main", "feature", "study_buddy"),
  },
  {
    screenId: "tutor-gallery",
    heading: "Choose your tutor",
    records: [profile({ tutorPersona: "diana" })],
    guardedStates: ["populated"],
    result: mutation("profile", "profile-main", "tutorPersona", "maya"),
  },
  {
    screenId: "tutor-personalization",
    heading: "Tutor style",
    records: [profile({ tutorStyle: "socratic", tutorComplexity: "balanced" })],
    guardedStates: ["populated"],
    result: mutation("profile", "profile-main", "tutorStyle", "supportive"),
  },
  {
    screenId: "wellness-recovery-log",
    heading: "Wellness and recovery",
    records: [
      profile(),
      record("wellness-activity", "wellness-activity-main", {
        activityType: "walk",
        durationMinutes: 20,
        felt: "steady",
      }),
      record("wellness-goal", "wellness-goal-main", {
        category: "recovery",
        title: "Take one screen break",
      }),
      record("sleep-log", "sleep-main", {
        sleepDate: "2026-09-13",
        durationMinutes: 480,
        quality: "okay",
      }),
    ],
    guardedStates: ["populated"],
    result: mutation("wellness-activity", "wellness-activity-main", "durationMinutes", 20),
  },
];

const GUARDED_SCENARIOS: readonly ScenarioDefinition[] = [
  {
    screenId: "ai-writing-coach",
    variant: "ai-red-blocked",
    heading: "Writing Coach unavailable for this class",
    params: { id: "assignment-main" },
    records: academicCore("red"),
    guardedStates: ["ai-red"],
    result: noWrite("Red AI policy blocks content generation server-side."),
  },
  {
    screenId: "ai-writing-coach",
    variant: "ai-yellow-blocked",
    heading: "Writing Coach limited for this class",
    params: { id: "assignment-main" },
    records: academicCore("yellow"),
    guardedStates: ["ai-yellow"],
    result: noWrite("Yellow AI policy blocks writing generation server-side."),
  },
  {
    screenId: "paywall-standard",
    variant: "billing-configured",
    heading: "Choose your access",
    records: [profile()],
    guardedStates: ["billing-configured"],
    result: navigation("/api/billing/checkout"),
  },
  {
    screenId: "lms-sync-center",
    variant: "lms-error",
    heading: "Connection needs attention",
    records: [
      profile(),
      record("lms-connection", "lms-main", {
        provider: "canvas",
        status: "error",
        lastSyncError: "Synthetic QA sync interruption",
      }),
    ],
    guardedStates: ["lms-error"],
  },
  {
    screenId: "lms-sync-center",
    variant: "lms-connected",
    heading: "Learning platform connected",
    records: [
      profile(),
      record("lms-connection", "lms-main", {
        provider: "canvas",
        status: "connected",
        lastSyncError: null,
      }),
    ],
    guardedStates: ["lms-connected"],
  },
  {
    screenId: "external-scout-view",
    variant: "share-expired",
    heading: "This shared link has expired",
    ownerAlias: "qa-public-owner",
    params: { token: "share-expired" },
    records: shareRecords("expired", "portfolio"),
    guardedStates: ["share-expired"],
    result: noWrite("Expired tokens expose no portfolio records."),
  },
  {
    screenId: "external-scout-view",
    variant: "share-revoked",
    heading: "This shared link is no longer available",
    ownerAlias: "qa-public-owner",
    params: { token: "share-revoked" },
    records: shareRecords("revoked", "portfolio"),
    guardedStates: ["share-revoked"],
    result: noWrite("Revoked tokens expose no portfolio records."),
  },
  {
    screenId: "study-room-social",
    variant: "group-nonmember",
    heading: "Join with an invite",
    records: groupRecords("nonmember"),
    guardedStates: ["group-nonmember"],
    result: noWrite("Nonmembers cannot read or mutate membership-scoped group records."),
  },
  {
    screenId: "onboarding-quiz-challenge",
    variant: "valid-selection",
    heading: "What gets in the way most?",
    records: [profile({ onboardedAt: null, learningHurdle: "getting_started" })],
    guardedStates: ["onboarding-valid"],
    result: mutation("profile", "profile-main", "learningHurdle", "getting_started"),
  },
  {
    screenId: "onboarding-quiz-schedule",
    variant: "invalid-selection",
    heading: "When do you usually study?",
    records: [profile({ onboardedAt: null, studySchedulePreference: null })],
    guardedStates: ["onboarding-invalid"],
    result: noWrite("An invalid or missing schedule does not persist."),
  },
  {
    screenId: "milestone-celebration",
    variant: "reduced-motion",
    heading: "A quiet milestone",
    records: [profile({ reducedMotion: true })],
    guardedStates: ["reduced-motion"],
    result: navigation("/proof"),
  },
];

function defaultResult(
  definition: ScenarioDefinition,
): ScreenDesignExpectedPersistedResult {
  const screen = SCREEN_DESIGN_SCREEN_BY_ID.get(definition.screenId);
  if (!screen) throw new Error(`Unknown ScreenDesign screen: ${definition.screenId}`);

  if (screen.primaryAction.kind === "navigate") return navigation(screen.route);
  if (screen.primaryAction.kind === "search") {
    return noWrite("Search is a read-only owner-scoped operation.");
  }
  if (screen.primaryAction.kind === "system") {
    return noWrite("System request completion does not create a fixture record.");
  }

  return mutation("profile", "profile-main", "updatedAt", SCREEN_DESIGN_FIXED_CLOCK);
}

function defineScenario(
  definition: ScenarioDefinition,
): ScreenDesignFixtureScenario {
  const screen = SCREEN_DESIGN_SCREEN_BY_ID.get(definition.screenId);
  if (!screen) throw new Error(`Unknown ScreenDesign screen: ${definition.screenId}`);
  const variant = definition.variant ?? "default";

  return Object.freeze({
    id: `${definition.screenId}:${variant}`,
    screenId: definition.screenId,
    variant,
    isDefault: definition.isDefault ?? definition.variant == null,
    authClass: screen.authClass,
    ownerAlias:
      definition.ownerAlias ??
      (screen.authClass === "public-token" ? "qa-public-owner" : "qa-primary"),
    fixedClock: SCREEN_DESIGN_FIXED_CLOCK,
    displayCopy: Object.freeze({
      studentName: "Grayson",
      heading: definition.heading,
      primaryActionLabel: screen.primaryAction.label,
      ...(definition.guardedStates?.includes("honest-empty")
        ? { emptyStateLabel: definition.heading }
        : {}),
    }),
    route: Object.freeze({
      pathname: screen.route,
      params: Object.freeze(definition.params ?? {}),
      stateSelector: screen.stateSelector,
    }),
    records: Object.freeze([...definition.records]),
    guardedStates: Object.freeze([...(definition.guardedStates ?? ["populated"])]),
    expectedPrimaryAction: Object.freeze({
      label: screen.primaryAction.label,
      kind: screen.primaryAction.kind,
    }),
    expectedPersistedResult: definition.result ?? defaultResult(definition),
  });
}

export const SCREEN_DESIGN_FIXTURE_SCENARIOS: readonly ScreenDesignFixtureScenario[] =
  Object.freeze([...DEFAULT_SCENARIOS, ...GUARDED_SCENARIOS].map(defineScenario));

export function getScreenDesignFixtureScenario(
  scenarioId: string,
): ScreenDesignFixtureScenario | null {
  return (
    SCREEN_DESIGN_FIXTURE_SCENARIOS.find((scenario) => scenario.id === scenarioId) ??
    null
  );
}
