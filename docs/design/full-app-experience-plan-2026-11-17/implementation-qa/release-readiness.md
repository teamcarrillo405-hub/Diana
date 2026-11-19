# Authentication release readiness

## Signed-in release follow-up, November 18

- The owner signed into the hosted Dashboard. The verified backend is oitipayrriupcitgmzju, displayed as diana-staging, with main marked Production.
- The hosted Site URL was the beta-staging alias. It is now saved as https://diana-umber.vercel.app. This was verified in the UI after Save returned to its clean disabled state.
- The redirect allow-list still has only the prior beta-staging wildcard. The exact canonical callback and its query-parameter variant are prepared in the Add URL dialog but are **not saved**: automatic approval review rejected the persistent authentication-rule change pending the owner's exact-scope approval. No workaround was attempted.
- Custom SMTP is disabled and the Auth Hooks list is empty. The local Diana Resend configuration uses Diana <onboarding@resend.dev>; its key can read an empty domain list. Those local facts do not establish the protected production Resend account's sender/domain status. Existing production RESEND_FROM and RESEND_API_KEY entries are sensitive and were not decrypted by the connector.
- Published signup-confirmation and password-reset templates use ConfirmationURL. They remain unchanged and compatible with the current production callback. The old production callback only handles a code; do not activate candidate token-hash-only links against it. Actual delivery and the new recovery round trip still require proof.
- The existing production LMS_OAUTH_STATE_SECRET was verified through the trusted environment read to satisfy the candidate's trimmed 32-character minimum. Its value was not printed, copied to a browser, committed or changed.
- PR36 remains draft/open/mergeable at fc28598f. CI44331359329 and Worker image44331359549 passed; both Vercel contexts succeeded. Production remains READY at25477d59. There are no migration or Edge Function changes in this PR.
- A fixed-origin, merge-SHA-pinned live desktop/phone gate is prepared separately. Only read-only planning, syntax and scoped lint have run; it is not live evidence yet.

The owner has been asked for the intended sender domain/provider and approval of the two prepared callback addresses. Merge and publication remain held in the requested order until the email prerequisites are resolved. No test email was sent during this follow-up.

## Earlier read-only investigation


Reviewed on 2026-11-18 against branch head 9aa94135. This is a read-only release check. It adds no cloud configuration, email request, account mutation, or new application behavior.

## Current conclusion

The implemented recovery and password-change flow has real provider-backed evidence on desktop and phone. Production email delivery and its published authentication configuration are still unproven. Keep those separate when reviewing the release: a successful token-verification test does not establish that a student can receive the required email.

No additional application fix or one-off preflight script is justified by this investigation. The remaining work requires observing the hosted Auth configuration and, after configuration review, an explicitly authorized delivery test with a controlled mailbox.

## Verified evidence

