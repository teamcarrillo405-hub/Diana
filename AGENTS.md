# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Next.js dev server (Turbopack)
npm run build        # Production build
npm run typecheck    # TypeScript check (tsc --noEmit)
npm run test:run     # Run all tests once (CI mode)
npm run test         # Watch mode
npm run tone-audit   # Scan UI copy for banned shame/scolding language (exits 1 on violations)
npm run lint         # ESLint
```

Single test file: `npx vitest run lib/scoring/next-five-minutes.test.ts`

Vitest picks up `lib/**/*.test.ts` and `components/**/*.test.ts`. Per-file environment override: add `// @vitest-environment jsdom` at the top for component tests.

## Architecture

**Stack**: Next.js 15 App Router + TypeScript + Tailwind + shadcn/ui, Supabase (Postgres + Auth + Storage + Edge Functions), deployed on Vercel.

**Path alias**: `@/` maps to the repo root (not `src/`).

### Directory layout

- `app/(app)/` — authenticated routes (layout enforces auth + onboarding redirect)
- `app/(auth)/` — login/signup pages
- `app/onboarding/` — first-run flow
- `lib/` — pure business logic (no React, no DB calls except Supabase client helpers)
- `lib/scoring/` — "next 5 minutes" priority scorer (`rankAssignments`)
- `lib/fsrs/` — FSRS-5 spaced repetition scheduler (pure functions, no IO)
- `lib/timer/` — Pomodoro + Premack timer state machine (pure functions)
- `lib/ai/` — token budget, interaction logging, system-prompt composition helpers
- `lib/state-machine/` — assignment lifecycle (`captured → planned → in_progress → done → submitted → graded`)
- `supabase/functions/` — Deno Edge Functions for all Codex API calls
- `supabase/migrations/` — numbered SQL migrations (`0001_init.sql` … `0013_…`)
- `scripts/tone-audit.ts` — F20 copy compliance scanner

### Supabase client pattern

Three clients, never mixed:
- `lib/supabase/server.ts` — Server Components, Route Handlers, Server Actions (uses cookies)
- `lib/supabase/client.ts` — Client Components only
- Service-role key only inside Edge Functions (`SUPABASE_SERVICE_ROLE_KEY`)

### AI calls — Edge Functions only

**All Codex API calls live in `supabase/functions/`**. Never call `api.anthropic.com` from Next.js server actions or the browser. Each function:

1. Validates `aiMode` — returns 403 on `red` or `yellow` for content-generating features
2. Calls `resetBudgetIfNewDay` + `checkTokenBudget` before the Codex call
3. Calls `composeSystemPrompt(featurePrompt, opts)` which always injects `CALM_TONE`, `REDIRECT_PROMPT`, `FRUSTRATION_REDIRECT`, and `MINOR_SAFETY`
4. Fire-and-forgets `logInteraction` + `incrementTokens` after responding (never blocks the response)

Model selection: Haiku 4.5 for cheap/fast ops (classify-inbox, math-step hints, citation-gen), Sonnet 4.6 for quality ops (writing-aid, reading-scaffold, transcribe-note).

### Calm invariant — enforced everywhere

This is the product's non-negotiable design constraint:

- **No red color for errors** — use amber
- **No shame/scolding words** — `npm run tone-audit` scans for `wrong`, `incorrect`, `you missed`, `behind`, `failed`, etc. in UI copy
- **No streak language** — neutral counters only
- **Timer never has `failed` or `missed` states** — only `idle | running | paused | break | done`
- **FSRS never shows a guilt-trip for missed days** — accumulated cards, no multiplier

The tone-audit script skips: `docs/`, `supabase/functions/`, `lib/ai/`, test files, and comment lines — those may reference banned words analytically.

### Key design decisions

- **`done ≠ submitted`**: Assignment state machine has 6 states; `done → submitted` transition is always explicit and student-confirmed.
- **Dyslexia 1.6× multiplier**: Applied to `reading_load >= 3` tasks in both the priority scorer and the nightly time-budget calculator. Must stay consistent between the two.
- **`effective_minutes`**: The scorer computes the student's *real* expected time (with IEP extra-time % + dyslexia multiplier), separate from the teacher's estimated minutes.
- **AI traffic light** (`red/yellow/green`): Stored on `classes.ai_policy` with per-assignment override. Enforced server-side in every Edge Function — not just the client.
- **FSRS-5 weights**: The `W` array in `lib/fsrs/fsrs.ts` uses the published Anki v5 default weights. Do not change these without understanding the FSRS spec.
- **Authorship log**: Every AI interaction writes to `ai_interactions` (cost/audit) and the student-facing `authorship_log` table. The fire-and-forget pattern means a log failure must never break the AI response.

