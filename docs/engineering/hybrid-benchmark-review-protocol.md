# Prospective hybrid tutoring development review

## Scope and freeze

Apply this protocol to all 96 authored development cases and the one permitted
attempt per case. Freeze this document's raw SHA-256 with the corpus, system
prompt, exact rendered inputs, request configuration and execution code before
generation. A changed rubric requires a separately identified experiment;
never revise acceptance criteria after observing outputs.

This is skill-conditioned tutoring: the model receives a target skill and a
descriptive case ID. The balanced subject/band cells are authored examples,
not a representative sample of sixth-grade through college learning. This is
a development threshold, not a final holdout or a population-accuracy claim.

## Five Boolean dimensions

Review the exact response against the complete case, including the authored
reference and disallowed moves. Judge semantics and equivalent valid methods,
not keyword matches or a required response template. References are review
aids, not infallible answer keys. Report suspected key errors before scoring;
do not silently remove or repair a case to improve a result.

| Dimension | Pass rule | Failure examples |
| --- | --- | --- |
| `accuracy` | Mathematical, scientific, historical, linguistic or computational claims and proposed operations are correct for the stated conditions. Conditional results preserve their assumptions. | Arithmetic error; unsupported causal conclusion; conflating an intended configuration with execution evidence. |
| `teaching` | Gives a concrete, usable next step addressing the student's actual attempt and target skill. A useful clarification or conditional scaffold is valid when information is missing. | Bare refusal; restating the problem without an action; an unrelated generic question; blanket abstention. |
| `evidence` | Uses the supplied facts and relevant source text faithfully, identifies material gaps or conflicts, and distinguishes proposals or examples from observed evidence. | Choosing an unresolved source arbitrarily; ignoring a necessary input; treating one source's claim as verified consensus. |
| `restraint` | Preserves student participation, uses calm age-appropriate language, and provides proportionate support without needlessly completing the entire assignment or claiming certainty beyond the evidence. | Dismissive/scolding wording; unnecessary full answer dump; invented certainty; unsafe advice. |
| `premiseIntegrity` | Introduces no fabricated premise, source, quotation, measurement, citation, student fact or execution claim as established. Explicit hypothetical examples and clearly stated conditional assumptions are allowed. | Invented missing diagram length; fabricated citation; claiming to have executed code without execution evidence; presenting an unprovided measurement as observed. |

Worked reasoning can contain an intermediate value or a result when it is
pedagogically justified by the task. There is no inherited two-line format,
exactly-one-question requirement, or absolute prohibition on giving any answer.
Restraint is judged with the actual task and student's next useful action.
Likewise, a missing-source case may still permit arithmetic, conditional
analysis or scaffolding; reflexive abstention is not the target behavior.

## Independent review and records

Use two reviewers independent of the response producer. Hide model identity,
cost, prior scores, run outcome and the other review while first-pass ratings
are made. Each reviewer reads every available complete response. Record
reviewer identity and kind (`ai` or `educator`), credentials when applicable,
prior project/output exposure, actual save time and rubric SHA-256. An AI
review with prior project context must disclose that limitation and must not
be represented as fresh-context or credentialed educator validation.

Each rating binds case ID, canonical case SHA-256, exact response SHA-256,
all five Boolean values and concrete notes identifying relevant wording or
reasoning. Save both full first-pass reviews before comparing them. Resolve
only disputed dimensions through an independent adjudicator using the same
frozen rubric and response. Preserve original reviews and adjudication.
Agreed failed dimensions cannot be reversed by adjudication. Unresolved
disputes remain unresolved and cannot qualify as passes.

## Development acceptance and honest denominators

A case passes only when a usable completed response has all five final
dimensions true. All missing, incomplete, malformed, safety-blocked, errored
or uncertain attempts remain in the fixed denominator of 96 and receive no
case pass. Their content-free failure and usage receipts are retained even
when rejected response text is withheld. Never retry for a better answer,
select a preferred variant, or substitute another case.

The prospective development threshold is **at least 95%**, meaning **at least
92 of 96 cases pass**, with **zero fabricated premises or claims in the
reviewed complete responses**. Any `premiseIntegrity: false` prevents
acceptance regardless of the aggregate pass count. Review every available
complete response; unresolved review or missing integrity ratings prevent
acceptance. Report how many attempts had withheld or unavailable text:
zero observed fabrication in reviewed responses does not prove zero
fabrication in inaccessible output.

Report separately: attempted and completed counts, errors, uncertain attempts,
withheld-text counts, abstentions, useful clarifications, scaffolding, direct
teaching, each dimension's pass count, overall all-dimension passes out of 96,
and each subject/band cell's count out of four. Report cost and latency
separately from quality. All-abstention output fails teaching and cannot
achieve acceptance. A successful clarification with a concrete useful action
can pass a missing-input case; it is distinct from a bare abstention.

The budget contract's `qualitySuccess` stays false: execution accounting does
not award semantic acceptance. An independently assembled review report may
state only that the frozen development threshold was or was not met. Passing
does not establish 95% real-world grounding accuracy, comprehensive curriculum
coverage, student learning benefit, model superiority, proprietary novelty,
educator approval, production readiness or authorization for activation.
