# Phase 9: Academic Engine Depth — Research

**Researched:** 2026-05-29
**Domain:** AI task breakdown, in-app reminder scheduling, wins feed, AP math UI depth
**Confidence:** HIGH (all findings verified against codebase directly; no external library unknowns for core work)

---

## Summary

Phase 9 delivers three features that have been stub routes since Phase 1 (`/break-down`, `/reminders`, `/wins`) plus AP-level depth inside the existing `MathHelper`. The codebase is mature and the patterns are completely established — every AI feature pattern, DB migration pattern, Edge Function pattern, and calm-invariant enforcement pattern is already demonstrated across Phases 6–8. Phase 9 is primarily an application of those patterns to three new domains.

The biggest design decision is **F7 reminders**: the project has no web push infrastructure at all (no service worker, no VAPID keys, no push subscription table). Browser push notifications require significant setup and are fragile on iOS PWA. The practical choice is **in-app scheduled reminders** surfaced the same way the Evening Planning section works — a dashboard panel that checks `assignment_intentions.scheduled_for` against the current time, respecting quiet-hours and weekend rules. This avoids the browser push stack entirely while still delivering the "won't let me forget" value.

F6 (AI task breakdown) maps cleanly onto a new Edge Function (`task-breakdown`) + a new table (`assignment_steps`) + a component embedded in the assignment detail page. The `/break-down` stub route either becomes a redirect to the assignment detail, or a dedicated breakdown view. F8 (wins feed) is a read-only page querying `task_signals` where `kind = 'completed'` and wrapping them with assignment data for a shame-free log. The `DoneToday` component on the dashboard already does the simplest version of this.

**Primary recommendation:** Implement F6 as an on-demand "Break this down" button on the assignment detail (kind: any), F7 as a dashboard quiet-hours-aware reminder panel (no push, in-app only for v1), F8 as a `/wins` page backed by `task_signals`, and AP Math depth as formula reference + worked-example extension to `MathHelper` gated on `kind === 'problem_set' || kind === 'test_prep'`.

---

## Project Constraints (from CLAUDE.md)

- All Claude API calls MUST live in `supabase/functions/` — never call `api.anthropic.com` from Next.js server actions or the browser.
- Every Edge Function MUST call `resetBudgetIfNewDay` + `checkTokenBudget` before the Claude call.
- Every Edge Function MUST call `composeSystemPrompt` which injects `CALM_TONE`, `REDIRECT_PROMPT`, `FRUSTRATION_REDIRECT`, `MINOR_SAFETY`.
- Every new feature name MUST be added to the `feature` union in `lib/ai/safety.ts` AND its Deno mirror `supabase/functions/_shared/safety.ts`.
- Fire-and-forget `logInteraction` + `incrementTokens` after every Claude call — never blocks the response.
- No red color for errors — amber only.
- No shame/scolding words in UI copy — `npm run tone-audit` enforces this.
- No streak language — neutral counters only.
- Timer states: only `idle | running | paused | break | done` — never `failed` or `missed`.
- Model selection: Haiku 4.5 for cheap/fast (task breakdown is the right use), Sonnet 4.6 for quality ops.
- The `_shared/` Deno mirrors must be kept in sync with `lib/ai/` — change both files when changing one.
- Vitest picks up `lib/**/*.test.ts`, `components/**/*.test.ts`, `app/**/*.test.ts/tsx`. Per-file environment override with `// @vitest-environment jsdom` for component tests.
- Path alias `@/` maps to the repo root (not `src/`).

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| F6 | AI task breakdown — splits any assignment into ≤15-min atomic steps via Claude Haiku | New Edge Function `task-breakdown`, new table `assignment_steps`, component on assignment detail page. Pattern: identical to `math-step` Edge Function. |
| F7 | Smart reminders — quiet-hours-aware, no-weekend rule, escalating only when past due | In-app dashboard panel (no web push in v1). Reads `assignment_intentions.scheduled_for` + `assignments.due_at`. Quiet-hours check uses `profiles.timezone` (already in schema). |
| F8 | Wins feed — calm, shame-free log of completed work with "Done!" moment and daily/weekly summary | New `/wins` page querying `task_signals` where `kind='completed'` joined with `assignments`. `DoneToday` component is the seed of this. |
</phase_requirements>

