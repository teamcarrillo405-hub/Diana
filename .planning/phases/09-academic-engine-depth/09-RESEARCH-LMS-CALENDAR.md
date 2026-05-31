# Research: F15 LMS Calendar Import + F9 Calendar/Week View

**Researched:** 2026-05-30
**Domain:** External LMS OAuth/token integration, ICS parsing, week-grid UI
**Confidence:** HIGH (F9), MEDIUM (F15 — depends on 3rd-party API availability at runtime)

---

## Project Constraints (from CLAUDE.md)

- No red color for errors — use amber (or darker amber / violet for severity tiers)
- No shame/scolding words in any UI copy — `npm run tone-audit` must pass
- All Claude API calls go in Edge Functions only — not relevant to these features
- Supabase client pattern: three clients, never mixed (`server.ts`, `client.ts`, service-role in Edge Functions)
- Path alias `@/` maps to repo root
- Migrations are numbered sequentially; latest is `0014_tts_provider.sql` — next is `0015`
- `date-fns` v4.1.0 is already a dependency — use it; do not add a second date library

---

## Summary

### F9 — Calendar/Week View

F9 is a self-contained, server-rendered week grid added at `/calendar`. The page already exists as a `ComingSoon` stub. The grid uses CSS `grid-cols-7` (Tailwind), pulling assignments from Supabase exactly as the dashboard does. Workload weight per day is computed by summing `effective_minutes` values (from `rankAssignments`/`adjustForUser`) for all open assignments due on each day. Visual overload tiers use amber and violet — never red. No new npm packages are required. `date-fns` (already installed, v4.1.0) provides `startOfWeek`, `addDays`, `isSameDay`, `format`, and `parseISO`. The page is a tab-link from the dashboard nav, not a sub-route of dashboard.

**Primary recommendation:** Pure Tailwind `grid-cols-7` Server Component at `/calendar` — no calendar library, no new deps.

### F15 — LMS Calendar Import

F15 has three distinct integration paths with very different complexity. Canvas token entry (student pastes their personal access token) is the simplest and highest-value path because Canvas students already generate tokens in Account > Settings without involving OAuth. Google Classroom requires a full OAuth 2.0 PKCE flow with Supabase as the OAuth provider plus `access_type=offline` to get a refresh token; the `provider_token` must be captured in the callback and stored encrypted in a new `lms_connections` DB table. `.ics` URL import is the easiest technically — parse with `node-ical` in a Next.js Route Handler. All three paths write into the same `assignments` table with three new columns: `external_source`, `external_id`, and `last_synced_at`. Sync is on-demand (a "Sync now" button) — scheduled cron is out of scope and would require a paid Supabase plan for Edge Function cron.

**Primary recommendation:** Ship Canvas token + .ics first; treat Google Classroom OAuth as the third integration because it requires additional GCP project setup and a more complex callback flow.

---

## Feature 1: F15 — LMS Calendar Import

### Recommended Implementation Approach

Store all LMS credentials in a new `lms_connections` table (owner_id, source enum, credentials JSONB). Sync logic runs in a Next.js Route Handler (`app/api/lms/sync/route.ts`) rather than an Edge Function — these are data-fetch operations with no Claude API calls. The handler reads the connection row, calls the external API, and upserts into `assignments` using `(owner_id, external_id)` as the conflict key. The UI is a settings page (`app/(app)/settings/lms/page.tsx`) with a card per source: "Connect Canvas," "Connect Google Classroom," and "Add .ics feed." A "Sync now" button triggers `POST /api/lms/sync`.

### Integration Path 1: Canvas LMS (Token-Based)

**How it works:** Canvas uses simple Bearer token auth. The student generates a personal access token in Canvas Account > Settings > Approved Integrations > + New Access Token. Diana stores this token (encrypted in DB) alongside the student's Canvas base URL (e.g., `https://canvas.instructure.com`).

**Key endpoints:**
```
GET https://{canvas_base_url}/api/v1/courses?enrollment_state=active&per_page=50
GET https://{canvas_base_url}/api/v1/courses/{course_id}/assignments?per_page=50&order_by=due_at
```

