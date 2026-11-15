# Grounding engineering: September 28, 2026

**Target: at least 95% grounded responses. Target not yet achieved.**

This work continues the existing local `Qwen/Qwen2.5-0.5B-Instruct` fine-tuning experiments. It makes no production model change. The experimental task is source-bound evidence selection plus one useful next-step question; these results do not describe the accuracy of the entire Diana product or all schoolwork.

## What changed

- Raised the new experiment's acceptance threshold to 95% on validation and a separate final test.
- Expanded the first new run to 240 balanced records across 30 repeated topic families, with 48 development cases across 24 other labeled families.
- Independently authored and locked 100 final cases across five subjects and four declared levels: 60 answerable, 25 missing-evidence, 15 conflicting-evidence cases. The model has not evaluated this test.
- Added exact relevant-quotation checks, paired answerability examples, source-instruction handling and a separately hash-bound semantic review.
- Added a continuation using 200 additional records from 100 original contexts, reviewed by another AI agent before training. Corrected content issues found in that review. This is not qualified educator review.
- Added independent artifact, checkpoint, continuation and review verifiers, plus an offline CI contract-test workflow.

The original experiments and consumed tests are preserved. No textbook or real student content was used for training. No weights were downloaded, no provider calls or paid compute were used by the training runs, and the active student-facing model was not changed.

## Run 004 / v3: completed, rejected

Actual local training completed 240 optimizer updates in 2,294.54 seconds. Four checkpoints were saved. None qualified, and the locked final test remained unopened.

| Checkpoint | Mechanical grounded cases | Rate |
| --- | ---: | ---: |
| Untouched base | 1/48 | 2.1% |
| Epoch 1 | 17/48 | 35.4% |
| Epoch 2 | 20/48 | 41.7% |
| Epoch 3 | 26/48 | 54.2% |
| Epoch 4 | 18/48 | 37.5% |

The fourth epoch regressed despite low training loss. The best development checkpoint was epoch 3. The experiment correctly recorded `selectedEpoch: null`, `testOpened: false` and `productionEligible: false`; a diagnostic parent choice for further research is separate from accepting a model.

Experiment report SHA-256: `db67346a325a78d777171f42b7ade82a0461433a7b5e9dac930faa61dc95edfd`.

Epoch 3 adapter SHA-256: `7649dae3749e848563f862010342a650928ace0a0480b49cdaa7baa4dea705dd`.

### Independent review of response meaning

A separate AI reviewer inspected all 48 source/question pairs and 96 counterbalanced responses with model identities withheld. Ratings were saved before unblinding, then checked for completeness and exact input/output hashes.

| Arm | All semantic criteria passed | Rate | Responses flagged for fabricated or unsupported content/premises |
| --- | ---: | ---: | ---: |
| Base | 3/48 | 6.3% | 23 |
| Epoch 3 adapter | 14/48 | 29.2% | 16 |

The semantic criteria include relevant source support, correct answerability, useful next question, no extra completed solution and no fabricated claims or assumptions. The last column includes misleading presuppositions inside questions, not only invented declarative answers. Examples include reversed memoir chronology, a nonexistent customer-satisfaction survey, presupposed acidity despite contradictory lab records, and confusion between parallel structure and subject-verb agreement.

These judgments show a substantive quality gap beyond known lexical false negatives. They are one AI review, not verified educator judgments or a human study. The mechanical and semantic rates must not be conflated.

Review SHA-256: `3ac556d32cf657ae22d78548c82ba72dd4796d56ab8a75e1eeb2d4398011c940`.

See [saved blinded ratings](grounding-v3-blinded-review-2026-09-28.json) and [separately unblinded semantic results](grounding-v3-semantic-result-2026-09-28.json).

## Run 005 / v4: completed, rejected

The continuation started from the preserved epoch 3 adapter, with a fresh optimizer, two fixed epochs at learning rate 0.0001, and 440 balanced training records. It first evaluated the untouched base and the saved parent on the corrected development annotations. They reproduced 1/48 and 26/48 respectively; the three pre-audited relevant-quotation additions did not change these observed scores. The same locked 100-case final test remains protected by the validation gate.

The run completed 220 optimizer updates in 2,050.28 seconds (34.17 minutes). Independent artifact verification passed, including exact reproduction of the preserved parent's 48 raw responses before new fitting.

