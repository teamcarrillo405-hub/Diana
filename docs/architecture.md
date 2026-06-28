# Diana — Architecture

How Diana is built and why. References `docs/research/findings.md` and `docs/spec/features.md`.

This is a working architecture doc, not a manifesto. Decisions are made; rationale is short.

Related boundary doc: `docs/architecture/command-center-integration.md` covers
how Paperclip, OpenJarvis, and gstack connect around Diana without entering the
core student runtime.

---

## Stack overview

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 15 + TypeScript (App Router) | RSC for fast page loads on Chromebooks; Vercel deploy; strong AI SDK fit |
| Hosting | Vercel | Zero-config Next.js; preview deploys per branch; Edge runtime for snappy AI calls |
| PWA | `next-pwa` (or `serwist`) | Installable on iOS/Android; offline shell |
| Backend | Supabase | Postgres + Auth + Storage + Edge Functions + Realtime + pgvector; MCP-connected |
| Auth | Supabase Auth | Email/password + Google OAuth; built-in parent-link via row relationships |
| AI provider | Anthropic Claude | Sonnet 4.6 default; Opus 4.7 for hard math/long reading; Haiku 4.5 for cheap ops |
| TTS | TBD — defer to slice 3 | Browser SpeechSynthesis is free but inconsistent; ElevenLabs/Azure/OpenAI for quality |
| STT | TBD — defer to slice 4 | Whisper API (OpenAI) or Deepgram; cost matters |
| OCR | TBD — defer to slice 2 | Cloud Vision, Textract, or Claude's vision capabilities |
| Math expression parsing | TBD — defer to slice 5 | MathLive for input UI; SymPy via WASM or server for validation |
| Spaced repetition | FSRS-5 (open algorithm) | Implemented in `lib/srs/` — local TS port |

**Defer decisions** for TTS/STT/OCR/math until the slice that needs them. We don't need to pick a TTS provider in slice 1.

---

## Repo layout

```
diana/
├── app/                              # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── parent-verify/page.tsx
│   ├── (app)/                        # authenticated routes
│   │   ├── layout.tsx                # nav shell, PWA chrome
│   │   ├── dashboard/page.tsx        # "Your next 5 minutes" (F3)
│   │   ├── inbox/page.tsx            # capture inbox (F4)
│   │   ├── classes/
│   │   │   ├── page.tsx              # class list
│   │   │   ├── new/page.tsx
│   │   │   └── [classId]/
│   │   │       ├── page.tsx          # class hub
│   │   │       ├── assignments/[id]/page.tsx
│   │   │       ├── notes/page.tsx
│   │   │       ├── read/page.tsx     # reader (F6/F7)
│   │   │       ├── write/[draftId]/page.tsx  # writing aid (F10)
│   │   │       ├── math/page.tsx     # step organizer (F9)
│   │   │       └── study/page.tsx    # FSRS (F12)
│   │   └── settings/page.tsx
│   ├── api/                          # thin Next route handlers
│   │   ├── ai/                       # forwards to Supabase Edge Functions
│   │   └── ocr/
│   ├── manifest.ts                   # PWA manifest
│   └── globals.css
├── components/
│   ├── ai/                           # AI UI: refusal banner, escape valve, log viewer
│   ├── reading/                      # TTS controls, comprehension prompts
│   ├── writing/                      # feedback panel, rule-explainer
│   ├── math/                         # step ledger
│   ├── srs/                          # review card UI
│   ├── timer/                        # focus timer
│   ├── ui/                           # design system (shadcn/ui base)
│   └── tone-test.ts                  # runtime check no "incorrect" copy
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # browser
│   │   ├── server.ts                 # server components/actions
│   │   └── service.ts                # service-role (edge functions only)
│   ├── ai/
│   │   ├── client.ts                 # Anthropic SDK wrapper
│   │   ├── prompts/                  # all system prompts as TS modules
│   │   ├── cache.ts                  # cache key strategy
│   │   ├── models.ts                 # per-task model selection
│   │   └── refusal.ts                # refuse-with-redirect logic
│   ├── srs/
│   │   ├── fsrs.ts                   # FSRS-5 algorithm
│   │   └── scheduler.ts
│   ├── time/                         # time-blindness math, calibration
│   ├── authorship/                   # log helpers
│   └── policy/                       # traffic-light system prompts
├── supabase/
│   ├── migrations/                   # SQL versioned here
│   ├── functions/                    # edge functions
│   │   ├── ai-chat/                  # generic Claude proxy with logging
│   │   ├── ai-validate-step/         # math step validation
│   │   ├── ai-feedback/              # writing feedback
│   │   ├── ai-comprehension/         # reading prompts + validation
│   │   ├── ai-generate-cards/        # flashcard generation
│   │   ├── ai-summarize-rubric/      # class rubric → structured fields
│   │   └── ai-classify-inbox/        # inbox item → class + assignment
│   └── seed.sql                      # alpha test fixtures
├── docs/
│   ├── research/findings.md
│   ├── spec/features.md
│   ├── architecture.md               # this file
│   └── ai-ethics.md
├── public/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
├── .env.example
├── next.config.mjs
├── package.json
└── tsconfig.json
```

