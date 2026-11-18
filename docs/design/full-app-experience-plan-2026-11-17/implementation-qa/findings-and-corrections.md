# Initial findings and corrections

Initial production-browser evidence: `campus-2026-11-18T06-52-31-658Z/results.json`. The initial report remains unchanged.

- 110 page states were captured: 108 passed presentation checks. The two callback findings were caused by the diagnostic guard blocking assets after Next redirected the loopback host from `127.0.0.1` to `localhost` on the same port. Direct requests to those assets returned 200. The harness now permits only those local host aliases on the selected port.
- 17 interactive checks ran: 9 passed. Both native PDF extraction/review/Apply checks passed. Both More category checks and Class/Hand-in reload checks passed. All five primary destinations fit desktop, phone, and 768px tablet.
- The two fake-provider sign-in checks used an ambiguous `role=alert` selector that also matched the Next route announcer. The harness now targets the actual form error.
- Saved large, loose Atkinson reading preferences reached the Note editor correctly: 18px text, 33.3px line height, 0.63px letter spacing, 1.44px word spacing. Quiz question text stayed at 26px / 36.4px line height, a fixed 1.4 ratio. The question heading now follows the saved reading scale and line height.
- A selected quiz choice in Dark mode had light ink `rgb(248,244,233)` on a pale `color(srgb .85898 .879059 .831843)` background. Selected choices and hints now use paired reading palette tokens, with the radio accent following the same palette.
- Visual review found Note detail's Ask Diana heading at `rgb(24,33,38)` against the dark `rgb(24,31,27)` rail. The heading now uses campus ink.
- Both Lobby refresh flags were diagnostic false positives: Now intentionally removes the view parameter, so GET /dashboard is its correct canonical URL. The original assertion required an explicit view=now and therefore rejected correct behavior. A separate request trace confirmed save, actual refresh, and native reload all stayed Now. The corrected gate accepts absent view or view=now, rejects Check-in/Week restoration, and checks the saved notice and reload. The shared history helper remains appropriate compatibility hardening: it preserves caller fields while omitting the two Next internal-write markers.

The exact initial computed styles are saved in `campus-2026-11-18T06-52-31-658Z/computed-findings.json`. The superseding evidence below closes the scoped findings; the original run files remain unchanged.

## Superseding evidence

- [Corrected page and interaction run](campus-2026-11-18T07-06-30-446Z/results.json): all 12 changed page states passed on desktop/phone, including refreshed public home, invalid callback recovery, Note detail, practice, Check-in history, and authenticated access. Fake sign-in rejection and saved reading/theme preferences passed.
- The corrected quiz question measured 29.25px text and 54.1125px line height with the saved large/loose preference on both viewports. The selected Dark-mode choice measured 11.03:1 contrast. High-contrast paper/ink measured black/white, and the sampled navigation control had no animation or transition under saved reduced motion.
- [Canonical Now correction run](campus-2026-11-18T07-10-32-363Z/results.json): only the two previously misinterpreted Lobby interactions were repeated. Both passed actual refresh, visible “Check-in saved.” notice, and native reload retaining Now. A missing view parameter is the intentional canonical Now URL. No app change was required for these two flags.
- The initial run's passing native synthetic PDF review/Apply, More category selection, Class/Hand-in reload continuity, and desktop/phone/tablet primary navigation remain the evidence for those unchanged behaviors.

Visual review of corrected practice, Check-in history, and phone Notes confirmed readable headings and paper text. Corrected practice product capture candidates are `campus-2026-11-18T07-06-30-446Z/desktop-practice-product.png` and its phone counterpart. The uniquely marked synthetic fixture is retained temporarily for the coordinator's approved capture refresh.

These results represent the recorded matrix and focused corrections. They do not claim every route was rendered again after the final build, that real mail/Google consent was exercised, or that subject accuracy and a fully disconnected workflow were retested.
