# Diana — Milestone v2.0 Master Plan
# "The Complete Academic Platform"

**Created:** 2026-05-31  
**Status:** COMPLETE - Phase 35 complete; v2.0 launch-ready  
**Branch target:** `claude/diana-v2`  
**Estimated phases:** 24 (Phases 12–35)  
**Vision:** Diana becomes the single platform a high school student needs — every subject, every learning style, every accommodation, better than every competitor.

---

## Vision Statement

Diana v2.0 is not an app. It is a learning partner that knows the student — their diagnosis, their interests, their current mastery level in every subject — and adapts in real time. It handles every subject a US high school offers. It meets every accessibility need. It connects to every school system. It never shames, never competes, never gamifies with guilt.

**The gap we close:** NotebookLM understands documents but not students. Khan Academy teaches but doesn't know your IEP. Photomath solves but doesn't scaffold. Grammarly fixes but doesn't teach. Diana does all of it, for one student, in one place.

---

## Student Personas (expanded)

| Persona | Diagnosis | Core need |
|---------|-----------|-----------|
| Maya | ADHD-inattentive | Task initiation, interrupt recovery, time blindness |
| Devon | ADHD + dyslexia | TTS, bionic reading, phonics scaffolding, extended time |
| Sam | Undiagnosed, math anxiety | Step-by-step scaffolding, no judgment, try-again loops |
| Jordan | Gifted + ADHD | Boredom detection, depth extension, skip-ahead |
| Priya | ELL + ADHD | Vocabulary support, language-scaffolded explanations |
| Alex | Physical disability | Voice-first, keyboard-only, switch access |

---

## Competitive Gap Analysis

### What Diana v1.0 has that competitors don't
- Calm invariant (no shame, no streaks, no red)
- ADHD-specific task initiation (Premack principle)
- "Done ≠ Submitted" legal-grade distinction
- FSRS spaced repetition integrated with coursework
- Body-doubling virtual study presence
- AI traffic light per class (teacher-set policy)

### What competitors have that Diana v2.0 must match or beat

| Competitor | Their edge | Diana v2.0 response |
|------------|-----------|---------------------|
| Google NotebookLM | Deep document understanding, multi-doc synthesis | Phase 14: Note synthesis across multiple notes + class docs |
| Khan Academy | Subject-specific scaffolding, mastery tracking | Phases 16–22: per-subject methodology engines |
| Photomath | Step-by-step math with camera | Phase 16: Math scaffold + photo equation scan |
| Grammarly | Real-time writing feedback, tone | Phase 18: Writing co-author with inline suggestions |
| Quizlet | Flashcard sets, class sharing | Phase 13: Enhanced FSRS + class deck sharing |
| Duolingo | Streak-gamified language learning | Phase 22: Language scaffold (shame-free, interest-personalized) |
| Chegg/Brainly | Answer-on-demand | Phase 15: Guided discovery (never gives answer directly) |
| Otter.ai | Live transcription | Phase 12: Live lecture capture |
| Khanmigo | AI tutor across subjects | Phases 16–22: Per-subject tutor with student profile |
| Notion | Organization + templates | Phase 23: Study planner + template library |

---

## The 10 Pillars of Diana v2.0

### Pillar 1: Student Identity Layer (Phase 12)
Every AI interaction is personalized to the student's interests. Diana knows:
- Favorite subjects, hobbies, media interests (from onboarding + ongoing learning)
- Mastery level per subject (adaptive, not self-reported)
- Learning style signals (text vs. audio vs. visual preference from usage patterns)
- Current emotional state (from brief check-in, never intrusive)

### Pillar 2: Subject-Specific AI Methodology (Phases 16–22)
Each subject has a different teaching methodology:
- **Math**: Socratic step reveal, never solves — guides. Whiteboard-style step placement.
- **Science**: Hypothesis-first. "What do you think will happen?" before explanation.
- **English/Language Arts**: Co-author mode. Student writes, AI shapes. Never writes for them.
- **History**: Primary source analysis prompts. Cause → effect chains. Timeline visualization.
- **Foreign Language**: Immersive with scaffolding. Cognate hints. Spaced vocabulary recall.
- **Computer Science**: Live code execution sandbox. Error → hint chain. No code dumps.
- **Arts**: Reflection prompts. Process documentation. Portfolio mode.
- **PE/Health**: Log-based. Goal setting. Non-judgmental body tracking.

### Pillar 3: Accessibility First (Phase 13)
- Bionic reading (synchronized bold-first-syllable)
- Visual pacing (word-by-word or line-by-line highlight)
- Line focus mode (dim everything but current line)
- Dyslexia typography (Lexend + OpenDyslexic options + letter spacing control)
- Text-to-speech (system native + ElevenLabs voice options)
- Font size / line height / contrast controls (already partial, expand)
- High contrast mode
- Reduced motion (already implemented, verify complete)
- Keyboard-only navigation audit
- Screen reader (ARIA) audit

### Pillar 4: AI Co-Authorship Framework (Phase 18)
The philosophy: Student words go in first. AI never starts. AI organizes, reflects, and prompts.
- Writing scaffold: outline → paragraph starters → transition suggestions → citation formatting
- Co-write mode: AI continues student's sentence as suggestion (accept/reject)
- Revision assistant: "What's this paragraph trying to say?" — not "rewrite this"
- Plagiarism-awareness: AI flags when output looks like a source (never generates citations as fact)
- Authorship log visible to student: "You wrote 85% of this"

### Pillar 5: Adaptive Mastery Tracking (Phase 15)
- Per-subject, per-concept mastery map (visual, shame-free)
- FSRS already does flashcard scheduling — extend to track concept confidence
- "You've seen this before" recognition without guilt
- Teacher view: exportable progress report (FERPA-safe)
- Gap identification: "You're solid on linear equations, let's try systems next"

