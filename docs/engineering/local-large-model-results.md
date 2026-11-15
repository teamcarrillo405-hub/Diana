# Local larger-model comparison results

Date: 2026-09-28. Research only; no production activation or fine-tuning occurred in this experiment.

## Completed execution

Both approved models completed the same 48 development cases on the existing Radeon AI PRO R9700 using local Ollama 0.34.2. All 96 requests completed without runtime failures or truncation. The runner and independent verifier passed 29 synthetic tests. The independent verifier accepted the complete run, including 214 recorded HTTP exchanges, prompts, outputs, identity commitments, timing reconstruction, and the artifact manifest.

The exact prospective design remains unchanged in `local-large-model-comparison.md` and in the frozen run. Model files were hashed before execution and rechecked before and after each arm. Both models were unloaded; the server subsequently reported no resident models.

## Automatic diagnostics

These checks do not establish semantic quality or educator approval.

| Measure | Qwen3-VL 30B | Qwen3.8 27B |
|---|---:|---:|
| Relevant exact evidence or warranted abstention | 42/48 (87.5%) | 45/48 (93.75%) |
| Correct answerability under the strict grammar | 43/48 | 46/48 |
| Two lines, valid evidence grammar, one question | 29/48 | 39/48 |
| Answer supplied where the case requires insufficiency | 4 | 2 |
| Median request time | 3.78 s | 6.46 s |
| 95th-percentile request time | 24.85 s | 14.35 s |
| Total request wall time | 375.31 s | 341.73 s |
| Reported GPU residency | 18.41 GiB | 16.24 GiB |

Timing includes model loading when it occurs. GPU residency is Ollama metadata, not a sampled peak or proof that every operation runs on the GPU. Generated token counts include thinking. Target-token loss was not measured. One seed and one response per case were used; there were no retries or selected best responses.

## Review status and protocol deviation

The first attempt to create a fresh blinded reviewer returned `agent thread limit reached`. A second attempt through an existing coordinator returned the same error. This was recorded before the substitute reviewers inspected responses in `local-large-model-run-001-review/reviewer-allocation-deviation.json`.

Two existing engineering agents saved complete independent, model-assignment-blinded exploratory reviews using the unchanged five-dimensional rubric. They retain prior engineering context and know candidate identities. They are not fresh reviewers, and their reviews cannot satisfy the prospective fresh-context requirement or authorize final evaluation. The operator key and observed model results were withheld from them until their ratings were saved. A separate existing agent adjudicated only 18 disputed dimensions across 13 responses, preserving agreed failures.

### Resolved exploratory response review

| Criterion | Qwen3-VL 30B | Qwen3.8 27B |
|---|---:|---:|
| All five criteria passed | 16/48 (33.3%) | 22/48 (45.8%) |
| Relevant source support or warranted insufficiency | 46/48 | 47/48 |
| Correct answerability | 47/48 | 47/48 |
| One useful next-step question | 16/48 | 23/48 |
| No extra completed solution | 48/48 | 47/48 |
| No unsupported claims or premises | 41/48 | 32/48 |
| Responses with unsupported-premise flags | 7 | 16 |

Both fail the required 46/48 complete responses and zero unsupported-premise flags. A high score on source support alone does not establish the combined 95% target. These semantic judgments differ from automatic diagnostics because the reviewers can recognize relevant source quotations expressing missing or conflicting evidence without requiring the literal insufficiency sentinel.

Unsupported-premise flags include assumptions embedded in questions, not only invented factual answers. For example, Qwen3.8 assumed an original worksheet contained a chosen number, asked for numerical quartiles in an unestablished learner dataset, and assumed memoir passages were already flagged as inaccurate. Imperative follow-ups also fail the prospective requirement for one question. These are judgments under this strict source-only tutoring contract; they do not imply that every such phrase would be inappropriate in a real conversation with additional established context.

