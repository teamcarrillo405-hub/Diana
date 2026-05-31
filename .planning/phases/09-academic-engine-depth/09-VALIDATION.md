---
phase: 9
slug: academic-engine-depth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-30
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run lib/reminders/ lib/task-breakdown/` |
| **Full suite command** | `npm run test:run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run lib/reminders/ lib/task-breakdown/`
- **After every plan wave:** Run `npm run test:run`
- **Before `/gsd:verify-work`:** Full suite must be green + `npm run tone-audit` exits 0
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 09-01 | 1 | F6 DB schema | integration-manual | `supabase db push` or MCP apply_migration | ❌ W0 | ⬜ pending |
| 9-01-02 | 09-01 | 1 | F6 parse robustness | unit | `npx vitest run lib/task-breakdown/parse.test.ts` | ❌ W0 | ⬜ pending |
| 9-01-03 | 09-01 | 1 | F6 UI component | unit | `npm run test:run -- task-breakdown` | ❌ W0 | ⬜ pending |
| 9-02-01 | 09-02 | 1 | F7 quiet hours | unit | `npx vitest run lib/reminders/reminder-rules.test.ts` | ❌ W0 | ⬜ pending |
| 9-02-02 | 09-02 | 1 | F7 banner UI | unit+jsdom | `npm run test:run -- reminder-banner` | ❌ W0 | ⬜ pending |
| 9-03-01 | 09-03 | 1 | F8 day grouping | unit | `npx vitest run lib/wins/group-by-day.test.ts` | ❌ W0 | ⬜ pending |
| 9-03-02 | 09-03 | 1 | F8 wins page | integration-manual | Load /wins in browser, verify calm copy | ❌ W0 | ⬜ pending |
| 9-04-01 | 09-04 | 2 | AP Math formulas | unit | `npm run test:run -- lib/math` | ❌ W0 | ⬜ pending |
| 9-04-02 | 09-04 | 2 | AP Math UI | integration-manual | Load assignment (problem_set), verify accordion | ❌ W0 | ⬜ pending |
| 9-05-01 | 09-05 | 3 | LMS migration | integration-manual | `supabase db push` | ❌ W0 | ⬜ pending |
| 9-05-02 | 09-05 | 3 | Canvas pagination | unit | `npx vitest run lib/lms/canvas.test.ts` | ❌ W0 | ⬜ pending |
| 9-05-03 | 09-05 | 3 | ICS parse | unit | `npx vitest run lib/lms/ics.test.ts` | ❌ W0 | ⬜ pending |
| 9-05-04 | 09-05 | 3 | LMS settings UI | integration-manual | Connect Canvas token in Settings, verify sync | ❌ W0 | ⬜ pending |
| 9-06-01 | 09-06 | 3 | Calendar week grouping | unit | `npx vitest run lib/calendar/week.test.ts` | ❌ W0 | ⬜ pending |
| 9-06-02 | 09-06 | 3 | Calendar week view | integration-manual | Load /calendar, verify 7-day grid + workload bars | ❌ W0 | ⬜ pending |
| 9-07-01 | 09-07 | 4 | AiTooltip component | unit | `npx vitest run components/ai-tooltip.test.tsx` | ❌ W0 | ⬜ pending |
| 9-07-02 | 09-07 | 4 | AiUsageLog component | unit | `npx vitest run components/ai-usage-log.test.tsx` | ❌ W0 | ⬜ pending |
| 9-07-03 | 09-07 | 4 | AI literacy onboarding | integration-manual | Complete onboarding, verify literacy step shows | ❌ W0 | ⬜ pending |
| 9-08-01 | 09-08 | 4 | Share links schema | integration-manual | `supabase db push` | ❌ W0 | ⬜ pending |
| 9-08-02 | 09-08 | 4 | Share link actions | unit | `npx vitest run lib/sharing/actions.test.ts` | ❌ W0 | ⬜ pending |
| 9-08-03 | 09-08 | 4 | Public share route | integration-manual | Load /share/[token], verify parent + teacher views | ❌ W0 | ⬜ pending |
| 9-09-01 | 09-09 | 5 | ThemeProvider | unit | `npx vitest run components/theme-provider.test.tsx` | ❌ W0 | ⬜ pending |
| 9-09-02 | 09-09 | 5 | VocabHoverProvider | unit | `npx vitest run components/vocab-hover-provider.test.tsx` | ❌ W0 | ⬜ pending |
| 9-09-03 | 09-09 | 5 | Dark mode visual | integration-manual | Toggle dark mode in settings, verify all surfaces flip | ❌ W0 | ⬜ pending |
| 9-09-04 | 09-09 | 5 | Vocab hover | integration-manual | Double-click word in assignment description, verify popover | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

**Wave 1–2 (Plans 09-01 through 09-04):**
- [ ] `lib/task-breakdown/parse.test.ts` — covers F6: isValidStep type guard, JSON parse robustness (extract array from prose-wrapped output)
- [ ] `lib/reminders/reminder-rules.test.ts` — covers F7: isQuietHours (20:00–06:59), isWeekend (Sat/Sun), shouldShowReminder (past-due bypasses quiet hours)
- [ ] `lib/wins/group-by-day.test.ts` — covers F8: groupCompletionsByDay buckets signals by calendar day correctly

**Wave 3 (Plans 09-05 through 09-06):**
- [ ] `lib/lms/canvas.test.ts` — covers Canvas pagination (Link header following), null due_at filtering
- [ ] `lib/lms/ics.test.ts` — covers VEVENT parsing, DTSTART timezone handling
- [ ] `lib/calendar/week.test.ts` — covers buildWeek returns 7 days, groupByDay UTC bucketing, workloadTier boundaries (no red class ever returned)

**Wave 4 (Plans 09-07 through 09-08):**
- [ ] `components/ai-tooltip.test.tsx` — renders correct description per feature key, returns nothing for unknown key
- [ ] `components/ai-usage-log.test.tsx` — "AI was used 3 times" framing, tokensToWords conversion (400 → "About 100 words"), no "You used AI" copy
- [ ] `lib/sharing/actions.test.ts` — createShareLink returns token, revokeShareLink sets revoked_at

**Wave 5 (Plan 09-09):**
- [ ] `components/theme-provider.test.tsx` — reads diana_theme localStorage, sets dark class, falls back to system preference
- [ ] `components/vocab-hover-provider.test.tsx` — validates word (rejects non-alpha, too long), calls API on valid double-click selection

*Existing test infrastructure (vitest + jsdom) covers all other requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| task-breakdown Edge Function returns valid JSON steps | F6 | Requires live Supabase + ANTHROPIC_API_KEY | POST `{ assignmentId, text }` to /functions/v1/task-breakdown; verify response has `steps` array with `action` + `minutes ≤ 15` per item |
| Smart reminder banner appears for past-due assignments | F7 | Requires browser with real clock or time-mocked env | Load dashboard with an assignment whose `due_at` is in the past; verify "This is still open." banner visible; verify banner absent between 20:00–07:00 |
| Wins feed shows completed submissions | F8 | Requires real data in task_signals | Submit an assignment, load /wins; verify title and class appear; verify no streak/red copy |
| AP Math worked example returns analogous problem | AP Math | Requires live Supabase + ANTHROPIC_API_KEY | On problem_set assignment, click "Show a worked example"; verify response describes analogous (not identical) problem with step-by-step solution |
| Canvas LMS sync imports assignments | F15 | Requires real Canvas account + personal access token | Connect Canvas in Settings, click Sync; verify assignments appear with correct due dates |
| Google Classroom sync imports coursework | F15 | Requires GCP Console config + real Classroom account | Complete OAuth flow, click Sync; verify coursework appears |
| .ics URL sync imports calendar events | F15 | Requires a real .ics URL | Paste a .ics feed URL in Settings, click Sync; verify VEVENT items appear |
| Calendar week view shows workload bars | F9 | Requires real assignment data | Load /calendar with assignments across multiple days; verify day columns show color-coded bars |
| AI tooltip appears on AI-generated outputs | AI-LITERACY-01 | Requires rendered page with AI content | Use math-helper/writing-aid; verify (i) tooltip renders with correct description |
| AI literacy onboarding step shows | AI-LITERACY-01 | Requires fresh onboarding flow | Complete onboarding as new user; verify literacy step appears before dashboard |
| Parent share link shows correct data | F13 | Requires share link generation + public route | Generate parent link in Settings; load it in incognito; verify only effort/completion data visible |
| Teacher snapshot shows accommodations only | F14 | Requires share link generation + public route | Generate teacher link in Settings; load it in incognito; verify no diagnosis codes visible |
| Dark mode flips all surfaces | F20-POLISH | Requires visual browser check | Toggle dark mode in Settings; verify nav, cards, forms all use dark palette; reload page to verify persistence |
| Vocabulary hover defines a word | F20-POLISH | Requires live vocab-hover Edge Function | Double-click a word in assignment description; verify popover appears with plain-language definition |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
