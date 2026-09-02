# Minor Privacy Release Gate

Status: code foundation only. Under-13 accounts and direct AI access remain disabled.

This document is an engineering release gate, not legal advice. Qualified privacy counsel must approve the final product flow, notices, contracts, retention schedule, and launch states before Diana serves children under 13.

## Current Beta Boundary

- The first web/PWA beta is limited to users age 13 and older.
- Diana must not collect account, upload, voice, wellness, LMS, or AI content from a user known to be under 13 before a verified guardian flow is approved and enabled.
- Users age 13 through 17 require parent or guardian permission before using OpenAI-powered features. OpenAI's current Services Agreement prohibits customers from allowing minors to use the services without that permission.
- A teen permission record is distinct from COPPA verifiable parental consent. Diana must not describe a simple teen attestation as COPPA verification.
- The guardian foundation migration is deny-by-default. Its tables and contracts do not enable child accounts, consent collection, or AI access.

## Authoritative Baseline

The engineering and legal reviews must start from current primary sources:

- [FTC COPPA compliance plan](https://www.ftc.gov/business-guidance/resources/childrens-online-privacy-protection-rule-six-step-compliance-plan-your-business): notice, verifiable parental consent before collection, parent access and deletion rights, security, retention, and deletion.
- [FTC COPPA FAQs](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions): consent methods, limited pre-consent exceptions, direct notice, and parental rights.
- [FTC 2025 COPPA final-rule announcement](https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-finalizes-changes-childrens-privacy-rule-limiting-companies-ability-monetize-kids-data): separate consent for certain third-party disclosures, data minimization, and purpose-bound retention.
- [OpenAI Services Agreement](https://cdn.openai.com/osa/openai-services-agreement.pdf): minors require parent or guardian consent.
- [OpenAI API data controls](https://platform.openai.com/docs/models/default-usage-policies-by-endpoint): endpoint-specific retention, application-state behavior, and eligibility for Zero Data Retention or Modified Abuse Monitoring.
- [Oregon Consumer Privacy Act, ORS chapter 646A](https://www.oregonlegislature.gov/bills_laws/ors/ors646a.html): child data is sensitive data, guardians may exercise child rights, and consent must be affirmative and unambiguous.
- [Oregon K-12 student-data operator requirements, ORS chapter 336](https://www.oregonlegislature.gov/bills_laws/ors/ors336.html): relevant to a future school-contracted tier, including security, deletion, disclosure, and advertising restrictions.
- [California Attorney General AADC litigation notice](https://oag.ca.gov/news/press-releases/attorney-general-bonta-appeals-age-appropriate-design-code-act-decision): enforcement status is under litigation and must be rechecked by counsel before launch.

State applicability depends on Diana's size, role, users, contracts, and launch locations. The source list is not a complete 50-state analysis.

## Required Teen Permission Gate, Ages 13 Through 17

Before a 13+ beta can include minors, Diana must:

1. Present a clear parent or guardian permission requirement during account creation.
2. Record the policy version, permission timestamp, user age bracket, and permission source without storing unnecessary identity evidence.
3. Block AI, voice, uploads, LMS import, and wellness collection for a minor when permission is missing or withdrawn.
4. Include permission withdrawal and account deletion paths.
5. Confirm with counsel and OpenAI that the selected attestation and operational process satisfy the applicable agreement and laws.

This is a beta blocker for 13-17 users. Adult beta users may proceed independently after the remaining product and security gates pass.

## Required Under-13 Gate

Under-13 access remains disabled until all of the following are complete:

1. Counsel-approved COPPA and state-law analysis for every launch state.
2. A contracted verifiable parental consent provider and approved `VPCProvider` implementation.
3. Signed webhook validation, expiry, replay protection, and evidence minimization.
4. Separate, versioned consent scopes for account creation, AI, uploads, voice, saved audio, LMS access, and wellness data.
5. A code-owned child-data registry covering every table, storage bucket, processor, purpose, export, retention rule, and deletion rule.
6. Parent notice, review, export, correction, withdrawal, and deletion flows.
7. Processor contracts and endpoint retention review, including OpenAI data-control eligibility for every feature used.
8. Synthetic guardian export and deletion drills with processor cleanup receipts.
9. Penetration testing, cross-account access testing, and an independent child-account release review.
10. Recorded privacy, security, product, and legal approval.

## Data-Minimization Rules

- Do not retain guardian identity documents. The VPC provider returns only a result, provider reference, method, timestamp, and expiry needed for audit.
- Do not store raw voice after transcription unless the guardian separately authorizes saved audio.
- Keep wellness information optional, purpose-limited, and isolated from advertising or profiling.
- Do not use child or teen data for targeted advertising.
- Configure provider storage deliberately. API data not used for model training may still have endpoint-specific abuse-monitoring or application-state retention.
- Delete data when the stated purpose ends and issue a receipt for Diana and each processor cleanup attempt.

## Automated Release Evidence

CI and the staging gate must prove:

- Under-13 signup and direct AI remain blocked.
- Every registered child-data surface has a valid purpose, consent scope, processor, retention, export, and deletion rule.
- Unknown child-data surfaces fail the registry gate.
- Consent webhook signatures, replay handling, expiry, withdrawal, suspension, export, and deletion pass using synthetic identities.
- No password, cookie, token, identity document, private school document, or raw child data appears in beta artifacts.

The current CI boundary is explicit:

- `npm run guardian:gate` validates the age-13+ manifest, signup/database/AI denial contracts, all blocked guardian states, deny-by-default scope interfaces, registry-to-migration storage registration, and blocked processor readiness.
- The full-migration job executes `supabase/tests/scripts/guardian-under-13-boundary.ps1` against a disposable Supabase database.
- The under-13 release-gate contract requires separate current, signed, release-bound legal, privacy, provider, penetration, and deletion receipts.
- Passing every prerequisite does not enable an account. It returns `activation_code_review_required`, with child account and direct AI flags still false.

Until these checks and human approvals pass, Diana's defensible claim is: age 13+ beta only, with parent or guardian permission required for minors and no under-13 account access.
