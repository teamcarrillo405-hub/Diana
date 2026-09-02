# Beta External Evidence

This tooling prepares and validates release evidence that Diana cannot produce
inside a local automated run. It covers physical iOS, Android, and Chromebook
checks; a disposable database restore; operational alert owners and an incident
drill; an authenticated staging browser run; deployed managed-voice disablement;
and the 72-hour staging soak.

It does not perform those activities, create timestamps, sign receipts, add
trusted keys, or approve a release.

## Templates

Generate an intentionally incomplete, deterministic template:

```powershell
npx tsx scripts/beta/external-evidence.ts template --kind=ios-device --run-id=<run-id> --sha=<release-sha> --url=<preview-origin>
```

Every observation field is `null`. The external operator or approved automation
must replace those values with observations from the named release. The
template is not valid evidence and cannot pass the gate.

Supported types are:

- `ios-device`
- `android-device`
- `chromebook-device`
- `database-restore`
- `alerts-ready`, which includes fixed alert owners and an incident drill
- `authenticated-browser`
- `managed-voice-disabled`
- `soak-72h`

## Signed Validation

The validator reads only the fixed certification input directory:

```text
artifacts/beta-gate-inputs/<run-id>/
```

It does not accept an arbitrary evidence path. The evidence JSON must be the
file referenced by the existing signed `diana-beta-certification` receipt.
The receipt must be signed by an Ed25519 key trusted for that exact
certification purpose in `config/beta-attestation-public-keys.json`.

Validate one type:

```powershell
npx tsx scripts/beta/external-evidence.ts validate --kind=authenticated-browser --run-id=<run-id> --sha=<release-sha> --url=<preview-origin>
```

Validate every type:

```powershell
npx tsx scripts/beta/external-evidence.ts validate-all --run-id=<run-id> --sha=<release-sha> --url=<preview-origin>
```

Validation fails closed when the receipt, signature, trusted key, evidence
digest, explicit timestamps, required checks, source SHA, or preview origin is
absent or different. The soak duration is calculated from its recorded start
and end timestamps; the tool never supplies or infers those observations.

Every passing check uses a concrete, content-addressed evidence ID in the form
`<check-id>:sha256:<artifact-sha256>`. The prefix must exactly match that check,
so a generic or cross-check ID is rejected. Evidence IDs and artifact digests
must both be unique across the complete evidence document. One artifact cannot
be reused to satisfy multiple checks or soak checkpoints.

Freshness is evaluated against the validator's current time. The top-level
observation and every nested start, completion, acknowledgement, resolution,
inspection, session-destruction, and soak-checkpoint timestamp must be no more
than seven days old and no more than five minutes in the future. A fresh wrapper
cannot make stale nested observations pass.

The key registry is accepted only through the fixed
`config/beta-attestation-trust-root.json` committed with the release. The root
pins the fixed registry path and digest; validation does not accept a
caller-selected registry path or digest.

This validator does not replace the independent human approvals described in
`docs/launch/HUMAN_SIGNOFF.md`.