| Checkpoint | Mechanical grounded cases | Rate | False abstentions |
| --- | ---: | ---: | ---: |
| Untouched base | 1/48 | 2.1% | 1 |
| Preserved parent | 26/48 | 54.2% | 0 |
| Continuation epoch 1 | 24/48 | 50.0% | 0 |
| Continuation epoch 2 | 26/48 | 54.2% | 4 |

Epoch 1 correctly distinguished answerable and insufficient evidence on all 48 cases, but the full grounding check also requires relevant quotation and a task-specific next question. Epoch 2 tied the parent's combined score while introducing false abstentions. Both candidates were rejected. The experiment recorded `selectedEpoch: null`, `testOpened: false`, zero final-test evaluations and `productionEligible: false`. No saved-adapter final-test reload was performed because no candidate qualified for that test.

Report SHA-256: `0361c6906f2c20077d8cb8085a2f27e1d75b911056257e9e2db53d3c5e9bd1c4`.

Diagnostic epoch 2 adapter SHA-256: `c8dfa6326e203115716fe10ab182213280c062e6436288bcf1b7f8973b1ae616`.

A fresh blinded AI reviewer assessed all 96 base/adapter responses before unblinding. The adapter passed all five semantic criteria on **23/48 (47.9%)**, versus **4/48 (8.3%)** for the base. Twelve adapter responses and 21 base responses were flagged for unsupported claims or premises. The target remains unmet. V3 and V4 used separate reviewers: their different base ratings demonstrate reviewer variation, so the difference between adapter semantic scores is not a controlled inter-rater comparison.

Saved review SHA-256: `ed192cc1eeace0c0397da04a56cfe039d7e01d6818e62ce4bdefa0d8a9427f94`. See [blinded V4 ratings](grounding-v4-blinded-review-2026-09-28.json) and [verified semantic result](grounding-v4-semantic-result-2026-09-28.json).

The combined engineering regression suite passed 62 tests; those are software integrity checks, not model accuracy measurements.

## Approved next model

The user approved preparing and downloading `Qwen/Qwen3-4B-Instruct-2507` after reviewing the rejected results. Paid GPU compute requires a quoted cost before purchase. Model preparation completed: all 12 files were independently rehashed. The existing AMD R9700 WSL runtime passed actual BF16 LoRA gradient/update/repeat tests, and a separate reviewed runtime contract was frozen. Run 006 began under protocol SHA-256 `2ff6ce808c9e8bcf1d133831e37e20d90c6d5dff5535bd6ef014fbf160f9d6f8`; its pretraining mechanical baseline is 26/48. Run 006 completed in 444.58 seconds: epoch one scored 33/48 and epoch two 30/48 mechanically, so neither checkpoint qualified. Independent artifact verification passed after correcting the verifier's publisher-index parameter-count assumption against actual tensor headers. Two blinded semantic AI reviews passed 37/48 (77.1%) and 42/48 (87.5%), versus base rates of 27/48 and 29/48. They agreed on six actual failures and had five disputed adapter cases. No final-test inference or activation occurred. A [separate continuation design](qwen3-grounding-revision-design.md) now targets these development defects with 600 new examples being authored for independent audit; the original rejection and scores remain intact. The expanded offline engineering suite passed 97 tests. See [local GPU execution](../operations/qwen3-grounding-gpu-experiment.md). A larger base is a research candidate, not a promise of 95% accuracy. The old signed, permissioned-data training path retains its existing requirements.

An operational code search subsequently exposed several original holdout excerpts to the coordinating operator. No model has evaluated that test, but it is no longer described as unseen by every operator. The [evaluation contract](grounding-v3-evaluation-contract.md) records this disclosure; a future generalization claim requires a fresh independently authored final set after freezing the new recipe.

## Run 007: completed, semantic acceptance rejected

The new training set has 600 original records from 200 contexts, balanced across five subjects and supported/insufficient evidence. Two independent AI auditors read every record and saved individual notes. Eleven findings in partition A and five in B were corrected and rechecked before freezing. These are content audits, not educator credentials or evidence of trained-model accuracy.

- [Partition A content audit](qwen3-revision-a-content-audit.json)
- [Partition B content audit](qwen3-revision-b-content-audit.json)
- Combined training rows canonical SHA-256: `87f4f44d551f2435a3f2888f142c9fa4502af1d0d905095320ad71eeffc0bd81`.
- Combined audit manifest SHA-256: `d416c0b6a6a33eb24ae1a7b48fb00dc68bf6f474994ba420eb6b1b5da3331d58`.
- Frozen protocol SHA-256: `c5c109a0a3d079a3722deb3cae97795e928c1c3fbea89c9d2bb4d63b6e304ecc`.

