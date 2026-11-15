# Curriculum, recognition and model research release

This document records the September 26 continuation. It supersedes older roadmap statements that no language-model training has run or that advanced-college practice is unavailable. Release status is recorded separately from local implementation.

## Curriculum implementation

- 87 authored activities, 45 active practice collections and 67 competencies. The framework contains 46 course records.
- Math, Reading, English, Science and History each have selected activities at grades 6–8, grades 9–12, introductory college and advanced college.
- The expansion preserves the content hashes of all 39 preceding activities. It adds 48 activities with deterministic calculation checks or explicit review rubrics.
- `course-coverage.ts` reports every subject/level cell as partial authored coverage. These are not complete grade courses or a college curriculum. Educator approval and standards alignment remain outstanding.
- Exact-value tasks include polynomial constant terms, conditional probability, derivatives, integrals, determinants and finite expectations. Reading requires evidence from separate passages; authored history simulations are labelled as simulations.
- The offline course gate passes all 87 activities without provider calls. Report: `artifacts/learning-engine/research/course-gate/gate-1790443898334.json`.

## Browser recognition implementation

An opt-in browser worker runs pinned quantized Whisper and TrOCR models using Transformers.js 3.8.1 and same-origin WebAssembly assets. Model downloads require an explicit action and are checked against publisher-file sizes and SHA-256 hashes. The browser caches public model weights; student source files are not uploaded or cached by this path.

English 16 kHz mono PCM WAV recordings and cropped handwritten prose lines are supported within enforced file, duration and image bounds. Full pages, equations and diagrams remain manual-entry tasks. Recognition works after downloads while the practice page remains open. Authentication, saving and resuming still require the server.

Browser transcriptions remain unverified drafts and must be checked and confirmed by the student. They never receive the server's recognition attestation. The optional local-server adapter has a separate deployment and signing-key boundary.

Actual offline browser inference on two original synthetic fixtures produced exact speech and image-line transcriptions. These are engineering smoke samples, not representative human accuracy measurements.

The final exact-bundle smoke used Chromium 148 with a production-equivalent security policy and disabled browser networking for fresh inference workers. Speech took 1,783 ms and handwritten-line recognition 1,227 ms. Report: `artifacts/learning-engine/research/browser-recognition/smoke-1790444454959.json`. See [browser recognition operations](../operations/browser-recognition.md) for supported formats, cache and device bounds.

## Actual language-model fine-tuning

Two local CPU LoRA training runs used the pinned Apache-2.0 Qwen2.5-0.5B-Instruct snapshot and 32 original synthetic examples. No textbook or student material entered this dataset. Training and paired baseline/adapter evaluation actually ran; adapters and immutable reports were saved outside deployment inputs.

The first candidate overfit and abstained on all eight evaluation cases. A preregistered correction used one epoch and a lower learning rate, with a new eight-case subsequent test explicitly authored after the first failure. Its target loss improved from 1.4963 to 1.0825, but it still abstained on two answerable cases. Both candidates failed the release gate and remain inactive. Lower loss alone does not authorize activation.

The separate rights-cleared, educator-reviewed training pipeline remains available. A deployable tutoring adapter still requires suitable reviewed data and an independent, representative evaluation. These runs establish executable training engineering, not teaching effectiveness or a proprietary base model.

Both saved adapters were reloaded into a fresh base model and reproduced all eight recorded outputs. Ten Python contracts passed. [Execution results and release decisions](../operations/local-lora-execution-results.json) bind the immutable reports, data and adapter hashes; [the execution guide](../operations/local-lora-execution.md) records the exact protocol and limitations.

## Local release verification

- Integrated learning/API/component/security tests: 450 passed across 88 files. Log: `artifacts/learning-engine/research/curriculum-recognition-integration.log`.
- Final numeric-feedback, worker lifecycle, recognition consent and CSP corrections: 27 passed across four files. Log: `curriculum-recognition-final-fixes.log` in the same directory. These overlap the integrated suite.
- TypeScript, scoped ESLint, production build and tone audit passed. Tone audit retained 67 pre-existing advisory warnings and zero blocking issues.
- Live local synthetic-owner checks opened advanced mathematics, checked determinant 25 and verified numeric feedback; opened advanced reading with two source passages; and verified separate English/Reading labels, offline download disclosure and mandatory transcription confirmation.
- Independent review found no remaining scoped high-priority recognition issue. Existing-schema dependency review confirms the browser-draft and expanded catalog paths do not require the pending migrations. Response-review and local-server recognition paths remain disabled by existing gates.
- Vercel dry upload inspection and a second independent exclusion review found no model weights, execution datasets/reports, credentials, student samples or session exports among 2,853 nonempty files. Same-origin browser runtime files are included; runtime generation runs during both installation and production build.

## Production controls

The existing public site is `https://diana-umber.vercel.app`. The verified prior production deployment is `dpl_2wrnm9gwAzuDW27gvGAkxvPna3cU`, URL `https://diana-ir6nkm2w8-teamcarrillo405-hubs-projects.vercel.app`.