---

## Data model

Postgres schema sketch. RLS enabled on every table. All timestamps UTC.

```sql
-- Users + parents
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  date_of_birth date,                     -- for COPPA age gate; required, never displayed
  needs_parental_consent boolean generated always as (
    date_of_birth > current_date - interval '13 years'
  ) stored,
  consent_status text default 'pending',  -- 'pending' | 'verified' | 'not_required'
  font_preference text default 'atkinson_hyperlegible',
  background_preference text default 'offwhite',
  line_height numeric default 1.6,
  letter_spacing numeric default 0.02,
  reading_speed_wpm integer,               -- learned over time, optional
  tts_voice text,
  tts_speed numeric default 1.0,
  ai_training_opt_out boolean default true,  -- DEFAULT OFF for minors
  created_at timestamptz default now()
);

create table parent_links (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles on delete cascade,
  parent_email text not null,
  parent_name text,
  relationship text,                       -- 'parent' | 'guardian'
  verification_token text,
  verified_at timestamptz,
  verification_method text,                -- 'email_signed_form' | 'kba' | 'text_plus'
  created_at timestamptz default now()
);

-- For future school tier; nullable for student-owned tier
create table schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ndpa_signed_at timestamptz,
  state text,
  created_at timestamptz default now()
);

create table school_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  school_id uuid references schools on delete cascade,
  role text,                               -- 'student' | 'teacher' | 'admin'
  created_at timestamptz default now()
);

-- Classes
create table classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  school_id uuid references schools,        -- nullable
  name text not null,
  subject_category text,                    -- 'english' | 'math' | 'science' | 'history' | 'foreign_language' | 'other'
  teacher_name text,
  schedule_text text,                       -- free-form; structured later
  color text default '#6B7280',
  ai_policy text default 'yellow' check (ai_policy in ('red', 'yellow', 'green')),
  rubric_summary jsonb,                     -- structured fields extracted by AI
  rubric_summary_cache_key text,            -- for Anthropic prompt cache
  archived_at timestamptz,
  created_at timestamptz default now()
);

create table class_documents (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes on delete cascade,
  kind text,                                -- 'syllabus' | 'rubric' | 'rules' | 'other'
  title text,
  storage_path text,                        -- Supabase Storage path
  extracted_text text,                      -- OCR/PDF text
  uploaded_at timestamptz default now()
);

-- Inbox (pre-classification)
create table inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  source text,                              -- 'voice' | 'photo' | 'text'
  raw_content text,
  transcript text,
  image_path text,
  ai_suggested_class_id uuid references classes,
  ai_suggested_type text,
  ai_suggested_due_date date,
  ai_confidence numeric,
  classified_at timestamptz,
  created_at timestamptz default now()
);

-- Assignments
create table assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  class_id uuid references classes on delete cascade,
  title text not null,
  description text,
  assignment_type text,                     -- 'essay' | 'reading' | 'problem_set' | 'lab_report' | 'dbq' | 'study' | 'other'
  due_at timestamptz,
  state text default 'captured' check (state in ('captured', 'planned', 'in_progress', 'done', 'submitted', 'graded')),
  ai_policy_override text check (ai_policy_override in ('red', 'yellow', 'green')),
  submission_link text,                     -- LMS URL the student notes
  submission_proof_path text,               -- photo of paper turn-in
  submitted_at timestamptz,
  estimated_minutes integer,
  last_shown_at timestamptz,                -- for "next 5 minutes" rotation
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table assignment_intentions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references assignments on delete cascade,
  cue_type text,                            -- 'time' | 'event'
  cue_value text,                           -- '19:30' or 'after dinner'
  action_text text,                         -- 'open chapter 14 and read first 3 pages'
  fired_at timestamptz
);

create table assignment_time_log (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references assignments on delete cascade,
  start_at timestamptz,
  end_at timestamptz,
  minutes_logged integer generated always as (
    extract(epoch from (end_at - start_at)) / 60
  ) stored,
  edited_by_student boolean default false
);

-- Notes
create table notes (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes on delete cascade,
  user_id uuid references profiles on delete cascade,
  title text,
  audio_path text,
  transcript text,
  outline jsonb,                            -- structured outline from AI
  created_at timestamptz default now()
);

create table note_markers (
  id uuid primary key default gen_random_uuid(),
  note_id uuid references notes on delete cascade,
  offset_seconds numeric,
  marker_type text,                         -- 'important' | 'confused' | 'photo'
  content_path text                         -- for photo markers
);

-- Readings (F6/F7)
create table readings (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes on delete cascade,
  user_id uuid references profiles on delete cascade,
  title text,
  source_url text,
  storage_path text,
  full_text text,
  vocab_preview jsonb,                      -- AI-generated, cached
  comprehension_questions jsonb,
  created_at timestamptz default now()
);

create table reading_sessions (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid references readings on delete cascade,
  user_id uuid references profiles on delete cascade,
  started_at timestamptz default now(),
  ended_at timestamptz,
  current_offset integer default 0,
  comprehension_checks jsonb               -- prompt + student answer + AI validation
);

-- Drafts (F10)
create table drafts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references assignments on delete cascade,
  content text,
  content_jsonb jsonb,                      -- rich text representation
  version integer default 1,
  updated_at timestamptz default now()
);

create table feedback_events (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid references drafts on delete cascade,
  range_start integer,
  range_end integer,
  feedback_type text,                       -- 'mechanics' | 'style' | 'substance'
  rule_explanation text,
  student_action text,                      -- 'accepted' | 'rejected' | 'edited' | 'ignored'
  created_at timestamptz default now()
);

-- Math (F9)
create table math_problems (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes on delete cascade,
  user_id uuid references profiles on delete cascade,
  problem_text text,
  problem_image_path text,
  final_state text,
  created_at timestamptz default now()
);

create table math_steps (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid references math_problems on delete cascade,
  ordinal integer,
  student_input text,
  resulting_state text,
  validation_result text,                   -- 'valid' | 'unhelpful' | 'invalid'
  ai_explanation text,
  hint_count integer default 0
);

-- Citations (F11)
create table citations (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references assignments on delete cascade,
  user_id uuid references profiles on delete cascade,
  source_data jsonb,
  formatted_text text,
  style text,                               -- 'mla9' | 'apa7' | 'chicago'
  explanation text,
  created_at timestamptz default now()
);

-- Flashcards (F12)
create table decks (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes on delete cascade,
  user_id uuid references profiles on delete cascade,
  name text,
  created_at timestamptz default now()
);

create table cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid references decks on delete cascade,
  front text not null,
  back text not null,
  card_type text default 'basic',           -- 'basic' | 'cloze' | 'image' | 'audio'
  metadata jsonb,
  -- FSRS state inline for hot-path performance
  stability numeric,
  difficulty numeric,
  due_at timestamptz,
  state text default 'new',                 -- FSRS states
  last_reviewed_at timestamptz
);

create table card_reviews (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references cards on delete cascade,
  user_id uuid references profiles on delete cascade,
  rating text,                              -- 'again' | 'hard' | 'good' | 'easy'
  reviewed_at timestamptz default now(),
  previous_state jsonb
);

-- Timer
create table timer_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  started_at timestamptz default now(),
  ended_at timestamptz,
  length_minutes integer,
  finished boolean default false,
  reward_unlocked text
);

-- Authorship log (F15) — the integrity record
create table authorship_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  assignment_id uuid references assignments on delete set null,
  ts timestamptz default now(),
  actor text,                               -- 'student' | 'diana'
  event_type text,                          -- 'ai_suggestion' | 'student_accept' | 'student_reject' | 'refusal' | 'paste_external' | 'dictation' | 'type'
  feature text,                             -- which Diana feature
  payload jsonb
);

create index on authorship_log (user_id, assignment_id, ts desc);
create index on assignments (user_id, state, due_at);
create index on cards (deck_id, due_at) where state != 'new';
```