**Assignment object fields used:**
- `id` — integer, becomes `external_id`
- `name` — becomes `title`
- `due_at` — ISO 8601 string (nullable) — becomes `due_at`
- `description` — ignored on import (may contain HTML)

**Canvas pagination:** Response includes `Link` header with `rel="next"`. Implement a simple `fetchAllPages` helper that follows `Link: <url>; rel="next"` until absent.

**Pitfall — Canvas subdomain variance:** Each institution has a unique subdomain (`mycollege.instructure.com`). The base URL MUST be stored per-connection, not hard-coded.

**Pitfall — token scope:** Canvas personal access tokens have the same scope as the logged-in user. A student can only see their own assignments and grades, which is exactly what Diana needs.

### Integration Path 2: Google Classroom (OAuth 2.0)

**How it works:** Supabase's built-in Google OAuth provider can be reused. Adding `access_type: 'offline'` and `prompt: 'consent'` to `signInWithOAuth` causes Google to return `provider_refresh_token`. The PKCE callback at `app/auth/callback/route.ts` (already exists) receives the session; after `exchangeCodeForSession`, the `provider_token` and `provider_refresh_token` are in `session.data`. Store both in `lms_connections`.

**Required OAuth scopes** (in addition to standard Supabase Google scopes):
- `https://www.googleapis.com/auth/classroom.courses.readonly`
- `https://www.googleapis.com/auth/classroom.coursework.me.readonly`

Add these as `scopes` in the `signInWithOAuth` call options.

**Key API calls:**
```
GET https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE
GET https://classroom.googleapis.com/v1/courses/{courseId}/courseWork?pageSize=100
```

**Due date format:** Google Classroom returns `dueDate: {year, month, day}` and `dueTime: {hours, minutes}` as separate fields (not ISO 8601). Must be reconstructed: `new Date(Date.UTC(year, month-1, day, hours ?? 23, minutes ?? 59))`.

**Refresh token handling:** Before each sync, check `expires_at`. If expired, call `POST https://oauth2.googleapis.com/token` with `grant_type=refresh_token`. Store the new `access_token` and updated `expires_at` back into `lms_connections`.

**Pitfall — first-time sign-in only:** `provider_refresh_token` is only present on the first OAuth sign-in (or after revoking consent). Users who already signed into Diana with Google will NOT have a stored refresh token. The UI must prompt a "Re-authorize for Classroom" flow that forces consent: `prompt: 'consent'`.

**Pitfall — GCP project setup:** Google Classroom API must be explicitly enabled in the GCP project and the OAuth client must have the Classroom scopes added. Supabase's default Google OAuth setup does NOT include these scopes — they must be added manually in both GCP Console and Supabase's OAuth scopes field.

### Integration Path 3: .ics URL Feed

**Package:** `node-ical` v0.26.1 (published 2026-05-02, latest, maintained). Its async API works in Next.js Route Handlers. Avoids `node-ical`'s sync functions which block the event loop.

```
npm install node-ical
npm install --save-dev @types/node-ical
```

Note: `ical.js` v2.2.1 is the Mozilla-maintained alternative with no dependencies, but its API is more verbose for server-side URL fetching. `node-ical` is preferred because it has a built-in `fromURL` async method.

**Parsing pattern:**
```typescript
// In a Next.js Route Handler or Server Action
import ical from 'node-ical';

async function parseIcsUrl(url: string) {
  const events = await ical.async.fromURL(url);
  return Object.values(events)
    .filter(e => e.type === 'VEVENT' && e.start)
    .map(e => ({
      title: e.summary ?? 'Untitled',
      due_at: e.start instanceof Date ? e.start.toISOString() : null,
      external_id: e.uid ?? null,
    }));
}
```

**Pitfall — recurring events:** `node-ical` returns recurring event instances with a `rrule` property. For homework assignments, recurring events are unusual. If the feed includes them (e.g., weekly class meetings), filter by checking `e.rrule` and skipping or limiting expansion to the next 30 days only. `node-ical` provides `expandRecurringEvent()` for this.

