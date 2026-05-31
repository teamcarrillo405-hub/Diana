# Research: AI Transparency, Parent/Teacher Share, Dark Mode, Vocabulary Hover

**Researched:** 2026-05-30
**Domain:** AI authorship surface, share-link architecture, theme system, vocabulary Edge Function
**Confidence:** HIGH — all findings drawn directly from the codebase; no external unknowns

---

## Project Constraints (from CLAUDE.md)

- All Claude API calls MUST live in `supabase/functions/` — never call `api.anthropic.com` from Next.js server actions or the browser.
- Every Edge Function MUST call `resetBudgetIfNewDay` + `checkTokenBudget` before the Claude call.
- Every Edge Function MUST call `composeSystemPrompt`.
- Fire-and-forget `logInteraction` + `incrementTokens` — never blocks response.
- New feature names MUST be added to the `feature` union in `lib/ai/safety.ts` AND its Deno mirror `supabase/functions/_shared/safety.ts`.
- No red color for errors — amber only.
- No shame/scolding words — `npm run tone-audit` enforces this.
- Haiku 4.5 for cheap/fast ops; Sonnet 4.6 for quality ops.
- Path alias `@/` maps to the repo root.

---

## Feature Group 1: AI Transparency (AI-LITERACY-01, AI-LITERACY-02)

### Schema discovered — `0012_ai_feature_core.sql`

The `ai_interactions` table (the "authorship log") has these columns:

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `owner_id` | uuid | FK → `auth.users`, cascade delete |
| `assignment_id` | uuid | FK → `assignments`, set null on delete; nullable |
| `feature` | text | `'math_step' \| 'writing_aid' \| 'citation_gen' \| 'reading_scaffold' \| 'transcribe_note'` |
| `model` | text | `'claude-haiku-4-5'` or `'claude-sonnet-4-6'` |
| `prompt_summary` | text | <= 200 chars, never PII-heavy |
| `tokens_used` | integer | |
| `created_at` | timestamptz | |

RLS: owner-only full access. Indexed on `(owner_id, created_at DESC)` and `(assignment_id)`.

There is no separate `authorship_log` table — `ai_interactions` IS the authorship log.  The existing `/settings/ai-history` page already queries it and renders a table of all interactions with CSV export. This is the global view.

### What is NOT yet built (the gap these features close)

1. **Assignment-scoped log**: The `/assignments/[id]` page does not show which AI features were used for that specific assignment. The `ai_interactions_assignment_idx` index exists for exactly this query — it has never been wired to a UI component.
2. **In-context AI-explained tooltips**: No "(i)" button next to AI-generated content explaining what Claude did.
3. **Onboarding AI literacy step**: The 4-step `OnboardingForm` has no step explaining what AI does.

### Recommended implementation approach

Surface the per-assignment authorship log as a collapsible "AI used on this assignment" section at the bottom of the assignment detail page (`app/(app)/assignments/[id]/page.tsx`). The server component already fetches the assignment — add a second query for `ai_interactions WHERE assignment_id = id` and pass the result to a new `<AuthorshipPanel rows={...} />` client component. Keep it collapsed by default (a `<details>` element or a shadcn Collapsible) so it doesn't distract during work. The AI-explained tooltip on each AI feature component (MathHelper, WritingAid, etc.) is an `(i)` button that opens a one-line sheet: "Claude helped here — [feature label]. You can see the full log at the bottom of this page."

The onboarding AI literacy step is a 5th step in `OnboardingForm`, rendered only when `consent_ai` was set to true earlier in the flow (or as an always-visible step right before the submit button if AI consent is not a separate step in onboarding). Content: plain language, no technical jargon, calm and empowering. The step does not block the submit action — it is informational only.

### Key technical decisions

**Decision 1 — Collapsible vs. always-visible authorship panel.**
Always-visible is noisy for most visits. Use `<details>` / Collapsible pattern with the count as a label: "AI used 3 times on this assignment." The count creates a natural hook; zero-count hides the section entirely.

