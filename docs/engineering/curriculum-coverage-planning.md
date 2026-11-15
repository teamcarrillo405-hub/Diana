# Curriculum coverage planning

`lib/learning-engine/curriculum-coverage-plan.ts` adds a pure engineering inventory and sequence planner. It does not change authored course data, activity versions, publication decisions, student navigation, assessment eligibility or mastery.

## Gaps addressed

The existing `courseCoverageReport` enumerates five subjects and omits computing. It counts activities in occupied subject/level cells but does not denominator every skill mapped by a course. A course with one activity can therefore look populated while several declared skills have no activity.

The existing `buildCoursePaths` intentionally offers navigation in supplied activity order. Its foundation lookup can choose an activity at another level when an exact-level match is absent. The new planner provides a separate authoring/coverage view: prerequisites precede dependents, unavailable prerequisites remain visible, and another level is an explicit alternative requiring a decision.

## Interface

```ts
planningActivityMetadata(
  validatedActivities: readonly VersionedActivity[],
  exactTransferActivityIds: ReadonlySet<string>,
): PlanningActivity[]

planCurriculumCoverage(
  framework: CourseFramework,
  activities: readonly PlanningActivity[],
  publications: readonly PlanningPublication[],
)
```

`PlanningActivity` contains only `id`, `courseId`, `skillId`, `subject`, `level`, `versionId` and `role` (`instruction` or `transfer`). The projection omits prompts, source passages, hints, examples, answer specifications and rubrics. Unknown transfer IDs are rejected. Roles must come from the exact catalog transfer mapping, not an ID naming convention or a content-similarity guess.

`PlanningPublication` contains `courseId` and `status`. Supply statuses from the existing content-hash-matched publication lookup for the same validated catalog snapshot. The planner cannot authenticate caller-supplied statuses. Missing status is `unrecorded` and supplies no available instruction. Existing navigation treats both `draft` and `published` as available; the planner preserves that distinction and excludes `withdrawn` and `suspended` from proposals.

Suggested caller sequence:

1. Load and validate the authored framework and activities with existing catalog tooling.
2. Resolve publication states against that exact snapshot with existing publication tooling.
3. Project activity metadata using the exact transfer mapping.
4. Call the planner and persist/report its output as an engineering inventory.

The new module does not import or execute catalog datasets, research corpora, provider adapters or model calls. The existing offline `learning:course-gate` command now consumes it. No student route consumes the report or changes navigation.

## Offline command and generated inventory

```powershell
npm run learning:course-gate -- --coverage-only
```

This mode loads and validates the existing authored catalog, projects metadata and writes an exclusive JSON report under `artifacts/learning-engine/curriculum-coverage/`. It does not run tutor-response checks. Its status is `reported` and `gateExecuted` is false. It records the exact framework hash and metadata inventory hash, including every original activity version ID.

The default `npm run learning:course-gate` retains its existing tutor-fixture pass/fail conditions and adds `curriculumPlanning` as advisory reporting. Coverage deficits do not automatically fail that existing gate, and a passed tutor gate does not certify curriculum completeness. The older `coverage` field remains unchanged for compatibility.

Both modes make no database query. Publication evidence is explicitly `not_loaded_offline`; no status is assumed to be draft or published. Consequently an offline report cannot establish runtime availability. It can still distinguish missing authored instruction, different-level-only alternatives and instruction whose availability has not been observed.

Observed metadata report on 2026-09-29: `artifacts/learning-engine/curriculum-coverage/coverage-1790657427144.json`:

| Inventory measure | Observed count |
| --- | ---: |
| Framework course maps / authored activities | 68 / 112 |
| Subject/band cells | 24 |
| Unmapped cells | 4, all computing bands |
| Mapped skill slots / slots with authored activities | 113 / 81 |
| Missing mapped skill slots | 32 |
| Course maps without activities | 1, `precalculus-reference` |
| External prerequisite slots | 134 |
| External foundations with only other-level instruction | 70 |
| Same-level foundations with unobserved availability | 64 |
| External foundations with no authored instruction anywhere | 0 |
| Network attempts / hosted publication states loaded | 0 / 0 |

These are declared-map counts, not a curriculum completeness score. Of the 32 missing mapped slots, 28 belong to `precalculus-reference`; the remaining four are one each in `english-middle-school`, `science-middle-school`, `english-high-school` and `english-college-intro`. The reference course map deliberately participates in the denominator even though it has no authored course activities. The 70 different-level slots identify decisions needed about prerequisite bridging; they do not imply that a student cannot use those activities or that the prerequisite map is educator-validated.

## Output and interpretation

- The matrix always contains six subjects × four bands: math, reading, English, science, history and computing, from grades 6–8 through advanced college. Empty cells remain `unmapped`.
- Coverage uses **mapped skill slots per course**. Repeated mapping in multiple units of one course counts once; the same skill mapped in two courses counts twice because each course has its own content gap.
- `authoredSkillSlots` counts mapped skills with any authored activity. `availableInstructionSkillSlots` requires instruction in that course and an available publication observation. Transfer-only inventory does not establish foundational instruction.
- Every course reports its missing mapped skills and external prerequisite IDs. Every sequence step includes exact activity IDs/versions, unresolved prerequisite IDs and any alternative activities at other levels.
- Sequence ordering uses a topological sort of the prerequisite graph. Declared unit order breaks ties among mapped skills; activity choice prefers the same course, then sorts stable IDs. Reordering the activity input does not change the result.
- `availableSequenceComplete` means the supplied available instruction covers the declared skill/prerequisite sequence. It requires an available target course. It does not mean the student has completed it, is ready for it, or should be promoted.
- `mappedInventoryComplete` means every declared mapped skill has some authored activity. It is not a statement that the curriculum map itself is complete.
- Courses under the existing `other` domain are listed separately in `outsideTargetCourseIds`; they do not disappear into a target subject.

The planner rejects duplicate identities/relationships, unknown prerequisites, cycles, incompatible activity/course/skill bindings, unknown publication courses and extra activity fields. Graph validation is iterative, so a long prerequisite chain does not overflow the call stack. Input counts and total planned steps are bounded.

## Verification and limits

Run:

```powershell
npx vitest run lib/learning-engine/curriculum-coverage-plan.test.ts
```

Tests use opaque graph and identity fixtures only. They do not load held-out cases, author educational activities, or open existing catalog problem text. They cover absent computing cells, denominators, prerequisite order, cross-level gaps, withdrawn/unrecorded publication, transfer-only inventory, malformed graphs, metadata separation, input immutability and long chains.

`completeCurriculum`, `educatorApproved`, `standardsAligned`, `learnerReadinessAssessed` and `publicationAuthorityVerified` are always false. Determining whether the maps and prerequisites reflect a complete, accurate and appropriately sequenced curriculum remains a separate content and educator review. This module neither creates that evidence nor requires its fabrication while educator validation is deferred.
