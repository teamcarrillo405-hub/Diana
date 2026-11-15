# Local speech execution evidence

September 29 follow-up: the [public recognition baseline](public-recognition-baseline.md) adds eight fixed human-read LibriSpeech clips (80.19 seconds, eight speakers) using these same installed weights. All eight completed; normalized WER was 7/229 words. Raw scores, source rights, fixed selection and prior launcher failures are retained. This is not student validation. The synthetic execution below is historical.

On September 26, 2026, Diana executed its existing offline speech adapter with real Whisper small weights on three original synthetic recordings. All three transcripts exactly matched the authored text. These are engineering smoke observations, with zero student cases and zero human-reviewed cases. They establish that the local runner can load a pinned snapshot, transcribe supported audio, and return an unconfirmed draft. They do not measure student speech accuracy or educational benefit.

The application recognition route and database were not enabled or changed. The private research manifest identifies `Codex engineering research` under the user's autonomous research instruction, explicitly excludes educator or production approval, and expires after one day. Its `enabled` field permits only this explicit command invocation; no application environment references it.

## Model and runtime

The [official Systran snapshot](https://huggingface.co/Systran/faster-whisper-small/tree/536b0662742c02347bc0e980a01041f333bce120) is the CTranslate2 conversion of OpenAI Whisper small. The publisher identifies the model as MIT licensed. [Official faster-whisper usage](https://github.com/SYSTRAN/faster-whisper) supports CPU execution with `compute_type="int8"`.

| Property | Executed value |
| --- | --- |
| Model | `Systran/faster-whisper-small` |
| Publisher revision | `536b0662742c02347bc0e980a01041f333bce120` |
| Weight SHA-256 | `3e305921506d8872816023e4c273e75d2419fb89b24da97b4fe7bce14170d671` |
| Weight bytes | 483,546,902 |
| Complete file-map SHA-256 | `bfc82ad305e4477e2875c71540278fbeca6876db2c17a07904b47d844ce12205` |
| Python | 3.12.14, isolated venv under ignored research artifacts |
| Core packages | faster-whisper 1.2.1, CTranslate2 4.8.2, PyAV 18.1.0, NumPy 2.5.3, tokenizers 0.23.2 |
| Execution | CPU, int8, two threads, beam size 5, previous-text conditioning off |
| Input | 16 kHz, mono, PCM16 WAV, Windows local David/Zira TTS |
| Output | Draft, `confirmedHash: null`, confidence unknown |

Every downloaded file was checked against the immutable publisher metadata: SHA-256 for the LFS weight and Git blob hashes for the remaining files. Every runtime file also has a SHA-256 in the manifest. The unchanged Python adapter rechecks the complete snapshot before and after each inference. Dependency versions are frozen in `requirements.lock.txt`; `pip check` passed. This lock records versions, not a verified wheel-hash supply chain.

## Observations

| Case | Local voice | Exact transcript | Adapter elapsed time |
| --- | --- | --- | --- |
| Biology sentence | Microsoft Zira Desktop | Yes | 33,735 ms |
| Reading sentence | Microsoft David Desktop | Yes | 3,390 ms |
| Science comparison sentence | Microsoft Zira Desktop | Yes | 3,953 ms |

Raw and case/punctuation-normalized word error rates were zero for these three short, clean synthetic utterances. The first invocation included cold runtime loading. Each invocation was a separate process. These timings include imports/model loading and inference inside the adapter timer, but exclude its first model hash verification and parent startup. They are not a latency benchmark or a representative accuracy estimate.

Inference used the existing `scripts/learning/recognize-local.ts` and `recognize_local.py`, with offline flags, `local_files_only=True`, and Python socket denial. Package/model downloads occurred in a separate preparation step. Native-library and OS-level network isolation was not measured; the `networkUsed: false` field is the adapter contract, not packet-capture evidence. No paid or hosted inference API was used.

`evaluate-local-recognition.ts` deliberately requires independently human-reviewed held-out cases. It was not used for these synthetic recordings because no such reviews exist. The smoke reporter does not fabricate reviewers, student data, training eligibility or production readiness.

The smoke reporter checks the canonical model file-map hash and requires matching model identity, revision, speech kind, source hash and raw transcript in the draft. It rejects confirmed drafts, changed transcripts, non-null confidence and outputs claiming network use. Four isolated report-contract tests exercise these checks and preservation of an existing report without running inference.

## Private artifacts and reproduction

Artifacts are in `artifacts/learning-engine/research/local-speech-execution/`, which is ignored by Git and outside `public/`:

- `publisher-metadata.json`, `model/`, and `synthetic-research-manifest.json`: immutable publisher metadata, verified snapshot, and expiring research manifest.
- `runtime.json` and `requirements.lock.txt`: executed environment and exact installed versions.
- `synthetic-cases.json`, three WAVs, and three `*-draft.json` files: original TTS text, generated audio and actual adapter results.
- `synthetic-smoke-report.json`: transcripts, source hashes, timings, word error rates and explicit smoke-only limits.
- `trocr-publisher-metadata.json`: read-only handwriting candidate inspection.

`scripts/learning/prepare-local-speech-smoke.py prepare <private-folder>` prepares the pinned snapshot using saved official publisher metadata. It writes new output files and deliberately does not overwrite an existing manifest or report. Audio was synthesized locally using `System.Speech.Synthesis.SpeechSynthesizer`, `Microsoft David Desktop` or `Microsoft Zira Desktop`, and `SpeechAudioFormatInfo(16000, Sixteen, Mono)`.

Set `DIANA_RECOGNITION_PYTHON` only in the command process to the isolated venv Python, then invoke the existing CLI for each synthetic WAV:

```text
npx tsx scripts/learning/recognize-local.ts <private-manifest> <synthetic.wav> audio/wav <new-draft.json>
python scripts/learning/prepare-local-speech-smoke.py report <private-folder>
```

The recognition script enforces the existing two-minute process deadline. Each explicit invocation is research only. A new experiment needs a freshly prepared, unexpired manifest. Do not wire this research manifest into the student-facing route.

## Handwriting candidate inspection

The [official Microsoft TrOCR snapshot](https://huggingface.co/microsoft/trocr-base-handwritten/tree/eaacaf452b06415df8f10bb6fad3a4c11e609406) offers `model.safetensors`, so the adapter's safetensors-only requirement is feasible. At revision `eaacaf452b06415df8f10bb6fad3a4c11e609406`, that file is 1,333,384,464 bytes with SHA-256 `25a40cddc7e6120140a3d5b9e3dd3878a92ada7b4f312953ab22edc19c2a5acc`. This speech task inspected metadata; the subsequent [local handwriting execution](local-handwriting-execution.md) downloaded and executed the pinned model on one original font-rendered line. The model is scoped to cropped handwritten prose lines, with no claim for full pages, diagrams or mathematical notation.

## Remaining evidence

Real recognition qualification still needs permissioned student recordings, verified human transcripts, accent/age/noise/device coverage, error analysis, realistic latency and memory measurements, OS network isolation, and review of how tentative text is corrected before saving. A small synthetic success does not satisfy these gates.