---

## Standard Stack

### Core (already installed, no new deps needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 15 App Router | 15.5.18 | Page routing, Server Components, Server Actions | Project standard |
| Supabase JS | 2.106.2 | DB queries, Auth, Edge Function invoke | Project standard |
| Tailwind CSS | 3.4.15 | Styling | Project standard |
| shadcn/ui (via Tailwind) | — | UI primitives | Project standard |
| Zod | 3.23.8 | Input validation in server actions and Edge Functions | Project standard |
| date-fns | 4.1.0 | Date arithmetic for reminder windows, wins grouping | Already installed |
| Lucide React | 0.460.0 | Icons (CheckCircle, Sparkles, Bell) | Project standard |

### No New Dependencies Required

All Phase 9 features can be built with the existing stack. Specifically:
- Math rendering: plain text / Unicode math symbols are sufficient for AP formula reference in v1. KaTeX/MathJax are not required and would add significant bundle weight.
- Push notifications: deferred — in-app panel requires no new libraries.
- Background scheduling: deferred — the wins feed and reminder panel are SSR-on-demand, not cron-triggered.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| In-app reminder panel | Web Push API + VAPID | Push is better UX but requires: SW registration, VAPID key pair, push subscription table, iOS PWA restrictions. In-app panel delivers the core value with zero infrastructure cost. |
| Unicode math in formula panel | KaTeX | KaTeX renders beautifully but adds ~300KB bundle, requires SSR config, and is overkill for a reference panel that lists formulas. Plain text with Tailwind formatting is sufficient for v1. |
| Querying task_signals for wins | Separate wins table | task_signals already records `kind='completed'` on every `transitionAssignment` call. No new table needed for the core wins feed. |

---

## Architecture Patterns

### Recommended New Files

```
supabase/functions/
└── task-breakdown/
    └── index.ts              # F6 Edge Function — Haiku 4.5

supabase/migrations/
└── 0015_task_steps_and_reminders.sql  # assignment_steps table + reminder_rules column

lib/reminders/
└── reminder-rules.ts         # Pure functions: isQuietHours(), isDueSoon(), shouldEscalate()
└── reminder-rules.test.ts    # Unit tests

app/(app)/wins/
└── page.tsx                  # F8 wins feed (replaces ComingSoon stub)
└── wins-list.tsx             # Client component for wins log

app/(app)/reminders/
└── page.tsx                  # F7 (replaces ComingSoon stub — links to dashboard reminder panel)

app/(app)/assignments/[id]/
└── task-breakdown.tsx         # F6 client component (new, alongside math-helper.tsx)
└── ai-tools-actions.ts       # ADD: requestTaskBreakdown server action

app/(app)/dashboard/
└── reminder-banner.tsx       # F7 in-app banner (new dashboard component)
└── actions.ts                # ADD: getPendingReminders(), dismissReminder()
```

### Pattern 1: Edge Function for Task Breakdown (F6)

**What:** `task-breakdown` Edge Function using Haiku 4.5 (same model as `classify-inbox`, `math-step`). Receives assignment title, description, kind, estimated_minutes. Returns array of atomic steps, each ≤15 min.

**When to use:** Student taps "Break this down" on any assignment detail page.

**Example (follows math-step pattern exactly):**
```typescript
// supabase/functions/task-breakdown/index.ts
const BREAKDOWN_PROMPT = `You are a task-decomposition assistant for a high-school student with ADHD.
The student gives you an assignment. You split it into atomic steps, each completable in ≤15 minutes.
Rules:
- Output ONLY a JSON array of objects: [{"step": 1, "action": "...", "minutes": N}, ...]
- Maximum 12 steps. Each action must be a concrete verb phrase ("Read pages 47–52", "Write one topic sentence").
- Never say "study" or "work on" — be specific.
- Minutes per step must be ≤15 and must be a realistic estimate.
- Calm tone. No "you need to" or "you must".`;
```

