# Universal High School Assignment and Course Mode Plan

Status: Implemented and verified

Date: 2026-07-30

## Decision

Diana will support two related but distinct products:

1. **Student Companion** remains the default. It imports real assignments, selects a useful workspace, protects student authorship, and helps the student complete work assigned by an existing teacher.
2. **Course Mode** is a separately governed school feature. A verified teacher or district controls standards, lesson publication, assessments, grading rules, safety protocols, and final grades. AI may draft or recommend, but it cannot publish a course, authorize a hazardous activity, or assign a final grade.

Diana will continue to use Canvas or Google Classroom as the official delivery and grade destination when connected. Course Mode is an instructional layer, not a replacement SIS.

## Why the Current Model Must Change

The current assignment resolver combines subject and workspace into one mode. That is too restrictive.

Examples:

- Accounting needs a spreadsheet, ledger, equations, and written explanation.
- Geography needs a map, data table, chart, and written argument.
- Engineering needs a design notebook, calculations, CAD preview, bill of materials, and safety checks.
- Music needs notation, playback, recording, and reflection.

The replacement model separates:

- `subject_domain`: what discipline governs the work.
- `task_intent`: what the student is being asked to do.
- `artifact_type`: what must be submitted.
- `capabilities`: which native tools the workspace needs.
- `safety_class`: what restrictions and approvals apply.
- `standards_alignment`: which official learning outcomes apply.

The current 12 workspace modes remain as a migration and fallback layer until all assignments use the new profile contract.

## Governing Standards

State or district standards are authoritative. National frameworks are defaults and crosswalk sources when a local framework is unavailable.

- Standards interchange: 1EdTech CASE 1.1
  - https://www.1edtech.org/standards/case
- Assessment interchange: 1EdTech QTI
  - https://www.1edtech.org/standards/qti/index
- PE and health: SHAPE America National PE and Health Education Standards
  - https://apeas.shapeamerica.org/APEAS3/standards/pe/new-pe-standards.aspx
  - https://shapeamerica.org/standards/health/new-he-standards/
- Accounting and business: NBEA 2023 National Standards for Business Education
  - https://nbea.org/page/BusinessEdStandards
- Economics: Council for Economic Education K-12 Economics Standards
  - https://www.councilforeconed.org/wp-content/uploads/National-Content-Standards-in-K%E2%80%9312-Economics-3rd-Edition.pdf
- Geography: Geography for Life, grades 9-12
  - https://education.nationalgeographic.org/resource/geography-standard-1/
- Engineering and technology: ITEEA Standards for Technological and Engineering Literacy
  - https://www.iteea.org/stel
- Career and technical education: Modernized National Career Clusters Framework
  - https://careertech.org/resource/guidebook-modernized-national-career-clusters-framework/
- Workplace and trade safety: NIOSH Youth@Work Talking Safety
  - https://www.cdc.gov/niosh/docs/2015-161/default.html
- Music, theatre, and dance: National Core Arts Standards
  - https://www.nationalartsstandards.org/
- Science and engineering practices: NGSS
  - https://www.nextgenscience.org/
- Computer science: CSTA K-12 Computer Science Standards
  - https://csteachers.org/k12standards/

Licensed standards must be referenced by identifier and source. Diana must not reproduce licensed text without permission.

## Shared Capability Registry

Every capability implements the same contract:

- Typed input and output schema
- Autosave and revision history
- Canonical export artifact
- Accessibility adapter
- Authorship events
- AI-policy behavior for red, yellow, and green modes
- Source and rubric anchors
- Offline or unavailable state
- Security and resource limits
- Subject-specific review adapter

Initial capabilities:

| Capability | Purpose |
|---|---|
| `rich_text` | Essays, explanations, reflections, scripts |
| `equation_editor` | Accessible math entry using LaTeX and MathML |
| `graphing` | Functions, tables, statistics, and economic graphs |
| `spreadsheet` | Formulas, tables, sorting, charts, and data validation |
| `accounting_ledger` | Journal entries, T-accounts, trial balance, statements |
| `map_workspace` | Layers, markers, scale, legend, coordinates, and spatial evidence |
| `code_runner` | Isolated Python and JavaScript execution with tests |
| `drawing_canvas` | Diagrams, sketches, markups, and storyboards |
| `cad_workspace` | Dimensioned sketches, model preview, revisions, and export |
| `music_notation` | MusicXML rendering, notation annotation, and playback |
| `audio_review` | Recording, transcript, waveform, and timestamped feedback |
| `video_review` | Recording/upload, timeline markers, reflection, and rubric evidence |
| `data_lab` | Measurements, units, uncertainty, tables, charts, and calculations |
| `design_notebook` | Brief, constraints, alternatives, tests, revisions, and evidence |
| `performance_log` | Practice plan, evidence, self-reflection, and teacher verification |

Recommended implementation candidates:

- Equation entry and symbolic representation: MathLive and CortexJS Compute Engine
- Maps: MapLibre GL JS with GeoJSON and Turf operations
- Spreadsheet: Univer Sheets after license and bundle-size review
- Music display: OpenSheetMusicDisplay for MusicXML
- Code: existing Pyodide path for Python; Web Worker isolation for JavaScript; separate sandbox service for compiled languages
- CAD: begin with safe 2D constraints and 3D file viewing; gate full parametric editing behind a technical spike

No third-party library is adopted until accessibility, licensing, offline behavior, bundle size, and security are documented.

## Subject Pack Map

### PE and Health

Primary capabilities:

- Performance log
- Audio/video reflection
- Health response
- Goal and recovery log
- Teacher verification

Method:

- Skill acquisition, practice evidence, reflection, and student-owned goals
- Factual health literacy and source evaluation
- No body shape, weight, calorie, appearance, or biometric ranking
- No diagnosis, treatment, or emergency substitution

Safety:

- Teacher-defined activity boundaries
- Injury and emergency redirect
- No computer-vision scoring of bodies or movement quality
- Student may submit evidence, but a teacher validates physical performance

### Accounting

Primary capabilities:

- Spreadsheet
- Accounting ledger
- Equation editor
- Written explanation

Method:

- Transaction analysis
- Debit and credit classification
- Journal to ledger to trial balance to statements
- Deterministic balance and formula checks
- Audit trail for every cell and correction

Safety and integrity:

- AI cannot invent missing financial figures
- Financial examples must be labeled instructional, not personal financial advice
- Formula results are deterministic and reproducible

### Economics

Primary capabilities:

- Graphing
- Spreadsheet and data table
- Source-aware writing
- Model comparison

Method:

- Define assumptions
- Build or interpret a model
- Connect evidence to a claim
- Distinguish positive statements from normative judgments
- Cite data provenance and date

### Geography and Map Work

Primary capabilities:

- Interactive map
- Drawing and annotation
- Data table and chart
- Source-aware writing

Method:

- Location, scale, projection, region, spatial patterns, and human-environment interaction
- Every submitted map requires title, legend, scale where appropriate, source attribution, and an explanation of what the map shows

Privacy:

- Student home and precise live location are never exposed by default
- Geolocation requires a specific task, explicit permission, and coarse-location fallback

### Engineering

Primary capabilities:

- Design notebook
- Equation editor and graphing
- Spreadsheet and bill of materials
- Drawing/CAD
- Test evidence

Method:

- Define problem and stakeholders
- Record criteria and constraints
- Generate alternatives
- Select using evidence
- Prototype, test, revise, and explain tradeoffs

### Trade and CTE Classes

Primary capabilities:

- Procedure checklist
- Design notebook
- Measurement and data tools
- Photo/video evidence
- Teacher sign-off

Method:

- State or district program-of-study standards
- Industry credential alignment when licensed and authorized
- Skill demonstration separated from written reflection