### Pillar 6: Visual Learning Tools (Phase 17)
- Mind mapping from notes (auto-generated, editable)
- Concept relationship graphs
- Timeline builder for history events
- Equation whiteboard (step-by-step, student fills in next step)
- Diagram annotation (photo of diagram → AI labels + student quizzes)
- Color-coded outline view for any note

### Pillar 7: School System Integration (Phase 23)
- Canvas LMS: read assignments, submit work, import class calendar
- Google Classroom: sync assignments and due dates
- Clever: SSO integration for school-managed accounts
- IEP/504 document import: auto-configure Diana accommodations
- Parent/guardian view (read-only, privacy-preserving)
- Teacher portal: assignment creation, AI policy setting, progress export

### Pillar 8: Live Capture & Smart Notes (Phase 12 + 14)
- Live lecture transcription (browser mic, Whisper streaming)
- Smart note cleanup (existing Phase 10 pipeline, now with subject context)
- Multi-note synthesis: "Summarize everything I know about photosynthesis from all notes"
- Note linking: automatic related-note suggestions
- Action item extraction from notes ("Homework: read chapter 4")

### Pillar 9: Interest-Based Personalization Engine (Phase 12)
- Student picks 5 interests at onboarding (gaming, music, sports, fashion, coding, etc.)
- AI uses interests to generate examples: "Pythagoras — like calculating the diagonal on your favorite court"
- Boredom signals (short sessions, repeated back-navigation) trigger depth-change
- "Teach me another way" button — generates alternate explanation using different analogy
- Interest profile evolves: usage patterns update weights

### Pillar 10: Emotional Intelligence Layer (Phase 24)
- Brief mood check-in at session start (1-tap: good / meh / rough)
- Session adaptation: "rough" → shorter tasks, more breaks, gentler prompts
- Frustration detection: repeated wrong answers → "Want to try a different approach?"
- Celebration is quiet and private (no confetti for others to see)
- Weekly reflection: "What felt hard this week? What clicked?" — journaled, AI-reflected

---

## Phase-by-Phase Roadmap (Phases 12–35)

---

### Phase 12 — Student Identity + Live Capture
**Delivers:** Interest profiling, AI personalization engine, live lecture transcription

**Implementation status:** COMPLETE on 2026-06-01. Evidence: migration `0020_student_identity_live_capture.sql` applied remotely, interest onboarding, math prompt personalization, Lecture note tab with `source="lecture"`, lecture action items mirrored into `inbox_items`, and updated `math-step` / `transcribe-note` Edge Functions deployed.

**Features:**
- F22: Interest onboarding (5-pick from category grid)
- F23: Interest-weighted AI examples (inject into all subject prompts)
- F24: Live lecture transcription (mic → Whisper streaming → note auto-created)
- F25: Action item extraction from notes
- Profile: `interests[]`, `mastery_signals{}`, `session_mood` added to profiles

**Acceptance criteria:**
- AI math hint uses student's stated interest as analogy context
- Live transcription creates a new note with source="lecture"
- Action items appear in assignment capture queue

---

### Phase 13 — Accessibility Engine v2
**Delivers:** Bionic reading, visual pacing, line focus, dyslexia typography suite, TTS expansion

**Implementation status:** Complete on 2026-06-01. Migration `0021_accessibility_engine_v2.sql` is applied remotely; `tts-generate` is deployed with OpenAI and ElevenLabs provider paths; Settings, assignment reading views, and note reading views are wired. ElevenLabs runtime requires `ELEVENLABS_API_KEY` in Supabase Edge Function secrets.

**Features:**
- F26: Bionic reading (bold first syllable of each word, toggle)
- F27: Visual pacing — word highlight mode and line-scroll mode
- F28: Line focus (dim above/below current reading line)
- F29: OpenDyslexic font option (in addition to Lexend)
- F30: Letter spacing + word spacing controls (CSS custom properties)
- F31: TTS expansion — ElevenLabs voice selection, speed control, pitch control
- F32: High contrast mode (dark + high contrast variant)
- Keyboard navigation audit + ARIA landmark review

**Acceptance criteria:**
- Devon (dyslexia persona) can enable bionic reading and line focus in 2 taps
- TTS reads any note or assignment description aloud
- All controls reachable via keyboard only

---

### Phase 14 — Smart Notes v2: Synthesis + Linking
**Delivers:** Multi-note synthesis, note linking, note search, outline view

**Implementation status:** Complete on 2026-06-01. Migration `0022_smart_notes_v2.sql` is applied remotely; `note-synthesis` and `note-tags` are deployed; `/notes` has synthesis and full-text search; note detail has related notes, tags, AI tag suggestions, outline view, and highlight-to-flashcard.

**Features:**
- F33: Cross-note synthesis ("What do all my biology notes say about cells?")
- F34: Automatic note linking (semantic similarity → "Related notes" sidebar)
- F35: Full-text note search with snippet preview
- F36: Outline view — auto-generated from headings/bullets
- F37: Note-to-flashcard: highlight text → create flashcard (extends Phase 6 FSRS)
- F38: Note tagging: student-set tags + AI-suggested tags

**Acceptance criteria:**
- Synthesis query returns coherent summary citing source notes
- Related notes appear within 1s of opening a note
- Highlight → flashcard takes 1 tap

---

### Phase 15 — Adaptive Mastery Tracker
**Delivers:** Per-subject concept mastery map, shame-free progress visualization, teacher export

**Implementation status:** Complete on 2026-06-01. Migration `0023_adaptive_mastery_tracker.sql` is applied remotely; class pages seed and render concept mastery maps; flashcard reviews, AI quiz results, and confidence check-ins append mastery evidence; class mastery PDF export and parent read-only concept confidence are wired.