The supervised run completed on the same qualified local GPU in 888.15 seconds, with 300 updates and 1,200 training presentations. All 48 original-prompt parent responses and generated token sequences reproduced exactly before fitting. The revised-prompt untouched base had 28/48 lexical-composite passes, 41/48 correct answerability decisions and seven answers on insufficient-evidence cases. Both trained checkpoints had 41/48 lexical-composite passes, 47/48 correct answerability decisions, 47/48 exact quotations or warranted abstentions, 48/48 correctly formatted responses and zero answers on insufficient-evidence cases.

The fixed rule selected epoch one: target-token loss was 1.2142575098428245, compared with epoch two's 1.3139918678827975 and the untouched base's 5.7600134034538835. The saved selected adapter reproduced all 48 responses and generated token sequences exactly. Independent verification passed after fixing a verifier portability defect that rejected valid WSL parent paths when read on Windows; a regression test checks both path forms and rejects traversal or foreign siblings. No experiment artifact or quality gate was changed.

Report SHA-256: `3cbb8856dda318f6e3da666ce23fa6c04a747b598683740fb74033f43892ce01`. Independent verification receipt SHA-256: `a34a972ad61747fd8911407fd7b0ea53e4b85c0f23a6c66a86f4b07f83438559`. The selected adapter is automatically eligible, while `validationPassed`, `semanticQualityValidated`, `testOpened` and `productionEligible` remain false. Two fresh independent reviewers assessed the 96-response blinded packet, canonical SHA-256 `692f3253629f06a19861d2c484e967ea3d787167ec9d65cc42e11e2d065e1c16`. Both saved all ratings before the coordinating operator unblinded the packet and both remained blinded afterward.

| Semantic review | Base complete passes | Adapter complete passes | Adapter unsupported-premise flags |
| --- | ---: | ---: | ---: |
| First independent reviewer | 31/48 | 32/48 | 1 |
| Second independent reviewer | 35/48 | 40/48 | 2 |
| Third-reviewer adjudication | 34/48 | 31/48 | 2 |

The third reviewer resolved only the 25 disputed base/adapter responses and preserved agreed failures. The resolved complete-case adapter rate is **64.6%**, below both the 95% target and its paired base's 70.8%. The adapter retained 47/48 supported evidence/answerability judgments; useful follow-up questions were the limiting dimension at 31/48. Circular requests for the missing answer, question-scope drift and unsupported observed-trait assumptions remain. A better lexical diagnostic did not establish better complete semantic performance. These are independent AI judgments, not qualified educator review.

See [first ratings](qwen3-run-007-first-blinded-review.json), [second ratings](qwen3-run-007-second-blinded-review.json), [blinded adjudication](qwen3-run-007-adjudication.json), and [resolved evidence](qwen3-run-007-adjudicated-result.json). The resolved result canonical hash is `3a5caac87ec88120f3bfed426ab17bef79ae59d185dbb55d2ef022d0eec0728a`. No final test or activation has occurred. A separate [preference-training design](qwen3-preference-grounding-design.md) addresses these failure categories without changing the old results or the semantic threshold.

The combined offline suite passed 185 tests before subsequent verifier portability tests were added. This included 63 v3/v4 contracts, 116 Qwen3 contracts and six adjudication contracts. The later revision verifier suite passed nine tests, and the final verifier passed 14 tests including a complete synthetic WSL-recorded fixture verified on Windows. These counts describe software checks, not model accuracy.

## Preference continuation: preparation and numerical qualification

The next candidate uses 200 newly authored preference pairs across 100 contexts, with equal supported/insufficient coverage and 40 pairs per subject. Two independent AI content reviewers examined all pairs. Six findings in author A and one in B were corrected and rechecked, including answer-giving follow-ups, an unsupported causal inference and location/orientation ambiguity. Both audits retain individual notes and final data bindings. These reviews qualify examples for research training; they do not measure a model's accuracy.

