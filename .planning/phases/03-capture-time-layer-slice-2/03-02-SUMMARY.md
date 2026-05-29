---
phase: 03-capture-time-layer-slice-2
plan: "02"
subsystem: inbox-capture-and-classification
tags: [capture-inbox, offline-queue, edge-function, ai-classification, quick-add]
dependency_graph:
  requires:
    - supabase/migrations/0009_inbox_and_time_layer.sql
    - lib/inbox/types.ts
    - lib/inbox/queue.ts
  provides:
    - app/(app)/quick-add/page.tsx
    - app/(app)/quick-add/capture-form.tsx
    - app/(app)/quick-add/actions.ts
    - app/(app)/inbox/page.tsx
    - app/(app)/inbox/[id]/page.tsx
    - app/(app)/inbox/[id]/actions.ts
    - app/(app)/inbox/[id]/confirm-form.tsx
    - supabase/functions/classify-inbox/index.ts
  affects:
    - Phase 3 plans 03, 04 (time-budget views use inbox data)
tech_stack:
  added: []
  patterns:
    - Optimistic local queue (enqueueInboxItem before any server await)
    - window.online event drain loop for offline-queue replay
    - Fire-and-forget Edge Function invoke for async AI classification
    - Supabase type file manually extended (inbox_items + 3 time-layer tables from migration 0009)
    - supabase/functions excluded from tsconfig.json (Deno runtime, not Node)
key_files:
  created:
    - app/(app)/quick-add/actions.ts
    - app/(app)/quick-add/capture-form.tsx
    - app/(app)/inbox/page.tsx
    - app/(app)/inbox/[id]/page.tsx
    - app/(app)/inbox/[id]/actions.ts
    - app/(app)/inbox/[id]/confirm-form.tsx
    - supabase/functions/classify-inbox/index.ts
  modified:
    - app/(app)/quick-add/page.tsx (replaced ComingSoon stub)
    - lib/supabase/types.ts (added inbox_items, assignment_time_log, assignment_type_estimates, assignment_intentions)
    - tsconfig.json (excluded supabase/functions from Node TypeScript compilation)
decisions:
  - Supabase generated types not updated via CLI — manually extended lib/supabase/types.ts to include migration 0009 tables
  - supabase/functions excluded from project tsconfig — Edge Functions use Deno runtime, not Node
  - triggerClassification is fire-and-forget — classification never blocks the "saved" confirmation
  - ConfirmForm extracted as separate client component — inbox detail page remains a server component
  - Photo capture uses accept="image/*" capture="environment" native input — no custom getUserMedia
metrics:
  duration_minutes: 25
  completed_date: "2026-05-29"
  tasks_completed: 2
  files_changed: 10
---

# Phase 3 Plan 02: Capture Inbox UI + classify-inbox Edge Function Summary

Three-tab capture form at /quick-add (text/voice/photo) with IndexedDB optimistic queueing + online-drain, /inbox list and detail pages with AI suggestion display, and classify-inbox Edge Function using Claude Haiku 4.5 vision for OCR + classification.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Capture form + saveInboxItem action + /quick-add page | 92dea66 | app/(app)/quick-add/page.tsx, capture-form.tsx, actions.ts, lib/supabase/types.ts, tsconfig.json |
| 2 | /inbox list + item detail + classify-inbox Edge Function | 4952589 | app/(app)/inbox/page.tsx, [id]/page.tsx, [id]/actions.ts, [id]/confirm-form.tsx, supabase/functions/classify-inbox/index.ts |

## Verification

```
npm run build
# /quick-add built as ƒ (dynamic server-rendered)
# /inbox built as ƒ (dynamic server-rendered)
# /inbox/[id] built as ƒ (dynamic server-rendered)
# Build succeeded — no TypeScript or build errors
```

```
npx tsc --noEmit
# EXIT:0 — clean
```

Acceptance criteria grep results:
- PASS: no ComingSoon in quick-add/page.tsx
- PASS: saveInboxItem + uploadInboxPhoto exported from quick-add/actions.ts
- PASS: enqueueInboxItem imported in capture-form.tsx
- PASS: accept="image/*" capture="environment" in capture-form.tsx
- PASS: window.addEventListener("online", drain) in capture-form.tsx
- PASS: from("inbox_items") in inbox/page.tsx
- PASS: createSignedUrl in inbox/[id]/page.tsx
- PASS: confirmInboxItem + dismissInboxItem + triggerClassification in [id]/actions.ts
- PASS: claude-haiku-4-5 in supabase/functions/classify-inbox/index.ts
- PASS: no "past due" text in any inbox/ file

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Supabase types missing inbox_items and migration 0009 tables**
- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** `npx tsc --noEmit` reported `inbox_items` not assignable to known table names because `lib/supabase/types.ts` was not regenerated after migration 0009 was created in 03-01
- **Fix:** Manually extended `lib/supabase/types.ts` with `inbox_items`, `assignment_time_log`, `assignment_type_estimates`, `assignment_intentions` tables derived from migration 0009 schema
- **Files modified:** lib/supabase/types.ts
- **Commit:** 92dea66

**2. [Rule 3 - Blocking] supabase/functions included in Node tsconfig causing Deno API errors**
- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** `tsconfig.json` included `supabase/functions/classify-inbox/index.ts` via the `**/*.ts` glob; `Deno` namespace and `https://esm.sh/` imports are unknown in Node TypeScript
- **Fix:** Added `"supabase/functions"` to the `exclude` array in `tsconfig.json`
- **Files modified:** tsconfig.json
- **Commit:** 92dea66

## Known Stubs

None — all paths are fully wired. The classify-inbox Edge Function depends on `ANTHROPIC_API_KEY` being set in the Supabase project (already set from Phase 2). The inbox-photos Storage bucket must be created in Supabase (not blocking build — upload will return a storage error at runtime if absent).

## Self-Check: PASSED

Files verified:
- FOUND: app/(app)/quick-add/page.tsx
- FOUND: app/(app)/quick-add/capture-form.tsx
- FOUND: app/(app)/quick-add/actions.ts
- FOUND: app/(app)/inbox/page.tsx
- FOUND: app/(app)/inbox/[id]/page.tsx
- FOUND: app/(app)/inbox/[id]/actions.ts
- FOUND: app/(app)/inbox/[id]/confirm-form.tsx
- FOUND: supabase/functions/classify-inbox/index.ts

Commits verified:
- FOUND: 92dea66 — feat(03-02): Capture form + saveInboxItem action + /quick-add page
- FOUND: 4952589 — feat(03-02): /inbox list + detail + classify-inbox Edge Function

Build: passed (npm run build clean)
TypeScript: clean (npx tsc --noEmit EXIT:0)
