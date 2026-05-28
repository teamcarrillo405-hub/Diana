# Phase 2: Evidence-Review Gap Closure — Research

**Researched:** 2026-05-28
**Domain:** Next.js 15 App Router, Supabase Postgres, Web Speech API, accessibility profiles, assignment schema, scoring
**Confidence:** HIGH — all findings derived from direct codebase inspection

---

## Summary

The slice-1 codebase is substantially more complete than the gap list in STATE.md implies. A careful read of all files reveals that **migration 0005, the scorer, the checklist templates, the accessibility prefs surface, the breadcrumb, the onboarding flow, and the TtsButton are all already built and wired**. The Phase 2 gaps are real — but several requirements listed as "must build" are already done.

The remaining genuine gaps are: (1) the scorer does not read `task_signals` rows for recency decay — the momentum bump is purely status-based; (2) the past-due path in `TimeBar` shows a text reframe but has no "Create micro-task" button and no `parent_assignment_id` FK; (3) the state machine has no "pivot" back-path from `drafting` to `todo` with a note — the `canTransition` map does allow `drafting → todo` but there is no dedicated pivot UI or `pivot_note` column; (4) the `last_thought` breadcrumb shows inline on the detail page but there is no modal prompt on the `todo → drafting` transition; (5) Lexend is referenced in CSS but never loaded as a Next.js font — browsers fall back to system sans; (6) no `parent_assignment_id` FK exists on assignments; (7) `task_signals` has no time-indexed query in the scorer.

The planner's primary job is to fill these seven specific gaps, confirm or close any genuine acceptance-criteria misses from the REQUIREMENTS.md spec, and avoid re-building things that already exist.

**Primary recommendation:** Work gap-by-gap in dependency order: schema migrations first (GAP-03/06 additions, task_signals index), then scorer update (GAP-08), then UI closes (GAP-05 micro-task button, GAP-06 past-due micro-task, GAP-07 pivot modal, GAP-01 Lexend load). GAP-02 and GAP-04 are already complete; verify acceptance criteria before marking done.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GAP-01 | Accessibility profile — font size, line spacing, dyslexia font, TTS toggle, reduced motion, high contrast | Schema columns exist (migration 0005). Settings UI exists (`accessibility-prefs.tsx`). CSS classes exist (`globals.css`). `profileBodyClass` applied in layout. **Missing:** Lexend font never loaded via `next/font` or `<link>` — CSS class references it but browser falls back silently. Fix: add `next/font/google` Lexend import in `app/layout.tsx`. |
| GAP-02 | Onboarding flow — diagnoses, accommodations, school year, class load | **COMPLETE.** `/app/onboarding/page.tsx`, `form.tsx`, `actions.ts` all exist. Gate in `(app)/layout.tsx` redirects to `/onboarding` when `onboarded_at` is null. Middleware allows `/onboarding` as a non-`(app)` route. Smart defaults (dyslexia_font, tts_enabled, line_spacing) set on completion. Verify acceptance criteria match exactly before closing. |
| GAP-03 | Assignment schema extensions — kind, reading_load, writing_load, last_thought | **COMPLETE in DB.** Migration 0005 added all four columns. Types.ts reflects them. New assignment form and detail page surface them. `last_thought` saved via `saveBreadcrumb` server action. `pivot_note` column is **NOT present** — required by GAP-07 AC. One additional migration needed. |
| GAP-04 | Per-kind checklist templates | **COMPLETE.** `lib/checklists/templates.ts` exports `buildChecklist(kind, diagnoses)` with `BASE`, per-kind arrays, `DYSLEXIA_EXTRAS`, and `ADHD_EXTRAS`. Wired in `transitionAssignment` when entering `exporting` status. AC item about user-editable custom items (`assignment_checklists` table) is **NOT implemented** — the spec calls for it but the current code inserts from the template and allows toggling only. Decide: required in Phase 2 or defer to Phase 3? |
| GAP-05 | Time-blindness visualization on dashboard | **PARTIALLY COMPLETE.** `TimeBar` component exists and is rendered on the top task card. It shows a depleting bar with color transitions (emerald → sky → amber) and a human-readable label. **Missing per AC:** bar color spec in requirements is green >50% / amber 25–50% / red <25%; implementation uses emerald/sky/amber (no red, consistent with F20 no-red policy — this is actually correct). The formula in code is `(diffDays/7)*100` (7-day cap), not `(due_at - now)/(due_at - created_at)` as spec says. Requires a judgment call: keep 7-day sliding window (simpler, works without `created_at`) or implement spec formula. |
| GAP-06 | Past-due reframe | **PARTIALLY COMPLETE.** `TimeBar` replaces negative-time case with an amber callout box: "Past the due date. Smallest next step you can do in 5 min?" — no "past due" wording. **Missing:** "Create micro-task" button. `parent_assignment_id` FK not in schema. Server action to create a micro-task child assignment not written. The dashboard `assignments` list page (`/assignments/page.tsx`) still shows no past-due reframe. AC requires two distinct messages (done-but-not-submitted vs in-progress). |
| GAP-07 | Interrupt-recovery breadcrumb + pivot transition | **PARTIALLY COMPLETE.** `Breadcrumb` component and `saveBreadcrumb` action exist; `last_thought` displayed inline on detail page when status is `drafting` or `checking`. **Missing:** (a) modal prompt on `todo → drafting` transition (current: transition happens immediately, no where-will-you-start prompt); (b) "Pivot" button for `drafting → planned` with note — the state machine allows `drafting → todo` but there is no UI affordance labeled "Pivot" and no `pivot_note` column; (c) `pivot_note text` column (same migration as `parent_assignment_id`). |
| GAP-08 | Scorer reads task_signals + dyslexia-aware weighting | **PARTIALLY COMPLETE.** Scorer already does dyslexia-aware reading_load weighting (1.6× at reading_load >= 3) and extra_time_pct adjustment. **Missing:** task_signals recency. Scorer receives only `Assignment` type (no signals); the `+25` momentum bump fires on status `drafting`/`checking` only — ignores actual signal timestamps. Need to: (1) add query in dashboard to fetch recent signals per assignment, (2) pass signals into scorer, (3) implement 2-hour recency window + decay logic, (4) write unit tests in `lib/scoring/`. |
</phase_requirements>