The objective combines standard DPO with a chosen-response supervised term. A separate random tiny-model qualification on the approved local GPU verified the initial DPO loss equals log(2), both gradient directions, two finite optimizer updates, all 16 trainable adapter tensors changing and unchanged reference values. The qualification proof SHA-256 is `741376426a6dc356e0a2f9b672b02d1a61d3994044f78e13759d997c9bb10cb1`. The completed combined Qwen3 suite passed 177 tests, including 14 runner, 12 independent preference-verifier, 32 final-writer and 21 final-verifier contracts. Full preference training and its semantic results are still pending. The final 100-case test remains sealed.

The combined preference rows hash is `a3927f3931fd47d6ae016a5950e0a2f6c40ae41074b10b414c17413c520058b9`; the combined audit manifest hash is `f193d0f2c3c149a1a1da14bf995ef48b67191420e92ff6f414625e300d19478d`. Tokenization-only preflight passed for all 200 pairs and the unchanged 48 development rows without truncation; the longest preference sequence was 421 tokens against a 768-token limit. The future one-use final runner and its independent verifier now bind all 1,240 training examples from the three-generation ancestry before checking overlap.

See [frozen design](qwen3-preference-grounding-design.md), [author A audit](qwen3-preference-a-content-audit.json), [author B audit](qwen3-preference-b-content-audit.json) and [reproduction instructions](../operations/qwen3-preference-training.md).

Run 008 completed on the approved local GPU under protocol SHA-256 `52f00147c744c0d04841876bf11349a79b624f1ee8c696d1c9830b3110f8bd7c`. It performed 100 updates and 400 pair presentations in 943.96 seconds. All 48 original-prompt parent responses and generated token sequences reproduced exactly before fitting. Under the new prompt, the untouched base had 39/48 correct answerability decisions and nine unsupported answers; the preserved parent had 47/48 and zero. The fixed final-epoch candidate scored 48/48 correct answerability, 47/48 exact relevant quotations or warranted abstentions, 48/48 format passes and zero unsupported answers. Its target-token loss was 2.601142109560566, versus the untouched base's 6.12943492869595. All 48 saved candidate responses and generated token sequences reproduced after reload.

Report SHA-256: `f6dbec7623471797908c3a6ea8894b6ea0c65ac09c12d22db920bccfa3683e5c`. Automatic eligibility and independent artifact verification passed, while semantic acceptance, final-test use and production eligibility remain false. Verification receipt SHA-256: `85f5b78eccfeca4500d8a033ecfba3385d9776d0dde59b719cf179211c917a4a`. Two independent reviewers assessed the 96-response blinded development packet, canonical hash `c7253dc5f022eb29190c8d0d9c2c1f5c742679998953352f6ed54461becfe13d`, and saved complete ratings before operator unblinding. These automatic counts do not establish complete-response quality.

The first independent verification attempt found a verifier bookkeeping defect: the numerical qualification commits the original reviewed runtime contract's raw hash, while the run saves the same JSON contents with Linux line endings. The original 39,204-byte CRLF file has SHA-256 `440edb7a7dab64fe784e28f418970e80cf78f943bdb4f5d0b6445978c3a7042c`; the frozen 38,715-byte LF copy has SHA-256 `c7633d9e37344bfa755c1fa31f0d35ffb44b23781d3a8fa13ef907fd51504184`. Their parsed contents match. A separately versioned corrected verifier preserves the original verifier and every run artifact, binds the original approved raw file and checks the frozen copy's complete contents. No model result or acceptance threshold is changed by this correction.

Corrected verifier SHA-256: `003f1ac7f1698de2dd0d63ae93d4958d0983a13b57802716f285dc7ca614bc66`. The updated combined Qwen3 suite passed all 183 tests; four new tests cover the contract-copy correction and the final verifier now has 23 tests. The separate review-packet suite also passed all 11 tests. During blinded review, both reviewers received the same clarification of the existing packet rule: `usefulNextStep` requires one question, so an imperative can retain other dimension passes but does not satisfy that dimension. No rubric wording was changed.

### Run 008 semantic result: rejected

| Review | Base complete passes | Adapter complete passes | Adapter unsupported-premise flags |
| --- | ---: | ---: | ---: |
| First independent reviewer | 1/48 | 41/48 | 1 |
| Second independent reviewer | 1/48 | 36/48 | 2 |
| Dispute-only adjudication | 1/48 | 37/48 | 1 |

