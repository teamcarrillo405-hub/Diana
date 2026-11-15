# Approved Diana rollout, September 29

The user approved all three pending actions with: "All approved. Continue until complete."
This covers the reviewed Vercel source upload/deployment, the recommended existing
Windows GPU host, and the exact two-request GPT-6 Astra diagnostic with its $1 cap.
It does not create an unlimited provider budget or qualify a rejected model.
Educator validation remains deferred.

## Web deployment

The frozen 2,921-file candidate deployed as `dpl_BxwGducdPweGW1RBe7vjEP9r1huP`.
The production alias is `https://diana-umber.vercel.app` and the deployment is READY.
Remote source reconciliation matched all 2,921 files, with no missing, changed or
extra entries. The production login returned 200 with the expected Supabase CSP.
The hosted build completed all 137 static pages and its function trace gate.

The signed-in production browser restored the saved computing lesson, accepted
a synthetic response, and showed bounded rubric guidance. After reload and
resuming Computing, the exact response persisted. No browser errors were observed.
The rubric explicitly does not execute code or decide correctness. Feedback was
observed before reload; only response persistence is asserted after reload.

Evidence:

- `artifacts/learning-engine/release/disclosure-candidate-continuation-20260929-v4-vercel-dry.json`
- `artifacts/learning-engine/release/continuation-deploy-20260929.json`
- `artifacts/learning-engine/release/continuation-deploy-20260929.log`
- `artifacts/learning-engine/release/disclosure-production-verification-dpl_BxwGducdPweGW1RBe7vjEP9r1huP.json`
- `artifacts/learning-engine/release/continuation-production-practice-20260929.json`
- `artifacts/learning-engine/release/continuation-production-practice-20260929.png`

The previous [local checkpoint](roadmap-continuation-2026-09-29.md) records the
independent review, tests, curriculum count, retrieval fix and former approval
blocker. Its pending-approval statements are historical after this authorization.

## Research diagnostic and accounting

The reviewed isolated endpoint was deployed with JWT enabled and all 15 runtime
files reconciled. The first approved request stopped at the QA account's daily
token budget: 153,830 used against a 50,000 limit. One input moderation call
completed, but no generation call started. The second request was not attempted.
The endpoint was disabled in `finally`, and the disabled response was verified.

After locked checks of the exact request and zero provider/raw receipts, the
existing settlement RPC reconciled its 12-cent reservation to zero. The reservation
row and original failure remain in history. Monthly spent stayed at 541 cents;
the unrelated historical one-cent hold and student counters were untouched.

A separate proposal uses new request identities and unchanged two request bodies,
with the same model, 25-cent reservation and $1 cap. It would temporarily raise
only the synthetic QA owner's daily limit to 175,000, restore 50,000 afterward,
preserve counters, make no retries and disable the endpoint afterward. A separate
approval was requested because the original plan prohibited retries. This proposal
has not been executed and supplies no new quality result.

Evidence: `artifacts/learning-engine/research/integrated-diagnostic-20260929/`
and `artifacts/learning-engine/research/integrated-diagnostic-proposal-20260929/`.

## Worker host

The exact immutable worker image completed a synthetic lifecycle test, including a
forced supervisor crash and Docker restart, completion before and after restart,
and cancellation before authorization without another sidecar call. This fixture
uses a synthetic broker, not the live database.

One bounded local request through that image completed on the previously approved
Qwen3.8 model, with the unchanged 500-token ceiling and temperature zero. It took
25.171 seconds and returned a nonempty final response. Ollama reported resident
GPU memory; that is not peak training memory or a quality score. The model was
unloaded afterward. No student job or production model activation occurred.

Vercel's existing sensitive worker token could not be read back. Added the separate
`DIANA_WINDOWS_WORKER_API_TOKEN`, stored locally with Windows DPAPI and remotely as
a sensitive production variable. The original token's ID and update time are
unchanged. The new bearer can claim only `student-ai-candidate-smoke-windows-host`;
per-job capabilities still protect authorization and completion.

