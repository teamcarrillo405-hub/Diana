# Public textbook source-to-competency review

This offline workflow turns **keyword proposals** into exact, human-reviewable mapping packets. It currently accepts only Diana's pinned, licensed *Precalculus: An Investigation of Functions* chapter PDFs. It does not export a student's uploaded material, call an AI provider, issue a standards alignment or publish a runtime course mapping.

## Rights and provenance boundary

The script rehashes each original local chapter PDF, checks its manifest lock and re-extracts the original pages. The structured document must match the shipped chapter version and page offsets. A packet binds the exact source version, PDF asset hash, page and text span, competency ID/revision/objective hash, lexical suggestion hash and a current operator-issued review assignment hash. The report repeats the PDF extraction and checks the packet against the then-current source, framework proposal and assignment. The shared evaluator requires the current framework and original structured documents, compares the complete current competency to the packet, and recomputes its exact source proposal. Rehashing an altered embedded objective cannot preserve a valid review. Reviewer IDs remain in the operator assignment file rather than the distributed packet.

The public source's cataloged CC BY-SA 4.0 rights permit this bounded review with attribution. Its `trainingPermission` remains `excluded`. Public licensing does **not** grant a right to disclose private student material or use source text for model training. The builder rejects any other owner, class, assignment scope, subject, document ID, edition, license state, unconfirmed extraction or changed anchor. It does not offer a private-material override. A later private-source path needs a separate exact owner/institution disclosure permission and review design.

## Operator workflow

Use a private, Git-ignored directory such as `artifacts/learning-engine/research/competency-mapping-review`. The script makes no network calls and writes output files once. `npm run learning:mapping-review -- candidates <directory> <chapter>` lists current lexical candidates for one chapter. A candidate is only a proposal. Review the proposed page and competency before selecting it.

Create `<directory>/mapping-selections.json` as an array of 1–500 distinct objects:

```json
[{"chapter":1,"blockId":"<64-character block hash>","skillId":"math.functions","assignmentId":"review-2026-1"}]
```

Create `<directory>/assignments.json` from a **trusted operator-controlled review assignment store**, matching `mappingReviewAssignmentSchema`. Each entry must bind one current source version/content/PDF asset hash, the intended reviewer IDs, issuing operator, issue date, expiry and revocation status. The issuer cannot review their own assignment. A handwritten JSON string is not proof of identity or authority; verify it outside this tool. The candidate list and current chapter index supply the hashes. Distinct real educators must already be verified before packets are distributed. Do not invent reviewer IDs or qualification references to fill the form.

Run `npm run learning:mapping-review -- packets <directory>`. This creates `packets/reviewer-packets.json` and `packets/assessment-template.json` once. The template is deliberately incomplete. Share only the relevant public-source packet with each assigned reviewer. Retain the original chapter PDF and license attribution with it. The packet omits the matched keyword terms and score, but reviewers can see the proposed competency because that is what they assess.

Save independent judgments in `<directory>/assessments.json` and trusted current qualification records in `<directory>/reviewers.json`, matching `mappingReviewJudgmentSchema` and `responseReviewerSchema`. Each assigned mathematics educator must check the original page and the exact competency objective, select `supported`, `unsupported` or `uncertain`, and explain the decision. A `supported` rating also names an exact text span in the packet quote. Two distinct, current, conflict-free raters must agree. If they disagree, a third assigned educator decides after both and names both exact review IDs in `resolves`. They must not read one another's ratings before the independent phase.

Run `npm run learning:mapping-review -- report <directory>`. The command writes a new timestamped report and exits nonzero while incomplete or invalid. Missing/changed source files, assignments, qualifications, unchecked pages, changed review spans, duplicate raters and unbound adjudication invalidate the result. Current assignment revocation and credential expiry are checked again, so a prior report is not permanent authority.

## Meaning of a complete report

`review_complete` records independent descriptive agreement on these exact public-source mappings. `supported` can be considered by the separate trusted course-publication process after the operator verifies real people, qualifications and rights. This tool deliberately returns `publicationEligible: false`: it does not modify the course framework, grant standards alignment, infer learner mastery, or establish better student outcomes. The report declares external identity verification as incomplete because local JSON cannot verify a person. There are currently no real educator mapping judgments in the repository.
