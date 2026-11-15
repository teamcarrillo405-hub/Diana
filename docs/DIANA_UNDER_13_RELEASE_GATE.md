# Diana Under-13 and Teen Permission Release Gate

Audit date: 2026-09-01

Status: **Under-13 release blocked. Age 13+ beta only.**

This is an engineering audit and release gate, not legal advice. It does not approve Diana for children under 13 or establish that the current teen attestation satisfies every contract or law.

## Current Boundary

- Under-13 signup remains rejected by the profile and signup database triggers.
- Signup parses an exact calendar date and stays closed through the day before the 13th birthday.
- Shared Edge AI authorization rejects under-13, missing, and unknown age brackets before checking AI consent.
- Every guardian foundation state still returns blocked account access and blocked direct AI access.
- The guardian migration remains deny-by-default with forced RLS and no browser write path.
- No real guardian, child, provider, school, or OpenAI account was used in this audit.
- The new lifecycle evidence is synthetic contract validation only. It does not provision an account or call a provider.

## Audit Result

| Beta-plan control | Current evidence | Release status |
|---|---|---|
| Guardian links | `guardian_account_requests` is a disabled storage skeleton. `SyntheticGuardianLinkContract` validates matching guardian, child, verification session, suspension, withdrawal, and hard access denials. | Foundation only. No guardian link product flow or server workflow exists. |
| Verification sessions | Synthetic contract covers provider reference digest, webhook event digest, method, expiry, result, and `identityEvidenceStored: false`. | Contract only. No selected VPC provider, signed webhook, replay store, or verification-session table exists. |
| Versioned consent scopes | Every consent scope has an explicit code-owned version and a separate deny-by-default interface. SQL stores the scope contract version and exact scope-version map. | Foundation only. No enabled consent workflow exists. |
| Withdrawal and suspension | Guardian account and consent contracts model suspended, revoked, and withdrawn states. A synthetic withdrawal receipt binds guardian, child, link, consent, current scope versions, timestamps, digest-only evidence, and blocked account/AI outcomes. | Contract only. No guardian withdrawal product or server workflow exists. |
| Guardian export receipts | Synthetic receipt must cover every registered entry, contain a digest, and embed no raw child data. | Contract only. No parent export workflow or receipt persistence exists. |
| Deletion receipts | Synthetic receipt must cover every registered entry and reference every processor cleanup receipt. | Contract only. No guardian deletion orchestrator or receipt persistence exists. |
| Processor cleanup | Code-owned processor bindings require cleanup evidence for Supabase, OpenAI, VPC, and school integrations where applicable. Synthetic drills fail on a missing or incomplete receipt. | Blocked. Provider cleanup APIs, retention attestations, contracts, and operational owners are not approved. |
| CI fail-closed registration | `npm run guardian:gate` is an explicit CI step. It discovers implemented guardian/child-data storage from the migration chain, requires exact registry registration, validates all guardian states and scope interfaces, and proves the current release decision remains blocked. | Implemented for the disabled foundation. It is not a legal or launch-completeness determination. |
| Disposable database boundary | The full-migration CI job runs `guardian-under-13-boundary.ps1` against its disposable Supabase database. It exercises under-13 signup rejection, teen signup permission rejection, direct profile mutation rejection, hard-false guardian config, SQL registry coverage, state constraints, consent-scope storage, and table privileges. | CI-enforced. A release still needs a release-bound passing receipt. |
| Under-13 activation gate | `evaluateUnder13ReleaseGate()` requires signup, database, AI, registry, processor, export, withdrawal, and deletion evidence plus current legal, privacy, provider, penetration, and deletion receipts bound to one release SHA. | Always returns disabled access. A complete evidence set can only advance to a separate activation-code review. |

## Code-Owned Registry

`lib/guardian/child-data-registry.ts` now registers:

- Eight feature surfaces: account request, learning records, AI assistance, file uploads, voice input, saved audio, wellness, and school integrations.
- Nine operational surfaces: guardian links, verification sessions, consent records, consent audit events, export receipts, withdrawal receipts, deletion receipts, processor cleanup receipts, and teen permission records.
- Purpose, current consent-scope version, processor, cleanup rule, retention rule, export rule, deletion rule, implementation status, and actual storage targets where they exist.

The registry is structurally complete for the disabled foundation, but it is not an under-13 launch inventory. `contract_only` entries intentionally have no storage target. Feature entries remain `collection_blocked`, and every referenced processor remains unapproved for under-13 use. Rule keys identify required ownership boundaries; they are not approved retention periods or legal conclusions.

Any new `guardian_*` or `child_data_*` table in a guardian migration fails the focused CI contract until it is registered or explicitly classified as non-child governance data.

## Age 13 Through 17 Controls

Current implemented controls:

1. Teen signup requires the `teen_openai_beta_v1` permission statement and a recognized source.
2. The database records the attestation time, policy version, source, and withdrawal time.
3. Existing teen AI consent is disabled when the migration is applied instead of being backfilled.
4. Shared Edge authentication rejects missing, stale, future-dated, or withdrawn permission before AI use.
5. Shared Edge authentication rejects an absent or unknown age bracket instead of treating it as an adult.
6. AI consent remains separate from guardian permission.

Current beta blockers:

1. The signup record is the teen's attestation that permission exists. It is not a guardian-authenticated act. Counsel and OpenAI must confirm whether that evidence and operating process satisfy the Services Agreement and applicable law.
2. `teenPermissionForSurface()` now defines fail-closed behavior for AI, voice input, saved audio, uploads, school integrations, and wellness, but only AI is integrated with the shared Edge eligibility boundary today.
3. Voice, saved audio, uploads, LMS import, and wellness must call a shared server-side permission gate before a teen beta can claim that withdrawal suspends all covered collection.
4. The parent or guardian withdrawal and account-deletion experience still needs product, notification, audit, and support ownership.

## Legal and Provider Blockers

These gates require qualified counsel and written provider evidence:

1. **COPPA and launch-state analysis.** The FTC requires direct notice, verifiable parental consent before covered collection, parent review and deletion rights, security, data minimization, and purpose-bound retention. Recheck the amended rule and current guidance before design approval: [FTC COPPA FAQs](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions), [FTC six-step plan](https://www.ftc.gov/business-guidance/resources/childrens-online-privacy-protection-rule-six-step-compliance-plan-your-business), and [2025 final-rule materials](https://www.ftc.gov/legal-library/browse/federal-register-notices/16-cfr-part-312-coppa-final-rule-amendments).
2. **VPC provider.** Select and contract a provider, approve the verification method, document direct notice, validate webhook signatures and replay handling, define expiry and reverification, and prove identity-document minimization. The code intentionally names only an unselected `vpc_provider` placeholder.
3. **OpenAI minor processing.** The current [OpenAI Services Agreement](https://openai.com/policies/services-agreement/) bars allowing minors to use the services without parent or guardian consent. OpenAI's [Under 18 API Guidance](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance) says personal data of children under 13 must not be processed without first implementing Zero Data Retention. Obtain eligibility and approval for the exact organization, project, model, endpoint, tools, audio path, and file behavior.
4. **Endpoint retention.** OpenAI's [API data-controls matrix](https://platform.openai.com/docs/models/default-usage-policies-by-endpoint) is endpoint-specific. Some capabilities retain application state or are not Zero Data Retention eligible. Record evidence for every endpoint and forbid an unapproved endpoint in code.
5. **Infrastructure and integration processors.** Approve DPAs and subprocessors for Supabase and every voice, LMS, email, analytics, storage, and safety provider. Verify database rows, Storage objects, backups, logs, support systems, and processor records can be exported or deleted as promised. Supabase's published [Data Processing Addendum](https://supabase.com/downloads/docs/Supabase%2BDPA%2B231211.pdf) is a starting point, not project-specific approval.
6. **Rights operations.** Assign owners and service levels for notice, review, correction, withdrawal, suspension, export, deletion, failed processor cleanup, legal holds, incidents, and guardian disputes.
7. **Independent review.** Complete penetration testing, cross-account authorization testing, migration replay, synthetic deletion drills against approved staging providers, and privacy, security, product, and legal signoff.

No receipt satisfying any of these external gates is checked into the repository, and this audit does not assert that one exists.

## Focused Automated Evidence

Run locally without external services:

```powershell
npm run guardian:gate
npx vitest run lib/age.test.ts "app/(auth)/signup/page.test.tsx" lib/security/edge-auth-policy.test.ts lib/guardian/contracts.test.ts lib/guardian/child-data-registry.test.ts lib/guardian/migration.test.ts lib/guardian/lifecycle.test.ts lib/guardian/teen-permission.test.ts lib/guardian/release-gate.test.ts
```

The focused suite covers:

- permanent under-13 account and AI denials in the disabled foundation
- current and stale consent-scope versions
- guardian link verification, suspension, and withdrawal
- verification expiry and identity-evidence minimization
- exact registry coverage for export, withdrawal, and deletion receipts
- processor cleanup receipt completeness
- synthetic-only identifiers and digest-only provider evidence
- migration-to-registry storage registration
- teen permission parity with Edge AI eligibility
- release-bound legal, privacy, provider, penetration, and deletion gate requirements

## Release Decision

The only supported claim is: **Diana is an age 13+ beta. Parent or guardian permission is required for minor AI users. Under-13 signup and direct AI access are disabled.**

Do not enable the guardian foundation or market under-13 support until every contract-only row above has an implemented, tested, provider-approved owner, every external receipt is current and independently verified, the disposable database and staging evidence are release-bound, and a separate reviewed activation change is approved. The current code contains no activation path.