**RLS policy pattern** (applied to every user-data table):

```sql
alter table assignments enable row level security;

create policy "users access own assignments"
  on assignments for all
  using (auth.uid() = user_id);
```

For the future school tier, RLS gets a second clause keyed on `school_memberships` — students can see their own; teachers can see assignments in classes they're listed for; admins see school-scoped.

---

## AI architecture

### Provider and model selection

| Task | Model | Why |
|---|---|---|
| Inbox classification | Haiku 4.5 | Cheap, frequent, low-stakes |
| Rubric summarization | Sonnet 4.6 | Quality matters; runs once per class |
| Math step validation | Sonnet 4.6 | Reasoning quality |
| Hard math / long-document reading | Opus 4.7 | When Sonnet struggles |
| Writing feedback (mechanics) | LanguageTool first; Haiku 4.5 fallback | Cost; mechanics is mostly rule-based |
| Writing feedback (style/substance) | Sonnet 4.6 | Quality |
| Reading comprehension prompts | Sonnet 4.6 | Long-context grounding |
| Flashcard generation | Sonnet 4.6 | Quality once; reused for weeks |
| Refusal classification | Haiku 4.5 | Fast, every AI call |
| Citation formatting | Sonnet 4.6 with tool use | Structured output |

### Prompt caching strategy

