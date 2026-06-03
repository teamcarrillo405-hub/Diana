# Diana Teen-Native UX 10/10 Plan

Goal: beat Quizlet and Gemini on teen-native UX for high school students who are trying to get unstuck from real schoolwork.

Current competitive read:
- Quizlet/Gemini benchmark: 9.0/10 for teen-native UX because they feel familiar, fast, polished, and low-friction on mobile.
- Diana target: 10/10 when students say Diana gets them unstuck faster than generic chat while keeping their work clearly theirs.
- Repo-verifiable target: every teen UX section has product surfaces, metrics, proof UI, tests, and score output.
- Market target: 4 of 5 live high-school testers prefer Diana on stuck tasks, 4 of 5 find help proof, and 0 confuse Diana with doing final work.

## Section 1: First Screen Clarity

Competitor edge:
- Quizlet starts with familiar study actions.
- Gemini starts with one obvious prompt surface.

Diana must beat this by:
- Making "Right now" and "next 5 minutes" the first ritual.
- Showing the next real assignment action before any generic chat prompt.
- Letting the student start, ask for next step, or hear the task without scanning a widget wall.

Repo implementation:
- Landing page leads with "Your next 5 minutes, made clear."
- Dashboard uses `FocusHeroCard`.
- Assignment detail supports `focus=next-step`.

10/10 proof:
- 4 of 5 teens can explain the next academic move in their own words.

## Section 2: Mobile Thumb Flow

Competitor edge:
- Quizlet feels native on a phone because the study loop is a few taps.
- Gemini keeps the core action close because chat is always the center.

Diana must beat this by:
- Keeping mobile navigation to Focus, Assignments, Notes, Study, and More.
- Stacking primary actions full-width on small screens.
- Keeping no horizontal overflow at 375, 390, 768, 1024, and 1440 widths.

Repo implementation:
- `components/nav.tsx` uses priority mobile nav and a More sheet.
- `ResponsiveActionRow` stacks CTAs.
- Browser QA artifacts feed the score script.

10/10 proof:
- 4 of 5 teens start from mobile without hunting through secondary routes.

## Section 3: Unstuck Speed

Competitor edge:
- Generic chat feels instant when the student types "I'm stuck."

Diana must beat this by:
- Reducing the path from stuck state to one academic action.
- Measuring time to first academic action.
- Using one-move support when the student needs fewer choices.

Repo implementation:
- Competitive benchmark tracks `timeToFirstActionSeconds`.
- Student-state support escalates to `one_move`.
- Teen protocol includes a generic-chat comparison task.

10/10 proof:
- 4 of 5 teens say Diana gets them unstuck faster than generic chat.

## Section 4: Teen Voice And Control

Competitor edge:
- Quizlet and Gemini feel consumer-grade rather than school-admin-first.

Diana must beat this by:
- Sounding direct, private, student-owned, and useful.
- Avoiding shame, pressure, red states, streak pressure, and adult-facing institutional copy.
- Making privacy and sharing student-controlled.

Repo implementation:
- Tone audit blocks pressure language.
- AI ethics and proof surfaces state that the student owns sharing and final work.
- The teen testing protocol asks whether the product feels built for students.

10/10 proof:
- 4 of 5 teens describe Diana as built for students, useful, and not judgmental.

## Section 5: Embedded Study Loop

Competitor edge:
- Quizlet owns fast artifact creation: cards, study guides, practice tests.

Diana must beat this by:
- Keeping study artifacts inside the student's actual assignment and notes.
- Preserving source anchors from helper to cards/practice/review.
- Feeding FSRS review and mastery signals back into next assignment support.

Repo implementation:
- Subject-native helpers exist for math, reading, writing, science, history, and AP.
- Study artifact panel supports editable cards and source anchors.
- Flashcard review stores recall outcomes.

10/10 proof:
- 4 of 5 teens create or start a study artifact during the test.

## Section 6: Trust Without Takeover

Competitor edge:
- Gemini and Khanmigo keep help distinct from simply producing answers.

Diana must beat this by:
- Showing the help-without-taking-over meter.
- Showing authorship receipts.
- Redirecting final-work requests into student-owned next steps.
- Keeping trust visible without making the app feel punitive.

Repo implementation:
- `HelpOwnershipMeter` is visible in helper flows.
- `authorship_log` and proof surfaces show what Diana did and what the student did.
- Guided learning detects final-work requests and redirects.

10/10 proof:
- 0 teens interpret Diana as doing final work.
- 4 of 5 teens find proof that Diana helped without taking over.

## Build Checklist

- Add teen-native UX scorecard primitives.
- Add score tests.
- Add `npm run teen-ux-score`.
- Add proof-page teen UX evidence panel.
- Regenerate teen UX and competitive score artifacts.
- Run `npm run typecheck`.
- Run `npm run test:run`.
- Run `npm run tone-audit`.
- Run `npm run launch-audit`.
- Run `npm run build`.
- Run responsive browser QA.

## Claim Boundary

Diana can claim repo-verifiable teen UX 10/10 after the build and automated/browser gates pass.

Diana cannot claim market-proven 10/10 until live high-school testing passes the protocol.