**Features:**
- F39: Concept map per class — visual graph of concepts + mastery level (0–4)
- F40: Mastery updated by: flashcard performance, AI quiz results, self-reported confidence
- F41: "What to review next" — surfaces lowest-mastery concept with pending review
- F42: Gap bridge suggestions — "You know X, let's connect it to Y"
- F43: Teacher progress export (PDF, FERPA-safe, no AI scores visible to teacher without consent)
- F44: Parent view (read-only dashboard, requires student permission)

**Acceptance criteria:**
- Mastery map renders for each class with at least 5 concepts seeded from class docs
- Mastery level increases after 3 correct flashcard reviews
- Export generates clean PDF with assignment completion and concept confidence

---

### Phase 16 — Math Scaffold Engine
**Delivers:** Step-by-step math with photo input, whiteboard step placement, never-solve policy

**Implementation status:** Complete on 2026-06-01. `math-scaffold` is deployed; assignment math tools support typed or photo-scanned problems, structured Socratic step boards, common checks, unit tracking, graph sketch guidance, formula reference, and the existing analogous worked-example flow.

**Features:**
- F45: Math problem photo scan → LaTeX extraction (GPT-4o vision, same pipeline as Phase 11)
- F46: Math scaffold chat — Socratic step-by-step guide (never gives final answer)
- F47: Whiteboard step UI — each step appears in structured position as student confirms
- F48: "Show me an example" — generates isomorphic problem (different numbers, same structure)
- F49: Common error detection — "Many students mix up these two steps. Here's why they're different."
- F50: Unit + dimension tracker — shows unit at each step for science calculations
- F51: Graph sketching assistant — describes curve behavior before plotting

**Subject coverage:** Pre-Algebra, Algebra 1 & 2, Geometry, Pre-Calculus, Calculus AB/BC, Statistics, AP courses

**Acceptance criteria:**
- Photo of handwritten equation → correctly parsed in ≥90% of legible photos
- Scaffold never reveals final answer, always prompts next step
- Whiteboard shows student's work step-by-step in organized layout
- Sam (math anxiety) gets encouraging micro-feedback at each correct step

---

### Phase 17 — Visual Learning Tools
**Delivers:** Mind maps, concept graphs, timelines, diagram annotation

**Implementation status:** Complete on 2026-06-01. `visual-tools` is deployed; note detail now has a visual learning panel with mind maps, concept graphs, timelines, diagram annotation, color-coded outlines, and comparison tables. Phase 16 supplies the equation whiteboard surface.

**Features:**
- F52: Mind map generation from any note (auto-layout, student-editable)
- F53: Concept relationship graph — AI identifies term relationships, renders as network
- F54: Timeline builder — student inputs events, AI suggests missing context events
- F55: Diagram annotation — upload photo of diagram → AI labels → student quiz mode
- F56: Equation whiteboard shared view — teacher can see student's step layout (opt-in)
- F57: Color-coded outline — each heading level gets auto-color (customizable)
- F58: Comparison table builder — "Compare mitosis vs meiosis" → auto-scaffold table

**Acceptance criteria:**
- Mind map renders in <3s from any note with >200 words
- Timeline shows chronological events with pan/zoom
- Diagram annotation works for biology cell diagrams, chemistry molecule diagrams

---

### Phase 18 — Writing Co-Author Engine
**Delivers:** Inline writing scaffold, co-write mode, revision assistant, authorship log

**Implementation status:** Complete on 2026-06-01. `writing-cowrite` is deployed; essay assignments now have a Writing Studio with scaffold, ghost text, transition, evidence, argument, readability, tone, authorship percentage, and citation formatter continuity.

**Features:**
- F59: Essay scaffold — prompt → thesis options → outline → paragraph starters
- F60: Co-write mode — AI continues incomplete sentence as ghost text (Tab to accept)
- F61: Transition suggestion — "This paragraph jumps topics. Here's a bridge."
- F62: Evidence finder — "Find 3 quotes from your notes that support this claim"
- F63: Citation formatter — MLA/APA/Chicago from pasted URL or book info
- F64: Argument checker — "Your claim says X but your evidence says Y. How do they connect?"
- F65: Readability tuner — "This sentence is 47 words. Split it?"
- F66: Authorship percentage display — shows "You wrote 82% of this draft"
- F67: Tone checker — flags passive voice, vague language (but never rewrites without asking)

**Subject coverage:** English 9–12, AP Language, AP Literature, any class with written assignments

**Acceptance criteria:**
- Essay scaffold produces outline in <10s
- Co-write ghost text appears within 800ms of pause
- Authorship log accurately tracks AI vs. student character count
- Tone audit passes (no shame/scolding in AI suggestions)

---

### Phase 19 — Science Scaffold Engine
**Delivers:** Hypothesis-first methodology, lab report assistant, formula toolkit

**Implementation status:** Complete on 2026-06-01. `science-scaffold` is deployed; lab and science-like assignments now have a Science Helper with hypothesis, lab report, scientific method, formula context, chemistry balance, diagram, and AP-style FRQ modes. Diagram mode currently returns Mermaid source text in the helper without adding a client-side renderer.

**Features:**
- F68: Hypothesis scaffold — "What do you predict? Why?" before every explanation
- F69: Lab report builder — procedure → data table → analysis → conclusion guided steps
- F70: Scientific method coach — identifies what step student is on, guides to next
- F71: Formula context engine — "Here's the formula. Here's what each variable means in your problem."
- F72: Diagram generation (Mermaid.js) — cell cycle, food webs, water cycle
- F73: Chemistry balancer scaffold — shows unbalanced equation → prompts student to balance step-by-step
- F74: AP Science essay scaffold (FRQ format: claim, evidence, reasoning)

