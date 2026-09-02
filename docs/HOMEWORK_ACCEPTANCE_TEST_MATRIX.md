# Homework Acceptance Test Matrix

## Required Flows
- Work list opens assignments directly into the correct workspace.
- Ask Diana uses source packet, visible work, subject profile, and help level.
- Typed and touch/pen work save to the same assignment artifact.
- Review produces source-grounded feedback without writing final work.
- Practice tests and flashcards are generated from the same source packet.
- Realtime voice starts with short-lived server-created client secrets only.
- Export/submission requires student confirmation.

## Subject Coverage
The executable universal matrix must cover all 21 domains in `SUBJECT_DOMAINS`: mathematics, English language arts, science, social studies, world language, computer science, visual arts, music, theatre, dance, physical education, health, accounting, economics, geography, engineering, trade CTE, CAD, advanced technical labs, interdisciplinary, and general.

For every domain, verify:
- source import or useful source-free fallback
- automatic work units and primary tool selection
- typed and handwritten work in one artifact
- image/PDF attachment and source confirmation
- Ask Diana context and adaptive 30/45/60/75 help
- save, reload, review, completion, export, and submission handoff
- truthful disclosure when a specialist editor is limited

## Quiz Support
- Fading support is quiz-only.
- Homework help never drops merely because a previous problem was completed.
- Quiz support becomes independent only after two qualifying low-help passes.
- A low quiz result restores support, and the student may always turn support back on.

## Provider Verification
- Run all `lib/lms` tests and the deterministic provider canary.
- Staging certification requires disposable Canvas and Google Classroom courses, students, assignments, credentials, and scopes.
- A missing staging credential must block the canary before any provider write.
- Provider success requires a persisted receipt or a reconciled provider state. A timeout alone must never be presented as success.

## Safety And Trust
- Class AI policy fields do not block direct-to-student homework routes.
- Minor safety and sensitive-data screens still block unsafe requests.
- Token budget failures return calm paused-state copy.
- Low-confidence source extraction asks for student confirmation.
- Authorship receipts record the route, model, source size, work size, and student-owned boundary.
- Content coverage includes middle-school through advanced work, but direct account and AI access currently require age 13 or older.
