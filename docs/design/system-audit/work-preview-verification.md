# Work Capture and Active Work Preview Verification

Date: 2026-09-16. Status: **ready for user design review, not approved for production integration**.

- Capture: `http://127.0.0.1:3017/landing-3d/work-capture-review`
- Workspace: `http://127.0.0.1:3017/landing-3d/workspace-concept-review`

## Design and Scope

The approved Diana signature environment, condensed menu headings, pink selection marks, violet actions, and restrained rules connect the two workflows to the game-menu direction. Capture uses source/details comparison rather than a card dashboard. Active work uses a compact problem roster and contextual inspector around a dominant, quiet writing surface. This is a deliberate workflow distinction, not a claim of Madden/AAA equivalence.

Only new review routes and audit documentation changed in this slice. Production assignment screens, persistence, provider actions, lifecycle transitions, and student data were not changed. No new media, paid generation, or dependency installation was needed.

Both routes reject deployed/Vercel and non-loopback use and require development or the existing isolated local QA configuration. Metadata is noindex/nofollow. Route-owned code does not import live assignment components, server actions, Supabase, microphone APIs, or storage/network writers. Existing root providers remain unchanged; this is not a claim that every inherited app bootstrap is side-effect-free.

## Initial Preview Verification

The initial workspace was subsequently corrected after user feedback that its center omitted core controls. Its initial observations below are historical; the Center Parity Correction section supersedes the original workspace composition and test count.

- `npm run typecheck`: passed after final implementation changes.
- `npx eslint scripts/design-screen-inventory.ts app/landing-3d/work-capture-review app/landing-3d/workspace-concept-review --max-warnings 0`: passed.
- `npx vitest run app/landing-3d/work-capture-review app/landing-3d/workspace-concept-review app/landing-3d/settings-concept-review lib/student-route-policy.test.ts tests/production-route-connectivity.test.ts`: **112 tests in 9 files passed**.
- New capture tests: 16. New workspace tests: 35. They cover local state, route guards, draft/undo continuity, explicit review/completion, timer independence, keyboard selection, modal focus boundaries, and import/API isolation.
- Route census regenerated: 77 page files, including 16 review pages. The 25 policy-active student page files are unchanged. Counts do not imply rendered coverage of all routes.

No whole-repository test suite or production build was run for this isolated preview slice.

## Rendered Checks

Screenshots were directly inspected in this task's browser-tool history. They are rendered evidence, separate from the specialist source audit and unit tests. Checks used the existing local server on port 3017.

| Case | Observed result |
| --- | --- |
| Capture 1440 x 1000 | Details and light original-source document align side by side; explicit confirmation and primary action remain distinct |
| Capture 1920 x 1080 | Long pasted source wraps and scrolls within the source region; no horizontal page overflow; corrected checkbox layout is flex |
| Capture 834 x 1112 | Stacked source composition remains readable; missing-class validation focuses the class field and preserves inputs |
| Capture 390 x 844 | Original-directions action focuses the source heading; Back to details returns focus without losing metadata |
| Capture 320 x 780 | Receipt title, actions, and example-only notice wrap without horizontal page overflow |
| Capture completion/link | Sample source -> review -> explicit checkbox -> local receipt -> prepared workspace link works; no account assignment is created |
| Workspace 1440 x 1000 | Problem rail, dominant editor, source/rubric inspector and timer are visible; source and brand bitmaps load |
| Workspace 1920 x 1080 | English and rubric composition inspected; editor reading width capped at 76ch while the work plane remains full width |
| Workspace 834 x 1112 | Problem rail and editor fit; inspector moves into a modal sheet; no horizontal page overflow |
| Workspace 390 x 844 | Horizontal work-unit selection and editor remain readable; source/rubric dialog is operable |
| Workspace 320 x 780 | Long English draft wraps within the textarea; single paragraph unit uses the full roster row; unavailable Diana state fits the sheet |
| Draft continuity | Algebra problem 1 and 2 edits survive unit changes and English/Algebra fixture switches; English draft also survives switching |
| Human review and completion | Checking self-review enables explicit local completion; Not submitted remains visible; Undo restores text and clears reviewed/completed status |
| Focus timer | Start advances elapsed time; Stop preserves elapsed time; timer does not mark a unit complete or submit work |
| Keyboard | Home/End moves selected work unit and focus together; inspector tabs expose the selected panel; Tab and Shift+Tab cycle inside the phone dialog; Escape closes it and focuses its trigger |
| Reduced motion | Emulated reduced-motion preference reports true and zero running animations in both previews |

## Corrections Found During Browser QA

1. A more-specific shared label rule overrode capture's confirmation layout. Its scope now preserves checkbox spacing.
2. Narrow capture layouts needed a direct source/details comparison path. Focused jump/return controls were added.
3. Shared global text colors made workspace rubric items and the preview label too dark. Explicit local colors now restore readable contrast.
4. Native dialog tabbing could leave the page for browser chrome. Explicit first/last Tab boundaries now keep navigation inside the sheet, with hidden panels excluded.
5. Workspace focus treatment now uses white on the dark shell and dark ink on the light writing surface. Non-action Diana cues no longer use violet.
6. Long editor lines are capped; a single English unit no longer occupies only one-third of the phone roster.

