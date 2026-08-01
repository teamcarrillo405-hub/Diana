import type { AssignmentCapability } from "@/lib/assignment-capabilities";
import type {
  AssignmentArtifactType,
  SubjectDomain,
} from "@/lib/assignment-profile";

export const SUBJECT_PACK_IDS = [
  "mathematics",
  "science",
  "english_writing",
  "history_social_studies",
  "world_languages",
  "computer_science",
  "visual_arts",
  "general_projects",
  "physical_education",
  "health",
  "accounting",
  "economics",
  "geography_map_work",
  "engineering",
  "trade_cte",
  "music",
  "theatre",
  "dance",
  "cad",
  "advanced_technical_labs",
] as const;

export type SubjectPackId = (typeof SUBJECT_PACK_IDS)[number];

export type SubjectPackArtifactExpectation = {
  artifactType: AssignmentArtifactType;
  requiredEvidence: readonly string[];
};

export type SubjectPackReviewAuthority =
  | "deterministic"
  | "student_and_teacher"
  | "verified_teacher";

export type SubjectPackReviewRule = {
  id: string;
  authority: SubjectPackReviewAuthority;
  requirement: string;
};

export type StandardsFrameworkHint = {
  framework: string;
  sourceUri: string | null;
  selectionHint: string;
};

export type SubjectPackDefinition = {
  id: SubjectPackId;
  label: string;
  aliases: readonly string[];
  methodology: readonly string[];
  requiredCapabilities: readonly AssignmentCapability[];
  artifactExpectations: readonly SubjectPackArtifactExpectation[];
  reviewRules: readonly SubjectPackReviewRule[];
  standardsFrameworkHints: readonly StandardsFrameworkHint[];
  safetyDignityConstraints: readonly string[];
  native: true;
  allowGenericFallback: false;
};

type SubjectPackInput = Omit<
  SubjectPackDefinition,
  "native" | "allowGenericFallback"
>;

function defineSubjectPack(definition: SubjectPackInput): SubjectPackDefinition {
  return Object.freeze({
    ...definition,
    native: true,
    allowGenericFallback: false,
  });
}

export const SUBJECT_PACK_REGISTRY: Readonly<
  Record<SubjectPackId, SubjectPackDefinition>