**Subject coverage:** Biology, Chemistry, Physics, Earth Science, Environmental Science, AP variants

**Acceptance criteria:**
- Hypothesis scaffold triggers before any science explanation
- Lab report template matches standard format for Biology and Chemistry
- Chemistry balancer scaffold validates each step before proceeding

---

### Phase 20 — History & Social Studies Engine
**Delivers:** Primary source analysis, cause-effect chains, essay frameworks, timeline AI

**Implementation status:** Complete on 2026-06-01. `history-scaffold` is deployed; history/social-studies assignments now have a History Helper with primary source, cause/effect, HAPP, DBQ, compare/contrast, map annotation, and current-events modes. Text source upload is browser-local for text-like files; PDF/DOCX source extraction remains in the notes upload flow.

**Features:**
- F75: Primary source analyzer — upload/paste document → guided annotation prompts
- F76: Cause-effect chain builder — AI scaffolds branching cause→effect diagram
- F77: HAPP analysis framework (Historical context, Audience, Purpose, Point of view)
- F78: DBQ (Document-Based Question) essay scaffold
- F79: Compare-contrast scaffold for historical periods/figures/events
- F80: Map annotation — upload map image → AI identifies regions → student labels quiz
- F81: Current events connector — "How does this historical event connect to today?"

**Subject coverage:** World History, US History, AP History, Government, Economics, Geography, AP courses

**Acceptance criteria:**
- Primary source upload triggers annotation prompts within 3s
- HAPP analysis produces structured output for any uploaded text
- DBQ scaffold generates 6-paragraph outline from provided documents

---

### Phase 21 — Computer Science Engine
**Delivers:** In-browser code execution, error→hint chain, algorithm visualizer

**Implementation status:** Complete on 2026-06-01. `cs-scaffold` is deployed; CS-like assignments now have a Coding Scaffold with JavaScript Worker execution, local Python Lite execution, error hints, pseudocode bridge, code review, debug log, AP project milestones, and bubble sort/binary search/linked-list visualizers. Python support is an intro-CS local runner rather than bundled Pyodide.

**Features:**
- F82: In-browser Python/JavaScript sandbox (Pyodide for Python, browser JS execution)
- F83: Error → hint chain — runtime error → guided questions (never pastes fix)
- F84: Algorithm step visualizer — shows array state at each sort/search step
- F85: Pseudocode ↔ code bridge — student writes pseudocode, AI translates to outline
- F86: Code review mode — "Walk me through what this function does" (comprehension check)
- F87: Debugging scaffold — "What did you expect? What happened?" structured debug log
- F88: AP CSP / AP CSA project scaffold — guided milestones for Create Task

**Subject coverage:** Intro to CS, Python, Java, AP Computer Science A, AP CSP, Web Design

**Acceptance criteria:**
- Python code executes in-browser in <2s
- Error hint never pastes corrected code — always asks a guiding question first
- Algorithm visualizer works for bubble sort, binary search, and linked list traversal

---

### Phase 22 — Foreign Language Engine
**Delivers:** Immersive vocabulary scaffold, shame-free fluency building, interest-based sentence practice

**Implementation status:** Complete on 2026-06-01. `language-scaffold` is deployed; language assignments now have a Language Scaffold with vocabulary, conjugation, reading, speaking transcript, writing, culture, FSRS card save, target-language STT locale, and flashcard review audio. Speaking feedback is transcript-based, and ElevenLabs pronunciation playback depends on the existing TTS provider configuration.

**Features:**
- F89: Vocabulary introduction — new word → cognate hint → example sentence using student's interests
- F90: Conjugation scaffold — verb → tense → guided conjugation table (student fills in)
- F91: Reading comprehension scaffold — foreign language text → guided questions in English → answers in target language
- F92: Speaking practice (STT → AI feedback on pronunciation + grammar, never grade)
- F93: Writing in target language — co-write mode in Spanish/French/etc.
- F94: Cultural context cards — vocabulary tied to cultural context, not just translation
- F95: Vocabulary spaced repetition (FSRS flashcards with audio pronunciation)

**Subject coverage:** Spanish 1–4, French 1–4, German, Mandarin (Latin script), AP Language

**Acceptance criteria:**
- Vocabulary card shows cognate hint + interest-based sentence
- Conjugation scaffold fills table one cell at a time with guided prompts
- FSRS flashcards include audio pronunciation (ElevenLabs TTS)

---

### Phase 23 — School System Integration
**Delivers:** Canvas LMS sync, Google Classroom sync, Clever SSO, IEP import

**Implementation status:** Complete on 2026-06-01. Migration `0024_school_system_integration.sql` is applied remotely; Canvas OAuth start/callback, Canvas rubric/link import, Google Classroom coursework and announcement import, Clever district marker, IEP/504 accommodation text import, stale-connection Settings background sync, Canvas/Classroom submission handoff tracking, and `/api/calendar.ics` due-date export are wired. Canvas OAuth requires `CANVAS_CLIENT_ID` / `CANVAS_CLIENT_SECRET`; Classroom depends on Google provider tokens with Classroom scopes; IEP PDF upload uses readable browser text or paste rather than OCR for scanned PDFs.

**Features:**
- F96: Canvas LMS OAuth → import assignments + due dates + rubrics
- F97: Google Classroom OAuth → import assignments + announcements
- F98: Clever SSO — school-managed login (district IT provisioned)
- F99: IEP/504 import — PDF upload → auto-configure extended time %, TTS, font settings
- F100: Assignment auto-sync — new Canvas/GC assignments appear in Diana capture queue
- F101: Submission sync — mark done in Diana → option to submit to Canvas/GC
- F102: Calendar sync — Diana due dates export to Google Calendar / Apple Calendar

