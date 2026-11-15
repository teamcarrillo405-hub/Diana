# Account Options Preview Verification

Date: 2026-09-16. URL: `http://127.0.0.1:3017/landing-3d/settings-concept-review`.

Status: **ready for user design review, not approved for live integration**.

## Scope

New files are isolated in `app/landing-3d/settings-concept-review/`. The route uses the existing loopback/development-or-isolated-QA gate, rejects Vercel/deployed access, and disables indexing. Existing Work preview CSS supplies the unchanged scene/navigation foundation; the options styling is local. No new assets or paid generation were used.

Ten visible categories retain the eleven known section keys by consolidating `learning-loop` into `learning`. The `reading` alias selects Accessibility; unknown values safely select Profile in this preview only. This does not change production routing.

The fixture supports local preference drafts, Apply, Undo, Reset, input validation, goal drafts, conditional text-to-speech settings, accessibility sample rendering, appearance sample controls, connection-state examples, and scoped review details. Hidden panels remain mounted and inert.

## Automated Checks

- `npm run typecheck`: pass after the reducer union and Testing Library options were corrected.
- `npx eslint scripts/design-screen-inventory.ts app/landing-3d/settings-concept-review --max-warnings 0`: pass.
- `npx vitest run app/landing-3d/settings-concept-review app/landing-3d/more-concept-review lib/student-route-policy.test.ts tests/production-route-connectivity.test.ts`: **73 tests in 6 files passed**.
- Settings alone contains 37 focused tests: route boundaries, alias resolution, draft reducer behavior, interaction semantics, local action effects, responsive detail focus/return, and source-isolation checks.

No production build or whole-repository test run was performed for this preview-only slice. Unrelated existing working-tree changes were not rewritten.

## Browser Checks

Screenshots were directly inspected in the task's browser tool history. Final preview is left open at 1440 x 1000.

| Viewport / case | Result |
| --- | --- |
| 1920 x 1080 desktop | Scene loads, category rail / option rows / contextual detail align, text remains readable, profile controls and actions fit |
| 1440 x 1000 desktop | No horizontal page overflow; ten tabs, one visible panel, hidden panels inert, one main landmark, both image assets loaded |
| 834 x 1112 tablet | Two-column menu/controls with detail below; Connections labels and fields fit; no horizontal page overflow |
| 390 x 844 phone | Scrollable horizontal tab rail, stacked native controls, readable scopes, local Apply actions; no page overflow |
| 320 x 740 narrow phone | Title and controls fit; selected tab is visible in its own horizontal scroller; page has no horizontal overflow |
| Reduced motion | Emulated preference returns true; switching categories produces zero running animations and panel animation duration `0s` |
| Draft continuity | Edited Display name to `Alex Preview`, switched to Accessibility and back; value remained intact |
| Apply and Reset | Apply announces `Applied to preview`; a later temporary edit resets to the applied value; fresh navigation restores fixture default `Alex Morgan` |
| Tab keyboard flow | End selects/focuses Sign out; Home then ArrowDown selects/focuses Appearance; exactly one rail tab remains in the tab sequence |
| Compact review/return | Canvas scope review moves focus to the visible detail region; Back to selected option returns focus and viewport to the original Canvas review button |
| Checkbox correction | Final computed native checkbox size is 24 x 24 with no inherited inset shadow; stray line from shared global input styling removed |

The initial desktop renders exposed a global input-style collision and the initial compact layout left review details offscreen. Both were corrected and rechecked before handoff. Browser verification is distinct from the agents' source-only audit reports.

## Deliberate Preview Limits

- No real account save, auth consent update, session sign-out, OAuth, service-worker installation, push permission, email export, IEP analysis, or connection mutation.
- Photo upload/removal/cropping is described in review detail, not implemented against real files. Full upload states require a separate inert fixture before integration.
- Notification permissions and connection availability use clearly labeled examples, not device/provider claims.
- TTS providers/voices are settings examples; no audio is synthesized. Reader-specific pacing and line-focus behavior are not implemented by this options menu.
- The Study exit is explicitly labeled live and has prefetch disabled. Its destination is assignment-based practice, not a verified canonical flashcard-review continuation.
- No claims of physical-device QA, screen-reader certification, real integration success, performance certification, or Madden/AAA equivalence.

## Approval Needed

Review the Account options composition and interactions. Production migration must preserve the current settings' server/device persistence distinctions and all documented controls, replace sample state with real adapters, and repeat functional/state coverage. Do not promote the whole fixture component with its synthetic account or simulated service behavior.