The resolved adapter complete-case rate is **77.1%**, with 47/48 (97.9%) evidence support, 47/48 answerability, 37/48 useful next questions, 48/48 without extra completed solutions and 47/48 without fabricated claims. Thirteen disputed responses were adjudicated; agreed judgments and agreed case failures were preserved. The full 95%/zero-fabrication gate did not pass. The paired base's low composite rate was dominated by imperative NEXT lines violating the question requirement; it must not be described as a general intelligence comparison. Run 008's 77.1% versus run 007's 64.6% is a descriptive comparison across different prompts, training recipes and independent reviewers, not an isolated causal estimate of DPO benefit.

Remaining defects include circular requests for unknown answers, proposed insertion of missing facts into records, underidentified quantitative measurements and task-scope drift. Review also found that the original mechanical parser treats an explanatory `insufficient ...` refusal as a supported answer because it differs from the exact sentinel. The preserved 48/48 automatic answerability count therefore overstates the semantic answerability judgment of 47/48. A separately versioned prospective metric corrects this; no old output, annotation or metric file is rewritten.

See [first review](qwen3-run-008-first-blinded-review.json), [second review](qwen3-run-008-second-blinded-review.json), [adjudication](qwen3-run-008-adjudication.json) and [resolved result](qwen3-run-008-adjudicated-result.json). Resolved canonical hash: `68bbfcd288e8e5e4142628d7dca7dde61ff78b8e5650a042aecc740a01b2c5f9`. Review-bundle raw hash: `cea18ea63cc1f7dda0db3422076a8ae546aa9faed99877bab343d91c6e26ca08`. No final test or production activation occurred. A [new source-integrity continuation](qwen3-evidence-integrity-design.md) is being engineered on the same approved model.

### Run 009 preparation

The prospective evidence-integrity continuation uses 300 original preference pairs, three fixed epochs and a larger supervised term, retaining the same approved model and all acceptance thresholds. The new runner's tiny GPU qualification passed two updates with all 16 trainable tensors changing, finite gradients and an unchanged reference. Current qualification SHA-256: `ef78198f6a62ad9f3e0cb6a14ff906e2e845b2d1f81e8abb51c7ba3e6c5513dd`; runner SHA-256: `4a43b879e944bb2f39d14c6e9dc040137adf8395ea379f0123fad93465a0410e`. This qualification uses random tiny weights and no real training or evaluation cases.

Independent content audit and preflight are active. The first audit identified ten preferred-response problems, including unsupported assumptions, repeated questions and incomplete inputs. The tokenization preparation also stopped at a quote-annotation mismatch before loading model weights or performing inference. These findings must be corrected and re-audited before freezing. The independent artifact verifier is being completed. No full run or final-test opening has occurred.

The final-evaluation writer now targets the new prompt, seed and epoch-three-only selection, and checks all four training generations (1,540 rows plus four development partitions). Its 32 synthetic contract tests pass. The independent final verifier adaptation is complete with 24 tests; the new independent development verifier has 16 tests. The combined Qwen3 suite passed 249 tests. This suite includes structural seal-integrity checks on final data, with no final model inference or case contents exposed to the training authors or operator. The blind-review packet utility supports the new experiment schema and passed 11 tests. These are software checks, not a 95% quality result.

After the first author's corrections, tokenization-only preflight passed all 300 pairs and 48 development rows. The largest sequences were 424 and 336 tokens, below 768 with no truncation. Its initial combined training hash was `5fe210043fe90a9efd4e19339cea2cd731049dbff36409e5c7d39edca93af8e9`; this receipt may be superseded by the ongoing second-batch audit. That reviewer identified 19 preferred-response corrections, including vague evidence requests, an assumed collected sample, an assumed approving vote and insufficient evidence for historical closure. Training remains blocked on content approval.

Both final independent audits are now approved: 150 pairs each, all 29 substantive preferred-response findings resolved and no unresolved findings. The original findings and rejected B audit are preserved separately. A final audit SHA-256: `00efbb8309428a3336ed79de265380c62115452ce62b76e19071f5189a529648`; B: `51f99184d81ca19eeb1d007dc83b9c0c8c1b9b04ace881afcb3230c919cd7e29`. The complete 300-pair combined audit SHA-256 is `20d4687cd24ac3bb2c19ed4284d90af59a698e09f0fd3aeb65338a1e9d219d6c`. These are independent AI content reviews, not educator approval.