**Acceptance criteria:**
- Canvas OAuth connects and imports current assignments in <10s
- IEP PDF import correctly extracts extended time % and enables TTS
- Assignment sync runs in background, no manual refresh needed

---

### Phase 24 — Emotional Intelligence + Session Adaptation
**Delivers:** Mood check-in, frustration detection, session adaptation, weekly reflection

**Implementation status:** Complete on 2026-06-01. Migration `0025_emotional_intelligence_session_adaptation.sql` is applied remotely; dashboard mood check-in, rough/light session adaptation, reset cue, Sunday-evening weekly reflection with `weekly-reflection` Edge Function, global overwhelmed micro-step button, flashcard repeated-attempt support prompt, rough-mode timer defaults, and Wins quiet milestones are wired. Frustration detection is currently connected to flashcard review attempts, while other AI surfaces continue to use the existing prompt-level frustration redirect.

**Features:**
- F103: Session mood check-in (1-tap: good / meh / rough) — stored, never shared
- F104: Session adaptation — "rough" mode: shorter tasks, more break prompts, gentler AI tone
- F105: Frustration detection — 3+ wrong answers → "Want to try a completely different approach?"
- F106: "I'm overwhelmed" button — immediately breaks current task into smallest possible micro-step
- F107: Weekly reflection prompt — "What clicked this week? What's still foggy?" — AI-reflected, student-owned
- F108: Quiet celebration — private milestone acknowledgment (no confetti, no leaderboard)
- F109: Burnout signal — session length + error rate → gentle "take a break" (never forced)

**Acceptance criteria:**
- Mood check-in appears at session start (can be dismissed permanently)
- "I'm overwhelmed" button visible in all task views
- Frustration detection triggers after configurable threshold (default: 3)
- Weekly reflection appears Sunday evening, skippable

---

### Phase 25 — Arts & Electives Engine
**Delivers:** Portfolio mode, reflection prompts, process documentation

**Features:**
- F110: Portfolio builder — image/document upload → project collection with metadata
- F111: Art reflection scaffold — "Describe your process. What were you trying to express?"
- F112: Music theory scaffold — note reading, chord construction, interval identification
- F113: Drama/Speech scaffold — memorization tools, stage direction annotation
- F114: AP Art History — image analysis scaffold (formal analysis framework)
- F115: Photography/Film — storyboard builder, shot list scaffold

**Acceptance criteria:**
- Portfolio renders uploaded images with reflection text
- Music theory scaffold covers major/minor scales and chord triads
- Art reflection prompts appear before AI adds any comment

**Status:** COMPLETE - F110/F111/F112/F113/F114/F115 implemented. Migration `0026_portfolios_and_electives.sql` is applied remotely, `arts-scaffold` is deployed ACTIVE, and static gates are green.

---

### Phase 26 — PE, Health & Wellness Engine
**Delivers:** Non-judgmental activity logging, goal setting, health education scaffold

**Features:**
- F116: Activity log — duration, type, how-it-felt (no calorie tracking, no weight)
- F117: Personal goal setting — student sets own goal (speed, endurance, skill — never appearance)
- F118: Health class scaffold — reproductive health, nutrition, mental health questions handled calmly
- F119: CPR/First Aid study cards (FSRS)
- F120: Sleep + recovery tracker — "How did you sleep?" → notes connection to focus

**Acceptance criteria:**
- No body weight, BMI, or calorie fields anywhere
- Health questions answered with calm, medically accurate, age-appropriate language
- Sleep log connects to next-day task difficulty adjustment

**Status:** COMPLETE - F116/F117/F118/F119/F120 implemented. Migration `0027_health_wellness_engine.sql` is applied remotely, `health-scaffold` is deployed ACTIVE, and static gates are green.

---

### Phase 27 — Advanced Placement Command Center
**Delivers:** AP exam preparation, FRQ scaffold, practice question engine, score predictor

**Features:**
- F121: AP exam countdown with calm milestone plan (never "you're behind")
- F122: FRQ scaffold per AP subject (History DBQ, Science FRQ, Language synthesis essay)
- F123: Multiple choice practice with explanation mode (not just right/wrong — why)
- F124: Score predictor (practice → estimated 1–5 band, shame-free framing)
- F125: AP subject-specific study plan generator
- F126: College Board format alignment — prompts mirror actual AP exam structure

**AP subjects covered:** US History, World History, Language (English), Literature, Biology, Chemistry, Physics (1/2/C), Calculus (AB/BC), Statistics, Computer Science (A/CSP), Spanish, French, Art History, Psychology, Economics (Micro/Macro), Government

**Acceptance criteria:**
- FRQ scaffold produces structured response outline per AP format
- Multiple choice explanation always explains why wrong answers are wrong
- Score band displayed as "You're in the 3–4 range" not "You failed"

**Status:** COMPLETE - F121/F122/F123/F124/F125/F126 implemented. Migration `0028_ap_command_center.sql` is applied remotely, `ap-scaffold` is deployed ACTIVE, and static gates are green.

---

### Phase 28 — Micro-Task + ADHD Executive Function Tools
**Delivers:** Micro-step decomposition, body-doubling v2, Pomodoro++, interrupt recovery v2

**Features:**
- F127: "Make it smaller" — any task → 5-minute micro-steps automatically
- F128: Task initiation ritual — 3-second countdown + "Ready. Start." (Premack trigger)
- F129: Body-doubling v2 — live student count with study type breakdown (Math, Reading, etc.)
- F130: Pomodoro++ — adaptive break length based on session mood + task difficulty
- F131: Interrupt recovery v2 — "Welcome back. You were on step 3 of 7. Continue?"
- F132: Working memory offload — "Quick capture" button always visible — dumps thought without leaving task
- F133: Task switching cost display — "Switching tasks has a 15-min warm-up cost. Stay or switch?"
- F134: Time estimate calibration — tracks student's estimates vs actuals, adapts estimates

