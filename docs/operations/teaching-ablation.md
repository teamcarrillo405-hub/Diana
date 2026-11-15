# Teaching-action ablation

This offline comparison tests Diana's existing evidence-to-action policy against two deliberately simpler alternatives on the same held-out cases. It evaluates **which action is selected**, not the quality of a generated explanation or a change in student learning.

## Run

From the repository root:

```powershell
node --conditions=react-server --import=tsx scripts/learning/evaluate-teaching-ablation.ts --engineering-demo
node --conditions=react-server --import=tsx scripts/learning/evaluate-teaching-ablation.ts --input=path/to/local-corpus.json
```

The first command uses six locally authored, synthetic cases. Its numbers are a code-path smoke test only. The second reads a local JSON corpus of at most 4 MiB. Neither command calls a model, provider, database, or network service. The report includes action details for authored fixtures only, without case IDs or content hashes. It omits all case-level details when any held-out case contains student data or claims educator labeling. Redirect output to an access-controlled local file if retention is required; use opaque identifiers in the input and keep the input private.

## Compared actions

`current` calls the active baseline `policyAction` from `lib/learning-engine/support-policy.ts`. `fixed_hint` applies the existing `fixedPolicyAction` constraints, then always selects a hint. `source_unaware` calls `policyAction` after replacing only `hasEvidence` with `true`. It intentionally demonstrates what happens when a system treats an absent source as present. The confirmation signal is retained, so an unconfirmed problem still selects `clarify` in all three arms. No arm is wired into student routing.

The report includes exact action agreement with the corpus labels, pairwise disagreements, and counts of confirmation and evidence gate violations. It separates cases where the fixed safety/eligibility gate determines the action from discretionary teaching choices, so the gate cases cannot be mistaken for evidence of teaching quality. A source-unaware evidence violation is an expected failure of that experimental arm, not a safe product behavior.

## Corpus contract

The version is `diana-teaching-ablation-corpus-v1`. Every case has an ID, provenance ID, source document family, template family, learner family, partition, five-field policy state, expected action, provenance class, rights class, student-data flag, consent reference, reviewer IDs, exact source excerpt and SHA-256 excerpt hash, and a SHA-256 content hash. The corpus also contains content-bound receipts for evaluation rights, student consent and educator review, followed by its own SHA-256 hash. A receipt carries a case ID, exact case hash, issuer, issue time, expiry and revocation time. Expired, revoked or content-mismatched receipts do not count; validity is checked against the evaluation time on every run. Hashes use canonical JSON with sorted object keys and preserve source excerpt bytes exactly. `assembleTeachingAblationCorpus` derives hashes for operator-prepared records; `validateTeachingAblationCorpus` rechecks them before evaluation. A hash detects later changes but does not establish that a source is legally usable or a label is correct.

Only `test` cases are scored. A source, template, or learner family cannot appear in another partition. Identical source excerpts, including case and whitespace variants, also cannot cross partitions under different family names. This check does not detect semantically similar paraphrases or prove that self-reported families are genuine. Duplicate case and provenance IDs are rejected. The harness rejects excluded rights, unconsented student data, source evidence fields inconsistent with `hasEvidence`, labels that conflict with fixed confirmation or evidence constraints, and purported educator labels without two distinct reviewer IDs and current content-bound review and rights receipts. Synthetic fixtures must be marked `authored_engineering_fixture`, `authored_original`, and free of student data. An educator-labeled record must use an eligible evaluation-rights class and two reviewer IDs. IDs, receipts and rights strings remain self-reported; the local tool does not authenticate qualifications, rights documents, or consent issuers. An independently authenticated export/receipt registry and immutable source and learner family IDs are required before treating externally labeled scores as research evidence.

## Interpretation

The built-in demo is designed to make the current policy differ from fixed hint on an example step and from source-unaware policy on missing evidence. This establishes that the software enforces distinct decisions; it is not a benchmark of teaching efficacy. Even an externally reviewed action-label corpus would establish agreement with reviewers only. Evidence of learning gains requires an approved study, learner consent where applicable, predeclared outcomes, suitable comparison, and analysis of real student results. The report therefore always states that external rights, consent, reviewer qualifications, and student learning gains have not been verified or established by this tool.
