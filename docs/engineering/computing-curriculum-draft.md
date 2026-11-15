# Draft computing instruction and mapped-gap completion

This increment adds original local practice content. All activities retain `review: pending`; publication and educator approval are not granted. All authored sources are marked `diana_authored`, `original_practice` and excluded from training. No model requests, downloads, student data or held-out evaluation cases are involved.

## Authored additions

`course-computing.ts` adds four course maps, twelve competencies and 36 activities. Every competency has an instruction task with a declared rule or worked record, a practice task and a distinct transfer context. Each activity also provides two hints and a separate worked example on request.

| Band | Course | Ordered competencies |
| --- | --- | --- |
| Grades 6–8 | State, decisions and repeated steps | Sequential state/copies; branch conditions; bounded accumulation |
| Grades 9–12 | Functions, collections and testing | Function contracts; list traversal; boundary/counterexample tests |
| Introductory college | Algorithm reasoning and data models | Loop invariants; explicit cost models; relational keys and joins |
| Advanced college | Concurrency, distributed state and authority | Transaction anomalies; retry/idempotency boundaries; version-bound authorization |

The first skill in each later band names the preceding band's final skill as a prerequisite. These links disclose prerequisites; they neither assess readiness nor force promotion. Twelve explicit transfer links connect each computing practice activity to its own transfer task and back. Transfer tasks are practice, not independent mastery evidence. They are excluded from foundational-instruction choices by the existing navigation and coverage metadata.

`course-gap-completion.ts` fills four previously declared map slots:

- `reading.evidence` in the middle-school, high-school and introductory-college English maps: exact evidence, observation/interpretation distinctions and limits. These reuse the existing course's already mapped first passage without altering it.
- `science.conservation` in the middle-school science map: atom-count conservation for the explicitly stated peroxide decomposition model. It does not invite a physical experiment or verify chemical conditions.

Existing activity, course, skill and capability entries retain their bytes. The existing 112-entry version baseline is checked for exact parity. Appending activities to existing course IDs does not mutate those course maps or their source arrays.

## Assessment boundaries

The new `computing_rubric` method returns unverified review guidance. It does not evaluate submitted code, run test suites, calculate a correctness score, verify security or infer mastery. The task-specific criteria ask for state traces, contract assumptions, counterexamples, invariant arguments or specified design guarantees. Proposed solutions and their complexity remain review work. Confirmation, hint, example and save boundaries use the existing course tutor behavior.

The conservation activity uses the existing same-species atom-balance check. Its gate fixture verifies atom counts only; the student's explanatory reasoning and real-world reaction conditions remain unverified. Reading activities check quotation correspondence while leaving relevance and interpretation unverified.

The legacy coverage report now includes computing in its 24-cell matrix. Explicit computing, computer-science, programming and informatics class labels route to computing before the generic science check. This is a starting subject filter, not an inferred learner level or ability.

## Observed verification

Commands:

```powershell
npx vitest run lib/learning-engine/course-computing.test.ts
npm run learning:course-gate
npm run learning:course-gate -- --coverage-only
npm run typecheck
```

The default offline gate passed across 152 activities and 79 competencies, with zero network attempts: `artifacts/learning-engine/research/course-gate/gate-1790659471767.json`.

The metadata report is `artifacts/learning-engine/curriculum-coverage/coverage-1790659480006.json`. It records 72 framework course maps, including the one reference-only map; 71 maps now have activities. All 24 subject/band cells have selected authored activity. Of 125 mapped skill slots, 97 have an activity. The remaining 28 slots all belong to `precalculus-reference`, whose reference mapping was deliberately preserved. The previous four non-reference gaps are closed.

Prerequisite inventory contains 152 external foundation slots: 66 have only other-level instruction and 86 have same-level instruction with availability unobserved. Offline reporting loads no hosted publication states. These figures do not prove curriculum completeness, runtime availability, educator approval, standards alignment or student learning gains.

The new test suite checks all prior hashes, all four gap closures, every band and three-phase skill sequence, exact transfer bindings, source rights, confirmation/assistance handling, non-execution of submitted code and refusal to claim computing correctness. Existing count assertions were updated for the larger catalog; the withdrawal regression now removes newly available evidence alternatives as well as the withdrawn foundation course.

## Remaining curriculum work

The four computing modules are selected introductory sequences within broad bands, not comprehensive school courses or degree programs. They do not provide a programming runtime, language-specific syntax curriculum, full discrete mathematics, networking/operating-system coverage, accessibility-tested learning progression or educator-validated assessments. The 28 reference-only slots, prerequisite bridging across levels and independent content/grade-band review remain visible work. No publication flag, production deployment or educator claim is part of this increment.
