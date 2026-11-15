# Reviewed source mappings: offline comparison

This path allows an operator to compare existing lexical retrieval with a narrowly constrained use of reviewed competency mappings. It is not enabled in the student runtime. No real educator records or publication registry are supplied in the repository. Test identities and judgments are synthetic contracts, not actual review evidence.

## Trust boundary

`resolvePublishedSourceMappings` takes current review evidence and a separate `trustedPublicationState`. The operator must obtain publication state, source locks, current documents, assignments, issuer authorization and reviewer credentials from controlled current stores. Never pass a student upload, reviewer submission, or arbitrary HTTP body as trusted publication state. JSON file paths and hashes do not authenticate a publisher. The offline CLI relies on the operator to establish those file permissions and provenance; no issuer certificate or production registry integration is claimed.

Each publication binds the exact packet ID and content hash, competency ID and full hash, source asset/content/version hashes, full source anchor, assignment ID and full hash, and every contributing review ID and full review hash. Changing rationale, evidence, judgment or adjudication under an unchanged review ID invalidates publication. Current source extraction, current competency and lexical proposal are revalidated. Two distinct qualified raters must support the mapping, or an independent adjudicator must resolve the bound pair. Credentials and assignments must remain current. Issuers are separately authorized and cannot be one of that packet's reviewers.

The operator record includes `published`, `suspended`, or `withdrawn` status, issuer, issue/publication/expiry dates and revocation. Withdrawing, suspending, revoking or expiring a record removes its eligibility. Keep the current record rather than supplying an old published revision. Duplicate IDs, competing records for a packet or exact competency/source anchor, changed bindings, invalid review evidence and expired state snapshots fail closed. A state snapshot has `readAt` and `validUntil` with at most five minutes of validity. Returned `validUntil` is further bounded by the earliest used publication, assignment or reviewer credential expiry. This deadline is an upper bound, not permission to cache authority or ignore withdrawals. Every invocation resolves current evidence again. Consumers must not use an old snapshot to evade a known withdrawal.

## Ranking behavior

The caller explicitly selects a current competency. Optional prerequisite support is limited to prerequisites actually declared in the current framework, and must be explicitly enabled. No competency is inferred from the student's text.

The comparator takes the existing lexical candidate list after candidate selection and diversity limits. It can move a reviewed candidate only within an exactly equal numeric lexical-score group. It preserves every candidate object, score and full anchor, adds no candidates, and truncates nothing. A reviewed subspan cannot stand in for the exact returned anchor. Stable baseline order is retained when neither or both candidates have eligible support. Publication provenance is returned separately from source objects.

These mappings describe source coverage of an instructional objective. They do not prove that a source answers a particular question, that a student has mastered a skill, that a curriculum meets a standard, or that the ranking improves learning. Those require separate measured evidence.

## Run an explicit comparison

Prepare real review packets and assessments with the existing source competency review workflow. Maintain current assignment and educator registries and a separate operator publication snapshot. The snapshot shape is `{ readAt, validUntil, issuerIds, publications }`; publication fields are defined by `sourceMappingPublicationSchema` in `lib/learning-engine/reviewed-mappings.ts`. Publication is an operator decision after review. The comparison script never generates credentials, judgments or publication approvals.

```powershell
node --conditions=react-server --import=tsx scripts/learning/compare-reviewed-mappings.ts <review-directory> <operator-publication-state.json> <current-reviewers.json> <current-assignments.json> "linear equation" math.linear_equations
```

Add `--prerequisites` only when declared prerequisite support is intended. The review directory contains `packets/reviewer-packets.json` and `assessments.json`. Operator files are separate explicit arguments. The script reads current shipped indexes, re-extracts and hashes each reviewed chapter's original PDF, loads the current course framework, performs baseline lexical retrieval, and validates all publication and review bindings before comparison. It refuses fetch requests, reports network attempts, writes JSON to stdout, and makes no database, model or production changes. Its lack of network calls is a property of this local code path, not a general network sandbox for arbitrary extensions.

The output's `verificationCoverage` distinguishes every hash-checked chapter index from the subset of original PDF chapters freshly hashed and re-extracted for review packets. It counts baseline passages from those chapters and from other indexed chapters separately. All baseline source anchors are not independently re-extracted and audited by this command. The stronger returned-anchor PDF audit remains a separate verification path.

An empty publication registry produces baseline order. Real supported publication has not been exercised without supplied educator evidence and operator state. A successful synthetic test proves a contract only. Production adoption still requires measured retrieval comparisons, a protected authoritative registry with revocation delivery, runtime scope/privacy review and a deliberate release.