The corrected data canonical hash is `73e94b7f518849cc78024b2b63571638e8569708f28c1f8ee87f08811356a760`. Final tokenization preflight passed with the same 424/336 maximum sequence lengths; pair-tokenization hash is `83b3df14d9cdd8a050f5e18cb4dbe6135a839d5e5f0e6b885df82a66e76778af`. Run 009 freeze was started after these prerequisites; no inference result is claimed yet.

Run 009 freeze completed under protocol SHA-256 `68654384af3bfdfa641eb25c1c16efd65552360098ecd4766b5965c4d4fcbe34`. The recorded recipe, 300/48 populations, 225 expected updates, final-epoch-only selection and exact preflight tokenization were checked before launching the bounded local supervisor. The full run is in progress; acceptance awaits its durable results and independent blinded review. All 100 final cases remain unconsumed by model evaluation.

Run 009 completed in 1,384.39 seconds with exactly 225 updates and 900 pair presentations. All 48 original-prompt parent responses/token sequences reproduced, and the selected epoch-three checkpoint reproduced all 48 responses/token sequences after reload. Report SHA-256: `06b9d89bdff32ccf98244fd1f8612a7bbd083cba6b43b8913f3e68c0aba3142a`.

| Run 009 arm/checkpoint | Answerability | Relevant evidence | Format | Unsupported answers | Target-token loss |
| --- | ---: | ---: | ---: | ---: | ---: |
| Untouched base, new prompt | 44/48 | 43/48 | 9/48 | 1 | 5.25284 |
| Preserved parent, new prompt | 47/48 | 47/48 | 48/48 | 0 | 1.69753 |
| Epoch one | 47/48 | 47/48 | 47/48 | 0 | 3.40646 |
| Epoch two | 48/48 | 48/48 | 48/48 | 0 | 3.51820 |
| Epoch three, fixed selected checkpoint | 48/48 | 48/48 | 48/48 | 0 | 3.88667 |

These are the stricter prospective automatic metrics. Target-token loss improved over untouched base but worsened relative to the parent; no parent-loss improvement is claimed. Complete semantic usefulness is unmeasured for this candidate until the independent blinded reviews finish. The independent artifact-verification and packet-preparation command has started. The 95% complete-quality goal and production readiness remain unestablished; final inference remains sealed.

Independent artifact verification passed. Receipt SHA-256: `b769788f5acdb4214e922ad7ee3bf2b2fcae2370d0ba124bda2ce9d906d2a86c`. It reconstructed 225 updates, 900 presentations, fixed references, strict metrics and epoch-three reload identity. The 48-case paired blinded packet has canonical SHA-256 `02328f5f7824e2b6e3dda5a516471cb97b1739829637b48d3ec406ddcc66f8ac`. Two fresh independent reviewers were assigned the same packet and shared clarification of the existing rubric; neither may view the key, prior reviews, training examples or result summaries before saving every rating. Semantic review is in progress.

### Run 009 semantic result: rejected

Both independent reviewers scored the candidate at 39/48 complete responses (81.25%) and flagged two responses with fabricated premises. The third blinded reviewer judged only seven disputed responses/dimensions; the resolved candidate result remains **39/48, with two fabricated-premise flags**. Dimension passes: source support 48, answerability 48, useful next step 39, no extra completed solution 48, no fabricated claims 46. The paired base scored 6/48 complete; its format behavior limits this composite comparison and it is not a general intelligence score.

First review raw SHA-256: `e2e19c1989a0b970f29cabe84f063086743ce4bcd34b77d367d4c18d26634512`, saved `2026-09-28T21:20:34.308716Z`. Second: `aac5bd72c7d2da840a124a6c84e7ab47b107604c44cdac6e32276fc95bf28d87`, saved `2026-09-28T21:19:52.802748Z`. Both remained blind. Adjudication raw SHA-256: `bffa970f64866d962ef19f9b40c13f898b07a973d63e842dc5e3e3d20dea09cc`, saved `2026-09-28T21:22:23.363472Z`. Shared clarification hash: `23ca00ad1c2e32b5024e221521085549e650f5757d4251293fde267c5d4d2681`.

Resolved result canonical hash: `58b606a71a40b6b18ff4f94ace36042340dde67914da5c8298a10efa9b913c45`; review-bundle raw hash: `c5143acf71e780b63a98f3be973908a65d5d4c27a5bb8afcb3ab63142ccf6dd0`. Agreed failures were preserved. No final inference or production activation occurred. Remaining failure categories include repeated extraction instead of task advancement, invented grammatical features, presumed completed edits, observations not tied to the requested sample and inadequate evidence to identify quantitative or biological targets. No new training author is being given these development cases.

