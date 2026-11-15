# More: Game-Menu Preview

## Scope

Review route: `/landing-3d/more-concept-review`.

The existing authenticated `/more` page and its destination pages are unchanged.
The local-only route uses the same development/isolated-QA gate as the other
concept reviews, rejects deployment and non-loopback access, and is not indexed.
It displays no invented profile, account status, activity totals, or rewards.

## Composition

The Madden-inspired direction is a utility menu rather than another dashboard:
one category rail and one focused set of destinations over the existing Diana
signature environment. The oversized white frame, inset card grid, and yellow
action styling from live More are not carried into this preview.

- **Study tools:** immediate search, Notes, Flashcards, and Study artifacts.
- **Record:** Completed work, Saved artifacts, and Showcase.
- **Wellness:** Daily information, Goals, and Learning supports.
- **Account:** Profile, Settings, School connections, Accessibility,
  Notifications, and Sharing.

The original Search, Record, Wellness, and Sharing destinations remain reachable.
Settings shortcuts use the existing section query parameters. No new permissions,
sharing behavior, account writes, OAuth flows, or record semantics are introduced.
Search uses the existing GET `/search?q=...` route. Destination links do not
prefetch authenticated pages merely because a category is shown.

## Graphic And Interaction Language

- Saira Condensed headings and destinations, Lexend utility text.
- Pink brush for category selection; violet for the immediate search action.
- Neutral icons, consistent horizontal rules, no nested cards or decorative stats.
- Instant selection feedback with one 200ms content arrival; no competing effects
  or new sound. Reduced motion disables movement and transitions.
- Accessible tabs with arrows, Home, End, roving focus, linked panel semantics,
  and hidden/inert inactive content. Search input survives switching categories.
- Desktop vertical rail; four fixed-width phone choices, with Study tools shortened
  visually to Tools. Its accessible name remains Study tools. No hidden selection
  beyond a horizontally scrolling rail.

The preview defaults to Study tools on a fresh visit without persistence. Links
open the real app, so their current destination designs remain visible there.

## Verification

- 12 focused tests cover category selection, keyboard wrapping/focus, panel
  semantics, search draft preservation and form encoding, real route mappings,
  responsive orientation, entry reset, and local-only route guards.
- Combined Lobby, Work, Classes, Calendar, and More verification: 566 tests across
  35 files. TypeScript and scoped ESLint pass.
- Rendered at 1920x1080, 1440x1000, 834x1112, 390x844, and 320x900.
- Fixed a narrow-phone rail clipping issue and checked actual text bounds at
  320px. No horizontal page overflow; selected category remains visible.
- Browser navigation confirmed an encoded `Biology & notes` search on the real
  results page and the Accessibility shortcut opening the correct Settings section.
- Reduced-motion keyboard switching preserved selection/focus and reported zero
  running animations. No user settings or records were changed during verification.

This is a checked design preview, not an objective AAA certification or approval
to replace the live More page.
