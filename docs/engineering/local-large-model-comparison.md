# Local larger-model grounding comparison

## Authorization and scope

The user approved the revised recommendation with "Do it": benchmark the installed Qwen3-VL 30B and compare Qwen3.8-27B before selecting a fine-tuning candidate. This covers the latter's local download and both local research evaluations. Paid compute, production activation and a different replacement model require separate decisions.

Models are `qwen3-vl:30b` and `qwen3.8:27b`, served by the existing local Ollama installation. The publisher and local tag, quantization, manifest, layer hashes, chat template, metadata and server version will be recorded. These are quantized inference models; no adapter is trained in this comparison. The earlier Qwen3.5-9B download proposal is superseded as the default next action.

The existing Radeon AI PRO R9700 reports 34,054,242,304 bytes of GPU memory in the qualified training runtime. This does not establish that an arbitrary context size or a full-precision training path fits. Ollama's per-model `size_vram` is reported residency, not a sampled peak memory measurement or proof that every operation runs on the GPU.

## Prospective comparison

- Exactly the same 48 development rows preserved in run 010, canonical SHA-256 `a76d8bcb1735b9b721308cd925dfa187d44af4481c799307971e82e9f2b3aad5`. Do not open the separate final 100-case module.
- Same system prompt from `qwen3_evidence_integrity_contract.py`; user messages contain only `SOURCE: ...\nQUESTION: ...`. No answers, target responses or reviewer notes are sent to the models.
- One request per row, sequentially, no best-of selection or retry. Exactly one model resident at a time; do not unload unrelated user models.
- The first prospective runtime smoke requested `think: false`, temperature zero and 1024 generated tokens. The installed VL model still generated reasoning and exhausted that limit without final content. This failed attempt is preserved in `large-model-preflight-vl30b-v1`; no development cases were evaluated.
- Revised prospective configuration for both models: `think: true`, temperature 1, top-p 0.95, top-k 20, repeat penalty 1.0, seed 81173, context 8192, generation cap 4096, no streaming and five-minute keep-alive. The temperature/top-p/top-k match the installed VL model's published defaults. A fresh original-case smoke must complete with this configuration before protocol freeze. No configuration will be adjusted using development outputs.
- The original smoke case is a short observatory flag log, unrelated to development or final cases. It tests runtime completion and direct-response behavior, not educational performance. Preserve every failed smoke attempt and any prospective configuration change.
- Local HTTP is restricted to `127.0.0.1:11434`, with no proxy, redirects or cloud model names. Downloading model assets is a separate approved acquisition step. The local-server observation is not an OS network-isolation attestation.
- Record every exact request and full raw response, including any thinking field, termination reason, token counts, model-reported durations, wall time and residency metadata. Preserve reasoning text separately and review only actual final message content; never turn incomplete reasoning into a fabricated final answer. Empty content, truncation, timeouts or identity drift are visible failures, never silently repaired.
- Bound execution to 7200 seconds and individual benchmark requests to 180 seconds. Preserve partial records and failure receipts. Never reuse an attempted output directory.
- Freeze model identities, smoke proofs, row hashes, settings, sources and this design before development generation. Recheck model identity before and after each arm.

The original 4B runs used a different runtime, tokenizer, numerical precision and generation budget. Their results remain historical context, not a controlled architecture-only comparison. This new comparison measures the whole local model/runtime configurations.

## Verification and review

The independent verifier reconstructs the exact prompts, outputs, metrics, counts, order, timings, model commitments, source hashes and complete output inventory. No target-token loss is available through this workflow; report it as unmeasured. Automatic quotation, answerability and format counts remain diagnostics.

After verification, prepare a randomized paired packet of both models' actual output text using the unchanged five-dimensional rubric and shared reviewer guidance. Two fresh reviewers independently rate every response before unblinding. A distinct third reviewer handles only disputed dimensions; agreed failures remain failures. Internal legacy packet arm names `base` and `adapter` identify the two comparison sides only. Both models in this experiment are unadapted, and the report must name them accurately after unblinding.

Development acceptance remains at least 46/48 complete responses and zero fabricated premises. Report all five dimensions and the composite, timing distributions, truncation/error counts and reported residency separately. Repeated development use, synthetic cases and AI reviewers remain limitations.

Passing this comparison does not establish 95% held-out accuracy. The final 100-case set remains sealed until a candidate and the appropriate prospective final protocol meet all prerequisites. The earlier fine-tuning final runner cannot be applied silently to a new Ollama baseline; any such validation needs a separately verified adapter to this runtime, preserving the global one-use dataset claim and all prior exposure safeguards. No inference outcome alone proves educator approval, learning gains, offline recognition accuracy or production readiness.

## Sources checked before execution

- [Ollama Qwen3.8 model listing](https://ollama.com/library/qwen3.8)
- [Ollama chat API](https://docs.ollama.com/api/chat)
- [Ollama thinking configuration](https://docs.ollama.com/capabilities/thinking)
- [Qwen3.8-27B publisher model card](https://huggingface.co/Qwen/Qwen3.8-27B)

## Results

Pending. No accuracy or model-selection claim is made by this prospective document.
