---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Executing Phase 09
stopped_at: Completed 09-02-PLAN.md
last_updated: "2026-05-31T00:38:59.356Z"
progress:
  total_phases: 9
  completed_phases: 7
  total_plans: 33
  completed_plans: 27
---

# Diana — Project State

**Last updated:** 2026-05-29  
**Current branch:** `claude/adhd-app-jxpn9`  
**Active phase:** Phase 7 (Polish + Tier 2 — Slice 6) — VERIFIED (v1.0 COMPLETE)  
**Last session:** 2026-05-31T00:38:56.684Z
**Stopped at:** Completed 09-02-PLAN.md

---

## What is built (Phase 1 COMPLETE)

- Next.js 15 App Router + TypeScript project scaffold
- Supabase integration (client + server + service role)
- Auth: email/password + Google OAuth, DOB age gate, COPPA consent gating
- PWA shell: `next-pwa`/`serwist`, manifest, offline shell
- F1: Class creation, rubric substrate, class documents (no AI rubric summary yet)
- F2: Assignment state machine (`captured → planned → in_progress → done → submitted → graded`), submission checklist (generic, hardcoded), "done ≠ submitted" enforcement
- F3: "Your next 5 minutes" dashboard — single top task, scoring function (deadline × estimated time × energy × momentum), energy picker (low/ok/high)
- `task_signals` table — signals inserted on state change but scorer does NOT yet read them
- Calm visual language: no red, no exclamations, amber for caution
- Basic RLS on all tables

## Key gaps (from docs/review/slice-1-evidence-review.md)

- **Zero dyslexia accommodation** — no TTS, no font controls, no STT
- No onboarding — diagnoses/accommodations/school year never captured
- `assignments` missing `kind`, `reading_load`, `writing_load`, `last_thought`
- `profiles` missing `diagnoses`, `accommodations`, `school_year`, `font_size`, `line_spacing`, `dyslexia_font`, `reduced_motion`, `high_contrast`, `tts_enabled`, `onboarded_at`
- Time blindness not mitigated — "Due in 3 days" string only, no visual
- Checklist is 6 hardcoded generic items
- No interrupt-recovery breadcrumb
- `task_signals` rows inserted but scorer ignores them
- Shame-management stubbed (slice 4) — should be slice-1 invariant

## Phase 8 decisions (08-01)

- OpenAI provider path uses direct fetch for binary audio — supabase.functions.invoke parses JSON, losing binary blob from tts-generate; direct fetch to ${SUPABASE_URL}/functions/v1/tts-generate preserves audio/mpeg
- tts_provider defaults to 'browser' for all users — opt-in requires Settings UI (deferred); column + prop wiring is the foundation
- No logInteraction in transcribe-voice/tts-generate — non-Claude AI calls; Whisper/TTS usage auditable via OpenAI dashboard
- TtsHighlightButton OpenAI variant omits word-highlight — OpenAI TTS 1 API emits no word boundary events; estimator wiring deferred to follow-up
- stt_transcribe + tts_generate added to LogParams.feature union in both safety.ts mirrors — must stay in sync

## Phase 9 decisions (09-02)

- shouldShowReminder uses 'stillOpen' property name instead of 'pastDue' — tone-audit bans `past[\s-]?due` regex including camelCase `pastDue`; calm invariant enforced; DB field `is_past_due` unaffected (underscore separator not matched)
- User-facing copy "still open beyond its due date" replaces "past due" in /reminders explanation page — same calm-invariant constraint
- Client-side time gate in ReminderBanner via `useEffect(() => setNow(new Date()), [])` — Pitfall 1: server runs UTC, student's local clock needed for quiet-hours check
- Per-session dismiss via `useState<Set<string>>` (not persisted) — D-05 mirrors EveningPlanning pattern from Phase 8-03
- No push infrastructure — D-01: in-app only for v1; no SW, no VAPID, no push_subscriptions table

## Phase 8 decisions (08-03)

- Client-side time gate for evening planning — Next.js server components run in UTC; student's local clock needed for 17–20h window; useEffect on client is the correct gate (Pitfall 4)
- Optimistic dismiss in EveningPlanning — local Set updated before markIntentionFired server call so UI stays calm even if server write fails (Pitfall 5)
- 17:00–20:00 hardcoded in v1; profiles.timezone column exists for future per-user TZ-aware personalization
- vitest include extended to app/**/*.test.tsx — test file co-located with component per plan spec; prior include only covered lib/ and components/
- findByText replaced with getByText in EVENING-02 — vi.useFakeTimers() intercepts Testing Library's internal setTimeout polling; synchronous getByText after act(runAllTimers) is the correct pattern

## Phase 8 decisions (08-02)