A [prospective matched SFT comparison](qwen3-matched-sft-design.md) is being implemented. It returns to the same run 008 parent and reuses the exact 300 independently audited rows, prompt, seed, optimizer settings and three epochs, replacing the combined loss with its existing `0.5 * chosenTokenMeanCE` term alone. This isolates removal of DPO within this deterministic experiment; it does not introduce more development-shaped examples. Parent-loss recovery is reported separately from the unchanged semantic acceptance gate. All earlier evidence and the final seal remain intact.

### Run 010 preparation

The matched chosen-target SFT runner and independent verifier passed 32 synthetic contract tests. Runner SHA-256: `742cf1b75b86cc7f6226555f2ac3d1672568519d8196c1af92c4fd8d77e96436`; verifier: `5da8b68832d4fec1257f4aef3dca42df50ca0869ea08027a86f3c5feb05bd679`. Its tiny local GPU qualification passed two finite updates with all 16 adapter tensors changing. Successful proof SHA-256: `d78efc0db36a30efa27f8a25cb6416f68d8a4e5ce310fc636f80b61127b866e0`. The first qualification attempt reached proof writing but could not save because the operator had not created its parent directory; that failure is preserved separately. Neither qualification loaded real training or evaluation cases.

The new freeze is checking the complete parent and comparator evidence before recording the fixed 300-row, three-epoch chosen-only experiment. Final-evaluation tooling is being adapted prospectively to record run 009 as a same-data comparison sibling, separate from the run 010 initialization ancestry. This preparation does not authorize opening the final set without the unchanged semantic prerequisites.

The first freeze stopped before creating run 010 or running inference: run 009 had reserialized its combined audit, so its preserved raw hash differs from the original. Both parsed contents and canonical hashes match. The corrected runner and independent verifier bind both exact byte hashes plus canonical equality; all other shared input comparisons remain strict. Actual saved-artifact metadata smoke checks passed. The failure receipt and prior qualification are preserved.

Corrected runner SHA-256: `a80dbe38b2435e378c573a0d32188c31e8dceb435f267442cd6351ee03bbb865`; verifier: `385e5d5a9049d0ff3f3654ca77bd3becf2b727bf6d3ab40840ddf9432f709bdf`. Repeat GPU qualification passed two finite updates and 16 changed tensors, proof SHA-256 `df096abfb6b3dd8c52dffdf13d7b5986aa2f5d010d2500145936a4b897b7c8a1`. The corrected freeze is in progress. Prospective final writer/verifier suites passed 36 and 29 tests respectively; no final inference or claim occurred.

All 291 integrated Qwen3 contract tests passed in 80.558 seconds, recorded in `artifacts/learning-engine/research/qwen3-matched-sft-contracts.log`. Corrected freeze completed with protocol SHA-256 `d74946ff8a497f6644f2ff286b04b84be493630a50b4622c433b9b59d241a3a5`. The actual 300/48 populations, 225 updates, chosen-only objective, three fixed epochs and final-epoch selection were reviewed before launching the bounded offline supervisor. Execution has started; no new quality result is established yet.

Run 010 completed in 1,066.28 seconds with exactly 225 updates and 900 chosen-target presentations. All three prefit baseline/parent reproductions succeeded, and selected epoch three reproduced its response strings and generated token lists after reload. Report SHA-256: `be123fc06dfbd7d0e1a3d290872d201ef6de966ea1c505b9c3252615efc48f52`.

| Matched SFT checkpoint | Answerability | Relevant evidence | Format | Unsupported answers | Target-token loss |
| --- | ---: | ---: | ---: | ---: | ---: |
| Epoch one | 47/48 | 47/48 | 48/48 | 0 | 1.53088 |
| Epoch two | 48/48 | 48/48 | 48/48 | 0 | 1.61066 |
| Epoch three, fixed selected checkpoint | 48/48 | 48/48 | 48/48 | 0 | 1.76928 |

The final loss improves on run 009's 3.88667 but remains above the same-prompt parent's 1.69753. Therefore the explicit full-parent-loss-recovery diagnostic is false. Earlier epochs cannot substitute for the preselected third epoch. Independent artifact verification and blinded packet preparation have started. Complete semantic quality is still unmeasured for this candidate, and the final test remains sealed.

