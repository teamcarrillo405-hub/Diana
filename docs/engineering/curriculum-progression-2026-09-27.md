# Curriculum progression release

## Implemented scope

The September 27 curriculum contains 112 original activities in 67 active practice collections, referencing 67 competencies. There are 68 framework course records, including the textbook reference record. The first progression addition preserved all 87 preceding activity hashes; the subsequent prerequisite addition also preserves all 107 hashes present immediately before it.

Twenty new activities apply selected concepts in fresh contexts across Math, Reading, English, Science and History at middle school, high school, introductory college and advanced college. They have separate course records so adding their sources does not invalidate earlier saved work or publication hashes. All remain pending educator review; source material is original and excluded from model training. Historical and historiographical records explicitly identify themselves as authored simulations.

The activities address a real limitation of the preceding release: the learner could repeat an original question but had no linked opportunity to apply its idea in a changed setting. Examples include successive discounts, conditioning on a changed group, accumulation from a rate, transformed expectation, a different narrator, changed measurement constructs, responses to new review concerns, dilution, signed transport and incompatible archival counting units.

Five additional original prerequisite activities close the exact-skill navigation gaps identified by the path audit: polynomial structure, textual evidence, central idea and summary, purpose/claims/reasoning, and comparison. The polynomial exercise asks for a linear coefficient after distribution; checking this number does not claim to verify the whole expansion. Reading exercises retain explicit quotation-correspondence and human-interpretation boundaries. All remain pending educator review and excluded from training.

## Connected student flow

- **Next question** opens the next available activity in the selected collection.
- **Try a new context** appears only on the specific original question that matches the authored application. A collection can contain several concepts; sharing a collection does not create a transfer link.
- **Return to practice** returns from that application to its exact original question.
- **What this practices** includes optional review links for exact prerequisite skills that have an available activity. A missing activity is stated explicitly rather than replaced by an unrelated task.

All these controls use the same save-before-switch operation as ordinary question selection. An unsuccessful save retains the draft and prevents navigation. Successful navigation synchronizes subject, level, collection and question selection, and moves focus to the opened question. Handwriting/speech confirmation and provenance follow the existing persistence contract.

Paths are computed from the server-filtered available catalog. Withdrawn or suspended collections cannot become navigation targets, including when a suspended saved response is separately returned for preservation. The browser receives IDs, titles and prerequisite relationships only; the navigation schema imports no answer specifications or worked examples.

Live review caught an initial routing defect: every question in a mixed-topic collection offered the same application. This was corrected using 20 explicit original-activity IDs, with each mapping's conceptual relationship recorded in code. For example, the conditional-probability application is linked only from the conditional-probability question, and returns to that exact question; polynomial and average-rate siblings receive no unrelated application link. Missing origins or targets do not fall back to another sibling. All 112 activity hashes remain unchanged by this navigation-only correction.

These are optional study paths. They do not lock questions, promote a learner to another level, mark a course complete, infer mastery or interpret a matched answer as a learning gain. The new contexts are authored practice, not independent assessment evidence, because hints and worked examples remain available.

## Engineering verification

- Focused curriculum, API and component regression run after adding prerequisites: 90 tests across six files passed. Two further routing regressions cover all 20 conceptual pairings and unavailable endpoints.
- TypeScript and scoped ESLint passed.
- Network-disabled curriculum gate checks every activity and includes each computed path. The final inventory has 112 activities; all prerequisite relationships have an exact-skill activity in the complete available catalog.
- API tests verify that suspended saved drafts do not re-enter the available path graph.
- Component tests verify save order, updated selection, focus and retained drafts when path navigation cannot save.
- Prior activity hash compatibility covers all 87 previously released activities and the full 107-activity pre-foundation snapshot.
- A withdrawal regression verifies that unavailable foundational content restores an explicit gap rather than an unsafe navigation link.
- API assertions reproduce the mixed algebra/probability collection defect and verify exact forward and return links after correction.

These checks establish implementation behavior and bounded answers, not educator approval or measured learning effectiveness. Production rollout and live browser acceptance are recorded by the parent release report.

## Remaining curriculum acceptance

This release does not certify full courses from sixth grade through college. The matrix remains `partial_authored`; standards alignment, authentic history survey materials, long-form literature, laboratory work, full disciplinary sequences, formal proof feedback and comprehensive composition portfolios remain outside its claim. A linked prerequisite is a bounded practice opportunity, not evidence that a prerequisite course is fully taught or that the learner has mastered it. Real educators must review content and progression; consented learner evidence must establish educational outcomes.
