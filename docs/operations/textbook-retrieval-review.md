# Textbook retrieval review

This offline workflow prepares exact public-textbook passages for independent educator judgments. It makes no language-model call, sends no message to reviewers and does not turn an engineering search probe into a human label.

## Prepare questions

The default `packets` command uses the 22 visible engineering probes from the chapter catalog and synthetic out-of-scope questions. Their labels are useful for regression work, not an unbiased held-out quality estimate.

For a separate educator-authored sample, create an ignored private directory and place `review-queries.json` there. It must be an array of 1–100 distinct `{ "id": "...", "query": "..." }` objects. Keep its original questions sealed from search tuning. The software marks these packets `operator_supplied`; it cannot prove the questions are genuinely held out or educator-authored. The operator must preserve that provenance and the intended study split outside this script. Use only licensed public reference content in this workflow; private student uploads have a different permission boundary.

Run:

```text
npm run learning:retrieval-review -- packets <private-directory>
```

If the directory does not contain `review-queries.json`, the script uses the visible engineering probes. The current 22-packet run is in `artifacts/learning-engine/research/retrieval-review/packets/`. That directory is ignored by Git. The run created no educator judgments or qualification records.

`packets/reviewer-packets.json` contains each question, up to 12 pooled exact passages, source chapter/page links and source hashes. It omits which search condition produced or ranked each passage. `packets/operator-mappings.json` holds the lexical and curriculum-graph rankings and must stay with the operator. `packets/assessment-template.json` is an empty form guide; its blank identity, qualification, date and rationale fields are not valid reviews. The generated packet directory is created once and never overwritten.

The original PDF page should be opened and checked for each rated passage. Page links use the pinned local edition. A quote or matching word in the extracted text alone does not establish answerability, figure interpretation or factual correctness.

## Collect and assess reviews

Each packet needs two distinct current mathematics educators. Save their independent judgments in `<private-directory>/assessments.json`, matching the `retrievalJudgmentSchema` in `lib/learning-engine/retrieval-review.ts`. Keep their trusted qualification records in `<private-directory>/reviewers.json`, matching `responseReviewerSchema`. Each reviewer rates every candidate's relevance from 0 to 2, indicates whether the candidate supports the requested answer, records the question's answerability from the **candidate pool**, and writes a substantive rationale. `originalPagesChecked` must be true only when the reviewer actually checked the original pages.

If the first two ratings disagree, a separate third educator adjudicates after both ratings and names their exact review IDs in `resolves`. Expired or revoked qualifications, conflicts of interest, duplicate reviewers, changed packet/mapping hashes, unchecked pages or incomplete candidate ratings invalidate the report. Credential reference strings alone do not prove real people or qualifications; the operator must verify them from the trusted system.

Run:

```text
npm run learning:retrieval-review -- report <private-directory>
```

The command writes a new timestamped report and exits nonzero until every packet has a valid agreement or adjudication. A complete report summarizes passage precision, recall relative to the pooled candidates, first-result relevance, answerable-question hits, clean abstention on questions labeled unanswerable from that pool, and paired lexical/graph wins, losses and ties. Every metric includes its count or denominator. Incomplete or invalid reports have no summary. The report marks reviewer identity as requiring external verification and the passage pool as nonexhaustive. `not_answerable_from_candidates` says nothing definitive about the entire textbook. A higher score on one small sample is not a validated method improvement.

Do not use these reviews as student grades, training permission, automatic course approval or evidence of learning effects. For a strong RAG claim, review new questions and source families that were not used to tune search, record the chosen protocol before scoring, compare alternatives at fixed budgets and report misses and ambiguity alongside matches.
