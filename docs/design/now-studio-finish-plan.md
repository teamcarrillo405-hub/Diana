# Now: Studio Finish Plan

Date: 2026-09-15
Status: Now preview implementation and local verification complete

## Outcome

Make Now feel like an original premium character lobby, using the supplied UFC
character-menu and Madden objectives screenshots as visual references. The user
has authorized replacing the school background and carrying out the remaining
design work autonomously. This supersedes the old background freeze in
`now-game-menu-production-plan.md`.

The deliverable is the working Now asset-review route. Visual comparison,
interaction quality, accessibility and runtime checks each need their own
evidence. Passing automated tests alone does not establish Madden/UFC parity.

## Specialist Review

Three independent AI specialist reviews were delivered before implementation:

- Godel, game interface art direction: corridor competes with the assignment;
  inconsistent brush, emblem, button and progress geometry; strengthen grouping.
- McClintock, interaction/accessibility: restore disabled stage choreography;
  pending feedback; expose resumable queue sessions; distinguish launch/return
  sound; keep motion fallback announcements available with the tray closed.
- Cicero, character compositing: match the environment to the approved character;
  use a satin floor; derive fallback shoe contacts from the actual pose anchors;
  retain adaptive motion; preserve the background in asset publishing.

These are AI design reviews, not external studio endorsements.

## 1. Environment And Atmosphere

- [x] Inspect the current rendered screen and supplied game references.
- [x] Create one original environment direction: Diana's backstage studio.
- [x] Integrate the new source as an optimized, versioned runtime asset.
- [x] Anchor the background and character to one scene-height contract.
- [x] Verify crop and floor placement at desktop, laptop and tablet sizes.

Use graphite architecture, smoked glass, brushed metal, a satin stone floor and
restrained cyan/warm practical lighting. Keep the left text area quiet; place
depth and material detail behind Diana on the right. No school props or
assignment-specific illustration. The approved character is the focal point.
Atmosphere comes from physical light and materials. The camera stays fixed.

Production: built-in image generation for the new original still; preserve the
source and prompt. Encode a WebP without enlarging it or claiming native 4K/8K.
Higgsfield credit rules still apply to any future paid final render.

## 2. Character Integration

- [x] Preserve approved face, outfit, proportions, loop and matching poster.
- [x] Correct fallback contact shadows using the real portrait shoe anchors.
- [x] Use the same display grade for still and motion if a correction is needed.
- [x] Subdue reflection on the satin floor and preserve adaptive floor/still modes.
- [x] Inspect the assembled still and at least three complete loops.

Do not increase Diana's apparent resolution by relabeling an enlarged export.
The current motion source is 564 x 1440. Judge edges and lighting at display size.
Separate contact shadows from the broad cast shadow; neither should look like a
floating platform. Keep seams, furniture and bright strips out from under shoes.

## 3. Menu Composition

- [x] Keep the assignment title unframed and visually dominant.
- [x] Give Now selection a restrained pink paint swipe with a solid text area.
- [x] Match subject emblem, Start and supporting rows to one edge language.
- [x] Increase Start to a stable 224 x 56px desktop action with condensed type.
- [x] Align weekly progress and queue as a compact lower information group.
- [x] Preserve full titles and metadata in busy, empty, complete and unavailable states.

Desktop anchors: category rail on the left, assignment in the middle-left, Diana
near the right fifth of the frame. Use 48-56px display headings on desktop,
explicit smaller sizes on tablet, and a readable text face for facts. No
viewport-scaled fonts. Metadata remains at least 14px on desktop. Minimum
character-to-content clearance: 24px; aim for 48px at wide sizes.

Color roles: pink selected category; violet primary actions; mint completion;
amber near-term decisions and recoverable errors; cyan/mint/amber/coral subjects.
White and graphite carry most of the interface. Environmental light is secondary.

## 4. Interaction Finish