| Item | Observed result | Boundary |
|---|---|---|
| Source and provider-backed recovery | [12 of 12 checks passed](auth-recovery/auth-recovery-2026-11-18T07-19-47-542Z/results.json), with 14 desktop/phone captures. | The production-mode loopback server used an ephemeral signing key and a separate disposable owner. Its deletion was verified. No reset email was requested. |
| Actual password update | Same-session save and confirmation, authoritative user revision advance, proof clearing, private return, current-password confirmation, and new/previous credential checks passed. | This verifies provider writes on the disposable owner, not a change to a real student account. |
| Recovery authorization | Old proof plus old session rejected on stale submission/reload; consumed recovery token rejected on reuse. | This does not claim that every previously issued access token is globally revoked immediately. |
| Canonical public origin | Anonymous GET of [the production sign-in page](https://diana-umber.vercel.app/login) returned 200, retained that origin, and rendered canonical/Open Graph origins as https://diana-umber.vercel.app. The Vercel domain binding is verified. | This observes the currently deployed public response. The protected NEXT_PUBLIC_APP_URL value was not read, and the candidate implementation is still held for review. |
| Hosted project availability | Supabase project oitipayrriupcitgmzju returned ACTIVE_HEALTHY. Its current display name is diana-staging. | The supplied project ref identifies the checked backend. A display name alone does not determine its release role. |
| Public Auth settings | A GET of that project's /auth/v1/settings using its existing public client configuration returned external.email=true, disable_signup=false, mailer_autoconfirm=false. | Email/password and signup are enabled. Email confirmation is required. This public endpoint does not expose SMTP, templates, Site URL, or redirect allow-list configuration. |
| Vercel environment targets | Metadata shows production entries for NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and LMS_OAUTH_STATE_SECRET. | Only key names, types, and target environments were inspected. The signing value and length were not read. Presence alone does not prove the runtime minimum length or delivery readiness. |

## Prerequisites that still need evidence

1. **Usable student email delivery.** Observe the hosted custom SMTP or approved send-email-hook configuration, verified sender, provider status and intended quotas. No SMTP password or provider key needs to be revealed. Supabase documents its built-in mail service as restricted to project-team addresses and unsuitable for general production delivery; do not infer this project's actual mail configuration from that default. [Supabase SMTP guidance](https://supabase.com/docs/guides/auth/auth-smtp)
2. **Hosted Site URL and redirect rules.** Confirm the intended canonical HTTPS origin and approval of the callback path, including the query-bearing recovery redirect produced by requestPasswordReset. The current recovery request is /auth/callback?next=%2Freset-password&return_to=... on the origin selected by resolvePublicSiteUrl. Confirm the allow-list accepts the complete intended redirect without permitting arbitrary external hosts. Supabase documents Site URL and Redirect URLs as relevant to confirmation and recovery. [Redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls)
3. **Published confirmation and recovery templates.** Inspect the actual hosted templates. The app accepts recovery-specific token_hash links and SDK-attested recovery PKCE codes. A normal confirmation/sign-in code cannot become recovery authority through a query parameter. Cross-device recovery needs a template delivering token_hash with type=recovery to /auth/callback; the default PKCE round trip needs its original browser's verifier. Template content and mail-provider link rewriting have not been reviewed here. [Email-template variables](https://supabase.com/docs/guides/auth/auth-email-templates), [password-reset API](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail)
4. **Production signing configuration.** Confirm through a trusted deployment check that the existing LMS_OAUTH_STATE_SECRET meets the source's trimmed 32-character minimum, without printing or committing it. The recovery HMAC uses its own purpose prefix and binds user, session digest, user revision, expiry, and safe return path. Missing/short signing configuration fails closed.
5. **An approved mailbox round trip.** After the above review, use a dedicated test mailbox and disposable account to prove signup confirmation, resend/cooldown, forgot-password delivery, one-time/expired links, same-browser PKCE, cross-device token-hash recovery if offered, and the desktop/phone private return. Do not use an existing student's password for this test. No such email was sent during this investigation.

Because email confirmation is enabled, the delivery and confirmation-template checks affect new-student signup as well as password recovery.

## Preview boundary

The current environment metadata shows the signing key only for the production target. The preview target has a public-origin entry, but no preview signing entry was observed. Recovery therefore cannot be certified from branch-preview UI alone. Before an actual preview email test, review the intended preview origin, a separate approved signing configuration, and its hosted redirect rules. Do not copy or expose the production secret or change cloud settings merely to make a preview pass.

## Available read-only surfaces and access limits

- The connected Supabase tools can read project metadata and public Auth settings can be queried with the existing public client key. The connector currently has no Auth-configuration read endpoint for SMTP, templates, Site URL, or redirect rules.
- The requested [project SMTP settings page](https://supabase.com/dashboard/project/oitipayrriupcitgmzju/auth/smtp) visibly redirected to [Supabase Dashboard sign-in](https://supabase.com/dashboard/sign-in?returnTo=%2Fproject%2Foitipayrriupcitgmzju%2Fauth%2Fsmtp). No sign-in, agreement, credential reveal, or settings change was performed. An authenticated Dashboard review or a suitably scoped read-only Management API session is needed for those private fields.
- The agent-created diagnostic browser tab was not marked as a handoff or deliverable. It is ephemeral; the links above can be opened independently. No credentials were entered.
- No local SUPABASE_ACCESS_TOKEN was available. No access-token files were searched or read. The repository has no supabase/config.toml; local file absence is not evidence of any hosted setting.
- Vercel environment metadata and domain binding were read without decrypting the signing secret. The public-origin conclusion above comes from the deployed HTML response, not a guessed protected value.

## Relevant source and prior proof

- lib/auth/recovery-state.ts: signing-key check, scoped proof and expiry.
- lib/auth/entry.ts: normalized internal return-path validation and password rules.
- app/(auth)/password-actions.ts: reset request origin, generic sent response, fresh recovery authorization and current-password confirmation.
- app/auth/callback/route.ts: recovery-specific verification, clean redirects and private proof cookie.
- app/reset-password/page.tsx and form.tsx: retained client identity through the successful cookie/RSC update.
- scripts/qa-auth-recovery.mjs: disposable, loopback-only integration gate. It does not send reset email and is not a production-mail preflight.
- [Recovery investigation and correction](auth-recovery/README.md): the discovered success-state issue, correction, passing provider-backed run, and local-origin handling.

This investigation adds only readiness documentation and its implementation-handoff link. Existing green CI and provider-backed tests were not rerun, and the unrelated pre-existing audit was left untouched.