**Pitfall — .ics from Google Calendar URLs:** Google Calendar .ics export URLs require the user to be logged in or use a secret shareable URL. Advise users to use the "Secret address in iCal format" option in Google Calendar settings.

### DB Schema Changes (Migration 0015)

```sql
-- 0015_lms_connections.sql

-- New columns on assignments for deduplication
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS external_source text
    CHECK (external_source IN ('canvas', 'google_classroom', 'ics')),
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- Unique constraint for upsert deduplication
CREATE UNIQUE INDEX IF NOT EXISTS assignments_external_dedup_idx
  ON public.assignments (owner_id, external_source, external_id)
  WHERE external_source IS NOT NULL AND external_id IS NOT NULL;

-- LMS credentials store
CREATE TABLE public.lms_connections (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source       text NOT NULL CHECK (source IN ('canvas', 'google_classroom', 'ics')),
  -- JSONB stores source-specific credentials/config. Examples:
  --   canvas:            { "base_url": "https://...", "token": "<encrypted>" }
  --   google_classroom:  { "access_token": "...", "refresh_token": "...", "expires_at": 1234567890 }
  --   ics:               { "url": "https://..." }
  credentials  jsonb NOT NULL,
  label        text,                         -- user-visible nickname, e.g. "AP Bio Canvas"
  last_synced_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, source)                  -- one connection per source per user (v1)
);

ALTER TABLE public.lms_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lms_connections: owner full access"
  ON public.lms_connections
  FOR ALL
  USING  (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
```