Anthropic prompt caching is critical for cost. We cache aggressively:

- **Class system prompt** (rubric pack + traffic-light policy + tone guide + refuse-with-redirect rubric): 1-hour cache, regenerated when rubric changes.
- **Reading text**: cached when comprehension prompts iterate over the same passage.
- **Per-feature prompt template**: cached at app deploy time as static prefix.

Cache key construction in `lib/ai/cache.ts`. Stored cache breakpoints on the `classes.rubric_summary_cache_key` column for invalidation.

Cost target: ≤ $2/month per active user at typical usage. Sanity check before slice 5 ships.

### Where AI calls live

All Claude calls go through Supabase Edge Functions, never directly from the browser. This:

1. Keeps the API key server-side.
2. Lets us inject the class system prompt + traffic-light policy.
3. Logs every call to `authorship_log` with the user's consent.
4. Enables rate limiting per user.
5. Lets us swap models without client changes.

Pattern:

```ts
// app/api/ai/feedback/route.ts (Next.js route handler)
// → forwards user-authed request to Supabase Edge Function /ai-feedback
// → Edge Function calls Anthropic, logs to authorship_log, returns

// lib/ai/client.ts (client-side caller)
export async function requestFeedback({ draftId, range }) {
  return fetch('/api/ai/feedback', { method: 'POST', body: JSON.stringify({ draftId, range }) });
}
```

Edge Functions are written in TypeScript (Deno runtime). The Anthropic SDK works directly.

### Refuse-with-redirect implementation

Every Edge Function follows the same wrapper:

```ts
// pseudo-code
const result = await callClaude({ system, messages, ... });
const refusal = detectRefusal(result);
if (refusal) {
  const redirects = mapToFeatureRedirects(refusal, classContext);
  await logAuthorship({ actor: 'diana', event_type: 'refusal', payload: { refusal, redirects } });
  return { refused: true, message: result.text, redirects };
}
await logAuthorship({ actor: 'diana', event_type: 'ai_suggestion', payload: result });
return { refused: false, content: result };
```

The system prompt for every Diana AI call includes the refuse-with-redirect rubric (see `docs/ai-ethics.md`).

### Cost guardrails

- Per-user daily token budget tracked in `ai_usage_daily` (user_id, date, input_tokens, output_tokens, cache_read_tokens).
- Soft cap at 200K input + 30K output per user per day. When hit, Diana switches to fallback behaviors (cached responses, simpler models) for non-critical features.
- Hard cap at 500K input + 75K output. Beyond, AI features pause until reset with a friendly explanation.
- Anthropic Zero Data Retention enabled. No-training default on for all under-18 users.

---

## Auth and identity

