# Public recognition baseline, September 29, 2026

This is a bounded engineering baseline using existing pinned weights and public human-created source data. It is separate from the independently reviewed student evaluation protocol. No student or educator review, production activation, training, or calibrated confidence is claimed.

## Sources and fixed selection

| Modality | Source and permission | Fixed coverage |
| --- | --- | --- |
| Speech | [OpenSLR LibriSpeech](https://www.openslr.org/12), CC BY 4.0; [OpenSLR dataset mirror](https://huggingface.co/datasets/openslr/librispeech_asr) revision `71cacbfb7e2354c4226d01e70d77d5fca3d04ba1` | Four predetermined approximately evenly spaced rows from `test.clean` and four from `test.other`: eight speakers, 80.19 seconds total. |
| Handwriting | [Goodnotes GNHK publisher and terms](https://github.com/GoodNotes/GNHK-dataset), [CC BY 4.0 license](https://github.com/GoodNotes/GNHK-dataset/blob/main/LICENSE); pinned [public mirror](https://huggingface.co/datasets/staghado/GNHK-Dataset/tree/eaa67d396fd29b8b04e38d630da79f67db11b212) | First lexicographic test document per AF, AS, EU, NA region, then its first two eligible handwritten line groups: eight crops from four photos. |

Attribution: LibriSpeech, Vassil Panayotov, Guoguo Chen, Daniel Povey and Sanjeev Khudanpur, 2015. GNHK: A Dataset for English Handwriting in the Wild, Alex W. C. Lee, Jonathan Chung and Marco Lee, ICDAR 2021. These datasets are reused under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Source text and licenses are retained beside the artifacts. No endorsement is implied.

The GNHK publisher download URL currently redirects to its homepage. The acquired mirror's revision, exact downloaded range, nested test ZIP SHA256 and CRC, individual JPEG/annotation bytes, and crops are pinned. No publisher binary checksum was recovered, so this is **mirror provenance**, not an independently authenticated publisher snapshot. The downloaded range was 286,039,446 bytes; the full 1 GB outer archive and its training portion were not downloaded. The extracted test ZIP SHA256 is `6f3d65d91535d1665050afd83a9f3831394d80accfae88c5b91bbb990781eacb`.

IAM, Bentham, and other gated or noncommercial-only sources were not used. No recognition weights were acquired or changed.

## Preparation and audit trail

Private artifact root: `artifacts/learning-engine/research/public-recognition-baseline-20260929/`. It is outside `public/` and ignored by Git.

1. The initial protocol fixed speech row indices and handwriting documents before acquisition or inference. Its original file remains intact.
2. Before inference, annotation inspection found printed (`P`) entries among handwriting (`H`) entries and words stored out of reading order. Protocol v2 restricted eligibility to handwritten groups and ordered words spatially.
3. Before inference, image QA found EXIF orientation 3 on the NA photo. Protocol v3 applies EXIF orientation before the deterministic crop. The old preparation remains saved. Documents, speech rows, model weights, and inference settings were unchanged.
4. Final `acquired-v1/sample-manifest-v3.json` SHA256: `7078d0b2a9c091fa617861f825120a580ac80a8caa89d8c21506544dd5eae9b6`. Final protocol SHA256: `716e208401b9a4a3513f4665d66b8fcddf5fa36e96f351c05733bd83fa74dbd0`. These hashes were frozen before any recognition outcome.
5. FLAC was decoded without resampling to 16 kHz mono PCM16 WAV. Handwriting uses axis-aligned word-polygon unions with two pixels of padding and native EXIF orientation. No deskew, sharpening, synthetic fonts, transcript edits, or outcome-based sample replacement was used.

Eight speech source/converted hashes, four original photos and annotations, eight crop hashes, exact references, licenses, source URLs and revisions are retained. The signed public audio download URLs are represented by their stable revision-bound paths, without temporary signatures.

The two expiring research manifests reuse every file hash of the installed Whisper/TrOCR snapshots. Their authorization is the current user request to complete outstanding recognition evidence. They do not invent human signatures, consent, educator credentials, or student-facing enablement. Historical manifests remain untouched.

## Execution and scoring

All 16 fixed cases run sequentially through the existing `recognize-local.ts` / `recognize_local.py` adapter. Speech remains CPU/int8, two threads, beam 5. TrOCR remains CPU, two threads, safetensors-only, greedy generation with 256-token cap. The existing adapter enforces a 120-second child deadline, hashes all model files before and after inference, and releases only unconfirmed drafts with unknown confidence.

Raw CER uses Unicode code-point edit distance; raw WER uses whitespace-separated token edit distance, preserving case and punctuation. A separately reported, predetermined normalization uses NFKC, casefolding, punctuation-to-space and whitespace collapse. Micro error counts and exact denominators are preserved. Failed/unavailable cases count as empty hypotheses in all-case scores; successful-only scores and failure counts are also explicit. Cross-modality totals are bookkeeping, not a recognition quality ranking.

`run-001` retains 16 launcher failures. A no-model child-process probe reproduced sandbox `spawn EPERM`; no inference occurred in that attempt. `run-002` ran all 16 cases with child-process permission: eight speech successes and eight TrOCR runtime failures. A separate diagnostic showed Torch's cache setup calling Windows `getpass.getuser()` after the child environment had stripped `USERNAME`. The minimal adapter fix preserves this OS identity field while retaining the credential allowlist. The diagnostic did not produce a transcript.

`run-003` is the complete same-denominator rerun after that launcher fix. Prior attempts and their failure scores remain intact. No best-of-run selection or inference parameter tuning was performed. Results are recorded in `run-003/report.json`; the final verification receipt binds the report and implementation hashes.

| Modality | Completed / fixed cases | Raw CER / WER | Normalized CER / WER | Normalized error counts |
| --- | --- | --- | --- | --- |
| Speech | 8 / 8 | 83.52% / 99.56% | 1.87% / 3.06% | 23 / 1,232 characters; 7 / 229 words |
| Handwriting | 8 / 8 | 52.63% / 78.13% | 40.40% / 53.13% | 61 / 151 characters; 17 / 32 words |

There were zero runtime failures in run-003; completion does not mean accurate recognition. LibriSpeech references are uppercase and omit spoken punctuation, explaining much of the large raw/normalized difference. The normalized speech WER was 1/124 words in the four `clean` clips and 6/105 words in the four `other` clips. No population confidence interval or fairness conclusion is justified by these counts.

TrOCR omitted vertical letters, changed short cursive words, and produced repeated unrelated wording for the slanted crop containing neighboring ink. Those outputs remain unedited. This baseline provides concrete evidence that the current uncorrected handwriting output is unsuitable for automatic acceptance. It does not isolate model error from crop/layout and reference ambiguity. Student checking and manual entry remain necessary.

Observed parent wall times were 3.728–4.852 seconds per speech clip and 12.214–15.869 seconds per handwriting crop on this Windows CPU host. These are eight observations per modality, including process startup, model load and integrity checks. Report SHA256: `41be4af52916248796230797302efe59c1157b90b0b870935174ac646d869436`.

The runtime uses local-files-only loading, offline environment flags and Python socket denial. `networkUsed: false` is the adapter contract; no independent OS packet capture was performed. No hosted/paid model calls were made. The research manifests were not wired into the app.

## Post-baseline input correction, with no accuracy retest

Inspection of all eight OCR outputs identified three normalized-exact crops, one ambiguous short letter substitution, one vertical letter group with omissions, one slanted line whose rectangular crop included adjacent lines, and two cursive-word errors. The eight raw results and their original scores remain frozen. No samples were removed or relabeled to raise the score.

The general local adapter now honors PNG/JPEG EXIF display orientation before passing pixels to TrOCR. It conservatively rejects images that are square or taller than wide after orientation, returning the fixed `recognition_unsupported_layout` process/CLI code with manual entry available. Unrelated exceptions remain generic; no traces or private paths cross the process boundary. The existing local HTTP route still presents its neutral manual-entry fallback. This is a shape boundary, **not multiline detection**: wide photos can still contain several lines. A tightly cropped single narrow character may also be rejected.

A no-inference check of the same eight frozen crop assets found seven supported shapes with byte-identical RGB pixels and one rejected vertical group (`eng_AS_007-line-1`). That is a compatibility check, not a new seven-case accuracy score. EXIF correction changes incorrectly oriented camera inputs; these eight final baseline PNGs had already been oriented during preparation, so no accuracy improvement is claimed. Opaque-color fixtures test horizontal pixel preservation, EXIF rotation/180-degree handling, portrait/square rejection, container/pixel bounds, and safe error mapping.

The current single-line model still has substantial errors on cursive and neighboring-ink inputs. Fixing those generally would require validated line localization/rectification or better recognition evidence. Ground-truth polygons were not added to the runtime as an evaluation-only shortcut. No different model is justified or required for this bounded input-boundary repair; there was no new model selection, download, training or activation.

`input-boundary-check.json` and `verification-v2.json` bind this later adapter change separately from the unchanged run-003 report. The original `verification.json` remains the baseline receipt. Final checks: 18 Python contract tests, eight TypeScript tests across two files, scoped ESLint and full nonincremental typecheck. Recognition changes are local tooling and are not part of the curriculum/retrieval web publication candidate.

## Reproduce without downloading weights

The acquisition script only reads public metadata/sample files. The preparation script verifies the existing installed model bytes and writes new expiring research manifests. Both require new output files and preserve prior evidence. Do not renew an old manifest in place or run an expired one. A new experiment requires a newly authorized, separately stored preparation.

```powershell
C:\Python314\python.exe scripts/learning/test_public_recognition_baseline.py
node node_modules/vitest/vitest.mjs run lib/learning-engine/local-recognition-runner.test.ts lib/learning-engine/recognition.test.ts
C:\Python314\python.exe scripts/learning/public-recognition-baseline.py <absolute-sample-manifest> <expected-SHA256> <new-output-directory>
```

The runner requires the manifest hash, verifies source and model-manifest bindings, refuses an existing output directory, journals every attempt, and retains failures. Child-process permission may be necessary in the Codex sandbox. It is separate from `evaluate-local-recognition.ts`, which still requires two genuine reviewers and permission records.

## What remains unmeasured

- Eight audiobook readers are not a student speech sample. Ages, accents, disabilities and microphone models are not verified. There are zero consented student cases, zero verified child-speech cases and zero live microphone captures. `clean`/`other` are publisher partitions, not measured noise levels or a controlled noise experiment.
- Two crops per region come from one photo per region. Writer identity, age and device metadata are unverified; region codes are not demographic validation. One selected group consists of vertically stacked letters. Several axis-aligned crops include neighboring ink because their source lines slope. Those difficult inputs remain in the fixed denominator, so their errors include preprocessing limitations.
- This does not test full-page layout, diagrams, mathematics, critical-symbol accuracy, offline browser models, mobile memory/latency, OS network isolation, or student correction usability. Desktop per-case timing includes startup/model loading and hashing, not a warmed production service.
- Public benchmark overlap with pretrained weights is unknown. These are not newly collected, contamination-free held-out student samples. Dataset labels were not independently adjudicated by two human reviewers.

To qualify intended use, acquire consented recordings/handwriting spanning the actual student ages, accents, accessibility needs, devices and environments; bind source permission and split membership; obtain two independent human transcripts; freeze thresholds and samples before inference; run the existing reviewed evaluator; and review critical errors and correction UX. No permission is missing for this recorded CC BY public baseline. Student data collection and genuine reviewer participation remain separate unmet requirements.
