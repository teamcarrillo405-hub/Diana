# Blinded response review, 2026-09-27

Reviewed all 20 cases and 40 responses using only the supplied audit packet as model-output evidence. Ratings were finalized without opening the model key or training reports. This is supplementary AI engineering review, not educator approval or a blinded human study.

Comparative preferences: **A 8, B 7, neither 5, tie 0**. Positions are counterbalanced, so these totals do not identify a model winner. Individual preferences do not imply the preferred response meets the full contract.

The intended behavior is an exact source excerpt and one focused next-step question, with the prescribed abstention when evidence is missing. Only **test-missing-2/A** correctly produces both required abstention lines among the eight responses to four missing-evidence cases.

## Concrete findings

- **Fabricated identity:** test-missing-3/B invents a source quotation naming “a skilled artist named Diana,” then identifies Diana as the painter.
- **Fabricated attribution:** test-source-date/B suggests “The New York Times” as the photograph's source without evidence.
- **Fabricated letter content:** test-missing-1/B claims the letter contains “followed by a short exact quote from SOURCE.”
- **Mathematical misguidance:** test-negative-product/A switches to a negative-times-negative rule for a negative-times-positive expression. Test-missing-0/A says density is equivalent to mass.
- **Unsupported inference:** test-missing-2/B asks how to derive wind speed from temperature-over-time data. Test-missing-3/A presupposes the paragraph mentions a painter.
- **Unavailable follow-up evidence:** test-cell-boundary/B asks which substance is regulated, although no substance is named. Test-earth-rotation/B refers to “these” answer options without providing any.
- **Clear useful examples:** test-median/A asks the learner to find the middle of the quoted ordered data; test-graph-axis/A asks which axes represent time and distance; test-revision-detail/A elicits a more precise action verb.
- **Common contract gaps:** accurate paraphrases labeled EVIDENCE, fragments too weak to support reasoning, NEXT statements instead of questions, repeated learner questions, and unnecessary requests for another source when the supplied text is sufficient.

## Case preferences

| Case | Preference | Main reason |
| --- | --- | --- |
| test-unit-rate | neither | A repeats the learner question with an incomplete evidence fragment; B asks for another source despite sufficient evidence. |
| test-negative-product | B | B avoids A's misleading sign-rule guidance, but its question is underspecified. |
| test-median | A | A supplies exact relevant evidence and asks the learner to locate the middle without providing the median. |
| test-graph-axis | A | A gives faithful evidence and a focused question about matching quantities to axes. |
| test-tone | B | B at least asks the learner to reason about tone; A's NEXT is a statement. |
| test-contrast-signal | B | B remains relevant to contrast; A falsely claims missing evidence. |
| test-revision-detail | A | A quotes the revision principle and asks the learner to choose an action verb. |
| test-quoted-support | B | B provides exact evidence and a question; A omits NEXT and alters the supplied detail. |
| test-force-balance | A | A gives a relevant comparison step; B introduces an unsupported motion scenario. |
| test-cell-boundary | B | B faithfully quotes the function, although its next question requests detail absent from SOURCE. |
| test-earth-rotation | A | A offers a coherent if broad explanatory question; B refers to answer options that do not exist. |
| test-sampling | A | A asks a useful question tied to the actual sampled group; B unnecessarily abstains. |
| test-archive-audience | B | B lets the learner identify the audience; A states the result in NEXT. |
| test-corroboration | B | B stays concise and grounded in checking another record; neither NEXT is a question. |
| test-map-key | neither | A's NEXT is circular and not a question; B's question confuses the source's symbol mapping. |
| test-source-date | A | A remains grounded in the date limitation; B invents an external source. |
| test-missing-0 | neither | Neither acknowledges that mass alone cannot determine volume; A additionally confuses density and mass. |
| test-missing-1 | neither | A diverts to an unsupported identity question; B invents quoted letter content. |
| test-missing-2 | A | A correctly recognizes missing evidence and uses the required next question. |
| test-missing-3 | neither | A presupposes painter information exists; B fabricates both painter and quotation. |

The companion JSON contains separate ratings and concrete notes for every response. Next evaluation work should distinguish exact-quotation compliance, semantic fidelity, answerable instructional questions, and justified abstention. Missing-evidence behavior needs particular attention.

This small synthetic review establishes no learning gains, proprietary-method advantage, or production readiness. It changes no activation or release decision. Unblinding may now be performed against the saved ratings.