**Server action (follows ai-tools-actions.ts pattern):**
```typescript
// Add to app/(app)/assignments/[id]/ai-tools-actions.ts
export async function requestTaskBreakdown(
  input: { assignmentId: string; title: string; description?: string; kind: string; estimatedMinutes?: number; aiMode: "red"|"yellow"|"green" }
): Promise<{ steps: Array<{step:number; action:string; minutes:number}> } | { error: string }>
```

**Feature name for LogParams:** `"task_breakdown"` — must be added to the union in both `lib/ai/safety.ts` and `supabase/functions/_shared/safety.ts`.

### Pattern 2: assignment_steps Table (F6 persistence)

**What:** Store generated steps so the student can check them off without regenerating.

**Schema:**
```sql
create table public.assignment_steps (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  assignment_id   uuid not null references public.assignments(id) on delete cascade,
  steps           jsonb not null default '[]'::jsonb,
  -- [{step:1, action:"...", minutes:N, done:false}]
  generated_at    timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
-- One row per assignment (upsert pattern)
create unique index assignment_steps_assignment_idx on public.assignment_steps(assignment_id);
```

**Note:** A unique index on `assignment_id` (not primary key) enables upsert-on-conflict. Client can call "regenerate" to replace the row.

### Pattern 3: Reminder Panel (F7 — in-app, no push)

