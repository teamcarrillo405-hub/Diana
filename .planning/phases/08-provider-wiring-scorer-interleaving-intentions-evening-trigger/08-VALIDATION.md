---
phase: 8
slug: provider-wiring-scorer-interleaving-intentions-evening-trigger
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-29
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm run test:run -- lib/scoring` |
| **Full suite command** | `npm run test:run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run -- lib/scoring`
- **After every plan wave:** Run `npm run test:run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 8-01-01 | 08-01 | 1 | STT edge fn | integration-manual | deploy + curl | ❌ W0 | ⬜ pending |
| 8-01-02 | 08-01 | 1 | TTS edge fn | integration-manual | deploy + curl | ❌ W0 | ⬜ pending |
| 8-01-03 | 08-01 | 2 | UI hook TTS | unit | `npm run test:run -- components` | ❌ W0 | ⬜ pending |
| 8-02-01 | 08-02 | 1 | Scorer interleaving | unit | `npm run test:run -- lib/scoring` | ✅ | ⬜ pending |
| 8-03-01 | 08-03 | 1 | Evening planning | unit+jsdom | `npm run test:run -- EveningPlanning` | ❌ W0 | ⬜ pending |
| 8-03-02 | 08-03 | 1 | markIntentionFired | unit | `npm run test:run -- intentions` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/scoring/next-five-minutes.test.ts` — extend existing suite with interleaving test cases
- [ ] `components/EveningPlanning.test.tsx` — time-gate rendering tests (jsdom)

*Existing test infrastructure (vitest + jsdom) covers all other requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Whisper STT transcription | F4/F8 | Requires live audio file + deployed Supabase Edge Function + OPENAI_API_KEY secret | POST audio file to /functions/v1/transcribe-voice, verify JSON response has `text` field |
| OpenAI TTS audio output | F6 | Requires live TTS API call + audio playback | Click TTS button in reading view, verify audio plays and words highlight |
| Evening planning banner shows 5–8 PM | F14 | Requires browser time mock or live test at that hour | Load dashboard at 6 PM local time, verify EveningPlanning banner visible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
