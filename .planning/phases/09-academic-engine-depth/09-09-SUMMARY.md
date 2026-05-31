---
phase: 09-academic-engine-depth
plan: "09"
subsystem: ui-accessibility
tags: [dark-mode, vocab-hover, f20-polish, calm-invariant, tdd]
dependency_graph:
  requires: [09-05, 09-06, 09-07, 09-08]
  provides: [dark-mode-toggle, vocab-lookup, flash-prevention]
  affects: [app/(app)/layout.tsx, settings, onboarding/done, assignment-detail, notes-detail]
tech_stack:
  added: []
  patterns:
    - ThemeProvider mirroring AccentProvider (client component, localStorage read on mount, context value with set function)
    - dblclick + getSelection for deliberate word capture (ADHD intentional trigger design)
    - Flash-prevention inline synchronous script in root layout before React hydration
    - Tailwind class-based dark mode (darkMode: 'class') + .dark CSS variable overrides
key_files:
  created:
    - components/theme-provider.tsx
    - components/theme-provider.test.tsx
    - components/theme-picker.tsx
    - components/vocab-hover-provider.tsx
    - components/vocab-hover-provider.test.tsx
    - supabase/functions/vocab-hover/index.ts
  modified:
    - tailwind.config.ts
    - app/globals.css
    - app/layout.tsx
    - app/(app)/layout.tsx
    - app/(app)/settings/page.tsx
    - app/onboarding/done/page.tsx
    - lib/ai/safety.ts
    - supabase/functions/_shared/safety.ts
    - app/(app)/assignments/[id]/page.tsx
    - app/(app)/notes/[id]/note-detail.tsx
decisions:
  - ThemeProvider wraps children (unlike AccentProvider which is childless) — required because ThemePicker needs context access from within the layout subtree
  - afterEach(cleanup) required in vocab-hover tests — prevents stale DOM elements across test cases (matching pattern from ai-tooltip.test.tsx)
  - dynamic import of supabase client in VocabHoverProvider — avoids module initialization errors in jsdom test environment while preserving full auth in production
  - VocabHoverProvider URL falls back to relative path if NEXT_PUBLIC_SUPABASE_URL is unset — enables test assertions without env vars
  - vocab-hover Edge Function passes ownerId in body (not extracted from auth header) — consistent with math-step, writing-aid, citation-gen pattern in this codebase
  - suppressHydrationWarning on <html> tag — required when inline script mutates classList before React hydrates
metrics:
  duration_minutes: 30
  completed_date: "2026-05-30"
  tasks_completed: 3
  tests_added: 13
  files_created: 6
  files_modified: 10
---

# Phase 09 Plan 09: F20-POLISH Dark Mode + Vocab Hover Summary

**One-liner:** Class-based dark mode with flash prevention + deliberate dblclick vocab lookup using Haiku 4.5, both extending Diana's calm ADHD-aware UX.

## What Was Built

### Dark Mode (Task 1)

- **Tailwind class strategy:** `darkMode: 'class'` in `tailwind.config.ts` enables `.dark` class-based toggling
- **CSS variables:** `.dark { ... }` block added to `globals.css` mirroring the existing `@media (prefers-color-scheme: dark)` overrides — both kept so system preference still works for users who never toggle
- **Flash prevention:** Synchronous IIFE in `app/layout.tsx` `<head>` reads `localStorage.getItem('diana_theme')`, falls back to `window.matchMedia('(prefers-color-scheme: dark)').matches`, sets `document.documentElement.classList.add('dark')` before first paint. `suppressHydrationWarning` on `<html>` prevents React hydration mismatch.
- **ThemeProvider:** Client component mirroring AccentProvider pattern — reads localStorage on mount, falls back to system preference, exposes `{ theme, setTheme }` context. Wraps children in `app/(app)/layout.tsx`.
- **ThemePicker:** Sun/Moon toggle button with labels "Light" / "Dark" (calm invariant: no "Night mode" or "Eye saver").
- **Placement:** ThemePicker in Settings Appearance section AND onboarding done page (above "Let's go" CTA).

### Vocab Hover (Task 2)

- **Safety union:** `'vocab_hover'` added to `LogParams.feature` in both `lib/ai/safety.ts` (TypeScript) and `supabase/functions/_shared/safety.ts` (Deno mirror) — kept identical.
- **Edge Function:** `supabase/functions/vocab-hover/index.ts` — Haiku 4.5, `aiMode` gate (red + yellow → 403), budget check, `composeSystemPrompt` with all safety fragments, fire-and-forget `logInteraction` + `incrementTokens`. Validates word with `/^[a-zA-Z][a-zA-Z'-]{0,19}$/` server-side as well.
- **VocabHoverProvider:** Client component with `onDoubleClick` handler → `window.getSelection().toString().trim()` → `WORD_RE` validation → fetch POST to vocab-hover → floating `role="dialog"` popover. Dismisses on Escape keydown or mousedown outside popover. Silent failure on any API error (calm invariant: no toast, no error UI).

