# Authentication recovery integration

Run: auth-recovery-2026-11-18T15-01-07-071Z
Target: http://localhost:3140

Ready-form preview only: actual recovery-token verification on a disposable owner, without password updates or mail.

- Checks: 6/6 passed.
- Cleanup: deleted-and-verified.

## Checks

- Pass: local-production-preflight
- Pass: separate-disposable-owner
- Pass: desktop-untrusted-session-cannot-reset
- Pass: desktop-actual-recovery-token
- Pass: phone-untrusted-session-cannot-reset
- Pass: phone-actual-recovery-token

## Captures

- [desktop reset-unavailable](desktop-reset-unavailable.png)
- [desktop reset-ready](desktop-reset-ready.png)
- [phone reset-unavailable](phone-reset-unavailable.png)
- [phone reset-ready](phone-reset-ready.png)

## Boundaries

- No reset email was requested or sent. SMTP, email delivery, redirect allow-list and email-template publication remain unverified.
- No real student account, Google connection, tutoring provider, AI service or paid media was used.
- Only passing checks can establish token_hash recovery. The emailed same-browser PKCE round trip is outside this gate.
