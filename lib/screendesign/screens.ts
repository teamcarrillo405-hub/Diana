export const SCREEN_DESIGN_EXPORT_DIR =
  "C:/Users/glcar/Downloads/ai-tutor-app-html-2026-07-14-15-18";

export const SCREEN_DESIGN_DASHBOARD_SOURCE =
  "C:/Users/glcar/Downloads/dashboard_personalized (1).html";

export type ScreenDesignAuthClass = "authenticated" | "public-token";

export type ScreenDesignActionKind =
  | "navigate"
  | "mutate"
  | "search"
  | "select"
  | "submit"
  | "system";

export interface ScreenDesignPrimaryAction {
  readonly label: string;
  readonly kind: ScreenDesignActionKind;
  readonly contract: string;
}

export interface ScreenDesignScreen {
  readonly id: string;
  readonly source: string;
  readonly route: `/${string}`;
  readonly stateSelector: string | null;
  readonly primaryAction: ScreenDesignPrimaryAction;
  readonly authClass: ScreenDesignAuthClass;
  readonly dataOwner: string;
  readonly sourceViewport: Readonly<{ width: 393; height: 852 }>;
  readonly visualSnapshot: `${string}.png`;
  readonly securitySubstitution?: string;
}

type ScreenDefinition = Omit<
  ScreenDesignScreen,
  "sourceViewport" | "visualSnapshot"
>;

const exportSource = (file: string) => `${SCREEN_DESIGN_EXPORT_DIR}/${file}`;

const defineScreen = (screen: ScreenDefinition): ScreenDesignScreen =>
  Object.freeze({
    ...screen,
    sourceViewport: Object.freeze({ width: 393, height: 852 }),
    visualSnapshot: `${screen.id}.png`,
  });

