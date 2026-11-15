# Worksheet task identity during indexing

`indexAssignmentSource` now selects the actual owned `assignment_problems.id`
alongside its source fields. `buildWorksheetTaskIndex` keeps each UUID beside
the page created from that exact database row. A task UUID is never recovered
from a displayed problem number, text similarity, page position or learning
exercise ID. Reordering or renumbering rows changes document layout/version,
but retains the task UUID. Editing wording changes its source snapshot and
retains the task UUID and historical assistance identity.

The sidecar records the SHA-256 of raw UTF-8 `problem_text`, separately from
the hash of generated page text, document version and eventual exercise
reference/specification hash. Learning exercise/block hashes remain a
different namespace from worksheet UUIDs. No metadata schema, source page
schema or existing `learning_store_document` payload changed.

## Optional migration-gated persistence

`DIANA_DURABLE_TASK_BINDING_ENABLED=true` enables the sidecar only after a
successful existing document store. The default is off. The authenticated
SSR client calls only the narrow worksheet wrappers:

1. `learning_register_worksheet_task(p_assignment, p_problem, p_snapshot_sha256)`
2. `learning_bind_worksheet_source(p_assignment, p_problem, p_source_version,
   p_source_page, p_source_snapshot_sha256)`

The wrappers derive ownership from `auth.uid()` and cannot grant fresh
independent-learning trust. Worksheet registrations remain
`legacy_unresolved`. Generic task registration, exercise binding and
assistance operations remain service-only and are outside this indexing
helper. No service credential is read or passed through this path.

SQL independently verifies current owned problem identity, raw wording hash,
confirmed provenance, the owned stored document and exact generated page.
Mappings are immutable for a source version/page. Reindexing cannot reassign
an existing page mapping to a different task. The initial task snapshot and
assistance history persist across wording edits; a new source version does
not make an assisted task independent again.

Unknown/imported provenance and generated work steps remain unbound. Only
manual or student-confirmed source text with `unit_type=problem` qualifies
for an origin mapping. Registration without a successful matching source
receipt is not a completed binding. Missing migration RPCs, conflicting
receipts or unavailable storage fail closed for binding while preserving
existing successful document-index behavior. The helper returns explicit
bound/unresolved counts internally; indexing does not claim binding success
in its existing user-facing response.

## Later exercise/reference binding

Indexing occurs before the separate exercise-preparation Edge Function.
This change does not modify that frozen function, claim an exercise already
exists, or fabricate a specification hash. The new SQL sidecar preserves the
origin link for later service-only exercise binding, which must verify the
actual stored exercise specification, block/page provenance, source version
and reference digest. Unsupported or ambiguous exercise provenance stays
unbound. The initial migration supports only its declared worksheet
`equation_value` construction; reading and other kinds require an explicit
validated binding path, not a guessed identity.

No durable assistance gate is activated by this indexing change alone.
Deployment, migration execution, and enabling the server flag are separate
steps. Missing old mappings cannot be backfilled by guessing from labels;
reindex the current owned worksheet rows through the explicit identity path.

## Verification

Eight tests across `task-binding.test.ts` and `task-binding-index.test.ts`
cover identity preservation through reordering, renumbering and edits;
duplicate/foreign/missing identities; unknown provenance; altered pages;
wrong receipts; missing migration; unchanged existing RPC/result shape;
new wrapper order after document persistence; and no binding after failed
document storage. Tests use mocked RPCs and prove no network fetches. They
do not claim a deployed or executed database migration.
