# Proposed next research model: Qwen3.5-9B

Status: proposal only, pending the user's explicit model-change approval. No weights downloaded, model executed, paid compute purchased or production activation performed.

Subsequent decision: the user approved the revised larger-model comparison with "Do it". Work is proceeding under [the separate comparison protocol](local-large-model-comparison.md) for installed Qwen3-VL 30B and Qwen3.8-27B. This does not approve or initiate the original 9B download proposed below.

## Recommendation revised after local model inventory

The user asked whether the existing hardware and installed models permit stronger alternatives. A read-only `ollama list` / `ollama show` inspection confirmed `qwen3-vl:30b` (31.1B parameters, Q4_K_M, approximately 19 GB) and `qwen3-coder:30b` (30.5B, Q4_K_M, approximately 18 GB) are already installed. No Ollama model was running during inspection. Their grounding performance on Diana's task is unmeasured. The vision-language model is the first installed candidate to benchmark; the coding specialist is primarily relevant to development work.

The 9B proposal below is retained as a conservative local training candidate, not a hardware ceiling or the default next download. The revised quality-oriented shortlist adds [Qwen3.8-27B](https://huggingface.co/Qwen/Qwen3.8-27B), [Qwen3.6-35B-A3B](https://huggingface.co/Qwen/Qwen3.6-35B-A3B), and [Gemma 4 31B IT](https://huggingface.co/google/gemma-4-31B-it) in suitable quantized inference formats. Actual GPU memory, latency and quality must be measured. Their full BF16 weights exceed this single GPU's memory; successful compressed inference would not itself qualify a fine-tuning path. No substitute model has been downloaded, run or approved by this comparison request.

## Why consider a change

The approved Qwen3 4B experiments have not met Diana's complete-response acceptance gate. Run 009 reached 39/48 complete development responses with two fabricated-premise flags. The matched chosen-target SFT run 010 reduced prediction loss substantially but resolved independent review scored only 30/48 complete responses with 11 fabricated-premise flags. This is evidence against assuming that lower target-token loss or more repetitions of the same training examples will solve the remaining problems. It does not prove a universal capability ceiling for 4B models.

I recommend evaluating **Qwen/Qwen3.5-9B** as the next research candidate, with a fresh baseline before deciding whether to fine-tune it. Its publisher documents a 9B language model with a vision encoder, Apache-2.0 licensing, and a direct-response mode. The model family uses a different hybrid attention architecture, so existing LoRA targets and runtime assumptions require new qualification. [Official model card](https://huggingface.co/Qwen/Qwen3.5-9B), [Transformers architecture documentation](https://huggingface.co/docs/transformers/model_doc/qwen3_5).

The published repository is approximately 19.3 GB as checked on 2026-09-28. This is a download/storage figure, not the training memory requirement. The existing local GPU has approximately 31.7 GiB of reported memory. Feasibility of the complete training path must be measured, including activations, adapter gradients, optimizer state, model buffers and runtime overhead. [Publisher file inventory](https://huggingface.co/Qwen/Qwen3.5-9B/tree/main).

This recommendation is an engineering judgment about a candidate to test, not a guarantee of 95% accuracy. Publisher benchmarks do not measure Diana's exact source-grounding and educational-next-step task. Vision support also does not establish handwriting accuracy or replace a separately evaluated offline recognition pipeline.

## Bounded work after approval

1. Pin an exact publisher revision, license, configuration, tokenizer, shard inventory and checksums. Download only the approved model assets into a separate research directory. Preserve all 4B runs and the existing runtime.
2. Inspect the installed Transformers and PEFT implementation. Qualify the actual hybrid attention path, assistant-only masking, adapter target inventory, finite gradients, save/reload identity and deterministic direct-response decoding with a tiny random fixture before full weights. Keep any necessary dependencies isolated and record exact versions.
3. Measure local inference and training memory with short, original smoke inputs. Abort on unsupported kernels, nonfinite gradients, excessive memory or inconsistent reload outputs. No paid fallback without a separate quoted approval.
4. Freeze a baseline protocol before evaluating the model. Retain exact source/question evidence and raw token outputs. Explicitly configure direct-response mode and its tokenizer template rather than relying on default thinking behavior. Do not transplant a 4B adapter into the new architecture.
5. Use existing training data only with its recorded authorship, audit decisions and exposure lineage. Do not add examples derived from the repeatedly observed development failures. If new training data is needed, have independent authors work from a prospective curriculum specification while remaining blind to evaluation cases and results.
6. Preserve the original development threshold of at least 46/48 complete responses and zero fabricated premises. Use fresh independent blinded reviewers and dispute-only adjudication, retaining agreed failures. Record repeated development use as a limitation.
7. Keep the untouched final 100-case set sealed until all prerequisites pass and the selected checkpoint and evaluation protocol are committed. Require at least 95/100 complete responses and zero fabricated premises. Preserve exclusive one-use consumption and every failed attempt. Never retune on consumed final cases and continue calling them held out.
8. Report source grounding, answerability, educational usefulness, fabrication, loss, latency and memory separately. An observed sample result does not establish a population guarantee, educator validation, student learning gains, production readiness or exclusive ownership of the underlying open model.

## Approval boundary

Requested approval would cover preparing and downloading this specific research model, local runtime qualification, local baseline evaluation and local fine-tuning experiments under the existing evidence safeguards. It would not cover paid GPU compute, provider charges or production activation. The user previously asked the agent to stop before changing models; that instruction remains in force until approval arrives.
