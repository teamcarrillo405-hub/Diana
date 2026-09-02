# Subject Profile Registry

## Purpose
Subject profiles let Diana support different grades, schools, teachers, and assignments without hardcoding each school. Diana reads the assignment evidence, then chooses the subject domain, output type, native tools, review method, and workspace.

## Current Domains
Mathematics, English language arts, science, social studies, world language, computer science, visual arts, music, theatre, dance, physical education, health, accounting, economics, geography, engineering, trade CTE, CAD, advanced technical labs, interdisciplinary, and general.

## Required Profile Fields
- Subject domain
- Task intents
- Artifact type
- Native capabilities
- Safety class
- Standards alignment when available
- Confidence and reasons

## Completion Criteria
Every profile must have:
- a workspace strategy
- a student output definition
- a Diana review action
- visual supports
- native tools
- help behavior for 30/45/60/75 percent support
- at least one test case

## Shared Workspace Contract
All profiles use the locked Algebra workspace shell. A profile changes the unit strategy, primary specialist tool, optional tools, review context, and completion rule. It does not create another page layout.

Every subject retains the universal work surface for typing, touch or pen handwriting, uploaded image/PDF evidence, dictation, and live voice. Specialist tools supplement that surface and never replace it.

## Automatic Primary Tools
- Mathematics: equation editor
- Science and advanced technical labs: data lab
- World language: audio review
- Computer science: code runner
- Accounting: accounting ledger
- Economics: graphing
- Geography: map workspace
- Engineering: design notebook
- Trade CTE: approved procedure checklist
- CAD: CAD workspace
- Visual arts: drawing canvas
- Music: music notation
- Theatre, dance, and physical education: performance log

English language arts, social studies, health, interdisciplinary work, and general assignments open the universal work surface first.

## Truthful Capability Rule
Every specialist capability declares one current readiness state plus a concrete limitation:

- `beta`: the bounded workflow is enabled and must pass its runtime health check.
- `prototype`: usable for controlled evaluation, but not represented as beta-certified.
- `limited`: a deliberately narrow feature with an honest external handoff where needed.
- `unavailable`: hidden as a specialist tool; the universal typed and ink surface is used instead.

Runtime health may lower a capability from its registered state, but it may never promote one. Any unhealthy, unsupported, or unavailable specialist tool falls back to the universal typed and ink surface without losing student work. Diana must not describe bounded tools as full replacements for professional CAD, GIS, spreadsheet, music engraving, IDE, or laboratory systems.

Static capability readiness is not runtime health evidence. A specialist runtime is `healthy` only when Diana has a timestamped active-runtime, runtime-probe, or provider-canary observation. `unknown`, `degraded`, and `unavailable` all require the universal typed and ink fallback. Canonical preview, download, LMS, and receipt projections retain the bounded specialist payload for integrity while presenting it through the fallback path unless health is explicitly established.

Every new specialist artifact context carries bounded assignment identity, academic band when known, rubric anchors, and source anchors. The same typed context projection is available to Ask Diana, assignment review, and export consumers so those surfaces do not reconstruct or silently drop assignment evidence.

The legacy `ready | limited` field remains only as a compatibility projection for older saved records. New product and release decisions use `prototype | beta | limited | unavailable`. The current registry and executable coverage matrix are audited in `lib/assignment-capabilities.ts`, `lib/specialist-artifacts/runtime-health.ts`, and `lib/assignment-universal-coverage.test.ts`.