The release workflow creates a production-environment deployment without assigning production aliases, checks build status and public/authentication/runtime behavior, then promotes only a verified candidate. The prior deployment is retained as the rollback target. Training weights, credentials, research artifacts and private configuration are excluded from upload.

The first candidate, `dpl_Eig3rgPerP8VsfL4rxUGDT6dCx3B`, compiled successfully but was rejected during output deployment: the `api/diana/study-buddy/stream` function was 399.97 MB, exceeding Vercel's 250 MB limit. It was not promoted. File tracing included the public media tree in server functions. The corrective release separates CDN-served public assets from function bundles and adds a predeployment trace-size check; it does not opt into a larger-function beta.

The final local build passed the strict trace gate for 176 routes, maximum 39,703,708 bytes and zero public assets inside function traces. Next 15's Windows exclusion glob mismatch is handled by a public-directory-only trace normalization before auditing; six regression tests cover its boundaries. Independent inspection verified all nine private textbook indexes, the manifest, PDF worker, fonts, character maps and PDF WASM dependencies remain present. Logs: `curriculum-recognition-build-final.log` and `function-traces-independent-readonly.json` under the research artifacts directory.

The seven public recognition runtime paths are explicitly allowed through authentication middleware. Unknown vendor files and all student learning APIs retain authentication. Thirty-six middleware/CSP tests passed, followed by independent security review. This fixes unauthenticated runtime fetches that deliberately omit credentials.

The corrected candidate `dpl_Dd45uHBPjitNSXrhN9wFxKC4bEGu`, `https://diana-6147jw02w-teamcarrillo405-hubs-projects.vercel.app`, reached READY. Its provider-side build passed the 176-route trace check with maximum 39,700,012 bytes. The public canary passed health, login CSP, all five executable/WASM asset hashes and authentication on private routes (`web-release/canary-1790445447053.json`). The synthetic QA student signed in through the normal login form, resumed the saved advanced Reading response, downloaded Whisper through the real UI, recognized the original synthetic WAV, explicitly confirmed and saved its transcription, then reloaded and resumed the exact text with confirmation retained. Browser draft provenance did not require the pending server-recognition migration.

**Promoted:** the verified candidate was promoted to `https://diana-umber.vercel.app` on September 26. Vercel resolves that public hostname to `dpl_Dd45uHBPjitNSXrhN9wFxKC4bEGu`, READY. The post-promotion canary passed the same five runtime hashes, security policy, health and authentication boundaries: `web-release/canary-1790446065493.json`. The signed-in public-site practice route visibly exposes the expanded catalog. This release preserves the existing enrolled-owner cohort; it does not silently enroll every student or activate the rejected adapters, educator-review route or trusted local-server recognition.

The candidate also downloaded and executed TrOCR through the deployed UI, producing the exact synthetic line, "The plant grows toward the light." It remained unconfirmed. The QA fixture's original typed Reading response was restored and saved after these recognition tests. Runtime inspection showed one expected 503 from the disabled response-review route; it was not counted as an unexpected application failure.

Final public-site browser verification followed Guided Practice back to Class Materials, opened the reference book, searched all chapters for `ellipse`, and followed a retrieved Chapter 9 / PDF page 2 citation. The original PDF rendered with its equation and diagram visible. All nine chapter choices were available. This is a production continuity check, not a new relevance benchmark. The verified public textbook tab was left visible for review. Later deployment-scoped logs showed expected 503 responses only at the disabled `/api/learning/local-recognition` and `/api/learning/response-review` endpoints; the working browser fallback was verified separately.

Rollback target remains the prior READY deployment `dpl_2wrnm9gwAzuDW27gvGAkxvPna3cU`. The first oversized candidate is retained as failed deployment evidence and is not a rollback target. No pending shared database migration was applied and no experimental adapter was enabled.

Automatic approval review rejected two separate actions. Production credential download was abandoned in favor of public metadata and existing deployment configuration. Applying the recognition database guard was blocked because its persistent trigger can reject writes. Specific user approval is pending for that guard and the experiment usage-receipt migration. No substitute path may apply those database changes before approval. The accounting Edge Function must wait for its database migration. Browser draft recognition does not depend on those migrations.

## Acceptance still requiring external evidence

- Real educators must review and publish curriculum/rubric versions and supply relevance, answerability and teaching-action judgments.
- Complete curricula require scoped standards, sequenced coverage and enough original or authorized learning material; the current selected modules do not establish that breadth.
- Representative handwriting/speech samples and device testing must establish practical accuracy and supported hardware limits.
- A deployable fine-tuned tutor must pass independent comparisons without answerability or safety regressions.
- Learning improvements require consented learner studies and delayed, independent tasks.
- No patentability, exclusivity or defensible market advantage is established by implementation alone. The original evidence-to-action method is documented separately in `docs/architecture/diana-teaching-method.md`.