### Adding a new AI feature

1. Create a new Edge Function in `supabase/functions/<feature-name>/index.ts`
2. Call `composeSystemPrompt` with `includeRefuseRedirect: true`, `includeFrustration: true`, `includeMinorSafety: true`
3. Gate on `aiMode` before the Codex call
4. Add the feature name to the `feature` union in `lib/ai/safety.ts` → `LogParams`
5. Fire-and-forget log + token increment after returning the response

<!-- BEGIN GSTACK-CODEX MANAGED BLOCK -->
## gstack — AI Engineering Workflow

This block is managed by `gstack-codex`. Do not edit inside this block.

Skills live in `.agents/skills`. Invoke them by name, e.g. `/office-hours`.
Refresh with `npx gstack-codex init --project`.
This repo currently has the `full` pack installed.

## Available skills

| Skill | What it does |
|-------|-------------|
| `/office-hours` | YC Office Hours — two modes. Startup mode: six forcing questions that expose demand reality, status quo, desperate specificity, narrowest wedge, observation, and future-fit. |
| `/plan-ceo-review` | CEO/founder-mode plan review. Rethink the problem, find the 10-star product, challenge premises, expand scope when it creates a better product. |
| `/plan-eng-review` | Eng manager-mode plan review. Lock in the execution plan — architecture, data flow, diagrams, edge cases, test coverage, performance. |
| `/plan-design-review` | Designer's eye plan review — interactive, like CEO and Eng review. |
| `/design-consultation` | Design consultation: understands your product, researches the landscape, proposes a complete design system (aesthetic, typography, color, layout, spacing, motion), and generates font+color preview pages. |
| `/review` | Pre-landing PR review. Analyzes diff against the base branch for SQL safety, LLM trust boundary violations, conditional side effects, and other structural issues. |
| `/investigate` | Systematic debugging with root cause investigation. Four phases: investigate, analyze, hypothesize, implement. |
| `/design-review` | Designer's eye QA: finds visual inconsistency, spacing issues, hierarchy problems, AI slop patterns, and slow interactions — then fixes them. |
| `/qa` | Systematically QA test a web application and fix bugs found. |
| `/qa-only` | Report-only QA testing. Systematically tests a web application and produces a structured report with health score, screenshots, and repro steps — but never fixes anything. |
| `/ship` | Ship workflow: detect + merge base branch, run tests, review diff, bump VERSION, update CHANGELOG, commit, push, create PR. |
| `/document-release` | Post-ship documentation update. Reads all project docs, cross-references the diff, builds a Diataxis coverage map (reference/how-to/tutorial/explanation), updates README/ARCHITECTURE/CONTRIBUTING/CLAUDE.md to match what shipped, detects architecture diagram drift, polishes CHANGELOG voice with a sell-test rubric, cleans up TODOS, and optionally bumps VERSION. |
| `/retro` | Weekly engineering retrospective. Analyzes commit history, work patterns, and code quality metrics with persistent history and trend tracking. |
| `/browse` | Fast headless browser for QA testing and site dogfooding. Navigate any URL, interact with elements, verify page state, diff before/after actions, take annotated screenshots, check responsive layouts, test forms and uploads, handle dialogs, and assert element states. |
| `/setup-browser-cookies` | Import cookies from your real Chromium browser into the headless browse session. |
| `/careful` | Safety guardrails for destructive commands. Warns before rm -rf, DROP TABLE, force-push, git reset --hard, kubectl delete, and similar destructive operations. |
| `/freeze` | Restrict file edits to a specific directory for the session. |
| `/guard` | Full safety mode: destructive command warnings + directory-scoped edits. |
| `/unfreeze` | Clear the freeze boundary set by /freeze, allowing edits to all directories again. |
| `/gstack-upgrade` | Upgrade gstack to the latest version. Detects global vs vendored install, runs the upgrade, and shows what's new. |
| `/autoplan` | Auto-review pipeline — reads the full CEO, design, eng, and DX review skills from disk and runs them sequentially with auto-decisions using 6 decision principles. |
| `/benchmark` | Performance regression detection using the browse daemon. Establishes baselines for page load times, Core Web Vitals, and resource sizes. |
| `/benchmark-models` | Cross-model benchmark for gstack skills. Runs the same prompt through Claude, GPT (via Codex CLI), and Gemini side-by-side — compares latency, tokens, cost, and optionally quality via LLM judge. |
| `/canary` | Post-deploy canary monitoring. Watches the live app for console errors, performance regressions, and page failures using the browse daemon. |
| `/claude` | Claude Code CLI wrapper for non-Claude hosts - three modes. Review: independent diff review via claude -p. |
| `/context-restore` | Restore working context saved earlier by /context-save. Loads the most recent saved state (across all branches by default) so you can pick up where you left off — even across Conductor workspace handoffs. |
| `/context-save` | Save working context. Captures git state, decisions made, and remaining work so any future session can pick up without losing a beat. |
| `/cso` | Chief Security Officer mode. Infrastructure-first security audit: secrets archaeology, dependency supply chain, CI/CD pipeline security, LLM/AI security, skill supply chain scanning, plus OWASP Top 10, STRIDE threat modeling, and active verification. |
| `/design-html` | Design finalization: generates production-quality Pretext-native HTML/CSS. |
| `/design-shotgun` | Design shotgun: generate multiple AI design variants, open a comparison board, collect structured feedback, and iterate. |
| `/devex-review` | Live developer experience audit. Uses the browse tool to actually TEST the developer experience: navigates docs, tries the getting started flow, times TTHW, screenshots error messages, evaluates CLI help text. |
| `/diagram` | Turn an English description (or mermaid source) into a diagram triplet: the source, an editable .excalidraw file you can open on excalidraw.com, and rendered SVG + PNG (clean mermaid style; the .excalidraw carries the hand-drawn aesthetic). |
| `/document-generate` | Generate missing documentation from scratch for a feature, module, or entire project. |
| `/health` | Code quality dashboard. Wraps existing project tools (type checker, linter, test runner, dead code detector, shell linter), computes a weighted composite 0-10 score, and tracks trends over time. |
| `/ios-clean` | Remove the DebugBridge SPM package and all #if DEBUG wiring from an iOS app. |
| `/ios-design-review` | Visual design audit for iOS apps on real hardware. Connects to a real iPhone via the same StateServer as /ios-qa, screenshots every screen, evaluates against Apple HIG, DESIGN.md, and design best practices. |
| `/ios-fix` | Autonomous iOS bug fixer. Takes a bug found by /ios-qa, reads the source, writes the fix, rebuilds, redeploys, and verifies the fix on the real device. |
| `/ios-qa` | Live-device iOS QA for SwiftUI apps. Connects to a real iPhone via USB CoreDevice IPv6 tunnel, reads Swift source to understand every screen, then runs a vision-driven agent loop: screenshot → analyze → decide → act → verify → repeat. |
| `/ios-sync` | Regenerate the iOS debug bridge against the latest upstream gstack templates. |
| `/land-and-deploy` | Land and deploy workflow. Merges the PR, waits for CI and deploy, verifies production health via canary checks. |
| `/landing-report` | Read-only queue dashboard for workspace-aware ship. Shows which VERSION slots are currently claimed by open PRs, which sibling Conductor workspaces have WIP work likely to ship soon, and what slot /ship would pick next. |
| `/learn` | Manage project learnings. Review, search, prune, and export what gstack has learned across sessions. |
| `/make-pdf` | Turn any markdown file into a publication-quality PDF. Proper 1in margins, intelligent page breaks, page numbers, cover pages, running headers, curly quotes and em dashes, clickable TOC, diagonal DRAFT watermark. |
| `/open-gstack-browser` | Launch GStack Browser — AI-controlled Chromium with the sidebar extension baked in. |
| `/pair-agent` | Pair a remote AI agent with your browser. One command generates a setup key and prints instructions the other agent can follow to connect. |
| `/plan-devex-review` | Interactive developer experience plan review. Explores developer personas, benchmarks against competitors, designs magical moments, and traces friction points before scoring. |
| `/plan-tune` | Self-tuning question sensitivity + developer psychographic for gstack (v1: observational). |
| `/scrape` | Pull data from a web page. First call on a new intent prototypes the flow via $B primitives and returns JSON. |
| `/setup-deploy` | Configure deployment settings for /land-and-deploy. Detects your deploy platform (Fly.io, Render, Vercel, Netlify, Heroku, GitHub Actions, custom), production URL, health check endpoints, and deploy status commands. |
| `/setup-gbrain` | Set up gbrain for this coding agent: install the CLI, initialize a local PGLite or Supabase brain, register MCP, capture per-remote trust policy. |
| `/skillify` | Codify the most recent successful /scrape flow into a permanent browser-skill on disk. |
| `/spec` | Turn vague intent into a precise, executable spec in five phases. |
| `/sync-gbrain` | Keep gbrain current with this repo's code and refresh agent search guidance in CLAUDE.md. |

Repo installs include the full generated skill pack. Heavy browser/runtime binaries stay machine-local in v1.
Installed release: `0.2.8`
<!-- END GSTACK-CODEX MANAGED BLOCK -->
