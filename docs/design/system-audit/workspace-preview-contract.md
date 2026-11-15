# Active Work Preview Contract

Status: implemented for local review, not production integration or visual acceptance.

## Entry and Fixtures

- Route: `/landing-3d/workspace-concept-review`.
- `fixture=algebra|english|history|biology`; default `algebra`.
- `state=draft|empty|connection-unavailable`; default `draft`.
- Invalid query values fall back; repeated values use the first entry.
- Initial query values are read on the server only. Fixture selectors change React memory, never the URL, router, or browser history.
- Standalone backlink: `/landing-3d/work-capture-review`. The shared navigation connects the student previews. When opened from Lobby, Back to Lobby, the Lobby navigation link, and the wordmark return to the existing Lobby without discarding the workspace.
- Algebra units: `3x + 5 = 20`, `2(x - 4) = 14`, `5x - 7 = 3x + 9`. English: a single evidence paragraph with an original authored sample passage.
- History uses the Lobby's Nixon report, split into Plan, Introduction, Domestic policy, Foreign policy, Watergate & legacy, and Sources. Biology uses Structures, Functions, and Compare cells. Assignment briefs are authored samples, not imported teacher directions or research material.
- All twelve fixture/state combinations retain separate per-unit text, ink, question drafts, local messages, attachment tokens, selection, bounded text undo history, review, and completion until reload. Empty means an empty draft, not absent directions.
- Lobby Start and Resume open this same workspace instead of the older timer-and-notes dialog. The workspace remains mounted while returning to Lobby so drafts, messages, and selected sections survive Resume. The optional focus timer pauses on return and reports cumulative local elapsed time without completing or submitting work. Reload and navigation to a different preview route still reset local work.

## Interaction and Truth Boundaries

- Center order mirrors `assignment-workspace.tsx`: current problem, Diana conversation/review, message composer, Work tools and Review, shared typed/handwritten work surface. Diana is not a sidebar tab.
- The composer includes attachment, voice-to-text, Live Voice, and Send controls. Enter adds a local message; Shift+Enter adds a line; IME composition does not send. Dictation inserts an explicitly labeled sample transcript, attachments use a sample token, and Live Voice shows an unconnected preview state. No microphone, file upload, API request, or generated reply runs.
- Native controlled textarea owns the typed student draft. Undo restores the previous local edit, up to 100 entries per unit. The work surface supports pen/eraser, ink undo/redo, blank/lined/graph paper, clear/restore, and pointer/keyboard resizing. Text and ink persist across unit changes; local paper/tool selection and ink undo history reset on remount, matching the existing production work-surface lifecycle. Resize alone is not an ink edit. No parsing of student answers, solving, generated answers, or AI evaluation.
- Roving unit tabs support arrows, Home, End, click, and native keyboard activation. Focus follows keyboard selection.
- Review is opened from the work-pad toolbar into the center conversation area. Self-review is a human acknowledgement tied to the exact text/ink snapshot. Mark complete locally is explicit and requires nonempty, self-reviewed work. Edits and undo clear review and completion.
- Complete is never submitted. There is no submit, save, upload, account, school, or provider action.
- Focus clock starts/stops only on user activation, uses wall-clock elapsed time with an interval for display, and cleans up on unmount. It is independent of every unit and persists across fixture switches within this mount. No duration completes or reviews a unit.
- Source and rubric are fixture text and the only two inspector tabs. Diana includes an explicitly authored example question in the center, not a simulated response. AI and voice are unavailable; no microphone or permissions are requested.
- The connection-unavailable fixture is a declared example, not a network observation. It keeps editable sample text and allows human self-review and completion.
- Desktop inspector is a secondary side region. At 1100px and below, the source/rubric trigger opens a native modal dialog with a close control, Escape/cancel handling, explicit Tab/Shift+Tab boundary wrapping that excludes hidden panels and inactive tabs, and focus return. Returning to desktop closes it and focuses the editor. The unit rail becomes horizontal at 760px; a single unit spans the full row. The writing surface retains the center column's full width.

## Isolation

- Mirrors Settings preview gating: rejects Vercel and non-loopback hosts; allows development or the existing `isLocalNowQa` isolated build allowlist. Metadata disables indexing/following.
- Route-owned code imports only React, lucide, Next server routing primitives, the existing pure local-QA helper and assignment-ink codec, route-local components/fixtures, and scoped CSS.
- No production work components/actions, auth, Supabase, PWA, source importers, specialist tools, effects-bearing production hooks, storage APIs, network calls, or route mutations.
- Existing signature-world, wordmark, and selection-brush assets are reused. No generated assets, dependency changes, or live server adapter changes.
- Inherited limitation: `app/layout.tsx` already reads theme/accent storage through its bootstrap and providers. Those ancestors are outside this write scope and unchanged. Preview isolation tests cover route-owned imports and interactions, not a claim of zero inherited storage reads across the full Next document.
- Audit contracts read: W05 in `work-study-audit.md`, current `components/assignment-workspace.tsx`, approved Work and Settings preview language. Production draft flush, persistence, AI policy, focus reconciliation, and submission adapters remain untouched; local examples are not substitutes for those contracts.

## Verification Handoff

Scoped command: `npx vitest run app/landing-3d/workspace-concept-review --no-cache`.

Tests cover route/query gates, import/API isolation, fixture continuity, undo, self-review invalidation, completion/submission separation, timer independence/cleanup, keyboard selection, and mobile dialog close/focus return. Native modal containment and responsive pixels require real-browser verification; jsdom only exercises the dialog wiring.

Latest correction: 65 focused tests across five files cover the original center order, separate question/work drafts, Enter/Shift+Enter and IME handling, local voice/attachment previews, ink editing/recovery, pointer cancellation, resizing, Source/Rubric focus boundaries, and route isolation. See `work-preview-verification.md` for rendered evidence and final command results. No user visual approval or production integration is claimed.
