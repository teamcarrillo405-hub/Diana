---
phase: 10
slug: audio-upload-stt
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-30
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run lib/notes/` |
| **Full suite command** | `npm run test:run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run lib/notes/`
- **After every plan wave:** Run `npm run test:run`
- **Before `/gsd:verify-work`:** Full suite must be green + `npm run tone-audit` exits 0
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 10-01 | 1 | F4-AUDIO migration | integration-manual | `supabase db push` | ❌ W0 | ⬜ pending |
| 10-01-02 | 10-01 | 1 | MIME type detection | unit | `npx vitest run lib/notes/mime.test.ts` | ❌ W0 | ⬜ pending |
| 10-01-03 | 10-01 | 1 | File size validation | unit | `npx vitest run lib/notes/upload-validation.test.ts` | ❌ W0 | ⬜ pending |
| 10-02-01 | 10-02 | 1 | Auto-class keyword scorer | unit | `npx vitest run lib/notes/class-router.test.ts` | ❌ W0 | ⬜ pending |
| 10-02-02 | 10-02 | 1 | Upload tab UI | integration-manual | Load /notes/new, verify Upload tab visible | ❌ W0 | ⬜ pending |
| 10-02-03 | 10-02 | 1 | Class pre-selection | integration-manual | Upload audio, verify class dropdown pre-selected | ❌ W0 | ⬜ pending |
| 10-03-01 | 10-03 | 2 | Whisper STT transcription | integration-manual | Upload .m4a, verify transcript appears | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/notes/mime.test.ts` — covers MIME type detection for .m4a→audio/mp4, .mp3→audio/mpeg, .wav→audio/wav, .webm→audio/webm
- [ ] `lib/notes/upload-validation.test.ts` — covers file size soft warning at 20MB, hard block at 25MB, invalid type rejection
- [ ] `lib/notes/class-router.test.ts` — covers scoreClassMatch function: exact subject match ranks higher, multiple term hits accumulate, score below MIN_SCORE=2 returns null

*Existing test infrastructure (vitest + jsdom) covers all other requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Whisper transcription end-to-end | F4-AUDIO | Requires live Supabase Storage + OPENAI_API_KEY secret | Upload a .m4a file on /notes/new; verify transcript text appears in note editor body |
| Auto-class pre-selection in real app | F16-AUTOCLASSIFY | Requires real class data + transcript content | Upload a recording with subject-related keywords; verify correct class pre-selected in dropdown |
| reading_font applied on note detail | F8-UPLOAD | Requires profile with non-default font | Set reading_font to OpenDyslexic in settings; create note via upload; verify /notes/[id] renders in OpenDyslexic |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
