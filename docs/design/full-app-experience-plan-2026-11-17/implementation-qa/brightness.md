# Brighter campus backgrounds and owner approval

November 18, 2026. The owner approved the menu/workspace balance, subtle motion and phone presentation, with one correction: backgrounds were too dark. That approval is now recorded in the [design standard](../DESIGN-STANDARD.md) and linked from the shared design-system guide.

## Correction

- Reduced broad overlays over campus rooms, Work, Classes, Calendar, Lobby, Entry and onboarding. The source images and scene crops are unchanged. No image-generation credits were used.
- Scenic/header rooms now retain much more daylight and architectural detail. Quiet focus/document surfaces retain their prior behavior.
- Dark task and form panels stay readable. More and Settings use localized desktop rail backings where the newly bright wall/window reduced exposed text contrast. These backings do not move controls or dim the whole room.
- School identity, fonts, brush selections, navigation layout, saved reading preferences, learning logic and account behavior were preserved. Existing short transitions and reduced-motion support remain the approved motion treatment.

## Evidence

- [Brightness matrix](campus-brightness-2026-11-18/results.json): 36 captured desktop/phone states; 35 passed initially, with 23/23 layout checks. Desktop Profile reported a React hydration/browser error.
- [Targeted final desktop check](campus-brightness-desktop-final-2026-11-18/results.json): 4/4 states and 4/4 layout checks passed, including Profile, More, Security and Diana coaching. This supersedes their initial desktop captures. The initial Profile error was not reproduced; no application JavaScript change was made for it.
- Rendered review confirmed brighter primary rooms and Entry, readable phone More/onboarding and corrected desktop menu backings. The same campus scenes remain recognizable and distinct.
- [Recovery flow](auth-recovery/auth-recovery-2026-11-18T14-53-22-728Z/results.json): 12/12 actual provider-backed checks passed, with 14 captures and verified deletion of its separate synthetic owner. This supplied the current saved-password previews without sending email.
- [Empty recovery-form previews](auth-recovery/auth-recovery-2026-11-18T15-01-07-071Z/results.json): 6/6 scoped checks passed. Empty password fields render naturally; nonempty fields remain masked in diagnostics. This preview-only run made no password update, sent no email, and verified deletion of its disposable owner.
- Production compilation and TypeScript passed; full lint passed on the initial brightness build, and scoped QA-script lint/syntax passed after the targeted diagnostic changes. The final 185-route function trace gate passed at a maximum estimated 39,344,236 bytes. The full application regression suite was not repeated for this CSS correction.
- All synthetic campus fixtures and their child records were deleted and deletion verified. No real account, password, Google connection, calendar event or email was changed. Recovery signing used a temporary in-memory local key, not a production configuration change.

The refreshed gallery also passed at 1440px and 390px: all 40 images decoded, category filtering worked, and neither viewport overflowed or reported page errors.

## Current preview and release boundary

[All 20 desktop and phone pairs](../previews/index.html) were refreshed from the rendered brightness evidence, using the superseding desktop captures above. The earlier raw captures and reported initial finding remain historical evidence. Only optimized previews and sanitized reports belong in the commit.

The owner's design approval is recorded; this follow-up does not ask for it again. Production has not been changed by this correction. The existing [external email-readiness requirements](release-readiness.md) and public Google verification boundary remain separate from visual approval.