Safety:

- NIOSH core safety competencies
- Hazard identification, controls, PPE, emergency plan, and worker rights
- No AI-generated machine operation, electrical, chemical, medical, or shop procedure
- Hazardous steps must come from an approved teacher or manufacturer source
- Teacher unlock and in-person verification for restricted activities

### Music Notation and Performance

Primary capabilities:

- MusicXML notation display
- Notation annotation
- Playback
- Audio recording and timestamped review
- Practice log

Method:

- Create, perform, respond, and connect
- Theory checks remain deterministic
- Performance review references the teacher rubric and specific timestamps

### Theatre and Dance

Primary capabilities:

- Script or choreography notebook
- Rehearsal plan
- Audio/video recording
- Timeline annotation
- Reflection and rubric evidence

Method:

- Intent, technique, revision, performance, response, and connection
- Student chooses which recording is submitted

Safety and dignity:

- No appearance, attractiveness, body-type, emotion, disability, or identity inference
- No automated final performance score
- Teacher or student supplies evaluative judgments

### CAD

Primary capabilities:

- Dimensioned 2D sketch
- Constraint checklist
- 3D model viewer
- Revision comparison
- Export package

Delivery order:

1. View and annotate teacher-provided STL, OBJ, and glTF files.
2. Create dimensioned 2D sketches and constraints.
3. Add safe parametric primitives and export.
4. Evaluate STEP support and full parametric editing only after the browser CAD spike.

### Advanced Technical Labs

Primary capabilities:

- Approved procedure viewer
- Safety protocol
- Data lab
- Equation editor and graphing
- Lab notebook
- Claim-evidence-reasoning report

Method:

- Question, variables, procedure provenance, observations, uncertainty, analysis, conclusion, and limitations

Safety:

- AI may explain an approved procedure but cannot create or modify hazardous procedures
- Required PPE, supervision, age restrictions, and disposal steps come from approved sources
- Missing safety metadata blocks the practical activity while leaving theory and planning available

## Course Mode Domain Model

Add versioned, tenant-scoped records for:

- `standards_frameworks`
- `standard_items`
- `standard_associations`
- `courses`
- `course_enrollments`
- `course_units`
- `lessons`
- `lesson_resources`
- `learning_objectives`
- `objective_alignments`
- `prerequisite_edges`
- `assessment_blueprints`
- `assessment_items`
- `assessment_attempts`
- `criterion_scores`
- `assignment_profiles`
- `artifact_documents`
- `artifact_blocks`
- `artifact_revisions`
- `tool_runs`
- `media_assets`
- `media_annotations`
- `safety_protocols`
- `safety_acknowledgments`
- `teacher_approvals`

Critical rules:

- Standards, lessons, rubrics, assessments, and safety protocols are versioned.
- Published content is immutable. Revisions create a new version.
- Teacher and district roles are verified and separate from student consent-based sharing.
- RLS is tenant, role, course, and enrollment aware.
- AI outputs are drafts until a verified teacher approves publication.
- Final grades are deterministic from approved scoring rules and remain teacher-confirmed.
- The LMS remains the external grade and submission system of record when connected.

## Course Lifecycle

1. Select jurisdiction, grade band, subject, course level, and official standards version.
2. Import or create a syllabus and district pacing requirements.
3. Map standards to units and prerequisite concepts.
4. Teacher reviews coverage gaps and approves the course map.
5. Build versioned lessons with objectives, sources, accessibility variants, practice, and checks for understanding.
6. Import or author assessments using QTI-compatible item contracts.
7. Teacher approves assessment blueprint, scoring rules, and release conditions.
8. Student completes lessons and assignments in the same capability-based workspace.
9. Mastery receives evidence from completed work and approved assessments.
10. Diana recommends reteaching or extension; teacher approves material changes.
11. Teacher confirms grades and syncs them to the connected LMS.

