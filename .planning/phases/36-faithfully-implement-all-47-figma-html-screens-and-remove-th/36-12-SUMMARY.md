---
phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th
plan: "12"
subsystem: ui
tags: [screendesign, writing, notes, tutor, ai-safety, playwright]

requires:
  - phase: 36-03
    provides: Deterministic source capture, application visual, navigation, and fixture harness
  - phase: 36-04
    provides: Source-faithful viewport and five-destination navigation primitives
  - phase: 36-08
    provides: Owner-scoped assignment detail and authenticated assignment actions
provides:
  - Source-faithful Writing Coach with explicit student acceptance and persisted authorship evidence
  - Owner-scoped Notes Surface with direct editing, saving, and supported study tools
  - Authenticated Tutor Chat using the controlled study-buddy backend seam
  - Three reviewed 393x852 application goldens
affects:
  - phase-36-screen-implementation
  - phase-36-obsolete-visual-removal
  - phase-36-release-validation

tech-stack:
  added: []
  patterns:
    - Effective AI mode is derived from owner-scoped assignment and class records at the server boundary
    - Generated writing remains separate from the student draft until explicit acceptance
    - Browser chat calls only the authenticated application route and never a provider directly

key-files:
  created:
    - components/screen-design/ai-writing-coach.tsx
    - components/screen-design/ai-writing-coach.test.tsx
    - app/(app)/notes/[id]/note-detail.test.tsx
    - app/(app)/study-buddy/study-buddy-client.test.tsx
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/ai-writing-coach.png
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/notes-surface.png
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/tutor-chat.png
  modified:
    - app/(app)/assignments/[id]/ai-tools-actions.ts
    - app/(app)/assignments/[id]/page.tsx
    - app/(app)/notes/[id]/note-detail.tsx
    - app/(app)/notes/[id]/page.tsx
    - app/(app)/study-buddy/page.tsx
    - app/(app)/study-buddy/study-buddy-client.tsx
    - app/api/diana/study-buddy/route.ts
    - app/screendesign.css
    - lib/ai/safety.ts
    - lib/qa/grayson-demo.ts
    - lib/qa/screendesign-fixtures.ts
    - supabase/functions/_shared/safety.ts

key-decisions:
  - "Writing feedback never replaces the student's draft implicitly. The accepted suggestion action is the only path that persists generated text into saved_work."
  - "The Notes Surface keeps the source composition in the first mobile viewport while supported transcript, TTS, flashcard, outline, visual, related-note, and delete tools remain connected below it."
  - "Tutor Chat uses only /api/diana/study-buddy, where authentication, owner-scoped class policy, daily budget, request limits, safety prompts, interaction logs, authorship logs, and token accounting are enforced."

requirements-completed: [P36-FIDELITY, P36-OPERATIONS, P36-QA]

coverage:
  - id: D1
    description: "Writing Coach preserves the student's draft, derives effective AI policy server-side, and persists generated writing only after explicit student acceptance with authorship evidence."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "components/screen-design/ai-writing-coach.test.tsx and lib/ai/safety.test.ts"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts ai-writing-coach"
        status: pass
    human_judgment: false
  - id: D2
    description: "Notes Surface loads and saves the authenticated owner's real note and retains the supported TTS, transcript, outline, flashcard, visual, related-note, and delete operations."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "app/(app)/notes/[id]/note-detail.test.tsx"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts notes-surface save and reload"
        status: pass
    human_judgment: false
  - id: D3
    description: "Tutor Chat submits through the authenticated controlled backend with class traffic-light, budget, minor-safety, interaction, authorship, and token-accounting controls."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "app/(app)/study-buddy/study-buddy-client.test.tsx, lib/ai/safety.test.ts, and lib/integrations/diana-study-helper-sidecar.test.ts"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts tutor-chat authenticated submit"
        status: pass
    human_judgment: false
  - id: D4
    description: "Writing Coach, Notes Surface, and Tutor Chat preserve their canonical ScreenDesign compositions at 393x852 without Nexus presentation leakage."
    requirement: P36-FIDELITY
    verification:
      - kind: automated_ui
        ref: "tests/screendesign-visual.spec.ts for ai-writing-coach, notes-surface, and tutor-chat"
        status: pass
      - kind: other
        ref: "manual normalized source and application capture review at 393x852"
        status: pass
    human_judgment: true
    rationale: "Final source fidelity approval includes visual judgment after deterministic source and application captures."
  - id: D5
    description: "All three learning-support surfaces pass exact mobile visual and primary-action checks, safe larger viewports, calm-language audit, static analysis, production build, complete unit suite, and live runtime verification."
    requirement: P36-QA
    verification:
      - kind: automated_ui
        ref: "Playwright mobile, tablet, and desktop gates for all three plan-owned screens"
        status: pass
      - kind: other
        ref: "npm run typecheck; npm run lint; npm run tone-audit; npm run build; npm run test:run; HTTP 200 runtime check"
        status: pass
    human_judgment: false

