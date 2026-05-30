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

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/task-breakdown/parse.test.ts` — covers F6: isValidStep type guard, JSON parse robustness (extract array from prose-wrapped output)
- [ ] `lib/reminders/reminder-rules.test.ts` — covers F7: isQuietHours (20:00–06:59), isWeekend (Sat/Sun), shouldShowReminder (past-due bypasses quiet hours)
- [ ] `lib/wins/group-by-day.test.ts` — covers F8: groupCompletionsByDay buckets signals by calendar day correctly

*Existing test infrastructure (vitest + jsdom) covers all other requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| task-breakdown Edge Function returns valid JSON steps | F6 | Requires live Supabase + ANTHROPIC_API_KEY | POST `{ assignmentId, text }` to /functions/v1/task-breakdown; verify response has `steps` array with `action` + `minutes ≤ 15` per item |
| Smart reminder banner appears for past-due assignments | F7 | Requires browser with real clock or time-mocked env | Load dashboard with an assignment whose `due_at` is in the past; verify "This is still open." banner visible; verify banner absent between 20:00–07:00 |
| Wins feed shows completed submissions | F8 | Requires real data in task_signals | Submit an assignment, load /wins; verify title and class appear; verify no streak/red copy |
| AP Math worked example returns analogous problem | AP Math | Requires live Supabase + ANTHROPIC_API_KEY | On problem_set assignment, click "Show a worked example"; verify response describes analogous (not identical) problem with step-by-step solution |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
