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
      id: "ai-history-log",
      source: exportSource("ai_history_log.html"),
      route: "/settings/ai-history",
      stateSelector: null,
      primaryAction: {
        label: "Review AI activity",
        kind: "navigate",
        contract: "Open the selected ai_interactions or authorship_log record.",
      },
      authClass: "authenticated",
      dataOwner: "ai_interactions and authorship_log",
    }),
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
      id: "ap-command-center",
      source: exportSource("ap_command_center.html"),
      route: "/ap",
      stateSelector: null,
      primaryAction: {
        label: "Open AP study plan",
        kind: "navigate",
        contract: "Open the selected AP exam plan or practice action.",
      },
      authClass: "authenticated",
      dataOwner: "ap_exam_plans and ap_practice_attempts",
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
      id: "concept-deep-dive",
      source: exportSource("concept_deep_dive.html"),
      route: "/concepts/[id]",
      stateSelector: null,
      primaryAction: {
        label: "Practice this concept",
        kind: "navigate",
        contract: "Open practice from the selected owner-scoped mastery concept.",
      },
      authClass: "authenticated",
      dataOwner: "mastery_concepts and mastery_events",
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
      id: "flashcards-review",
      source: exportSource("flashcards_review.html"),
      route: "/flashcards/[id]/review",
      stateSelector: null,
      primaryAction: {
        label: "Rate this card",
        kind: "mutate",
        contract: "Persist the FSRS rating and advance to the next due card.",
      },
      authClass: "authenticated",
      dataOwner: "flashcards, flashcard_reviews, and mastery_events",
    }),
    defineScreen({
      id: "focus-session-immersive",
      source: exportSource("focus_session_immersive.html"),
      route: "/timer",
      stateSelector: null,
      primaryAction: {
        label: "Start focus session",
        kind: "mutate",
        contract: "Start the existing timer state machine and time-log session.",
      },
      authClass: "authenticated",
      dataOwner: "timer state and assignment_time_log",
    }),
    defineScreen({
      id: "global-leaderboard",
      source: exportSource("global_leaderboard.html"),
      route: "/study-groups",
      stateSelector: "view=community",
      primaryAction: {
        label: "Open group activity",
        kind: "navigate",
        contract: "Open activity inside an opted-in authenticated study group.",
      },
      authClass: "authenticated",
      dataOwner: "study_groups and membership-scoped activity",
      securitySubstitution:
        "Opt-in group activity replaces a public global ranking of minors.",
    }),
    defineScreen({
      id: "inbox-triage",
      source: exportSource("inbox_triage.html"),
      route: "/inbox",
      stateSelector: null,
      primaryAction: {
        label: "Triage inbox item",
        kind: "mutate",
        contract: "Classify or confirm the selected inbox_items record.",
      },
      authClass: "authenticated",
      dataOwner: "inbox_items and classify-inbox",
    }),
    defineScreen({
      id: "knowledge-graph",
      source: exportSource("knowledge_graph.html"),
      route: "/knowledge-graph",
      stateSelector: null,
      primaryAction: {
        label: "Open concept",
        kind: "navigate",
        contract: "Navigate from a graph node to its real concept detail route.",
      },
      authClass: "authenticated",
      dataOwner: "mastery_concepts grouped by class",
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
      id: "mastery-tracker",
      source: exportSource("mastery_tracker.html"),
      route: "/grades",
      stateSelector: null,
      primaryAction: {
        label: "Open mastery detail",
        kind: "navigate",
        contract: "Open a class or concept represented by real mastery evidence.",
      },
      authClass: "authenticated",
      dataOwner: "mastery_concepts and Canvas grade reads",
    }),
    defineScreen({
      id: "mastery-transcript-view",
      source: exportSource("mastery_transcript_view.html"),
      route: "/grades/transcript",
      stateSelector: null,
      primaryAction: {
        label: "Export transcript",
        kind: "navigate",
        contract: "Use the supported owner-scoped transcript export or share flow.",
      },
      authClass: "authenticated",
      dataOwner: "Canvas course and submission reads",
    }),
    defineScreen({
      id: "milestone-celebration",
      source: exportSource("milestone_celebration.html"),
      route: "/proof",
      stateSelector: "celebrate=latest",
      primaryAction: {
        label: "Continue",
        kind: "navigate",
        contract: "Dismiss the celebration and return to the real proof gallery.",
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
      id: "notification-center",
      source: exportSource("notification_center.html"),
      route: "/notifications",
      stateSelector: null,
      primaryAction: {
        label: "Open notification",
        kind: "navigate",
        contract: "Mark the real event read and follow its supported deep link.",
      },
      authClass: "authenticated",
      dataOwner: "due-work and LMS connection events",
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
      id: "paywall-social-proof",
      source: exportSource("paywall_social_proof.html"),
      route: "/upgrade",
      stateSelector: "view=community",
      primaryAction: {
        label: "Review access options",
        kind: "navigate",
        contract: "Open checkout only when a real billing capability is configured.",
      },
      authClass: "authenticated",
      dataOwner: "server-resolved billing capability",
      securitySubstitution:
        "Truthful unavailable access state replaces a simulated purchase or fabricated community proof.",
    }),
    defineScreen({
      id: "paywall-standard",
      source: exportSource("paywall_standard.html"),
      route: "/upgrade",
      stateSelector: "standard",
      primaryAction: {
        label: "Review access options",
        kind: "navigate",
        contract: "Open checkout only when a real billing capability is configured.",
      },
      authClass: "authenticated",
      dataOwner: "server-resolved billing capability",
      securitySubstitution:
        "Truthful unavailable access state replaces a static export button when checkout is not configured.",
    }),
    defineScreen({
      id: "portfolio-gallery",
      source: exportSource("portfolio_gallery.html"),
      route: "/portfolio",
      stateSelector: null,
      primaryAction: {
        label: "Open portfolio item",
        kind: "navigate",
        contract: "Open a real owner-scoped portfolio artifact or share action.",
      },
      authClass: "authenticated",
      dataOwner: "portfolios and portfolio_items",
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
      id: "privacy-export-hub",
      source: exportSource("privacy_export_hub.html"),
      route: "/export",
      stateSelector: null,
      primaryAction: {
        label: "Export my data",
        kind: "mutate",
        contract: "Run the existing owner-scoped export or deletion-request action.",
      },
      authClass: "authenticated",
      dataOwner: "profile export categories and data_deletion_requests",
    }),
    defineScreen({
      id: "progress-insights",
      source: exportSource("progress_insights.html"),
      route: "/insights",
      stateSelector: null,
      primaryAction: {
        label: "Open insight detail",
        kind: "navigate",
        contract: "Explain a trend derived from real assignments, time logs, or events.",
      },
      authClass: "authenticated",
      dataOwner: "assignments, time logs, and analytics events",
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
      id: "study-goal-wizard",
      source: exportSource("study_goal_wizard.html"),
      route: "/settings/goals",
      stateSelector: null,
      primaryAction: {
        label: "Save study goal",
        kind: "submit",
        contract: "Validate and persist the student-owned goal before success.",
      },
      authClass: "authenticated",
      dataOwner: "student-owned study goals",
    }),
    defineScreen({
      id: "study-room-social",
      source: exportSource("study_room_social.html"),
      route: "/study-groups",
      stateSelector: "room",
      primaryAction: {
        label: "Join study room",
        kind: "mutate",
        contract: "Join or open a real invite-only membership-scoped group.",
      },
      authClass: "authenticated",
      dataOwner: "study_groups, memberships, sessions, decks, and notes",
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
      id: "task-breakdown-modal",
      source: exportSource("task_breakdown_modal.html"),
      route: "/break-down",
      stateSelector: "assignment overlay",
      primaryAction: {
        label: "Accept task breakdown",
        kind: "mutate",
        contract:
          "Generate under the effective AI policy and persist accepted assignment steps.",
      },
      authClass: "authenticated",
      dataOwner: "assignment_steps, task-breakdown, and authorship_log",
    }),
    defineScreen({
      id: "tutor-chat",
      source: exportSource("tutor_chat.html"),
      route: "/study-buddy",
      stateSelector: null,
      primaryAction: {
        label: "Send tutor message",
        kind: "submit",
        contract:
          "Use the authenticated study-buddy backend with AI policy and authorship logging.",
      },
      authClass: "authenticated",
      dataOwner: "study-buddy conversation and controlled AI backend",
    }),
    defineScreen({
      id: "tutor-gallery",
      source: exportSource("tutor_gallery.html"),
      route: "/settings/tutor",
      stateSelector: "gallery",
      primaryAction: {
        label: "Choose tutor",
        kind: "select",
        contract: "Persist a supported tutor persona on the student profile.",
      },
      authClass: "authenticated",
      dataOwner: "profile tutor_persona",
    }),
    defineScreen({
      id: "tutor-personalization",
      source: exportSource("tutor_personalization.html"),
      route: "/settings/tutor",
      stateSelector: "personalization",
      primaryAction: {
        label: "Save tutor style",
        kind: "submit",
        contract: "Persist supported tutor style and complexity preferences.",
      },
      authClass: "authenticated",
      dataOwner: "profile tutor_style and learning preferences",
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
