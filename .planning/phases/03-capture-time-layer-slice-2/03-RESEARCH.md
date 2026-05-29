# Phase 3: Capture + Time Layer (Slice 2) — Research

**Researched:** 2026-05-28
**Domain:** Capture inbox (voice/photo/text), offline queue, time-blindness aids, implementation-intention prompts, Supabase Edge Functions, STT, OCR
**Confidence:** HIGH — codebase verified directly; external provider decisions informed by current pricing/feature comparison

---

## Summary

Phase 3 adds three features on top of the completed Phase 2 codebase: (1) a universal capture inbox reachable in one tap from the home screen, with voice/photo/text modes and offline queueing; (2) time-blindness aids with calibrated time estimates and a "what's left tonight?" budget view; and (3) implementation-intention prompts ("when and where will you start?") on assignment creation.

The codebase already has the capture-adjacent infrastructure: `VoiceTextarea` (browser STT via Web Speech API), `Supabase Storage` (no bucket configured yet), `manifest.ts` with PWA shell, and a `quick-add` route stub. The `/quick-add` page currently renders a `ComingSoon` component — Phase 3 replaces that with a real capture surface. The `assignment_intentions` table and `assignment_time_log`/`assignment_type_estimates` tables do not yet exist; migrations are required.

The two largest open decisions are: (1) which STT provider to use for server-side voice processing (Deepgram beats OpenAI Whisper on latency and cost for streaming use cases; both are viable for batch), and (2) which OCR provider to use for photo capture (Claude Haiku 4.5 vision is the pragmatic choice — one API key already in use, no new vendor). The offline queue uses `idb-keyval` in the browser with an `online` event listener for replay — Background Sync has incomplete browser support (no Firefox, no Safari) so the simpler approach is correct for a ADHD student PWA that targets mobile Chrome.

The "what's left tonight?" time budget view and calibrated estimates are pure computation on top of existing data — no new AI calls required. The implementation-intention prompt is a lightweight inline form on the assignment-created page (redirect after `createAssignment`), not a modal on every page.

**Primary recommendation:** Build in four waves: (1) schema migrations; (2) core capture inbox + offline queue; (3) time budget + calibrated estimates view; (4) implementation-intention prompt. The STT decision should be Deepgram for streaming, but Phase 3 can ship with browser Web Speech API for voice (already works, zero cost) and add Deepgram in a targeted follow-up if accuracy is insufficient. Use Claude Haiku 4.5 vision for OCR — no new vendor.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| F04 | Universal capture inbox: one-tap from home screen; voice/photo/text modes; offline queue; AI classification with confirmation; latency ≤3s text/voice, ≤8s photo+OCR | New `inbox_items` table + capture UI at `/quick-add` replacing ComingSoon stub. Voice via browser STT (Web Speech API, zero cost). Photo via `<input type="file" accept="image/*" capture="camera">` → Supabase Storage upload → Edge Function with Claude Haiku 4.5 vision OCR + classification. Offline queue via `idb-keyval` + `online` event replay. |
| F05 | Time-blindness aids: calibrated time estimates; "what's left tonight?" time budget view; calibration fires after 3+ data points | New `assignment_time_log` and `assignment_type_estimates` tables. `in_progress → done/checking` transition logs elapsed wall time. Budget view is `/dashboard` section or dedicated route computing sum of `estimated_minutes` for active assignments tonight. Calibration prompt (factual, never scolding) fires in `NewAssignmentForm` when 3+ data points exist for that `kind`. |
| F14 | Implementation-intention prompts: "when/where will you start?" on creation; skippable; if filled, becomes notification trigger | New `assignment_intentions` table. After `createAssignment` succeeds, redirect to `/assignments/[id]?intent=new` which renders the prompt inline. Skip = dismiss without storing. Fill = insert row. Time-based cues → note for future push notification (Phase 7); event-based cues → surface in 6 PM evening planning prompt (Phase 7 or later). |
</phase_requirements>

---

## User Constraints

No CONTEXT.md exists for Phase 3. The following constraints come directly from locked architecture decisions in STATE.md:

### Locked Decisions
- All Claude AI calls via Supabase Edge Functions (never browser-direct)
- Model selection: Haiku 4.5 for cheap ops (classification, OCR), Sonnet 4.6 for default, Opus 4.7 for hard reasoning
- Next.js 15 App Router + TypeScript + Tailwind (no new UI libraries)
- Supabase (Postgres + Auth + Storage + Edge Functions)
- PWA shell already in place (manifest.ts + service worker via next-pwa)
- Calm visual language: no red, no exclamations, amber for caution
- `VoiceTextarea` component already exists (browser Web Speech API, no server cost)