The primary reviewers scored VL at 17/48 and 14/48, and Qwen3.8 at 21/48 and 25/48. Their unsupported-premise counts were 6/7 for VL and 16/10 for Qwen3.8. The resolved scores above preserve the full original reviews and disagreement record. These are exploratory AI judgments, not independent educator evidence.

## Current decision

Neither model qualifies for promotion. Qwen3.8 27B is a conditional candidate for a controlled fine-tuning experiment because it leads the automatic diagnostics and complete-response score, uses less reported GPU memory, and has a shorter slow-response tail. However, its substantially higher unsupported-premise count must be treated as a regression to fix, not hidden by the composite score. Qwen3-VL remains the comparison baseline. No fine-tuning winner or production upgrade has been established.

This is a comparison of quantized inference configurations, not a fine-tuning result. The earlier 4B runs used different runtimes and generation settings, so their results are historical context rather than a matched size comparison. The best historical 4B semantic result remains 39/48 with two unsupported-premise flags; the larger untuned models have not displaced that evidence.

The final 100-case test remains sealed: the module hash is unchanged and the global consumption claim is absent. Neither model is approved for production by this result. This short source-grounding task does not measure textbook retrieval, multimodal recognition, student learning gains, or accuracy across the full curriculum.

## Evidence

- Run: `artifacts/learning-engine/research/local-large-model-run-001/`
- Protocol SHA-256: `e2c43f5e6a2d93310548aa01ab984af9bec62f09e4cb452025621be372c9e2f6`
- Independent receipt: `artifacts/learning-engine/research/local-large-model-run-001-review/verification.json`
- Blinded packet canonical SHA-256: `0c8972185e57b76369ddc61aeb3cf3e7478e625441dd7b327b23d7fb60ad4657`
- Reviewer guidance raw SHA-256: `23ca00ad1c2e32b5024e221521085549e650f5757d4251293fde267c5d4d2681`
- Installed VL manifest: `eda0be1008774ea4e575187712b9a3b1201f3e66e7ecff899cc295db1cf00248`
- Installed Qwen3.8 manifest: `aaee06c39dcf2437cde036998d960e1fc1494b8191be7cc9657d01e509097813`
- Report raw SHA-256: `f3f236ae0ae309607fe9c362bd1fd0eeefd8ca9465123ea1faedd57d2b26fb30`
- Primary review raw SHA-256 values: `587ca32af60ece3f64acddd42caf8ed8f4d2ae1546b3008c88b54a4895fdb961` and `ec0b69aba42269129c274e91a2ea0914f81f17c6c19f17b14e0ed030261f5f60`
- Adjudication raw SHA-256: `c5603cebee789b20226cf31d49fb90feaf614f9873bfb1c7e064c1d86191d7ea`
- Resolved exploratory result canonical SHA-256: `64a8cf51c27f540bb6d2e22eb3e612611d9ded0fdda7de62274df0dd14e3db10`

## Next research step

After the exploratory comparison, obtain two fresh blinded reviews of the unchanged packet in a session with available reviewer capacity. Qualify the selected model's trainable runtime before claiming that fine-tuning fits this GPU: inference residency does not measure training memory or backward-pass support. Preserve the existing independent final set and use separate authored training examples. Freeze any subsequent training recipe before execution, then require a saved-adapter reload, matched baseline comparison, independent artifact verification and semantic acceptance before final evaluation.

The publisher supplies Qwen3.8 27B in Transformers format with a vision encoder and the Qwen3.5 architectural family. That is a potential training route, not evidence that our AMD training stack supports this model yet. [Publisher model card](https://huggingface.co/Qwen/Qwen3.8-27B).

A read-only check of the existing WSL runtime with its research overlay found PyTorch `2.9.1+rocm7.2.1.lw.gitff65f5bc`, Transformers `5.15.1`, PEFT `0.21.0` and Accelerate `1.14.0`. The `qwen3_5` configuration is registered. `bitsandbytes` is not installed in that environment. No model weights were loaded and no backward pass was attempted by this check. A low-memory training implementation, actual gradient/update smoke, memory measurement and saved-adapter reload remain prerequisites; the library inventory does not certify them.
