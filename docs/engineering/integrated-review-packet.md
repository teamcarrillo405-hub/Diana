# Offline integrated review packet

This builder consumes an externally supplied `authored-confirmed-text` bundle accepted by the existing integrated grounding schemas and digest verifier. It authors no cases, invokes no retrieval/provider/model, and opens no implicit corpus path.

```powershell
npx tsx scripts/learning/integrated-review-packet.ts build <bundle.json> --manifest-sha256 <separately-frozen-manifest-hash> --exclusion-sha256 <separately-frozen-exclusion-hash> --output <new-directory>
```

Input is one regular UTF-8 JSON file bounded to 16 MiB. Unknown CLI arguments, unsupported provenance, invalid hashes/offsets/source versions, exclusion overlaps, duplicate identities/receipts, missing or unknown traces and false threshold claims reject the build. Missing semantic judgments do not prevent packet creation. Explicit error, timeout or truncated responses remain in the all-case denominator, with their status visible. A purported complete response violating the existing stop/content/token checks is rejected.

The new output directory is claimed exclusively. Existing or partially written output is never reused. `operator-only/completion.json` is written last and binds canonical JSON hashes of both outputs. An absent completion file means an incomplete write. Preserve that directory and use a new output path after investigating any error.

## Separation

- `reviewer/packet.json`: secret-derived opaque task/source aliases; exact question, student attempt, full declared source pages, all retrieved candidates and selected evidence, and exact delivered response content/status. Task order is sorted by secret-derived opaque aliases. Offsets use UTF-16 code units, matching the verifier. No original structured task IDs, model, options, prompt, cost, timings, operator identities or other reviews are included.
- `operator-only/mapping.json`: private randomness, original IDs, pinned manifest/exclusion and entire bundle digests, per-task projected digest and trace/request/response/retrieval/evidence/execution digests, source version bindings and unresolved verifier statuses. This enables an operator to bind later ratings to the original records without giving that mapping to reviewers.

Only the reviewer packet is suitable for reviewer distribution after operator inspection. The operator directory is plaintext, not encrypted. Operator-only files request mode `0600` where supported; this does not establish Windows ACL isolation. Do not distribute the whole output directory. The code performs no sharing or upload.

Blinding covers structured metadata only. Exact text may mention a model, original source identifier, condition or identity. It is preserved to avoid changing the evidence being judged. An operator must check for textual disclosures before arranging reviews; there is no automatic promise of complete blinding. Structured source aliases are linked by the private mapping; citations embedded in prose are not rewritten.

## Evidence still required

All human-authority, family-independence, production-eligibility and threshold flags remain false. Hash checks prove artifact consistency, not independently observed execution, educator authority or genuinely disjoint problem families. This tool does not collect ratings, authenticate reviewers, reconcile disagreements, decide pedagogical correctness or establish a 95% production claim. Fresh eligible authors/reviewers and externally authored cases remain prerequisites to an actual evaluation. No real packet or evaluation corpus was created while implementing this builder.

Verification uses opaque protocol bytes only:

```powershell
npx vitest run lib/learning-engine/integrated-review-packet.test.ts
```