**Acceptance criteria:**
- "Make it smaller" produces ≤5-min steps for any assignment
- Quick capture accessible from any screen via floating button
- Interrupt recovery shows exact previous context on return
- Time calibration shows "Your Math tasks usually take 1.4× your estimate"

**Status:** COMPLETE - F127/F128/F129/F130/F131/F132/F133/F134 implemented. `task-breakdown` is deployed ACTIVE with five-minute step constraints, no new migration was needed, and static gates are green.

---

### Phase 29 — Vocabulary + Reading Scaffold Engine
**Delivers:** Hover definitions, reading level adaptation, text-to-speech reading mode, annotation tools

**Features:**
- F135: Hover vocabulary — any word in any note → definition in student's interest context
- F136: Reading level slider — simplify/complexity toggle for any AI-generated text
- F137: Annotation mode — highlight + note on any text in Diana
- F138: Read-aloud mode — full note TTS with synchronized word highlight
- F139: Vocabulary builder — words from hover → auto-added to vocabulary FSRS deck
- F140: Phonics scaffold — word → pronunciation breakdown → syllable stress for ELL/dyslexia
- F141: Context clue trainer — "Before I define this, what do you think it means from context?"

**Acceptance criteria:**
- Hover vocabulary appears within 300ms
- Read-aloud synchronizes highlight to spoken word (±1 word)
- Context clue trainer activates on first encounter; definition available on second

**Status:** COMPLETE - F135/F136/F137/F138/F139/F140/F141 implemented. Migration `0029_vocabulary_reading_scaffold.sql` is applied remotely, `vocab-hover` and `reading-level` are deployed ACTIVE, and static gates are green.

---

### Phase 30 — Teacher + Parent Portal
**Delivers:** Teacher assignment creation, AI policy management, parent dashboard

**Features:**
- F142: Teacher portal — create assignments with rubric + AI policy (red/yellow/green)
- F143: Class management — invite students, manage roster
- F144: Assignment analytics — class-wide completion rates (no individual names without consent)
- F145: Parent dashboard — child's session summary (time spent, tasks completed) — read-only
- F146: Progress notes — teacher can leave notes visible to student and parent
- F147: Accommodation confirmation — teacher confirms IEP accommodations are active in Diana
- F148: IEP integration — teacher uploads IEP, Diana auto-configures student settings

**Acceptance criteria:**
- Teacher creates assignment in <2 minutes
- AI policy set per assignment, enforced server-side
- Parent sees only non-AI-identifiable summary data unless student consents

**Status:** COMPLETE - F142/F143/F144/F145/F146/F147/F148 implemented. Migration `0030_teacher_parent_portal.sql` is applied remotely, teacher/parent portal routes are live, assignment-level AI policy override is wired, and static gates are green.

---

### Phase 31 — Platform Intelligence + Analytics
**Delivers:** Usage analytics dashboard, AI cost monitoring, feature flag system

**Features:**
- F149: Internal analytics — feature usage, session length, task completion rates
- F150: AI cost dashboard — tokens used per feature, per user, per day (admin view)
- F151: Feature flags — gradual rollout system for new features
- F152: Error monitoring — Sentry integration with ADHD-context tagging
- F153: Performance monitoring — Core Web Vitals per route, budget alerts
- F154: A/B testing framework — for UI experiments (not content — never A/B test accommodations)

**Acceptance criteria:**
- Admin can see daily AI cost breakdown by feature
- Feature flags can be toggled without deploy
- Error monitoring tags by user diagnosis category (anonymized)

**Status:** COMPLETE - F149/F150/F151/F152/F153/F154 implemented. Migration `0031_platform_intelligence_analytics.sql` is applied remotely, `/insights` is live, monitoring routes are authenticated, feature flags and UI experiments are owner-scoped, and static gates are green.

---

### Phase 32 — Offline + PWA Excellence
**Delivers:** Full offline capability, background sync, install experience

**Features:**
- F155: Full offline note editing with background sync
- F156: Offline flashcard review (FSRS state cached locally)
- F157: Offline assignment viewing + status updates (sync on reconnect)
- F158: Service worker background sync for note saves
- F159: Install prompt optimization — PWA install rate improvement
- F160: Push notifications — optional assignment reminders (calm, never urgent)
- F161: iOS PWA share target — share from Camera app → opens new note with image

**Acceptance criteria:**
- Notes editable offline, synced within 30s of reconnection
- Flashcard review works fully offline
- iOS share target works from Files and Camera apps

**Status:** COMPLETE - F155/F156/F157/F158/F159/F160/F161 implemented. A first-party service worker, offline queues, PWA runtime, Settings install/reminder controls, share target route, offline fallback, and manifest updates are live. No new migration was needed and static gates are green.

---

### Phase 33 — Personalization Settings v2
**Delivers:** Deep preference system, profile export, multi-device sync

**Features:**
- F162: Expanded settings — per-subject AI verbosity (chatty vs. minimal)
- F163: Notification preferences — granular control per notification type
- F164: Data export — student owns their data (notes, flashcards, mastery) as JSON/PDF
- F165: Account deletion — COPPA-compliant, immediate, with data export offer
- F166: Multi-device session handoff — "Continue from where you left off on your phone"
- F167: Profile backup — encrypted export, importable on new device
- F168: Privacy dashboard — what data Diana has, what AI sees, delete by category

**Acceptance criteria:**
- Data export downloads in <30s
- Account deletion completes within 30 days (COPPA), immediately for all AI features
- Privacy dashboard shows accurate data inventory

