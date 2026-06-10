# Best-in-Class Completion Plan (2026-06-10)

Audit verdict by category, then the execution plan. Live teen testing is
explicitly out of scope per owner direction.

## Audit snapshot

| Category | Status | Gap |
|---|---|---|
| Methodology / learning logic | Best in class | Rubric→prep→grades→adaptation loop complete; FSRS default weights remain |
| AI safety / authorship | Best in class | None known |
| Performance (server) | Good | Dashboard runs ~14 sequential-ish queries; no prompt caching on Edge Functions |
| Performance (client) | Good | First Load JS ~102kB shared (healthy); streaming only on math chat |
| UI/UX interaction | Best in class for ADHD/LD | — |
| UI/UX visual delight | Good, not best | Needs motion/illustration polish passes; no human designer yet |
| Accessibility | Strong, unaudited | Needs automated axe pass in E2E |
| Ops | Good | CI live; cron live; senders verified; single env still |
| Distribution | PWA only | Capacitor store build is owner-gated (accounts) |

## Execution phases (work top to bottom; commit per phase; all gates green)

### P1 — Performance: dashboard query consolidation
Dashboard `page.tsx` fires ~14 awaited Supabase queries. Batch the
independent ones into Promise.all groups (signals/time-logs/journey checks
already partly batched — finish the job). Target: ≤4 await points.

### P2 — Performance: prompt caching on Edge Functions
Add `cache_control: {type: "ephemeral"}` to the system prompt block in all
16 Claude-calling functions (anthropic-version supports prompt caching).
System prompts are stable per student-day → big latency + cost win.
Mechanical codemod like the adaptation one; redeploy all.

### P3 — Streaming everywhere conversational
Reuse lib/ai/stream-client pattern for writing-cowrite chat and study
scaffolds with chat shape (check each surface; only convert true
conversational UIs).

### P4 — Accessibility audit gate
Add @axe-core/playwright to e2e-flows: assert zero serious/critical
violations on dashboard, settings, assignment page, onboarding. Fix what it
finds (likely: contrast on muted text, missing landmarks).

### P5 — Visual delight pass (code-achievable)
- Page-load stagger (animate-slide-up with per-card delays) on dashboard.
- Hover lift + active states on all primary cards (press-scale exists).
- Subject-color accents on assignment cards (classes have colors — use them
  more boldly in list rows and hero).
- Onboarding wizard: step transition animation (slide between steps).
All behind prefers-reduced-motion.

### P6 — FSRS per-student weight optimization
lib/fsrs has default W. Implement light-weight per-student optimization:
after ≥50 reviews, fit retention offset (not full 19-param optimization —
a simple stability multiplier from observed vs predicted recall). Pure,
tested, conservative.

### P7 — Realtime collaborative notes
Replace 500ms polling with Supabase Realtime channel subscription
(postgres_changes on group note id). Fallback to polling if channel errors.

### P8 — Final sweep
- README refresh (it still says v1-era things; tone-audit 'deadline' warning).
- launch-audit: add CI badge/links; verify all docs current.
- Full gates + dark/light QA run + commit + push.

### P9 — Subject methodology sweep + math/science alignment workspace
Owner-added. Two parts:

**A. Methodology sweep, every high-school subject.** Audit each subject
helper (math, science, history, English/writing, CS, language, arts,
health/PE, AP) against: (1) does its scaffold match the discipline's
evidence-based method (e.g., science = claim-evidence-reasoning, history =
sourcing/corroboration, math = worked-example + self-explanation)? (2) does
it support memory (links into FSRS/concepts)? (3) does it support
organization (steps, checklists)? Fix the weakest gaps found.

**B. Alignment workspace for math/science (dysgraphia-first).** Misaligned
columns are a top cause of wrong answers for dysgraphic students. Build a
**digit-grid workspace** (graph-paper cells, one digit per cell, auto-column
alignment) for long division / multi-digit multiplication / stacked
addition-subtraction and science unit work: the grid makes misalignment
impossible rather than detecting it after the fact. Includes: carry/borrow
row, place-value column guides, step history the student can scroll
(memory support), TTS of current step. Photo-scan path: the existing math
photo scan adds an alignment check ("your tens column drifted — here's the
aligned layout"). Live pen-stroke capture with automatic ink realignment is
documented as a stretch item (needs handwriting recognition; revisit with
native app work).

## Done definition
Every phase committed, 600+ tests green, qa:responsive clean both themes,
CI green on GitHub, README current. Store build + designer pass + teen
testing remain owner-gated and documented as such.
