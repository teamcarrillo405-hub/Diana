---
phase: 3
slug: capture-time-layer-slice-2
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-29
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run lib/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run lib/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 03-01-01 | 01 | 1 | F04 | migration | `node -e "...file exists check"` | ⬜ pending |
| 03-01-02 | 01 | 1 | F04 | unit | `npx vitest run lib/offline/` | ⬜ pending |
| 03-02-01 | 02 | 2 | F04 | e2e-manual | `npm run build` | ⬜ pending |
| 03-03-01 | 03 | 2 | F05 | unit | `npx vitest run lib/time-budget/` | ⬜ pending |
| 03-04-01 | 04 | 3 | F14 | typecheck | `npx tsc --noEmit` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing vitest infrastructure (from Phase 2) covers all phase requirements.
- idb-keyval install needed for offline queue.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Voice capture in browser | F04 | Requires mic hardware | Click mic button, speak, verify transcript appears |
| Photo OCR via camera | F04 | Requires camera + Claude vision | Capture photo of handwritten text, verify OCR result |
| Offline queue drain on reconnect | F04 | Requires network toggle | Disable network, add item, re-enable, verify sync |
| Tonight budget view accuracy | F05 | Requires real assignments | Set up assignments with estimates, check budget math |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
