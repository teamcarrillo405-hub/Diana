# Integrated evaluation family preparation

## What was missing

The existing `integrated-grounding-evaluation` contract checks supplied family and
component identifiers against an exclusion list. It cannot derive their relationships.
The existing `integrated-review-packet` prepares response review after execution.
The curriculum coverage planner counts product activities, not evaluation cases.

`lib/learning-engine/integrated-family-provenance.ts` adds the missing pre-generation
metadata contract, connected-component checks, source/reference/rubric hash bindings,
submitted family review bindings and evaluation coverage accounting. It does not
replace those tools or change the frozen evaluation threshold.

## Boundary

The input contains no questions, source text, expected answers, rubric text or model
outputs. It accepts only explicit metadata supplied by an authorized custodian.
The CLI reads one named metadata file and creates one new report. It never follows
source paths, searches corpora, imports protected cases, runs retrieval, invokes
models, activates enforcement, or writes an evaluation manifest.

No actual evaluation families were authored or reviewed during this implementation.
Tests contain opaque protocol identifiers and synthetic digests. They are development
engineering fixtures, not teaching examples or sealed evaluation cases. The implementer
has inherited engineering context and does not attest fresh-context authorship.

## Declared provenance

The strict `integrated-family-proposal-v1` proposal contains:

- A scope of authored, confirmed text with document-disjoint evaluation.
- A custodian inventory declaration and exposure-audit digest/reference.
- Author identity, context disclosure, exposure reference and freshness declaration.
- Artifact raw, canonical and normalized digests, with named serialization contracts;
  role, lineage parent IDs, document/template/reasoning family IDs, aliases, source
  asset digests and provenance/exposure references.
- Declared synthetic sources with asset, version and content hashes, permitted-use
  and confirmation references. Source truth remains an external review responsibility.
- Case metadata: family, subject, band, model-visible input digest, source IDs,
  private reference/rubric digests and answerability. Missing-input cases may have
  no sources. Other answerability categories require declared sources.
- Explicit sampling allocations with required case/component counts and a decision
  reference. The tool supplies no sample-size recommendation or new success threshold.

The containing submission includes related/uncertain edges and family reviews.
Each review binds the digest of `{ proposal, relationships }` and records a distinct reviewer identity,
context/exposure disclosure, decision reference, five family-comparison dimensions,
and source-truth/task-rubric review declarations. A proposal or relationship edit invalidates old
reviews. Submission integrity is pinned separately by the operator-supplied canonical
SHA-256. Canonical hashing uses the existing `integratedHash` contract, not raw-file
SHA-256. Hashes and identity strings do not authenticate a person or review.

## Deterministic behavior

The checker joins artifacts when they share raw/canonical/normalized digests,
source assets, any registered family identifier/alias, a provenance parent, or a
related/uncertain edge. It derives component IDs from sorted member IDs and records
the graph digest. Unknown parents/relationships and incompatible normalization or
canonical serialization contracts are rejected. This requires the custodian to
supply comparable opaque digests for prior artifacts; the tool cannot normalize
protected text itself. Undisclosed aliases and omitted ancestry remain undetectable.

Case input, private-reference and private-rubric pins are SHA-256 of their exact
original content bytes. The input pin includes the actual model-visible input
serialization. These pins join matching raw artifact pins and other case pins
before components are derived. This catches exact prior-content reuse hidden by
new family labels. Canonical and normalized hashes are not compared to raw case
pins. Identities must already be NFC and cannot contain leading/trailing whitespace,
Unicode control or format characters, or default-ignorable characters. Invalid
identities are rejected without silent normalization. Graph ordering uses a total
code-unit comparison rather than locale-dependent collation.

Every prior role (`train`, `development`, `visible_probe`, `consumed_test`,
`reserved_test`) is excluded from evaluation. `candidate_development` is also excluded.
An evaluation component touching any other partition is blocked. Reusing a reference
asset therefore blocks the document-disjoint scope; same-source generalization requires
a separate declared scope and is not implemented by weakening this check.

Missing, stale, self, related or uncertain family reviews cannot make a family
unblocked. Incomplete inventory and a missing fresh-author declaration remain pending.
Uncertain graph edges conservatively join components, so linked evaluation candidates
cannot be counted as independent components. Their submitted reviews still must
explicitly address each comparison dimension.

The report includes `manifestFamilyBindings` with the existing integrated manifest's
family field names and derived component IDs. These are metadata projections, not
permission to seal a manifest. A custodian must bind the actual source and case bytes,
complete exclusions, verify authority, freeze the rubric/allocation, and independently
check compatibility with the existing execution manifest before a run is prepared.

## Author and reviewer packet

The output packet lists candidate families, component membership once per component,
declared sources, input/reference/rubric hashes, coverage and submitted reviews or
missing-review slots. It provides a concrete request for the authorized custodian to
supply the matching bytes through a separate channel. Actual authors and reviewers
must inspect source truth, solution structure, misconception, task demand and rubric.
They must record uncertain relationships rather than relabel them as independent.

Private reference/rubric content remains separate from model-visible inputs. Do not
send this metadata packet, exclusion graph or private review materials to a teaching
provider. The packet is metadata-only, not anonymous or encrypted: it includes author
and reviewer IDs and exposure references. `mode: 0600` is used when creating the local
report, but filesystem ACLs on Windows remain the operator's responsibility.

Response review continues to use `integrated-review-packet` after actual execution.
This family packet performs no response scoring and grants no review credentials.

## Coverage

The report always lists the product planner's 24 subject/band cells:

| Subjects | Bands |
| --- | --- |
| math, reading, english, science, history, computing | middle_school, high_school, college_intro, college_advanced |

Only explicitly allocated cells are in scope. Every cell reports declared evaluation
cases/components, submitted unblocked cases/components, development-only case count,
and deficits against the explicit allocation. Multiple cases in one component count
once toward component coverage. Cases outside the declared allocation are rejected.
Figure-dependent cases are outside this authored-confirmed-text contract. Additional
modality or curriculum coverage must be separately specified and validated.

These are sampling counts, not evidence of grade appropriateness, educator validation
or learning benefit. No actual corpus was supplied here: **zero new evaluation cases,
zero reviewed families, and zero subject/band cells qualified**. A 24-cell reporting
capability does not mean 24-cell evaluation coverage.

## CLI and tests

```powershell
npx tsx scripts/learning/integrated-family-provenance.ts inspect <metadata.json> --submission-sha256 <trusted-canonical-digest> <new-report.json>
npx vitest run lib/learning-engine/integrated-family-provenance.test.ts
```

The CLI limits explicit input to a regular JSON file of at most 16 MiB, rejects
unknown fields, mismatched digests and overwriting existing output. It returns nonzero
for invalid or pending metadata. Exit zero means only `submitted_metadata_consistent`.
`familyAuthorityVerified`, `semanticFamilyIndependenceProven`, `thresholdMet` and
`productionEligible` are always false. They cannot be enabled through input fields.

Remaining external work is a complete custodian registry with comparable hashes,
eligible author/source selection, actual private references/rubrics, independent
family review and a preregistered sampling allocation. This tool makes those inputs
concrete and checks their consistency; it cannot manufacture them.
