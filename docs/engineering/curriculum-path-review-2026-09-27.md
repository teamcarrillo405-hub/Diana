# Independent curriculum path review

Scope: the twenty activities in `course-transfer.ts`, `course-sequence.ts`, the browser-safe path contract, and the narrow Course Practice/API additions. This is an engineering and content-consistency review by a separate coding agent, not qualified educator approval or evidence of learning effectiveness.

## Findings

No blocking issue was found in the reviewed implementation.

- Independently calculated the four mathematics answers: successive discounts `36`, conditional probability `2/5`, accumulated inflow `10`, and transformed expectation `5`.
- Independently calculated the four science answers: energy difference `30.0 J`, kinetic-energy change `8.00 J`, diluted concentration `0.200 mol/L`, and signed flux `-8.00e-6 mol*m^-2*s^-1`. The stated units, signs and requested three significant figures are consistent.
- Four Reading and four History tasks provide two relevant passages and ask for bounded interpretation with source attribution. The History passages explicitly identify themselves as authored simulations. Four English tasks provide a bounded evidence record for revision. These twelve tasks retain human interpretation and do not award automatic mastery.
- All twenty activities are original pending-review practice, excluded from training. Separate transfer course records preserve the previous 87 activity hashes.
- Path responses use a strict schema containing navigation identifiers, positions and prerequisite labels. They do not expose expected answers, reference expressions, hidden hints or worked examples.
- The API builds paths from available activities before appending a withdrawn saved activity for read/save access. Paused saved courses therefore do not acquire navigation links as a side effect of recovery.
- Path navigation uses the existing `openQuestion` flow, which saves response text, modality, confirmation and pending recognition proof before switching. A failed save keeps the original active response. Successful navigation updates selectors and focuses the question heading.
- Navigation does not inspect feedback to infer completion, mastery or forced level advancement. Missing exact-skill prerequisite activities remain explicit gaps.

## Verification

An independent focused run passed **78 tests across four files**: `course-sequence.test.ts`, `course-expansion.test.ts`, `course-practice.test.tsx`, and the Course Practice API `route.test.ts`. The reviewed tests cover old content-hash preservation, twenty subject/level cells, numerical checking without provider calls, source interpretation limits, browser payload boundaries, availability filtering and save-preservation behavior.

The final small delta was reviewed: each science example now matches its task's method, and its independently checked result is `4.00 J`, `-6.00 J`, `0.100 mol/L` or `+2.00e-6 mol*m^-2*s^-1`. Duplicate prerequisite copy is removed when the path supplies the foundation list. Full curricula, standards alignment, educator publication and representative student outcomes remain separate work.

## Prerequisite closure follow-up

The five added foundation activities were independently reviewed afterward. The polynomial expansion is `2x^2 - 5x - 12`, so the requested linear coefficient is `-5`; the prompt explicitly limits the check to that coefficient. Four original reading tasks directly practice evidence, central idea, argument and comparison. Their supplied passages support the requested observations and inference limits, and the comparison distinguishes visits from distinct people. All retain pending educator review and nonautomatic interpretation. Available paths now have an exact-skill activity for each currently declared prerequisite; withdrawal still exposes a gap instead of substituting an unrelated activity. This closes navigation gaps in the authored catalog, not curriculum completeness.