### Claude's Discretion
- STT provider for server-side processing: Deepgram / Whisper / AssemblyAI (not yet decided — research recommends Deepgram for streaming, OpenAI Whisper batch for initial simplicity; see Standard Stack)
- OCR provider: Claude vision vs. Cloud Vision (research recommends Claude Haiku 4.5 vision — already integrated, no new vendor)
- Offline queue strategy: idb-keyval + online event vs. Background Sync (research recommends idb-keyval due to Firefox/Safari Background Sync gaps)
- Whether the "what's left tonight?" view lives on the dashboard or at a dedicated route

### Deferred Ideas (OUT OF SCOPE for Phase 3)
- Push notifications for implementation intentions (scheduling infrastructure deferred to Phase 7)
- "Evening planning" 6 PM home-screen prompt (Phase 7 or later)
- Server-side streaming STT (Phase 3 can use browser STT; server STT is an enhancement)
- Full authorship log (F15, Phase 6)
- Per-class AI traffic-light (F16, Phase 6)

---

## Standard Stack

### Core (already in project — no new installs)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.5.18 | App Router, Server Actions, route handlers | Already used |
| @supabase/ssr + supabase-js | 0.10.3 / 2.106.2 | Auth, Postgres, Storage, Edge Functions | Already used |
| zod | 3.23.8 | Server action validation | Already used everywhere |
| date-fns | 4.1.0 | Date formatting/arithmetic for time budget | Already in deps |
| vitest | 3.2.4 | Unit tests | Already configured in vitest.config.ts |

### To Add in Phase 3
| Library | Version | Purpose | Decision |
|---------|---------|---------|----------|
| idb-keyval | ^6.2.1 | Offline inbox queue in IndexedDB | Tiny (~600B), promise-based, TypeScript-friendly; simpler than full idb |

**Installation:**
```bash
npm install idb-keyval
```

**Version verification:** Run `npm view idb-keyval version` before pinning. As of research date, idb-keyval is at 6.2.1 (stable, no recent breaking changes).

### STT Decision
| Option | Latency | Cost | Integration | Recommendation |
|--------|---------|------|-------------|----------------|
| Browser Web Speech API | ~0ms (instant streaming) | Free | Already in `VoiceTextarea` | Use for Phase 3 |
| OpenAI Whisper (`whisper-1`) | 1–3s per clip | $0.006/min | Supabase Edge Function | Available but adds latency + cost |
| Deepgram Nova-3 | 200–400ms streaming | $0.0077/min ($200 free credit) | WebSocket or REST | Best for server-side; defer |

**Recommendation:** Phase 3 ships with the existing browser `Web Speech API` (`VoiceTextarea`) for voice capture. This has zero cost, zero latency setup, and is already implemented. Server-side STT (Deepgram) should be added if user feedback indicates accuracy problems — not as a baseline requirement.

### OCR Decision
| Option | Cost per image | Accuracy | Integration | Recommendation |
|--------|---------------|----------|-------------|----------------|
| Claude Haiku 4.5 vision | ~$0.001–0.003/image (depends on size) | Excellent for handwritten + printed text | Supabase Edge Function, existing Anthropic key | **Use this** |
| Google Cloud Vision | $1.50/1000 units (free 1000/month) | Excellent | New API key, new vendor | Adds vendor complexity |

**Recommendation:** Claude Haiku 4.5 vision. One API key, already integrated pattern. Cost at $1/MTok input is approximately $0.001–0.003 per homework photo. No new vendor contract.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| idb-keyval | Full idb library | idb is larger; idb-keyval is sufficient for a queue of inbox items |
| idb-keyval | localStorage | localStorage is synchronous, size-limited (5–10MB), can't store Blobs (needed for photo queue) |
| Browser Web Speech API | Deepgram WebSocket | Deepgram better accuracy but adds ~$0.008/min cost and WebSocket plumbing to Service Worker |
| Claude Haiku 4.5 vision | Google Cloud Vision | Google needs new API key, separate billing, separate auth — no advantage for this use case |

---

## Architecture Patterns

### Recommended Project Structure for Phase 3
```
app/(app)/
  quick-add/
    page.tsx              # Server component: gate + CaptureForm scaffold
    capture-form.tsx      # "use client": voice/photo/text tabs + offline queue
    actions.ts            # saveInboxItem, classifyInboxItem (calls Edge Function)
  inbox/
    page.tsx              # Inbox list: unclassified items awaiting confirmation
    [id]/
      page.tsx            # Item detail: AI suggestion + confirm/edit
      actions.ts          # confirmInboxItem (creates assignment from inbox item)
  assignments/
    new/
      form.tsx            # EXTEND: add F14 intent prompt after creation (redirect)
  dashboard/
    page.tsx              # EXTEND: "What's left tonight?" budget section
    time-budget.tsx       # New component: tonight's estimated total

supabase/
  migrations/
    0009_inbox_and_time_layer.sql  # inbox_items, assignment_time_log, assignment_type_estimates, assignment_intentions

lib/
  inbox/
    queue.ts              # idb-keyval offline queue: enqueue, dequeue, drain
    types.ts              # InboxItem, InboxStatus types
  time-budget/
    compute.ts            # computeNightBudget(assignments, profile) → { totalMinutes, items[] }
    calibration.ts        # getCalibrationStats(userId, kind) → { meanMinutes, n }

supabase/functions/
  classify-inbox/
    index.ts              # Edge Function: take raw text + optional OCR → suggest class/kind/due_at
```