> = Object.freeze({
  mathematics: defineSubjectPack({
    id: "mathematics",
    label: "Mathematics",
    aliases: ["math", "advanced math", "algebra", "geometry", "calculus", "statistics"],
    methodology: [
      "Interpret the problem, choose representations, solve, justify, and check the result.",
      "Connect symbolic, graphical, numerical, and verbal representations.",
      "Preserve student reasoning separately from deterministic calculation checks.",
    ],
    requiredCapabilities: ["equation_editor", "graphing", "rich_text"],
    artifactExpectations: [{
      artifactType: "problem_set",
      requiredEvidence: ["Student work", "Final response", "Reasonableness or verification check"],
    }],
    reviewRules: [
      {
        id: "math-deterministic-check",
        authority: "deterministic",
        requirement: "Check equivalent expressions, units, domains, and approved numeric tolerances without replacing student reasoning.",
      },
      {
        id: "math-reasoning-review",
        authority: "verified_teacher",
        requirement: "A teacher confirms rubric judgments about explanation, modeling choices, and mathematical argument.",
      },
    ],
    standardsFrameworkHints: [{
      framework: "Common Core State Standards for Mathematics or the adopted state framework",
      sourceUri: "https://www.thecorestandards.org/Math/",
      selectionHint: "Select the adopted course, grade band, practice standards, and framework version through CASE identifiers when available.",
    }],
    safetyDignityConstraints: [
      "Do not infer ability, effort, or intelligence from an error pattern or response speed.",
      "Keep hints neutral and preserve a non-AI path for calculation, notation, and graphing.",
    ],
  }),

  science: defineSubjectPack({
    id: "science",
    label: "Science",
    aliases: ["biology", "chemistry", "physics", "earth science", "environmental science"],
    methodology: [
      "Ask a testable question, identify variables, use approved methods, record observations, analyze uncertainty, and support a conclusion.",
      "Connect models and explanations to reproducible evidence and source provenance.",
      "Separate theory and planning from practical work that requires safety approval.",
    ],
    requiredCapabilities: [
      "procedure_checklist",
      "data_lab",
      "equation_editor",
      "graphing",
      "spreadsheet",
      "rich_text",
    ],
    artifactExpectations: [{
      artifactType: "lab_report",
      requiredEvidence: ["Question or purpose", "Procedure provenance", "Data with units", "Analysis", "Conclusion and limitations"],
    }],
    reviewRules: [
      {
        id: "science-data-check",
        authority: "deterministic",
        requirement: "Validate units, calculations, table structure, and approved tolerances while retaining raw observations.",
      },
      {
        id: "science-claim-review",
        authority: "verified_teacher",
        requirement: "A teacher reviews procedure compliance and whether the conclusion is supported by the recorded evidence.",
      },
    ],
    standardsFrameworkHints: [{
      framework: "Next Generation Science Standards",
      sourceUri: "https://www.nextgenscience.org/",
      selectionHint: "Align disciplinary core ideas, science and engineering practices, and crosscutting concepts by identifier and adopted version.",
    }],
    safetyDignityConstraints: [
      "Do not generate or modify hazardous procedures; practical steps must come from an approved teacher or manufacturer source.",
      "Missing protocol, PPE, age, disposal, or supervision metadata blocks practical work while theory remains available.",
    ],
  }),

  english_writing: defineSubjectPack({
    id: "english_writing",
    label: "English and Writing",
    aliases: ["english", "english language arts", "ela", "writing", "literature", "reading"],
    methodology: [
      "Read or research closely, form a claim, select evidence, draft, revise, and reflect.",
      "Distinguish source material, student language, quotations, and AI-assisted suggestions.",
      "Use genre, audience, purpose, and rubric criteria to guide revision.",
    ],
    requiredCapabilities: ["rich_text"],
    artifactExpectations: [
      {
        artifactType: "essay",
        requiredEvidence: ["Student-authored claim", "Source-grounded evidence", "Revision history", "Citations when required"],
      },
      {
        artifactType: "reading_response",
        requiredEvidence: ["Text reference", "Interpretation", "Explanation of significance"],
      },
    ],
    reviewRules: [
      {
        id: "writing-source-check",
        authority: "deterministic",
        requirement: "Check required sections, citation presence, and source anchors without assigning a writing-quality score.",
      },
      {
        id: "writing-rubric-review",
        authority: "verified_teacher",
        requirement: "A teacher confirms rubric judgments about argument, organization, evidence, style, and conventions.",
      },
    ],
    standardsFrameworkHints: [{
      framework: "Common Core State Standards for English Language Arts or the adopted state framework",
      sourceUri: "https://www.thecorestandards.org/ELA-Literacy/",
      selectionHint: "Select reading, writing, speaking/listening, and language standards by course and framework version.",
    }],
    safetyDignityConstraints: [
      "Protect student voice and never present generated prose as student-authored work.",
      "Do not infer disability, identity, character, or intelligence from language use or reading performance.",
    ],
  }),

  history_social_studies: defineSubjectPack({
    id: "history_social_studies",
    label: "History and Social Studies",
    aliases: ["history", "social studies", "civics", "government", "historical studies"],
    methodology: [
      "Source, contextualize, corroborate, and evaluate historical or civic evidence.",
      "Build claims that distinguish evidence, interpretation, uncertainty, and counterevidence.",
      "Preserve source provenance and represent contested topics with documented perspectives.",
    ],
    requiredCapabilities: ["rich_text"],
    artifactExpectations: [
      {
        artifactType: "dbq",
        requiredEvidence: ["Source analysis", "Context", "Claim", "Corroborating evidence", "Citation trail"],
      },
      {
        artifactType: "research_paper",
        requiredEvidence: ["Research question", "Source notes", "Argument", "Bibliography"],
      },
    ],
    reviewRules: [
      {
        id: "history-provenance-check",
        authority: "deterministic",
        requirement: "Verify that required claims and quotations retain source anchors and citation metadata.",
      },
      {
        id: "history-interpretation-review",
        authority: "verified_teacher",
        requirement: "A teacher reviews sourcing, contextualization, corroboration, and the quality of the historical or civic argument.",
      },
    ],
    standardsFrameworkHints: [{
      framework: "C3 Framework for Social Studies State Standards and the adopted state framework",
      sourceUri: "https://www.socialstudies.org/standards/c3",
      selectionHint: "Use adopted inquiry, civics, economics, geography, and history indicators with local course requirements.",
    }],
    safetyDignityConstraints: [
      "Do not stereotype protected groups or flatten contested histories into a single unsupported narrative.",
      "Use age-appropriate handling for violence, oppression, identity, and current political conflict.",
    ],
  }),

  world_languages: defineSubjectPack({
    id: "world_languages",
    label: "World Languages",
    aliases: ["world language", "languages", "foreign language", "modern languages", "classical languages"],
    methodology: [
      "Develop interpretive, interpersonal, and presentational communication in context.",
      "Practice form, meaning, pronunciation, cultural context, revision, and reflection.",
      "Treat language variation and accent as communicative evidence, not a proxy for identity or intelligence.",
    ],
    requiredCapabilities: ["rich_text", "audio_review", "video_review"],
    artifactExpectations: [{
      artifactType: "language_response",
      requiredEvidence: ["Student attempt", "Prompt or source context", "Revision notes", "Recording only when required and consented"],
    }],
    reviewRules: [
      {
        id: "language-form-check",
        authority: "deterministic",
        requirement: "Apply only approved vocabulary, form, and objective checks that have unambiguous scoring rules.",
      },
      {
        id: "language-communication-review",
        authority: "verified_teacher",
        requirement: "A teacher reviews comprehensibility, interaction, cultural context, and open-ended performance evidence.",
      },
    ],
    standardsFrameworkHints: [{
      framework: "ACTFL World-Readiness Standards for Learning Languages",
      sourceUri: "https://www.actfl.org/educator-resources/world-readiness-standards-for-learning-languages",
      selectionHint: "Select communication mode, proficiency target, language, and adopted local framework version.",
    }],
    safetyDignityConstraints: [
      "Do not infer nationality, ethnicity, immigration status, disability, or intelligence from language or accent.",
      "Recordings require student control, consent, retention limits, captions or transcripts, and deletion controls.",
    ],
  }),

  computer_science: defineSubjectPack({
    id: "computer_science",
    label: "Computer Science",
    aliases: ["computer science", "coding", "programming", "software development"],
    methodology: [
      "Clarify requirements, design an approach, implement, test, debug, document, and reflect.",
      "Keep student code, generated suggestions, execution output, and test evidence distinguishable.",
      "Use reproducible fixtures and explicit resource limits for deterministic checks.",
    ],
    requiredCapabilities: ["code_runner", "rich_text"],
    artifactExpectations: [{
      artifactType: "source_code",
      requiredEvidence: ["Student code", "Requirements mapping", "Tests and output", "Attribution for reused code", "Reflection"],
    }],
    reviewRules: [
      {
        id: "code-test-review",
        authority: "deterministic",
        requirement: "Run approved tests in an isolated, resource-limited environment with network access disabled by default.",
      },
      {
        id: "code-design-review",
        authority: "verified_teacher",
        requirement: "A teacher reviews design choices, explanation, maintainability, and work not covered by deterministic tests.",
      },
    ],
    standardsFrameworkHints: [{
      framework: "CSTA K-12 Computer Science Standards",
      sourceUri: "https://csteachers.org/k12standards/",
      selectionHint: "Select the high-school level, concept, practice, and adopted state or district crosswalk.",
    }],
    safetyDignityConstraints: [
      "Execute code only in an isolated browser worker with source-size, time, output, file, and network limits.",
      "Do not expose secrets, personal data, cross-student files, or privileged host APIs to student code.",
    ],
  }),

  visual_arts: defineSubjectPack({
    id: "visual_arts",
    label: "Visual Arts",
    aliases: ["visual arts", "art", "drawing", "painting", "sculpture", "photography"],
    methodology: [
      "Investigate a brief, develop alternatives, create, document process, revise, present, and reflect.",
      "Connect choices in medium, composition, technique, and context to student intent.",
      "Preserve process evidence and student ownership of the submitted work.",
    ],
    requiredCapabilities: ["drawing_canvas", "design_notebook", "rich_text"],
    artifactExpectations: [{
      artifactType: "visual_art",
      requiredEvidence: ["Brief or intent", "Process evidence", "Final work", "Artist statement", "Source attribution"],
    }],
    reviewRules: [
      {
        id: "art-completeness-check",
        authority: "deterministic",
        requirement: "Check required files, process stages, labels, and source attributions without scoring aesthetic quality.",
      },
      {
        id: "art-rubric-review",
        authority: "student_and_teacher",
        requirement: "Student reflection and teacher review address intent, craft, revision, presentation, and rubric evidence.",
      },
    ],
    standardsFrameworkHints: [{
      framework: "National Core Arts Standards: Visual Arts",
      sourceUri: "https://www.nationalartsstandards.org/",
      selectionHint: "Select creating, presenting, responding, and connecting standards for the course level.",
    }],
    safetyDignityConstraints: [
      "Do not infer identity, emotion, disability, or mental state from artwork.",
      "Do not automate an aesthetic ranking or final score; use the approved teacher rubric and student-stated intent.",
    ],
  }),

  general_projects: defineSubjectPack({
    id: "general_projects",
    label: "General and Interdisciplinary Projects",
    aliases: ["general", "general project", "general projects", "interdisciplinary", "interdisciplinary project", "capstone"],
    methodology: [
      "Define the goal, audience, deliverables, criteria, milestones, sources, and evidence of completion.",
      "Choose capabilities from the actual task instead of forcing a single subject editor.",
      "Document contributions, revisions, provenance, and reflection across disciplines.",
    ],
    requiredCapabilities: ["design_notebook", "rich_text"],
    artifactExpectations: [{
      artifactType: "project_package",
      requiredEvidence: ["Goal and audience", "Deliverables", "Plan and milestones", "Source provenance", "Final evidence", "Reflection"],
    }],
    reviewRules: [
      {
        id: "project-deliverable-check",
        authority: "deterministic",
        requirement: "Check the approved deliverable manifest, required files, source anchors, and completion state.",
      },
      {
        id: "project-rubric-review",
        authority: "verified_teacher",
        requirement: "A teacher reviews quality, disciplinary correctness, collaboration evidence, and the approved project rubric.",
      },
    ],
    standardsFrameworkHints: [{
      framework: "Tenant-approved CASE frameworks and local interdisciplinary outcomes",
      sourceUri: "https://www.1edtech.org/standards/case",
      selectionHint: "Compose versioned standards from each governing discipline; do not invent a crosswalk when none is approved.",
    }],
    safetyDignityConstraints: [
      "Intentional general work uses this native pack; unknown named subjects must not be silently routed here.",
      "Apply the strictest safety, privacy, media, code, and location controls required by any selected capability.",
    ],
  }),

  physical_education: defineSubjectPack({
    id: "physical_education",
    label: "Physical Education",
    aliases: ["physical education", "pe", "pe class", "physical activity"],
    methodology: [
      "Set student-owned skill or participation goals, practice within teacher boundaries, collect chosen evidence, and reflect on recovery and learning.",
      "Focus on skill acquisition, knowledge, safe participation, and personal progress without comparison or body ranking.",
      "Keep student evidence separate from teacher verification of physical performance.",
    ],
    requiredCapabilities: ["performance_log", "audio_review", "video_review", "rich_text"],
    artifactExpectations: [{
      artifactType: "pe_performance_log",
      requiredEvidence: ["Student-owned goal", "Practice log", "Reflection", "Chosen evidence", "Teacher verification when performance is assessed"],
    }],
    reviewRules: [
      {
        id: "pe-log-check",
        authority: "deterministic",
        requirement: "Check required log entries and evidence consent without evaluating a body, movement image, or physical performance.",
      },
      {
        id: "pe-performance-review",
        authority: "verified_teacher",
        requirement: "A teacher validates physical skill evidence and any summative performance judgment.",
      },
    ],
    standardsFrameworkHints: [{
      framework: "SHAPE America National Physical Education Standards",
      sourceUri: "https://apeas.shapeamerica.org/APEAS3/standards/pe/new-pe-standards.aspx",
      selectionHint: "Select the adopted high-school standard, course outcome, local activity boundary, and framework version.",
    }],
    safetyDignityConstraints: [
      "No body shape, weight, calories, appearance, biometric ranking, or student-to-student fitness ranking.",
      "No computer-vision scoring of bodies or movement quality; injury or emergency language redirects to an adult or emergency service.",
      "Practical activity requires teacher-defined boundaries and any required unlock, supervision, or accommodation.",
    ],
  }),

  health: defineSubjectPack({
    id: "health",
    label: "Health Education",
    aliases: ["health", "health education", "health class", "wellness education", "health literacy"],
    methodology: [
      "Build factual health literacy through source evaluation, decision skills, communication, advocacy, and student-owned wellbeing goals.",
      "Distinguish instruction from diagnosis, treatment, counseling, or emergency response.",
      "Use scenarios and reflection without requiring disclosure of personal health information.",
    ],
    requiredCapabilities: ["rich_text", "performance_log", "audio_review"],
    artifactExpectations: [{
      artifactType: "health_reflection",
      requiredEvidence: ["Source evaluation", "Health concept or skill", "Scenario-based reasoning", "Student-controlled reflection"],
    }],
    reviewRules: [
      {
        id: "health-source-check",
        authority: "deterministic",
        requirement: "Check citation, source date, and required health-literacy elements without evaluating personal health.",
      },
      {
        id: "health-content-review",
        authority: "verified_teacher",
        requirement: "A teacher confirms factual accuracy, age appropriateness, rubric evidence, and required safeguarding response.",
      },
    ],
    standardsFrameworkHints: [{
      framework: "SHAPE America National Health Education Standards",
      sourceUri: "https://shapeamerica.org/standards/health/new-he-standards/",
      selectionHint: "Select the adopted high-school health skill, content area, local policy, and framework version.",
    }],
    safetyDignityConstraints: [
      "Do not diagnose, prescribe, replace emergency care, or require disclosure of personal or family health information.",
      "No body, weight, calorie, appearance, disability, mental-health, or biometric ranking.",
      "Use approved crisis and safeguarding escalation paths when a response indicates immediate risk.",
    ],
  }),

  accounting: defineSubjectPack({
    id: "accounting",
    label: "Accounting",
    aliases: ["accounting", "bookkeeping", "financial accounting"],
    methodology: [
      "Analyze transactions, classify debits and credits, post journal entries, reconcile ledgers, prepare a trial balance, and produce statements.",
      "Use deterministic formulas and preserve an audit trail for every entry, formula, and correction.",
      "Explain assumptions and never fill an absent source figure with an invented value.",
    ],
    requiredCapabilities: ["spreadsheet", "accounting_ledger", "equation_editor", "rich_text"],
    artifactExpectations: [{
      artifactType: "accounting_workbook",
      requiredEvidence: ["Source transactions", "Journal", "Ledger", "Trial balance", "Statements or required schedule", "Correction history"],
    }],
    reviewRules: [
      {
        id: "accounting-balance-check",
        authority: "deterministic",
        requirement: "Recalculate formulas, debit-credit equality, postings, balances, and approved accounting equations from source figures.",
      },
      {
        id: "accounting-classification-review",
        authority: "verified_teacher",
        requirement: "A teacher confirms ambiguous classifications, adjusting entries, explanations, and rubric judgments.",
      },
    ],
    standardsFrameworkHints: [{
      framework: "NBEA National Standards for Business Education: Accounting",
      sourceUri: "https://nbea.org/page/BusinessEdStandards",
      selectionHint: "Use licensed or authorized identifiers for the adopted accounting course and standard version.",
    }],
    safetyDignityConstraints: [
      "Do not invent financial figures or silently repair source data.",
      "Label examples as instructional and not personal financial, tax, legal, or investment advice.",
    ],
  }),

  economics: defineSubjectPack({
    id: "economics",
    label: "Economics",
    aliases: ["economics", "microeconomics", "macroeconomics", "economic analysis"],
    methodology: [
      "State assumptions, build or interpret a model, inspect data, compare outcomes, and connect evidence to a claim.",
      "Distinguish positive analysis from normative judgment and identify model limitations.",
      "Cite data provenance, units, geography, population, and date.",
    ],
    requiredCapabilities: ["graphing", "spreadsheet", "rich_text"],
    artifactExpectations: [{
      artifactType: "economic_analysis",
      requiredEvidence: ["Question", "Model and assumptions", "Graph or data", "Data provenance and date", "Claim", "Limitations"],
    }],
    reviewRules: [
      {
        id: "economics-model-check",
        authority: "deterministic",
        requirement: "Check formulas, plotted values, labels, units, and approved model relationships.",
      },
      {
        id: "economics-argument-review",
        authority: "verified_teacher",
        requirement: "A teacher reviews assumptions, causal claims, positive-versus-normative distinctions, and evidence quality.",
      },
    ],
    standardsFrameworkHints: [{
      framework: "Council for Economic Education National Content Standards in Economics",
      sourceUri: "https://www.councilforeconed.org/wp-content/uploads/National-Content-Standards-in-K%E2%80%9312-Economics-3rd-Edition.pdf",
      selectionHint: "Select the adopted economics concept, benchmark, grade band, and source edition.",
    }],
    safetyDignityConstraints: [
      "Label simulations and examples as instructional, not personal financial or investment advice.",
      "Do not present a model prediction as certainty or omit material assumptions, dates, or population limits.",
    ],
  }),

  geography_map_work: defineSubjectPack({
    id: "geography_map_work",
    label: "Geography and Map Work",
    aliases: ["geography", "map work", "geography and map work", "cartography", "gis", "spatial analysis"],
    methodology: [
      "Analyze location, scale, projection, region, spatial pattern, and human-environment interaction.",
      "Build maps from attributed layers and connect spatial evidence to an explanation.",
      "Explain projection, resolution, data date, and uncertainty where they affect interpretation.",
    ],
    requiredCapabilities: ["map_workspace", "drawing_canvas", "spreadsheet", "graphing", "rich_text"],
    artifactExpectations: [{
      artifactType: "map",
      requiredEvidence: ["Title", "Legend", "Scale when appropriate", "Source attribution", "Layer metadata", "Explanation of the spatial claim"],
    }],
    reviewRules: [
      {
        id: "map-completeness-check",
        authority: "deterministic",
        requirement: "Check required cartographic elements, layer source metadata, coordinates, and export integrity.",
      },
      {
        id: "map-interpretation-review",
        authority: "verified_teacher",
        requirement: "A teacher reviews projection choices, spatial reasoning, source fitness, uncertainty, and the evidence-based explanation.",
      },
    ],
    standardsFrameworkHints: [{
      framework: "Geography for Life: National Geography Standards",
      sourceUri: "https://education.nationalgeographic.org/resource/geography-standard-1/",
      selectionHint: "Select grades 9-12 geography standards and the adopted state or district crosswalk.",
    }],
    safetyDignityConstraints: [
      "Never expose a student's home or precise live location by default.",
      "Geolocation requires a specific approved task, explicit permission, purpose limitation, and a coarse-location alternative.",
    ],
  }),

  engineering: defineSubjectPack({
    id: "engineering",
    label: "Engineering",
    aliases: ["engineering", "engineering design", "technology and engineering"],
    methodology: [
      "Define the problem and stakeholders, document criteria and constraints, generate alternatives, and select using evidence.",
      "Prototype, test, analyze failure, revise, and explain tradeoffs.",
      "Preserve calculations, bill of materials, model revisions, test evidence, and design decisions.",
    ],
    requiredCapabilities: [
      "design_notebook",
      "equation_editor",
      "graphing",
      "spreadsheet",
      "drawing_canvas",
      "cad_workspace",
      "data_lab",
      "rich_text",
    ],
    artifactExpectations: [{
      artifactType: "engineering_design",
      requiredEvidence: ["Problem and stakeholders", "Criteria and constraints", "Alternatives", "Calculations", "Drawings or CAD", "Test evidence", "Revision rationale"],
    }],
    reviewRules: [
      {
        id: "engineering-requirements-check",
        authority: "deterministic",
        requirement: "Check dimensional consistency, calculations, bill-of-material totals, required tests, and artifact completeness.",
      },
      {
        id: "engineering-design-review",
        authority: "verified_teacher",
        requirement: "A teacher reviews criteria, constraints, tradeoffs, safety compliance, test interpretation, and design quality.",
      },
    ],
    standardsFrameworkHints: [
      {
        framework: "ITEEA Standards for Technological and Engineering Literacy",
        sourceUri: "https://www.iteea.org/stel",
        selectionHint: "Select the adopted engineering practice, context, benchmark, and framework version.",
      },
      {
        framework: "Next Generation Science Standards engineering design",
        sourceUri: "https://www.nextgenscience.org/",
        selectionHint: "Use NGSS engineering-design performance expectations when adopted for the course.",
      },
    ],
    safetyDignityConstraints: [
      "A design artifact does not authorize construction, machine use, electrical work, or hazardous testing.",
      "Practical hazards require approved procedures, PPE, age controls, teacher unlock, and in-person supervision.",
    ],
  }),

  trade_cte: defineSubjectPack({
    id: "trade_cte",
    label: "Trade and Career Technical Education",
    aliases: ["trade", "trades", "cte", "trade and cte", "career technical education", "career and technical education", "vocational education"],
    methodology: [
      "Align work to an approved program of study and authorized industry credential where applicable.",
      "Identify hazards and controls before following an approved procedure, then document measurements, skill evidence, and reflection.",
      "Keep practical skill demonstration separate from written knowledge and reflection.",
    ],
    requiredCapabilities: [
      "procedure_checklist",
      "design_notebook",
      "data_lab",
      "drawing_canvas",
      "video_review",
      "rich_text",
    ],
    artifactExpectations: [{
      artifactType: "trade_evidence",
      requiredEvidence: ["Approved procedure reference", "Hazard controls and PPE", "Measurements or work evidence", "Student reflection", "Teacher sign-off"],
    }],
    reviewRules: [
      {
        id: "cte-protocol-check",
        authority: "deterministic",
        requirement: "Block practical activity unless the approved protocol, acknowledgment, age eligibility, unlock, and supervision state are present.",
      },
      {
        id: "cte-skill-verification",
        authority: "verified_teacher",
        requirement: "A qualified teacher verifies restricted practical work, physical skill, procedure compliance, and credential evidence.",
      },
    ],
    standardsFrameworkHints: [
      {
        framework: "Modernized National Career Clusters Framework",
        sourceUri: "https://careertech.org/resource/guidebook-modernized-national-career-clusters-framework/",
        selectionHint: "Select the state or district program of study and authorized pathway standards before any credential crosswalk.",
      },
      {
        framework: "NIOSH Youth@Work Talking Safety",
        sourceUri: "https://www.cdc.gov/niosh/docs/2015-161/default.html",
        selectionHint: "Include hazard identification, controls, emergency response, worker rights, and approved local safety rules.",
      },
    ],
    safetyDignityConstraints: [
      "Never generate machine-operation, electrical, chemical, medical, shop, or other hazardous procedures.",
      "Hazardous steps come only from an approved teacher or manufacturer source and require teacher unlock plus in-person verification.",
      "Do not treat AI feedback or uploaded media as physical skill certification.",
    ],
  }),

  music: defineSubjectPack({
    id: "music",
    label: "Music",
    aliases: ["music", "music theory", "music notation", "music performance", "composition"],
    methodology: [
      "Create, perform, respond, and connect through notation, listening, practice, revision, and reflection.",
      "Keep theory checks deterministic and performance judgments anchored to the teacher rubric and specific evidence timestamps.",
      "Preserve MusicXML, annotations, recordings, and practice history as distinct evidence.",
    ],
    requiredCapabilities: ["music_notation", "audio_review", "performance_log", "rich_text"],
    artifactExpectations: [
      {
        artifactType: "music_score",
        requiredEvidence: ["MusicXML or approved score", "Annotations", "Theory or composition notes", "Revision history"],
      },
      {
        artifactType: "performance_portfolio",
        requiredEvidence: ["Student-chosen recording", "Timestamped reflection", "Practice log", "Rubric evidence"],
      },
    ],
    reviewRules: [
      {
        id: "music-theory-check",
        authority: "deterministic",
        requirement: "Check only unambiguous approved notation and theory rules while preserving enharmonic and stylistic context.",
      },
      {
        id: "music-performance-review",
        authority: "verified_teacher",
        requirement: "A teacher reviews performance or composition using the approved rubric and specific score locations or timestamps.",
      },
    ],
    standardsFrameworkHints: [{
      framework: "National Core Arts Standards: Music",
      sourceUri: "https://www.nationalartsstandards.org/",
      selectionHint: "Select creating, performing, responding, and connecting standards for the ensemble or course level.",
    }],
    safetyDignityConstraints: [
      "No automated final performance score or inference about talent, disability, identity, or emotion.",
      "Recordings remain student-controlled and require consent, retention, accessibility, and deletion controls.",
    ],
  }),

  theatre: defineSubjectPack({
    id: "theatre",
    label: "Theatre",
    aliases: ["theatre", "theater", "acting", "dramaturgy", "stagecraft"],
    methodology: [
      "Develop intent, research context, plan rehearsal, create or interpret, revise, perform, respond, and connect.",
      "Use scripts, design notes, rehearsal evidence, and student reflection to document process.",
      "Let the student choose which recording becomes submitted evidence.",
    ],
    requiredCapabilities: ["rich_text", "design_notebook", "audio_review", "video_review", "performance_log"],
    artifactExpectations: [{
      artifactType: "performance_portfolio",
      requiredEvidence: ["Script or design intent", "Rehearsal plan", "Student-chosen evidence", "Timestamped reflection", "Rubric anchors"],
    }],
    reviewRules: [
      {
        id: "theatre-evidence-check",
        authority: "deterministic",
        requirement: "Check required portfolio elements, consent, timestamps, and source attribution without evaluating performance quality.",
      },
      {
        id: "theatre-performance-review",
        authority: "student_and_teacher",
        requirement: "Student reflection and teacher review provide evaluative judgments tied to the approved rubric and chosen evidence.",
      },
    ],
    standardsFrameworkHints: [{
      framework: "National Core Arts Standards: Theatre",
      sourceUri: "https://www.nationalartsstandards.org/",
      selectionHint: "Select creating, performing, responding, and connecting standards for the course and production context.",
    }],
    safetyDignityConstraints: [
      "No appearance, attractiveness, body-type, emotion, disability, identity, or psychological inference.",
      "No automated final performance score; media submission is student-controlled and consent-bound.",
    ],
  }),

  dance: defineSubjectPack({
    id: "dance",
    label: "Dance",
    aliases: ["dance", "choreography", "dance performance", "movement studies"],
    methodology: [
      "Develop intent, explore movement, plan rehearsal, revise choreography, perform, respond, and connect.",
      "Use student-selected recordings, timeline evidence, practice logs, and reflection.",
      "Evaluate against stated intent and teacher rubric without body comparison.",
    ],
    requiredCapabilities: ["design_notebook", "video_review", "performance_log", "rich_text"],
    artifactExpectations: [{
      artifactType: "performance_portfolio",
      requiredEvidence: ["Choreographic intent", "Rehearsal plan", "Student-chosen recording", "Timestamped reflection", "Rubric anchors"],
    }],
    reviewRules: [
      {
        id: "dance-evidence-check",
        authority: "deterministic",
        requirement: "Check required portfolio elements, consent, timestamps, and reflection presence without scoring bodies or movement.",
      },
      {
        id: "dance-performance-review",
        authority: "student_and_teacher",
        requirement: "Student reflection and teacher review provide technique and performance judgments tied to the approved rubric.",
      },
    ],
    standardsFrameworkHints: [{
      framework: "National Core Arts Standards: Dance",
      sourceUri: "https://www.nationalartsstandards.org/",
      selectionHint: "Select creating, performing, responding, and connecting standards for the course level and dance context.",
    }],
    safetyDignityConstraints: [
      "No appearance, attractiveness, body-type, weight, emotion, disability, identity, or movement-quality inference from media.",
      "No automated final performance score; practical activity follows teacher boundaries and required accommodations.",
    ],
  }),

  cad: defineSubjectPack({
    id: "cad",
    label: "Computer-Aided Design",
    aliases: ["cad", "computer aided design", "computer-aided design", "technical drafting", "3d modeling"],
    methodology: [
      "Interpret the brief, create dimensioned sketches, apply constraints, compare revisions, inspect the model, and package exports.",
      "Begin with teacher-provided model viewing and annotation, then safe 2D constraints and approved parametric primitives.",
      "Keep dimensions, units, constraint status, source files, and export provenance reproducible.",
    ],
    requiredCapabilities: ["cad_workspace", "drawing_canvas", "design_notebook", "rich_text"],
    artifactExpectations: [{
      artifactType: "cad_package",
      requiredEvidence: ["Design brief", "Dimensioned sketch", "Constraint checklist", "Model or viewer evidence", "Revision comparison", "Export manifest"],
    }],
    reviewRules: [
      {
        id: "cad-constraint-check",
        authority: "deterministic",
        requirement: "Validate units, dimensions, declared constraints, supported file types, and export manifest integrity.",
      },
      {
        id: "cad-design-review",
        authority: "verified_teacher",
        requirement: "A teacher reviews design intent, manufacturability claims, standards compliance, and revision quality.",
      },
    ],
    standardsFrameworkHints: [{
      framework: "ITEEA Standards for Technological and Engineering Literacy and adopted drafting standards",
      sourceUri: "https://www.iteea.org/stel",
      selectionHint: "Select the authorized course standards, unit system, drawing convention, and file-format requirements.",
    }],
    safetyDignityConstraints: [
      "A CAD model is instructional evidence and does not authorize fabrication or certify structural, medical, electrical, or life-safety fitness.",
      "Reject unsupported active content and parse model files within documented size, complexity, and security limits.",
    ],
  }),

  advanced_technical_labs: defineSubjectPack({
    id: "advanced_technical_labs",
    label: "Advanced Technical Labs",
    aliases: ["advanced technical lab", "advanced technical labs", "technical lab", "technical labs", "advanced laboratory"],
    methodology: [
      "Define the question and variables, cite approved procedure provenance, collect observations, quantify uncertainty, analyze, conclude, and state limitations.",
      "Keep the approved procedure immutable and separate from student planning, notes, and analysis.",
      "Leave theory and planning available when practical safety metadata is incomplete.",
    ],
    requiredCapabilities: [
      "procedure_checklist",
      "data_lab",
      "equation_editor",
      "graphing",
      "spreadsheet",
      "design_notebook",
      "rich_text",
    ],
    artifactExpectations: [{
      artifactType: "lab_report",
      requiredEvidence: ["Question and variables", "Approved procedure provenance", "Safety acknowledgment", "Observations with units", "Uncertainty", "Analysis", "Conclusion and limitations"],
    }],
    reviewRules: [
      {
        id: "technical-lab-safety-gate",
        authority: "deterministic",
        requirement: "Block practical work unless approved protocol, PPE, age, disposal, acknowledgment, unlock, and supervision requirements are satisfied.",
      },
      {
        id: "technical-lab-review",
        authority: "verified_teacher",
        requirement: "A qualified teacher reviews procedure compliance, practical evidence, uncertainty, conclusions, and any final laboratory judgment.",
      },
    ],
    standardsFrameworkHints: [
      {
        framework: "Next Generation Science Standards",
        sourceUri: "https://www.nextgenscience.org/",
        selectionHint: "Select the adopted performance expectation and science or engineering practices for the laboratory.",
      },
      {
        framework: "Teacher, district, or manufacturer-approved laboratory protocol",
        sourceUri: null,
        selectionHint: "Require a versioned source URI, approving teacher, PPE, supervision, age, emergency, and disposal metadata.",
      },
    ],
    safetyDignityConstraints: [
      "AI may explain an approved procedure but cannot create, alter, optimize, or bypass hazardous procedure steps.",
      "Required PPE, supervision, age restrictions, emergency steps, and disposal rules come only from approved sources.",
      "Missing safety metadata blocks the practical activity while leaving theory and planning available.",
    ],
  }),
});

