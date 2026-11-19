# Authentication recovery integration

Run: auth-recovery-2026-11-18T07-07-40-007Z
Target: http://127.0.0.1:3140

Production-mode loopback pages, actual Supabase recovery token verification and password updates on a separate disposable synthetic owner.

- Checks: 3/4 passed.
- Cleanup: deleted-and-verified.

## Checks

- Pass: local-production-preflight
- Pass: separate-disposable-owner
- Pass: desktop-untrusted-session-cannot-reset
- Needs review: desktop-actual-recovery-token (The provider callback did not open an authorized password reset form. Safe path/cookie/revision flags are recorded.)

## Captures

- [desktop reset-unavailable](desktop-reset-unavailable.png)
- [desktop recovery-callback-unavailable](desktop-recovery-callback-unavailable.png)

## Boundaries

- No reset email was requested or sent. SMTP, email delivery, redirect allow-list and email-template publication remain unverified.
- No real student account, Google connection, tutoring provider, AI service or paid media was used.
- Only passing checks can establish token_hash recovery. The emailed same-browser PKCE round trip is outside this gate.

Stopped: The provider callback did not open an authorized password reset form. Safe path/cookie/revision flags are recorded.