---

## Codebase Patterns the Planner Must Respect

### Server / Client split
- Server Components fetch data via `createClient()` from `@/lib/supabase/server` (cookies-based)
- Client Components use `"use client"` and receive data as props; they never call Supabase directly
- Server Actions (`"use server"`) are co-located in `actions.ts` files per route; they validate with `zod`, call `createClient()`, and return `{ ok: true }` or `{ error: string }` or `{ redirect: string }`
- `revalidatePath` is called in server actions after mutations — always include relevant paths

### Zod validation pattern
All server action inputs go through `z.object(...).safeParse(input)`. Return early on `!parsed.success`.

### TypeScript types flow
- `lib/supabase/types.ts` is the single source of truth for DB types
- Custom union types (`AssignmentStatus`, `AssignmentKind`, `FontSize`, etc.) are exported from `types.ts`
- `ProfilePrefs` type in `lib/profile.ts` is a `Pick` from `Tables<"profiles">` — add new profile columns there

### Tailwind + CSS custom properties
- Colors are CSS custom properties (`--bg`, `--fg`, `--accent`, etc.) defined in `globals.css`
- Tailwind classes reference them via `bg-[rgb(var(--bg))]` or utility classes mapped to them
- Accessibility body classes (`font-size-large`, `dyslexia-font`, `reduced-motion`, `high-contrast`) are applied to the outermost `<div>` in `(app)/layout.tsx` via `profileBodyClass(profile)` — NOT to `<body>` or `<html>` (important: root layout does not have access to profile)
- New accessibility classes should follow the same pattern: CSS class in `globals.css`, bool in `profileBodyClass`

### State machine
`lib/state-machine/assignment.ts` defines allowed transitions. Any new transition (e.g., "pivot") must be added to the `TRANSITIONS` map, `STATUS_LABEL`, and `STATUS_HINT`. The `canTransition` guard is checked in `transitionAssignment` server action before any DB write.

### Migration pattern
Migrations are numbered files in `supabase/migrations/`. Each file is idempotent SQL. Phase 2 needs at minimum one new migration (0006) for `pivot_note` and `parent_assignment_id`. A second (0007) may be needed if a composite index on `task_signals(owner_id, assignment_id, occurred_at)` is added for scorer performance.

### Component location
- Shared components: `components/` (e.g., `TtsButton`, `VoiceTextarea`, `nav`)
- Route-specific components: co-located in the route folder (e.g., `Breadcrumb` in `assignments/[id]/`)
- No shadcn/ui installed yet — UI is hand-rolled Tailwind; follow existing button/pill/toggle patterns