## Delivery Roadmap

### Phase 0: Governance and Evaluation Baseline

- Ratify Student Companion versus Course Mode boundaries.
- Define verified teacher, district, and student permissions.
- Build a representative evaluation set across every requested subject.
- Record licensing and provenance rules for standards and course content.
- Threat-model code execution, precise location, minors' media, CAD, and hazardous labs.

Exit gate:

- Product, safety, privacy, and academic-integrity decisions are written and approved.

### Phase 1: Composable Assignment Core

- Replace mode-only routing with the domain, intent, artifact, capability, safety, and standards profile.
- Add typed artifact blocks and revisions.
- Migrate existing 12 modes without losing saved work.
- Extend canonical export, autosave, recovery, authorship, and LMS delivery to all capability blocks.

Exit gate:

- Existing assignments behave unchanged and mixed-capability fixtures persist, reopen, review, export, and submit correctly.

### Phase 2: Standards, Objectives, and Prerequisites

- Implement CASE-compatible framework import.
- Support state/district framework selection and versioning.
- Link objectives to assignments, lessons, rubric criteria, and mastery evidence.
- Replace name-only mastery concepts with objective-linked concepts where available.
- Add prerequisite graph validation and teacher override.

Exit gate:

- A course coverage report can prove which standards are taught, practiced, assessed, or still uncovered.

### Phase 3: Deterministic Native Tools

- Equation editor and accessible math serialization
- Graphing workspace
- Spreadsheet and accounting ledger
- Existing Python runner integrated into the assignment workspace
- JavaScript runner in an isolated Web Worker
- Resource, network, time, and output limits

Pilot subjects:

- Accounting
- Economics
- Advanced math and quantitative science
- Introductory coding

Exit gate:

- Tool outputs are reproducible, revisioned, exportable, keyboard accessible, and cannot silently modify student work.

### Phase 4: Visual, Spatial, and Media Tools

- MapLibre map workspace
- Drawing and annotation canvas
- MusicXML rendering and annotation
- Audio recorder, transcript, waveform, and timestamped review
- Video upload/recording, timeline markers, reflection, and rubric anchors

Pilot subjects:

- Geography
- Music
- Theatre
- Dance

Exit gate:

- Media consent, retention, deletion, captions/transcripts, and privacy controls pass minor-safety review.

### Phase 5: Safety-Bound Technical Tools

- Engineering design notebook
- CAD viewer and dimensioned sketch pilot
- Lab data workspace
- Approved-procedure and safety protocol engine
- Teacher unlock and sign-off

Pilot subjects:

- Engineering
- One low-risk CTE pathway
- Biology or environmental-science lab

Exit gate:

- Diana cannot generate a hazardous procedure, bypass an approval, or treat AI feedback as physical skill certification.

### Phase 6: Subject Packs

- Package subject-specific methodology, artifact schemas, review rules, standards crosswalks, and teacher rubrics.
- Add PE/health only after the physical-safety and dignity controls pass.
- Add additional CTE pathways one at a time because procedures and age restrictions differ.

Exit gate:

- Every requested domain passes its golden assignment set with no generic fallback unless the assignment itself is intentionally general.

### Phase 7: Course Mode Pilot

- Course map and standards coverage
- Unit and lesson authoring
- Teacher approval workflow
- QTI-compatible formative assessment
- Prerequisite-aware recommendations
- Teacher-confirmed grading and LMS sync

Recommended first pilot:

- Economics or accounting, because the artifacts and scoring can be made deterministic without physical safety exposure.

Exit gate:

- A verified teacher can publish one semester unit, enroll a test student, deliver lessons and assignments, review evidence, confirm a grade, and sync results without AI acting as the final authority.

### Phase 8: Expansion and School Readiness

- State and district standards packs
- Additional CTE pathways
- Summative assessment security
- School tenancy and administrative audit
- Data retention, review, amendment, and export
- Accessibility and accommodation validation across every tool