### Pattern 1: Capture Form with Offline Queue
**What:** The capture form writes to IndexedDB immediately (optimistic), then flushes to Supabase when online. On reconnect, drains the queue in order.
**When to use:** Any mutation that must work offline.

```typescript
// lib/inbox/queue.ts
import { get, set, del, keys } from "idb-keyval";

export type QueuedInboxItem = {
  tempId: string;
  raw: string;
  captureMode: "voice" | "photo" | "text";
  photoStorageKey?: string;  // Supabase Storage path, if uploaded already
  queuedAt: string;          // ISO
};

export async function enqueueInboxItem(item: QueuedInboxItem): Promise<void> {
  await set(`inbox-queue:${item.tempId}`, item);
}

export async function getQueuedItems(): Promise<QueuedInboxItem[]> {
  const allKeys = await keys();
  const queueKeys = (allKeys as string[]).filter(k => k.startsWith("inbox-queue:"));
  return Promise.all(queueKeys.map(k => get<QueuedInboxItem>(k).then(v => v!)));
}

export async function removeQueuedItem(tempId: string): Promise<void> {
  await del(`inbox-queue:${tempId}`);
}
```

### Pattern 2: Capture Form Tabs (Voice / Photo / Text)
**What:** A single client component with three capture modes. Voice appends transcript to a text field. Photo opens camera input, uploads to Supabase Storage, then submits the storage path for OCR.
**When to use:** CaptureForm component in `/quick-add/capture-form.tsx`.

```typescript
"use client";

// Voice mode: reuse VoiceTextarea — already handles browser SpeechRecognition
// Photo mode: <input type="file" accept="image/*" capture="environment" />
//   → onChange: upload to Supabase Storage (inbox-photos bucket)
//   → get public URL or storage path; pass to saveInboxItem as photoStorageKey
// Text mode: plain <textarea>

// On submit: enqueueInboxItem() immediately, then attempt saveInboxItem()
// If saveInboxItem() fails (offline), item stays in queue; online listener drains it
```

### Pattern 3: Edge Function — Classify Inbox Item
**What:** Supabase Edge Function that receives `{ raw: string, photoUrl?: string, classes: ClassOption[] }` and returns `{ suggestedClassId, suggestedKind, suggestedDueAt, confidence, reasoning }`.
**When to use:** Called after inbox item is saved to DB; result shown to student for confirmation.

```typescript
// supabase/functions/classify-inbox/index.ts
// Uses Claude Haiku 4.5 (cheap, fast)
// If photoUrl present: send image + "Extract text from this photo and identify: class, assignment type, due date"
// If raw text only: "From these teacher notes, identify: class, assignment type, due date"
// Returns JSON; if confidence < 0.7 → item stays unclassified for manual review
```

### Pattern 4: Time Budget Computation
**What:** Pure function that takes active assignments + profile and returns total estimated minutes for tonight, grouped by class.
**When to use:** Dashboard "What's left tonight?" section; no AI involved.

```typescript
// lib/time-budget/compute.ts
export type BudgetItem = {
  assignmentId: string;
  title: string;
  classId: string;
  effectiveMinutes: number;  // after dyslexia multiplier
  dueAt: string | null;
};

export function computeNightBudget(
  assignments: Assignment[],
  profile: { diagnoses: string[]; extra_time_pct: number },
  windowEndHour: number = 23,  // midnight by default
): { totalMinutes: number; items: BudgetItem[] }
```

### Pattern 5: Calibrated Estimate Prompt
**What:** After `createAssignment` returns, if the user has 3+ `assignment_time_log` entries for that `kind`, show a subtle inline note: "You usually take ~X min for essays. Your estimate: Y min."
**When to use:** `NewAssignmentForm` after successful submission, before redirect. Or on the assignment detail page.

```typescript
// Server-side: query assignment_type_estimates for user+kind
// If n >= 3 and user_estimate differs from mean by >20%, render note
// Tone: "Your last 3 essays took about 65 minutes on average. You estimated 30."
// Never: "You always underestimate." "You got it wrong last time."
```

### Pattern 6: Implementation-Intention Prompt (F14)
**What:** After assignment creation, redirect to `/assignments/[id]?intent=new`. The detail page detects `?intent=new` and renders an inline prompt: "When and where will you start this?" Skippable.
**When to use:** Only on first creation (not on every visit). Uses `useSearchParams` to detect `intent=new` param.