**Security note:** Canvas tokens and Google refresh tokens stored in `credentials` JSONB are sensitive. In v1, store them in plain JSONB with Supabase RLS enforcing row-level access. For v2, use Postgres `pgcrypto` with `encrypt()`/`decrypt()` or a Vault integration. The CLAUDE.md security model (service-role key only in Edge Functions) means credential reads during sync happen in Route Handlers with the server-side client (uses the authenticated user's session, not service-role).

### Deduplication Logic

On each sync, upsert using `(owner_id, external_source, external_id)`:

```typescript
await supabase
  .from('assignments')
  .upsert(
    importedItems.map(item => ({
      owner_id: userId,
      class_id: resolvedClassId,   // matched by name or fallback to an "Imported" class
      title: item.title,
      due_at: item.due_at,
      external_source: source,
      external_id: item.external_id,
      last_synced_at: new Date().toISOString(),
      // Only set on INSERT, not update — preserve user's edits:
      status: 'todo',
      kind: 'other',
    })),
    { onConflict: 'owner_id,external_source,external_id', ignoreDuplicates: false }
  );
```

**Fields updated on re-sync:** `title`, `due_at`, `last_synced_at`. Fields NOT overwritten on re-sync: `status`, `estimated_minutes`, `difficulty`, `class_id` (after initial import). Implement via a Postgres function or two-step upsert if needed.

**Class matching:** On first sync, try `ILIKE` match of the LMS course name against `classes.name` for the owner. If no match, create a new class named after the LMS course. Surface a "Map to class" UI post-sync.

### UX for a Teen

- On-demand sync only (a "Sync now" button). Cron requires pg_cron or paid Supabase cron — out of scope for v1.
- After sync, show a diff summary: "3 assignments added, 1 updated" (neutral language — not "you had missing assignments").
- Last sync time shown as "Synced 2 hours ago" (relative, calm).
- If sync fails (network, expired token), show amber banner with actionable text: "Couldn't reach Canvas — check your token in Settings."

### File Map (F15)

| Action | File |
|--------|------|
| Create | `app/(app)/settings/lms/page.tsx` — LMS connections settings UI |
| Create | `app/(app)/settings/lms/canvas-form.tsx` — Canvas base URL + token form |
| Create | `app/(app)/settings/lms/ics-form.tsx` — .ics URL form |
| Create | `app/(app)/settings/lms/google-connect-button.tsx` — triggers OAuth flow |
| Create | `app/api/lms/sync/route.ts` — POST handler, calls per-source sync function |
| Create | `lib/lms/canvas.ts` — fetchAllPages, map Canvas assignment to Diana shape |
| Create | `lib/lms/google-classroom.ts` — refresh token logic, map GC coursework to Diana shape |
| Create | `lib/lms/ics.ts` — node-ical wrapper, filter VEVENTs |
| Create | `lib/lms/upsert.ts` — shared deduplication upsert helper |
| Create | `supabase/migrations/0015_lms_connections.sql` |
| Modify | `app/(app)/imports/page.tsx` — replace `ComingSoon` stub with real content |
| Modify | `components/nav.tsx` — ensure Imports link is in nav (already exists as route) |

### Tests Needed (F15)

| Test | Type | File |
|------|------|------|
| Canvas page fetcher follows Link header pagination | unit | `lib/lms/canvas.test.ts` |
| Canvas assignment mapper produces correct `due_at` | unit | `lib/lms/canvas.test.ts` |
| GC due date reconstructor (year/month/day → ISO UTC) | unit | `lib/lms/google-classroom.test.ts` |
| `.ics` parser filters non-VEVENT entries | unit | `lib/lms/ics.test.ts` |
| Dedup upsert conflict key — integration test against local Supabase | integration | `lib/lms/upsert.test.ts` |
| Sync route returns 401 if unauthenticated | smoke | `app/api/lms/sync/route.test.ts` |

---

## Feature 2: F9 — Calendar/Week View

### Recommended Implementation Approach

Replace the `ComingSoon` stub at `app/(app)/calendar/page.tsx` with a Server Component that fetches all open assignments for the next 14 days (two-week look-ahead), groups them by `due_at` date, computes per-day `effective_minutes` totals using the existing `adjustForUser` logic from `lib/scoring/next-five-minutes.ts`, and renders a `grid grid-cols-7` Tailwind grid. No new npm packages. `date-fns` v4.1.0 (already installed) provides all date math needed. The view is a standalone route navigable from the main nav — not a tab inside the dashboard — because the dashboard already has a specific "next 5 minutes" focus; the calendar is a different mental mode (planning ahead vs. acting now).

### Workload Weight Computation

```typescript
// Reuse adjustForUser from lib/scoring/next-five-minutes.ts
import { adjustForUser } from '@/lib/scoring/next-five-minutes';

type DayLoad = {
  date: Date;
  assignments: Assignment[];
  totalEffectiveMinutes: number;
};

function buildWeekLoad(assignments: Assignment[], profile: ScorerProfile, weekStart: Date): DayLoad[] {
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    const dayAssignments = assignments.filter(a =>
      a.due_at && isSameDay(parseISO(a.due_at), day)
    );
    const totalEffectiveMinutes = dayAssignments.reduce((sum, a) => {
      return sum + (adjustForUser(a, profile) ?? a.estimated_minutes ?? 0);
    }, 0);
    return { date: day, assignments: dayAssignments, totalEffectiveMinutes };
  });
}
```

### Overload Tier Colors (calm invariant enforced)

| Total effective minutes | Color class | Label shown to student |
|------------------------|-------------|----------------------|
| 0 | — | (empty) |
| 1–90 | `bg-emerald-100 dark:bg-emerald-900/30` | Light day |
| 91–150 | `bg-amber-100 dark:bg-amber-900/30` | Busy |
| 151–240 | `bg-amber-300 dark:bg-amber-700/40` | Heavy |
| 241+ | `bg-violet-200 dark:bg-violet-900/40` | A lot — plan ahead |

**No red.** The two amber tiers plus violet replace the amber/red pair mentioned in the prompt. Violet carries visual weight without the punitive connotation of red.

### Multi-day Spanning Assignments

Assignments in Diana have a single `due_at` timestamp — they appear only on the day they are due. There is no `start_date` / `end_date` range on the current schema. "Spanning" would require a new `starts_at` column (out of scope for this phase). The week view shows assignments on their due date only, which is consistent with how the dashboard and assignments list work today. Document this as a known limitation in a UI tooltip: "Tasks appear on their due date."

### Grid Structure

```
┌─────────────────────────────────────────────────────────────┐
│  [< Prev week]   May 28 – Jun 3, 2026   [Next week >]       │
├───────┬───────┬───────┬───────┬───────┬───────┬─────────────┤
│  Sun  │  Mon  │  Tue  │  Wed  │  Thu  │  Fri  │     Sat     │
├───────┼───────┼───────┼───────┼───────┼───────┼─────────────┤
│  28   │  29   │  30   │  31   │   1   │   2   │      3      │
│       │ ████  │       │ ████  │ ████  │       │             │
│       │ Essay │       │ Lab   │ Test  │       │             │
│       │ 90m   │       │ 60m   │ 120m  │       │             │
└───────┴───────┴───────┴───────┴───────┴───────┴─────────────┘
```

Each cell shows:
1. Day number (bold if today)
2. Workload color bar (height proportional to load, or a fixed-height colored strip)
3. Assignment pill list (title truncated, linked to `/assignments/[id]`)
4. Total effective minutes for the day

### Week Navigation

The page receives `?week=YYYY-MM-DD` (ISO date of the week's Sunday). Default to current week. Navigation: `Link href={/calendar?week=...}` with prev/next computed via `subWeeks`/`addWeeks` from `date-fns`. This is a Server Component — no `useState` needed.

### Dashboard Entry Point

Add a "Week ahead" link card to the dashboard (below the main "right now" section) that shows the count of assignments due in the next 7 days: "4 things due this week → See calendar". This bridges the two views without duplicating calendar logic in the dashboard.

### DB Schema Changes (F9)

None. All data already exists in `assignments`. The `effective_minutes` computation is done in TypeScript using `adjustForUser` which is a pure function already exported from `lib/scoring/next-five-minutes.ts`. No new columns, no new migrations.

### File Map (F9)

| Action | File |
|--------|------|
| Modify | `app/(app)/calendar/page.tsx` — replace stub with full Server Component |
| Create | `app/(app)/calendar/week-grid.tsx` — pure presentation component (grid, day cells, color bars) |
| Create | `app/(app)/calendar/week-nav.tsx` — prev/next week links |
| Create | `lib/calendar/week-load.ts` — `buildWeekLoad()` pure function |
| Create | `lib/calendar/week-load.test.ts` — unit tests for load computation |
| Modify | `app/(app)/dashboard/page.tsx` — add "Week ahead" link card |

### Tests Needed (F9)

| Test | Type | File |
|------|------|------|
| `buildWeekLoad` groups assignments by correct day | unit | `lib/calendar/week-load.test.ts` |
| `buildWeekLoad` sums `effective_minutes` with dyslexia multiplier | unit | `lib/calendar/week-load.test.ts` |
| `buildWeekLoad` returns 0 for day with no due assignments | unit | `lib/calendar/week-load.test.ts` |
| Day tile with 200 min renders amber-300 class | unit (jsdom) | `app/(app)/calendar/week-grid.test.tsx` |
| Day tile with 260 min renders violet-200 class | unit (jsdom) | `app/(app)/calendar/week-grid.test.tsx` |
| Week nav prev/next links produce correct `?week=` param | unit | `app/(app)/calendar/week-nav.test.tsx` |

---

## Common Pitfalls

### F15 Pitfalls

**Pitfall 1 — Google Classroom OAuth scope not on Supabase config**
Google Classroom scopes (`classroom.courses.readonly`, `classroom.coursework.me.readonly`) must be added in BOTH the GCP OAuth client consent screen AND Supabase's Google OAuth provider settings. Forgetting either causes a scope mismatch error at the callback.

**Pitfall 2 — `provider_refresh_token` missing for existing users**
Users who signed up with Google before Classroom integration was added will have no stored `provider_refresh_token`. Force re-consent with `prompt: 'consent'`. Show a UI prompt: "To connect Classroom, you'll need to re-authorize Diana with your Google account."

**Pitfall 3 — Canvas token stored in plaintext**
In v1 the Canvas API token is stored as plaintext in the `credentials` JSONB column. This is acceptable behind RLS for an MVP, but must be called out in code comments with a `TODO: encrypt with pgcrypto before v1.0 public launch`.

**Pitfall 4 — Canvas pagination silently dropping assignments**
Canvas REST API defaults to `per_page=10`. Without explicit `per_page=50` and Link-header pagination, the sync silently imports only the first 10 assignments. Always follow `rel="next"` links.

**Pitfall 5 — `.ics` `DTSTART` is a date, not datetime**
For all-day events in ICS, `DTSTART` is `YYYYMMDD` (a date value, not a datetime). `node-ical` returns this as a `Date` object set to midnight UTC. This is usually fine for homework due dates, but verify the displayed time makes sense. If `due_at` renders as "12:00 AM" to the student, map all-day due dates to 23:59 local time on that day.

**Pitfall 6 — LMS import creating duplicate classes**
If class-name matching logic is case-sensitive or includes trailing spaces, each sync will create duplicate classes. Normalize with `.trim().toLowerCase()` before ILIKE matching.

### F9 Pitfalls

**Pitfall 7 — `adjustForUser` is not exported from scoring file**
`adjustForUser` is currently a module-private function in `lib/scoring/next-five-minutes.ts`. To reuse it in `lib/calendar/week-load.ts`, it must be exported. This is a one-line change to the existing file.

**Pitfall 8 — Server Component week navigation requires correct `searchParams` typing**
Next.js 15 App Router passes `searchParams` as a `Promise<{week?: string}>` (same pattern as `DashboardPage`). Must `await searchParams` — not destructure synchronously.

**Pitfall 9 — `isSameDay` timezone mismatch**
`due_at` is stored as UTC in Postgres. `isSameDay` from `date-fns` compares in local timezone by default. For a student in UTC-5, an assignment due at `2026-06-01T02:00:00Z` appears on May 31 in their local time. Use `date-fns-tz` or convert `due_at` to local date before comparison. Alternatively, store and display all due dates in the student's `profiles.timezone`. This is a known limitation of the current system; document the decision made.

**Pitfall 10 — Tone audit failure on workload labels**
Do not use words like "overloaded," "too much," or "you're behind" in day cell labels. Use neutral terms: "Light day," "Busy," "Heavy," "A lot — plan ahead." Run `npm run tone-audit` before committing UI copy.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ICS parsing | Custom regex/string parser | `node-ical` v0.26.1 | RFC 5545 has edge cases: timezones, recurrence rules, EXDATE |
| Date arithmetic in grid | Manual `+1 day` loops | `date-fns` (already installed) | DST transitions, leap years |
| OAuth PKCE flow | Custom code exchange | Supabase `signInWithOAuth` + existing callback | PKCE state/verifier already handled |
| Canvas pagination | One-shot fetch | Link-header follower utility | Silently misses assignments beyond page 1 |

---

## Standard Stack

### New Dependencies (F15 only)

| Package | Version | Purpose | Why |
|---------|---------|---------|-----|
| `node-ical` | 0.26.1 | ICS URL parsing | Node.js async API, RFC 5545 compliant, actively maintained (May 2026) |

No new dependencies for F9 — `date-fns` v4.1.0 already covers all date math needed.

**Installation:**
```bash
npm install node-ical
npm install --save-dev @types/node-ical
```

---

## Code Examples

### Canvas: Pagination Follower
```typescript
// lib/lms/canvas.ts
// Source: Canvas API docs — Link header rel="next" pattern
async function fetchAllPages<T>(initialUrl: string, token: string): Promise<T[]> {
  const results: T[] = [];
  let url: string | null = initialUrl;
  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Canvas API ${res.status}: ${await res.text()}`);
    const page: T[] = await res.json();
    results.push(...page);
    const link = res.headers.get('Link') ?? '';
    const nextMatch = link.match(/<([^>]+)>;\s*rel="next"/);
    url = nextMatch ? nextMatch[1] : null;
  }
  return results;
}
```

### Google Classroom: Due Date Reconstruction
```typescript
// lib/lms/google-classroom.ts
// Google returns {year, month, day} + optional {hours, minutes}
function gcDueDateToISO(
  dueDate: { year: number; month: number; day: number },
  dueTime?: { hours?: number; minutes?: number }
): string {
  const h = dueTime?.hours ?? 23;
  const m = dueTime?.minutes ?? 59;
  return new Date(Date.UTC(dueDate.year, dueDate.month - 1, dueDate.day, h, m)).toISOString();
}
```

### ICS: node-ical URL Parse
```typescript
// lib/lms/ics.ts
// Source: node-ical README — async.fromURL
import ical from 'node-ical';

