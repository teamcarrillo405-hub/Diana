# Authentication recovery integration

Run: auth-recovery-2026-11-18T07-09-06-406Z
Target: http://localhost:3140

Production-mode loopback pages, actual Supabase recovery token verification and password updates on a separate disposable synthetic owner.

- Checks: 4/5 passed.
- Cleanup: deleted-and-verified.

## Checks

- Pass: local-production-preflight
- Pass: separate-disposable-owner
- Pass: desktop-untrusted-session-cannot-reset
- Pass: desktop-actual-recovery-token
- Needs review: desktop-same-session-password-save (An unexpected response stopped desktop-same-session-password-save. No provider diagnostics or credentials are included.)

## Captures

- [desktop reset-unavailable](desktop-reset-unavailable.png)
- [desktop reset-ready](desktop-reset-ready.png)

## Boundaries

- No reset email was requested or sent. SMTP, email delivery, redirect allow-list and email-template publication remain unverified.
- No real student account, Google connection, tutoring provider, AI service or paid media was used.
- Only passing checks can establish token_hash recovery. The emailed same-browser PKCE round trip is outside this gate.

Stopped: An unexpected response stopped desktop-same-session-password-save. No provider diagnostics or credentials are included.
