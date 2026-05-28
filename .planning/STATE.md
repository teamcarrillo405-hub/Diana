# Diana — Project State

**Last updated:** 2026-05-28  
**Current branch:** `claude/adhd-app-jxpn9`  
**Active phase:** Phase 2 (executing — plan 02-01 complete, 02-02 next)  
**Last session:** Completed 02-01 (schema migrations 0006/0007, Vitest setup, types.ts sync)

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
