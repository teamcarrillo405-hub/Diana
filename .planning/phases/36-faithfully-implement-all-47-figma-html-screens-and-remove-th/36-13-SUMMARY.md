---
phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th
plan: "13"
subsystem: ui
tags: [screendesign, flashcards, fsrs, study-artifacts, practice, playwright]

requires:
  - phase: 36-03
    provides: Deterministic source capture, app visual, navigation, and fixture harness
  - phase: 36-04
    provides: Source-faithful viewport and local ScreenDesign media primitives
provides:
  - Source-faithful flashcard review backed by the published FSRS scheduler and real review writes
  - Owner-scoped Study Lab backed by existing AI policy, token budget, authorship, and task-signal seams
  - Durable practice-test responses and progress without fabricated scoring
  - Three reviewed 393x852 application goldens
affects:
  - phase-36-screen-implementation
  - phase-36-obsolete-visual-removal
  - phase-36-release-validation

tech-stack:
  added: []
  patterns:
    - Direct owner-scoped review routes honor the requested card while the remainder of the session stays due-only
    - Practice progress is merged into the existing artifact payload so generated material and truthful score state are preserved
    - Keyboard visual checks reset focus-driven scroll before deterministic evidence capture

key-files:
  created:
    - app/(app)/study-artifacts/[id]/practice-session.tsx
    - lib/study-helper/practice-progress.ts
    - lib/study-helper/practice-progress.test.ts
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/flashcards-review.png
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/study-artifacts-hub.png
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/practice-test-session.png
  modified:
    - app/(app)/flashcards/[id]/review/page.tsx
    - app/(app)/flashcards/[id]/review/review-session.tsx
    - app/(app)/study-artifacts/actions.ts
    - app/(app)/study-artifacts/page.tsx
    - app/(app)/study-artifacts/[id]/page.tsx
    - app/screendesign.css
    - tests/screendesign-navigation.spec.ts
    - tests/screendesign-visual.spec.ts

key-decisions:
  - "A directly requested owner-owned flashcard remains reviewable even when its next due date is in the future; additional cards are still restricted to the due queue."
  - "Practice responses persist inside the existing artifact payload, preserve generated material, and never add a score unless a real finite backend score already exists."
  - "Study artifact generation continues through the existing authenticated AI-gated server action instead of introducing a parallel generation path."
  - "Source-only fabricated timer, accuracy, and honors claims were replaced with truthful question and saved-response progress under the calm invariant."

requirements-completed: [P36-FIDELITY, P36-OPERATIONS, P36-QA]

coverage:
  - id: D1
    description: "Flashcard review renders the canonical card, reveal, tutor cue, progress, and four rating controls while scheduling through the real owner-scoped FSRS review action."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "lib/fsrs/fsrs.test.ts"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts flashcards-review"
        status: pass
    human_judgment: false
  - id: D2
    description: "The Study Lab lists owner artifacts, creates supported artifact types through the existing AI policy path, and opens durable artifact routes."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "lib/study-helper/artifacts.test.ts"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts study-artifacts-hub"
        status: pass
    human_judgment: false
  - id: D3
    description: "Practice sessions save owner-scoped responses, progress, task signals, authorship evidence, and state snapshots without manufacturing a result."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "lib/study-helper/practice-progress.test.ts"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts practice-test-session"
        status: pass
    human_judgment: false
  - id: D4
    description: "Flashcard Review, Study Lab, and Practice Test Session preserve the canonical 393x852 compositions without Nexus presentation leakage or remote media dependencies."
    requirement: P36-FIDELITY
    verification:
      - kind: automated_ui
        ref: "tests/screendesign-source-capture.spec.ts and tests/screendesign-visual.spec.ts for all three screens"
        status: pass
      - kind: other
        ref: "manual source and app capture review at 393x852"
        status: pass
    human_judgment: true
    rationale: "Final source fidelity approval includes visual judgment after deterministic source and application captures."
  - id: D5
    description: "All plan-owned study screens pass exact visual and navigation checks, calm-language audit, type checking, production build, complete unit suite, and live runtime verification."
    requirement: P36-QA
    verification:
      - kind: automated_ui
        ref: "combined three-screen Playwright visual and navigation gate"
        status: pass
      - kind: other
        ref: "npm run tone-audit; npm run typecheck; npm run build; npm run test:run"
        status: pass
    human_judgment: false

duration: 22 min
completed: 2026-07-15
status: complete
---

# Phase 36 Plan 13: Flashcards and Study Artifacts Summary

**Flashcard review, the Study Lab, and practice sessions now reproduce their canonical ScreenDesign compositions while remaining backed by real scheduling, owner-scoped storage, AI safety, and evidence writes.**

## Performance

- **Duration:** 22 min
- **Completed:** 2026-07-15
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments

- Rebuilt `/flashcards/[id]/review` as the canonical review composition with real reveal, TTS, FSRS rating previews, offline recovery, calm repeated-attempt support, and authenticated review persistence.
- Rebuilt `/study-artifacts` as the canonical Study Lab with local media, owner-scoped source selection and saved artifacts, and creation through the existing AI-gated action.
- Rebuilt practice artifacts at `/study-artifacts/[id]` with durable responses, question progress, explicit no-score state, owner checks, task signals, authorship evidence, and state snapshots.
- Removed inherited Nexus shell composition from all three plan-owned states and locked three manually reviewed mobile goldens.

