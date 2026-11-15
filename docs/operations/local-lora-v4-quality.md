# Grounding research v4: development continuation

## Prepared recipe

This separate experiment may continue a completed, rejected v3 checkpoint only while the independently authored 100-case holdout remains unopened. It preserves v3, verifies every parent artifact, and selects the parent with the highest v3 validation grounded-case count, breaking ties by lower validation token loss. The parent choice is a development decision, not a deployment approval. Its report, candidate table, weights, and configuration are hash-bound in the new preregistration.

The development set combines 240 earlier records with 200 independently authored records from 100 additional fictional scenarios. The combined 440 records are balanced between supported and insufficient cases. The new scenarios received an independent AI content audit and corrections before fitting; they are not educator-approved data. All records use original authored content, without real student data or copied textbook text.

The composition makes two narrowly documented development corrections: explicitly limit the repeated-multiplication explanation to positive integer exponents, and add three independently identified relevant quotation alternatives to validation. These three alternatives were documented before the first v3 adapter output existed. No holdout case or threshold changes. Existing v3 results are never recomputed and relabeled as its preregistered result.

The proposed continuation uses the same rank-16 query/key/value/output attention adapters, two epochs, a fresh AdamW optimizer at learning rate 0.0001, accumulation four, gradient clipping 1.0, and four CPU threads. It has a separate 3,600-second wall-clock cap. Both the untouched base and saved parent are evaluated on the corrected 48-case validation set before any new optimization. This distinguishes an actual training change from the known validation corrections.

## Acceptance

The same 95% relevant grounding threshold and base-model loss/false-abstention/unsupported-response nonregression gates apply. Only the lowest-loss eligible validation checkpoint can open the unchanged sealed 100-case holdout. On rejection, no checkpoint is selected and the final test stays unopened. On eligibility, one fixed baseline/adapter comparison and persistence reload are permitted. Raw model generations are scored; no postprocessing or rule-based response substitution is counted as model accuracy.

Independent semantic review is still needed because lexical source/anchor checks can both reject valid alternatives and accept an unsupported premise embedded in an on-topic question. Even a synthetic mechanical pass remains research-only, with production eligibility false.

## Execution

Run `run-005-v4` completed on September 28, 2026, after the completed v3 evidence passed independent verification. The deterministic parent rule selected v3 epoch three (26/48 original validation grounded cases). Parent report SHA-256: `db67346a325a78d777171f42b7ade82a0461433a7b5e9dac930faa61dc95edfd`; parent adapter SHA-256: `7649dae3749e848563f862010342a650928ace0a0480b49cdaa7baa4dea705dd`. The continuation completed 220 optimizer updates in 2,050.28 seconds (34.17 minutes).

Reproduction requires a new output directory and preserves all prior reports:

```powershell
& artifacts/learning-engine/research/local-lora-execution/venv/Scripts/python.exe scripts/learning/train_synthetic_lora_v4.py --output artifacts/learning-engine/research/local-lora-execution/run-005-v4 --model-root artifacts/learning-engine/research/local-lora-execution/run-001 --parent-run artifacts/learning-engine/research/local-lora-execution/run-004-v3 --allow-original-synthetic-research
& artifacts/learning-engine/research/local-lora-execution/venv/Scripts/python.exe scripts/learning/verify_synthetic_lora_v4.py --run artifacts/learning-engine/research/local-lora-execution/run-005-v4
```

No larger model, download, provider call, hardware rental, or activation is part of this recipe.

## First-epoch development observations

The first continuation epoch produced 24/48 combined mechanical passes (50%), compared with the saved parent's 26/48. Its answerability classification was correct on all 48 cases, and relevant quotations/abstentions increased from 33 to 38. Target-token loss fell from 1.7913 to 1.1429. However, case-specific next questions fell from 35 to 27. These improvements in some components did not satisfy the full tutoring contract.

Raw outputs still included invented or paraphrased evidence presented as quotations, including `controls the emphasis of the paragraph`, `follows a grouped-by-occupation hierarchy`, and `glaciates transport rock fragments`. An eclipse response asked about seeing the Sun and Moon in the same position, one response omitted the required `NEXT` line, and one English-language case produced a Chinese follow-up question. Several lexical failures were plausible alternative next questions, so mechanical and semantic assessment must remain separate. The documented examples establish that scoring narrowness does not explain every remaining defect.

These observations did not change the frozen second epoch, its data, acceptance threshold, or the sealed final test.

## Final verified result

| Corrected validation comparison | Relevant grounded cases | Target-token loss | False abstentions | Missing required insufficiency flag |
| --- | ---: | ---: | ---: | ---: |
| Untouched base | 1/48 | 1.9341 | 1/24 | 23/24 |
| Reloaded v3 parent | 26/48 | 1.7913 | 0/24 | 1/24 |
| V4 epoch 1 | 24/48 | 1.1429 | 0/24 | 0/24 |
| V4 epoch 2 | 26/48 | 1.3464 | 4/24 | 0/24 |

**The continuation is rejected.** Its best diagnostic grounded-case score was 54.17%, below the 95% requirement, and that checkpoint introduced four false abstentions. Neither epoch is an eligible selected checkpoint. `selectedEpoch` remains null, `validationPassed` is false, `testOpened` is false, and zero final-test evaluations occurred. All model artifacts remain inactive and research-only.

The saved parent reproduced all 48 raw validation responses, IDs, and token counts exactly before new fitting. The three pre-audited accepted-span alternatives did not change its observed score. The independent final verifier recomputed both base and parent diagnostics, both new candidate metrics, rejection, artifact manifests, adapter shapes, immutable parent linkage, and test seals successfully. The v4 report SHA-256 is `0361c6906f2c20077d8cb8085a2f27e1d75b911056257e9e2db53d3c5e9bd1c4`. Epoch two's adapter SHA-256 is `c8dfa6326e203115716fe10ab182213280c062e6436288bcf1b7f8973b1ae616`.

This is evidence of specific failed recipes, not proof that 95% is impossible with this model. It does show that loss reduction, better insufficiency detection, and additional authored scenarios did not produce reliable source-grounded tutoring. No further optimization against this validation set, hidden-test opening, larger-model substitution, or deployment followed this result. A separately blinded semantic review of the preserved best diagnostic checkpoint is required before drawing a broader teaching-quality conclusion.

## Blinded semantic review

A fresh AI reviewer evaluated all 48 cases and 96 paired outputs without the arm key, saving complete ratings before unblinding. The best mechanical diagnostic checkpoint, epoch 2, passed all five semantic dimensions on 23/48 cases (47.9%); the untouched base passed 4/48 (8.3%). Twelve adapter responses and 21 base responses contained unsupported claims or premises. The 95% target remains unmet. These are AI engineering judgments, not qualified educator validation. A different reviewer evaluated V3, so cross-run semantic differences also include reviewer variation.

The review file SHA-256 is `ed192cc1eeace0c0397da04a56cfe039d7e01d6818e62ce4bdefa0d8a9427f94`. See [saved ratings](../engineering/grounding-v4-blinded-review-2026-09-28.json) and [verified results](../engineering/grounding-v4-semantic-result-2026-09-28.json).
