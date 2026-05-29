---
phase: 05-notes-study-layer-slice-4
plan: "02"
subsystem: ui
tags: [notes, voice, tts, auto-save, edge-function, claude, fsrs]

# Dependency graph
requires:
  - phase: 05-01
    provides: migration 0011 (notes table), lib/notes/types.ts (Note/OutlineNode), useAutoSaveNote hook
  - phase: 04-02
    provides: VoiceTextarea component, TtsHighlightButton component
  - phase: 03-02
    provides: classify-inbox Edge Function pattern (fire-and-forget + service-role + Anthropic call)
provides:
  - Notes list page (/notes) ordered by updated_at desc
  - New note editor (/notes/new) with VoiceTextarea + 30s auto-save + text/voice tabs
  - Note detail page (/notes/[id]) with transcript + outline + TTS playback + delete
  - createNote, saveNote, uploadNoteAudio server actions
  - deleteNote, triggerTranscript server actions
  - transcribe-note Edge Function (Sonnet 4.6 → transcript_text + outline_json)
affects: [05-03, phase-6, phase-7]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Notes create-on-first-save: row created on first auto-save, not page load — avoids orphan rows"
    - "Fire-and-forget Edge Function invocation via void supabase.functions.invoke (no await)"
    - "Dual-refresh strategy: router.refresh() at 3s + 8s after triggerTranscript to surface AI result"
    - "Storage bucket name note-audio (runtime dep, same pattern as inbox-photos in Phase 3)"

key-files:
  created:
    - app/(app)/notes/actions.ts
    - app/(app)/notes/[id]/actions.ts
    - app/(app)/notes/page.tsx
    - app/(app)/notes/new/page.tsx
    - app/(app)/notes/new/note-editor.tsx
    - app/(app)/notes/[id]/page.tsx
    - app/(app)/notes/[id]/note-detail.tsx
    - supabase/functions/transcribe-note/index.ts
  modified: []

key-decisions:
  - "Create-on-first-save pattern: NoteEditor creates the row on first auto-save (not on page load) to avoid orphan rows — same reasoning as quick-add capture form"
  - "Dual-refresh strategy for AI result: setTimeout router.refresh() at 3s and 8s after triggerTranscript — avoids polling loop while surfacing results quickly"
  - "transcribe-note uses claude-sonnet-4-6 with max_tokens=1500 — reasoning quality needed for outline structuring per STATE.md model selection policy"
  - "note-audio Storage bucket required as runtime dep — must be created in Supabase dashboard before uploadNoteAudio is callable (same pattern as inbox-photos)"

patterns-established:
  - "Fire-and-forget Edge Function: void supabase.functions.invoke with no catch — caller returns {ok:true} immediately"
  - "Edge Function defensive JSON parse: strip code fences before JSON.parse, throw on schema mismatch"
  - "NoteDetail transcribe button disabled when bodyText.trim() is empty — prevents wasteful AI calls"

requirements-completed: [F08]

# Metrics
duration: 17min
completed: 2026-05-29
---

# Phase 5 Plan 02: Notes + Study Layer Notes UI Summary

**F08 student-facing notes surface: 3 routes + 5 server actions + Sonnet 4.6 Edge Function delivering voice capture, 30s auto-save, AI transcript + outline, and TTS playback**

## Performance

- **Duration:** 17 min
- **Started:** 2026-05-29T06:00:09Z
- **Completed:** 2026-05-29T06:17:00Z
- **Tasks:** 3
- **Files modified:** 8 created, 0 modified

## Accomplishments

- Student can navigate /notes, create a new note via /notes/new (text or voice with VoiceTextarea), and have work saved every 30 seconds via useAutoSaveNote
- Student can open /notes/[id] and tap "Generate transcript + outline" — fire-and-forget invokes Sonnet 4.6 Edge Function which cleans the raw notes and structures them into 3–6 outline headings
- Transcript section reuses TtsHighlightButton (F06) for accessible playback of AI-cleaned text
- Delete flow requires a single confirmation tap with calm copy ("Delete this note?" / "Yes, delete" / "Keep")
- All 51 existing tests pass, build clean, 0 TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Server actions** - `28a9c0d` (feat)
2. **Task 2: Notes UI pages and components** - `e31d3c5` (feat)
3. **Task 3: transcribe-note Edge Function** - `f92e5e9` (feat)

## Files Created/Modified

- `app/(app)/notes/actions.ts` - createNote, saveNote, uploadNoteAudio server actions
- `app/(app)/notes/[id]/actions.ts` - deleteNote, triggerTranscript server actions
- `app/(app)/notes/page.tsx` - List page ordered by updated_at desc with empty-state CTA
- `app/(app)/notes/new/page.tsx` - Server page; reads ?assignment= searchParam and passes to NoteEditor
- `app/(app)/notes/new/note-editor.tsx` - Client editor: title input, text/voice tab switcher, VoiceTextarea, useAutoSaveNote, save status copy, Done button
- `app/(app)/notes/[id]/page.tsx` - Server detail page; fetches transcript_text + outline_json
- `app/(app)/notes/[id]/note-detail.tsx` - Client component: body display, TtsHighlightButton over transcript, Generate button, outline rendering, delete confirmation
- `supabase/functions/transcribe-note/index.ts` - Deno Edge Function: fetch note body, call claude-sonnet-4-6, parse JSON, write transcript_text + outline_json back to row

## Decisions Made

- **Create-on-first-save pattern:** NoteEditor delays row creation to first auto-save trigger. Avoids orphan draft rows in the database. On first save: createNote then saveNote with title+body; subsequent saves go to saveNote on the returned id.
- **Dual-refresh strategy:** After triggerTranscript, schedule router.refresh() at 3s and 8s. The Edge Function writes results asynchronously; two refresh attempts surface the AI result without a polling loop.
- **claude-sonnet-4-6 for transcription:** Per STATE.md model selection policy, Sonnet = default reasoning quality. Outline structuring (3–6 headings with coherent bullets) benefits from stronger reasoning than Haiku.
- **note-audio Storage bucket:** uploadNoteAudio writes to bucket `note-audio`. This bucket must exist in the Supabase dashboard before audio upload is callable (same pattern as `inbox-photos` documented in 03-02-SUMMARY.md). No code change needed — runtime configuration only.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — TypeScript compiled clean on first attempt, build succeeded without errors, all 51 tests passed.

## User Setup Required

**Runtime dependency: Supabase Storage bucket `note-audio`**

The `uploadNoteAudio` server action uploads audio recordings to a Supabase Storage bucket named `note-audio`. This bucket must be created manually before the audio upload feature is functional:

1. Go to Supabase dashboard → Storage
2. Create a new bucket named `note-audio`
3. Set appropriate RLS policies (owner-only read/write, matching the `notes` table pattern)

This is the same pattern as the `inbox-photos` bucket documented in Phase 3 (03-02-SUMMARY.md). The notes list, note editor (text+voice dictation), transcript generation, and TTS playback all work without this bucket — only the audio file upload itself requires it.

## Known Stubs

None — all data paths are wired. The "Generate transcript + outline" button calls the real Edge Function; the editor auto-saves to the real notes table; TtsHighlightButton reads the real transcript_text.

## Next Phase Readiness

- F08 notes surface complete — ready for Phase 5 Plan 03 (flashcards UI) and Phase 6 (AI features)
- `note-audio` Storage bucket is a known runtime dep (documented above)
- Phase 5 Plan 03 (05-03) can proceed: shares Wave 2 with this plan, depends on 05-01 foundation (same as this plan)

---
*Phase: 05-notes-study-layer-slice-4*
*Completed: 2026-05-29*
