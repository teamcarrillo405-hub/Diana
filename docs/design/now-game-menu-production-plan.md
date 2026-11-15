# Now Game Menu Production Plan

Date: 2026-09-14
Status: Composition, scene/loop, and interaction preview accepted. Local production QA delivered with adaptive motion mitigation; physical-device, external/student validation, and live integration remain separate gates.
Scope: Now in the motion-review experience, followed by separately approved live integration.

2026-09-15 update: the user authorized replacing the environment and completing
the gamer visual finish autonomously. See [Now Studio Finish Plan](now-studio-finish-plan.md)
for the current direction and verification status. The background freeze and
older environment recommendation below are historical.

## 1. Decision And Standard

Finish one character-led menu experience, not another dashboard skin. Use UFC's character staging and Madden's disciplined information hierarchy as references, while retaining Diana's identity, existing environment, and truthful study workflow.

The production direction is a fixed-camera, layered 2.5D lobby. A cleanly composited character, authored shadows, matching light, controlled interface, and seamless idle are the required work. A rigged 3D character is not a prerequisite for this fixed-camera scope. Rotation, walking, outfit customization, and interactive camera controls are excluded.

There is no objective "AAA rating" conferred by this plan. The defensible target is comparable finish for this particular menu experience, demonstrated by reference comparisons, interaction tests, device evidence, independent review, and user acceptance. Passing code checks alone does not satisfy that target. Nor does an AI-generated numerical design score.

Do not call Now finished until its approved visual composition, motion, real Start-to-work-to-return behavior, and acceptance gates all pass. Approval of the preview alone is approval of the preview, not evidence that the live product is integrated.

## 2. Why The Previous Passes Have Not Closed The Gap

The current screenshot and source were reviewed independently for art direction, menu interaction, and production feasibility. Evidence is separated from proposals throughout this brief.

Observed in the current screenshot:

- The existing school environment has useful depth and can remain. Replacing it is not the first remedy.
- Diana's lighting and pale/cyan hair-edge contamination make her read as a separate photographic layer. Global filters and blurred ellipses do not establish convincing directional light and floor contact.
- The large bordered Start strip splits the assignment from its action and retains the appearance of a dashboard card.
- Weekly completion floats above the assignment instead of belonging to its information hierarchy.
- The queue looks like a detached footer. The relationship between assignment, action, and supporting information is weaker than in the supplied Madden reference.

Observed in source:

- Now takes the first supplied preview assignment. The preview is not proof of live priority ranking.
- Start opens a local review session. Notes and time survive returning within the mounted preview; this is not proof of reload-safe live persistence.
- Finishing a session and completing or submitting an assignment are different events. That distinction must remain.
- A hard-coded "Next step" remains in the noncompact preview branch. It must not enter the approved Now or live integration.
- The eight-second, 24fps motion export is about 0.83 MB at 564x1440. Transfer size alone is not the main issue; drawing that canvas at the source cadence touches about 19.5 million pixels per second before compositing overhead.
- The current clip route returns 404 outside development, reads the whole file per request, and disables caching. It already supports byte ranges, but is not a production delivery path.

The process failure was accepting isolated improvements without locking a complete reference frame and end-to-end acceptance contract. This plan replaces that open-ended process.

Review contributions: Kant inspected visual integration against the supplied game screenshots; Fermat inspected information hierarchy and the interaction/state contract; Popper inspected media delivery and production feasibility. Their read-only reviews were synthesized, not accepted indiscriminately: this brief preserves the user's approved continuous looping rather than a proposed one-shot alternative. Delivery feasibility does not waive the separate art-quality gate.

## 3. What Is Frozen

