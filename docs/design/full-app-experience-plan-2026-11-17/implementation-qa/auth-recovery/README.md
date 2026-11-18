# Recovery and account-security integration

Latest passing run: [2026-11-18 07:19 UTC](auth-recovery-2026-11-18T07-19-47-542Z/README.md). [Structured results](auth-recovery-2026-11-18T07-19-47-542Z/results.json).

The corrected production-mode app passed 12 of 12 checks at desktop (1440 by 1000) and phone (390 by 844), with 14 rendered captures. A separate, uniquely marked synthetic owner was created for this gate and its deletion was verified in cleanup. Passwords and token values stayed in memory. No reset email was requested, no real account was changed, and no paid or tutoring provider was called.

## What was exercised

- Actual Supabase Admin recovery-link generation without email delivery, followed by the local callback's recovery-specific token-hash verification.
- A clean reset URL and HttpOnly, SameSite=Lax authorization cookie.
- An ordinary unauthenticated session receiving no reset form.
- A same-browser password save through the real Server Action, with the same-origin request accepted and a visible saved confirmation.
- The provider's authoritative user revision advancing after the password change and the recovery proof being cleared.
- A preexisting stale form keeping the old session and old proof, then being denied on both submission and reload after the password change.
- The saved password authenticating and the stale attempt's proposed password being rejected.
- A consumed recovery token being rejected on reuse.
- Returning to the private Settings security section in the recovered browser session.
- An unconfirmed current password being rejected, followed by a confirmed current password changing the password successfully.
- Private fields clearing, the new password authenticating, and the previous password being rejected.

## Issue found and corrected

The first real password save changed the password but lost the success screen. Clearing the recovery cookie caused Next to refresh the server page, which replaced the client form with its unavailable-link state. The page now preserves the client form's identity and passes server availability into it. The successful action can finish rendering while all password writes retain the server proof gate. Five focused reset-form tests passed, including the availability change during a pending action. The rebuilt app then passed the complete provider-backed flow above on both viewports.

## Local origin handling

This gate uses localhost consistently. The local production runtime canonicalizes callback redirects from 127.0.0.1 to localhost; mixing those hosts separated their host-only cookies. The passing run kept the request and final callback hostname identical and did not bypass cookie protections.

## Remaining external verification

SMTP delivery, the published recovery-email template, the production redirect allow-list, and the emailed same-browser PKCE round trip were not exercised. The local server used an ephemeral QA-only signing key supplied in memory. Production recovery still requires its existing signing configuration and provider email setup to be checked without disclosing credentials.

Earlier run folders retain the expected configuration stop, local-origin diagnosis, and pre-fix success-state evidence. Each created disposable owner was deleted and verified.