**Status:** COMPLETE - F162/F163/F164/F165/F166/F167/F168 implemented. Migration `0032_personalization_settings_v2.sql` is applied remotely, `/export` is live, Settings links to data/privacy controls, multi-device handoff tracking is mounted, and static gates are green.

---

### Phase 34 — Social + Collaboration Features (Opt-in Only)
**Delivers:** Study group rooms, shared flashcard decks, collaborative notes

**Features:**
- F169: Study groups — invite classmates to shared session (body-doubling + shared timer)
- F170: Shared flashcard decks — class deck creation by student, teacher, or AI
- F171: Collaborative notes — real-time co-editing (Yjs CRDT) for group projects
- F172: Peer explanation mode — "Teach this concept to your study partner" (Feynman technique)
- F173: Group project coordinator — assigns sub-tasks to group members
- Privacy: all social features opt-in, no default sharing, no leaderboards, no rankings

**Acceptance criteria:**
- Study group creates shared Pomodoro session in <30s
- Shared decks appear in all member's FSRS review queues
- Collaborative notes sync changes in <500ms

**Status:** COMPLETE - F169/F170/F171/F172/F173 implemented. Migration `0033_social_collaboration.sql` is applied remotely, `/study-groups` is live, invite-only RLS-backed rooms are wired, shared decks install into member FSRS queues, collaborative notes refresh at 500 ms, and static gates are green.

---

### Phase 35 — v2.0 Hardening + Launch
**Delivers:** Performance audit, accessibility audit, security audit, v2.0 GA release

