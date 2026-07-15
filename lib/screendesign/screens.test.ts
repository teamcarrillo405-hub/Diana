import { describe, expect, it } from "vitest";

import { SCREEN_DESIGN_SCREENS } from "./screens";

const EXPECTED_SOURCE_FILES = [
  "ai_history_log.html",
  "ai_writing_coach.html",
  "ap_command_center.html",
  "assignment_detail.html",
  "concept_deep_dive.html",
  "dashboard_personalized (1).html",
  "external_scout_view.html",
  "flashcards_review.html",
  "focus_session_immersive.html",
  "global_leaderboard.html",
  "inbox_triage.html",
  "knowledge_graph.html",
  "library_empty_state.html",
  "lms_sync_center.html",
  "mastery_tracker.html",
  "mastery_transcript_view.html",
  "milestone_celebration.html",
  "mission_board.html",
  "notes_surface.html",
  "notification_center.html",
  "onboarding_welcome.html",
  "onboarding_educational.html",
  "onboarding_quiz_challenge.html",
  "onboarding_quiz_schedule.html",
  "paywall_social_proof.html",
  "paywall_standard.html",
  "portfolio_gallery.html",
  "practice_test_session.html",
  "privacy_export_hub.html",
  "progress_insights.html",
  "quick_add.html",
  "review_submit_checkpoint.html",
  "rubric_scout.html",
  "scout_share_view.html",
  "settings_profile_center.html",
  "smart_loading.html",
  "smart_search.html",
  "study_artifacts_hub.html",
  "study_calendar.html",
  "study_goal_wizard.html",
  "study_room_social.html",
  "subject_library.html",
  "task_breakdown_modal.html",
  "tutor_chat.html",
  "tutor_gallery.html",
  "tutor_personalization.html",
  "wellness_recovery_log.html",
] as const;

describe("SCREEN_DESIGN_SCREENS", () => {
  it("contains exactly the 47 canonical ScreenDesign sources in approved order", () => {
    expect(SCREEN_DESIGN_SCREENS).toHaveLength(47);
    expect(
      SCREEN_DESIGN_SCREENS.map((screen) => screen.source.split("/").at(-1)),
    ).toEqual(EXPECTED_SOURCE_FILES);
  });

  it("uses unique stable ids, sources, and visual snapshot names", () => {
    for (const values of [
      SCREEN_DESIGN_SCREENS.map((screen) => screen.id),
      SCREEN_DESIGN_SCREENS.map((screen) => screen.source),
      SCREEN_DESIGN_SCREENS.map((screen) => screen.visualSnapshot),
    ]) {
      expect(new Set(values).size).toBe(47);
    }

    expect(
      SCREEN_DESIGN_SCREENS.every((screen) =>
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(screen.id),
      ),
    ).toBe(true);
  });

  it("gives the attached dashboard exclusive ownership of /dashboard", () => {
    const dashboards = SCREEN_DESIGN_SCREENS.filter(
      (screen) => screen.route === "/dashboard",
    );

    expect(dashboards).toHaveLength(1);
    expect(dashboards[0]?.source).toBe(
      "C:/Users/glcar/Downloads/dashboard_personalized (1).html",
    );
    expect(
      SCREEN_DESIGN_SCREENS.some((screen) =>
        screen.source.endsWith(
          "/ai-tutor-app-html-2026-07-14-15-18/dashboard_personalized.html",
        ),
      ),
    ).toBe(false);
  });

  it("declares operational ownership for every source", () => {
    for (const screen of SCREEN_DESIGN_SCREENS) {
      expect(screen.route).toMatch(/^\//);
      expect(screen).toHaveProperty("stateSelector");
      expect(screen.primaryAction.label.trim()).not.toBe("");
      expect(screen.primaryAction.contract.trim()).not.toBe("");
      expect(["authenticated", "public-token"]).toContain(screen.authClass);
      expect(screen.dataOwner.trim()).not.toBe("");
      expect(screen.sourceViewport).toEqual({ width: 393, height: 852 });
      expect(screen.visualSnapshot).toBe(`${screen.id}.png`);
    }
  });

  it("uses state selectors whenever multiple sources share one route owner", () => {
    const screensByRoute = Map.groupBy(
      SCREEN_DESIGN_SCREENS,
      (screen) => screen.route,
    );

    for (const routeScreens of screensByRoute.values()) {
      if (routeScreens.length < 2) continue;
      expect(routeScreens.every((screen) => screen.stateSelector !== null)).toBe(
        true,
      );
      expect(
        new Set(routeScreens.map((screen) => screen.stateSelector)).size,
      ).toBe(routeScreens.length);
    }
  });

  it("records required security substitutions on exposed reference screens", () => {
    const byId = new Map(
      SCREEN_DESIGN_SCREENS.map((screen) => [screen.id, screen]),
    );

    for (const id of [
      "external-scout-view",
      "scout-share-view",
      "paywall-social-proof",
      "paywall-standard",
      "global-leaderboard",
    ]) {
      expect(byId.get(id)?.securitySubstitution).toBeTruthy();
    }
  });
});