## Verification Matrix

Each subject pack must include:

- 20 representative assignments
- At least 5 imported PDFs or worksheets
- At least 3 mixed-capability projects
- Green, yellow, and red AI-policy behavior
- No-source and partial-source states
- Save, close, reopen, export, and LMS delivery
- Keyboard-only, screen-reader, reduced-motion, dyslexia, and zoom checks
- Teacher-rubric and standards evidence
- Authorship and provenance inspection
- Adversarial prompts and unsafe-source instructions

Course Mode additionally requires:

- Standards coverage and version-migration tests
- Prerequisite cycle detection
- Assessment item validity and deterministic scoring
- Teacher approval and role-escalation tests
- Grade-change audit history
- Duplicate submission and duplicate grading prevention
- Media consent and deletion tests
- Code sandbox escape and resource-exhaustion testing
- CTE and lab safety red-team scenarios

## Release Metrics

- At least 95 percent correct subject and capability selection on the reference set
- 100 percent preservation of existing saved assignment work during migration
- 100 percent of submitted artifact blocks represented in the canonical export
- Zero unapproved AI publication, final grading, or hazardous-procedure generation
- Zero cross-student, cross-course, or cross-tenant data access
- All standards and rubric claims trace to a versioned identifier or source
- All AI reviews cite student work, assignment directions, rubric, or approved source material
- Every native tool has a non-AI usable path
- Serious and critical accessibility findings are zero on supported workflows

## Implementation Result

All planned foundation, native-tool, safety, subject-pack, and Course Mode phases
are implemented. The release boundary remains explicit:

- Student Companion helps with imported teacher assignments.
- Course Mode requires a verified teacher and published standards, lessons,
  assessments, grading rules, safety protocols, and student enrollment.
- AI cannot publish instruction, authorize practical work, or assign a final
  grade.
- Practical lab and trade steps remain locked until the student acknowledges the
  current approved protocol and every teacher, age, and supervision gate passes.
- Canvas and Google Classroom capabilities are reported honestly, and direct
  submission or grade sync always requires the supported provider capability and
  explicit confirmation.

## Verification Evidence

Verified on 2026-07-30:

- 21 subject domains, 20 scenarios each, and 420 total subject-routing scenarios
  cover source states, AI policies, accessibility modes, adversarial input,
  save/reopen, export, LMS handoff, authorship, rubrics, and standards evidence.
- A verified teacher published standards-aligned units, lessons, an assessment,
  an assignment, a safety protocol, a grading rule, and a complete course.
- An enrolled student completed a lesson, opened the generated technical-lab
  workspace, acknowledged the protocol, and remained blocked from practical work
  without teacher unlock and active in-person supervision.
- Deterministic assessment scoring produced 2/2, teacher confirmation produced a
  100 percent assessment record, and the teacher-confirmed final course grade and
  grade-change audit were persisted.
- Duplicate assessment start returned the existing attempt.
- An unverified student LMS connection was rejected for Course Mode.
- Cross-student assignment reads and unenrolled course reads returned no rows.
  A direct cross-assignment media insert was rejected by row-level security after
  the hardening migration.
- Python and JavaScript run in killable browser workers with source, time,
  output, file, and network boundaries. Real-browser execution succeeded;
  direct network access and JavaScript dynamic imports were blocked.
- Assignment recordings require explicit student consent, remain private, can be
  removed by the student, and expire through a protected 180-day retention job.
- Authenticated browser checks across 320, 375, 768, and 1280 pixels found one
  visible navigation system, one main landmark, no footer, no horizontal
  overflow, and zero serious or critical WCAG findings on the five core routes.
- TypeScript, lint, production build, tone audit, 203 test files, and 1,136 tests
  passed. Linked Supabase migrations match through `20260730231000`; database
  lint reports only the pre-existing `purge_due_deletion_requests` shadowed
  variable warning.
