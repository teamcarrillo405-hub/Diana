---
phase: 10-audio-upload-stt
plan: "03"
subsystem: notes
tags: [audio-upload, class-routing, types, saver, notes-list, notes-detail]
dependency_graph:
  requires: ["10-01", "10-02"]
  provides: ["notes.class_id persisted", "class label on list/detail"]
  affects: ["app/(app)/notes/**", "lib/supabase/types.ts"]
tech_stack:
  added: []
  patterns: ["manual types annotation (04-01 pattern)", "Supabase nested FK select"]
key_files:
  created: []
  modified:
    - lib/supabase/types.ts
    - app/(app)/notes/actions.ts
    - app/(app)/notes/new/note-editor.tsx
    - app/(app)/notes/page.tsx
    - app/(app)/notes/[id]/page.tsx
    - app/(app)/notes/[id]/note-detail.tsx
decisions:
  - "types.ts manually annotated with notes.class_id (Row + Insert + Update + Relationship) — supabase gen types failed; regen deferred until migration 0018 is applied to linked project"
  - "notes_class_id_fkey added to types.ts Relationships to resolve SelectQueryError from nested classes(id,name) select"
  - "classId in saver/ensureNoteId — undefined and null both clear the class (no leave-unchanged sentinel, matches audioStorageKey semantics)"
  - "classLabel prop name used in NoteDetail to avoid collision with React className"
metrics:
  duration: "~15 minutes"
  completed_date: "2026-05-30"
  tasks_completed: 2
  tasks_total: 3
  files_changed: 6
status: CHECKPOINT — awaiting human-verify (Task 3)
---

# Phase 10 Plan 03: classId Wire-Through Summary

**One-liner:** Wire `notes.class_id` end-to-end: types.ts manually annotated, createNote/saveNote extended, NoteEditor saver updated, list/detail pages show class label via nested FK select.

---

## Tasks

| # | Name | Status | Commit |
|---|------|--------|--------|
| 1 | Sync types.ts + extend createNote/saveNote with classId | DONE | 0cbe718 |
| 2 | NoteEditor saver passes classId + list/detail show class label | DONE | 1200f90 |
| 3 | Smoke test — full audio-upload pipeline | PENDING (checkpoint) | — |

---

## Task 1 Detail

**types.ts sync method:** Manual annotation (fallback). `supabase gen types typescript --linked` exited with code 1 (CLI not authenticated or migration not yet applied to linked project). Applied Phase 4 04-01 pattern: added `class_id: string | null` to notes `Row`, `Insert`, and `Update` with inline comment. Also added `notes_class_id_fkey` to the `Relationships` array — required to prevent `SelectQueryError<"could not find the relation between notes and classes">` when using nested `classes(id, name)` in page queries.

**Runtime owner action required:** Run `supabase gen types typescript --linked > lib/supabase/types.ts` after migration 0018 is confirmed applied to the remote project. The manual annotation will be replaced by the generated output.

**Actions file changes:**
- `CreateInput` zod schema: added `classId: z.string().uuid().nullable().optional()`
- `SaveInput` zod schema: added `classId: z.string().uuid().nullable().optional()`
- `createNote` insert body: added `class_id: parsed.data.classId ?? null`
- `saveNote` update body: added `class_id: parsed.data.classId ?? null`

## Task 2 Detail

**NoteEditor:** `saver` useCallback now passes `classId` in both the first-save `createNote` call and the subsequent `saveNote` call. `ensureNoteId` also passes `classId`. Both have `classId` in their dependency arrays.

**Notes list page:** Query extended to `select("..., class_id, classes(id, name)")`. Per-note row now renders `· ClassName` beside the title as a `text-muted` span.

**Note detail server page:** Query extended to `select("..., class_id, classes(id, name)")`. Passes `classLabel` to `NoteDetail`.

**NoteDetail component:** Added optional `classLabel?: string | null` prop. Renders as `<p className="text-sm text-muted">{classLabel}</p>` at the top of the component when present.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added notes_class_id_fkey to types.ts Relationships**
- **Found during:** Task 2 typecheck
- **Issue:** `SelectQueryError<"could not find the relation between notes and classes">` — Supabase's TypeScript codegen requires the FK relationship in the `Relationships` array to resolve nested selects. The manual annotation added `class_id` fields but not the FK entry.
- **Fix:** Added `notes_class_id_fkey` Relationship entry to notes table in types.ts (same annotation approach as the column fields).
- **Files modified:** `lib/supabase/types.ts`
- **Commit:** 1200f90 (included with Task 2 commit)

---

## Task 3: Smoke Test (PENDING CHECKPOINT)

**Status:** Awaiting human verification. The dev server must be started and Tests 1-6 run manually.

**Prerequisites to confirm before starting:**
1. `OPENAI_API_KEY` set as Supabase secret (verify in Supabase dashboard → Edge Functions → Secrets)
2. `note-audio` Storage bucket exists (verify in Supabase dashboard → Storage)
3. Migration 0018 applied — confirm via SQL Editor: `SELECT column_name FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'class_id';`

**Test results:** (to be filled in after human verification)
- Test 1 — Type-only happy path: PENDING
- Test 2 — Validation gates: PENDING
- Test 3 — Audio happy path: PENDING
- Test 4 — Class persistence: PENDING
- Test 5 — Silence guard: PENDING
- Test 6 — Calm invariant: PENDING

---

## Self-Check: PARTIAL

Files created/modified exist:
- lib/supabase/types.ts: FOUND
- app/(app)/notes/actions.ts: FOUND
- app/(app)/notes/new/note-editor.tsx: FOUND
- app/(app)/notes/page.tsx: FOUND
- app/(app)/notes/[id]/page.tsx: FOUND
- app/(app)/notes/[id]/note-detail.tsx: FOUND

Commits exist:
- 0cbe718: FOUND (Task 1)
- 1200f90: FOUND (Task 2)

Task 3 (smoke test): PENDING HUMAN VERIFY