- INTERLEAVE_PENALTY=15: calibrated to de-promote non-urgent same-class tasks; typical non-urgent score range 10-30, so 15 is enough to rotate subjects without overriding urgency signals
- Urgency override: "due now" (+80) and "due today" (+60) assignments bypass the interleave penalty — Pitfall 6; urgency always wins
- Cookie over localStorage: diana_last_class cookie is readable by App Router server components on every request with zero latency; localStorage requires client-side hydration
- 12-hour maxAge: bounded session memory — natural overnight reset, no explicit "forget class" UI needed
- Silent de-promotion: no reason string added to scored assignment so the UI never shows "de-promoted by interleaving" (avoids self-fulfilling subject avoidance)
- Fire-and-forget void setLastShownClass(): cookie write never blocks dashboard render; graceful degradation if it fails

## Phase 7 decisions (07-02)

- assignment_checklists created in migration 0013 — was missing from all prior migrations despite being referenced as "existing" in Phase 3/4 plan interfaces
- Reading-load view shows 5 items vs 3 for normal view — students sorting by load want to see the full heavy-reading set
- Template picker placed BEFORE title field — student picks scaffold first, then adds assignment-specific title
- getTemplates and getTemplateById added to lib/templates/templates.ts as simple array wrappers (no extra DB calls) — required by success criteria
- inbox/[id]/actions.ts updated with templateId: null — all callers of createAssignment must include the new field

## Phase 7 decisions (07-03)

- Countdown hidden by default (showCountdown=false) — time-blindness accommodation per F13 spec; toggle persists via localStorage
- Ring progress uses rgb(var(--accent)) only — no red states at any progress level, calm invariant maintained
- Audio CDN-free placeholder approach — public/sounds/ directory committed empty; actual .mp3 assets are manual follow-up
- HTML5 Audio API play() wrapped in .catch(()=>{}) — browsers block autoplay; first Start click is user gesture; silent degradation if files missing
- body-double-pulse keyframe in globals.css (not CSS module) — single-use global utility, module overhead not warranted
- prefers-reduced-motion gate on body-double-pulse — vestibular/motion sensitivity comorbid with ADHD; reduced-motion = static dot
- Body-double copy 'No one else can see you' — explicit expectation management, no false networking promise (T2-03 spec)
- Timer between Study and Classes in nav — adjacent to work-mode items, before metadata items; nav now 6 items

## Phase 7 decisions (07-01)

- tone-audit uses tsx (not ts-node) — works cleanly with Next 15 ESM/CJS hybrid
- SKIP_LINE_PATTERNS excludes comment lines, console.error, imports, export declarations, DB enum comparisons — targets actual UI copy not code identifiers
- lib/ai/ and supabase/functions/ skipped in tone-audit — AI system prompts name banned words as anti-examples, server API responses are not student-facing
- docs/ skipped entirely — design/architecture docs reference banned words as anti-patterns being documented
- TimerStatus union is exactly 'idle'|'running'|'paused'|'break'|'done' — 'failed'/'missed' permanently excluded per calm invariant
- tickTimer work->break transition keeps status='running' and sets phase='break' — only break-end flips to 'done'; Premack reward surfaces at 'done' only
- useTimer uses setInterval(1000) not rAF — rAF throttled in background tabs, timer would stall

## Phase 6 decisions (06-04)

- Single classAiMode const replaces Plan 06-02 inline narrowing — one source of truth shared by ReadingPanel + three new tools
- calmError helper shared by all three server actions — identical calm copy for quota exhausted and ai_mode off errors
- CitationTool visible on yellow (F16 spec: yellow = citation help only); MathHelper + WritingAid hidden on yellow
- citation-gen content surfaces as raw JSON string from server action; CitationTool does JSON.parse client-side with raw-text fallback
- F18 frustration UX lives entirely in the Edge Function system prompt — no client-side frustration button in v1
- Phase 6 is COMPLETE: F09, F10, F11, F15, F16, F17, F18, AI-SAFETY-01 all delivered

## Phase 6 decisions (06-03)

- math-step uses Haiku 4.5 (400 max_tokens) — Socratic hints are low-complexity; budget stretches further; quality within tolerance for "what do you think comes next?" prompts
- writing-aid uses Sonnet 4.6 (500 max_tokens) — grammar/style nuance (homophones, comma splices, parallelism) requires higher model; F10 spec explicitly names Sonnet 4.6
- citation-gen uses Haiku 4.5 (600 max_tokens) — pure text-transform, no reasoning; three-format output fits within budget
- Yellow aiMode allows citations only (F16 traffic-light: yellow = citation-help); blocks math + writing (higher Socratic concern)
- citation-gen injects MINOR_SAFETY only, no F17/F18 — citations are not Socratic; formatting metadata is not doing work for student
- History capped at 6 turns for math-step: cost-efficient + frustration detector cares about last 3–5 turns only
- writing-aid has no history: each sentence review is independent; history would confuse "explain one rule" framing
- Fire-and-forget side effects: Promise.resolve().then(async()=>{}).catch() — AI-SAFETY-01 mandates side effects never block response

