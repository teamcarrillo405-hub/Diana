# Language-model quality correction, v2

## What changed

The previous two Qwen2.5-0.5B experiments produced false abstentions. This experiment changes the training data and selection procedure. It keeps the immutable licensed base model, the local CPU runtime, assistant-only training loss, and the exclusion of student records and textbook content.

`synthetic_lora_v2_data.py` supplies 80 original machine-authored training fixtures across nine training families. Eight matched pairs ask an answerable and an unanswerable question about the same source. This directly trains the distinction between missing evidence for a question and the mere presence of a source. There are 72 answerable and eight unanswerable training examples. Within-family variants are repetitive and must not be counted as 80 independent skills or teaching scenarios.

There are 12 validation cases and 20 fresh test cases. Their family labels and source/question pairs do not overlap with training. They were written after the earlier failures, so this is a subsequent authored evaluation, not an independent benchmark. Test outcomes do not choose the checkpoint. Both prior evaluation sets remain preserved and are not imported by this experiment.

## Selection and acceptance

The fixed recipe uses two epochs, rank-eight adapters on query/value projections, learning rate 0.0001, gradient accumulation of four, and four CPU threads. It saves both epochs. The lowest validation-loss checkpoint that satisfies every gate is selected. If neither passes, the lowest-loss checkpoint is measured for diagnostic purposes and remains rejected.

The gates require all of the following on validation and fresh test:

- Target-token loss does not increase relative to the same base model.
- False abstentions do not increase.
- Answers to unsupported questions do not increase.
- The number of cases meeting the combined grounded-response check increases.
- At least 80% of cases meet that combined check.

The combined check requires two-line format, an exact source quotation or appropriate abstention, matching answerability, and one question containing a case-specific anchor. The anchor check is a lexical proxy. It cannot establish that the next step is instructionally useful, age appropriate, accessible, or safe. An irrelevant quotation or a shallow question could evade these diagnostics; independent semantic assessment is still required.

The runner writes a timestamped preregistration with source, data and model-provenance hashes before loading the model. It evaluates the test only for the declared final comparison after selection. Test text is available in source and is serialized before training; this is not a blinded test. Reload verification repeats inference to check saved weights, without further optimization or checkpoint selection. A verifier recomputes stored diagnostics, metrics and selection and checks artifact hashes. These records are local integrity evidence, not externally signed research attestations.

## Reproduce

Use the previously prepared isolated environment and publisher-verified local model snapshot:

```powershell
& artifacts/learning-engine/research/local-lora-execution/venv/Scripts/python.exe -m unittest discover -s scripts/learning -p test_synthetic_lora_v2.py -v
& artifacts/learning-engine/research/local-lora-execution/venv/Scripts/python.exe scripts/learning/train_synthetic_lora_v2.py --output artifacts/learning-engine/research/local-lora-execution/run-003-v2 --model-root artifacts/learning-engine/research/local-lora-execution/run-001 --allow-original-synthetic-research
& artifacts/learning-engine/research/local-lora-execution/venv/Scripts/python.exe scripts/learning/verify_synthetic_lora_v2.py --run artifacts/learning-engine/research/local-lora-execution/run-003-v2
```

The output must be a new directory. Preserve completed and incomplete experiments. Execution uses local safetensors, denies Python socket connections, and makes no paid provider requests. This is not an operating-system network sandbox or a fully hermetic Python environment.

## Production boundary

The runner has no serving route and always records `productionEligible: false` and `educatorReviewed: false`. A synthetic pass cannot activate the adapter. LoRA and the Qwen base model are not proprietary inventions. The authored data and implementation are project artifacts; a defensible research claim requires independently reviewed data, measured improvements over the existing tutoring pipeline, and reproducible external evaluation. Student learning claims require an actual study.

## Observed execution, September 27, 2026

Run `run-003-v2` completed 40 optimizer updates in 569.88 seconds. Both validation checkpoints were rejected: epoch one passed one of 12 combined grounding cases, and epoch two passed three of 12. Epoch two also introduced one false abstention on validation. The predeclared fallback selected its lower target-token loss for diagnostic testing; that selection did not make it eligible.