- Existing background image and architectural setting; approved Diana face, hair, proportions, outfit, and approachable expression.
- Continuous subtle idle, with explicit pause, visibility pause, and a still for reduced motion or playback problems. No new character acting or camera motion.
- Global navigation and the six desktop/tablet categories: Now, This Week, Upcoming, Check-In, Subjects, Milestones.
- At 761px and above, the category rail and selected stage. Below 761px, six separate light-frosted panels in the approved reading order.
- Pink selection, violet immediate action, mint completed work, amber decisions/errors, and non-violet subject colors.
- Student-confirmed submission, truthful assignment state, current priority rules, and existing wellness behavior.
- No XP, streaks, fake levels, invented task instructions, compulsory sound, controller-support project, or new game mechanics.

This brief supersedes earlier visual roadmaps only for the Now motion-review treatment. It does not authorize unrelated changes to the shared design system, other five stages, live Today, or public landing pages. Keep historical plans as records rather than treating their old palettes and layouts as current instructions.

## 4. The Final Composition

### One Spatial System

Produce one complete 1920x1080 master and adaptations at the user's actual 1134x822 viewport, 820x1180 tablet, and 390x844 phone. They are adaptations of one direction, not alternative concepts.

```text
Existing global navigation
-----------------------------------------------------------------
Category rail       Assignment briefing             Diana
                    Subject emblem and name         in the scene
NOW                 Full assignment title           matched light
THIS WEEK           Duration / due date              planted feet
UPCOMING            [Play  Start]                   floor contact
CHECK-IN
SUBJECTS            Weekly assignments: 5 / 8
MILESTONES          --------------------------------
                    Up next: assignment details
```

Desktop composition anchors for the master: rail within the left 3-17%, assignment area within 20-62%, and Diana within 68-97%. These are art-direction anchors, not rigid percentages to impose on every device. Briefing width is capped at 600px; maintain at least 24px of clear space between character silhouette and text or controls.

Diana and the background share one coordinate system. Lock the crop, perspective, head position, and floor contact before motion work. Do not scale or shift the character independently during interaction. At narrower tablet widths, reflow the briefing and reduce the character's allocated width; do not put text over her body or hide rail categories.

### Assignment And Action

Remove the large launch container's fill, border, blur, and enclosing padding. Put duration and due information immediately below the assignment title, then a standalone violet Start control on the same left edge. Frosted material remains in actual dialogs and supporting panels; this does not remove the product's frosted language.

Use one compact subject emblem, not a new illustrated task image. Start keeps its familiar Play icon, without adding a right arrow. No decorative bracket set, floating badges, or extra panels.

Place the compact weekly completion readout below Start, followed by the existing queue. These are secondary information, not competing headlines. Queue rows open assignment details; they do not silently reorder or start work. No additional statistics are added to fill the scene.

### Typography And Geometry

| Element | Starting specification to approve in the keyframe |
| --- | --- |
| Assignment title | Existing condensed display family; 52/56px at wide desktop, 48/52px at the current desktop, 40/44px tablet, 32/36px phone |
| Long assignment title | A measured smaller variant with wrapping; full title remains available, never clipped to fit a screenshot |
| Rail | 24/28px condensed bold; preserve stable row dimensions |
| Subject and metadata | 14/20px minimum; important supporting facts are not faint microcopy |
| Queue title | 16/22px; subject and time remain readable |
| Start | 168x48px on desktop, stable across Start/Resume/Opening/Retry; full width on phone |
| Other controls | At least 44px interaction targets; visible keyboard focus |
| Spacing | Subject to title 12px; title to metadata 12px; metadata to Start 16px; Start to weekly context 24px; queue gap 16px |
| Emblem and queue | 40px main emblem; queue rows at least 56px high, subtle separators, no enclosing cards |

Use zero letter spacing, no viewport-scaled font sizes, no hover-induced resizing, and the existing accessible-font preference. These values are locked by the approved keyframe; implementation must not quietly substitute a different system.

### Color And Material Contract

| Role | Rule |
| --- | --- |
| Selected category | Brand pink `#d9168d`, restrained painted marker; no flashing or repeated sweep |
| Immediate action | Violet `#8924f6`; only actual primary actions receive its filled treatment |
| Completion | Mint; informative, no ambient animation |
| Decisions and recoverable errors | Amber; no alarming red treatment |
| Subjects and planned work | Existing cyan/mint/amber/coral identities; neutral blue/graphite for planned work |
| Text and secondary surfaces | High-contrast neutral foregrounds, restrained rules, graphite frost where genuinely needed |

