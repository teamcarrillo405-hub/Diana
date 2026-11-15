# Hybrid tutor development corpus

This is an original, synthetic **development and engineering corpus**, drafted for comparing tutor behavior before broader validation. It has 96 cases: six subjects, four educational bands, and four cases per subject/band cell. It has not received educator review and does not represent a validated curriculum, learner population, complete subject syllabus, or evidence of learning gains. A separate independent audit and a recorded corpus hash must precede a prospectively frozen evaluation.

The source is `lib/learning-engine/hybrid-benchmark-cases.ts`. Its version is `hybrid-development-v1-draft`. The scope metadata intentionally describes this source draft; a later audit receipt or run manifest must record its own evidence and hashes without retroactively changing what an earlier run used.

## Coverage and task design

| Subject | Middle school | High school | College introduction | Advanced college |
| --- | --- | --- | --- | --- |
| Math | Fraction units, scale, uncertain measurement, changing percentage bases | Factoring, trigonometric inputs, calibration, exponential change | Integration, conditional probability, sample identity, matrix order | Eigenspaces, constrained optimization, Markov chains, likelihood ratios |
| Reading | Inference, antecedents, conflicting notices, figurative meaning | Narrator reliability, rhetorical context, editions, survey scope | Qualification, denominators, translation, synthesis | Focalization, mechanism claims, textual authority, logical qualification |
| English | Pronoun reference, audience, constraints, clause combination | Sentence boundaries, quotations, citation requirements, concessions | Causal thesis scope, statistical provenance, rhetorical constraints, synthesis | Methods agency, concession scope, editorial constraints, causal discussion |
| Science | Density, temperature changes, instrument conflict, fair tests | Stoichiometry, momentum inputs, circuits, interval rates | Log scales, calorimetry, sample identity, randomized assignment | Numerical error, kinetic identification, covariance validity, selection bias |
| History | Chronology, attribution, ledger conflict, perspectives | Publicity, speech context, treaty copies, rate/hour comparison | Archival selection, real prices, translation, recruitment evidence | Causal identification, digital corpus coverage, place identity, institutional measures |
| Computing | Variable updates, branch state, program versions, coordinates | Loop bounds, search inputs, boundary requirements, nested loops | Aliasing, joins, ordering contracts, recurrences | Interleavings, replica history, isolation configuration, amortized work |

The middle-school band is intended for approximately grades 6–8; high school for approximately grades 9–12. The college bands distinguish introductory undergraduate material from more advanced undergraduate reasoning. These are author-assigned difficulty intentions, not verified grade placements, accessibility assessments, or proof of prerequisite alignment.

Each cell contains one sufficient-evidence misconception task, one task with missing inputs, one task with conflicting evidence or instructions, and one sufficient-evidence transfer task. This yields 48 sufficient, 24 missing and 24 conflicting cases, with 24 cases in each focus category. The balance is an engineering design choice, not a prevalence estimate.

Every case includes an actual authored student attempt, a target skill, task type and substantive problem. Source text is supplied where interpretation, document comparison or code tracing requires it. The fictional historical records, literary passages, student attempts, study descriptions and other snippets were authored specifically for this corpus. They are not quotations from external works, records of actual students, or claims about real historical events. Provenance is explicitly `authored_synthetic`; rights metadata states that no external text or student data is included.

The corpus covers both direct computation and interpretation. It does not force every answer into an exact quotation or a single abstention marker. A tutor can preserve known facts, offer a justified conditional calculation, identify the missing measurement, suggest a discriminating check, or explain a reasoning error. A missing final quantity does not make all teaching impossible. Likewise, a conflicting source can support analysis of alternatives without supporting selection of one as the observed truth.

## Model-visible and evaluator-only information

This is **skill-conditioned tutoring**: `targetSkill`, `taskType`, subject, educational band, and a descriptive case ID are visible. They can cue the relevant concept. Results must not be presented as a blind test of discovering a misconception from an unconstrained student conversation.

Use the exported functions:

```ts
getHybridBenchmarkModelInput(caseOrId)
buildHybridBenchmarkUserPrompt(caseOrId)
```

The first returns a fresh object containing only `id`, `subject`, `band`, `targetSkill`, `taskType`, `problem`, `studentAttempt`, and optional `sourceText`. The second serializes that projection as the user payload. A separately versioned evaluation protocol supplies the system prompt. Callers must never serialize the complete case as a model request.

The complete `HYBRID_BENCHMARK_CASES` export is for research preparation and independent evaluation. Its `evaluation` object contains:

- Source status and the intended misconception/missing/conflict/transfer focus.
- Required known inputs and specifically missing inputs or unresolved provenance.
- An expected teaching action that addresses the given attempt.
- A reference answer and, where useful, a numerical value, unit and tolerance.
- Separate accuracy, teaching, evidence and restraint rubric criteria.
- Case-specific disallowed moves such as inventing an observation, confusing rates with totals, or silently choosing among conflicting records.

Reference answers are evaluation aids, not scripts the tutor should necessarily reveal in full. A response may teach effectively through a targeted next operation while withholding a completed answer. Evaluation should distinguish factual correctness, appropriate uncertainty, useful instruction and answer-giving; keyword overlap with a reference is insufficient. A clarification can be appropriate on a missing-input case, but indiscriminate abstention across the corpus is not successful tutoring.

Examples and proposed measurements must be evaluated as proposals unless they assert that observations already occurred. Equivalent valid explanations and revisions should be accepted. On tasks with multiple grammatically valid revisions, no one wording is required. Conflicting records remain attributed to their alternatives until evidence establishes which is applicable.

## Verification and freezing

The corpus tests check the 24-cell coverage, unique identities and problems, scenario balance, substantive attempts and rubrics, numerical reference calculations and traces, bounded UTF-8 user payloads, deterministic serialization, and the separation of private evaluation data from model inputs. An adversarial separation test inserts private markers into both evaluator fields and an extra input property and verifies that the allowlist excludes them.

These checks do not validate pedagogical effectiveness or replace semantic audit. In particular, schema completeness is not subject accuracy, difficulty placement is uncalibrated, and a synthetic attempt does not reproduce a real student's reasoning process.

The JavaScript objects are recursively frozen to prevent accidental in-process edits. That is a software immutability measure, **not** an assertion that this development corpus has already passed independent audit or been frozen prospectively for a run. The later run manifest should bind the canonical full-corpus hash, exact rendered inputs, prompt/protocol, code and rubric versions before obtaining outputs. Source or rubric changes after outputs require a new prospective run identity and disclosure; preserve the original snapshot.

No final-test cases, earlier model outputs, external text, private student records, model calls, or network retrieval are needed by this module. No model execution is part of its tests. This corpus must remain separate from a future independently authored, educator-reviewed evaluation set and from any claim of production readiness.