## Deliberate Limits and Next Review

- Sample PDF is authored fixture text, not a real uploaded or parsed file. Paste mode is local. Source-read and no-class recovery states are simulated; their complete transition coverage is in the focused tests.
- Capture input is not transferred into a newly created assignment. Its receipt explicitly states that the workspace link opens the prepared Algebra example.
- Drafts, timer, review, and completion reset on reload. There is no real autosave, AI evaluation, microphone connection, school import, upload, or submission.
- Algebra and English are representative task surfaces, not a migration of every specialist editor, mathematics renderer, attachment pipeline, or multimodal workflow. The corrected local work pad now includes handwriting tools, but this is not a production integration.
- Real submission needs a separate preview, preserving destination selection, explicit student confirmation, pending/recovery states, and evidence-backed receipts.
- No physical-device test, assistive-technology certification, whole-app accessibility audit, performance certification, or user design approval is claimed.

Review these compositions before connecting any real data/actions. Integration must preserve the production draft flush, specialist state, AI policy, elapsed-time reconciliation, and explicit submission contracts documented in the source audit.

## Center Parity Correction

User feedback: preserve how the actual workspace was created, rather than replacing its center with a generic editor. Source reference: `components/assignment-workspace.tsx`, `assignment-review-panel.tsx`, and `assignment-math-work-surface.tsx`.

The preview center now follows **problem -> Diana conversation/review -> message composer -> Work tools/Review -> shared typed/handwritten work pad**. Source and Rubric are the only right-side inspector views. The approved game-menu shell and existing background remain intact. Production files were not changed.

Restored controls include Message Diana, Send with Enter/Shift+Enter behavior, Voice to text, Live Voice, attachment, paper modes, pen/eraser, ink undo/redo, text undo, clear/restore, Review, and keyboard/pointer work-pad resizing. Questions and local message history are separate from typed/ink work and retained per problem. Resize alone does not invalidate work review. Voice and attachment controls deliberately use unconnected/sample states; they do not access a microphone, upload files, or call AI.

Latest verification:

- `npx vitest run app/landing-3d/workspace-concept-review`: **65 tests across 5 files passed**.
- `npm run typecheck`: passed.
- `npx eslint app/landing-3d/workspace-concept-review --max-warnings 0`: passed.
- Browser at 1440 x 1000: inspected the original center order and visible messaging/voice actions; tested Enter sending, Shift+Enter newline, separate message/work drafts across problem changes, sample dictation, graph paper, clear/restore, Review, local completion, and keyboard pad resizing. SVG writing layer measured full work-area size, not an icon-sized layer.
- Browser at 1920 x 1080: English prompt, conversation, full-width writing pad, and source passage render together without horizontal overflow; background and wordmark bitmaps report loaded.
- Browser at 834 x 1112: problem rail plus center remain readable; no horizontal overflow; reference inspector moves to its secondary modal.
- Browser at 390 x 844: message/voice/send controls and work pad fit, each composer action measures 44 x 44; Source/Rubric dialog keeps focus, Escape restores its trigger, and the question draft survives.
- Browser at 320 x 780: handwriting tool groups wrap, text wraps in the graph-paper work surface, and no center element exceeds the viewport. Reduced motion reports active with zero running animations.
- Browser caught and corrected a global theme rule that darkened active voice-control text. Active contrast now uses light text against the dark control background. Review now matches the primary Send color.

Handwriting pointer behavior, cancellation, erasing, ink undo/redo, and coordinate mapping were verified by focused component tests; no physical stylus/device testing is claimed. Screenshots were inspected directly in browser-tool history. No new visual approval, real-time voice verification, production build, or whole-repository test pass is claimed.

## Lobby Start correction

The Lobby's History Start button previously opened `TodaySessionPreview`, an older focus timer and notes dialog. It now opens the same `WorkspaceConceptReview` used by Algebra, with the Nixon report's six sections, visible Ask Diana conversation and composer, voice/attachment controls, typed and handwritten work, Source/Rubric, and self-review. History and Biology fixtures were added so known Lobby tasks retain their subject. Redundant leading unit numbers were removed, and phone sections use one horizontally scrollable row.

Browser verification followed Lobby Start into the History report, entered a local Diana message, wrote in Introduction, returned through the primary Lobby link, and resumed. The selected section, writing, and Plan conversation remained intact. Only one `main-content` target was present. At 390px, Source/Rubric opened and closed, chat and work controls remained usable, and there was no horizontal document overflow.

The focused workspace, Lobby integration, and legacy session suites passed 164 tests across eight files. Chat, live voice, attachment upload, cloud saving, and AI review remain disconnected preview controls. No production workspace or AI adapter was changed.