Independent artifact verification passed; receipt SHA-256 `5379040d2ff79811c30f0be2e5d5c82ae7edcaff99dd45148352b9db2e22c974`. The blinded paired packet has canonical SHA-256 `fa595bbac230afd874d00d81769b46d654ef234bc99d3728834c0af78e433667`. Two fresh reviewers are independently rating every one of its 96 responses using the unchanged packet rubric and shared guidance. Neither has access to the key, other reviews, training data, earlier result summaries or final cases. Review completion remains pending.

### Run 010 semantic result: rejected

Both primary reviewers independently scored the candidate at 31/48 complete responses; they flagged 10 and 11 responses with fabricated premises respectively. A fresh third reviewer judged only five disputed responses/dimensions. The resolved result is **30/48 complete responses (62.5%), with 11 fabricated-premise flags**. Agreed failures remain failures. Dimension passes are source support 48, answerability 48, useful next step 31, no extra completed solution 47, and no fabricated claims 37. The paired base scores 5/48 complete; its strict-format behavior constrains this composite score, which is not a general intelligence benchmark.

First review raw SHA-256: `507458cd1024dd1d2c54487f4aef9a5dc5612b5f6d0f6090c2f718f7b59d358a`, saved `2026-09-28T22:20:00.065578Z`. Second: `c1277ee0ad8b5c58d066d20c5f4ca7bf8b71d26490b5f87e548299feec50484b`, saved `2026-09-28T22:20:27.205880Z`. Adjudication raw/canonical SHA-256: `96b12fa46fc69c9fddf7979acdadd1422a3adf0c10287f55a9cba71384584bf5`, saved `2026-09-28T22:21:44.667399Z`. All three reviewers attested independent authorship, saving before unblinding, and remaining blind. These are AI reviews, not educator validation.

Resolved result canonical SHA-256: `efc75e957b9a7b2918e11e755a754b10e7b98380a371666a0e26c53d0c17c34d`. Review-bundle raw SHA-256: `d28f3f4eef4f9eda99dcc86154dde0216d3d475931f4ffe69f8a3a0b71e3b028`. The actual final-entry semantic gate was executed against this saved bundle and rejected it for the expected threshold/fabrication reason. Its receipt is `artifacts/learning-engine/research/qwen3-run-010-semantic-rejection.json`. Final seals still match and no global consumption claim exists; no final cases were imported by this gate check and no final inference occurred.

The matched comparison reduced prediction loss but worsened complete-response quality relative to run 009. Neither candidate satisfies acceptance. The best resolved result in this series remains run 009 at 39/48 (81.25%) with two fabricated-premise flags. Do not select an earlier run-010 checkpoint after seeing these results, weaken the rubric, activate these adapters, or claim 95% from the automatic 48/48 counts. One deterministic run does not establish a general causal effect or prove a universal 4B capability ceiling.

A concrete [Qwen3.5-9B research proposal](qwen35-9b-research-proposal.md) records the next model recommendation, qualification work, preserved evaluation safeguards and approval boundary. The user explicitly required a stop before changing models. No replacement model has been downloaded or executed, no paid compute has been purchased, and production remains unchanged by these experiments.

## Evidence and limits

### Subsequent approved larger-model comparison

After the proposal above, the user approved comparison of installed Qwen3-VL 30B and Qwen3.8 27B. The latter was downloaded and both models completed 48 development cases with independently verified artifacts. See [the separate comparison report](local-large-model-results.md) for automatic diagnostics, exploratory response reviews, the fresh-reviewer capacity limitation, and the research selection decision. This supersedes the prior statement that no replacement was downloaded or executed. No larger model was fine-tuned or activated, and the final test remains sealed.

- [Acceptance contract](grounding-95-acceptance.md)
- [Independent test contract](grounding-v3-evaluation-contract.md)
- [Pre-result development assessment audit](grounding-v3-development-audit.md)
- [v3 execution and reproduction](../operations/local-lora-v3-quality.md)
- [v4 continuation and reproduction](../operations/local-lora-v4-quality.md)

The 95% target is an observed-sample requirement. Even 95/100 would not demonstrate that population accuracy is at least 95%, universal curriculum competence, student learning gains or production readiness. Model deployment still requires appropriate external review and operational acceptance.
