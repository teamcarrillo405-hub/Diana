# Local handwriting execution evidence

September 29 follow-up: the [public recognition baseline](public-recognition-baseline.md) adds eight actual human-written GNHK crops from four public photos using these same installed weights. All eight completed after a Windows environment fix, but normalized WER was 17/32 words. Substantial recognition and crop/layout errors remain; no automatic acceptance or student qualification follows. Source permission, fixed samples and prior failures are retained. The synthetic execution below is historical.

On September 26, 2026, the existing Diana TypeScript recognition runner and Python adapter performed one real CPU inference using `microsoft/trocr-base-handwritten`. The input was an original synthetic line rendered locally with the installed Segoe Print font. This proves the downloaded model can execute through Diana's offline adapter on this machine. It does not measure recognition quality on human handwriting.

## Actual result

| Field | Observed value |
| --- | --- |
| Expected original sentence | `The plant grows toward the light.` |
| Raw model text | `The plant grows toward the light .` |
| Exact match | No; one extra space before the period |
| Character edits / reference length | 1 / 33, raw CER 0.030303030303030304 |
| Whitespace word edits / reference words | 2 / 6, raw WER 0.3333333333333333 |
| Adapter elapsed time | 11,639 ms, including model load and final model-file rehash; excluding initial manifest hash and parent launch |
| Device | CPU, two PyTorch threads |
| Confirmation and confidence | Unconfirmed draft; confidence `null` |
| App activation | No environment flags, database keys or production settings changed |

The punctuation difference is preserved in the artifact. No normalization was used to claim an exact match. Single-sample font-rendered CER/WER are diagnostics for this synthetic input only. They do not establish student accuracy, fairness, reliability, math notation, page layout or classroom suitability.

## Model and runtime provenance

The [pinned publisher model card](https://huggingface.co/microsoft/trocr-base-handwritten/blob/eaacaf452b06415df8f10bb6fad3a4c11e609406/README.md) identifies single-line OCR and MIT licensing. The [publisher metadata](https://huggingface.co/api/models/microsoft/trocr-base-handwritten/revision/eaacaf452b06415df8f10bb6fad3a4c11e609406?blobs=true) was independently read before download. The model revision is `eaacaf452b06415df8f10bb6fad3a4c11e609406`.

- Safetensors file: 1,333,384,464 bytes; SHA256 `25a40cddc7e6120140a3d5b9e3dd3878a92ada7b4f312953ab22edc19c2a5acc` matched the publisher's LFS metadata.
- Full flat manifest: nine files, SHA256 `8d2e4bdd62252baf309cf4a57b7fc194a3c90b4ddd0fcdc942b2ab1b6ca77476`. All actual file bytes were pinned and rehashed before and after inference by the existing adapter.
- Synthetic PNG: SHA256 `94da2b9e18c4824f4682510a6574bfd6c734ac56b4e10e5f13b1822c56dfc51a`; 720 by 78 pixels. Font bytes are hashed in `input-provenance.json` and are not copied or distributed.
- Existing runtime reused without dependency installation: `C:\Python314\python.exe`, Python 3.14.4, PyTorch 2.12.0+cpu, Transformers 5.2.0, Pillow 11.3.0, safetensors 0.5.3, tokenizers 0.22.2.

The private manifest's `approvedBy` explicitly says `Codex engineering research agent, not human educator`. It records the user's autonomous research instruction as the authorization reference and expires after two days. This is a local synthetic research manifest, not an invented educator credential, human review, production approval or student model enablement.

The files reside in the ignored, non-public directory `artifacts/learning-engine/research/local-handwriting-execution/`: `research-manifest.json`, `input-provenance.json`, `synthetic-line.png`, `draft.json`, `smoke-report.json`, and the `trocr-base-handwritten/` snapshot. The report includes hashes and exact runtime versions. It is intentionally separate from `evaluate-local-recognition.ts`, whose representative case protocol requires real reviewers and permission records.

## Reproduction

The preparation script pins the official revision, checks declared file sizes, verifies the publisher's safetensors SHA-256 and all eight ordinary Git blob hashes, creates the complete model manifest, and renders an original sentence. Both newly downloaded and previously present files must pass publisher verification before a manifest is written. Downloading requires an explicit flag:

```powershell
C:\Python314\python.exe scripts/learning/prepare-local-handwriting-smoke.py --download
$env:DIANA_RECOGNITION_PYTHON = 'C:\Python314\python.exe'
node --conditions=react-server --import=tsx scripts/learning/recognize-local.ts artifacts/learning-engine/research/local-handwriting-execution/research-manifest.json artifacts/learning-engine/research/local-handwriting-execution/synthetic-line.png image/png artifacts/learning-engine/research/local-handwriting-execution/draft-new.json
```

Use a new draft output path because the runner refuses overwrite. For the recorded first execution, the output was `draft.json`; `prepare-local-handwriting-smoke.py --summarize` verified that artifact against its input, manifest and files and wrote a new `smoke-report.json`. That report is also protected from overwrite. Preparing again renews the two-day manifest, so retain the original report and manifest together if preserving a prior run.

Only the download step needed internet. Inference used the unchanged `recognize-local.ts` and `recognize_local.py`, local model paths, safetensors-only loading, offline environment flags and Python socket denial. The network field is the adapter's contract plus its code boundary; no independent operating-system network trace was collected. The initial sandbox blocked Node child creation with `spawn EPERM`; the same exact bounded inference command was approved for escalation and then succeeded. No paid model API was called.

Next evidence requires permissioned human handwriting from the intended ages and devices, two actual reviewers, critical symbol/error checks, and operational memory/device measurements. The synthetic smoke does not satisfy those gates.