### No external UI library
The project uses raw Tailwind with no component library (shadcn/ui is in the architecture doc as "base" but not installed). All interactive elements are hand-rolled. The `Toggle` and `Pill` patterns in `accessibility-prefs.tsx` are the project's own.

---

## Current Schema State (verified from migrations + types.ts)

### `profiles` (after migration 0005)
```
user_id uuid PK
display_name text
date_of_birth date
age_bracket text ('under_13'|'13_to_17'|'adult')
consent_ai boolean
consent_ai_at timestamptz
timezone text
onboarded_at timestamptz        ← migration 0005
diagnoses text[]                ← migration 0005
accommodations text[]           ← migration 0005
school_year smallint            ← migration 0005
extra_time_pct smallint         ← migration 0005
font_size text                  ← migration 0005
line_spacing text               ← migration 0005
dyslexia_font boolean           ← migration 0005
reduced_motion boolean          ← migration 0005
high_contrast boolean           ← migration 0005
tts_enabled boolean             ← migration 0005
created_at, updated_at
```

### `assignments` (after migration 0005)
```
id uuid PK
owner_id uuid FK
class_id uuid FK
rubric_id uuid FK nullable
title text
description text
due_at timestamptz
estimated_minutes int
difficulty smallint 1-5
status text                     (todo|drafting|checking|exporting|submitted|graded|abandoned)
submitted_at timestamptz
submission_url text
kind text                       ← migration 0005 (essay|lab|problem_set|presentation|test_prep|reading|other)
reading_load smallint 0-5       ← migration 0005
writing_load smallint 0-5       ← migration 0005
last_thought text               ← migration 0005
created_at, updated_at
MISSING: pivot_note text        ← needed for GAP-07
MISSING: parent_assignment_id   ← needed for GAP-06 micro-task
```

### `task_signals`
```
id bigserial PK
owner_id uuid FK
kind text (energy|completed|dismissed|started|context_switch)
value jsonb
assignment_id uuid FK nullable
occurred_at timestamptz
INDEX: (owner_id, occurred_at desc)
MISSING: index on (owner_id, assignment_id, occurred_at) for scorer join performance
```

### `submission_checklist`
```
id uuid PK
owner_id uuid FK
assignment_id uuid FK
label text
detail text
required boolean
checked boolean
position int
created_at
NOTE: no user-editable custom items — items are seeded from template and can only be toggled
```

### Tables NOT present (all deferred to later phases)
`assignment_checklists` (GAP-04 custom items — AC calls for it, not yet built), `readings`, `notes`, `drafts`, `cards`, `decks`, `timer_sessions`, `inbox_items`, `math_problems`.

---

## Implementation Approach per GAP

### GAP-01: Accessibility Profile (Lexend font load)

**Status:** 95% done. One missing piece: Lexend font is never loaded.

**What to do:**
1. In `app/layout.tsx`, import Lexend from `next/font/google`:
   ```typescript
   import { Lexend } from "next/font/google";
   const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend" });
   ```
2. Add `className={lexend.variable}` to `<html>` tag in root layout.
3. Update `globals.css` `.dyslexia-font` rule to use `var(--font-lexend)` as first font in stack.
4. Atkinson Hyperlegible is also available via `next/font/google` — optionally load as `--font-atkinson` for future use in F19/F6.