export const SCREEN_DESIGN_SCREENS: readonly ScreenDesignScreen[] =
  Object.freeze([
    defineScreen({
      id: "ai-writing-coach",
      source: exportSource("ai_writing_coach.html"),
      route: "/assignments/[id]",
      stateSelector: "writing-coach (also owned by /notes/[id])",
      primaryAction: {
        label: "Request writing guidance",
        kind: "mutate",
        contract:
          "Invoke the writing-aid action under the effective AI policy and append authorship evidence.",
      },
      authClass: "authenticated",
      dataOwner: "assignment or note draft, writing-aid, and authorship_log",
    }),
    defineScreen({
      id: "assignment-detail",
      source: exportSource("assignment_detail.html"),
      route: "/assignments/[id]",
      stateSelector: "detail",
      primaryAction: {
        label: "Start assignment",
        kind: "mutate",
        contract:
          "Use the assignment lifecycle action and create or resume its focus state.",
      },
      authClass: "authenticated",
      dataOwner: "assignments, assignment_checklists, and assignment_time_log",
    }),
    defineScreen({
      id: "dashboard-personalized",
      source: SCREEN_DESIGN_DASHBOARD_SOURCE,
      route: "/dashboard",
      stateSelector: null,
      primaryAction: {
        label: "Start your next move",
        kind: "navigate",
        contract:
          "Open the first real ranked assignment or its supported focus action.",
      },
      authClass: "authenticated",
      dataOwner: "profile, ranked assignments, task signals, classes, and time logs",
    }),
    defineScreen({
      id: "external-scout-view",
      source: exportSource("external_scout_view.html"),
      route: "/share/[token]",
      stateSelector: "portfolio",
      primaryAction: {
        label: "Open shared evidence",
        kind: "navigate",
        contract: "Open only evidence included by the resolved share token.",
      },
      authClass: "public-token",
      dataOwner: "unexpired and unrevoked portfolio share token",
      securitySubstitution:
        "Token-scoped portfolio evidence replaces any general student-profile access depicted by the export.",
    }),
    defineScreen({
      id: "library-empty-state",
      source: exportSource("library_empty_state.html"),
      route: "/classes",
      stateSelector: "empty",
      primaryAction: {
        label: "Add a class",
        kind: "navigate",
        contract: "Open the supported class creation flow.",
      },
      authClass: "authenticated",
      dataOwner: "classes empty result",
    }),
    defineScreen({
      id: "lms-sync-center",
      source: exportSource("lms_sync_center.html"),
      route: "/settings",
      stateSelector: "connections",
      primaryAction: {
        label: "Connect learning platform",
        kind: "navigate",
        contract: "Begin a supported LMS connection or real sync action.",
      },
      authClass: "authenticated",
      dataOwner: "lms_connections and provider sync routes",
    }),
    defineScreen({
      id: "milestone-celebration",
      source: exportSource("milestone_celebration.html"),
      route: "/proof",
      stateSelector: "celebrate=latest",
      primaryAction: {
        label: "Continue",
        kind: "navigate",
        contract: "Dismiss the celebration and return to the real record.",
      },
      authClass: "authenticated",
      dataOwner: "completed work and authorship evidence",
    }),
    defineScreen({
      id: "mission-board",
      source: exportSource("mission_board.html"),
      route: "/assignments",
      stateSelector: null,
      primaryAction: {
        label: "Open assignment",
        kind: "navigate",
        contract: "Open the selected owner-scoped assignment detail.",
      },
      authClass: "authenticated",
      dataOwner: "ranked assignments and assignment lifecycle",
    }),
    defineScreen({
      id: "notes-surface",
      source: exportSource("notes_surface.html"),
      route: "/notes/[id]",
      stateSelector: null,
      primaryAction: {
        label: "Save note",
        kind: "mutate",
        contract: "Persist the owner-scoped note through the existing save action.",
      },
      authClass: "authenticated",
      dataOwner: "notes, tags, flashcards, and study artifacts",
    }),
    defineScreen({
      id: "onboarding-welcome",
      source: exportSource("onboarding_welcome.html"),
      route: "/onboarding",
      stateSelector: "welcome",
      primaryAction: {
        label: "Get started",
        kind: "navigate",
        contract: "Advance to the educational onboarding state.",
      },
      authClass: "authenticated",
      dataOwner: "authenticated profile onboarding gate",
    }),
    defineScreen({
      id: "onboarding-educational",
      source: exportSource("onboarding_educational.html"),
      route: "/onboarding",
      stateSelector: "education",
      primaryAction: {
        label: "Continue",
        kind: "navigate",
        contract: "Advance to the challenge selection without completing onboarding.",
      },
      authClass: "authenticated",
      dataOwner: "onboarding route state",
    }),
    defineScreen({
      id: "onboarding-quiz-challenge",
      source: exportSource("onboarding_quiz_challenge.html"),
      route: "/onboarding",
      stateSelector: "challenge=1/4",
      primaryAction: {
        label: "Select learning hurdle",
        kind: "select",
        contract: "Validate and persist the dedicated profile learning_hurdle value.",
      },
      authClass: "authenticated",
      dataOwner: "profiles.learning_hurdle",
    }),
    defineScreen({
      id: "onboarding-quiz-schedule",
      source: exportSource("onboarding_quiz_schedule.html"),
      route: "/onboarding",
      stateSelector: "schedule=2/4",
      primaryAction: {
        label: "Select study schedule",
        kind: "select",
        contract:
          "Validate and persist profiles.study_schedule_preference, then complete the locked flow.",
      },
      authClass: "authenticated",
      dataOwner: "profiles.study_schedule_preference",
    }),
    defineScreen({
      id: "practice-test-session",
      source: exportSource("practice_test_session.html"),
      route: "/study-artifacts/[id]",
      stateSelector: "practice",
      primaryAction: {
        label: "Submit practice response",
        kind: "submit",
        contract: "Persist the response without inventing an unsupported score.",
      },
      authClass: "authenticated",
      dataOwner: "study_artifacts payload and practice responses",
    }),
    defineScreen({
      id: "quick-add",
      source: exportSource("quick_add.html"),
      route: "/quick-add",
      stateSelector: null,
      primaryAction: {
        label: "Add item",
        kind: "submit",
        contract: "Validate and insert a real inbox_items capture.",
      },
      authClass: "authenticated",
      dataOwner: "inbox_items",
    }),
    defineScreen({
      id: "review-submit-checkpoint",
      source: exportSource("review_submit_checkpoint.html"),
      route: "/assignments/[id]/submit",
      stateSelector: null,
      primaryAction: {
        label: "Confirm submission",
        kind: "submit",
        contract:
          "Require student confirmation before the explicit done-to-submitted transition.",
      },
      authClass: "authenticated",
      dataOwner: "assignment checklist, state machine, and authorship evidence",
    }),
    defineScreen({
      id: "rubric-scout",
      source: exportSource("rubric_scout.html"),
      route: "/classes/[id]",
      stateSelector: "rubric",
      primaryAction: {
        label: "Open rubric work",
        kind: "navigate",
        contract: "Open the owning class or assignment from its real rubric.",
      },
      authClass: "authenticated",
      dataOwner: "rubrics, class documents, and assignments",
    }),
    defineScreen({
      id: "scout-share-view",
      source: exportSource("scout_share_view.html"),
      route: "/share/[token]",
      stateSelector: "report",
      primaryAction: {
        label: "Open shared report section",
        kind: "navigate",
        contract: "Open only report fields authorized by the resolved share token.",
      },
      authClass: "public-token",
      dataOwner: "unexpired and unrevoked report share token",
      securitySubstitution:
        "Exact token, expiry, revocation, and owner-derived scope replace any general report lookup.",
    }),
    defineScreen({
      id: "settings-profile-center",
      source: exportSource("settings_profile_center.html"),
      route: "/settings",
      stateSelector: "profile (also owned by /me)",
      primaryAction: {
        label: "Save settings",
        kind: "submit",
        contract: "Validate and persist owner-scoped profile preferences.",
      },
      authClass: "authenticated",
      dataOwner: "profile, accessibility, privacy, and personalization fields",
    }),
    defineScreen({
      id: "smart-loading",
      source: exportSource("smart_loading.html"),
      route: "/(app)",
      stateSelector: "shared loading.tsx",
      primaryAction: {
        label: "Complete active request",
        kind: "system",
        contract: "Resolve from the owning route's real request without a fake delay.",
      },
      authClass: "authenticated",
      dataOwner: "owning route request state",
    }),
    defineScreen({
      id: "smart-search",
      source: exportSource("smart_search.html"),
      route: "/search",
      stateSelector: null,
      primaryAction: {
        label: "Search",
        kind: "search",
        contract: "Query RLS-scoped entities and navigate each result to its owner.",
      },
      authClass: "authenticated",
      dataOwner: "notes, assignments, classes, and mastery concepts",
    }),
    defineScreen({
      id: "study-artifacts-hub",
      source: exportSource("study_artifacts_hub.html"),
      route: "/study-artifacts",
      stateSelector: null,
      primaryAction: {
        label: "Create study artifact",
        kind: "mutate",
        contract:
          "Use the existing AI-policy-gated artifact generation and authorship action.",
      },
      authClass: "authenticated",
      dataOwner: "study_artifacts and generation action",
    }),
    defineScreen({
      id: "study-calendar",
      source: exportSource("study_calendar.html"),
      route: "/calendar",
      stateSelector: null,
      primaryAction: {
        label: "Open calendar item",
        kind: "navigate",
        contract: "Open the real assignment represented by the selected date item.",
      },
      authClass: "authenticated",
      dataOwner: "assignments and accommodation-aware time estimates",
    }),
    defineScreen({
      id: "subject-library",
      source: exportSource("subject_library.html"),
      route: "/classes",
      stateSelector: "populated",
      primaryAction: {
        label: "Open class",
        kind: "navigate",
        contract: "Open the selected owner-scoped class detail.",
      },
      authClass: "authenticated",
      dataOwner: "classes, open work, and study progress",
    }),
    defineScreen({
      id: "wellness-recovery-log",
      source: exportSource("wellness_recovery_log.html"),
      route: "/wellness",
      stateSelector: null,
      primaryAction: {
        label: "Log recovery activity",
        kind: "submit",
        contract: "Validate and persist private owner-scoped wellness state.",
      },
      authClass: "authenticated",
      dataOwner: "wellness_activity_logs, wellness_goals, and sleep_logs",
    }),
  ]);

export const SCREEN_DESIGN_SCREEN_BY_ID: ReadonlyMap<
  string,
  ScreenDesignScreen
> = new Map(SCREEN_DESIGN_SCREENS.map((screen) => [screen.id, screen]));
