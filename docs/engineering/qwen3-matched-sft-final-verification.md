# Prospective final verification after matched SFT

The final verifier now requires the independent matched-SFT development
verifier, the unchanged evidence-integrity prompt, seed 81173, and selected
epoch three. This is preparation only. It does not establish that run 010 has
passed semantic review or authorize opening final cases before its existing
development gate passes.

## Two different evidence relationships

The actual fitting chain must be exactly:

1. Run 010: 300 training pairs.
2. Run 008: 200 training pairs.
3. Run 007: 600 training records.
4. Run 006: 440 training records.

Each stage also contributes its 48 development records to the overlap check.
The verifier reconstructs parent commitments and data hashes. Run 009 cannot
replace any stage in this chain.

Run 009 is a separately recorded comparison exposure. It used the same 300
training pairs and 48 development cases as run 010. Its receipt is frozen in
`comparison-exposure.json`, copied into the final protocol, and bound by an
explicit hash. The verifier checks the fixed sibling location, immutable
report/protocol/verification hashes, copied comparator evidence, canonical
training and development identities, and exact equality to run 010's data.
The receipt explicitly keeps `initializationAncestor` false.

Final overlap results record combined counts and separate `fittingAncestry`
and `comparisonExposure` counts. Either population overlapping the final cases
is rejected. Comparison exposure is verified before reading saved final rows
and again after reconstructing all saved responses.

## Preserved gates and limits

The final module seal, global consumption claim, single-attempt policy, saved
token reconstruction and reload identity checks are unchanged. Development
requires at least 46 of 48 complete semantic passes and zero fabricated
responses. Agreed primary-review failures cannot be reversed through
adjudication. Final acceptance still requires separate independent semantic
review of the 100 final cases, with at least 95 complete passes and zero
fabrication; this artifact verifier cannot grant that acceptance.

Synthetic tests cover role substitution, missing and rehashed exposure
receipts, changes after response reconstruction, and separately reported
overlap, alongside existing provenance, review, token, and claim checks.
No final-case source is imported, no model inference occurs, and no freeze or
global consumption claim is created by these preparation tests.

Local evidence verification is not independent physical execution attestation,
educator validation, or evidence of improved student learning.
