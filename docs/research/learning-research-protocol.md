# Diana learning research: implementation and execution protocol

Updated September 25, 2026. This continues the existing Diana application and its approved student interface.

See [the latest research findings and product corrections](research-findings-2026-09-25.md) for the actual licensed chapter run, two-model smoke results, resolved assessment deployment and current fine-tuning decision.

## What this release implements

| Workstream | Executable implementation | Evidence still needed |
| --- | --- | --- |
| Specialized textbook retrieval | Versioned chapter hierarchy, exact table-cell spans, native PDF text regions, explicit cross-page problem continuation, chapter context in retrieval chunks, owner-scoped hybrid retrieval | Diverse licensed textbook evaluation; irregular page layouts, scanned tables and diagrams; expert annotation |
| Mathematical verification | Complete real root sets for degree 0–2 where roots are rational; rational-expression domain checks; unique two-variable linear systems; rectangle/triangle area, triangle angle, right-triangle hypotenuse with units | Educator-reviewed reference specifications; irrational roots, nonunique systems, higher-degree complete sets and geometry proofs |
| Localized multimodal work | Native PDF regions with page boxes; original PDF rendered locally; region confirmation/correction creates a new version and rebases offsets; actual media-byte validation and region overlap metrics | Handwriting, photographic diagrams and audio recognition runs; representative student capture conditions |
| Research evaluation | Blinded reviewer packets; two independent raters; separate adjudication; exact output hashes; paired comparison by document family; extraction error reports and calibration bins; 29 actual provider responses | Complete paired experiments and educator ratings; diverse held-out families; real delayed-transfer study |
| Training readiness | Export requires content-bound rights/review/consent receipts; revocations and held-out family exclusions; fail-closed local export | Verified OpenAI account eligibility and supported training route; separately authorized training run and demonstrated baseline improvement |

Engineering completion and research validation are different milestones. No funding-readiness or learning-gain claim is made.

## 1. Material preparation and source review

PDF preparation uses a database-backed cooperative worker. The browser advances requests of at most ten pages. Every request claims a 90-second lease, checks the original file digest, parses in a terminable worker, and checkpoints ordered pages. Reloading or returning later resumes the saved job. A stale token cannot checkpoint or finish. This is not an independently scheduled background service: closing the page pauses work after the current request.

Current limits are 30 MB per source, 1,500 pages, ten pages per batch, 20 seconds per parser invocation, 192 MB parser heap and 12 MB of saved page/region JSON. The final document writer also has a 24 MB document limit. Oversized textbooks should be prepared by chapter. These are explicit bounds, not a claim that every 1,500-page textbook fits.

Native text regions retain source coordinates. The original is fetched through an authenticated same-origin route, checked against the pinned byte hash and rendered to a canvas with the bundled PDF worker. This preserves the existing framing restrictions. A region can be confirmed only after the original has rendered. Correcting text creates an immutable child version; later disjoint regions move by the exact offset difference, and overlapping annotations are discarded. Confirming one region does not confirm an entire scanned page.

Headings and table structures are deterministic hints. Only explicit continuation labels join problems across adjacent pages. Native PDF bounding boxes are approximate text bounds, not labeled diagram semantics. Native PDFs that flatten columns into an ambiguous reading order still need review.

## 2. Math reference review

The new exact checkers live in the shared Edge/browser-compatible mathematics module. The assessment handler accepts their strict specifications from server-owned exercise records only. Student requests cannot supply a replacement answer key. The latest handler is deployed: reading feedback now performs local exact-quote checks without sending student text to a provider. Interpretation remains ungraded.

Supported extended specification kinds:

- `solution_set`: polynomial equation, degree at most two, real domain. Rational roots, empty set and all-real cases are exact; irrational roots abstain.
- `rational_expression`: equality includes the original real-domain exclusions. Cancellation cannot silently remove a hole. Denominator roots outside the bounded exact solver abstain.
- `linear_system`: two coefficient rows in the form `x * coefficient + y * coefficient = constant`. A zero determinant abstains. Response format: `x = value, y = value`.
- `geometry_measure`: explicit dimensions and units for the supported formulas. Diagram appearance never supplies an unstated measurement.

Automatic worksheet preparation retains its existing single-value questions. Extended checks require explicitly authored and educator-reviewed specifications. This release does not automatically turn every word problem into a trustworthy formal specification.

## 3. Media evaluation

Run `npm run learning:media-seeds` to create six synthetic native PDF files and execute the real parser. Gold text is authored before extraction. Then run:

```text
npm run learning:research -- media artifacts/learning-engine/research/native-pdf-seeds
```

The directory contains the actual PDF bytes, `media-cases.jsonl`, `media-observations.jsonl` and `media-report.json`. Every asset hash is rechecked. Document families cannot cross dataset partitions. Measurements include raw character error, separately labeled whitespace-normalized equality, one-to-one region matches at intersection-over-union 0.5, and confidence bins only for references with two recorded human reviewers.

The six native PDF checks executed in this release. All six match after whitespace normalization; raw exact text differs by the parser's trailing whitespace. There are no human-reviewed geometry boxes in these seeds, so region precision/recall and calibration are not established. These artifacts do not test handwriting, photo recognition, listening or diagram reasoning.

Next corpus collection should cover phone blur/rotation, faint pencil, crossed-out work, multi-column text, equations split across pages, diagrams whose appearance contradicts stated dimensions, tables with merged cells and audio corrections. Record rights and human review before any provider run. Do not relabel a textual description of an image as an image test.