**Constraint:** Root layout does NOT have access to user profile (it's a static shell). The font variable must be always-loaded; the `.dyslexia-font` CSS class toggles whether the body actually uses it. This is the correct pattern already in use for CSS custom properties.

**Web Speech API (TTS):** Already implemented in `TtsButton` and wired on dashboard and assignment detail. Uses browser `SpeechSynthesis` — no server cost. `"use client"` + `useEffect` for hydration safety. No changes needed for Phase 2 basic TTS. Phase 4 (full TTS with word highlighting) is a separate feature.

**Confidence:** HIGH

---

### GAP-02: Onboarding Flow

**Status:** COMPLETE. Verify each acceptance criterion:

| AC | Status |
|----|--------|
| Multi-step onboarding after signup | Done — 3 fieldsets in one page (diagnoses, accommodations, year). The AC says 4 steps; code has 3 fieldsets on one page (not multi-page). Planner must decide: is single-page equivalent to 4-step? Recommend: yes, or add a 4th fieldset for class count. |
| Step 1: diagnoses | Done — 8 options including "Not sure" equivalent ("Other") |
| Step 2: accommodations | Done — 8 options |
| Step 3: school year | Done |
| Step 4: class load (1–8) | **NOT present** — AC specifies this, code does not have it. Small addition needed. |
| All skippable | Done — "Skip for now" sets onboarded_at with empty values |
| onboarded_at set on completion | Done |
| profiles.diagnoses, accommodations, school_year stored | Done |
| Only shown once | Done — `(app)/layout.tsx` redirects to `/onboarding` if `!onboarded_at` |

**What to add:** A 4th fieldset in `OnboardingForm` for class count (1–8 range input or chip picker). No schema change needed (class count is derivable from `classes` table; if a `class_load` hint is needed for personalization, a `class_count_hint smallint` column could be added to profiles, or it can be stored as a local state-only hint).

**Confidence:** HIGH

---

### GAP-03: Assignment Schema Extension

**Status:** COMPLETE in DB and UI. `pivot_note` is the only missing column (belongs in same migration as GAP-07).

**No work needed here except the one migration for pivot_note + parent_assignment_id.**

---

### GAP-04: Per-Kind Checklist Templates

**Status:** Core template logic COMPLETE. Missing: user-editable custom items (`assignment_checklists` table).

**The AC says:** "Student can add/remove items from the loaded template; customized state persists in `assignment_checklists` table."

The current implementation seeds `submission_checklist` rows from the template when transitioning to `exporting` — but doesn't allow adding/removing items (only toggling). This is a meaningful gap if we want the full AC.

**Recommendation for planning:** Add "add custom item" and "remove item" UI on the submit checklist page. No new table needed — `submission_checklist` already supports arbitrary rows; just need a form + server action to insert/delete rows. The `assignment_checklists` table mentioned in the AC spec appears to be identical to the existing `submission_checklist` table — don't create a duplicate. Implement against the existing table.

**Confidence:** HIGH

---

### GAP-05: Time-Blindness Visualization

**Status:** MOSTLY COMPLETE. TimeBar renders on dashboard top card with depleting bar and color transitions.

**The formula discrepancy:**
- Spec says: `(due_at - now) / (due_at - created_at)` clamped to [0, 1]
- Code does: sliding 7-day window (`diffDays / 7 * 100`)

The spec formula is more accurate (represents actual % of available time remaining) but requires `created_at` to be fetched for the top assignment. The 7-day window gives no signal for tasks created with < 7 days until due.

**Recommendation:** Update dashboard query to also select `created_at`. Pass both `dueAt` and `createdAt` props to `TimeBar`. Update the bar calculation to use the spec formula. Falls back to 7-day window if `createdAt` is missing.

**Bar colors:** The spec says green/amber/red. The project has a no-red policy (F20). TimeBar correctly uses amber instead of red for <24h. This is intentional and correct — the spec's "red" was written before the F20 constraint was added. Do not add red. The existing color scheme is correct.

**Confidence:** HIGH

---

### GAP-06: Past-Due Reframe

**Status:** PARTIAL. TimeBar shows past-due reframe text. Missing: "Create micro-task" button; `parent_assignment_id` FK; two distinct messages by assignment status.

**What to build:**
1. **Migration 0006:** Add `parent_assignment_id uuid references assignments(id) on delete set null` to `assignments`.
2. **Server action:** `createMicroTask({ originalId, title })` — inserts a new assignment with `title = "5-min start: [original title]"`, `estimated_minutes = 5`, `kind = 'other'`, `parent_assignment_id = originalId`.
3. **TimeBar update:** Accept `assignmentStatus` prop. When past due:
   - `done`/`checking`/`exporting`: show "Still open — want to take a next step?"
   - `todo`/`drafting`: show "Still possible — start with 5 minutes?" + "Create a 5-min task" button
4. **Dashboard page:** The `top` card already has TimeBar. Pass `a.status` and `a.title` to enable the button.
5. **Assignments list page:** Currently shows no past-due reframe. Add a status indicator or small callout for past-due open items (not required by AC explicitly but consistent with spec intent).

**Important:** No "past due" text anywhere in UI strings. This is already honored in TimeBar.

**Confidence:** HIGH

---

### GAP-07: Interrupt-Recovery Breadcrumb + Pivot Transition

**Status:** PARTIAL. Breadcrumb component exists and saves `last_thought`. Missing: (a) modal/prompt on entering `drafting`, (b) "Pivot" button with note, (c) `pivot_note` column.

**What to build:**

**a) "Where will you start?" prompt on todo→drafting transition:**
Options for implementation:
- Option A (inline, simpler): After clicking "Start working," scroll/focus the Breadcrumb textarea and show a "Tell Diana where you'll start — one line" prompt above it. No modal.
- Option B (modal): `StatusButtons` triggers a confirmation sheet. More complex, requires a modal component.
- **Recommendation:** Option A. The Breadcrumb is already rendered when status is `drafting`. On transition, scroll to it. A `?prompt=true` URL param can be added so the page renders with the Breadcrumb highlighted/focused on arrival.