### Wire-up (Task 3)

- `app/(app)/assignments/[id]/page.tsx`: Description `<p>` block wrapped with `<VocabHoverProvider>` (not buttons, status, nav)
- `app/(app)/notes/[id]/note-detail.tsx`: Both `.reading-view` blocks wrapped (body notes + cleaned transcript)

## Test Coverage

- **ThemeProvider tests:** 6/6 pass
  - System dark preference with no stored value → adds 'dark' class
  - System light preference with no stored value → no 'dark' class
  - Stored 'dark' → adds 'dark' class
  - Stored 'light' → no 'dark' class
  - setTheme('dark') → adds class + persists to localStorage
  - setTheme('light') → removes class + persists to localStorage

- **VocabHoverProvider tests:** 7/7 pass
  - Valid alphabetic word double-click → fetch called with vocab-hover URL
  - Empty selection → no fetch
  - Non-alphabetic selection (hello123) → no fetch
  - Too-long selection (>20 chars) → no fetch
  - Success response → popover renders definition text
  - Escape key → popover closes
  - API failure → nothing rendered (silent, calm invariant)

- **Full suite:** 222/222 tests pass

## Edge Function Deployment

Manual deploy required (not automated by this plan):

```bash
supabase functions deploy vocab-hover
```

The function uses the same `_shared/system-prompts.ts` and `_shared/safety.ts` imports as all other Edge Functions in this codebase.

## Calm Invariant Verifications

- ThemePicker labels: "Light" / "Dark" — not "Night mode" or "Eye saver"
- Vocab failure: no toast, no error UI — silent
- Vocab trigger: deliberate double-click, not accidental hover — intentional UX for ADHD users
- `npm run tone-audit` exits 0 (2 pre-existing warnings in lib/features.ts and README.md, both non-blocking)
- `npm run typecheck` exits 0

## Known Build Issue (Pre-existing, Out of Scope)

`npm run build` fails on two pre-existing issues NOT caused by this plan:
1. `app/api/lms/ics-sync/route.js` — `BigInt is not a function` (Node.js compat issue in ics-parser dependency)
2. `lib/reminders/reminder-rules.ts` — type error (`stillOpen` vs `pastDue` property name drift)

Both were present before this plan's changes were applied (verified via `git stash`). Logged to `deferred-items.md` for follow-up.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] afterEach(cleanup) added to vocab-hover-provider test**
- **Found during:** Task 2, TDD green phase
- **Issue:** Multiple renders accumulating in jsdom across test cases — `getByTestId('c')` found 2+ elements
- **Fix:** Added `cleanup` import and `afterEach(() => { cleanup(); })` — matches pattern already used in `components/ai-tooltip.test.tsx`
- **Files modified:** `components/vocab-hover-provider.test.tsx`
- **Commit:** cf33110

**2. [Rule 2 - Deviation] VocabHoverProvider uses dynamic import for Supabase client**
- **Found during:** Task 2, implementation
- **Issue:** Static import of `@/lib/supabase/client` causes module initialization with undefined env vars in test environment
- **Fix:** Dynamic `import('@/lib/supabase/client')` inside try/catch — auth is best-effort; component still calls Edge Function even without token (Edge Function handles 401)
- **Files modified:** `components/vocab-hover-provider.tsx`
- **Commit:** cf33110

**3. [Rule 1 - Bug] vocab-hover Edge Function uses body `ownerId` instead of auth header extraction**
- **Found during:** Task 2, reading existing Edge Functions
- **Issue:** Plan template showed `getUserFromRequest` helper but this codebase doesn't have that function — all existing Edge Functions receive `ownerId` as a body param
- **Fix:** Followed existing pattern: `ownerId` from request body, service-role Supabase client
- **Files modified:** `supabase/functions/vocab-hover/index.ts`
- **Commit:** cf33110

## Self-Check: PASSED

All created files verified on disk. All 3 commits found in git history:
- ae4e7f6: feat(09-09): F20-POLISH dark mode toggle with flash prevention
- cf33110: feat(09-09): F20-POLISH vocab hover edge function + provider
- f93ce73: feat(09-09): F20-POLISH wire vocab hover into assignment + notes views

Quality gates:
- npm run typecheck: PASS (0 errors)
- npm run tone-audit: PASS (0 blocking violations)
- npm run test:run: PASS (222/222 tests)
- npm run build: pre-existing failures in ics-sync and reminders (not caused by this plan, verified via git stash)
