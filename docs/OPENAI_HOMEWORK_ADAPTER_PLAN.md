# OpenAI Homework Adapter Plan

## Purpose
Centralize all OpenAI-powered homework intelligence behind one Diana-owned adapter. The adapter is responsible for task routing, model selection, safety checks, token budget reservations, structured-output parsing, fallback content, and authorship metadata.

## Supported Tasks
- `study_buddy`: short tutoring turns and next-move guidance.
- `assignment_review`: source-grounded review of visible student work.
- `study_artifact`: study guides, practice tests, and flashcards.
- `source_extraction`: OCR/text extraction summaries and problem queues.
- `visual_explanation`: diagram descriptions and structured visual aids.
- `realtime`: Diana-generated OpenAI Realtime session instructions.

## Model Routing
- Fast tier: classification, simple tutoring, extraction summaries, quiz drafts.
- Quality tier: normal assignment review, writing feedback, source-grounded explanations.
- Complex tier: advanced math/science, DBQs, research synthesis, coding, economics, engineering, CAD, labs, and multi-source work.

## Required Guarantees
- Browser never receives OpenAI API keys.
- Realtime uses server-created short-lived client secrets only.
- No arbitrary tools are exposed to Realtime sessions.
- Adapter output must either validate against the expected structure or return a safe fallback.
- Every successful provider call writes interaction metadata and every student-visible result writes an authorship receipt where the route owns authorship.