```typescript
// app/(app)/assignments/[id]/page.tsx — extend to accept searchParams
// If searchParams.intent === "new" → render IntentionPrompt component
// IntentionPrompt: textarea + "Save" + "Skip for now" (no penalty, no visual difference)
// On save: insert into assignment_intentions
// On skip or save: router.replace(`/assignments/${id}`) to remove ?intent=new
```

### Anti-Patterns to Avoid
- **Modal on every page for the intent prompt:** The spec says skippable in "one tap." A modal that appears everywhere is friction. Use a page-level inline prompt on the detail page only, triggered by URL param.
- **Blocking capture behind a loading spinner:** Capture must feel instant. Write to IndexedDB first; sync in background. Never make the student wait for the network.
- **Auto-classifying without confirmation:** The spec explicitly requires "Student confirms or edits in one tap." Always show the AI suggestion as a suggestion, not a done deal.
- **Storing Blobs in localStorage:** localStorage can't store binary data (photos). Use IndexedDB or upload to Supabase Storage before queuing.
- **Showing "past due" text anywhere:** The project's no-shame policy applies to inbox items too — no "overdue capture" language.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IndexedDB wrapper for offline queue | Custom IndexedDB open/transaction/store code | `idb-keyval` | Handles versioning, errors, and async boilerplate; ~600B |
| Browser voice input | Web Audio + MediaRecorder pipeline | `VoiceTextarea` (already exists) | Browser SpeechRecognition is already wired and working |
| Camera photo input | Custom getUserMedia/canvas pipeline | `<input type="file" accept="image/*" capture="environment">` | Native HTML; works on iOS/Android/desktop PWA; no package needed |
| OCR of homework photos | Custom vision model | Claude Haiku 4.5 vision via Edge Function | Existing API key; handles handwritten + printed text; Haiku = cheap |
| Time formatting | Custom duration strings | `date-fns` (already in deps) | `formatDistanceToNow`, `differenceInMinutes` already available |
| Classification AI | Custom NLP | Claude Haiku 4.5 via Edge Function | Already the project's pattern for AI; Haiku is fast enough for ≤3s latency |
| Push notification scheduling | Custom polling | Browser Notifications API + stored `scheduled_for` (checked at app open) | Web Push is complex; Phase 3 can store intent cue text and surface it at app open or 6 PM prompt — actual scheduling deferred to Phase 7 |

---

## Current Schema State (after Phase 2)

The following tables exist (verified from `lib/supabase/types.ts` and migration files):
- `profiles` — all GAP-01/02 fields including `class_count_hint`
- `assignments` — all columns including `pivot_note`, `parent_assignment_id`, `kind`, `reading_load`, `writing_load`, `last_thought`
- `task_signals` — with compound index `(owner_id, assignment_id, occurred_at desc)`
- `submission_checklist`
- `classes`, `rubrics`, `ai_calls`

**Tables NOT present (required by Phase 3):**
```
inbox_items              — F04 capture inbox
assignment_time_log      — F05 actual elapsed time tracking
assignment_type_estimates — F05 calibrated estimates per kind
assignment_intentions    — F14 implementation intentions
```

Next migration number: **0009** (0008 was `class_count_hint` from Phase 2)

---

## Migration Plan

### Migration 0009: inbox and time layer

```sql
-- F04: Universal capture inbox
create table public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  raw text not null,
  capture_mode text not null check (capture_mode in ('voice','photo','text')),
  photo_storage_key text,                     -- Supabase Storage path, nullable
  status text not null default 'unclassified'
    check (status in ('unclassified','classified','dismissed','converted')),
  -- AI classification result (populated by Edge Function after save)
  suggested_class_id uuid references public.classes(id) on delete set null,
  suggested_kind text,
  suggested_due_at timestamptz,
  suggestion_confidence numeric(3,2),         -- 0.00–1.00
  -- Converted to assignment
  assignment_id uuid references public.assignments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.inbox_items enable row level security;
create policy "owner only" on public.inbox_items
  using (owner_id = auth.uid());

-- F05: Time-blindness aids — elapsed time log
create table public.assignment_time_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,                       -- null while still in progress
  elapsed_minutes int,                        -- computed on close; student-editable
  edited_by_student boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.assignment_time_log enable row level security;
create policy "owner only" on public.assignment_time_log
  using (owner_id = auth.uid());

-- F05: Calibrated estimates per assignment type
create table public.assignment_type_estimates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  mean_minutes numeric(6,1) not null,
  n_samples int not null default 0,
  updated_at timestamptz not null default now(),
  unique (owner_id, kind)
);

alter table public.assignment_type_estimates enable row level security;
create policy "owner only" on public.assignment_type_estimates
  using (owner_id = auth.uid());

-- F14: Implementation intentions
create table public.assignment_intentions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  cue_type text not null check (cue_type in ('time','event','location','other')),
  cue_value text not null,                    -- e.g. "after dinner" or "7:30 PM"
  action_text text,                           -- e.g. "open my essay doc and write the intro"
  scheduled_for timestamptz,                 -- parsed time-based cue; nullable
  fired_at timestamptz,                      -- when notification was delivered; nullable
  created_at timestamptz not null default now()
);

alter table public.assignment_intentions enable row level security;
create policy "owner only" on public.assignment_intentions
  using (owner_id = auth.uid());
```

