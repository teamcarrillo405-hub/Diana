---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Executing Phase 03
last_updated: "2026-05-29T10:07:53.714Z"
progress:
  total_phases: 7
  completed_phases: 1
  total_plans: 8
  completed_plans: 7
---

# Diana — Project State

**Last updated:** 2026-05-29  
**Current branch:** `claude/adhd-app-jxpn9`  
**Active phase:** Phase 3 in progress (03-01 complete — migration 0009, inbox queue, time-budget libs)  
**Last session:** 2026-05-29T10:07:53.711Z

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

## Repo pointers

- Feature spec: `docs/spec/features.md`
- Architecture: `docs/architecture.md`
- AI ethics: `docs/ai-ethics.md`
- Research findings: `docs/research/findings.md`
- Evidence review (gap analysis): `docs/review/slice-1-evidence-review.md`
