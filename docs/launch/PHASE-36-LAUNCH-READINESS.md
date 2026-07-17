# Phase 36 Launch Readiness

## Current status

The exact 47-screen release candidate is automated-gate ready and available in Vercel Preview. It is not yet approved for production because final human visual review is still pending.

- Preview: [Diana Phase 36 release candidate](https://diana-prgopmqu6-teamcarrillo405-hubs-projects.vercel.app)
- Release SHA: `e00aec90bc8cbc5332e3aa81bf42fdf977328dbe`
- Deployment: `dpl_7ePyEULrytE6WmRLTVCkHzV4vVHx`
- Target: Preview only
- Human approval: Pending
- Production merge: Not started
- Production deployment: Not started

## What is ready

- All 47 canonical ScreenDesign states have source, app, diff, and action evidence.
- All 57 locked navigation contracts pass.
- The exact release passes 913 unit tests and 104 local accessibility and responsive checks.
- The exact hosted Preview passes 94 responsive and authenticated checks.
- The hosted canary passes 47 registry routes, 16 strict signed-in routes, and all 28 ScreenDesign assets.
- The dashboard is the attached stadium and athlete Lobby.
- Nexus, Mission Control, Today's Game Plan, PageShell, AppTopNav, and the old landing presentation are absent.
- Preview auth, public sharing failure states, private-route redirects, build identity, and production QA lockout pass.
- Console errors, page errors, and failed browser requests are zero across the strict hosted canary.

## Review surfaces

- Gallery: `C:\Users\glcar\Diana\test-results\screendesign-review\index.html`
- Gallery receipt: `C:\Users\glcar\Diana\test-results\screendesign-review\validation.json`
- Hosted canary receipt: `C:\Users\glcar\Diana\test-results\phase36-preview\phase36-preview-canary.json`
- Hosted dashboard capture: `C:\Users\glcar\Diana\test-results\phase36-preview\phase36-preview-dashboard.png`
- Full verification: `C:\Users\glcar\Diana\.planning\phases\36-faithfully-implement-all-47-figma-html-screens-and-remove-th\36-VERIFICATION.md`

## Environment inventory

The following key names are present for Vercel Preview. Values were not printed or recorded:

- `SUPABASE_SERVICE_ROLE_KEY`
- `WORKER_API_TOKEN`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`

The Preview Supabase publishable key was corrected from a malformed value and reverified against the linked Supabase project before the final deployment.

## Production checklist

- [x] Exact release SHA locked
- [x] Immutable 47-screen gallery independently validated
- [x] Local type, unit, tone, lint, build, and removal gates passed
- [x] Local accessibility and responsive matrix passed
- [x] Vercel Preview is READY
- [x] Inspection, served, and local SHA values match
- [x] Hosted auth and responsive matrix passed
- [x] Hosted routes, assets, security, console, network, and removal canaries passed
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

If the approved production release later needs to be rolled back, promote the current production deployment above and rerun the production canary.

## Approval checkpoint

Open the Preview and the gallery. Confirm that the student dashboard is the stadium and athlete Lobby and that every screen preserves the intended source hierarchy, imagery, spacing, state, and mobile composition.

Type `approved for production merge` to release the production block. If corrections are needed, provide the screen id and exact issue instead.