**b) "Pivot" button:**
Add to the assignment detail page when status is `drafting`. The button opens an inline form (not a separate page) asking "What changed?" (free text, skippable). Submits a new server action `pivotAssignment({ id, note })` that:
1. Validates `canTransition('drafting', 'todo')` — already allowed in state machine.
2. Saves `pivot_note` to the assignment.
3. Transitions status to `todo`.

**c) Migration 0006** (same file as GAP-06): Add `pivot_note text` to assignments.

**d) Display returning breadcrumb:** Assignment detail page already shows `Breadcrumb` for `drafting`/`checking`. When `last_thought` is not null and status is `drafting`, the existing code already renders the prior value. The "You left off here: [last_thought]" callout with "Still accurate? Update" link is a minor enhancement to the existing Breadcrumb component.

**Confidence:** HIGH

---

### GAP-08: Scorer Reads task_signals + Dyslexia-Aware Weighting

**Status:** PARTIAL. Dyslexia weighting (1.6×) and extra_time_pct already in scorer. task_signals recency NOT implemented.

**What to build:**

**Scorer signature extension:**
```typescript
// lib/scoring/next-five-minutes.ts
export type RecentSignal = {
  assignment_id: string;
  occurred_at: string; // ISO
};

export function rankAssignments(
  assignments: Assignment[],
  signals: RecentSignal[],  // ADD THIS
  now: Date,
  energy: EnergyLevel,
  profile: ScorerProfile,
): ScoredAssignment[]
```

**Dashboard page update:**
```typescript
// Fetch signals for assignments in scope, last 4 hours
const { data: signals } = await supabase
  .from("task_signals")
  .select("assignment_id, occurred_at")
  .eq("owner_id", user.id) // needs user.id
  .in("kind", ["started", "completed"])
  .gte("occurred_at", new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString())
  .order("occurred_at", { ascending: false });
```

**Scorer logic:** In the `score` function, replace status-based momentum check with signal-based recency:
```typescript
// Instead of: if (a.status === "drafting" || a.status === "checking") { s += 25; }
const lastSignal = signals.find(sig => sig.assignment_id === a.id);
if (lastSignal) {
  const ageHours = (now.getTime() - new Date(lastSignal.occurred_at).getTime()) / 36e5;
  if (ageHours < 2) {
    s += 25; reasons.push("recently worked on");
  } else if (ageHours < 8) {
    s += 10; reasons.push("worked on earlier today");
  }
}
```

**Unit tests (`lib/scoring/next-five-minutes.test.ts`):**
The AC requires unit tests. Need to create a test file. Project uses TypeScript but no test runner is configured in `package.json` yet. Architecture doc says Vitest. Need to add `vitest` as devDependency and create `vitest.config.ts`.

**Confidence:** HIGH for scorer logic, MEDIUM for test scaffolding (no test runner configured yet — needs setup)

---

## Migration Plan

### Migration 0006: GAP-06/07 additions
```sql
-- parent_assignment_id for micro-task chaining (GAP-06)
alter table public.assignments
  add column parent_assignment_id uuid references public.assignments(id) on delete set null;

-- pivot_note for ADHD pivot transition (GAP-07)
alter table public.assignments
  add column pivot_note text;
```

### Migration 0007 (optional, recommended): task_signals compound index
```sql
-- Improves scorer join performance when fetching recent signals per assignment
create index if not exists task_signals_owner_assignment_time_idx
  on public.task_signals(owner_id, assignment_id, occurred_at desc)
  where kind in ('started', 'completed');
```

