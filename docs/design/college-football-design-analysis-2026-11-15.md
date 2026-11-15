# Diana: College Football design analysis

Date: 2026-11-15  
Status: Source-grounded review with fresh local desktop and mobile verification

## Verdict

The recovered Lobby provides a strong game-menu foundation. It does not yet deliver a distinctive college-inspired academic environment, and its achievement system conflicts with the requested theme without gamification. Preserve the cinematic composition and task hierarchy. Develop the campus identity and remove reward mechanics in a separate, deliberate implementation.

## Evidence and limits

Reviewed the recovered program from commit `f5aca1d1078c64915d58a278422688a84e091507`, including `components/dashboard/today-dashboard.tsx`, the lobby modules and styles, and `lib/dashboard/achievements.ts`. This implementation places the Lobby in the authenticated dashboard, with Now, Progress and Achievements sections, real assignment actions, a character, an environment and motion controls. Recovery and integration are separate from design acceptance.

The inspected local image, `artifacts/today-graphics-fidelity/diana-signature-desktop.png`, is a historical design preview with sample data. It establishes the visual direction, but does not prove the current authenticated dashboard, production deployment or restored interactions. Its navigation and contents must not be presented as a fresh runtime capture.

Official references inspected:

- [College Football 27 Dynasty deep dive](https://www.ea.com/games/ea-sports-college-football/college-football-27/news/college-football-27-dynasty), including its Florida Dynasty hub image.
- [College Football 27 presentation deep dive](https://www.ea.com/games/ea-sports-college-football/college-football-27/news/college-football-27-presentation), including its Clemson main menu image.
- [Madden NFL 27 Franchise guide](https://help.ea.com/en/articles/madden-nfl/madden-franchise-mode/) for mode structure. The older [Madden NFL 26 Franchise deep dive](https://www.ea.com/games/madden-nfl/madden-nfl-26/news/madden-26-gridiron-notes-franchise-deep-dive) supplies the inspected Coach Central visual comparator.

The College Football images are official published development captures marked “not final.” They are useful visual references, not verification of final retail screens. The translation below is a design recommendation for Diana, not an EA specification.

## What makes the reference distinctive

The College Football Dynasty hub combines a selected action block, weekly context, a prominent person, team identity and an editorial story region. Its layered school-colored graphics and varsity typography make the screen recognizable before individual labels are read. The Clemson main menu instead builds navigation into a physical team desk and miniature scene, using coherent materials and school artifacts.

Diana should borrow that deliberate composition and sense of belonging. The existing graphite lounge, luminous architectural fins and Diana character provide production value, but suggest a premium technology lobby. They do not yet establish an academic campus identity. Adding footballs, stadium backgrounds or more neon would not resolve that gap.

Madden's weekly management structure is useful for organizing decisions. Its XP, unlocks and career rewards are unsuitable for this brief.

## Retain and change

| Element | Retain | Change |
| --- | --- | --- |
| Dashboard structure | Left navigation, one dominant task, one primary action | Keep date, course, expected time and due context subordinate to the task |
| Typography | Saira Condensed display hierarchy and readable body text | Add an original collegiate wordmark or limited identity treatment; avoid varsity styling on paragraphs |
| Palette | Pink selection, violet action, mint completion and amber attention | Define consistent semantic roles across every route; do not recolor everything sports green |
| Environment | Authored spatial depth and consistent lighting | Develop one original campus study-room or academic clubhouse scene, with paper, fabric, architectural signage and restrained course artifacts |
| Character | Recognizable Diana guide and existing motion controls | Keep her optional and quiet; reduce visual prominence during reading, writing and detailed planning |
| Progress | Actual completed work and saved study minutes | Replace achievement rewards with a factual work history, if a third section is needed |
| Supporting routes | Existing real academic terminology | Carry the same typography, selection treatment and course identity into Work, Classes and Calendar without repeating the large character everywhere |

The recovered `lobby-achievements.tsx` contains a weekly trophy, earned states, lifetime badges and a collection count. `lib/dashboard/achievements.ts` applies completion thresholds. These are reward mechanics, not merely decoration. Removing them from the experience must preserve real assignment and study history; database deletion is not required to meet the visual brief.

## Prioritized implementation scope

1. **P0: Establish the actual baseline.** Capture the restored authenticated dashboard and record its commit. Exercise Now, Progress, assignment actions and narrow layouts. Resolve functional recovery issues before judging polish.
2. **P1: Meet the nongamified brief.** Remove trophy, badge, earned-collection and unlock presentation. Preserve factual progress. Decide whether a factual History section earns its place or whether two sections are clearer.
3. **P1: Define original campus identity.** Approve one environment, original emblem/wordmark, material language and typography treatment. Keep the current recognizable palette. Do not reuse EA assets as product graphics.
4. **P2: Unify the working application.** Apply shared navigation, task hierarchy, selection, focus and status treatments across core academic routes. Preserve readable workspaces.
5. **P2: Refine compositing and motion.** Align character scale, contact shadow and lighting. Keep transitions short and purposeful, with stable text and a usable still-image fallback.

## Acceptance tests

- Every displayed counter maps to actual assignments, time or dates. No points, levels, ranks, reward thresholds, badges, trophy collections or competitive standings appear.
- Completing work updates factual status. It does not unlock features or award an object. Submission remains an explicit student-confirmed action.
- The next task, selected destination and primary action are identifiable without waiting for animation.
- Keyboard focus is visible; touch controls remain usable; selection does not depend on color alone.
- Motion can be paused. Reduced-motion preference yields a complete, readable experience without autoplay-dependent information.
- Long assignment names, empty schedules, loading and unavailable data remain legible without invented progress.
- At narrow widths, task information and actions retain priority over character artwork.
- Core routes visibly belong to the same product, while reading and writing surfaces remain calm.

## Fresh runtime observations

Verified locally on November 15 against the restored `f5aca1d1` product snapshot plus the current integration fixes, based on integration commit `63787d2c`. A separate synthetic student account supplied the data. Its assignment is dated September 15, so the November week correctly shows no planned assignments; these are test records, not student outcome evidence.

- Desktop at 1440 x 900: the actual Lobby renders the graphite studio, animated Diana, pink selected menu and violet Start action. Now, Progress and Achievements switch successfully. Work, assignment workspace, Classes and Calendar all load through their visible navigation. Starting the sample assignment returns to a Resume action.
- Mobile at 390 x 844: no horizontal page overflow or broken images were observed. Now, Progress and Achievements become a vertical stack. The character scene consumes roughly the top third before the task card, so the next design should give the task earlier priority. The pale cards also create a different visual treatment from the desktop overlay.
- The live Achievements screen confirms the brief conflict: a weekly Diana Award, six lifetime badges and completion thresholds. Restoring this code does not establish acceptance of these mechanics.
- The workspace presents section navigation, source context, a writing surface and the tutor separately. Preserve that reading comfort when extending the visual theme. Calendar and Classes retain recognizable condensed headings and the common navigation.
- No browser console errors were captured during the inspected flow. This is a targeted navigation and visual check, not an AI-provider or full accessibility certification.

Screenshots: [desktop Lobby](evidence/restored-lobby-2026-11-15.png), [mobile Lobby](evidence/restored-lobby-mobile-2026-11-15.png). Additional local evidence for Progress, Achievements, Work, workspace, Classes and Calendar is under `.gstack/design-recovery-20261115/`.

Additional copy review: the recovered landing-editor defaults contain athlete-specific positioning and numerical GPA/time-saving claims. Those claims need evidence or removal before that editable variant is published. They do not provide a basis for the college-inspired design direction.
