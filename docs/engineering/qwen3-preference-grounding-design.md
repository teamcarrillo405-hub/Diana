# Qwen3 preference continuation: design before inference

September 28, 2026. The approved model remains Qwen/Qwen3-4B-Instruct-2507 at the same verified revision. No paid compute, new model, final-test access or production activation is part of this experiment.

## Motivation and preserved results

Run 007 completed 300 supervised updates on 600 audited original records. Its selected adapter met automatic evidence/format eligibility but failed semantic acceptance. Two blinded reviews passed 32/48 and 40/48 adapter responses. A third blinded reviewer resolved 25 disputed base/adapter responses, preserving agreed failures. The resolved adapter result was 31/48 complete passes with two unsupported-premise flags, versus 34/48 and five flags for the base. The main remaining defect is an unhelpful next question: circular requests for the unknown answer, a shift away from the learner's question, and unsupported existence assumptions.

Automatic evidence checks are insufficient. All run 007 evidence and its failed semantic result remain intact. The final 100 cases remain unused. This continuation does not promise that another training method will reach 95%.

## Data and independence

Two authors who have not read earlier training data, development/final cases, model outputs or review ratings will each create 100 original preference pairs from 50 contexts. Each context supplies two distinct questions, one supported and one missing or unresolved. The combined set has 200 pairs, 100 contexts, 100 supported and 100 insufficient questions, five equally represented subjects, and at least 20 conflicting contexts. Grade labels are estimates, not curriculum validation.

Each pair includes a preferred two-line EVIDENCE/NEXT response and an intentionally defective rejected response. Preferred NEXT questions identify a concrete operation or evidence source plus the specific information sought, without inventing observations or giving an extra completed solution. Rejected categories are fixed at 80 circular/echo responses, 40 unsupported premises, 40 wrong question scopes, and 40 wrong answerability decisions. The categories describe the intended main defect and are not assumed to be mutually exclusive at the linguistic level. Each pair includes an explanatory preference rationale.

Independent content reviewers must inspect all 200 preferred/rejected pairs, report defects and verify corrections before freezing. Bind source hashes, canonical rows, complete individual review notes and audit evidence. No student records or textbook text are used. Negative examples are research data, never instructions to the assistant or approved student-facing answers.

## Parent and prompt

Continue the already selected run 007 epoch-one adapter, pinned to report SHA-256 `3cbb8856dda318f6e3da666ce23fa6c04a747b598683740fb74033f43892ce01` and protocol SHA-256 `c5c109a0a3d079a3722deb3cae97795e928c1c3fbea89c9d2bb4d63b6e304ecc`. This parent is semantically rejected research evidence, not an accepted model. Independently verify it and reproduce all 48 original-prompt selected responses before fitting.

Extend run 007's system prompt by this exact text, including its initial space:

```text
 NEXT must name a concrete checking, measurement, or reading operation, or an evidence source to inspect, together with the specific information sought. Do not merely ask for the unknown answer or restate the learner's question. For a supported statement, ask a small evidence-based interpretation or comparison rather than repeating identification. Clearly mark hypothetical examples as conditional; do not imply an observation occurred.
```

Before fitting, measure the untouched base and the preserved parent under the same new prompt. Keep all 48 development rows and annotations unchanged. Report the effect of the prompt separately from training; do not attribute their combined effect solely to preference optimization.

## Frozen optimization recipe

Use the existing qualified local WSL ROCm environment, immutable base weights and rank-16/alpha-32 q/k/v/o adapter. No new package installation is needed. The objective is standard [Direct Preference Optimization](https://arxiv.org/abs/2305.18290), with an additional chosen-response supervised term. [TRL documents DPO and reference-score precomputation](https://huggingface.co/docs/trl/dpo_trainer); this bounded implementation uses the already installed PyTorch/PEFT runtime.

For prompt x, preferred y+ and rejected y-, define target-only summed log probabilities s. With the parent frozen as reference:

```text
margin = (s_policy(y+|x) - s_policy(y-|x)) - (s_ref(y+|x) - s_ref(y-|x))
loss = -logsigmoid(0.1 * margin) + 0.2 * mean_target_cross_entropy(y+|x)
```

Cache all 200 reference pairs' log probabilities before any fitting. Hash and bind this cache to the parent, prompt, exact masked token sequences and dataset. Reference scores cannot be refreshed after optimizer updates. Prompt tokens never contribute to either objective, and targets never enter generation prompts. Sequence sums implement DPO; only the added supervised term is normalized by target-token count. This is established-method engineering, not a claim of algorithmic novelty.

Use learning rate 0.000005, two fixed epochs, gradient accumulation four, one pair per microbatch, seed 71313, AdamW weight decay 0.01, gradient clipping 1.0, no dropout, BF16, eager attention, nonreentrant gradient checkpointing, four CPU threads, maximum sequence 768, maximum generated tokens 128 and a 7,200-second supervisor. That is 50 updates per epoch, 100 updates and 400 pair presentations total. Greedy evaluation uses cache; training does not. Do not truncate any example. Preserve finite objective components, reference/policy log probabilities, token accounting, gradient norms and every optimizer step.

## Selection and acceptance

Evaluate and preserve both fixed checkpoints. Only the final epoch two can become a candidate, and only if the existing automatic eligibility gates pass: at least 46/48 correct answerability decisions, 46 exact quotations or warranted abstentions, 46 valid two-line/single-question responses, zero answers on insufficient cases, and target-token loss no worse than the paired untouched base. No fallback checkpoint is selected. This rule is fixed before new inference and avoids choosing a terse style merely because it resembles the old development target wording. All original diagnostic metrics remain visible.

Reload the selected adapter and reproduce all its development outputs exactly. Then obtain two independently saved blinded semantic reviews and a third blinded adjudication of disagreements, preserving agreed dimension and overall case failures. The target remains at least 95% complete semantic cases and zero fabricated responses. Automatic eligibility does not grant semantic acceptance.

The unchanged fresh final test can be opened only after these development gates pass, under the existing one-attempt test protocol adapted to this verified experiment schema. A failed final test cannot be silently reused for a future claim. Human educator review, real textbook retrieval evaluation, student learning outcomes and production acceptance remain separate requirements.
