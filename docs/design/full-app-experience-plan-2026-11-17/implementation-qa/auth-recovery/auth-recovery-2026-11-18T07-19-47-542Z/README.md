# Authentication recovery integration

Run: auth-recovery-2026-11-18T07-19-47-542Z
Target: http://localhost:3140

Production-mode loopback pages, actual Supabase recovery token verification and password updates on a separate disposable synthetic owner.

- Checks: 12/12 passed.
- Cleanup: deleted-and-verified.

## Checks

- Pass: local-production-preflight
- Pass: separate-disposable-owner
- Pass: desktop-untrusted-session-cannot-reset
- Pass: desktop-actual-recovery-token
- Pass: desktop-same-session-password-save
- Pass: desktop-old-proof-and-token-rejected
- Pass: desktop-private-return-and-current-password-change
- Pass: phone-untrusted-session-cannot-reset
- Pass: phone-actual-recovery-token
- Pass: phone-same-session-password-save
- Pass: phone-old-proof-and-token-rejected
- Pass: phone-private-return-and-current-password-change

## Captures

- [desktop reset-unavailable](desktop-reset-unavailable.png)
- [desktop reset-ready](desktop-reset-ready.png)
- [desktop reset-saved](desktop-reset-saved.png)
- [desktop stale-reset-rejected](desktop-stale-reset-rejected.png)
- [desktop token-reuse-rejected](desktop-token-reuse-rejected.png)
- [desktop current-password-rejected](desktop-current-password-rejected.png)
- [desktop account-password-saved](desktop-account-password-saved.png)
- [phone reset-unavailable](phone-reset-unavailable.png)
- [phone reset-ready](phone-reset-ready.png)
- [phone reset-saved](phone-reset-saved.png)
- [phone stale-reset-rejected](phone-stale-reset-rejected.png)
- [phone token-reuse-rejected](phone-token-reuse-rejected.png)
- [phone current-password-rejected](phone-current-password-rejected.png)
- [phone account-password-saved](phone-account-password-saved.png)

## Boundaries

- No reset email was requested or sent. SMTP, email delivery, redirect allow-list and email-template publication remain unverified.
- No real student account, Google connection, tutoring provider, AI service or paid media was used.
- Only passing checks can establish token_hash recovery. The emailed same-browser PKCE round trip is outside this gate.
