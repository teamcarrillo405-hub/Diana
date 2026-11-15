---
phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th
verified: "2026-07-18T00:00:42Z"
status: human_approval_pending
release_sha: 0780d6ae9f08c892dce9b1e6d108881814da4c98
release_tree: 9195838b5947d4b2598c883a16d10234bff4a297
preview_deployment_id: dpl_4dYq7uiRZTu9KZUfhE8BDirNBVCZ
preview_url: https://diana-7r5a3bjex-teamcarrillo405-hubs-projects.vercel.app
score: 4/4 automated requirements passed
human_verification:
  - test: Review all 47 canonical source, app, and diff rows
    expected: The hosted product preserves the approved ScreenDesign hierarchy, imagery, spacing, selected states, and mobile composition.
  - test: Confirm the public acquisition flow and dashboard identity
    expected: The public flow contains the five newly attached compositions, and dashboard-personalized is the stadium and athlete Lobby with no prohibited legacy presentation.
---

# Phase 36 Verification

## Verdict

Automated verification is complete and passing for the exact release candidate. Production merge and deployment remain blocked only on final human visual approval.

| Gate | Result |
|---|---|
| Immutable 47-screen evidence | PASS |
| Exact local release candidate | PASS |
| Exact Vercel Preview identity | PASS |
| Production-safe hosted public canaries | PASS |
| Hosted synthetic authenticated actions | NOT RUN BY DESIGN |
| Human visual approval | PENDING |
| Production deployment | NOT STARTED |

## Immutable 47-screen evidence

| Identity | Verified value |
|---|---|
| Producer run | `phase36-plan30` |
| Release SHA | `0780d6ae9f08c892dce9b1e6d108881814da4c98` |
| Release Git tree | `9195838b5947d4b2598c883a16d10234bff4a297` |
| Index SHA-256 | `6b3839afd8f2d950fcb8005f69d6c60c64a4061c9ed171eafb31f39e77b92cfc` |
| Validator identity SHA-256 | `194a04d169be44828c6440da0382825e30a118cca1a99dac5558f9a224ad5ee2` |
| Independent receipt SHA-256 | `c415fa91f74b2f399ded7e15a95107af74d90f2dd13fa5cc757be21798d9b74d` |
| Producer tree SHA-256 | `b55a6e8ae38500d0d311c1de6048b54ce8075e56b2609e56e57a0a36021c485e` |
| Producer files excluding receipt | 191 |
| Release manifest SHA-256 | `08477b3532fa79de95eace38cbff3a3737c3e610e186aa4dd29e8c3a04df6ffa` |
| Canonical output | 47 source, 47 app, 47 diff, 47 action records |
| Navigation contracts | 58 of 58 passing |
| Visual comparisons | 47 of 47 passing with baseline updates disabled |
| Image dimensions | 141 of 141 PNGs at 393 by 852 |

Plan 36-30 created one clean gallery on the exact release commit. Plan 36-29 then reran corruption contracts and independently wrote `validation.json` only after exact ids, hashes, reviewed baseline provenance, run id, and release SHA all passed.

The first clean rerun correctly stopped when the new public-home test clicked before React hydration. Commit `0780d6a` added the same readiness gate used by the canonical onboarding test. The targeted public sequence passed, then the complete producer reran from a clean output root and passed the full 58-contract matrix.

## Exact local release candidate

| Check | Result |
|---|---|
| TypeScript | PASS |
| Vitest | 162 files, 923 tests passed |
| Calm tone | 0 blocking findings, 3 advisory warnings |
| Lint | PASS |
| Production build | 79 static and dynamic routes generated, PASS |
| Compiled legacy-removal audit | 554 artifacts scanned, PASS |
| Review-gallery validator | 47 of 47, exact SHA and hashes, PASS |
| Local navigation and primary actions | 58 of 58 passed |
| Local accessibility and responsive matrix | 104 of 104 passed |

The 104-case browser matrix used `QA_BASE_URL=http://127.0.0.1:3005`, the development-only `QA_CREATE_USER=true` server seam, and one worker. One worker is required because both files use the same owner-scoped synthetic account and concurrent session resets can invalidate the other file's active session. Coverage was not reduced.

`QA_CREATE_USER` was explicitly unset for the production build. Carrying a development QA flag into `next build` activates the Smart Loading probe and is not a valid production build configuration.

## Exact Vercel Preview identity

| Field | Verified value |
|---|---|
| URL | `https://diana-7r5a3bjex-teamcarrillo405-hubs-projects.vercel.app` |
| Deployment | `dpl_4dYq7uiRZTu9KZUfhE8BDirNBVCZ` |
| Target | Preview |
| Ready state | READY |
| Source | Git-backed exact release branch |
| Git branch | `codex/phase36-home-0780d6a` |
| Inspection SHA | `0780d6ae9f08c892dce9b1e6d108881814da4c98` |
| Served `/api/build-info` SHA | `0780d6ae9f08c892dce9b1e6d108881814da4c98` |
| Local release SHA | `0780d6ae9f08c892dce9b1e6d108881814da4c98` |

Vercel build logs completed successfully. The deployment metadata API supplied the full inspection SHA, and `verify-phase36-preview-sha.ts` confirmed exact equality with local Git and the served no-store build identity response.

## Production-safe hosted canary

| Check | Result |
|---|---|
| Public home sequence | Welcome, Educational, Challenge, Schedule, Community Access, Standard Access, Signup, PASS |
| Canonical registry route probes | 47 of 47 returned no server failure |
| Anonymous private-route behavior | Login redirects |
| Public expired-share behavior | Served fail-closed |
| ScreenDesign local assets | 28 of 28 returned expected media and non-empty bodies |
| Browser console errors | 0 |
| Browser page errors | 0 |
| Browser request failures | 0 |
| Prohibited legacy terms visible in public sequence | 0 |
| Anonymous build identity | HTTP 200, exact, and key-safe |
| Vercel Preview QA seed endpoint | HTTP 404 |

The exact release SHA plus the compiled removal audit proves the hosted build cannot contain the deleted Nexus, Mission Control, or Today's Game Plan presentation. The public browser sequence also rendered none of those terms.

## Hosted QA methodology correction

Earlier launch evidence claimed 57 hosted navigation checks, 16 strict signed-in hosted routes, and 94 hosted responsive/authenticated checks. That methodology was invalid because the command copied the Preview URL into `BASE_URL`, while `playwright.config.ts` reads `QA_BASE_URL`. Those checks therefore used the local default server.

The full seeded ScreenDesign suite cannot and should not run through Vercel Preview. `/api/qa/anonymous-session` intentionally returns HTTP 404 whenever `NODE_ENV=production`, which includes Vercel Preview. The current verification preserves that boundary and does not add a hosted QA bypass.

Authenticated route rendering, persistence, and primary actions are proven locally with the exact release code, the linked Preview Supabase project, 58 of 58 navigation contracts, 47 of 47 strict visuals, and 104 of 104 accessibility/responsive checks. Hosted proof is limited to public interactions and safe read-only canaries.

## Human verification required

1. Open the Preview URL.
2. Complete the public flow through Educational, Challenge, Schedule, Community Access, Standard Access, and Signup.
3. Review every row in `test-results/screendesign-review/index.html`.
4. Confirm `dashboard-personalized` is the stadium and athlete Lobby.
5. Compare each source, app, and diff image for hierarchy, imagery, spacing, state, and mobile composition.

Approval signal: `approved for production merge`

If anything is wrong, report the screen id and exact visual or interaction correction. Production remains blocked until this step is complete.
