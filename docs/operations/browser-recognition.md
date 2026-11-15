# Browser speech and handwriting recognition

## Supported path

The course practice response field supports on-device English speech transcription and recognition of a single cropped line of handwritten prose. It uses a dedicated browser worker and WebAssembly. Vercel serves the runtime files; it does not run Python or receive the student's source media. The existing optional localhost recognition route remains separate.

Students explicitly select **Download for offline use** before any model download. A compatible secure browser needs Web Workers, WebAssembly, CacheStorage and Web Crypto. Devices reporting less than 4 GB of memory use manual entry. Speech currently accepts 16 kHz, mono, PCM16 WAV up to two minutes and 5 MB. Handwriting accepts PNG/JPEG up to 5 MB, 4 million pixels, 8192 pixels wide and 4096 pixels high. Both header dimensions and decoded dimensions are checked. Equations, diagrams, whole pages and other languages require manual entry.

Offline means recognition in an already-open practice page after its model and runtime have downloaded. It does not mean offline authentication, opening uncached app pages or saving to the server. Browser storage eviction can require downloading again. The existing service worker caches only the public recognition runtime in addition to its existing public assets; this change does not cache authenticated pages or APIs.

## Pinned assets and provenance

| Use | Model and immutable revision | Model download |
| --- | --- | --- |
| Speech | `Xenova/whisper-tiny.en` at `79fb389fc764e7c395bd330e9531d9d32ada7049` | 44,500,564 bytes |
| Handwritten prose line | `Xenova/trocr-small-handwritten` at `2432e24d184b1d964d07ed04f5d9e21d31a59141` | 69,467,490 bytes |

These are ONNX conversions published by the Transformers.js maintainer. The underlying models are OpenAI Whisper and Microsoft TrOCR. TrOCR is a handwritten-line recognizer, not a relabeled printed OCR tool. The upstream [Whisper repository](https://github.com/openai/whisper) and [Microsoft UniLM repository](https://github.com/microsoft/unilm/blob/master/LICENSE) publish MIT licenses; conversion model cards are [Whisper](https://huggingface.co/Xenova/whisper-tiny.en) and [TrOCR](https://huggingface.co/Xenova/trocr-small-handwritten). The [upstream TrOCR model card](https://huggingface.co/microsoft/trocr-small-handwritten) describes its handwritten-line scope.

`browser-recognition-models.ts` records per-file byte counts and SHA-256 hashes. Small files were checked against publisher Git blob identifiers; ONNX files use publisher LFS SHA-256 metadata. Preparation checks every cached/downloaded file before inference. Unknown file names, wrong hashes, truncated and oversized bodies are rejected. Model weights remain outside the deployment package and are downloaded into the browser's dedicated model cache only after consent. Student media is never written to that cache.

The exact dependency is `@huggingface/transformers@3.8.1`, with the transitive ONNX runtime pinned by `package-lock.json`. `npm run recognition:assets` bundles same-origin worker code and copies runtime WASM; both `postinstall` and `build` execute it. `public/vendor/diana-recognition/runtime-manifest.json` records generated runtime hashes. The full shipped runtime directory is approximately 33.67 MB. Chromium's verified path downloads `worker.js`, `ort-wasm-simd-threaded.jsep.mjs` and `ort-wasm-simd-threaded.jsep.wasm`, approximately 22.52 MB. UI conservatively discloses up to 34 MB plus the selected model.

## Privacy and trust boundaries

- Initial model acquisition uses public Hugging Face GET requests with omitted credentials and referrers. The CSP allows the precise observed CDN redirect origin, `https://us.aws.cdn.hf.co`, alongside Hugging Face's supported download origins. No third-party JavaScript origin is allowed.
- After preparation, the worker permits fetch only for four exact same-origin runtime files. Missing optional model files return a local 404; inference cannot fall back to a hosted API or a network model lookup.
- One worker executes at a time, with one WASM thread. Preparation has a ten-minute deadline, inference a two-minute deadline, and individual download requests a two-minute deadline. Cancellation, component removal, context changes, manual response edits and parent busy transitions invalidate old results and terminate the worker.
- Browser output carries `browser_draft_unverified` and `confirmed: false`. It passes no server HMAC proof to the practice response. The student reviews and explicitly confirms the transcription; the server uses the existing student-entered provenance path. Browser model claims never become trusted machine evidence.
- Manual entry remains available when download, storage, device capability or recognition is unavailable. Removing a downloaded model deletes that model's cache entries; the public runtime may remain cached.

## Verification

Run the focused component, worker lifecycle, file validation, cache integrity, service worker and CSP tests, then `npm run recognition:assets`. The real-browser harness is:

```powershell
node scripts/learning/browser-recognition-smoke.mjs
```

It uses original local fixtures from the earlier Python engineering smoke. It downloads the pinned models, registers the actual service worker, disables browser networking, starts fresh workers and executes both real models. It never calls a paid provider or mutates a database.

Evidence: `artifacts/learning-engine/research/browser-recognition/smoke-1790444454959.json`, generated on 2026-09-26 with Chromium 148.0.7778.96 and the exact built worker under a production-equivalent worker CSP:

| Case | Result | Offline execution |
| --- | --- | --- |
| Original Windows TTS WAV | “The plant needs sunlight and water to grow.” | 1,783 ms |
| Original font-rendered line | “The plant grows toward the light.” | 1,227 ms |

Both matched their original synthetic transcripts. All observed requests were GETs; inference ran with browser networking disabled and runtime requests served from the service worker cache. This verifies real execution, lifecycle and cached offline reuse. It is **not** evidence of real student handwriting accuracy, dialect/noise robustness or educational benefit. Student cases: 0. Human-reviewed cases: 0. Real-device and representative student evaluation remain separate evidence requirements. Deployment verification is recorded by the release owner.
