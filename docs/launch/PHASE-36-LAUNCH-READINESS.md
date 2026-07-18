# Phase 36 Launch Readiness

## Current status

The exact 47-screen release candidate is automated-gate ready and available in Vercel Preview. Production remains blocked on final human visual approval.

- Preview: [Diana Phase 36 release candidate](https://diana-7r5a3bjex-teamcarrillo405-hubs-projects.vercel.app)
- Release SHA: `0780d6ae9f08c892dce9b1e6d108881814da4c98`
- Deployment: `dpl_4dYq7uiRZTu9KZUfhE8BDirNBVCZ`
- Git branch: `codex/phase36-home-0780d6a`
- Target: Preview only
- Human approval: Pending
- Production merge: Not started
- Production deployment: Not started

## What is ready

- All 47 canonical ScreenDesign states have fresh source, app, diff, and action evidence.
- All 58 locked navigation and primary-action contracts pass locally against deterministic synthetic data.
- The exact release passes 923 unit and component tests across 162 files.
- The exact release passes all 47 strict visual comparisons without updating a baseline.
- All 104 local accessibility and responsive checks pass across light, dark, mobile, tablet, and desktop states.
- The production build passes, and the compiled removal audit scans 554 artifacts with no Nexus, Mission Control, or Today's Game Plan presentation.
- The Git-backed Preview is READY, and local, inspected, and served build identities all equal the release SHA.
- The hosted public funnel passes Welcome, Educational, Challenge, Schedule, Community Access, Standard Access, and Signup in order.
- The hosted canary probes all 47 canonical route owners with no server failure and verifies all 28 local ScreenDesign assets.
- Hosted browser console errors, page errors, and failed requests are zero during the public sequence.
- Private routes redirect anonymous visitors to login, public expired shares fail closed, and the QA seed endpoint remains HTTP 404 in Vercel Preview.

## Review surfaces

- Gallery: `C:\Users\glcar\Diana\test-results\screendesign-review\index.html`
- Gallery receipt: `C:\Users\glcar\Diana\test-results\screendesign-review\validation.json`
- Hosted canary receipt: `C:\Users\glcar\Diana\test-results\phase36-preview\phase36-preview-canary.json`
- Full verification: `C:\Users\glcar\Diana\.planning\phases\36-faithfully-implement-all-47-figma-html-screens-and-remove-th\36-VERIFICATION.md`

## Hosted QA methodology correction

Earlier Phase 36 launch evidence claimed 57 hosted navigation checks, 16 strict signed-in hosted routes, and 94 hosted responsive/authenticated checks. Those counts were not valid hosted evidence.

The prior command copied the Preview URL into `BASE_URL`, but Playwright reads `QA_BASE_URL`. The browser suite therefore used its local default server instead of the Vercel Preview. The Vercel deployment also intentionally returns HTTP 404 from `/api/qa/anonymous-session` because that synthetic-data endpoint is development-only whenever `NODE_ENV=production`.

This release preserves that production-safe boundary. Authenticated seeded actions are proven locally with 58 of 58 navigation contracts and 104 of 104 accessibility/responsive checks. Hosted evidence is limited to safe public actions, canonical route availability and auth redirects, assets, build identity, public failure states, removal, console, and network canaries. No claim is made that synthetic authenticated actions ran on Vercel Preview.

## Environment inventory

The following key names are present for Vercel Preview. Values were not printed or recorded:

- `SUPABASE_SERVICE_ROLE_KEY`
- `WORKER_API_TOKEN`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`

No Preview-only QA bypass or seed token was added.

## Production checklist

- [x] Exact release SHA locked
- [x] Immutable 47-screen gallery independently validated
- [x] Local type, unit, tone, lint, build, and removal gates passed
- [x] Local 58-contract navigation and primary-action matrix passed
- [x] Local 104-case accessibility and responsive matrix passed
- [x] Vercel Preview is READY
- [x] Inspection, served, and local SHA values match
- [x] Hosted public sequence, route, asset, auth-boundary, console, network, and removal canaries passed
- [x] Production-safe hosted QA lockout remains active
- [ ] User reviews all 47 gallery rows
- [ ] User types `approved for production merge`
- [ ] Merge the approved release
- [ ] Deploy production
- [ ] Run the post-deploy canary against production

## Rollback target

Current production remains unchanged:

- Production URL: `https://diana-umber.vercel.app`
- Deployment: `dpl_B8xDfHVrEnPq1oaPai9gRPX68dSi`
- Commit: `8304378551d85fc194bcdc4d666d98320aba8b60`
- State: READY

If an approved production release later needs to be rolled back, promote the current production deployment above and rerun the production canary.

## Approval checkpoint

Open the Preview and the local gallery. Confirm that the public home flow includes all five attached designs after Welcome, and confirm that the student dashboard is the stadium and athlete Lobby in the `dashboard-personalized` gallery row. Review all 47 rows for hierarchy, imagery, spacing, selected state, and mobile composition.

Type `approved for production merge` to release the production block. If corrections are needed, provide the screen id and exact issue instead.