The existing image may contain violet architectural lighting. The color-role restriction applies to interface meaning; it does not turn every violet pixel in the environment into an action. Do not add decorative interface violet.

Author local scene-matched readability masks, not a uniformly darker page. Test contrast against the brightest and darkest frames behind each label. The school should remain visible as a place, without competing with the task.

## 5. Asset Production, Not More CSS Effects

Keep the original background source untouched. Author an editable composite with separate character, edge cleanup, light-wrap, contact shadow, directional cast shadow, subtle floor reflection, and readability-mask layers. Preserve realistic skin and distinct fabric/shoe materials. No glow outline, pedestal, artificial blur halo, or glossy coating over the whole character.

Deliverables:

1. One approved full-scene still at the master and adaptation sizes.
2. A cleaned transparent Diana still with color treatment matching the scene.
3. Matching grounded shadow/reflection layers and documented scene anchors.
4. One scene-matched idle, preferably reusing the approved footage if it passes; matching poster and reduced-motion fallback.
5. Optimized runtime exports, a higher-quality source master, and provenance for every modified asset.

Version approved assets and deliver them through production-capable static/CDN hosting with correct media headers, byte-range handling, and content-hashed caching. Keep source masters outside the runtime payload. Test a genuinely supported fallback on Safari and other target browsers rather than assuming one WebM path works identically everywhere. The existing development-only review endpoint remains a preview utility, not the production dependency.

The current background is approximately 1672x941. Exporting or enlarging it to 4K/8K does not create native detail or solve lighting, edge quality, perspective, or motion seams. Judge the assembled frame at its actual display size before requesting more resolution. Any change of environment or likeness is a separate scope decision.

Inspect hair, hands, face, jacket, and shoe edges at normal size and 200%. Inspect the existing idle before commissioning anything new. Three consecutive loops must show no visible seam, facial drift, sliding feet, matte flicker, or shadows moving independently of the character. Do not change approved motion to one-shot playback merely to conceal a seam.

Use local ComfyUI for any required iteration and a controlled compositor/Remotion pipeline for matching layers and timing. If deterministic compositing cannot meet the reference frame, the dependency is a skilled character/compositing artist, not another generic prompt or a larger CSS filter stack.

Higgsfield is optional final-source production, not a trial-and-error design process. No generation is authorized by this plan. Before a paid final call, present the exact model, duration, dimensions, references, output count, and total credits for separate approval. No paid exploratory variants or automatic retries. Zero-cost website generation also requires the repository's visible eligibility and final Generate-control checks.

## 6. Interaction Contract

All timing values below are proposed Diana budgets, not claims about UFC or Madden internals. Controls must respond immediately; animation cannot hold input hostage.