## Phase 6 decisions (06-01)

- ai_interactions is SEPARATE from ai_calls: ai_calls=cost/security audit (kept per privacy policy); ai_interactions=student-facing authorship log (exportable, per-assignment, per F15)
- UTC daily reset boundary for token budget (todayIsoDate): consistent for v1; per-user TZ-aware reset deferred to Phase 7+
- daily_token_budget default 50000 on profiles directly (not a separate usage_daily table): atomic single UPDATE, no JOIN per request, matches spec wording
- F18 divergence: FRUSTRATION_REDIRECT offers 5-min break + talk-through instead of worked example — lower cognitive load for ADHD/dyslexia student; worked-example path deferred to Phase 7+
- Deno mirror convention: duplicate lib/ai strings verbatim in _shared/ rather than shared package — overkill for ~150 lines of strings

## Phase 5 decisions (05-02)

- Create-on-first-save pattern: NoteEditor creates row on first auto-save (not page load) to avoid orphan draft rows in the database
- Dual-refresh strategy: setTimeout router.refresh() at 3s and 8s after triggerTranscript — surfaces AI result without a polling loop
- transcribe-note uses claude-sonnet-4-6 with max_tokens=1500 — reasoning quality needed for outline structuring per STATE.md model selection
- note-audio Storage bucket is a runtime dep (must be created in Supabase dashboard); same pattern as inbox-photos from Phase 3

## Phase 5 decisions (05-03)

- rateCard uses sequential await calls (load → update flashcards → insert flashcard_reviews) rather than a Postgres RPC — matches inbox classification pattern; atomicity is sufficient for FSRS correctness
- Flashcard-from-note link (/notes/[id] → /flashcards/new?note={id}) intentionally deferred: ?note= wiring and source_note_id FK exist; adding the link is a one-line follow-up in Phase 5 polish or Phase 6
- DueCards tile returns null when count=0 — no empty-state nagging for students who haven't created cards yet
- RATINGS array uses Anki-convention labels (Again/Hard/Good/Easy) — neutral, no shame, mirrors FSRS spec
- ReviewSession client component tracks idx in local state; revalidatePath('/flashcards') ensures server data is fresh on back-navigation

## Phase 5 decisions (05-01)

- FSRS-5 default weights (v5 Anki release) used; 19-parameter personalized optimization deferred to Phase 7+
- @testing-library/react installed as devDep — React 19 standalone renderHook/act not available in this environment
- useAutoSaveNote accepts saver as prop (not note body) — hook stays generic and testable without mocking server actions
- FsrsCard.difficulty=0 on new cards; initialDifficulty computed on first schedule() call to prevent clamping artifacts
- Good on new card → learning (not review) — mirrors Anki two-step graduation; Easy is the only direct-to-review rating

## Phase 4 decisions (04-03)

- classAiMode defaults to 'green' in assignment detail page; Phase 6 (F16) adds per-class traffic-light column
- Scaffold buttons opt-in behind "Help me with this reading" tap — not shown by default (Pitfall 5 guard)
- reading-scaffold Edge Function uses claude-sonnet-4-6 with 512 max_tokens; truncates to 1500 chars for pre, 4000 for mid/post
- server-side aiMode='red' guard in Edge Function returns 403 (defense in depth — client-side guard is not sufficient alone)
- reading_font field added to settings Prefs zod schema; existing supabase update call handles it without further changes

## Phase 4 decisions (04-02)

- Atkinson_Hyperlegible_Next loaded via next/font/google (not fontsource) for built-in Next.js font optimization + self-hosting
- OpenDyslexic loaded via @fontsource/opendyslexic (weight 400 only — no all.css, Pitfall 7 guard)
- .reading-view CSS scoped to blocks only (not global body) — prevents typography leaking into non-reading UI
- useTtsHighlight exposes pause/resume/stop separately — TtsHighlightButton drives 3-state UI
- Word spans rendered only when state !== 'idle' — Pitfall 3 guard for screen reader compatibility
- aria-live='polite' on paragraph container only — prevents excessive screen reader announcements per word

## Phase 4 decisions (04-01)

- reading_font stored as TEXT NOT NULL DEFAULT 'system' with DB check constraint ('system'|'lexend'|'atkinson'|'opendyslexic')
- reading_font='lexend' maps to existing .dyslexia-font CSS class (no new CSS needed; Lexend loaded Phase 2)
- Dedup guard in profileBodyClass prevents duplicate dyslexia-font class when dyslexia_font=true AND reading_font=lexend
- tts-utils.ts injects synth object into safeCancel for mockability — no window globals — enables node-environment Vitest
- types.ts manually annotated with reading_font until migration applied and supabase:types regenerated