---

## Common Pitfalls

### Pitfall 1: Background Sync has no Firefox/Safari support
**What goes wrong:** Developer writes a service worker that uses the Background Sync API (`sync` event). Works on Chrome but silently fails on Firefox and iOS Safari — precisely the browsers many students use.
**Why it happens:** Background Sync was a Chrome-only feature for years; Firefox still has it disabled; Safari never implemented it.
**How to avoid:** Use `idb-keyval` to queue items and drain the queue in the client component's `useEffect` on the `window.online` event + on app load. This works cross-browser, doesn't require a service worker sync event.
**Warning signs:** Testing only on Chrome/Edge during development.

### Pitfall 2: Photo capture on iOS requires specific `accept` + `capture` attributes
**What goes wrong:** `<input type="file" accept="image/*">` opens the photo library on iOS (not the camera). Students may not understand they need to select "Take Photo."
**Why it happens:** iOS distinguishes between camera capture and gallery picker.
**How to avoid:** Use `<input type="file" accept="image/*" capture="environment">` to prefer the rear camera. Note this attribute is a hint, not a guarantee — if on desktop, it falls back to file picker gracefully.
**Warning signs:** Testing only on desktop; photo capture works but students get library picker not camera.

### Pitfall 3: Uploading photo to Supabase Storage before going offline
**What goes wrong:** User takes photo while offline; trying to upload to Storage fails silently; queue entry has no photo.
**Why it happens:** Storage upload is a network request; can't be queued in IndexedDB as a "pending upload" without the file Blob.
**How to avoid:** Store the Blob itself in IndexedDB using idb-keyval (IndexedDB can store Blobs, unlike localStorage). On reconnect, upload Blob to Storage first, then save inbox item with `photo_storage_key`. The queue entry should contain `{ blob: Blob, raw: string, ... }`.
**Warning signs:** Testing offline photo capture without checking that the Blob is persisted in IDB.

### Pitfall 4: AI classification blocks the capture-saved confirmation
**What goes wrong:** The capture form submits → waits for Edge Function classification → shows classification → student sees a loading spinner instead of "saved!" immediately.
**Why it happens:** Treating classification as synchronous when it's not required to be.
**How to avoid:** Save the `inbox_item` row immediately with `status = 'unclassified'` and redirect to `/inbox`. Trigger classification in a background Edge Function call (or via a webhook/realtime subscription). Student sees the item in inbox; classification fills in when ready.
**Warning signs:** The capture form has an awaited async call to the classify function in the submit handler.

### Pitfall 5: Time budget uses `estimated_minutes` even when null
**What goes wrong:** Many assignments don't have an estimate. Budget view shows 0 minutes or NaN for those.
**Why it happens:** `estimated_minutes` is nullable in the schema.
**How to avoid:** Use the calibrated mean from `assignment_type_estimates` as a fallback when `estimated_minutes` is null. If no calibration data, use a per-kind default (essay: 60, problem_set: 45, reading: 30, other: 30). Document this fallback logic.
**Warning signs:** Budget total is much smaller than it should be; assignments without estimates disappear from the count.

### Pitfall 6: Intent prompt shown on every assignment visit via searchParams
**What goes wrong:** `?intent=new` stays in the URL (user bookmarks it, or Next.js router preserves it), causing the prompt to re-appear on every page load.
**Why it happens:** searchParams are part of the URL; refreshing the page re-reads them.
**How to avoid:** In the `IntentionPrompt` component, call `router.replace(pathname)` immediately on mount (remove the `?intent=new` param). This way, the prompt appears once and the URL is cleaned immediately.
**Warning signs:** User sees the intent prompt on returning to an assignment they already set an intention for.

### Pitfall 7: `assignment_type_estimates` needs atomic upsert, not select-then-update
**What goes wrong:** Two `in_progress → done` transitions happen close together (page refresh, race condition). Both SELECT the estimate row, both compute a new mean, both UPDATE — last write wins and loses one sample.
**Why it happens:** SELECT-then-compute-then-UPDATE is not atomic.
**How to avoid:** Use a Supabase `rpc()` call to a Postgres function, or compute the running mean using SQL directly:
```sql
insert into public.assignment_type_estimates (owner_id, kind, mean_minutes, n_samples)
values ($owner_id, $kind, $elapsed, 1)
on conflict (owner_id, kind) do update set
  mean_minutes = (assignment_type_estimates.mean_minutes * assignment_type_estimates.n_samples + excluded.mean_minutes)
                 / (assignment_type_estimates.n_samples + 1),
  n_samples = assignment_type_estimates.n_samples + 1,
  updated_at = now();
```
**Warning signs:** `n_samples` count is lower than expected after multiple completions.