| State | Required behavior | Presentation |
| --- | --- | --- |
| Ready | Real supplied priority, complete title, due/time, one Start or Resume; no forced focus | Optional entry fade up to 180ms; usable from first render |
| Hover | Highlight only; no selection, content replacement, movement, or sound | Color/opacity up to 100ms |
| Keyboard focus | Distinct high-contrast outline; preserve tab/arrow/Home/End behavior | Immediate and silent |
| Category selection | Latest selection wins; inactive stages inert and hidden to assistive technology; Check-In stays mounted | Pink indicator up to 160ms; incoming content up to 180ms and 8px movement; no replay on same-tab activation |
| Queue inspection | Open existing task details; remember the invoking row | Up to 180ms, focus dialog heading; never launch on hover |
| Start / Resume | Capture task identity once, open the work/session destination, restore a valid snapshot for Resume | Immediate press feedback; one optional confirm cue; no artificial loading delay |
| Actual readiness wait | Suppress duplicate activation; retain task/meta; show Opening only for genuine waiting | Waiting label after 150ms; Retry/Back after 10s; cancel invalidates stale results |
| Session active | Existing notes, timer, pause, finish; background inert if modal; pause Diana | Correct focus containment; do not announce every timer tick |
| Return without finish | Preserve notes and elapsed/paused time; restore category, scroll, and exact initiating control | Up to 120ms exit; no replay of entrance; Resume label reflects real saved state |
| Timer reaches zero | Stop at zero; student still chooses Finish session | One polite announcement; no automatic assignment completion |
| Finish session | Record measured time once; assignment count/submission state do not change implicitly | Result up to 160ms; optional completion cue only after successful recording |
| Error / unavailable data | Amber localized recovery; never treat unavailable as empty or missing count as zero; preserve work | No shake, alarm, false success, infinite skeleton, or automatic resubmission |
| No work / complete | Different truthful states; no phantom task or Start; existing Add action remains available | Stable composition, no guilt language or automatic fanfare |
| Media problem | Approved still immediately usable; interface remains functional | No full-screen media gate or recurring restart cycle |

Continuous idle remains subtle and pausable. Pause while hidden, offscreen, or in a modal. Reduced motion uses the approved still and instant state changes. No camera sway, parallax, pulsing CTA, animated progress, or compulsory background sound.

Sound stays opt-in and off by default. Review the existing select/confirm/complete cues on speakers and headphones for a coherent, quiet identity. No hover/focus/loading/error sounds and no autoplay music. Suppress overlapping or repeated rapid cues. Audio failure never affects function.

## 7. Delivery Gates And Owners

| Gate | Owner role | Deliverable | Must pass before continuing |
| --- | --- | --- | --- |
| 0: Lock brief | Product owner + lead | This scoped brief, fixed reference screenshots, baseline captures, agreed target devices | No unresolved direction change; references and success criteria remain fixed |
| 1: Approve frame | Art direction + interface design | One fully assembled Now composition and responsive adaptations; long-title and empty examples | User approves hierarchy and scene integration, not a list of components |
| 2: Approve assets | Character/compositing production | Clean layered scene, matching still/idle/fallback, runtime export manifest | Likeness, edge quality, grounding, three-loop review, provenance, any spend approvals |
| 3: Build Now | Frontend + interaction engineering | Preview implementation matching frame, complete state table, scoped token contract | All specified states function; no lost inputs, false status, duplicate action, or layout regressions |
| 4: Verify finish | QA + independent reviewers + students | Device/performance evidence, reference comparison, usability findings | All hard gates below; user approval of rendered result |
| 5: Integrate and freeze | Product + application engineering | Separately approved live Now adapter and real-account regression evidence | Real Start/return, persistence and counters verified; no prototype-only claims; final user sign-off |

No redesign of the other five categories while Now remains unaccepted. Preserve their current functionality and run regressions where shared code is affected.

Owner roles describe required skills, not people already hired or reviews already performed. Frame and local prototype work can proceed with the current tooling after approval. External compositing help, a paid render, physical devices, independent reviewers, and student recruitment are explicit resource dependencies if needed. Scope and any cost must be agreed before committing them; this brief does not promise an unsupported completion date.

At each gate, correct a failed criterion rather than starting a new general polish pass. Allow one consolidated correction round and one retest. If the gate still fails, stop expansion and name the blocker, such as source-asset quality or unavailable physical-device evidence. A second round requires an explicit scope/resource decision. Do not lower the standard or call it done to close the loop.

## 8. Acceptance Evidence

### Art And Reference Comparison

- Compare the approved frame, the implemented frame, and the supplied UFC/Madden references at equivalent display sizes. Do not compare a polished render to a cropped low-resolution phone photograph without accounting for that limitation.
- Full assignment and Start are the first functional reading; navigation is obvious; weekly context and queue are secondary.
- No visible character matte fringe, floating feet, contradictory shadow direction, face deformation, or disconnected reflection.
- No overlapping text/character, clipped title/control, unexplained empty panel, or competing neon accent.
- The actual rendered page matches the approved frame, including font loading, spacing, crop, edge quality, and materials.
- Have two independent experienced UI/game-presentation reviewers inspect both the still and the interaction recording. AI agent reviews inform the plan; they do not substitute for external acceptance.