## 4. Educator adjudication

Execute authorized model experiments using the existing capped runner. It remains restricted to approved synthetic input hashes, an enrolled operator, a configured exact model and fresh pricing. The limits remain $10 per batch and $100 per month. The September 25 smoke run saved 11 Luna and 18 Terra outputs, with 11 paired cases. Luna stopped on moderation unavailability. Eighteen blinded Terra packets are prepared; no educator ratings or model winner exist. Experiments are disabled again.

Place actual `outputs.jsonl` in a research directory, then run:

```text
npm run learning:research -- packet <directory>
npm run learning:research -- adjudicate <directory>
```

The first command produces blinded `reviewer-packets.json` and a separate `operator-mapping.json`. Keep the mapping away from raters. The command refuses to overwrite distributed packets. Reviewers rate correctness, source support, instruction quality, appropriate help and safety on 0–3 scales. Store reviews in `reviews.jsonl` using the exported `educatorReviewSchema`.

Rubric anchors, to calibrate with educators before the study:

| Score | Meaning |
| --- | --- |
| 0 | Unsupported or unsafe response; cannot be used |
| 1 | Substantial correction needed |
| 2 | Useful with a limited correction |
| 3 | Meets the agreed criterion |

Two distinct raters must agree on every dimension. Disagreement requires a third adjudicator after both ratings. Duplicate reviewers, changed output hashes, future timestamps and declared conflicts invalidate the result. The operator must independently verify reviewer identities and credentials; a name in a JSON file is not credential verification.

Use `comparePairedScores` only on matched, resolved cases with scores normalized to [0,1]. It resamples entire document families and reports descriptive uncertainty plus strata. Fewer than five document families produces no interval. Engineering templates are correlated and must not be treated as hundreds of independent textbook families.

## 5. Delayed transfer study

The `studyProtocolSchema`, `studyParticipantSchema` and `studyOutcomeSchema` define a local preregistration and analysis workflow. Educators must approve the assessment and consent procedure before recruitment. Sample-size planning requires a study analyst; the code's minimum of twenty per arm is a guardrail, not a statistical power calculation.

1. Freeze `protocol.json`: primary outcome, retention window, target sample, assessment version, educator/consent approvals and a SHA-256 commitment to an allocation seed.
2. Record eligible pseudonymous participants and consent receipt IDs in `participants.jsonl`. Keep identity and consent documents in the authorized study system.
3. Supply the committed seed locally in `DIANA_STUDY_ALLOCATION_SEED` and run `study-allocate`. The command writes a new immutable `allocation.json`; it never contacts students or changes their app access.
4. Collect independent, reviewed, unfamiliar transfer tasks during the preregistered window. Record outcomes with distinct session IDs. Hinted practice is not a primary study outcome.
5. Run `study-report`. It reports observed scores, missing outcomes and withdrawals. Missing or ineligible observations remain visible. An analyst must perform the preregistered inference and examine attrition before any efficacy claim.

Example operations:

```text
npm run learning:research -- study-allocate <directory>
npm run learning:research -- study-report <directory>
```

No participant recruitment, educator approvals, student study or delayed-retention measurement has been performed by this implementation.

## 6. Training route decision

The current [OpenAI supervised fine-tuning documentation](https://developers.openai.com/api/docs/guides/supervised-fine-tuning) and [reinforcement fine-tuning documentation](https://developers.openai.com/api/docs/guides/reinforcement-fine-tuning), checked September 25, 2026, state that the platform is winding down and closed to new users, with temporary continued job access for existing users. Account-specific eligibility is unverified. Do not assume an old API example proves a new account can train.

The near-term engineering work centers on retrieval, exact verifiers, measured prompt/support policies and reviewed datasets. Hosted product AI remains on its current OpenAI route. A separate, offline [local LoRA research path](../operations/local-lora-research.md) now prepares a rights-gated export for a Qwen3-4B-Instruct-2507 candidate. It neither changes the student route nor establishes a trained or approved model.

The export command now requires an evidence receipt file:

```text
npm run learning:training-export -- candidates.jsonl reviewed-output.jsonl receipts.jsonl
```

Each rights/review/consent receipt is tied to the example's exact message content and provenance hash. Changing the content invalidates the receipt; expired or revoked receipts do not authorize export. Operators must authenticate the underlying evidence. The local exporter cannot independently verify a license or a guardian's identity.

Hosted provider fine-tuning remains disabled pending account eligibility and a supported route. Local research training has an offline, pinned preflight and LoRA runner, but there are no authentic approved examples, downloaded weights, or qualified GPU in this workspace, so no language-model weights have changed. Its outputs require a paired held-out comparison and blinded educator review before a separate activation decision. Meanwhile `npm run learning:optimize-policy` compares bounded tutoring policies with separate document-family partitions and human review gates. Its engineering fixture kept the existing policy; no model weights changed.

## External inputs still required

- Additional textbook files and editions with permission for the intended instructional/research use. The Lippman/Rasmussen CC BY-SA chapter has been selected, attributed and processed locally.
- Two qualified reviewers covering the pilot math and reading subjects, plus an adjudicator for disagreements.
- Reconciliation and completion of the interrupted model comparison, then broader held-out runs with current pricing and educator ratings.
- An approved study protocol and consent process before using real student study data.

The assessment deployment approval block is resolved by removing its reading provider call. It no longer depends on the pending student-text transmission request.

These are execution gates for real research. Synthetic outputs, unit tests and source parsing cannot replace them.