**Tasks:**
- Full WCAG 2.1 AA accessibility audit (automated + manual with screen reader)
- Penetration test (OWASP top 10 for student data)
- Performance budget enforcement (LCP <2.5s, FID <100ms, CLS <0.1)
- Load testing (10k concurrent sessions)
- Data retention policy enforcement (COPPA: minors' data purge schedule)
- Full test coverage review (target 80% for critical paths)
- Mobile device testing matrix (iOS Safari, Android Chrome, tablet)
- Beta rollout with 10 test students, iterate
- v2.0 launch documentation

**Status:** COMPLETE - v2.0 hardening and launch readiness artifacts are implemented. Migration `0034_launch_hardening_retention.sql` is applied remotely, COPPA retention purge RPC is service-role scoped, launch audit/docs are committed, critical-path launch audit passes, and final static gates are green.

---

## Feature Index (F22–F173)

| Phase | Features |
|-------|---------|
| 12 | F22–F25: Identity + Live Capture |
| 13 | F26–F32: Accessibility Engine v2 |
| 14 | F33–F38: Smart Notes v2 |
| 15 | F39–F44: Adaptive Mastery Tracker |
| 16 | F45–F51: Math Scaffold Engine |
| 17 | F52–F58: Visual Learning Tools |
| 18 | F59–F67: Writing Co-Author Engine |
| 19 | F68–F74: Science Scaffold Engine |
| 20 | F75–F81: History & Social Studies Engine |
| 21 | F82–F88: Computer Science Engine |
| 22 | F89–F95: Foreign Language Engine |
| 23 | F96–F102: School System Integration |
| 24 | F103–F109: Emotional Intelligence |
| 25 | F110–F115: Arts & Electives |
| 26 | F116–F120: PE & Health |
| 27 | F121–F126: AP Command Center |
| 28 | F127–F134: ADHD Executive Function Tools |
| 29 | F135–F141: Vocabulary + Reading Scaffold |
| 30 | F142–F148: Teacher + Parent Portal |
| 31 | F149–F154: Platform Intelligence |
| 32 | F155–F161: Offline + PWA Excellence |
| 33 | F162–F168: Personalization v2 |
| 34 | F169–F173: Social + Collaboration |
| 35 | Hardening + Launch |

**Total new features: 152 (F22–F173)**

---

## Recommended Build Order (Priority Tiers)

### Tier 1 — Foundation for everything else (Phases 12–16)
These unlock the AI personalization that makes all later subject engines feel alive.
1. Phase 12 (Identity + Live Capture) — AI can't personalize without knowing the student
2. Phase 13 (Accessibility v2) — Devon and Alex can't use the app without these
3. Phase 14 (Smart Notes v2) — Notes are the input for every subject engine
4. Phase 15 (Mastery Tracker) — Needed to avoid re-teaching what student already knows
5. Phase 16 (Math Scaffold) — Math is the #1 homework help need

### Tier 2 — Subject engines (Phases 17–22)
Each is independent, can run in parallel teams.
- Phase 17 (Visual Tools) + Phase 18 (Writing) are highest usage after Math
- Phase 19 (Science) + Phase 20 (History) can follow
- Phase 21 (CS) + Phase 22 (Language) for completeness

### Tier 3 — Infrastructure + integrations (Phases 23–26)
- Phase 23 (LMS Integration) requires school partnerships — start conversations early
- Phase 24 (Emotional Intelligence) can be A/B tested
- Phase 28 (ADHD Tools v2) is highest impact for core ADHD users

### Tier 4 — Advanced + social (Phases 27–35)
- Phase 27 (AP) for SAT/AP season — time-sensitive feature
- Phase 35 (Hardening) before any school district deal

---

## AI Cost Model (v2.0 projections)

| Feature | Model | Est. tokens/use | Uses/student/day |
|---------|-------|-----------------|-----------------|
| Math scaffold step | Haiku 4.5 | 800 | 5 |
| Writing co-write | Sonnet 4.6 | 1200 | 3 |
| Science hypothesis | Haiku 4.5 | 600 | 2 |
| Note synthesis | Sonnet 4.6 | 3000 | 1 |
| Language vocab | Haiku 4.5 | 400 | 8 |
| Live transcription | Whisper API | — | 1 session |
| Mastery question | Haiku 4.5 | 500 | 4 |

**Daily budget target:** 80,000 tokens/student = ~$0.08/student/day (Haiku pricing)

---

## Database Migrations Needed (v2.0)

| Migration | Tables/Columns |
|-----------|----------------|
| 0020 | `profiles.interests[]`, `profiles.mastery_signals jsonb`, `profiles.session_mood` |
| 0021 | `profiles` accessibility reading/TTS preferences and TTS provider constraint |
| 0022 | `notes.tags`, `notes.ai_suggested_tags`, generated `notes.search_vector` |
| 0023 | `mastery_concepts`, `mastery_events`, `flashcards.concept_id` |
| 0024 | `canvas_integrations`, `google_classroom_integrations` tables |
| 0025 | `profiles` mood cadence columns, `student_reflections` table |
| 0026 | `portfolios`, `portfolio_items` tables |
| 0027 | `wellness_activity_logs`, `wellness_goals`, `sleep_logs` tables |
| 0028 | `ap_exam_plans`, `ap_practice_attempts` tables |
| Phase 28 | No new migration; reuses `assignment_steps`, `inbox_items`, `assignment_time_log`, and `assignment_type_estimates` |
| 0029 | `vocabulary_terms`, `reading_annotations` tables |
| 0030 | `assignments.ai_mode_override`, `class_roster_members`, `teacher_progress_notes`, `accommodation_confirmations` |
| 0031 | `feature_flags`, `analytics_events`, `error_events`, `performance_events`, `experiments` |
| Phase 32 | No new migration; uses IndexedDB queues, service worker cache, and existing notes/assignments/flashcards tables |
| 0032 | `profiles` personalization/privacy JSON, `session_handoffs`, `data_deletion_requests` |
| 0033 | `study_groups`, group collaboration tables, invite/deck install RPCs |
| 0034 | `data_retention_runs`, `purge_due_deletion_requests` service-role RPC |

---

## Edge Functions Needed (v2.0)

| Function | Purpose | Model |
|----------|---------|-------|
| `subject-scaffold` | Generic subject scaffold entry point (routes by subject) | Haiku 4.5 |
| `math-step-hint` | Math Socratic scaffold (never reveals answer) | Haiku 4.5 |
| `writing-cowrite` | Co-write ghost text generation | Sonnet 4.6 |
| `note-synthesize` | Cross-note synthesis | Sonnet 4.6 |
| `concept-question` | Mastery probe questions | Haiku 4.5 |
| `interest-example` | Generate interest-personalized analogy | Haiku 4.5 |
| `freeform-reflect` | Weekly reflection AI mirror | Sonnet 4.6 |
| `arts-scaffold` | Arts, music, drama, art history, storyboard scaffold | Haiku 4.5 |
| `health-scaffold` | PE, health, CPR/first aid, sleep recovery scaffold | Haiku 4.5 |
| `ap-scaffold` | AP FRQ, MCQ, and study-plan scaffold | Haiku 4.5 |
| `task-breakdown` | Five-minute assignment micro-step decomposition | Haiku 4.5 |
| `vocab-hover` | Context-aware vocabulary definitions and phonics support | Haiku 4.5 |
| `reading-level` | Simpler / more-detail reading adaptation | Haiku 4.5 |
| `lab-scaffold` | Science lab report builder | Haiku 4.5 |
| `primary-source` | History document analyzer | Sonnet 4.6 |
| `language-vocab` | Foreign language vocabulary with audio | Haiku 4.5 |
| `ap-frq-scaffold` | AP FRQ structured scaffold | Sonnet 4.6 |
| `mind-map-gen` | Note → mind map JSON | Haiku 4.5 |
| `note-link` | Semantic note linking | (embedding, not chat) |

---

## What Diana v2.0 Will Be Better At Than Every Competitor

| Capability | Best competitor | Why Diana wins |
|-----------|----------------|----------------|
| Subject-specific scaffolding | Khan Academy | Diana knows the student's IEP, interests, and current mastery |
| Document understanding | NotebookLM | Diana links notes to assignments and generates study tools |
| Math step-by-step | Photomath | Diana never gives the answer — teaches, not solves |
| Writing assistance | Grammarly | Diana teaches writing; shows authorship %; never rewrites without asking |
| Accessibility | None (all fail) | Bionic reading + line focus + OpenDyslexic + TTS + voice input in one app |
| ADHD accommodation | None | Micro-steps + interrupt recovery + body-doubling + calm invariant |
| Privacy for minors | Most fail | COPPA-compliant, student owns data, parent access requires student consent |
| LMS integration | Schoology (partial) | Canvas + Google Classroom + Clever SSO |
| Emotional safety | None | Mood check-in, frustration detection, burnout signal, zero shame language |
| Offline capability | Google Classroom | Full offline editing + sync |

---

## Success Metrics (v2.0)

| Metric | Target | Why |
|--------|--------|-----|
| Student daily active usage | >60% of enrolled | Indicates real homework utility |
| Session length | 20–45 min average | Long enough to be useful, short enough to be healthy |
| Math scaffold completion rate | >70% | Students finishing problems, not abandoning |
| Accommodation adoption rate | >80% for eligible users | Accessibility features actually used |
| Note-to-flashcard conversion | >30% | Notes being studied, not just stored |
| LMS sync activation | >50% of users | Students trusting Diana as primary tool |
| Parent satisfaction | >4.2/5 | Parents see value, renew subscription |
| Teacher NPS | >40 | Teachers recommend to colleagues |
| AI cost per student/day | <$0.12 | Business viability |

---

*This document is the definitive product vision for Diana v2.0. Each phase maps to a GSD phase in `.planning/ROADMAP.md`. Implementation begins with Phase 12.*