## Task Commits

1. **Practice persistence contract:** `41d58c7`
2. **Task 1, operational flashcard review:** `471f89c`
3. **Task 2, operational Study Lab:** `45fc11e`
4. **Task 3, persistent practice session:** `768b55b`
5. **Direct requested-card scheduling fix:** `2cd8a5b`
6. **Reviewed visual goldens and deterministic focus capture:** `e83f5f4`

## Files Created/Modified

- `app/(app)/flashcards/[id]/review/page.tsx` and `review-session.tsx` load owner cards and run the real reveal, TTS, rating, scheduling, and offline flow.
- `app/(app)/study-artifacts/page.tsx` renders the source-shaped Study Lab from owner assignments, notes, and artifacts.
- `app/(app)/study-artifacts/actions.ts` keeps AI policy enforcement and adds validated owner-scoped practice progress persistence.
- `app/(app)/study-artifacts/[id]/page.tsx` and `practice-session.tsx` render and persist a truthful practice experience.
- `lib/study-helper/practice-progress.ts` merges validated response progress without erasing generated content or adding scores.
- `app/screendesign.css` owns the three mobile compositions and removes inherited command overlays from those routes.
- `tests/screendesign-navigation.spec.ts` exercises a real response write before continuing.
- `tests/screendesign-visual.spec.ts` restores scroll position after keyboard visibility checks so evidence remains the initial viewport.
- `tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/` contains the three reviewed application goldens.

## Decisions Made

- A direct review URL represents an explicit student choice, so its owner-owned card remains available even when the normal due queue would omit it. The rest of the session remains due-only.
- The artifact payload remains the durable practice container. Response progress is merged under `practiceProgress`, preserving the generated questions and any real score that may already exist.
- The source practice screen's countdown, accuracy, and honors claims were not copied because they were unsupported by backend evidence. The app shows real question count, saved response count, and `No score yet` instead.
- The Study Lab uses the existing generation action so class AI traffic-light rules, token budget, Edge Function safety prompts, interaction logging, authorship, and task signals remain one policy surface.
- All source media is application-owned and local. No runtime ScreenDesign or remote image request is required.

## Deviations from Plan

- Added the practice client, payload merge helper, tests, and server action because durable per-question response persistence did not exist in the three plan-listed files.
- Updated the flashcard route loader so an explicit future-due requested card does not collapse into a false empty state during deterministic or real review.
- Updated the visual harness to return focus-scrolled containers to their initial position before evidence capture. Keyboard visibility remains tested, but goldens now represent the actual initial viewport.
- The configured Playwright snapshot template writes goldens under `tests/__screenshots__/...` instead of the generic paths shown in the plan.
- `requirements.mark-complete` could not update the Phase 36 IDs because they are prose sections rather than checkbox records. Plan coverage is recorded here and in the roadmap without falsely closing the broad phase requirements while other plans remain.

## Issues Encountered

- The first clean flashcard navigation run found that the deterministic fixture card had a future due date relative to the real server clock. The direct owner-card loader now honors the requested route while preserving due-only queue behavior.
- The first application capture stopped because the shared skip link remained translated off-screen when focused. Route-scoped shell CSS now keeps keyboard focus visible without hiding the skip link.
- The first Study Lab capture was scrolled to the third generator card after the keyboard check. The visual harness now resets focus-driven ancestor scrolling before screenshot capture.
- The first exact visual runs correctly stopped because the three baselines did not exist. All source and app pairs were inspected before explicit snapshot acceptance.

## Known Stubs

None in the plan-owned routes or actions. Empty data is labeled honestly, the practice textarea hint is live input guidance, and unsupported scoring remains visibly absent.

## Verification

- Source capture gate: 3 of 3 passed at 393x852.
- Exact application gate: 6 of 6 visual and primary-navigation tests passed for all three plan-owned screens.
- Focused study gate: 3 files and 19 tests passed.
- `npm run typecheck` passed.
- `npm run tone-audit` reported 0 blocking violations and one unrelated advisory for `deadline` in `app/(app)/assignments/page.tsx`.
- `npm run build` passed with 77 of 77 static pages generated.
- `npm run test:run` passed 143 files and 834 tests.
- Live restart: `http://127.0.0.1:3005/login` returned HTTP 200 from listener PID 30016.
- Visual evidence: source, app, and action artifacts are preserved under `C:\Users\glcar\Diana\test-results\screendesign-review\36-13-final`.

## User Setup Required

None beyond the existing Supabase and AI Edge Function configuration already used by Diana.

## Next Phase Readiness

- Plan 36-13 is complete and ready for the remaining ScreenDesign route groups.
- The three plan-owned routes render no obsolete Nexus composition.
- Plan 36-23 remains responsible for deleting obsolete presentation files after every replacement screen has landed.

## Self-Check: PASSED

- All plan-owned implementation, tests, action seams, and goldens exist.
- Six atomic implementation and evidence commits exist in Git history.
- Unit, source, navigation, exact golden, type, tone, production build, complete-suite, and live-runtime gates passed.
- The three default routes render source-owned ScreenDesign compositions backed by owner-scoped data instead of Nexus cards, remote media, or fabricated outcomes.

---
*Phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th*
*Completed: 2026-07-15*