**Decision 2 — Tooltip vs. inline badge.**
A tooltip (hover/click) on the AI-feature component header is better than a persistent badge. The badge adds visual weight to every page load; the tooltip is opt-in. For ADHD users, hover tooltips can auto-trigger; use click-only (matching the vocabulary hover decision below). A small `(i)` icon button next to each AI section heading is sufficient.

**Decision 3 — Onboarding step position.**
Insert the AI literacy step as step 5 (after class count), visible only when `consent_ai` is true. If the user skipped AI consent during signup, skip this step entirely. The step is a read-only card (no user input required) with a "Got it" button that just proceeds.

**Decision 4 — Copy must pass tone-audit.**
Never use: "Claude did this for you", "AI wrote this". Use: "Claude helped you think through this", "Diana used AI to scaffold your reading." Frame all copy around scaffolding and support, not replacement.

### DB schema changes needed

None. The `ai_interactions` table has all needed columns. The per-assignment query is:
```sql
SELECT feature, model, created_at, tokens_used, prompt_summary
FROM ai_interactions
WHERE assignment_id = $1
ORDER BY created_at ASC;
```

### File map

| Action | File |
|--------|------|
| Create | `app/(app)/assignments/[id]/authorship-panel.tsx` — collapsible per-assignment AI log |
| Modify | `app/(app)/assignments/[id]/page.tsx` — add second DB query + `<AuthorshipPanel>` at page bottom |
| Modify | `app/(app)/assignments/[id]/math-helper.tsx` (or similar) — add `(i)` tooltip to AI section headings |
| Modify | `app/(app)/assignments/[id]/writing-aid.tsx` — same `(i)` pattern |
| Modify | `app/(app)/assignments/[id]/citation-tool.tsx` — same `(i)` pattern |
| Modify | `app/(app)/assignments/[id]/reading-panel.tsx` — same `(i)` pattern |
| Modify | `app/onboarding/form.tsx` — add 5th step (AI literacy card) |
| No change | `app/(app)/settings/ai-history/` — already shows global log; no changes needed |

### Traps and pitfalls

**Pitfall 1 — Querying ai_interactions inside the Server Component.**
The assignment detail page is a Server Component. Do not pass a second Supabase client instance to a client component to load the log. Fetch in the server component alongside the assignment query, then pass the serialized rows as a prop to `<AuthorshipPanel>`.

**Pitfall 2 — Shame language in onboarding step.**
Do not write: "Diana will show you when AI helped." Write: "When Diana uses AI to support you, you can always see exactly what it did — and share that with your teacher." The subject is always "Diana supports you," never "AI did this for you."

**Pitfall 3 — Tooltip accessibility.**
An `(i)` icon button must have `aria-label="What did AI do here?"` and the tooltip must be dismissible by Escape key. Use shadcn `Tooltip` if the component already has shadcn; otherwise a plain `popover` pattern.

**Pitfall 4 — onboarding form currently has a single submit action.**
The 5th step must NOT add a new required form field. The `saveOnboarding` action signature must not change. The literacy step is purely informational; the Submit button on step 4 (class count) advances to a new step 5 that only has a "Continue" button, then submits. This requires local step state in the form component.

### Estimated test coverage

- Unit test: `authorship-panel` renders correct count and collapsed state
- Unit test: zero-interaction case hides the section
- Unit test: `featureLabel()` mapping covers all known `feature` values including new ones
- Integration smoke: Assignment detail page query includes `ai_interactions` join

---

## Feature Group 2: Parent Share (F13-share) + Teacher Snapshot (F14-snapshot)

> Note: The existing `09-RESEARCH.md` already defines F13 as the Pomodoro timer and F14 as the intentions feature (from `0009_inbox_and_time_layer.sql`). These new share features should be named distinctly to avoid ID collision — recommend `SHARE-01` (parent weekly summary) and `SHARE-02` (teacher IEP/504 snapshot).