export const SUBJECT_DOMAIN_PACK_IDS: Readonly<Record<SubjectDomain, SubjectPackId>> =
  Object.freeze({
    mathematics: "mathematics",
    english_language_arts: "english_writing",
    science: "science",
    social_studies: "history_social_studies",
    world_language: "world_languages",
    computer_science: "computer_science",
    visual_arts: "visual_arts",
    music: "music",
    theatre: "theatre",
    dance: "dance",
    physical_education: "physical_education",
    health: "health",
    accounting: "accounting",
    economics: "economics",
    geography: "geography_map_work",
    engineering: "engineering",
    trade_cte: "trade_cte",
    cad: "cad",
    advanced_technical_labs: "advanced_technical_labs",
    interdisciplinary: "general_projects",
    general: "general_projects",
  });

export function normalizeSubjectPackKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/&/gu, " and ")
    .replace(/[^a-z0-9]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .replace(/_+/gu, "_");
}

const SUBJECT_PACK_ALIASES = (() => {
  const aliases = new Map<string, SubjectPackId>();
  const addAlias = (alias: string, packId: SubjectPackId) => {
    const key = normalizeSubjectPackKey(alias);
    if (!key) return;
    const existing = aliases.get(key);
    if (existing && existing !== packId) {
      throw new TypeError(`Subject pack alias "${alias}" is assigned to both ${existing} and ${packId}.`);
    }
    aliases.set(key, packId);
  };

  for (const packId of SUBJECT_PACK_IDS) {
    const pack = SUBJECT_PACK_REGISTRY[packId];
    addAlias(packId, packId);
    addAlias(pack.label, packId);
    for (const alias of pack.aliases) addAlias(alias, packId);
  }
  for (const [domain, packId] of Object.entries(SUBJECT_DOMAIN_PACK_IDS)) {
    addAlias(domain, packId);
  }
  return aliases;
})();

export function isSubjectPackId(value: string): value is SubjectPackId {
  return SUBJECT_PACK_IDS.includes(value as SubjectPackId);
}

export function listSubjectPacks(): SubjectPackDefinition[] {
  return SUBJECT_PACK_IDS.map((packId) => SUBJECT_PACK_REGISTRY[packId]);
}

export function subjectPackForDomain(domain: SubjectDomain): SubjectPackDefinition {
  return SUBJECT_PACK_REGISTRY[SUBJECT_DOMAIN_PACK_IDS[domain]];
}

export function resolveSubjectPack(value: string): SubjectPackDefinition | null {
  const packId = SUBJECT_PACK_ALIASES.get(normalizeSubjectPackKey(value));
  return packId ? SUBJECT_PACK_REGISTRY[packId] : null;
}

export function requireNativeSubjectPack(value: string): SubjectPackDefinition {
  const pack = resolveSubjectPack(value);
  if (!pack) {
    throw new TypeError(`No native subject pack is registered for "${value}".`);
  }
  return pack;
}