export async function parseIcsUrl(url: string) {
  const events = await ical.async.fromURL(url);
  return Object.values(events)
    .filter((e): e is ical.VEvent => e.type === 'VEVENT')
    .filter(e => e.start != null)
    .map(e => ({
      title: e.summary ?? 'Untitled',
      due_at: (e.start as Date).toISOString(),
      external_id: e.uid ?? `${e.summary}-${e.start}`,
    }));
}
```

### Calendar: Week Load Builder
```typescript
// lib/calendar/week-load.ts
// date-fns v4 — all functions tree-shakeable
import { addDays, isSameDay, parseISO, startOfWeek } from 'date-fns';
import { adjustForUser } from '@/lib/scoring/next-five-minutes'; // must be exported first

export type Assignment = { id: string; title: string; due_at: string | null; estimated_minutes: number | null; reading_load: number | null };
export type ScorerProfile = { diagnoses: string[]; extra_time_pct: number };

export type DayLoad = {
  date: Date;
  isToday: boolean;
  totalEffectiveMinutes: number;
  assignments: Assignment[];
};

export function buildWeekLoad(
  assignments: Assignment[],
  profile: ScorerProfile,
  weekStart: Date,
): DayLoad[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    const dayAssignments = assignments.filter(
      a => a.due_at && isSameDay(parseISO(a.due_at), day),
    );
    const totalEffectiveMinutes = dayAssignments.reduce(
      (sum, a) => sum + (adjustForUser(a as any, profile) ?? a.estimated_minutes ?? 0),
      0,
    );
    return { date: day, isToday: isSameDay(day, today), totalEffectiveMinutes, assignments: dayAssignments };
  });
}
```

### Calendar: Overload Tier Helper
```typescript
// In week-grid.tsx (component file)
function dayColorClass(totalMin: number): string {
  if (totalMin === 0) return '';
  if (totalMin <= 90)  return 'bg-emerald-100 dark:bg-emerald-900/30';
  if (totalMin <= 150) return 'bg-amber-100 dark:bg-amber-900/30';
  if (totalMin <= 240) return 'bg-amber-300 dark:bg-amber-700/40';
  return 'bg-violet-200 dark:bg-violet-900/40';
}
```

---

## Open Questions

1. **Canvas token encryption**
   - What we know: Supabase RLS prevents cross-user reads; `pgcrypto` is already enabled (migration 0001)
   - What's unclear: Whether the product requires encryption at rest for tokens before launch vs. a post-MVP hardening task
   - Recommendation: Ship v1 with plaintext + RLS; add a `TODO` comment; plan 0016 migration for encryption

2. **Google Classroom for existing Diana Google users**
   - What we know: Supabase's current Google OAuth setup does not request Classroom scopes; existing sessions lack `provider_refresh_token`
   - What's unclear: Whether a secondary "connect Classroom" OAuth flow (distinct from the login flow) is architecturally cleaner than re-issuing the primary session
   - Recommendation: Use a separate "Connect Google Classroom" button that calls `signInWithOAuth` with the added scopes and `prompt: 'consent'`, storing the resulting tokens only in `lms_connections` (not replacing the Supabase auth session)

3. **Week view timezone handling**
   - What we know: `profiles.timezone` stores the student's timezone (e.g., `America/New_York`); `date-fns` v4 has `date-fns-tz` as a separate optional package
   - What's unclear: Whether `due_at` UTC→local conversion is necessary for correct day grouping given the user base (US high school students, mostly UTC-5 to UTC-8)
   - Recommendation: For v1, convert `due_at` to local date using `new Date(due_at)` which uses the browser's local timezone; document the limitation; add `date-fns-tz` in a follow-up if timezone bugs are reported

---

## Environment Availability

Step 2.6: Checked.

| Dependency | Required By | Available | Notes |
|------------|-------------|-----------|-------|
| `date-fns` v4.1.0 | F9 week grid date math | Already installed | No action needed |
| `node-ical` | F15 .ics parsing | Not yet installed | `npm install node-ical` |
| Canvas API (external) | F15 Canvas sync | Runtime — not pre-checkable | Student provides base URL + token |
| Google Classroom API (external) | F15 GC sync | Runtime — requires GCP config | GCP project must have Classroom API enabled |
| Supabase Google OAuth provider | F15 GC OAuth | Configured (Diana uses Google login) | Additional scopes must be added |

**Missing with no fallback:**
- GCP Console: Classroom API enablement and OAuth scope addition — requires human action before F15 Google Classroom path can be tested

**Missing with fallback:**
- `node-ical`: Not installed, but `npm install node-ical` is a one-line fix before implementation begins

---

## Sources

### Primary (HIGH confidence)
- Canvas Assignments API — https://developerdocs.instructure.com/services/canvas/resources/assignments
- Canvas Planner API — https://developerdocs.instructure.com/services/canvas/resources/planner
- Google Classroom Auth scopes — https://developers.google.com/workspace/classroom/guides/auth
- Google Classroom CourseWork API — https://developers.google.com/workspace/classroom/guides/manage-coursework
- Supabase Google OAuth provider_token — https://supabase.com/docs/guides/auth/social-login/auth-google
- node-ical npm registry (verified v0.26.1, 2026-05-02) — https://www.npmjs.com/package/node-ical
- date-fns v4 — already in project, verified in package.json

### Secondary (MEDIUM confidence)
- Canvas personal access token instructions — https://community.canvaslms.com/t5/Canvas-Basics-Guide/How-do-I-manage-API-access-tokens-in-my-user-account/ta-p/615312
- node-ical GitHub (active maintenance confirmed) — https://github.com/jens-maus/node-ical
- Tailwind grid-cols-7 week calendar pattern — https://github.com/karlhorky/tailwind-css-tricks/blob/main/demos/next-js-calendar-week-view/app/Calendar.tsx

### Tertiary (LOW confidence — flag for validation)
- Google Classroom due date `{year, month, day}` object shape — inferred from API overview; verify against live API response before coding the transformer
- Canvas `Link` header pagination format — standard HTTP pattern but should be validated against a live Canvas sandbox

---

## Confidence Breakdown

| Area | Level | Reason |
|------|-------|--------|
| F9 week grid implementation | HIGH | Pure TypeScript + existing deps; no external APIs |
| F9 workload computation | HIGH | Reuses existing `adjustForUser` pure function |
| Canvas token auth pattern | HIGH | Documented by Instructure, simple Bearer token |
| Canvas API response shape | MEDIUM | Verified endpoint docs; `due_at` field confirmed present |
| .ics parsing with node-ical | HIGH | Official npm package, actively maintained, simple async API |
| Google Classroom OAuth scopes | HIGH | Verified in official Google developer docs |
| Google Classroom due date shape | MEDIUM | API overview references separate `dueDate`/`dueTime` fields; exact JSON verified via docs overview but not a live call |
| Token encryption recommendation | MEDIUM | RLS + pgcrypto approach is standard Supabase pattern but no official "store third-party tokens" doc confirmed |

**Research date:** 2026-05-30
**Valid until:** 2026-06-30 (Canvas and Google Classroom API shapes are stable; node-ical version may update)
