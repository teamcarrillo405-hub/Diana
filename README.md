# Diana

Quiet, structured help with school for ADHD students.

This is the **slice 1** build: foundations + the three load-bearing features.

## What's in this slice

| Feature | What it does |
| ------- | ------------ |
| **F1 Classes & rubrics** | Add a class, paste a rubric. (AI parsing comes in slice 2 — for now the rubric is stored as text.) |
| **F2 Submission helper** | A state machine (todo → drafting → checking → submitting → submitted) plus a pre-submit checklist that you can't bypass. |
| **F3 Next 5 minutes** | The dashboard surfaces one task at a time, ranked by due date + momentum + your current energy level. |

This README's feature table reflects the original slice-1 scope. The system has since grown far past it — 39 migrations, 24 AI Edge Functions, subject helpers for every high-school discipline, a test-prep engine, grade insights, a self-improving help-effectiveness loop, and a full accessibility layer. Current state lives in `.planning/STATE.md` and `.planning/BEST_IN_CLASS_PLAN.md`; CI runs typecheck, 600+ tests, the calm-tone audit, and a production build on every push.

## Stack

- **Next.js 15** (App Router, React 19, Tailwind 3)
- **Supabase** (auth + Postgres + RLS) — staging project: `diana-staging` (ref `oitipayrriupcitgmzju`)
- **PWA** via `manifest.ts` + `next/og` icon
- **TypeScript strict mode**

## Local dev

```bash
npm install
cp .env.example .env.local   # fill from your Supabase project
npm run dev
```

`.env.local` (in this branch) already points at the staging Supabase project. For a fresh project, run the migrations in order from `supabase/migrations/`.

## Database

Migrations live in `supabase/migrations/` (applied via the Supabase MCP server, not the CLI). Schema notes:

- Every user-owned table has `owner_id uuid` and an RLS policy keyed off `auth.uid()`.
- `handle_new_user()` is a `security definer` trigger that creates a `profiles` row from signup metadata (DOB → `age_bracket`). Execute is revoked from `anon`/`authenticated` so it can only fire via the trigger.
- `task_signals` is append-only history feeding the next-5-minutes ranker.

## Auth & age gating

Signup requires DOB. Three brackets: `under_13`, `13_to_17`, `adult`. Users marked `under_13` are blocked at signup — AI features are not available to that bracket per `docs/ai-ethics.md`.

## AI

No AI calls in slice 1. The `ANTHROPIC_API_KEY` env var is wired but unused. Slice 2 will add the rubric parser and the study-buddy chat behind a per-user `consent_ai` flag (already on the `profiles` table).

## Build & test

```bash
npm run typecheck
npm run build
```

## Status

- Database: live on staging
- Auth: signup, login, logout, middleware-gated routes ✓
- F1/F2/F3: end-to-end working in browser ✓
- F4–F20: route stubs with descriptions ✓
- E2E tests, CI, deploy pipeline: not yet
