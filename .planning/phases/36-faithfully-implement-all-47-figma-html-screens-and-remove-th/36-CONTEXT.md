# Phase 36 Context: Faithful ScreenDesign Rebuild

**Source:** Direct user decisions and the 47 exported ScreenDesign HTML files

<domain>
Rebuild the Diana student application from the exported ScreenDesign/Figma HTML screens while preserving and reconnecting the existing Next.js, Supabase, authentication, assignment, AI, study, and profile behavior.
</domain>

<decisions>

## Locked Decisions

- [D-01] The 47 exported HTML files in `C:\Users\glcar\Downloads\ai-tutor-app-html-2026-07-14-15-18` are the visual source of truth for the application screens.
- [D-02] `C:\Users\glcar\Downloads\dashboard_personalized (1).html` is the visual source of truth for the authenticated student's landing page.
- [D-03] The student landing page must use the stadium and athlete composition, Lobby header, one Your Next Move action, Needs Attention stack, and five-item bottom navigation from the attached dashboard source.
- [D-04] The onboarding flow must reproduce the attached welcome, educational, challenge, and schedule screens in that order, including their imagery, hierarchy, selected states, and progress treatment.
- [D-05] Nexus, Nexus Arcade, Mission Control, Today's Game Plan metric cards, and other old dashboard compositions must not appear in the rebuilt student experience.
- [D-06] This is a faithful implementation, not a color and typography reskin of existing layouts.
- [D-07] Screen content must be operational. Existing real profile, assignment, class, study, AI, authorship, notification, and onboarding data should feed the new visual compositions wherever the product already supports it.
- [D-08] All navigation and calls to action must connect to the correct application routes or working interactions. Static HTML links are reference behavior only and must be replaced with application navigation and state.
- [D-09] ScreenDesign-hosted media used by the exports must be copied to application-owned local assets so production does not depend on the design export host.
- [D-10] Mobile fidelity at the 393 by 852 source viewport is the first visual acceptance target, followed by safe responsive behavior for larger viewports.
- [D-11] Calm product invariants remain enforced: no shame language, no red error treatment, no streak guilt, explicit done versus submitted, and server-side AI traffic-light enforcement.
- [D-12] No screen may be counted complete merely because a route exists. It must be visually compared with its source and its primary interactions must work.

## The agent's Discretion

- Choose the internal component boundaries, shared primitives, route adapters, and data-loading strategy that produce the source-faithful result without duplicating backend logic.
- Correct malformed export CSS and inaccessible or nonfunctional static markup while preserving the intended appearance.
- Choose local asset filenames and optimization formats.
- Add focused tests and visual QA tooling needed to prove route, state, and fidelity behavior.

## Deferred Ideas

- New visual directions not represented in the 47 exports.
- New product features beyond wiring the exported screens to capabilities already present in the Diana product scope.
- Desktop-first redesigns that alter the source mobile hierarchy.

</decisions>

<canonical_refs>

- `C:\Users\glcar\Downloads\dashboard_personalized (1).html`
- `C:\Users\glcar\Downloads\ai-tutor-app-html-2026-07-14-15-18\onboarding_welcome.html`
- `C:\Users\glcar\Downloads\ai-tutor-app-html-2026-07-14-15-18\onboarding_educational.html`
- `C:\Users\glcar\Downloads\ai-tutor-app-html-2026-07-14-15-18\onboarding_quiz_challenge.html`
- `C:\Users\glcar\Downloads\ai-tutor-app-html-2026-07-14-15-18\onboarding_quiz_schedule.html`
- All other HTML files in `C:\Users\glcar\Downloads\ai-tutor-app-html-2026-07-14-15-18`
</canonical_refs>

<specifics>

- The attached personalized dashboard differs materially from the similarly named file inside the 47-screen folder. The attached file wins for the student landing route.
- Source fidelity takes precedence over creative randomization and generic landing-page conventions.
- Existing business logic may be reused. Existing Nexus visual composition may not.

</specifics>

<scope_fence>

Phase 36 includes all 47 exported screens, route and interaction wiring, asset localization, visual comparison, automated checks, and launch-readiness verification. It does not authorize removing backend safety controls or inventing unrelated features.

</scope_fence>