---

## Code Examples

### Offline Queue Drain on Reconnect
```typescript
// components/capture-form.tsx (partial)
"use client";

import { useEffect } from "react";
import { getQueuedItems, removeQueuedItem } from "@/lib/inbox/queue";
import { saveInboxItem } from "./actions";

export function CaptureForm() {
  // Drain queue on mount and when coming back online
  useEffect(() => {
    async function drain() {
      const queued = await getQueuedItems();
      for (const item of queued) {
        const result = await saveInboxItem(item);
        if (result.ok) {
          await removeQueuedItem(item.tempId);
        }
      }
    }

    drain(); // Try on mount
    window.addEventListener("online", drain);
    return () => window.removeEventListener("online", drain);
  }, []);

  // ... capture form UI
}
```

### Save Inbox Item with Offline Fallback
```typescript
// app/(app)/quick-add/capture-form.tsx (partial submit handler)
async function handleSubmit() {
  const tempId = crypto.randomUUID();
  const item: QueuedInboxItem = { tempId, raw: text, captureMode: mode, queuedAt: new Date().toISOString() };

  // Write to IDB immediately — user gets instant feedback
  await enqueueInboxItem(item);
  setStatus("saved");

  // Attempt server save in background
  const result = await saveInboxItem(item).catch(() => null);
  if (result?.ok) {
    await removeQueuedItem(tempId);
  }
  // If failed (offline), item stays in queue and drains when online
}
```

### Upsert Calibrated Estimate (atomic)
```typescript
// lib/time-budget/calibration.ts
export async function recordElapsedTime(
  supabase: SupabaseClient,
  ownerId: string,
  assignmentId: string,
  kind: AssignmentKind,
  elapsedMinutes: number,
): Promise<void> {
  // 1. Close the open time_log row
  await supabase
    .from("assignment_time_log")
    .update({ ended_at: new Date().toISOString(), elapsed_minutes: elapsedMinutes })
    .eq("assignment_id", assignmentId)
    .is("ended_at", null);

  // 2. Upsert the running mean atomically via raw SQL
  await supabase.rpc("upsert_type_estimate", {
    p_owner_id: ownerId,
    p_kind: kind,
    p_elapsed: elapsedMinutes,
  });
}
```

### Calibration Note in Assignment Form
```typescript
// Display after estimate input when calibration data exists
{calibration && calibration.n >= 3 && (
  <p className="text-xs text-muted mt-1">
    Your last {calibration.n} {KIND_LABEL[kind].toLowerCase()}s
    took about {Math.round(calibration.mean)} minutes on average.
  </p>
)}
```

### Implementation Intention Prompt
```typescript
// app/(app)/assignments/[id]/page.tsx — extend
export default async function AssignmentDetailPage({
  params, searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ intent?: string; focus?: string }>;
}) {
  const { id } = await params;
  const { intent } = await searchParams;
  // ... existing fetch logic ...
  return (
    <div className="space-y-8">
      {/* ... existing content ... */}
      {intent === "new" && (
        <IntentionPrompt assignmentId={id} />
      )}
    </div>
  );
}
```

```typescript
// app/(app)/assignments/[id]/intention-prompt.tsx
"use client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { saveIntention } from "./actions";

export function IntentionPrompt({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [cue, setCue] = useState("");

  // Clean ?intent=new from URL immediately so refresh doesn't re-show
  useEffect(() => {
    router.replace(pathname);
  }, [router, pathname]);

  function skip() {
    // No action needed — URL already cleaned by useEffect
  }

  function save() {
    if (!cue.trim()) return;
    startTransition(async () => {
      await saveIntention({ assignmentId, cueValue: cue.trim() });
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <p className="font-medium">When and where will you start?</p>
      <p className="text-sm text-muted">For example: "After dinner, at my desk" or "Study hall tomorrow."</p>
      <textarea
        value={cue}
        onChange={(e) => setCue(e.target.value)}
        rows={2}
        className="input w-full"
        placeholder="After dinner, at my desk..."
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending || !cue.trim()}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={skip}
          className="rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:bg-border/30"
        >
          Skip for now
        </button>
      </div>
    </section>
  );
}
```

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Browser Web Speech API | Voice capture | Available on Chrome/Safari; partial Firefox | Browser built-in | VoiceTextarea already handles unsupported browsers silently |
| Supabase Storage | Photo upload | Available (Supabase project already configured) | Current | — |
| `<input capture="environment">` | Camera photo | Available on iOS/Android; desktop falls back to file picker | Browser built-in | File picker works as fallback |
| idb-keyval (IndexedDB) | Offline queue | Available on all modern browsers | npm ^6.2.1 | localStorage (no Blob support) — only needed if idb-keyval install fails |
| Claude Haiku 4.5 via Supabase Edge Function | OCR + classification | Available (existing Anthropic API key) | claude-haiku-4-5 | Fallback: skip OCR, let user type the text |
| Deepgram API | Server STT (deferred) | Not yet configured | — | Browser Web Speech API (Phase 3 default) |

