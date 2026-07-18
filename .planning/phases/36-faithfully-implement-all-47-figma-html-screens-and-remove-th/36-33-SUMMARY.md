# Phase 36.33 Summary: Mobile and Desktop ScreenDesign Proofing

## Outcome

All 47 canonical ScreenDesign screens now have a paired mobile and desktop proofing surface.

The implementation keeps the approved 393 x 852 mobile compositions and adds a true desktop layout contract at 1440 x 1000. Desktop screens no longer center a narrow phone viewport. Authenticated desktop screens use a persistent left rail derived from the same five mobile destinations, and the screen families expand into wider reading surfaces, multi-column layouts, and desktop-sized work areas.

## What changed

- Added a shared responsive marker to every ScreenDesign viewport.
- Converted the student bottom navigation into a desktop left rail at large widths while preserving the mobile bottom nav.
- Added desktop composition rules for the 47-screen ScreenDesign implementation.
- Added a public `/design-proof` route for side-by-side proofing.
- Generated exactly 47 mobile WebP proof images and 47 desktop WebP proof images.
- Added a deterministic proof generator for regenerating the paired gallery.
- Hardened QA fixture seeding so dependent rows insert after their parent assignment rows.
- Fixed the authenticated layout semantic wrapper to avoid nested `main` hydration issues.
- Made `/design-proof` public in middleware because the route contains only static proof captures and must be reviewable before sign-in.

## Proof assets

- `public/screendesign-proof/manifest.json`
- `public/screendesign-proof/mobile/*.webp`
- `public/screendesign-proof/desktop/*.webp`

## Verification

- `npx vitest run lib/qa/screendesign-fixtures.test.ts`
- `npm run test:run`
- `npm run typecheck`
- `npm run tone-audit`
- `git diff --check`
- `npm run build`
- `npx tsx scripts/verify-screendesign-removal.ts --source`
- `npx playwright test tests/screendesign-visual.spec.ts --project=screendesign-responsive-desktop --workers=1 --reporter=line`
- Targeted browser navigation gate covering dashboard, assignment detail, AI history, public home scroll, and primary hub navigation contrast.
- Local proof route smoke test: `/design-proof` renders one mobile proof image, one desktop proof image, and 47 selector options.

## Remaining launch gate

This phase is ready for user proofing. Final launch approval still requires reviewing the responsive proof gallery and confirming the screen order, copy, and backend behavior match the intended product.
