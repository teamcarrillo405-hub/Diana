---
phase: 10-audio-upload-stt
plan: "03"
subsystem: notes
tags: [audio-upload, class-routing, types, saver, notes-list, notes-detail, whisper, smoke-test]
dependency_graph:
  requires: ["10-01", "10-02"]
  provides: ["notes.class_id persisted", "class label on list/detail", "smoke-test approved"]
  affects: ["app/(app)/notes/**", "lib/supabase/types.ts"]
tech_stack:
  added: []
  patterns: ["manual types annotation (04-01 pattern)", "Supabase nested FK select", "editable class dropdown on detail page"]
key_files:
  created:
    - app/(app)/notes/[id]/actions.ts
  modified:
    - lib/supabase/types.ts
    - app/(app)/notes/actions.ts
    - app/(app)/notes/new/note-editor.tsx
    - app/(app)/notes/page.tsx
    - app/(app)/notes/[id]/page.tsx
    - app/(app)/notes/[id]/note-detail.tsx
    - components/nav.tsx
key-decisions:
  - "types.ts manually annotated with notes.class_id (Row + Insert + Update + Relationship) — supabase gen types failed; regen deferred until migration 0018 is applied to linked project"
  - "notes_class_id_fkey added to types.ts Relationships to resolve SelectQueryError from nested classes(id,name) select"
  - "classId in saver/ensureNoteId — undefined and null both clear the class (no leave-unchanged sentinel, matches audioStorageKey semantics)"
  - "classLabel prop name used in NoteDetail to avoid collision with React className"
  - "auto-switch to Text tab after transcript lands (UX polish discovered during smoke test)"
  - "editable class dropdown on note detail page via updateNoteClass server action (extended scope during smoke test)"
requirements-completed: [F4-AUDIO, F8-UPLOAD, F16-AUTOCLASSIFY]
metrics:
  duration: "~30 minutes (including smoke test)"
  completed_date: "2026-05-30"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 8
status: COMPLETE
---

# Phase 10 Plan 03: classId Wire-Through + Smoke Test — COMPLETE

**Wire `notes.class_id` end-to-end via manual types annotation, extended server actions, and NoteEditor saver; all 6 smoke tests passed confirming the full audio-upload → Whisper → class-routing → save pipeline is live.**

---

## Performance

- **Duration:** ~30 minutes (including smoke test verification)
- **Started:** 2026-05-30T18:00:00Z
- **Completed:** 2026-05-30
- **Tasks:** 3/3
- **Files modified:** 8

---

## Accomplishments

- `lib/supabase/types.ts` manually annotated with `notes.class_id` (Row + Insert + Update) and `notes_class_id_fkey` Relationship entry — prevents SelectQueryError on nested FK selects
- `createNote` and `saveNote` server actions extended with `classId` zod field + SQL column assignment
- `NoteEditor` saver and `ensureNoteId` both pass `classId` through on every save
- Notes list page renders class name via Supabase nested `classes(id, name)` select
- Note detail page shows editable class dropdown (added during smoke test) via new `updateNoteClass` server action
- Notes nav item added to sidebar during smoke test
- Auto-switch to Text tab after Whisper transcript lands (UX polish added during smoke test)
- All 6 smoke tests passed — Phase 10 requirements F4-AUDIO, F8-UPLOAD, F16-AUTOCLASSIFY observably delivered

---

## Task Commits

| # | Name | Commit | Type |
|---|------|--------|------|
| 1 | Sync types.ts + extend createNote/saveNote with classId | 0cbe718 | feat |
| 2 | NoteEditor saver passes classId + list/detail show class label | 1200f90 | feat |
| 3 | Smoke test (human-verify checkpoint) | approved — no code files | — |

Additional changes committed outside this agent during smoke test verification:
- components/nav.tsx — Notes nav item added
- app/(app)/notes/new/note-editor.tsx — auto-switch to Text tab after transcript lands
- app/(app)/notes/[id]/note-detail.tsx — editable class dropdown
- app/(app)/notes/[id]/page.tsx — passes classes + classId to NoteDetail
- app/(app)/notes/[id]/actions.ts — updateNoteClass server action
- Two edge functions deployed: transcribe-voice, transcribe-note

---

## Files Created/Modified

- `lib/supabase/types.ts` — Manually annotated `notes` table with `class_id` (Row/Insert/Update) + `notes_class_id_fkey` Relationship
- `app/(app)/notes/actions.ts` — `CreateInput` + `SaveInput` zod schemas extended with `classId`; insert/update bodies include `class_id`
- `app/(app)/notes/new/note-editor.tsx` — `saver` + `ensureNoteId` pass `classId`; auto-switches to Text tab after transcript lands
- `app/(app)/notes/page.tsx` — Query uses `classes(id, name)` nested select; renders class label beside note title
- `app/(app)/notes/[id]/page.tsx` — Query uses `classes(id, name)` nested select; passes `classLabel` + `classes` list to NoteDetail
- `app/(app)/notes/[id]/note-detail.tsx` — Editable class dropdown using `updateNoteClass` action
- `app/(app)/notes/[id]/actions.ts` — `updateNoteClass` server action (new file, added during smoke test)
- `components/nav.tsx` — Notes item added to sidebar navigation

