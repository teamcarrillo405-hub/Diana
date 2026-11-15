# Run 008 verifier correction

The completed run 008 initially stopped verification at the objective-qualification runtime-contract comparison. The qualification proof pins the exact approved `qwen3-runtime/reviewed-environment-contract.json` bytes. Freeze parses that contract and writes a new JSON copy into the run. The original has CRLF line endings, while the frozen copy has LF line endings.

| Evidence | SHA-256 |
| --- | --- |
| Original reviewed bytes | `440edb7a7dab64fe784e28f418970e80cf78f943bdb4f5d0b6445978c3a7042c` |
| Frozen serialized bytes | `c7633d9e37344bfa755c1fa31f0d35ffb44b23781d3a8fa13ef907fd51504184` |
| Canonical contract, both copies | `362fcf1e7e890e74f196ef37fe649386ef9dc1caed1ee7eb77cf9563d90c8f9b` |

The full contract objects and qualification/protocol environments agree. Version 1 incorrectly required the qualification's original byte hash to equal the reserialized copy's byte hash.

`scripts/learning/verify_qwen3_preference_v2.py` preserves the entire original verifier and all frozen run artifacts. Its sole verification correction binds the proof's raw hash to the original reviewed contract, then requires full parsed equality with the frozen copy and the already pinned approved canonical contract hash. It cannot substitute the frozen byte hash for the proof's original hash, accept a missing original approval, or accept changed original/frozen contract data. All other checks remain the same, including frozen source parity against the original verifier. Version 2 is explicitly outside run 008's frozen source inventory.

The returned receipt adds `verifierVersion`, `verifierSourceSha256`, and `verificationCorrection`, including the preserved frozen-verifier hash and original/frozen/canonical contract hashes. These disclose the post-run verifier correction; they do not rewrite evidence or alter the training recipe.

```text
python scripts/learning/verify_qwen3_preference_v2.py --run <research-directory>/qwen3-run-008
python -m unittest discover -s scripts/learning -p test_qwen3_preference_verifier_v2.py -v
```

Regression tests cover identical bytes, equivalent serialization, a mismatched original hash, altered original bytes or data, altered frozen data, rehashed but unapproved content, a missing original contract, and the actual preserved run 008 failure in version 1 versus successful qualification verification in version 2. Full-run verification still requires every remaining original gate to pass. No semantic, final-test, educator, or production approval follows from this correction.
