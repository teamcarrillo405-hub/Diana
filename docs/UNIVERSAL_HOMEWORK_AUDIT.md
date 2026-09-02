# Universal Homework Audit

Audit date: 2026-08-29

## Release Claim

Diana has one assignment workflow for every supported subject:

`Open assignment -> confirm imported source when needed -> work unit -> Ask Diana -> show work -> review -> mark done -> next unit -> review submission`

The universal work surface supports typed work, touch or pen handwriting, image and PDF uploads, dictation when browser transcription is available, and controlled live voice when OpenAI Realtime is available. A subject does not require a specialist editor to remain usable. When a specialist tool is limited, the student can still complete the assignment in the universal work surface and attach evidence.

This is homework support, not a claim that Diana independently conducts an accredited class. Full-course delivery also requires standards-aligned curriculum, lessons, assessments, grading rules, prerequisite tracking, teacher oversight, and subject-specific safety governance.

## Subject Coverage

| Domain | Work-unit strategy | Automatic specialist tool | Current status |
|---|---|---|---|
| Mathematics | Ordered problems | Equation editor | Universal flow ready; equation editor limited |
| English language arts | Claim, evidence, draft, revision | Universal work surface | Ready |
| Science | Purpose, prediction, data, analysis, conclusion | Data lab | Ready; no instrument control |
| Social studies and DBQ | Source analysis, evidence, claim, response | Universal work surface | Ready |
| World language | Prompt, first attempt, revision | Audio review | Ready when microphone access is available |
| Computer science | Requirements, plan, implementation, tests | Code runner | Python and JavaScript only |
| Visual arts | Brief, concept, process evidence, statement | Drawing canvas | Ready; lightweight canvas |
| Music | Intent, practice evidence, revision, reflection | Music notation | Limited notation, no MusicXML |
| Theatre | Intent, rehearsal plan, evidence, reflection | Performance log | Ready |
| Dance | Intent, practice plan, evidence, reflection | Performance log | Ready |
| Physical education | Goal, practice evidence, reflection | Performance log | Ready |
| Health | Prompt, evidence, response | Universal work surface | Ready with sensitive-health screening |
| Accounting | Transactions, ledger, balance check | Accounting ledger | Limited to core debit and credit work |
| Economics | Model or data, graph, analysis | Graphing | Limited to one supported function graph |
| Geography | Spatial source, map layer, analysis | Map workspace | Limited map markers, not a GIS |
| Engineering | Brief, plan, test evidence, revision | Design notebook | Ready; no simulation control |
| Trade CTE | Approved procedure, plan, evidence, reflection | Procedure checklist | Ready; procedures remain teacher-approved and read-only |
| CAD | Brief, model, dimensions, reflection | CAD workspace | File inspection and sketches, not parametric solid editing |
| Advanced technical labs | Purpose and safety, data, analysis, conclusion | Data lab | Ready; no instrument control |
| Interdisciplinary | Goal, plan, evidence, response | Universal work surface | Ready |
| General | Response and evidence | Universal work surface | Ready |

Executable coverage lives in `lib/assignment-universal-coverage.test.ts`. It verifies all 21 domains, their work units, registered capabilities, and all five input channels.

## Learning Method

- Homework uses assignment-specific prerequisite evidence to choose a bridge or steady start.
- Help uses Diana Trust Rules at 30, 45, 60, or 75 percent based on attempts, readiness, and stuck signals.
- Homework support does not fade automatically. The student receives the help needed for the active assignment.
- Support fading is limited to practice quizzes. Two strong low-help quiz passes are required before the quiz enters independent mode, and support returns after a low score.
- Ask Diana, structured review, typed chat, and live voice use the same assignment understanding, source packet, active work unit, student work, attachments, and recent conversation.
- Final work and submission confirmation remain student-owned.

## Input And Response Coverage

| Channel | Status | Boundary |
|---|---|---|
| Typing | Ready | Shared work surface and Diana chat |
| Handwriting and drawing | Ready | Touch, pen, or intentional mouse drag in the same work artifact |
| Image and PDF | Ready | Source import and up to four active chat attachments per turn |
| Dictation | Conditional | Requires browser microphone permission and available transcription service |
| Live voice | Conditional | Requires microphone permission, WebRTC, and a server-created OpenAI Realtime client secret |

Complex voice questions use the controlled Realtime tool `answer_complex_homework`. The browser cannot invoke arbitrary tools, submit work, mutate settings, or access another student's data.

## Canvas And Google Classroom

Canvas and Google Classroom are provider adapters, not browser plugins.

| Capability | Canvas | Google Classroom |
|---|---|---|
| OAuth connection | Implemented | Implemented |
| Exact scope validation | N/A for Canvas token flow | Implemented before saving connection |
| Token refresh | Implemented | Implemented |
| Assignment and material import | Implemented | Implemented |
| Text submission | Implemented when provider supports it | Delivered as a generated file because Classroom student submissions use Drive attachments |
| File submission | Implemented | Drive upload, attach to submission, then turn in |
| Duplicate protection | Implemented | Implemented |
| Receipt and reconciliation | Implemented | Implemented |
| Unsupported-type handoff | Implemented | Implemented |

The deterministic provider canary and provider unit tests exercise import, token refresh, submit, denial, duplicate prevention, and ambiguous-result reconciliation without writing to a live school account. Live external certification requires dedicated disposable Canvas and Google Classroom staging courses, credentials, assignments, and students. The staging canary must remain blocked when those variables are absent.

## Learner Access Boundary

Diana supports middle-school, high-school, college, and advanced independent-study content. Direct account and AI access currently require age 13 or older. A verified guardian workflow for younger students is not implemented, so the application must not claim under-13 direct account support.

## Regression Controls

- The locked Algebra shell is the only student-facing assignment shell.
- Unreachable legacy writing, lab, reading, project, and hand-in layouts have been deleted.
- Existing legacy `saved_work` fields are converted into the first unified work unit when no unit records exist.
- Low-confidence imported material requires confirmation before tutoring.
- All provider calls enforce ownership, capability checks, explicit final confirmation, idempotency, and recoverable receipts.
- Student work remains recoverable when AI, upload, voice, save, or provider requests fail.

## Verification Evidence

- TypeScript and the production Next.js build pass.
- The complete Vitest suite passes: 312 files and 1,829 tests.
- The focused universal-homework, Realtime, workspace, mastery, learner-access, and quiz-fading suite passes: 52 tests.
- The LMS provider suite passes: 14 files and 105 tests.
- Assignment source, submission, ownership, and file-integrity integration tests pass: 68 tests.
- Security and OpenAI adapter tests pass: 37 tests.
- The deterministic Canvas and Google Classroom canary passes all 10 mock-provider checks.
- The assignment workspace Playwright audit passes at 1600x1000, 1366x768, 1280x800, 1024x768, and 390x844 with no serious accessibility violations, horizontal overflow, console errors, or layout-shift failure.
- The local health and login routes return HTTP 200.
- The tone audit reports zero blocking student-facing copy violations.

## External Certification Still Required

1. Run the staging provider canary with disposable Canvas and Google Classroom credentials.
2. Complete moderated usability testing with students across the supported input modes.
3. Validate professional specialist workflows with domain teachers before describing limited editors as replacements for full CAD, GIS, notation, spreadsheet, or laboratory software.