duration: 48 min
completed: 2026-07-15
status: complete
---

# Phase 36 Plan 12: Learning Support Surfaces Summary

**Writing Coach, Notes Surface, and Tutor Chat now reproduce their canonical ScreenDesign compositions while keeping student content behind authenticated, owner-scoped persistence and AI controls.**

## Performance

- **Duration:** 48 min
- **Completed:** 2026-07-15
- **Tasks:** 3
- **Files modified:** 19

## Accomplishments

- Rebuilt `/assignments/[id]` in its `writing-coach` state as the canonical split editor and feedback surface using real draft and response data.
- Made suggestion acceptance explicit, persisted accepted work into `assignments.saved_work`, and recorded student-confirmed authorship evidence.
- Rebuilt `/notes/[id]` as the canonical Notes Surface with an owner-scoped editable note and a verified save and reload path.
- Rebuilt `/study-buddy` as the canonical Tutor Chat while preserving the authenticated server route, sidecar safety composition, traffic-light policy, daily limits, logging, and token accounting.
- Approved exact 393x852 goldens for all three plan-owned screens after normalized source and application review.

## Task Commits

1. **Define learning-surface interaction contracts** - `5b9fd5e`
2. **Rebuild learning-support surfaces** - `fe23860`
3. **Approve learning-surface goldens** - `33f07c4`

## Routes and Boundaries

- `/assignments/[id]` with `writing-coach` state owns Writing Coach. Writing requests and acceptance use authenticated server actions, and client-provided AI mode is not trusted.
- `/notes/[id]` owns Notes Surface. Note, class, and related-note reads are explicitly owner-scoped and saving uses the existing server action.
- `/study-buddy` owns Tutor Chat. The client calls only `/api/diana/study-buddy`; no provider credential or provider request enters browser code.

## Decisions Made

- Kept generated writing outside the draft until the student selects the explicit accept action.
- Preserved the source Notes Surface in the first 393x852 viewport and placed supported connected tools below the source composition.
- Enabled deterministic tutor output only for non-production QA servers with `QA_CREATE_USER=true` and the exact typed scenario `tutor-chat:default`.
- Used the existing controlled study-helper sidecar and extended server accounting instead of adding a second AI path.

## Deviations from Plan

- The configured Playwright snapshot template stores approved goldens under `tests/__screenshots__/...` rather than the generic snapshot paths listed in the plan.
- A dedicated QA-enabled server on port 3012 was required because the existing development process did not have deterministic QA seeding enabled.
- Tablet and desktop checks were rerun sequentially because parallel projects reset the same synthetic owner fixture. Both sequential runs passed all three screens.
- The broad Phase 36 requirement prose remains open until every plan is complete. This summary records Plan 36-12 coverage without falsely closing the phase-wide requirements.

## Issues Encountered

- The first Writing Coach visual pass exposed a vertical composition that differed from the source. The implementation was corrected to the source's 55/45 editor and feedback columns before golden approval.
- Building while the QA development server was active invalidated its development cache. The dedicated listener was safely restarted and `/login` returned HTTP 200 afterward.
- Tone audit reports one pre-existing nonblocking advisory for `deadline` in `app/(app)/assignments/page.tsx`, outside this plan.

## Known Stubs

None in the plan-owned routes. Missing content renders honestly, provider calls remain server-controlled, and every primary action in this plan has verified behavior.

## Verification

- Component and safety focus gate: 5 files and 14 tests passed.
- Mobile exact visual gate: 3 of 3 passed against the approved 393x852 goldens.
- Primary action and navigation gate: 3 of 3 passed for writing guidance, note save and reload, and authenticated tutor submit.
- Tablet responsive gate: 3 of 3 passed sequentially.
- Desktop responsive gate: 3 of 3 passed sequentially.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run tone-audit` passed with one unrelated advisory.
- `npm run build` passed.
- `npm run test:run` passed with 160 files and 886 tests.
- Live runtime: `http://127.0.0.1:3012/login` returned HTTP 200 after the post-build restart.

## User Setup Required

None for the source-faithful local surfaces. Production tutor responses still require the already-configured controlled server provider and database environment.

## Next Phase Readiness

- Plan 36-12 is complete and ready for the remaining interaction-matrix, obsolete-visual-removal, and release-validation plans.
- The three plan-owned routes render ScreenDesign-owned compositions without Nexus components.
- Plan 36-23 remains responsible for deleting obsolete presentation files after every canonical replacement is verified.

## Self-Check: PASSED

- All plan-owned implementation, tests, fixture updates, and three golden files exist.
- All three atomic task commits exist in Git history.
- Focused, responsive, static-analysis, production-build, complete-suite, and live-runtime gates passed.
- The plan-owned routes use the canonical ScreenDesign presentation and controlled application boundaries.

---
*Phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th*
*Completed: 2026-07-15*