**Missing dependencies with no fallback:** None blocking Phase 3.

**Missing dependencies with fallback:**
- Supabase Storage bucket `inbox-photos` not yet created — needs creation in migration or via Supabase dashboard before photo uploads work. Fallback: Phase 3 could defer photo upload and OCR to a follow-up task.

---

## Validation Architecture

Config `workflow.nyquist_validation: true` — section required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` (exists, configured) |
| Quick run command | `npm run test:run -- lib/` |
| Full suite command | `npm run test:run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| F04 | `enqueueInboxItem` stores item in IndexedDB; `getQueuedItems` returns it | unit | `npm run test:run -- lib/inbox/queue.test.ts` | ❌ Wave 0 |
| F04 | `removeQueuedItem` removes item from queue | unit | same | ❌ Wave 0 |
| F05 | `computeNightBudget` sums effective_minutes across active assignments | unit | `npm run test:run -- lib/time-budget/compute.test.ts` | ❌ Wave 0 |
| F05 | `computeNightBudget` applies dyslexia multiplier (1.6×) for reading-heavy tasks | unit | same | ❌ Wave 0 |
| F05 | `computeNightBudget` uses per-kind default when estimated_minutes is null | unit | same | ❌ Wave 0 |
| F05 | Calibration note fires only when n >= 3 | unit | `npm run test:run -- lib/time-budget/calibration.test.ts` | ❌ Wave 0 |
| F14 | `saveIntention` inserts row with correct cue_type + cue_value | integration/manual | manual Supabase inspect | manual |
| F04 | Classification Edge Function returns suggestedClassId + confidence | integration/manual | manual test via `curl` or Supabase dashboard | manual |

**Note on idb-keyval tests:** IndexedDB is not available in Node.js (Vitest default environment). The queue tests need `@vitest-environment jsdom` pragma, or use a mock. idb-keyval exports a mock-friendly API when a custom driver is supplied. Simplest approach: mock `idb-keyval` with a plain Map in tests.

```typescript
// lib/inbox/queue.test.ts — header
// @vitest-environment jsdom
import { vi } from "vitest";
vi.mock("idb-keyval", () => {
  const store = new Map();
  return {
    get: vi.fn((k) => Promise.resolve(store.get(k))),
    set: vi.fn((k, v) => { store.set(k, v); return Promise.resolve(); }),
    del: vi.fn((k) => { store.delete(k); return Promise.resolve(); }),
    keys: vi.fn(() => Promise.resolve([...store.keys()])),
  };
});
```

