# Course publication and response assessment

## Course publication

The authenticated review page is `/settings/course-review`. Settings shows its link only to an active verified reviewer/operator. Student metadata cannot grant this access. A trusted operator provisions `learning_editor_access` with real identity, subject scope, qualification evidence, verifier identity and expiry. No real reviewer has been provisioned by this implementation. The synthetic contract-test identities and credentials were rolled back.

1. Verify educators outside the app and record appropriate qualification references, subject scope and expiry through the trusted provisioning process. Never use the service key in the browser or Next.js.
2. The operator submits the current course. The server constructs an immutable snapshot containing prerequisites, activities, answer specifications, sources, hints and examples. The version hash also binds the current response rubrics and checking capabilities.
3. Two independent, qualified educators inspect that exact version. The registrant cannot self-review. Reviewers see only their own reviews, so the initial ratings are not contaminated by reading another review.
4. Each review checks accuracy, instructional source rights, teaching quality, accessibility and safety. Any unchecked criterion records a revision request. Notes and a conflict-of-interest declaration are required.
5. The operator publishes only after two current approvals with no revision request. A content, rubric or checking-boundary change needs a new version. Reviews are permanent; revise the content rather than overwrite a disputed review.
6. Withdraw a problematic version with a reason. Students can read/save existing drafts, but new instruction, checks and help on that version stop. Expired/revoked qualifications suspend an otherwise published version immediately on the next request.

Publication RPCs compare the expected full payload as well as the hash. A claimed hash attached to different source content cannot grant publication. Direct student writes, role self-assignment, anonymous access and cross-role operations are denied. Private uploaded textbooks are not republished through this original-content catalog.

Current course activities remain drafts with an educator-review-pending label. This workflow does not create a reviewed curriculum merely by existing. Operator/reviewer UI under real accounts still requires acceptance testing after those people are verified.

## Response rubrics

Reading, writing, science explanations and history practice have a collapsed Review guide. Each criterion has four descriptive anchors. Multiple supported interpretations are permitted. Exact quotations, spelling, dialect, length or keyword counts do not automatically determine the quality score. The existing automatic checks remain explicitly ungraded for interpretation.

`scripts/learning/assess-responses.ts` prepares and adjudicates original-catalog response packets. Run it through Node with `--conditions=react-server --import=tsx`. It performs no provider call or automatic network transfer.

- `packets <private-directory>` reads `response-inputs.json`: an array of activity IDs, saved confirmed problem states and exact-response review permissions. It creates a new `packets` directory exclusively, preserving earlier distributed packets. `operator-packets.json` retains permission references; `reviewer-packets.json` omits those operator-only references. `assessment-template.json` is incomplete until actual educators fill it.
- `report <private-directory>` reads the operator packets plus `assessments.json`, `reviewers.json` and current `permissions.json`. It writes a new timestamped report; earlier reports remain unchanged.

The contracts are `responseReviewPermissionSchema`, `responseReviewerSchema` and `responseAssessmentSchema`. Student response permissions must include actual consent evidence, intended reviewers, exact response hash, activity version, rights reference and expiry. Identity/consent/qualification reference strings are not proof by themselves: the trusted operator must verify their sources. Do not commit these private files or place them in public assets.

Every criterion needs a rationale; positive ratings need exact response spans. Missing/changed evidence, incomplete criteria, duplicate reviewers, conflict, expired/revoked credentials or changed current permissions invalidate results. Two independent ratings must agree, or a third educator must adjudicate the exact two prior assessment IDs after both exist. An unobserved criterion remains pending.

This is an offline research review workflow. It does not automatically share student work, message an educator, assign a school grade, update mastery or grant training consent. Private-material response exports are currently rejected. Live assigned-review queues and educator delivery of student-specific feedback remain future integration work.