| Fresh test diagnostic | Base | Selected adapter |
| --- | ---: | ---: |
| Target-token loss, lower is better | 1.5463 | 0.9874 |
| Exact source quotation or abstention | 3/20 | 15/20 |
| Two-line format | 18/20 | 20/20 |
| False abstentions on answerable cases | 1/16 | 0/16 |
| Continued without the required insufficiency flag on unsupported cases | 4/4 | 3/4 |
| Combined grounded-case check | 0/20 | 9/20 |

**The candidate is rejected.** Loss fell about 36.1%, and the earlier false-abstention collapse did not recur on the fresh test. However, the combined pass rate was 45%, below the unchanged 80% acceptance threshold, and validation had already rejected both checkpoints. These small samples do not establish generalization across subjects, grade levels, or real student language.

The three unsupported-case violations continued with a question instead of explicitly identifying missing evidence. This diagnostic does not mean all three fabricated a factual answer. Other remaining issues include invented/paraphrased quotations, repetition of the learner's question, and weak next steps. For example, the mass-only case asked how mass relates to volume without identifying the missing information; the hometown-only case asked who wrote the letter when the learner had asked for age.

A fresh base-model load plus the saved adapter reproduced all 20 recorded outputs exactly. The standalone evidence verifier recomputed diagnostics, validation selection, aggregates and artifact hashes successfully. Twenty-one combined Python contract tests passed, including rejection of forged production claims, altered outputs, rehashed false diagnostics and escaping artifact paths. The first restricted Windows test attempt could not access temporary directories; the same tests passed under the reviewed local test escalation.

The immutable experiment report SHA-256 is `98c3d443fc3e7c2eefb1d3f22211a8214c06a578f238a7d543bb901b2a126a40`. The selected adapter safetensors SHA-256 is `133caef1b18d68b55294d92f481ec349857bcdc28d30b196bb83613225431859`. A counterbalanced A/B review packet was generated from the verified outputs with arm identities held in a separate key. Its SHA-256 is `ce274bb64d24f7cd36cf74373a7da0af2f93d9a4ec052880c7175f8a4227bb47`. Supplementary agent review is not qualified educator validation.

## Independent blinded AI review

A separate reviewer read all 20 cases and 40 A/B responses without the model key or training reports. Ratings were saved before unblinding, with SHA-256 `8e5836069cd4c5e92e5112da335670de49d302ba20831023a38dfb210dbe9578`. After matching the counterbalanced key, the reviewer preferred the adapter in 14 cases and the base in one; neither response was adequate in five. Preference does not imply that a preferred response satisfies the task contract.

The reviewer found only one correct required abstention among the eight responses to four missing-evidence cases, plus fabricated quotation/attribution, misleading sign guidance, and weak next steps. This supplementary semantic review supports keeping the adapter rejected despite improvement. It is an AI engineering audit, not educator approval, a human study or evidence of learning gains. Final blinded ratings and the separately unblinded totals are in `docs/engineering/lora-blinded-review-2026-09-27.json` and `lora-review-unblinded-2026-09-27.json`.

## What the evidence requires next

Stop optimizing against these 20 test cases. Preserve them as a consumed evaluation and retain all three rejected runs. The next credible experiment needs independently reviewed source-bound responses, varied missing-evidence and contradictory-evidence cases, and a new held-out evaluation authored independently of model errors. Review exact evidence relevance and usefulness of the next step, not just surface quotation overlap.

The existing [signed Qwen3-4B research path](local-lora-research.md) is the next capacity candidate already implemented in this project. Its current runner requires a BF16-capable CUDA GPU with at least 20 GiB VRAM, an operator-verified local snapshot, properly permissioned and reviewed data, and independent signing. The present CPU-only machine does not meet that runner's hardware gate. A larger model is a candidate for comparison, not a promised fix. No hardware was rented, no paid service was called, and no model was silently substituted or activated.