- [x] Immediate category state and keyboard focus; indicator settles in 160ms.
- [x] Heading/action/support reveal finishes within 240ms, with at most 6px travel.
- [x] Start has pending semantics and clear press feedback without invented delay.
- [x] Returning restores the exact initiating control and highlights it briefly.
- [x] Queue shows preserved session time without changing the priority assignment.
- [x] Opt-in selection, details, launch, return and completion sound identities.
- [x] Motion status remains accessible outside the closed review tray.

Reduced motion uses the matching still and instant transitions. Sound starts off.
There are no hover sounds, repeating glow effects or ambient particles. All six
categories remain mounted so Check-In input survives selection changes. Existing
Start, queue details, notes, timer, retry and explicit completion semantics remain.

## 5. Responsive And State Finish

- [x] Native captures: 1920x1080, 1440x900, 1134x822, 820x1180 and 761px.
- [x] Mobile captures: 760px, 390x844 and 320px, with six separate panels in order.
- [x] Verify title length, empty, complete, unavailable and resumed states.
- [x] Verify keyboard navigation, focus return, reduced motion and hidden panels.
- [x] Verify sound mute, Diana pause, fallback and asset loads.

The normal laptop view must expose Now, full assignment, due/time, Start, weekly
progress, short queue and Diana's full figure. Long content may scroll rather than
clip. Mobile keeps the approved frosted panels and readable first action.

## 6. Verification And Handoff

- [x] Focused tests for modified state and accessibility contracts.
- [x] Typecheck and scoped lint.
- [x] Production build and browser verification of the final runtime.
- [x] Native-size before/after captures and independent second visual review.
- [x] Correct concrete review findings and leave the reviewed page open.

Visual stopping criteria: no collision, clipped content, visible matte fringe,
floating contacts, competing neon, arbitrary empty panel, obvious loop hitch or
unresponsive control in the tested environment. Look at the actual rendered
composition alongside the references; do not award an invented AAA score.

## Final Local Results

- 299 focused tests across 17 files passed; TypeScript and scoped ESLint passed.
- Optimized local production build passed; the route returned HTTP 200 on 3014.
- Ten viewport/motion cases passed with no horizontal overflow or page errors.
- Keyboard End/Home/ArrowDown, hidden-stage semantics, Check-In preservation,
  stable Start/Resume dimensions, session notes and paused queue state passed.
- Three complete idle loops: 708 decoded video frames, zero dropped video frames
  in this run. Canvas was nonblank. Pause/resume and reduced motion passed.
- Menu sound started off, enabled explicitly and muted successfully. Cue synthesis,
  cancellation and unavailable-context behavior are also covered by unit tests.
- Final independent art review found no remaining blocking composition defect in
  five corrected captures. It judged the result a coherent character-led game
  menu, closer to the supplied UFC composition than Madden's denser objectives.

Evidence index: `../../artifacts/today-studio-finish/README.md`.
Review URL: `http://127.0.0.1:3014/landing-3d/today-now-assets`.

## Remaining Evidence Beyond Local Implementation

Physical-device performance, student preference testing and external experienced
game-UI review cannot be fabricated by local browser checks. Record any remaining
source-quality limitation explicitly. Live-account integration and rollout remain
separate from this design-preview work.

Before promoting this design to student accounts:

1. Run on the target low/mid-range Chromebook, Windows laptop, iPad and phone.
   Check sustained playback, touch behavior, memory and fallback rather than
   extrapolating from desktop browser emulation. Keep still mode available.
2. Review on a native 4K display if that is a release target. The new environment
   is natively 1672 x 941 and the approved motion source is 564 x 1440. Neither is
   claimed as native 4K/8K. A higher-resolution replacement must preserve this
   composition; any paid Higgsfield final requires its own exact-cost approval.
3. Have representative students compare the menu with the supplied game references
   and complete Start, return, queue selection and Check-In tasks. Record where
   they hesitate and whether the style actually meets their expectations.
4. Obtain an experienced external game-UI review if Madden/UFC equivalence will be
   used as a public claim. AI specialist assessment is not studio certification.
5. Integrate the accepted visual system with authenticated live data in a separate
   scoped rollout. Verify real assignment actions and completion/submission states;
   do not expose sample data or local review controls in the student product.