### Sampling Rate
- **Per task commit:** `npm run test:run -- lib/`
- **Per wave merge:** `npm run test:run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `lib/inbox/queue.test.ts` — covers F04 IndexedDB queue operations (with idb-keyval mock)
- [ ] `lib/time-budget/compute.test.ts` — covers F05 budget computation (3 cases: normal, dyslexia, null estimate)
- [ ] `lib/time-budget/calibration.test.ts` — covers F05 calibration threshold (n < 3, n >= 3)
- [ ] `supabase/migrations/0009_inbox_and_time_layer.sql` — new tables (no test, but must exist before any server action works)

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Background Sync API for offline PWA | IndexedDB queue + online event drain | Background Sync not in Firefox/Safari; online event is universal |
| Server STT (Whisper large model) | Browser Web Speech API for Phase 3 | Zero cost; sufficient for capture note-taking; upgrade to Deepgram if accuracy is a user complaint |
| Per-image OCR vendor (Google Vision, AWS Textract) | Claude Haiku 4.5 vision via existing Anthropic key | One vendor; already integrated; Haiku rates competitive with Google ($1.50/1000 units) |
| Separate notification scheduling service | Store `scheduled_for` + check at app open | Push notification infrastructure deferred; 6 PM evening check is a simple heuristic |

---

## Open Questions

1. **Should voice capture use browser STT or Deepgram for Phase 3?**
   - What we know: Browser Web Speech API is already wired in `VoiceTextarea`; Deepgram is $0.0077/min streaming with $200 free credit; Whisper is $0.006/min batch.
   - What's unclear: Whether browser STT accuracy is acceptable for ADHD students dictating class instructions. Browser STT has no offline support.
   - Recommendation: Ship Phase 3 with browser STT. Add a "STT accuracy" feedback mechanism. If students report problems, add Deepgram in a targeted task — the Edge Function pattern is already established.

2. **Should the Supabase Storage bucket for inbox photos be public or private?**
   - What we know: Photos contain student homework details — privacy matters. Private buckets require signed URLs.
   - What's unclear: Signed URL generation adds complexity to the Edge Function (OCR call needs a URL the function can read).
   - Recommendation: Use a private bucket. The Edge Function (which runs in the service-role context) can download the blob directly via `supabase.storage.from("inbox-photos").download(path)` and pass it to Claude as a base64 image. Do not generate public URLs for student work.

3. **Where does the "what's left tonight?" budget view live — dashboard or dedicated route?**
   - What we know: Spec says "dashboard panel"; the existing dashboard is already crowded with the top task + "also on deck" list.
   - What's unclear: Whether a dedicated `/focus` or `/tonight` route gives better UX for ADHD users (no competing visual elements) vs. dashboard integration.
   - Recommendation: Add it as a collapsible section at the bottom of the dashboard page. A student can expand it when planning; it doesn't take up space by default. This matches the spec's "what's left tonight?" framing without cluttering the primary "next 5 minutes" view.

4. **How to open the time_log entry when transitioning `todo → drafting`?**
   - What we know: The spec says "when student transitions `in_progress → done`, log elapsed wall time." The state machine uses `drafting` for in_progress. The transition `todo → drafting` is the "start" event; `drafting/checking → exporting/submitted` is the "done" event.
   - What's unclear: Whether to open a `started_at` row on `transitionAssignment(todo → drafting)` or let the student log manually.
   - Recommendation: Automatically insert an `assignment_time_log` row with `started_at = now()` and `ended_at = null` when transitioning to `drafting` (same place `task_signals` is inserted). Close it when transitioning to `exporting` or `submitted`. Allow student to edit `elapsed_minutes` on the submit page.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `app/layout.tsx`, `app/manifest.ts`, `app/(app)/quick-add/page.tsx`, `components/voice-textarea.tsx`, `app/(app)/assignments/new/form.tsx`, `app/(app)/assignments/new/actions.ts`, `app/(app)/dashboard/page.tsx`, `lib/scoring/next-five-minutes.ts`, `lib/supabase/types.ts`, all migration files
- `docs/spec/features.md` §F4, §F5, §F14 — acceptance criteria verified verbatim
- `vitest.config.ts` — test infrastructure confirmed as configured
- `package.json` — all installed versions confirmed

### Secondary (MEDIUM confidence)
- Deepgram pricing: [Deepgram pricing page](https://deepgram.com/pricing) — $0.0077/min streaming (Nova-3); $200 free credit on signup. Search result from Deepgram's own docs (vendor-authored, likely accurate but verify against official pricing page).
- OpenAI Whisper pricing: $0.006/min batch — from search results corroborated by multiple sources.
- idb-keyval 6.2.1: [LogRocket offline storage for PWAs](https://blog.logrocket.com/offline-storage-for-pwas/) + MDN IndexedDB docs — idb-keyval recommended as the standard small library for offline-first PWAs.
- Background Sync browser support gap (no Firefox, no Safari): [Advanced PWA guide](https://rishikc.com/articles/advanced-pwa-features-offline-push-background-sync/) + confirmed by MDN compatibility tables (known limitation as of 2025).
- Claude Haiku 4.5 pricing: $1/MTok input, $5/MTok output — [Anthropic pricing docs](https://platform.claude.com/docs/en/about-claude/pricing). Per-image cost approximately $0.001–0.003 for a standard homework photo.
- Implementation intention evidence for ADHD: [White Rose Research](https://eprints.whiterose.ac.uk/id/eprint/94825/3/WRRO_94825.pdf) + 2024 meta-analysis in British Journal of Psychology (642 tests) — solid evidence base for F14.

### Tertiary (LOW confidence — needs validation)
- Exact Supabase Storage private bucket + Edge Function download pattern: based on Supabase docs pattern; verify exact API call in Edge Function context against [Supabase storage docs](https://supabase.com/docs/guides/storage/uploads/standard-uploads).

---

## Metadata

**Confidence breakdown:**
- F04 capture architecture: HIGH — VoiceTextarea exists, photo input pattern is standard HTML, offline queue with idb-keyval is well-established
- F05 time budget computation: HIGH — pure function on top of existing data model patterns
- F14 implementation intention: HIGH — lightweight DB + inline UI, no new architecture needed
- STT provider choice: MEDIUM — browser STT is confirmed working; Deepgram/Whisper comparison from Deepgram's own site (vendor bias possible, but numbers corroborated by multiple sources)
- OCR via Claude Haiku vision: MEDIUM — OCR capability confirmed, per-image cost estimated from token pricing (not a per-image published rate)
- Migration SQL: HIGH — follows exact patterns from existing migrations 0001–0008

**Research date:** 2026-05-28
**Valid until:** 2026-06-28 (stable codebase; pricing may shift slightly but not materially)