### What data exists for these summaries

From the schema:

**For a parent weekly summary (SHARE-01):**
- `assignments` — title, due_at, status (submitted/done), kind, estimated_minutes
- `assignment_time_log` — elapsed_minutes per session (actual study time)
- `task_signals WHERE kind = 'completed'` — completion events
- `ai_interactions` — count and feature types (for "AI was used X times this week")
- `profiles` — display_name, school_year

**For a teacher IEP/504 snapshot (SHARE-02):**
- `profiles` — diagnoses, accommodations, extra_time_pct, font_size, line_spacing, dyslexia_font, tts_enabled
- `classes` — name, ai_mode per class
- `assignment_type_estimates` — calibrated time per assignment kind (student's real measured time)
- `profiles.extra_time_pct` — the IEP extra time percentage

### Recommended implementation approach

Implement share links as a **short UUID stored in a new `share_links` table**, with a corresponding RLS-exempt read route. When a student generates a share link, a row is inserted into `share_links` with a random `token` (UUIDv4), `owner_id`, `share_type` ('parent_weekly' or 'teacher_snapshot'), and `expires_at` (7 days for parent; 30 days for teacher). The public route `/share/[token]` is a Next.js App Router route outside the `(app)` group — it has no auth requirement, reads only through the service-role client using the token as a lookup key, and renders a read-only page. The student revokes by deleting the row.

Do NOT use Supabase signed URLs (those are for Storage objects, not arbitrary page content). Do NOT use email delivery in v1 — link-only is sufficient and avoids email infrastructure complexity.

### DB schema changes needed

New migration `0015_share_links.sql`:

```sql
create table public.share_links (
  id          uuid primary key default gen_random_uuid(),
  token       uuid not null unique default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  share_type  text not null check (share_type in ('parent_weekly', 'teacher_snapshot')),
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz           -- null = active
);

-- RLS: owner can CRUD their own links
alter table public.share_links enable row level security;

create policy "share_links: owner full access"
  on public.share_links
  for all
  using  (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- No RLS-exempt read policy needed — public route reads via service-role key
-- Service-role reads the row by token, then reads owner's data server-side

create index share_links_token_idx on public.share_links (token)
  where revoked_at is null;
create index share_links_owner_idx on public.share_links (owner_id);
```

**Why service-role on the public route?** The `/share/[token]` page is a Server Component. It cannot use the cookie-based `lib/supabase/server.ts` client (no auth cookie present). It must use the service-role key to look up the share record by token, verify it is not revoked/expired, then fetch the owner's data. The service-role client must only be used inside Server Components or Edge Functions — never in the browser.

### Key technical decisions

**Decision 1 — Token length.**
UUIDv4 tokens are 122 bits of entropy — unguessable in practice. No need for a custom shorter token.

**Decision 2 — Expiry enforcement.**
Check `expires_at > now()` and `revoked_at IS NULL` in the server component before rendering. If expired, show a neutral "This link is no longer active" page.

**Decision 3 — Parent weekly summary content.**
Show: this week's completed assignments (Mon–Sun UTC), upcoming due dates in the next 7 days, total tracked study time this week. Do NOT show: AI interaction details, prompt summaries, specific text the student wrote. The summary is about effort and completion — not surveillance.

**Decision 4 — Teacher snapshot content.**
Show: student's first name (display_name), accommodations on file, extra time percentage, dyslexia font + TTS preferences, AI policy per class (green/yellow/red), and calibrated time estimates per assignment kind. Frame this as "what Diana knows about how this student works best." Do NOT expose diagnoses array directly — map them to accommodation-neutral language ("Uses extended-time accommodation") or show only the accommodations list.

**Decision 5 — Consent toggle design.**
One toggle per `share_type`. Creating a link IS the consent action. The settings UI shows the current link with a copy button and a "Revoke" button. Revoking sets `revoked_at = now()`. No confirmation dialog needed — the student can generate a new link immediately.

**Decision 6 — No email infrastructure in v1.**
The link is shown in Settings. The student copies it and sends it however they want (text, email, printed). This is intentional: Diana does not need parent/teacher contact info.

### File map

| Action | File |
|--------|------|
| Create | `supabase/migrations/0015_share_links.sql` |
| Create | `app/share/[token]/page.tsx` — public read-only render (no auth layout) |
| Create | `app/share/[token]/parent-weekly.tsx` — parent summary renderer |
| Create | `app/share/[token]/teacher-snapshot.tsx` — teacher IEP/504 renderer |
| Create | `app/(app)/settings/share-links.tsx` — share link management UI |
| Modify | `app/(app)/settings/page.tsx` — add `<ShareLinks />` section |
| Create | `app/(app)/settings/share-actions.ts` — server actions: createShareLink, revokeShareLink |
| Create | `lib/share/summary-queries.ts` — pure query helpers (weekly data, snapshot data) |

### Traps and pitfalls

**Pitfall 1 — Using cookie-based Supabase client on the public route.**
`lib/supabase/server.ts` uses `cookies()` — it will throw on a route with no auth session. The `/share/[token]` page must instantiate a service-role client directly using `createClient(url, serviceRoleKey)`. Keep this isolated to that one file.

**Pitfall 2 — Exposing too much on the teacher snapshot.**
The IEP/504 snapshot must never show AI prompt summaries, assignment descriptions, or assignment titles. It is a *capability profile* not a *surveillance log*. Sensitive: diagnoses text (show accommodations only, not diagnosis codes), specific assignment content.

**Pitfall 3 — RLS bypass.**
Because the public route reads via service-role, it can read ANY owner's data if the token lookup is done incorrectly. Always query `share_links` first by token, get `owner_id`, then scope ALL subsequent queries to that `owner_id` explicitly. Never trust a query parameter for the owner ID.

**Pitfall 4 — `app/share/` must be outside `(app)` group.**
The `(app)` layout enforces auth (`redirect('/login')`). The share route must live at `app/share/[token]/` with its own minimal layout (or no layout), not inside `app/(app)/`.

**Pitfall 5 — Weekly boundary definition.**
"This week" must be defined clearly. Use Monday 00:00 UTC to Sunday 23:59 UTC. Document this in the query helper so both parent view and teacher snapshot use the same boundary.

**Pitfall 6 — Tone on parent summary.**
No deficit framing. Do not show "assignments NOT completed" or "overdue items." Show: "completed this week," "coming up." If there is nothing to show, say "Nothing recorded this week yet."

### Estimated test coverage

- Unit test: `createShareLink` returns a valid token and correct `expires_at`
- Unit test: expired/revoked token shows the inactive page, not an error
- Unit test: weekly boundary query (Mon–Sun) returns correct assignments
- Unit test: teacher snapshot query does NOT include diagnoses raw values
- Integration smoke: `/share/[token]` renders without crashing with valid token

---

## Feature Group 3: Dark Mode + Vocabulary Hover

### Dark mode — current state

**`tailwind.config.ts` does NOT have `darkMode: 'class'` set.** The default Tailwind v3 dark mode strategy is `media` (responds to `prefers-color-scheme`). However, `app/globals.css` already defines a `@media (prefers-color-scheme: dark)` block with full dark-mode CSS custom property overrides for `--bg`, `--fg`, `--muted`, `--accent`, `--card`, `--border`. The dark mode CSS is fully implemented — it just cannot be toggled manually yet.

**The gap:** There is no manual toggle. The user cannot override their OS setting. The `AccentProvider` pattern (localStorage → `body[data-accent=...]`) is the established pattern to mirror.

### Dark mode — recommended implementation approach

Add `darkMode: 'class'` to `tailwind.config.ts`. Create a `ThemeProvider` client component that reads `localStorage.getItem('diana_theme')` and sets `document.documentElement.classList` to include `'dark'` when the stored value is `'dark'`, remove it when `'light'`, and fall through to the OS setting when `null` (no override). Mount it alongside `AccentProvider` in `app/(app)/layout.tsx`. Update `globals.css` to use the `.dark` selector in addition to the media query so both paths work:

```css
/* globals.css pattern after adding darkMode: 'class' */
@media (prefers-color-scheme: dark) {
  :root:not(.light) { ...dark vars... }
}
.dark { ...dark vars... }
```

Expose the toggle in Settings under the "Appearance" section (next to `AccentPicker`), and optionally as a 5th onboarding step preference card (optional — not a blocker).

### Key technical decisions

**Decision 1 — Three-way toggle (light / dark / system).**
System (OS default) is the default — no `diana_theme` key stored. Light = stored `'light'`. Dark = stored `'dark'`. The Settings toggle can be a three-segment chip: System / Light / Dark. This is the most user-friendly pattern and matches what iOS/Android expose.

**Decision 2 — `html` vs `body` for the dark class.**
Tailwind's `darkMode: 'class'` looks for `.dark` on `<html>`. Use `document.documentElement.classList` (not `document.body`). The existing `AccentProvider` sets `document.body.dataset.accent` — this is a different mechanism. The theme class goes on `<html>`.

**Decision 3 — Flash of incorrect theme (FOIT).**
Because `ThemeProvider` is a `useEffect` (runs after hydration), there will be a flash of the OS theme before the stored preference applies. Mitigation: add an inline `<script>` tag in `app/layout.tsx` (the root layout, above `<body>`) that runs synchronously before paint:
```html
<script dangerouslySetInnerHTML={{ __html: `
  try {
    const t = localStorage.getItem('diana_theme');
    if (t === 'dark') document.documentElement.classList.add('dark');
    else if (t === 'light') document.documentElement.classList.remove('dark');
  } catch(e) {}
`}} />
```
This is the established Next.js pattern for synchronous theme initialization. It is safe — it runs once, is tiny, and has a try/catch guard.

**Decision 4 — `--danger` in dark mode.**
Currently `--danger: 220 38 38` (red-600). The calm invariant says no red for errors — use amber. In dark mode the danger token should map to amber-400 (`251 191 36`). This is a CSS-only change in `globals.css`.

**Decision 5 — Onboarding step.**
Dark mode preference can be surfaced as a small appearance card in onboarding (after the AI literacy step) but must not block submission. Skip it if the implementation schedule is tight — Settings is sufficient for v1.

### DB schema changes needed

None. Store in `localStorage` exactly like `diana_accent`. Key: `diana_theme`. Values: `'light' | 'dark'` or absent (system default).

### File map

| Action | File |
|--------|------|
| Modify | `tailwind.config.ts` — add `darkMode: 'class'` |
| Modify | `app/globals.css` — add `.dark { ... }` selector block mirroring the media query; update `--danger` in dark mode to amber |
| Create | `components/theme-provider.tsx` — mirrors `AccentProvider`; reads `diana_theme` from localStorage, sets `document.documentElement.classList` |
| Modify | `app/(app)/layout.tsx` — mount `<ThemeProvider />` alongside `<AccentProvider />` |
| Modify | `app/layout.tsx` — add inline sync script for flash prevention (in root layout `<head>` or before `<body>`) |
| Create | `components/theme-toggle.tsx` — three-segment chip: System / Light / Dark |
| Modify | `app/(app)/settings/page.tsx` — add `<ThemeToggle />` in the Appearance section |

---

### Vocabulary Hover

### Recommended implementation approach

Implement vocabulary hover as a **click-triggered popover** (not hover-triggered) on any word within `.reading-view` blocks and assignment description text. The student single-taps/clicks a word; if the word is longer than 5 characters or selected by the student, a small popover appears with a 1-2 sentence plain-English definition fetched from a new `vocab-hover` Edge Function (Claude Haiku 4.5). The popover dismisses on outside click or Escape. On mobile the same single-tap triggers it.

Scope: assignment description text (`<p className="whitespace-pre-wrap ...">` in the detail page) and `.reading-view` blocks only. Not the entire app.

### Key technical decisions

**Decision 1 — Click, not hover.**
Hover auto-triggers are disruptive for ADHD users — any cursor movement over unfamiliar words would fire requests. Click-only is explicit. This aligns with the ADHD UX principle of no automatic interruptions.

**Decision 2 — Haiku 4.5, gated on aiMode.**
Vocabulary lookup is cheap (< 50 tokens output). Use Haiku 4.5. Gate on `aiMode`: if `red` or `yellow`, return a 403 and the popover shows "AI not available for this class." The component must accept `classAiMode` as a prop, same as `MathHelper` and `WritingAid`.

**Decision 3 — Word extraction.**
Use the browser Selection API on click: `window.getSelection().toString().trim()`. If the selection is empty (the user just clicked without selecting), fall back to extracting the word at the click position using the `Range` API. The Edge Function receives `{ word, sentence, ownerId, aiMode }` where `sentence` is the 200-character window around the clicked word for context.

**Decision 4 — Popover implementation.**
Use a plain `<div>` absolutely positioned near the click point, or a shadcn `Popover` component if shadcn is already available in the project. The popover should show:
- The word in bold
- The plain-English definition (1-2 sentences)
- A small "×" dismiss button

Keep max-width 280px to stay on screen. On mobile, position above the selected word.

**Decision 5 — No new `feature` enum value needed... except it IS needed.**
The Edge Function will call `logInteraction` with `feature: 'vocab_hover'`. This means `lib/ai/safety.ts` `LogParams.feature` union must include `'vocab_hover'`, and the Deno mirror `supabase/functions/_shared/safety.ts` must be updated to match. This is a required CLAUDE.md constraint.

**Decision 6 — Rate limiting.**
Do not fire a request on every click if the user is rapidly clicking different words. Debounce: if a request is already in-flight, cancel it (use `AbortController`) and start a new one. Show a loading skeleton in the popover while the request is pending.

### DB schema changes needed

None. The vocab hover uses `ai_interactions` for logging (same as all other AI features).

### Edge Function spec — `supabase/functions/vocab-hover/index.ts`

```
POST /vocab-hover
Body: { ownerId, word, sentence, aiMode }
Auth: none beyond ownerId (same pattern as math-step)
Model: claude-haiku-4-5
Max tokens: 80
System prompt: composeSystemPrompt with includeRefuseRedirect: false, 
               includeFrustration: false, includeMinorSafety: true
Feature prompt: "Define the word '{word}' in 1-2 plain sentences a 9th-grader 
                 can understand. Use the surrounding sentence for context. 
                 No lists, no headers, no jargon."
aiMode gate: red or yellow → 403
logInteraction: feature = 'vocab_hover'
```

### File map

| Action | File |
|--------|------|
| Create | `supabase/functions/vocab-hover/index.ts` — Haiku 4.5 Edge Function |
| Create | `components/vocab-popover.tsx` — click handler + popover UI + fetch logic |
| Modify | `app/(app)/assignments/[id]/page.tsx` — wrap description block with `<VocabPopover>` |
| Modify | `app/(app)/assignments/[id]/reading-panel.tsx` — wrap reading text with `<VocabPopover>` |
| Modify | `lib/ai/safety.ts` — add `'vocab_hover'` to `LogParams.feature` union |
| Modify | `supabase/functions/_shared/safety.ts` — add `'vocab_hover'` to Deno mirror |

### Traps and pitfalls

**Pitfall 1 — Tailwind `darkMode` default is `media`, not `class`.**
If `darkMode: 'class'` is not added to `tailwind.config.ts`, all `dark:` utility classes in components will be ignored — they only activate with `darkMode: 'class'`. The existing dark CSS custom properties in `globals.css` work because they use a media query, not Tailwind classes. After adding `darkMode: 'class'`, any component using `dark:` utilities will start working. There are already a few `dark:` class references in the codebase (e.g., `dark:text-sky-300` in the assignment detail page header) that currently only work through the CSS variable fallback — this confirms the intent to eventually add `class` mode.

**Pitfall 2 — FOIT (flash of incorrect theme) without the inline script.**
Without the sync script in `app/layout.tsx`, users who have stored `diana_theme: 'dark'` will see a white flash on every page load. The inline script must be added at the root layout level (not inside the `(app)` group layout) because the root layout wraps all pages including auth and onboarding.

**Pitfall 3 — Vocabulary popover and `reduced-motion`.**
The popover fade-in animation should check `prefers-reduced-motion`. Add the same guard already used by `.animate-slide-up` in `globals.css`.

**Pitfall 4 — `VocabPopover` component scope.**
Do not wrap the entire page body in `VocabPopover` — this would intercept all clicks app-wide. Wrap only specific containers: the assignment description `<p>` and the `.reading-view` block. Use a `data-vocab-scope` attribute to mark allowed containers if you want to generalize later.

**Pitfall 5 — Safari iOS Selection API.**
`window.getSelection()` on iOS Safari within a `contenteditable=false` element may return an empty selection. Fallback: use `document.caretRangeFromPoint(e.clientX, e.clientY)` to find the word boundary programmatically. Test on iOS before shipping.

**Pitfall 6 — `_shared/safety.ts` Deno mirror drift.**
The CLAUDE.md constraint is explicit: when changing `lib/ai/safety.ts`, also change `supabase/functions/_shared/safety.ts`. Adding `'vocab_hover'` to the union in one file without updating the other will cause TypeScript errors in the Edge Function that may only surface at deploy time, not local build.

### Estimated test coverage

**Dark mode:**
- Unit test: `ThemeProvider` sets `document.documentElement.classList` correctly for each stored value
- Unit test: null/absent key does not set any class (system fallback)
- Snapshot: Settings page renders `ThemeToggle` in the Appearance section

**Vocabulary hover:**
- Unit test: `vocab-hover` Edge Function returns definition for valid word + sentence
- Unit test: `aiMode = 'red'` returns 403
- Unit test: `feature` union in `LogParams` includes `'vocab_hover'`
- Component test (`// @vitest-environment jsdom`): `VocabPopover` renders popover on click, dismisses on Escape

---

## Summary of DB Migrations Needed

| Migration | Table | Purpose |
|-----------|-------|---------|
| `0015_share_links.sql` | `share_links` | Parent/teacher share link storage with token + expiry + revoke |

All other features (AI transparency, dark mode, vocab hover) require no DB changes.

## Summary of New Edge Functions

| Function | Model | Feature token | Purpose |
|----------|-------|--------------|---------|
| `vocab-hover` | Haiku 4.5 | `vocab_hover` | Plain-English word definitions, click-triggered |

## Summary of `lib/ai/safety.ts` changes

Add `'vocab_hover'` to the `feature` union in `LogParams`. Mirror in `supabase/functions/_shared/safety.ts`.

## Cross-cutting concerns

**Tone audit scope.** All new copy in the authorship panel, parent summary, teacher snapshot, and vocabulary popover must pass `npm run tone-audit`. Key risk areas: any message shown when AI is unavailable ("AI not available for this class" is fine — neutral); any parent summary framing (must not use "behind", "overdue", "missed").

**RLS on `share_links`.** The public `/share/[token]` route bypasses RLS intentionally (service-role). All other access to `share_links` is owner-only through RLS. The service-role client in the public route must be instantiated server-side only, never exported to the browser.

**Onboarding form step count.** Adding steps 5 (AI literacy) changes the step numbering in the form. If there are any analytics events or `onboarded_at` triggers tied to a step count, verify they still fire correctly after the addition.