The four runtime changes and two tests passed independent review, 39 focused tests,
typecheck and lint. They were overlaid onto the verified production inventory and
deployed as **`dpl_5eTBJiCD1gjb5ApZByCe9D4nCRKE`**, now the current production
alias. All 2,922 source hashes match. Its hosted build completed 137 static pages
and 177 function-trace checks. No unrelated checkout or private artifact was uploaded.

Live checks returned unauthenticated 401, authenticated version/metrics 200,
production-queue denial 403 and an empty synthetic-queue claim after a fresh
all-time database count. The exact immutable container's authenticated health
check passed. No job authorization, moderation, generation or quota change occurred.
A credentialed standby container is created but remains disabled with no network.
This is authenticated host acceptance, not continuous student workload acceptance.

The signed-in practice page was reloaded after this deployment; saved Computing
practice and its exact synthetic response still restored, with no browser errors.

Evidence: `artifacts/learning-engine/release/worker-host-engineering-20260929.json`,
`worker-host-lifecycle-20260929/acceptance.json` and
`worker-host-research-20260929/research-attempt.json`.
Additional evidence: `worker-host-auth-independent-review-20260929.json`,
`worker-host-live-verified-20260929.json`,
`disclosure-production-verification-dpl_5eTBJiCD1gjb5ApZByCe9D4nCRKE.json`
and `worker-host-auth-production-practice-20260929.json` in the release directory.

## Evaluation provenance and recognition

Added a metadata-only family graph and pre-generation review packet. It derives
exclusion components from source/family/lineage relationships and exact content
hashes, including case inputs and private references/rubrics. It rejects ambiguous
identity strings and reports declared coverage across 24 subject/band cells.
The 39 targeted tests, independent re-review, ESLint and full TypeScript check pass.
The review also closed locale-dependent graph ordering and invisible Unicode
identity issues. No actual evaluation
cases or reviewer credentials were created; metadata consistency cannot establish
semantic independence or a 95% result. See `integrated-family-preparation.md`.

The public handwriting audit verified all eight sample hashes and installed model
files. The largest-error crop contains neighboring text lines, outside the pinned
single-line recognizer contract. No reliable general preprocessing repair was
established. No new inference ran and no scores were replaced: historical CER is
61/151 (40.40%), WER 17/32 (53.13%). A repeatable input audit and four tests were
added. See the public-recognition baseline's
`handwriting-input-diagnostic-20260929.md` and hash-bound review receipt.

## Training readiness

Live package metadata and bounded model-header inspection confirm the existing
4B publisher safetensors snapshot and AMD research runtime. The approved 27B
artifact is quantized GGUF for inference. No compatible low-memory backward-pass
or adapter-reload path has been qualified for that larger model. Its declared
parameter count implies about 50.9 GiB for BF16 weights alone, above the historically
reviewed 31.7 GiB device capacity. This arithmetic does not rule out separately
qualified quantization or offloading.

Added a metadata-only preflight that cannot authorize training or import model
runtimes. It needs no student or protected evaluation content. See
`local-training-readiness.md` for the exact observed environment, formats and
remaining recipe/compute decisions. No new training or model download occurred.
Independent review found a file size-check/read race, which was repaired with a
bounded descriptor read and change checks. All 14 tests pass; rereading the pinned
metadata preserves the same training blockers and all historical reports.
The independent re-review reran all 14 tests and closed the finding; its receipt is
`artifacts/learning-engine/research/local-training-readiness-20260929/independent-reader-review-v1.json`.

## Ongoing work

- Production web and browser persistence canary are complete.
- The original diagnostic deployment, stopped attempt, accounting and shutdown
  are complete. The separately proposed diagnostic awaits its requested approval.
- Windows GPU worker authenticated health and credential isolation are complete.
  Student workload activation remains gated on model and workflow qualification.
- Larger-model training needs a qualified training format/backend and an approved
  fixed recipe. Existing 4B weights remain available; its rejected results stand.

Production grounding qualification, an accepted fine-tuned model, comprehensive
curriculum and representative handwriting accuracy remain separate unfinished
quality requirements. Deployment success does not establish them.
