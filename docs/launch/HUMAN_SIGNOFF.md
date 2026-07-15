# Diana Human Launch Signoff

Use this sheet for the final human validation of the current head of [PR #5](https://github.com/teamcarrillo405-hub/Diana/pull/5). Do not reuse results after the release candidate changes. Record the exact commit SHA before testing.

## Release candidate

| Field | Value |
|---|---|
| Commit SHA |  |
| Production URL | `https://diana-umber.vercel.app` |
| Validation start date |  |
| Validation lead |  |

## Operational owner

One named person must accept responsibility for each function. The same person may own more than one function.

| Function | Owner | Backup | Contact path | Accepted date |
|---|---|---|---|---|
| Student-record incidents |  |  |  |  |
| Account deletion requests |  |  |  |  |
| AI provider failures |  |  |  |  |
| Launch-day monitoring |  |  |  |  |

## Physical-device validation

Run the required smoke from `MOBILE_AND_BETA_MATRIX.md` on real hardware. Automated Chromium does not satisfy these rows.

| Device | Browser and version | Tester | Date | Result | Notes or issue link |
|---|---|---|---|---|---|
| iPhone, iOS Safari |  |  |  | Pass / Needs work |  |
| Android phone, Chrome |  |  |  | Pass / Needs work |  |
| Managed Chromebook, Chrome |  |  |  | Pass / Needs work |  |

Every row must pass on the same release candidate. Any code change resets the affected rows.

## Five-student protocol

Follow `.planning/TEEN_TEST_RUN_PLAN.md`. Obtain written parental consent and student assent before every session. Do not enter names or sensitive school records in this sheet. Use anonymous participant IDs.

| Participant | Age bracket | Learning difference represented | Prefers Diana for stuck tasks | Final-work confusion | Facilitator notes saved |
|---|---|---|---|---|---|
| T01 | 13-17 | Yes / No | Yes / No | Yes / No | Yes / No |
| T02 | 13-17 | Yes / No | Yes / No | Yes / No | Yes / No |
| T03 | 13-17 | Yes / No | Yes / No | Yes / No | Yes / No |
| T04 | 13-17 | Yes / No | Yes / No | Yes / No | Yes / No |
| T05 | 13-17 | Yes / No | Yes / No | Yes / No | Yes / No |

The launch threshold is at least four of five participants preferring Diana for stuck tasks and zero participants reporting final-work confusion.

## Merge authorization

| Field | Value |
|---|---|
| PR | `#5` |
| Authorized by |  |
| Authorization date |  |
| Exact instruction | `Merge PR #5` |

## Final decision

Mark Go only when every physical-device row passes, the teen threshold passes, all operational functions have named owners, PR #5 is authorized and merged, and the merged production deployment is verified.

| Decision | Name | Date | Notes |
|---|---|---|---|
| Go / No-go |  |  |  |