### Function And Accessibility

- Test typical, busy, empty, complete, unavailable, long-title, slow, error, interrupted, and resumed states.
- Test Start and Finish double activation, delayed launch cancellation, notes/time preservation, queue-to-session return, zero-time return, and retry after a real recording error.
- For live integration, confirm authenticated refresh/re-entry persistence through the existing product contract. Do not introduce a second local-only source of truth or silently mark work submitted.
- Confirm rail arrows/Home/End, focus restoration, dialog focus containment, inactive-panel semantics, Check-In persistence, 200% zoom, reduced motion, forced colors, and touch controls.
- Target WCAG AA text contrast: 4.5:1 ordinary text, 3:1 large text. Test interactive boundaries/focus separately. This accessibility standard is unrelated to the entertainment industry's "AAA" label. [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- Preserve pause/stop for ambient motion and a readable still experience. [Xbox motion guidance](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117)

### Devices And Performance

Capture desktop at 1920x1080, 1440x900, and the actual 1134x822 review viewport; tablet at 820x1180 and the 761px breakpoint; phone at 390x844 and 320px width. Check both sides of the mobile breakpoint.

At the current desktop and 1440x900, the normal fixture must show the full rail, primary assignment, duration/due, Start, weekly context, existing short queue, and Diana's head/feet without scrolling. Unusually long or numerous tasks may extend the page; readability takes precedence over forcing everything above the fold. On phones, Now's primary action is initially visible for the normal fixture; the other five panels follow in order.

Test a production build, not only the development server. Include a representative integrated-GPU Windows laptop, lower-cost Chromebook if supported, iPhone/Safari, and Android/Chrome. Use real devices for the claimed support set; browser emulation is supplementary. Record device, browser, viewport, network, and scenario for every result.

Proposed performance gates:

- Interface, title, and primary action appear independently of character-video readiness; the poster does not shift layout.
- Target good web-vitals thresholds: LCP <=2.5s, INP <=200ms, CLS <=0.1. Lab measurements are pre-release evidence; percentile claims require field data. These are web benchmarks, not EA specifications. [Web Vitals](https://web.dev/articles/vitals)
- Menu highlight begins within 100ms of input at the 95th percentile under the agreed test conditions. Transitions stay within the state table and do not drop or queue user actions.
- Proposed canvas draw budget is <=8ms at the 95th percentile on the reference laptop. Measure the whole rendering path as well; a fast draw call alone does not establish smooth presentation.
- Target 60fps menu transitions on the reference laptop, with a deliberate lower-cost/still fallback for devices that cannot sustain the media path. Inspect browser rendering, not just the video's decoded-frame counter.
- Run a ten-minute motion soak and repeated tab/session transitions. Require no increasing resource use, seam jump, tab-transition hitch, unrecovered blank character, or duplicate media activity after pause/hide.
- Record actual transfer size and CPU/GPU cost, then set the runtime export budget from measurements before asset acceptance. Do not ship an 8K decode simply because an 8K master exists.

### Student Validation

Use eight target-age students as a formative sample: four familiar with sports-game menus, four less familiar, including at least two who use reading or attention supports. This small sample is not evidence that all teenagers will prefer the design.

Counterbalance current and proposed functional builds with identical tasks, Diana, and background. Begin sound-off. Test task recognition before showing the reference images to avoid priming answers.

Proposed pass criteria:

- At least 7/8 identify the primary assignment and Start in five seconds.
- At least 7/8 locate due/time/weekly context within ten seconds and complete Start, return/resume, and queue inspection without coaching.
- All 8 distinguish session finished, assignment completed, and work submitted. Any ambiguity here requires a fix, not an average score.
- At least 6/8 prefer the proposed menu finish, with clarity no worse than the current version.
- Ask students and independent reviewers what specifically feels unfinished relative to the references. A repeated issue in identity, grounding, legibility, or responsiveness blocks visual sign-off even when preference passes.

These thresholds are proposed product acceptance criteria, not a scientific certification of AAA parity. User approval is still required. No aggregate score can hide lost work, inaccessible controls, misleading submission status, or obvious compositing defects.

## 9. Live Integration Boundaries

The review route currently uses sample data and a local session. A production handoff must explicitly connect the accepted Now view to the existing priority scorer, real assignment identifiers, weekly counts, real work route, and persisted session state. Preserve authorization and the `done != submitted` lifecycle.

Keep preview fixtures for state verification. Use a thin adapter to existing product data/actions rather than inventing parallel business logic in the visual component. Retain existing rollback behavior until the live version is accepted; do not delete older routes or broaden cleanup under this plan.

Introduce the accepted live integration behind a scoped feature flag. Exercise the off-path and rollback before release, without reverting unrelated work. A successful preview test is not permission to switch the flag for all students.

Primary implementation areas, to confirm at execution:

- `app/landing-3d/today-preview/today-now-proof.tsx` and its styles: briefing, action, hierarchy, queue, truthful empty states.
- `today-lobby-review.module.css`: scoped composition and current approved color-role contract.
- `diana-idle-character.tsx` and its styles: approved exports, synchronized scene geometry, pause/fallback behavior.
- `today-session-preview.tsx`, `today-design-preview.tsx`, and `use-menu-audio.ts`: state contract and interaction evidence.
- `components/dashboard/today-stage-layout.tsx`: shared behavior regression only unless a specific fix is required.
- `components/dashboard/today-dashboard.tsx`: separate live integration gate, not an automatic preview promotion.

The repository has substantial unrelated work in progress. Preserve it. Do not perform global token migration, package upgrades, route deletion, or asset replacement outside the approved scope.

## 10. Reference Basis And Claim Policy

The supplied UFC character menu demonstrates character-first staging and clear category selection. The supplied Madden Objectives screen demonstrates a dominant central task with ordered secondary information. The COD lobby is a supporting scene-coherence reference, not a direction to add combat styling or interface density.

EA's UFC presentation notes discuss character likeness, lighting, cameras, and audio as coordinated production disciplines. My inference is that matching this level of finish requires a coordinated scene/interaction package, not merely additional effects. [EA UFC 5 presentation](https://www.ea.com/games/ufc/ufc-5/news/ufc-5-presentation)

Madden's Franchise Hub brings important actions into a central surface, opens their dedicated flow, and returns the player to the hub. The relevant lesson for Diana is a coherent select/start/return journey with updated truthful state, not automatic completion or a copy of sports mechanics. [EA Madden Franchise Hub](https://help.ea.com/en/articles/madden-nfl/franchise-hub/)

Allowed status language:

- Before gates pass: "Now is being finished against UFC/Madden menu references."
- After preview visual gates pass: "The Now preview meets the approved game-menu visual brief. Live integration remains separate."
- After all gates and user acceptance: "Now is production-polished and validated against the agreed game-menu benchmarks."

Do not claim an official AAA rating, guaranteed teenage appeal, equivalence to an entire UFC/Madden game, or acceptance of the rest of Today from this one menu review.

## Composition Handoff (2026-09-14)

The isolated `/landing-3d/today-now-composition` review now implements the Gate 1 keyframe and responsive adaptations using existing preview components. It does not alter live Today or the existing motion-review default. The composition is ready for the user's decision, not approved on their behalf.

Evidence and limitations are recorded in `artifacts/today-now-composition/README.md`. The unframed assignment, standalone Start, secondary hierarchy, long-title/empty states, and responsive reading order are delivered. One attempted generated cutout cleanup was rejected and not installed. Final hair-matte cleanup, relighting and motion-matched asset integration remain Gate 2 work.

Approve this rendered composition before further art production, broader interaction implementation, or any paid final render. This is a bounded approval gate, not a new whole-dashboard redesign.

## Asset Candidate Handoff (2026-09-14)

Following the user's instruction to continue, Gate 2 asset production is available
at `/landing-3d/today-now-assets`. The approved composition is preserved. Local
matte processing, shared scene grading, frame-driven floor projections, optimized
static exports, and focused regression checks are recorded in
`artifacts/today-now-assets/README.md` and `asset-manifest.json`.

The matching-poster choice is implemented following the user's instruction to
continue. Both screen sizes now use the animation-frame poster and matching floor
anchors for Still, loading, reduced motion, and fallback. 63 focused checks pass;
three complete continuous cycles are recorded in the asset evidence. Independent
source re-review passes. The user subsequently approved the assembled scene and
loop and instructed continuation to Gate 3. This records user acceptance, not an
external artistic or performance certification.

No paid generation, live promotion, new environment, or character
redesign occurred. The candidate does not establish a seamless loop, physical-device
performance, external art approval, or an AAA rating.

## Interaction Handoff (2026-09-14)

Gate 3 is implemented in the same `/landing-3d/today-now-assets` review. The scene,
assets, background, navigation, phone reading order, and other category designs
are unchanged. Start/Resume, measured-time and notes preservation, original-control
focus return, cancellable readiness, bounded recording/retry, and truthful counts
are covered by `artifacts/today-now-interactions/README.md`.

217 relevant tests pass, including timer/audio regressions, parent interaction
flows, two sessions on the same assignment, cancellation, deadline-boundary
receipts, and keyboard edge cases. Independent scoped source review passes after
corrections. Browser checks include native Tab boundaries, first-Tab from a dialog
heading, Escape, queue-to-slow-launch cancellation, return/Resume, and recording
error/retry at desktop and phone widths.

This remains a sample-data preview. Gate 4 production-build/device/performance
and external/student review evidence has not been completed. Gate 5 live-account
persistence and integration are not promoted by this pass. The repository-wide
tone audit still reports 33 existing violations in unrelated candidate/reference
documents, with no blocking violations in the changed interaction code.

## Local Production QA Handoff (2026-09-14)

Following interaction approval, the local Gate 4 engineering pass is recorded in
`artifacts/today-now-performance/README.md`. An isolated loopback-only production
build, motion stall/transparent-frame recovery, breakpoint focus correction, 267
focused tests, a 621-second baseline soak, and repeated pointer/keyboard/session
checks are delivered. Ordinary production still denies this review route.

A constrained-network check identified the original 1.99 MB background as a
loading bottleneck. A 232 KB WebP copy retains the same scene and dimensions;
the original remains untouched. Only the asset review opts in. Three corrected
8 Mbps/150 ms cold loads measured LCP 1.344-1.484 seconds, versus 4.292 seconds
before correction. Final render inspection and source review passed. The full
soak predates that delivery-only correction; the evidence report separates builds.

This is not full Gate 4 acceptance: physical student devices, external game/UI
reviewers, student testing, native-size capture/zoom gaps, and GPU/presentation
evidence remain. Gate 5 live integration is not authorized by this local QA pass.
The normal build's unrelated guardian-file lint issue is disclosed; scoped lint
and normal TypeScript checks pass, with the diagnostic production build using
`--no-lint`. No paid generation, redesign, live promotion, or deployment occurred.

The first final synthetic 4x-CPU check exceeded the draw budget (p95 13.5 ms) and
dropped nine decoded frames over 84 seconds. The follow-up adaptive-motion build
mitigated that lab issue by switching the floor to a static scene-matched layer
while Diana stayed animated: p95 frame work 8.9 ms, zero dropped decoded frames in
the short constrained probe. This is still not a physical-device result. Use the
next gate to validate actual student hardware and phones; do not start another
general visual redesign or claim all-device readiness.