---

## Task 1 Detail

**types.ts sync method:** Manual annotation (fallback). `supabase gen types typescript --linked` exited with code 1 (CLI not authenticated / migration not yet applied to linked project). Applied Phase 4 04-01 pattern: added `class_id: string | null` to notes `Row`, `Insert`, and `Update` with inline comment. Also added `notes_class_id_fkey` to the `Relationships` array — required to prevent `SelectQueryError<"could not find the relation between notes and classes">` when using nested `classes(id, name)` in page queries.

**Runtime owner action required:** Run `supabase gen types typescript --linked > lib/supabase/types.ts` after migration 0018 is confirmed applied to the remote project. The manual annotation will be replaced by the generated output.

**Actions file changes:**
- `CreateInput` zod schema: added `classId: z.string().uuid().nullable().optional()`
- `SaveInput` zod schema: added `classId: z.string().uuid().nullable().optional()`
- `createNote` insert body: added `class_id: parsed.data.classId ?? null`
- `saveNote` update body: added `class_id: parsed.data.classId ?? null`

---

## Task 2 Detail

**NoteEditor:** `saver` useCallback now passes `classId` in both the first-save `createNote` call and the subsequent `saveNote` call. `ensureNoteId` also passes `classId`. Both have `classId` in their dependency arrays.

**Notes list page:** Query extended to `select("..., class_id, classes(id, name)")`. Per-note row now renders `· ClassName` beside the title as a `text-muted` span.

**Note detail server page:** Query extended to `select("..., class_id, classes(id, name)")`. Passes `classLabel` and the full classes list to `NoteDetail`.

**NoteDetail component:** Renders an editable class dropdown (`<select>`) that calls `updateNoteClass` on change, using `classLabel` and `classId` props from the server page. No red colors; calm amber for any error states.

---

## Task 3: Smoke Test Results — ALL PASSED

Human verifier approved on 2026-05-30. All 6 tests passed:

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1 | /notes/new — 3 tabs + class dropdown | PASS | Text/Voice/Upload tabs visible; class dropdown above title |
| 2 | Wrong file type shows amber error | PASS | .txt file shows amber "Only .m4a, .mp3, .wav, and .webm audio files are supported." |
| 3 | Audio upload + Whisper transcription | PASS | Full status sequence: Uploading → Processing → Shaping → All set; transcript populated |
| 4 | Class label on list and detail | PASS | Notes list shows class name; detail shows class label |
| 5 | Class change saves on detail page | PASS | Class picker on detail page added during test; updateNoteClass action works |
| 6 | Calm invariant | PASS | No red colors anywhere; no banned copy ("failed", "wrong", etc.) |

**Additional changes surfaced during smoke test (extended scope, committed by human verifier):**
- Notes nav item was missing — added to `components/nav.tsx`
- UX improvement: auto-switch to Text tab after transcript lands in `note-editor.tsx`
- Detail page class picker — `note-detail.tsx` made editable + `updateNoteClass` action created

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

**Total deviations:** 1 auto-fixed (Rule 1 — Bug)
**Impact on plan:** Auto-fix was necessary to allow TypeScript compilation with nested FK selects. No scope creep.

---

## Issues Encountered

- `supabase gen types typescript --linked` failed (CLI authentication / migration not yet applied to remote). Applied the established 04-01 manual annotation fallback pattern successfully.
- Smoke test revealed three missing UX items (nav item, auto-tab-switch, editable class on detail). All were committed by the human verifier during testing — no blocker to approval.

---

## Phase 10 Completion

Phase 10 requirements are fully delivered and smoke-test verified:

- **F4-AUDIO** — Audio file upload (.m4a/.mp3/.wav/.webm) with MIME validation and 25MB hard cap
- **F8-UPLOAD** — Whisper STT Edge Function transcribes audio → bodyText → Claude cleanup (fire-and-forget outline)
- **F16-AUTOCLASSIFY** — Class-router keyword scorer auto-selects class from transcript; student can override; classId persisted to `notes.class_id`

---

## Next Phase Readiness

Phase 10 is COMPLETE. The full audio-upload pipeline is live:
1. Migration 0018: `notes.class_id` column (10-01)
2. Pure modules: `lib/notes/{mime,upload-validation,class-router}` with 30+ tests (10-01)
3. Edge Functions: `transcribe-voice` (Whisper) + `transcribe-note` (Claude cleanup) (10-01 MIME fix + 05-02 original)
4. `triggerAudioTranscription` server action orchestrating the pipeline (10-02)
5. `AudioUploadTab` + `NoteEditor` 3-tab UI with class dropdown (10-02)
6. `createNote`/`saveNote` persisting `classId` (10-03)
7. Notes list + detail showing class label (10-03)
8. Smoke test: all 6 tests approved (10-03)

No known blockers. `reading_font` continues to work via existing `profileBodyClass` mechanism (Phase 4 Pattern 5 — untouched).

---

*Phase: 10-audio-upload-stt*
*Completed: 2026-05-30*

---

## Self-Check: PASSED

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

Task 3 smoke test: APPROVED by human verifier — all 6 tests passed.