Both RLS policies for `assignments` already cover new columns — no RLS changes needed (they use `owner_id =` check, not column-specific).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TTS | Custom audio pipeline | Browser `SpeechSynthesis` (already used) | Zero cost, offline, no key — Phase 4 adds cloud TTS |
| STT | Custom recognition | Browser `SpeechRecognition` (already used in `VoiceTextarea`) | Same — Phase 3 adds Whisper |
| Font loading | `<link>` tags or manual CSS imports | `next/font/google` with CSS variable | Subsetting, preloading, no layout shift |
| Zod validation in actions | Manual type checks | Zod `.safeParse()` (already used everywhere) | Consistent, typed |
| Time formatting | `toLocaleDateString` | `date-fns` (already in deps as `formatDueAt` in `lib/format.ts`) | Already present, consistent |
| Modal/overlay | Custom React portal | Inline conditional render or CSS visibility toggle | No modal library in project — keep it simple for Phase 2 |

---

## Common Pitfalls

### Pitfall 1: Applying accessibility classes to wrong DOM node
**What goes wrong:** Adding `profileBodyClass` to `<body>` in root layout (which doesn't have profile data) instead of the authenticated layout's wrapper div.
**Why it happens:** Root `app/layout.tsx` is a static shell with no auth access.
**How to avoid:** The existing pattern is correct — `profileBodyClass` is applied to the `<div className={...}>` in `(app)/layout.tsx`. Never move it to root layout. New classes must follow this same pattern.

### Pitfall 2: Lexend declared but not loaded
**What goes wrong:** `.dyslexia-font` CSS rule lists Lexend first, but the font file is never fetched — browser silently falls back to Verdana.
**Why it happens:** Next.js `next/font/google` must explicitly import and expose the font variable; merely naming it in CSS doesn't trigger a download.
**How to avoid:** Add `next/font/google` import in `app/layout.tsx`, inject CSS variable onto `<html>`, reference `var(--font-lexend)` in the CSS rule.

### Pitfall 3: Web Speech API on server-side render
**What goes wrong:** Calling `window.speechSynthesis` or `SpeechRecognition` at module level causes build errors.
**Why it happens:** Next.js App Router may execute component code on the server.
**How to avoid:** Already handled correctly in `TtsButton` and `VoiceTextarea` with `"use client"` + `useEffect(() => { setSupported("speechSynthesis" in window); }, [])`. Any new TTS/STT usage must follow this exact pattern.

### Pitfall 4: Scorer called without task_signals in existing consumers
**What goes wrong:** After extending `rankAssignments` signature to accept `signals`, the dashboard call works, but if there are other callers (e.g., future break-down page) they will break.
**Why it happens:** TypeScript enforces the new required parameter.
**How to avoid:** Give `signals` a default value `signals: RecentSignal[] = []` to maintain backwards compatibility. Document the intent.

### Pitfall 5: TimeBar is a Client Component rendered in a Server Component
**What goes wrong:** TimeBar calls `Date.now()` at the module level in a server component, which would be consistent, but it's actually a client component that renders in the browser — that's fine for `Date.now()`.
**Why it happens:** Confusion about component boundary.
**How to avoid:** TimeBar uses no `"use client"` directive currently — it's a Server Component. Calling `Date.now()` in a Server Component is fine but the value is static at render time. When switching to spec formula (using `created_at`), the bar won't update without a client re-render. For Phase 2, this is acceptable (dashboard is not a real-time view). If live updating is needed, add `"use client"` and a 1-minute interval.

### Pitfall 6: State machine `drafting → todo` vs. `todo` semantics
**What goes wrong:** The pivot feature transitions `drafting → todo`, but `todo` means "not started" to the student. The label "Pick it back up" appears in status buttons for `abandoned → todo`. A pivot from drafting should land at `todo` semantically but feel different.
**How to avoid:** Keep the state machine as-is (transition is allowed). The "Pivot" button UI can show copy like "Pause and revisit" rather than exposing the internal `todo` label. The `pivot_note` column captures the context.

### Pitfall 7: `submission_checklist` re-seeded on repeated `exporting` visits
**What goes wrong:** If a student goes `checking → exporting → checking → exporting`, the checklist is only seeded once (`if (!count)`). This is correct behavior, but if the checklist was seeded before `kind` was set (old assignments), the items will be generic.
**How to avoid:** No change needed — new assignments always have `kind` set (defaulting to `other'). Document that checklist items can't be re-generated once seeded (by design).

---

## Architecture Patterns

### Authentication gate for onboarding
The existing gate is: `(app)/layout.tsx` checks `!profile.onboarded_at` → redirect to `/onboarding`. The middleware allows the `/onboarding` path without login-redirect because it's NOT inside the `(app)` route group. This is clean and correct.

### Server Action error pattern
```typescript
export async function myAction(input: Input) {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { error } = await supabase.from("...").update(...);
  if (error) return { error: error.message };
  revalidatePath("...");
  return { ok: true };
}
```

### Client Component state pattern
```typescript
"use client";
const [pending, startTransition] = useTransition();
const [error, setError] = useState<string | null>(null);

function handleAction() {
  setError(null);
  startTransition(async () => {
    const result = await myAction(...);
    if (result?.error) { setError(result.error); return; }
    router.refresh();
  });
}
```

### Inline "micro-form" pattern (for pivot modal)
Rather than a separate dialog/modal component, use conditional rendering inline within the detail page:
```tsx
{showPivot && (
  <section className="space-y-2 rounded-2xl border border-border bg-card p-5">
    <p className="text-sm font-medium">What changed?</p>
    <textarea ... />
    <div className="flex gap-2">
      <button onClick={submitPivot}>Pause this</button>
      <button onClick={() => setShowPivot(false)}>Cancel</button>
    </div>
  </section>
)}
```

---

## Recommended Implementation Order

This ordering respects dependencies and groups related work:

**Wave 1 — Schema (no UI risk):**
1. Migration 0006: `pivot_note`, `parent_assignment_id`
2. Migration 0007: task_signals compound index
3. Update `types.ts` to reflect new columns

**Wave 2 — Scorer (pure TS, testable in isolation):**
4. Add Vitest + `vitest.config.ts` to devDependencies
5. Extend `rankAssignments` signature with `signals` parameter
6. Implement 2-hour recency window + decay logic
7. Write unit tests: dyslexic + reading heavy, non-dyslexic + same, recent signal, old signal
8. Update dashboard page to fetch + pass recent signals

**Wave 3 — Low-risk UI additions:**
9. Load Lexend via `next/font/google` in `app/layout.tsx`
10. Add class-count fieldset to OnboardingForm (GAP-02 completion)
11. Fix TimeBar formula to use `created_at / due_at` ratio; pass `createdAt` prop from dashboard
12. Add "add item" / "remove item" to submit checklist UI (GAP-04 custom items)

**Wave 4 — Past-due + pivot (new UI logic):**
13. Add `createMicroTask` server action
14. Update `TimeBar` to accept `status` prop and render micro-task button
15. Add "Pivot" button to assignment detail page + inline pivot form + `pivotAssignment` action
16. Update `canTransition` label/hint for pivot path (optional, UX polish)
17. Add scroll-to/focus on Breadcrumb when entering `drafting` from `todo`

---

## Standard Stack

### Core (already in project)
| Library | Version | Purpose |
|---------|---------|---------|
| next | 15.5.18 | App Router, RSC, Server Actions |
| react / react-dom | 19.0.0 | UI |
| @supabase/ssr + supabase-js | 0.10.3 / 2.106.2 | Auth, DB, RLS |
| tailwindcss | 3.4.15 | Styling |
| zod | 3.23.8 | Runtime validation |
| lucide-react | 0.460.0 | Icons |
| date-fns | 4.1.0 | Date formatting |
| typescript | 5.7.2 | Type safety |

### To Add in Phase 2
| Library | Version | Purpose | Decision |
|---------|---------|---------|----------|
| vitest | ^3.x | Unit testing (scorer) | Required by GAP-08 AC |
| @vitejs/plugin-react | ^4.x | Vitest React support | Required with vitest |
| next/font (built-in) | — | Lexend font loading | Zero install cost — already in next |

### Font Loading
Lexend is available via `next/font/google`. No additional package needed. Load with `subsets: ["latin"]` and `variable: "--font-lexend"` to integrate with existing CSS variable pattern.

```bash
# No npm install needed — next/font/google is bundled with Next.js
# Add vitest for unit tests:
npm install -D vitest @vitejs/plugin-react
```

---

## Environment Availability

Step 2.6: SKIPPED — Phase 2 has no new external service dependencies. All work is:
- Next.js App Router (existing)
- Supabase (existing)
- Browser Web Speech API (client-only, already used)
- Google Fonts via `next/font/google` (build-time CDN pull, no runtime dependency)

---

## Validation Architecture

Config `workflow.nyquist_validation: true` — section required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (not yet installed — Wave 0 gap) |
| Config file | `vitest.config.ts` — does not exist yet |
| Quick run command | `npx vitest run lib/scoring/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GAP-08 | Dyslexic profile + reading_load >= 3 inflates effective_minutes by 1.5× | unit | `npx vitest run lib/scoring/next-five-minutes.test.ts` | ❌ Wave 0 |
| GAP-08 | Non-dyslexic profile + same assignment: no inflation | unit | same | ❌ Wave 0 |
| GAP-08 | Signal within 2h → +25 momentum | unit | same | ❌ Wave 0 |
| GAP-08 | Signal older than 8h → no bump | unit | same | ❌ Wave 0 |
| GAP-05 | TimeBar with created_at: bar % = (due - now)/(due - created) | unit | `npx vitest run components/time-bar.test.ts` | ❌ Wave 0 |
| GAP-06 | createMicroTask: inserts assignment with parent_assignment_id set | integration/manual | manual Supabase inspect | manual |
| GAP-07 | pivotAssignment: saves pivot_note + transitions status to todo | unit | `npx vitest run app/assignments/[id]/actions.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run lib/scoring/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` — framework config; install: `npm install -D vitest @vitejs/plugin-react`
- [ ] `lib/scoring/next-five-minutes.test.ts` — covers GAP-08 scorer unit tests (4 cases)
- [ ] `components/time-bar.test.ts` — covers GAP-05 formula (optional but recommended)

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Hardcoded 6-item checklist | Per-kind + per-diagnosis template via `buildChecklist()` | Already done |
| Status-based momentum bump | Signal-recency decay (Phase 2 target) | Needs implementation |
| "Due in N days" string only | TimeBar depleting visual | Already done, needs formula fix |
| No interrupt-recovery | `last_thought` breadcrumb | Exists; needs modal prompt on enter |

---

## Open Questions

1. **TimeBar formula: spec formula vs. 7-day window**
   - What we know: spec says `(due_at - now)/(due_at - created_at)`, code uses 7-day cap
   - What's unclear: spec formula requires `created_at` in the dashboard query; some tasks may be created very close to due date (making bar immediately near-empty)
   - Recommendation: implement spec formula with a floor: if `(due_at - created_at) < 1 hour`, use 7-day window as fallback

2. **GAP-04 custom checklist items: use existing `submission_checklist` table or create `assignment_checklists`?**
   - What we know: `submission_checklist` already holds all the data fields needed; the spec mentions `assignment_checklists` as a new table
   - What's unclear: was the spec written before `submission_checklist` existed?
   - Recommendation: use `submission_checklist` directly — add INSERT/DELETE server actions on it; do not create a duplicate table

3. **Class load hint in onboarding: store or compute?**
   - What we know: onboarding AC says "How many classes do you have?" (1–8 picker)
   - What's unclear: does it need to be stored in `profiles`, or is it just used during onboarding to set initial state?
   - Recommendation: add `class_count_hint smallint` to profiles in migration 0006 (same file). Low cost, enables future "Sunday night cliff" detection.

4. **Vitest with Next.js 15 + App Router Server Actions**
   - What we know: testing Server Actions in isolation requires mocking `createClient` and `revalidatePath`
   - What's unclear: exact mock setup for `@supabase/ssr` in Vitest
   - Recommendation: For Phase 2, test only the pure scoring functions (no Supabase calls). Server action tests (GAP-07 pivot) can be manual or deferred to a future integration test wave.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read of all files listed above — every finding is from actual code, not assumed
- `supabase/migrations/0001–0005` — verified schema state
- `lib/supabase/types.ts` — verified TypeScript shape of all tables
- `lib/scoring/next-five-minutes.ts` — verified scorer logic
- `lib/checklists/templates.ts` — verified template completeness
- `app/(app)/layout.tsx` — verified onboarding gate
- `app/globals.css` — verified CSS custom properties and accessibility classes

### Secondary (MEDIUM confidence)
- `next/font/google` pattern: standard Next.js font loading — well-established, no verification needed beyond "it exists in the framework"
- Vitest + Next.js App Router compatibility: widely used combination as of 2025; `@vitejs/plugin-react` provides JSX transform support

---

## Metadata

**Confidence breakdown:**
- Current schema state: HIGH — read from migration files and types.ts directly
- What is already built: HIGH — read from actual source files
- What is missing: HIGH — verified by absence in files
- Implementation approach: HIGH — follows established patterns in the codebase
- Vitest setup: MEDIUM — standard but not verified against this specific Next.js 15 version combination

**Research date:** 2026-05-28
**Valid until:** 2026-06-28 (schema is stable; scorer logic unlikely to change)
