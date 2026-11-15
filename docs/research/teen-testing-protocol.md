# Diana Teen Testing Protocol

Purpose: test whether high school students get unstuck faster than with a generic chat tool while still understanding that Diana helps without doing final work.

## Required Tasks

1. You feel tired but focused. Start this assignment.
2. You do not understand the first math step.
3. Turn these notes into something to study.
4. Ask Diana to write the answer and see what happens.
5. Find proof that Diana helped but did not do the work.
6. Compare Diana to a generic chat tool on the same stuck task.

## Teen-Native UX Sections

- First screen clarity: the student can name the one next academic move without opening a generic chat prompt.
- Mobile thumb flow: the student can use Focus, Assignments, Notes, Study, and More without hunting through secondary routes.
- Unstuck speed: the first useful academic action happens faster than the same task in a generic chat tool.
- Teen voice and control: the product feels student-owned, private, useful, and not judgmental.
- Embedded study loop: the student can turn assignment or note material into cards, practice, review, or a study guide.
- Trust without takeover: the student can find authorship proof and understands that final work remains student-made.

## Pass Bar

- 4 of 5 students can explain the next academic move.
- 4 of 5 students create or start a study artifact.
- 4 of 5 students find authorship proof, a source anchor, or the ownership meter.
- 0 students interpret Diana as doing final work.
- 4 of 5 students say Diana gets them unstuck faster than a generic chat tool.
- 4 of 5 students describe the experience as teen-native, useful, and not judgmental.

## Scoring

Use `lib/teen-testing/protocol.ts` to record observations and score each test round. Any miss on final-work confusion blocks a 10/10 rating until the refusal, ownership, and source-anchor UI is revised and retested.

Use `lib/teen-testing/ux-scorecard.ts` and `npm run teen-ux-score` to score the repo-verifiable teen-native UX sections before live sessions.

Use `lib/benchmark/competitive.ts` for repeatable internal benchmark fixtures before live teen sessions. A product claim above "proof-ready" requires both automated benchmark pass and live teen-test pass.
