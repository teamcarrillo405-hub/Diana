# Diana Universal Homework System Architecture

## Summary
Diana is the student-owned homework operating system. The app owns assignments, source packets, student work, subject tools, study artifacts, review, authorship receipts, and submission/export state. OpenAI powers the intelligence layer through API-native tutoring, structured reasoning, file/image understanding, review, quiz generation, and Realtime voice.

## Core Flow
1. A student opens an assignment from Work.
2. Diana builds an `AssignmentSourcePacket` from directions, rubric, imported material, attachments, links, PDFs/images, and uploaded files.
3. Diana resolves an `AssignmentWorkProfile` and `AssignmentUnderstanding`.
4. Diana selects the workspace automatically and shows the student the first useful work surface.
5. Ask Diana, study artifacts, assignment review, and Realtime voice all use the same assignment understanding and Diana Trust Rules.
6. Student work is saved as assignment artifacts, then reviewed, exported, or submitted only after student confirmation.

## System Boundaries
- Direct-to-student v1 does not enforce school AI policy gates.
- School policy fields remain dormant for a later school tier.
- Diana never depends on automating the consumer ChatGPT app.
- All OpenAI usage must be server-side, budgeted, moderated, and logged.

## Implementation Rule
New homework intelligence should route through the shared homework kernel and OpenAI homework adapter instead of creating route-specific prompts, model selection, or safety rules.

The locked Algebra shell is the only student-facing assignment shell. Subject profiles change work units and tools inside that shell. Legacy stacked subject layouts are not allowed to return.

Adaptive help applies to homework at the current 30, 45, 60, or 75 percent level. Automatic support fading is allowed only in practice quizzes and is governed by persisted quiz attempts.

Content coverage and account access are separate. Diana can understand middle-school through advanced assignment material, while direct account and AI access currently require age 13 or older.