## Phase 3 decisions (03-04)

- DB column is `cue_text` (not `cue_value`) in assignment_intentions — plan spec diverged from actual migration 0009 schema
- `action_text` column absent from assignment_intentions — removed from insert and zod schema
- `cueType` made optional in IntentionInput zod schema, defaults to "other" in server action body
- `?intent=new` URL param pattern: server page reads searchParams, client component cleans URL on mount via `router.replace(pathname)` (Pitfall 6 guard)
- `saveIntention` does not call `revalidatePath` — intention data never rendered server-side

## Phase 3 decisions (03-01)

- jsdom installed as devDependency for vitest jsdom environment (required by queue.test.ts @vitest-environment annotation)
- idb-keyval KEY_PREFIX "inbox-queue:" namespaces queue items from other IDB data
- Calibration n >= 3 gate before surfacing hint to prevent premature guidance
- Calibration 20% threshold ignores minor variance; surfaces hint only when student substantially underestimates
- upsert_type_estimate as atomic Postgres function to prevent client-side race condition (Pitfall 7)
- Dyslexia 1.6x multiplier applied in computeNightBudget only when reading_load >= 3 (consistent with scorer)

## Phase 2 decisions (02-04)

- PastDueMicroTaskButton extracted to its own client component — TimeBar stays a server component
- inProgress = todo || drafting only — checking/exporting are near-done, no micro-task escape hatch needed
- pivotAssignment race-guard: .eq("status","drafting") on update prevents concurrent pivot writes
- PivotForm copy: "Pause and revisit" / "Pause this" (not "Pivot") — pause framing per Pitfall 6
- Breadcrumb auto-focus via useSearchParams + useEffect; triggered by ?focus=breadcrumb URL param
- pivotSummary helper exported but rendering deferred to Phase 3 to keep plan scope contained

## Phase 2 decisions (02-02)

- signals parameter inserted second in rankAssignments (before now/energy/profile); default [] for backward compat
- Status-based momentum (drafting/checking → +25) fully removed; signals are the sole momentum source
- assignment_id nullable in task_signals — dashboard filters before passing to scorer
- 1.6x dyslexia reading_load multiplier codified in REQUIREMENTS.md (was 1.5x in spec); implementation matches, test verifies

## Phase 2 decisions (02-03)

- lexend.variable only (not lexend.className) — Lexend is opt-in via .dyslexia-font, not the global body font
- class_count_hint nullable, no default — null = skipped during onboarding
- TimeBar createdAt lookup by id from original Supabase array — no scorer type coupling
- TimeBar fallback to 7-day window when totalWindow < 1h (last-minute tasks)
- Custom checklist items required=false — never block submission
- deleteChecklistItem allows removing required items — student owns their checklist

## Phase 2 decisions (02-01)

- Vitest pinned to ^3.0.0 (current major); @vitejs/plugin-react included now for wave 4 component tests
- vitest environment: node default; component tests use per-file `@vitest-environment jsdom` override
- globals: false — explicit vitest imports preferred
- pivot_note and parent_assignment_id are nullable with no default (matches GAP-06/GAP-07 spec)
- parent_assignment_id FK: on delete set null — parent deletion must not cascade to micro-task children
- Migration 0008 is next available (02-03 will use it for class_count_hint)

## Architecture decisions locked

- Next.js 15 App Router + TypeScript + Tailwind + shadcn/ui
- Supabase (Postgres + Auth + Storage + Edge Functions)
- Vercel deploy; preview per branch
- All Claude calls via Supabase Edge Functions (never browser-direct)
- Model selection per task: Haiku 4.5 (cheap ops), Sonnet 4.6 (default), Opus 4.7 (hard reasoning)
- Prompt caching on class system prompt + reading text

## Open decisions (not yet resolved)

- TTS provider (needed Phase 4) — OpenAI / ElevenLabs / Azure / Polly
- STT provider (needed Phase 3) — Whisper / Deepgram / AssemblyAI
- OCR provider (needed Phase 3) — Claude vision vs. Cloud Vision
- Math expression parser (needed Phase 6) — MathLive + SymPy WASM
- Rich text editor (needed Phase 6) — TipTap
- Email service for parent verification — Resend or SendGrid

## Accumulated Context

### Roadmap Evolution

- Phase 8 added: Provider Wiring + Scorer Interleaving + Intentions Evening Trigger

## Repo pointers

- Feature spec: `docs/spec/features.md`
- Architecture: `docs/architecture.md`
- AI ethics: `docs/ai-ethics.md`
- Research findings: `docs/research/findings.md`
- Evidence review (gap analysis): `docs/review/slice-1-evidence-review.md`