- **Supabase Auth** for primary identity (email/password + Google OAuth).
- **Email/password** is the universal fallback; some students don't have Google accounts they want to use.
- **Date of birth required at signup** for COPPA age gate. Never displayed in the UI after collection.
- For users with `needs_parental_consent = true`:
  - Account creation pauses at "parent email."
  - Parent receives a signed-consent email (text-plus method documented by FTC).
  - Account is `consent_status = 'pending'` until parent verifies.
  - Pending accounts have read-only access to onboarding screens only.
- For users 13–17 (not COPPA-covered but state laws + parent expectations):
  - Light parent attestation flow — parent email collected, optional verification, no blocking gate.
- For users 18+: standard auth.

### Session model

Supabase SSR session via `@supabase/ssr`. Server components read user; client components use the browser client. Middleware enforces redirect-to-login.

### Parent dashboard (Phase 2)

Architected for now via `parent_links` table; not built in MVP. When built, parent gets a separate auth that resolves to `parent_links.parent_email` → student profile view.

---

## PWA setup

- **Manifest** in `app/manifest.ts` with name "Diana," theme color, icons, `display: standalone`.
- **Service worker** via `next-pwa` or `serwist`. Strategy:
  - Static assets: cache-first.
  - App shell (HTML): network-first with cache fallback.
  - Data (Supabase queries): network-only when online; cached responses for read-only "I just want to see what's due" mode when offline.
  - AI calls: never cached; pure pass-through; queue inbox captures for sync.
- **Offline capture**: inbox writes go into IndexedDB queue, sync on reconnect.
- **Install prompt**: deferred to second visit so we don't shove it at first-time users.
- **iOS specifics**: `apple-touch-icon`, `apple-mobile-web-app-capable`, status bar style. iOS PWAs have limitations (no push notifications until iOS 16.4+, no full background sync) — we accept these and document the gap.

---

## Storage

Supabase Storage buckets:

- `class-documents` — syllabi, rubrics, uploaded PDFs. RLS: user owns.
- `audio-notes` — lecture recordings. RLS: user owns. Default 30-day retention configurable per user.
- `images` — board photos, problem photos, submission-proof photos. RLS: user owns.
- `drafts-export` — PDF exports of authorship logs. RLS: user owns.

All buckets private. Signed URLs for download. Lifecycle policy: drafts-export deleted after 90 days unless re-requested.

---

## Observability

- **Sentry** for client errors. Scrub PII in beforeSend.
- **Supabase logs** for Edge Function execution.
- **Vercel Analytics** (privacy-respecting; no third-party trackers).
- No Google Analytics, no Mixpanel, no Segment. State-law and parent-trust reasons (§6.3).
- **Internal AI cost dashboard** (Edge Function reading `ai_usage_daily`): track cost per active user; flag outliers.

---

## Security model

- All tables RLS-enforced; default deny.
- Service role key (bypasses RLS) used **only** inside Edge Functions and migrations; never in the browser.
- Supabase JWT short-lived (1 hour); refresh token rotation on.
- Storage signed URLs short-lived (15 min default; longer for downloads with user action).
- API keys for Anthropic, third-party AI services kept in Supabase Edge Function secrets — never in `.env` checked into the repo.
- NIST CSF v2.0 alignment posture documented for state-law compliance (§6.3).
- Database encryption at rest (Supabase default).
- TLS 1.2+ in transit.
- Breach-notification commitment in the privacy policy: 72 hours for verified breaches.

---

## Compliance hooks (referenced from §6 of findings.md)

- **Age gate** in `profiles.date_of_birth` + `needs_parental_consent` generated column.
- **Parent verification** via `parent_links` table with FTC-approved methods (initial: signed-form-via-email; KBA/text-plus in slice 2).
- **AI training opt-out** default `true` on `profiles.ai_training_opt_out`. Edge Functions read and pass to provider where supported.
- **Data export**: a "Download my data" button → Edge Function streams a JSON tarball (assignments + notes + readings + flashcards + authorship log + uploads).
- **Account deletion**: a "Delete my account" button → cascading delete + Storage purge + Anthropic deletion request via API. Tombstone record kept 30 days for accidental-delete recovery, then hard-deleted.
- **State-law posture page** at `/privacy/state-laws` listing SOPIPA, NY §2-d, SOPPA, CT PA 16-189, CO HB 16-1423, Texas Ed Code §32.151 commitments.
- **Parents' Bill of Rights** at `/privacy/parents-bill-of-rights`, NY §2-d modeled.