**What:** Dashboard component that reads `assignment_intentions` with `scheduled_for IS NOT NULL AND fired_at IS NULL` and `assignments.due_at` to surface time-sensitive cues. Respects quiet hours (20:00–07:00 in student's timezone) and no-weekend rule.

**Pure functions in `lib/reminders/`:**
```typescript
// lib/reminders/reminder-rules.ts
export function isQuietHours(now: Date, timezone: string): boolean
export function isWeekend(now: Date, timezone: string): boolean
export function isDueSoon(dueAt: string | null, now: Date, thresholdHours: number): boolean
export function shouldEscalate(dueAt: string | null, now: Date): boolean
// past due escalation: show reminder even in quiet hours when assignment is past due
```

**Key design decision confirmed by codebase (STATE.md Phase 8):** The `profiles.timezone` column exists (from migration 0001). The EveningPlanning component uses client-side `useEffect` for local-time checks (STATE.md Phase 8-03: "Next.js server components run in UTC; student's local clock needed"). The same pattern applies to the reminder panel.

**Quiet-hours and no-weekend rule:**
- Quiet hours: 20:00–07:00 local time (hardcoded for v1, matches feature spec)
- Weekend rule: Saturday/Sunday — reminders suppressed unless assignment is past due
- Escalation: past-due assignments bypass quiet-hours and weekend suppression
- `scheduled_for` column on `assignment_intentions` already exists (migration 0009)

### Pattern 4: Wins Feed (F8)

**What:** `/wins` page (replacing `ComingSoon` stub) queries `task_signals` where `kind='completed'` joined with `assignments` for title and class info. Groups by day. Shows a calm "Done!" moment for each completion. Daily and weekly summary counts.

**Data available without new tables:**
```typescript
// Query pattern (follows dashboard pattern)
const { data } = await supabase
  .from("task_signals")
  .select("id, occurred_at, assignment_id, assignments(title, kind, classes(name, color))")
  .eq("kind", "completed")
  .order("occurred_at", { ascending: false })
  .limit(50)  // last 50 completions
```

**No new table needed.** `task_signals` records `kind='completed'` in `transitionAssignment` when `to === 'submitted'`. This is confirmed in `app/(app)/assignments/[id]/actions.ts` line 41–45.

**Calm invariant for wins:** Never say "streak," "consecutive days," "X days in a row." Say "4 things completed this week." Use `text-ok` (green variant) for counts, never red. No shame for zero wins days.

### Pattern 5: AP Math Depth in MathHelper

**What:** When `assignment.kind === 'problem_set' || assignment.kind === 'test_prep'`, the `MathHelper` shows two new panels:
1. **Formula reference panel** — collapsible accordion with AP Calc and AP Physics formulas in plain text / Unicode. Static, no AI cost.
2. **Worked example** — one-tap request to `math-step` Edge Function (or a new `math-example` function) for a worked example of an *analogous* problem. Follows the existing F18 escape-valve spec (features.md §F18): "analogous but different problem — never the student's actual problem."

**Important design constraint (features.md §F18 + STATE.md Phase 6):** The worked example must be on a *different* problem from the student's. The Phase 6 decision note says F18 was intentionally diverged to "break + talk-through instead of worked example" — but Phase 9 explicitly re-introduces AP-level worked examples as a new feature entry point in `MathHelper`, not as the F18 frustration path. These are parallel paths, not conflicting.

**Formula reference panel:** Static JSON data file (`lib/math/formulas.ts`) organized by AP subject (Calculus AB/BC, Physics 1/2/C). No AI cost. Renders with Tailwind typography. Plain text / Unicode symbols (∫, Δ, √, π, θ) — no KaTeX needed for a reference list.

### Anti-Patterns to Avoid

- **Browser Push Notifications in v1:** No service worker exists, no VAPID keys, no push subscription table. iOS PWA push support is inconsistent. In-app panel delivers core value without the infrastructure.
- **Streaming task breakdown response:** The existing Edge Functions all return complete JSON. Keep the same pattern — parse `steps` array from Claude's JSON output. Don't stream.
- **wins table:** Don't create a new table. `task_signals` already has `kind='completed'` rows with `assignment_id`. Join with `assignments` at query time.
- **KaTeX for formula reference:** Adds 300KB+ bundle. Plain Unicode text in a well-styled accordion is sufficient for AP formula reference in v1.
- **Modifying F18 escape valve:** The Phase 6 decision (STATE.md) deliberately diverged F18 to break+talk-through. Do not change that. AP Math worked examples in Phase 9 are a *separate* UI entry point inside `MathHelper`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Quiet-hours timezone math | Custom TZ string parsing | `date-fns` already installed: `toZonedTime()` from `date-fns-tz` OR `Intl.DateTimeFormat` in browser | date-fns 4.x includes timezone via separate package, but `Intl.DateTimeFormat` works in both browser and Edge Functions without extra deps |
| Step persistence upsert | Manual check-insert-or-update | Supabase `.upsert()` with `onConflict: 'assignment_id'` | Already used in `upsert_type_estimate` RPC; same pattern |
| Day grouping for wins feed | Custom date bucketing | `date-fns` `startOfDay`, `format` | Already installed |
| Token budget checking | New logic | `resetBudgetIfNewDay` + `checkTokenBudget` from `_shared/safety.ts` | Already exists, must be called by every Edge Function |

**Key insight:** The entire AI pipeline (budget, logging, system-prompt composition, aiMode gating) is already abstracted. A new Edge Function is ~40 lines of boilerplate plus the feature-specific prompt.

---

## Common Pitfalls

### Pitfall 1: Timezone in Server Components vs. Client Components

**What goes wrong:** Using `new Date()` in a Server Component to check quiet hours gives UTC time. The student's quiet hours are in their local timezone.

**Why it happens:** Next.js Server Components always run in UTC (documented in STATE.md Phase 8-03 decision note).

**How to avoid:** Follow the EveningPlanning pattern — use `useEffect` on the client to read local time. Or use `profiles.timezone` + `Intl.DateTimeFormat` to convert. The reminder banner should be a Client Component with `useEffect(() => { checkQuietHours(new Date(), profile.timezone) }, [])`.

**Warning signs:** Reminder shows at wrong local time; quiet hours fire at UTC midnight instead of local midnight.

### Pitfall 2: task_signals 'completed' vs. 'submitted' state

**What goes wrong:** `task_signals.kind = 'completed'` is actually inserted when `to === 'submitted'` (not `to === 'done'`). See `actions.ts` line 41–45: `kind: to === 'drafting' ? 'started' : 'completed'` — this runs on both `to === 'drafting'` and `to === 'submitted'`.

**Why it happens:** The state machine has `done` as a separate state from `submitted`. The wins feed should key on `'completed'` signals which correspond to `submitted` transitions, not `done`.

**How to avoid:** Query `task_signals` where `kind = 'completed'` for the wins feed. Do NOT query by assignment `status = 'done'` — that misses submissions. Do NOT add a new signal kind.

**Warning signs:** Wins feed shows 0 items even when assignments were submitted.

### Pitfall 3: Claude JSON Output Parsing for Task Breakdown

**What goes wrong:** Claude Haiku sometimes returns JSON with prose before or after the array (`Here are the steps: [...]`). Straight `JSON.parse` throws.

**Why it happens:** Haiku is less reliable at strict JSON output than Sonnet, especially under content safety constraints.

**How to avoid:** Use a regex extract pattern: `const match = content.match(/\[[\s\S]*\]/); const steps = JSON.parse(match[0])`. Validate each step object has `step`, `action`, `minutes`. Fall back to a single "Read the assignment description" step if parsing fails — never error-blank the UI.

**Warning signs:** `SyntaxError: Unexpected token` in the server action; empty breakdown panel.

### Pitfall 4: LogParams.feature union must be updated in two files

**What goes wrong:** Adding `'task_breakdown'` to `lib/ai/safety.ts` but forgetting `supabase/functions/_shared/safety.ts`. TypeScript in Next.js won't catch the Deno file; it will only fail at runtime.

**Why it happens:** Deno mirror convention — both files must be kept in sync manually (STATE.md Phase 6, multiple decisions).

**How to avoid:** Any PR touching `lib/ai/safety.ts` must also touch `supabase/functions/_shared/safety.ts`. Add a CI grep comment in both files (already present: "Change both files when changing one").

**Warning signs:** TypeScript passes but Edge Function logs `"unknown feature"` in ai_interactions.

### Pitfall 5: F7 Reminder Escalation Needs a 'dismissed' Column

**What goes wrong:** The reminder panel shows the same reminder on every dashboard load after quiet hours. Student dismisses it; it comes back on next load.

**Why it happens:** `assignment_intentions.fired_at` is null until explicitly marked. The reminder panel dismissal must persist server-side.

**How to avoid:** Reuse `markIntentionFired` (already exists in `app/(app)/dashboard/actions.ts` line 83) for time-based intention dismissal. For past-due escalation reminders (not tied to an intention), add a `dismissed_at timestamptz` column to `assignment_intentions`, or store dismissed assignment IDs in localStorage as an acceptable graceful degradation (like EveningPlanning's optimistic dismiss pattern in STATE.md Phase 8-03).

**Warning signs:** Dismissed reminder reappears on every page refresh.

### Pitfall 6: Tone Audit Will Catch 'Done!' if Implemented Carelessly

**What goes wrong:** The wins feed uses copy like "You completed this!" or "Great job!" which, while positive, may still trip tone-audit rules around scolding or patronizing language.

**Why it happens:** `npm run tone-audit` scans for banned patterns. While "Done!" is safe, adding copy like "You knocked out X tasks!" needs checking.

**How to avoid:** Use neutral celebratory language: "4 things done this week." / "Calculus problem set — done." Avoid exclamation marks per `CALM_TONE` constraint. Run `npm run tone-audit` after writing wins feed copy.

### Pitfall 7: AP Formula Reference Must Not Include Derivations (Scope Creep)

**What goes wrong:** The formula reference panel grows to include worked derivations, making it a second AI feature instead of a static reference.

**Why it happens:** Tempting to add "explain this formula" AI calls to the panel.

**How to avoid:** Static formulas only in Phase 9. "Explain this formula" is Phase 10+ scope. Keep `lib/math/formulas.ts` as a pure data file with no AI calls.

---

## Code Examples

### Task Breakdown Edge Function (boilerplate, from math-step pattern)

```typescript
// supabase/functions/task-breakdown/index.ts
// Source: mirrors supabase/functions/math-step/index.ts structure exactly
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkTokenBudget, incrementTokens, logInteraction, resetBudgetIfNewDay } from "../_shared/safety.ts";
import { composeSystemPrompt } from "../_shared/system-prompts.ts";

const BREAKDOWN_PROMPT = `...`;

Deno.serve(async (req: Request) => {
  // 1. CORS preflight
  // 2. Parse body: { ownerId, assignmentId, title, description, kind, estimatedMinutes, aiMode }
  // 3. aiMode check (red → 403; yellow → allow, breakdown is pure planning, not content)
  // 4. Service-role client
  // 5. resetBudgetIfNewDay + checkTokenBudget
  // 6. composeSystemPrompt(BREAKDOWN_PROMPT, { includeRefuseRedirect: false, includeFrustration: false, includeMinorSafety: true })
  //    Note: no refuseRedirect/frustration needed — task breakdown doesn't do Socratic work
  // 7. Call Haiku 4.5, max_tokens: 600 (12 steps × ~50 chars each)
  // 8. Parse JSON array from response content
  // 9. Fire-and-forget logInteraction + incrementTokens
  // 10. Return { steps: [...] }
});
```

### Quiet Hours Check (client-side pattern from EveningPlanning)

```typescript
// lib/reminders/reminder-rules.ts
// Source: pattern from app/(app)/dashboard/evening-planning.tsx (Phase 8-03 decision)
export function isQuietHours(now: Date): boolean {
  const hour = now.getHours(); // client-side: already local time
  return hour >= 20 || hour < 7;
}

export function isWeekend(now: Date): boolean {
  const day = now.getDay();
  return day === 0 || day === 6; // Sunday=0, Saturday=6
}

export function isPastDue(dueAt: string | null, now: Date): boolean {
  if (!dueAt) return false;
  return new Date(dueAt) < now;
}

export function shouldShowReminder(
  intention: { scheduled_for: string | null; fired_at: string | null },
  dueAt: string | null,
  now: Date,
): boolean {
  if (intention.fired_at) return false;
  const pastDue = isPastDue(dueAt, now);
  // Past-due escalation bypasses quiet hours and weekends
  if (pastDue) return true;
  if (isQuietHours(now) || isWeekend(now)) return false;
  if (!intention.scheduled_for) return false;
  return new Date(intention.scheduled_for) <= now;
}
```

### Wins Feed Query (Server Component pattern from dashboard)

```typescript
// app/(app)/wins/page.tsx
// Source: pattern from app/(app)/dashboard/page.tsx
const { data: completions } = await supabase
  .from("task_signals")
  .select(`
    id, occurred_at, assignment_id,
    assignments(title, kind, classes(name, color))
  `)
  .eq("kind", "completed")
  .order("occurred_at", { ascending: false })
  .limit(50);
```

### assignment_steps Upsert (follows upsert_type_estimate pattern)

```typescript
// Server action for saving generated steps
await supabase
  .from("assignment_steps")
  .upsert(
    { owner_id: userId, assignment_id: id, steps: generatedSteps, updated_at: new Date().toISOString() },
    { onConflict: "assignment_id" }
  );
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No task breakdown (stub `/break-down`) | F6 Edge Function + `assignment_steps` table | Phase 9 | #1 ADHD executive-function intervention added |
| No wins persistence (stub `/wins`) | F8 wins feed from `task_signals` | Phase 9 | Shame-free completion log |
| MathHelper: Socratic hints only | + Formula reference panel + worked examples | Phase 9 | AP Calc/Physics students can use Diana for harder problems |
| No in-app scheduling | F7 reminder banner on dashboard | Phase 9 | "Forgets due dates" gap closed without push notification infrastructure |

**Deprecated/outdated:**
- `/break-down` ComingSoon stub: replaced by actual F6 implementation.
- `/reminders` ComingSoon stub: replaced by redirect to dashboard + reminder panel.
- `/wins` ComingSoon stub: replaced by actual F8 wins feed.
- `lib/features.ts` entries for F6/F7/F8: status `"stub"` should flip to `"live"`.

---

## Existing Infrastructure Confirmed

The following are confirmed present in the codebase (HIGH confidence — directly verified):

### Database tables available without new migration
| Table | Relevant Columns | Phase 9 Use |
|-------|-----------------|-------------|
| `task_signals` | `owner_id, kind, assignment_id, occurred_at` | F8 wins feed source |
| `assignment_intentions` | `id, owner_id, assignment_id, cue_type, cue_text, scheduled_for, fired_at` | F7 reminder source |
| `assignments` | `id, title, kind, due_at, estimated_minutes, description` | Task breakdown input; reminder context |
| `profiles` | `timezone, diagnoses, daily_token_budget, tokens_used_today, token_reset_date` | Timezone for quiet hours |
| `ai_interactions` | Full schema | Task breakdown logging |

### New table needed
| Table | Why | Migration |
|-------|-----|-----------|
| `assignment_steps` | Persist generated task breakdown steps; allow step check-off | 0015 |

### Existing AI infrastructure reused
| Component | Location | Phase 9 Use |
|-----------|----------|-------------|
| `composeSystemPrompt` | `supabase/functions/_shared/system-prompts.ts` | task-breakdown Edge Function |
| `checkTokenBudget` / `resetBudgetIfNewDay` / `logInteraction` / `incrementTokens` | `supabase/functions/_shared/safety.ts` | task-breakdown Edge Function |
| `LogParams.feature` union | `lib/ai/safety.ts` + `_shared/safety.ts` | Add `'task_breakdown'` to both |
| `calmError` helper | `app/(app)/assignments/[id]/ai-tools-actions.ts` | requestTaskBreakdown server action |
| `markIntentionFired` | `app/(app)/dashboard/actions.ts` | F7 reminder dismissal |
| `DoneToday` | `app/(app)/dashboard/done-today.tsx` | Seed of F8 wins concept |

### Existing routes that are stubs (replace, don't create)
| Route | Current | Phase 9 |
|-------|---------|---------|
| `/break-down` | `ComingSoon` stub | Replace with actual F6 UI or redirect to `/assignments/[id]` with breakdown open |
| `/reminders` | `ComingSoon` stub | Replace with explanation page + link to dashboard |
| `/wins` | `ComingSoon` stub | Replace with actual F8 wins feed page |

---

## Notification Infrastructure Assessment

**Browser Push Notifications:**
- No service worker exists (confirmed: `public/` only contains `sounds/.gitkeep`)
- `next.config.ts` is empty (no PWA plugin like `next-pwa` or `serwist` currently configured — note: STATE.md Phase 1 mentions `next-pwa`/`serwist` but it is NOT in `package.json` or `next.config.ts` as of current state)
- No VAPID keys
- No push subscription table in schema
- iOS PWA push requires iOS 16.4+ and user opt-in — not reliable for target demographic

**Conclusion:** Browser push is NOT viable for Phase 9. In-app reminder panel (same pattern as EveningPlanning) is the correct approach. The feature spec (F14) originally called for push for time-based cues — this is a known scope reduction. The value proposition (won't let me forget) is still met by the dashboard panel which is the student's natural starting point.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run lib/reminders/` |
| Full suite command | `npm run test:run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| F6 | `isValidStep(step)` type guard — step has action + minutes ≤ 15 | unit | `npx vitest run lib/task-breakdown/` | No — Wave 0 |
| F6 | JSON parse robustness — extract array from prose-wrapped Claude output | unit | `npx vitest run lib/task-breakdown/parse.test.ts` | No — Wave 0 |
| F7 | `isQuietHours(date)` — returns true 20:00–06:59, false 07:00–19:59 | unit | `npx vitest run lib/reminders/reminder-rules.test.ts` | No — Wave 0 |
| F7 | `isWeekend(date)` — returns true Sat/Sun | unit | `npx vitest run lib/reminders/reminder-rules.test.ts` | No — Wave 0 |
| F7 | `shouldShowReminder()` — past-due bypasses quiet hours | unit | `npx vitest run lib/reminders/reminder-rules.test.ts` | No — Wave 0 |
| F8 | DoneToday renders null when count=0, text when count>0 | unit | `npx vitest run app/(app)/dashboard/done-today` | No — but component is trivial |
| F8 | Wins feed groups completions by day correctly | unit | `npx vitest run lib/wins/group-by-day.test.ts` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run lib/reminders/ lib/task-breakdown/`
- **Per wave merge:** `npm run test:run`
- **Phase gate:** Full suite green + `npm run tone-audit` passes before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `lib/task-breakdown/parse.test.ts` — covers F6 JSON parsing robustness
- [ ] `lib/reminders/reminder-rules.test.ts` — covers F7 quiet hours, weekend, escalation
- [ ] `lib/wins/group-by-day.test.ts` — covers F8 day-bucketing helper

---

## Environment Availability

Step 2.6: All dependencies are the existing installed stack. No external tools required.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI | DB migrations | Not checked (Supabase MCP available) | — | Supabase MCP `apply_migration` |
| Node / npm | Build, test | Assumed present (project is running) | — | — |
| Anthropic API key | task-breakdown Edge Function | Assumed present (all Phase 6–8 AI features work) | — | — |

No missing dependencies with no fallback.

---

## Open Questions

1. **Does `/break-down` become a standalone page or does F6 live entirely on `/assignments/[id]`?**
   - What we know: The stub at `/break-down` has no assignment context — it's just ComingSoon. The natural UX is a "Break this down" button on the assignment detail page.
   - What's unclear: Should `/break-down` redirect to assignments list, or be a standalone "paste any assignment text here" entry point?
   - Recommendation: Make F6 a component on the assignment detail page (like MathHelper). `/break-down` stub route becomes a redirect to `/assignments` or stays as a feature index page. This avoids duplicating the assignment context.

2. **Should reminder escalation show on the reminder panel even when no `assignment_intention` exists?**
   - What we know: F7 spec says "escalating only when past due." Some assignments may be past due but have no intention row.
   - What's unclear: Does the reminder panel query only from `assignment_intentions`, or also from `assignments.due_at` directly?
   - Recommendation: Query both. Past-due assignments with no intention should still surface in the reminder panel with a "This is still open" message. The reminder banner is separate from the intention system.

3. **Should wins feed show `submitted` assignments or `done` assignments?**
   - What we know: `task_signals` records `kind='completed'` when `to === 'submitted'` (confirmed in actions.ts). `done` state has no corresponding signal.
   - What's unclear: Students might consider an assignment "won" when they mark it `done`, before submission.
   - Recommendation: Key on `kind='completed'` (submitted) for wins — this is the actual achievement. The `DoneToday` dashboard component already uses this correctly.

---

## Sources

### Primary (HIGH confidence — direct codebase verification)
- `supabase/functions/math-step/index.ts` — Edge Function boilerplate template for task-breakdown
- `supabase/functions/_shared/safety.ts` — LogParams union, budget/log helpers
- `supabase/functions/_shared/system-prompts.ts` — composeSystemPrompt, CALM_TONE, all prompt fragments
- `app/(app)/assignments/[id]/ai-tools-actions.ts` — server action pattern, calmError helper
- `app/(app)/assignments/[id]/math-helper.tsx` — MathHelper component pattern for task-breakdown component
- `app/(app)/dashboard/actions.ts` — markIntentionFired, getEventIntentions — F7 dismissal pattern
- `app/(app)/dashboard/evening-planning.tsx` — client-side timezone pattern for quiet hours
- `app/(app)/dashboard/done-today.tsx` — seed of F8 wins concept
- `supabase/migrations/0001_init.sql` — task_signals schema confirmed
- `supabase/migrations/0009_inbox_and_time_layer.sql` — assignment_intentions schema confirmed
- `app/(app)/assignments/[id]/actions.ts` — task_signals insert on `submitted` confirmed
- `lib/ai/safety.ts` — Next.js-side LogParams, incrementTokens, etc.

### Secondary (MEDIUM confidence)
- `docs/spec/features.md` §F6 (task breakdown), §F7 (reminders), §F8 (wins), §F18 (worked examples) — feature spec cross-check
- `lib/features.ts` — confirmed F6/F7/F8 are stubs with paths `/break-down`, `/reminders`, `/wins`
- STATE.md Phase 8-03 — confirmed client-side timezone pattern, EveningPlanning dismissal pattern

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libs already installed, no new deps needed
- Architecture: HIGH — all patterns directly verified in codebase
- Pitfalls: HIGH for timezone/signal-kind/JSON parsing (directly observed in codebase); MEDIUM for formula scope creep (design judgment)
- Notification infrastructure: HIGH — confirmed no push SW exists

**Research date:** 2026-05-29
**Valid until:** 2026-07-01 (stable stack; no fast-moving dependencies)