For the future school tier, the data model already supports:
- `schools` table with `ndpa_signed_at`.
- `school_memberships` for role-based access.
- `assignments.school_id` flowing through `classes` → ready for SDPC NDPA enforcement.

---

## Deployment topology

```
            ┌─────────────────────────────────┐
            │   Vercel (Edge + Serverless)    │
            │   Next.js App Router            │
            │   Static + SSR + RSC            │
            └────────────┬────────────────────┘
                         │ HTTPS
                         ▼
            ┌─────────────────────────────────┐
            │     Supabase (managed)          │
            │  ┌──────────┐  ┌──────────┐    │
            │  │ Postgres │  │  Auth    │    │
            │  └──────────┘  └──────────┘    │
            │  ┌──────────┐  ┌──────────┐    │
            │  │ Storage  │  │ Realtime │    │
            │  └──────────┘  └──────────┘    │
            │  ┌──────────────────────────┐  │
            │  │   Edge Functions (Deno)  │  │
            │  └─────────┬────────────────┘  │
            └────────────┼───────────────────┘
                         │ HTTPS
                         ▼
            ┌─────────────────────────────────┐
            │  Anthropic API (Claude)         │
            │  + (later) TTS / STT / OCR      │
            └─────────────────────────────────┘
```

Two Supabase projects: `diana-staging` (linked to `adhd-app` branch previews) and `diana-prod` (linked to `main`).

Vercel preview deploys per PR; environment variables scoped per environment.

---

## Performance budgets

- **Largest Contentful Paint** ≤ 2.5s on mid-tier Chromebook (Lighthouse mobile).
- **Time to Interactive** ≤ 3.5s.
- **Capture-to-saved** ≤ 3s text/voice, ≤ 8s photo+OCR (§F4).
- **AI feedback round trip** ≤ 4s p50, ≤ 8s p95 for short interactions.
- **Lighthouse PWA** ≥ 90 (installable, offline shell, no major a11y issues).
- **Lighthouse Accessibility** ≥ 90 for every page.
- Bundle size: app shell ≤ 200KB gzipped JS. Lazy-load math/writing/reading feature bundles per route.

---

## Testing strategy

- **Unit**: Vitest for `lib/` (FSRS algorithm, time calibration, refusal mapping). High coverage here.
- **Integration**: Vitest + Supabase local for Edge Function logic.
- **E2E**: Playwright for the critical paths: signup → add class → upload rubric → create assignment → mark done → mark submitted. One test per slice.
- **AI behavior tests**: snapshot-style tests with seeded prompts checking that:
  - Refusals trigger on disallowed asks (write my essay, give me the answer).
  - Traffic-light red mode never emits prose.
  - Worked-example escape valve doesn't reveal the student's actual problem.
- **Tone lint**: a custom test that grep-scans the codebase for banned copy patterns (`incorrect`, `wrong`, `you forgot`, `🔥`, "streak").
- **Manual beta** (§Phase 1 beta in the plan): 5–10 real high schoolers, 4 weeks.

---

## Open decisions deferred

These don't block slice 1 but need answers by the slice they apply to:

| Decision | Needed by | Notes |
|---|---|---|
| TTS provider | Slice 3 (reading) | Options: OpenAI, ElevenLabs, Azure, Polly. Tradeoff: voice quality vs. cost vs. word-timing fidelity. |
| STT provider | Slice 4 (notes/voice capture) | OpenAI Whisper API vs. Deepgram vs. AssemblyAI. |
| OCR provider | Slice 2 (capture) | Anthropic Claude vision (multimodal) likely sufficient; backup: Cloud Vision. |
| Math expression parser/validator | Slice 5 (math) | MathLive (input) + SymPy via WASM or server (validation). |
| FSRS-5 TS implementation | Slice 4 (cards) | Port from open-source reference or use `ts-fsrs` library if license OK. |
| Rich text editor for drafts | Slice 5 (writing) | TipTap likely; needs to support range-based feedback annotations. |
| Email service for parent verification | Slice 1 | Resend or SendGrid; needs DKIM/SPF. |
| Error tracking | Slice 1 | Sentry probably; verify privacy policy compatibility. |

Defer means: don't decide now, don't pretend we have. Pick when the feature lands.
