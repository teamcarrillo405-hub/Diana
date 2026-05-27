# Diana — Research Findings (Phase 0)

**Project**: Diana — a PWA for US high school students (grades 9–12) with ADHD and/or dyslexia. Organization, note-taking, reading aids, writing aids, math step-organizing, AI study tools, tailored per class and per teacher's rubric.

**Purpose of this document**: Drive every Phase 1 feature decision. No app code is written until this is reviewed and approved.

**Method**: Web research across peer-reviewed papers, clinical advocacy bodies (CHADD, IDA, Understood.org), state and federal ed-tech guidance, ed-tech product documentation, lived-experience sources (Reddit, blogs, ADDitude). Three parallel research streams synthesized into the seven research questions below.

---

## Executive summary — the 12 things that matter most

1. **Comorbidity is the rule, not the edge case.** ~38% median ADHD+dyslexia overlap; ~18% ADHD+dyscalculia; ~66% of dyslexic students show math difficulty. Don't silo features by diagnosis — every student profile is composite. ([Sage / van Bergen 2025](https://journals.sagepub.com/doi/10.1177/09567976241293999); [PMC10869821](https://pmc.ncbi.nlm.nih.gov/articles/PMC10869821/))

2. **"Done ≠ Submitted" is an unfilled hole.** Students with ADHD finish work then forget to turn it in. No competitor models the submission step as a distinct, badgered workflow. This is Diana's most defensible single feature. ([CHADD](https://chadd.org/attention-article/tracking-homework-assignments-why-students-with-adhd-struggle/))

3. **Show "your next 5 minutes," not "your week."** Task paralysis responds to decision elimination. Lists of 12 items make it worse; one specific next action helps. ([Riveta Labs](https://rivetalabs.com/blogs/executive-function-lab/adhd-paralysis-school-homework))

4. **AI must be a scaffold, never a ghostwriter.** This is structural, not a marketing claim. AI never emits final-product text; only operates on the student's own input (summarize *their* notes, format *their* citations, transcribe *their* voice, check *their* draft); refuses-with-redirect when asked to cross the line. ([AI Competence](https://aicompetence.org/ai-socratic-tutors/); [MagicSchool FAQ](https://www.magicschool.ai/faq))

5. **Authorship logs are the integrity defense.** A Grammarly-Authorship-style record of what came from the student vs. Diana vs. paste makes "this is an accommodation, not cheating" defensible to skeptical teachers and parents. ([Grammarly Authorship](https://www.grammarly.com/authorship))

6. **Per-teacher rubric awareness is the unique wedge.** Quizlet decks are generic; Khanmigo is tied to Khan content; ChatGPT has no class memory. Letting the student paste in *their* teacher's syllabus/rubric and having Diana ground every AI feature in "what your English teacher actually rewards" is a defensible moat.

7. **Socratic-by-default, with escape valves.** Pure Socratic frustrates real ADHD students out of the tool (documented Khanmigo failure mode). Offer "show me a worked example of a *different* problem" so frustration doesn't drive defection to unrestricted ChatGPT. ([NeuralClass on Khanmigo](https://neuralclass.uk/articles/khanmigo-in-the-classroom-what-teachers-actually-get))

8. **The popular "dyslexia features" don't work.** OpenDyslexic font has no measurable benefit; Bionic Reading slows readers down. Ship them as options for subjective comfort, but lead with evidence-backed defaults: sans-serif (e.g., Atkinson Hyperlegible / Lexend), generous line/letter spacing, off-white background, chunking. ([Edutopia](https://www.edutopia.org/article/do-dyslexia-fonts-actually-work/); [The Conversation](https://theconversation.com/can-bionic-reading-make-you-a-speed-reader-not-so-fast-183905))

9. **Highest-ROI evidence-backed levers (effect sizes attached):** externalized working memory (qualitative, huge), FSRS spaced repetition (25% fewer reviews than SM-2 at same retention), retrieval practice (g≈0.70), text-to-speech for comprehension (d≈0.35, up to 1.58 grade levels in some studies), implementation intentions (normalizes ADHD inhibition), interleaving once topics are past acquisition (g≈0.34–0.42, classroom RCTs up to d=0.83–1.21).

10. **Function without teacher buy-in.** ~38% of documented 504 accommodations are *never implemented* by teachers. Diana cannot rely on the teacher cooperating. Self-serve accommodation, no requests to faculty, no IEP gating.

11. **Tone is a feature.** Rejection-Sensitive Dysphoria, masking fatigue, and years of red-pen criticism mean a wrong tone — scold, "incorrect," public dashboards, streak-shaming — loses the user permanently. Default to warm, non-evaluative, private-by-default. ([ADDitude RSD](https://www.additudemag.com/rejection-sensitive-dysphoria-adhd-emotional-dysregulation/))

12. **Compliance: build to the strictest (NY §2-d + CA SOPIPA), be COPPA-ready for 13-year-old freshmen, FERPA-architected for the school tier.** Zero Data Retention on OpenAI, no-training default on Anthropic, NIST CSF alignment, plain-language Parents' Bill of Rights from day one. ([NYSED §2-d](https://www.nysed.gov/data-privacy-security/education-law-section-2-d-definitions); [CA SOPIPA](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=201320140SB1177); [FTC COPPA 2025 amendments](https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-finalizes-changes-childrens-privacy-rule-limiting-companies-ability-monetize-kids-data))

---

## Question 1 — Lived experience: what high schoolers with ADHD/dyslexia actually struggle with

### 1.1 Comorbidity reality

ADHD and dyslexia co-occur far more often than chance: **~40% of students with a reading disorder also meet criteria for ADHD**; up to **45% of people with ADHD also have dyslexia**; clinical comorbidity runs **25–48%** with a median of **~38%** ([Sage/van Bergen 2025](https://journals.sagepub.com/doi/10.1177/09567976241293999); [WPS Publish](https://www.wpspublish.com/blog/dyslexia-comorbdities-what-you-need-to-know)). **~18% of kids with ADHD also have dyscalculia** ([Monster Math](https://www.monstermath.app/blog/adhd-and-dyscalculia-can-they-occur-together-cm74rx84600drr1l2f2hh2ucs)). **~66.6% of students with dyslexia show some math difficulty** ([PMC10869821](https://pmc.ncbi.nlm.nih.gov/articles/PMC10869821/)).

*Implication for Diana*: Never force users to pick a "mode." Reading aids + executive-function aids + math aids must be additively co-present per user. The composite-profile student is the norm.

### 1.2 Executive function: delayed development, not laziness

CHADD frames ADHD as fundamentally an "executive functioning impairment: working memory is impaired, so thinking inside your head is impaired" ([CHADD](https://chadd.org/attention-article/insights-on-adhd-and-executive-functioning-a-thinking-impairment/)). Prefrontal cortex development can lag peers by up to 30% — a 12-year-old may self-regulate like a typical 9-year-old ([Child Mind Institute](https://childmind.org/article/helping-kids-who-struggle-with-executive-functions/)). Daily failures: forgotten homework, disorganized projects, running out of time on tests.

*Implication for Diana*: Treat the user as someone whose internal scratchpad is unreliable. Externalize state aggressively (visible queues, persistent next-action prompts). Never assume they remember yesterday.

### 1.3 "I did the homework but didn't turn it in" — the most universal failure

CHADD: ADHD students "consistently neglect turning in homework or long-term projects, even though they claim to have completed the work" — they get distracted between completing and submitting, complete and forget to upload, or lose the paper between the kitchen table and the locker ([CHADD: Tracking Homework](https://chadd.org/attention-article/tracking-homework-assignments-why-students-with-adhd-struggle/); [Understood](https://www.understood.org/en/articles/why-kids-dont-hand-in-their-work-even-if-they-did-it)). Practitioners note electronic submission is easier "because there is a button that reminds them to do it" ([Creating Positive Futures](https://creatingpositivefutures.com/why-its-hard-for-students-to-just-turn-in-missing-assignments-and-how-to-get-them-unstuck/)).

*Implication for Diana*: **Highest-ROI single feature**. A "Done ≠ Submitted" state machine — once a student marks an assignment complete, Diana must badger them about the submission step (LMS link, photo of physical paper, "did you actually click Turn In?") as a distinct workflow.

### 1.4 Task initiation paralysis (not procrastination)

Neurologically distinct from procrastination: "the brain's activation system misfires — the part of the brain that says 'start now' does not send the signal" ([Riveta Labs](https://rivetalabs.com/blogs/executive-function-lab/adhd-paralysis-school-homework)). Three common homework triggers: too many assignments to choose from; a task that feels too big; a vague first step. Documented fix: "pre-selecting the first task before homework time and writing it on an index card (e.g., 'Start with math page 47')" ([Riveta Labs](https://rivetalabs.com/blogs/executive-function-lab/task-initiation-adhd-teens); [Dr. Sharon Saline](https://www.drsharonsaline.com/blog/2025/09/adhdparalysis)).

*Implication for Diana*: Never show 12 things. Show "your next 5 minutes is: open Algebra 2, page 47, problems 1–3." Decision elimination beats decision support.

### 1.5 Time blindness — underestimating duration, missing deadlines despite caring

"People with ADHD often experience time blindness and struggle to sense the passage of time, visualize the future, or feel urgency until a deadline is immediate" ([ADDitude DESR](https://www.additudemag.com/desr-adhd-emotional-regulation/); [Understood](https://www.understood.org/en/articles/help-adhd-teens-create-time-management-system)). Working-memory snowballing: "kids don't remember that they won't remember their homework if they don't write it down" ([Child Mind Institute](https://childmind.org/article/helping-kids-who-struggle-with-executive-functions/)).

*Implication for Diana*: Track actual vs. estimated time per assignment type per student; surface calibrated estimates ("you said 30 min for lab writeups but you typically take 90"). Time should be *felt*, not merely displayed — visual countdowns, ambient indicators, "if you start now you'll finish at 9:15 PM."

### 1.6 Reading fatigue is physiological

fMRI scans of dyslexic readers show "very scattered activity, indicating high effort levels as they work around an inability to effortlessly connect text to their word memory" ([Literacy Nest](https://www.theliteracynest.com/2023/09/understanding-fatigue-from-dyslexia.html); [LD OnLine](https://www.ldonline.org/forum/teaching-students-ld-and-adhd/dyslexia-and-fatigue)). The fatigue compounds across a 7-period day, leaving little for evening homework.

*Implication for Diana*: Reading-load awareness — let the student (and optionally parents) see how much pure reading is queued for tonight. Default to TTS + chunked passages, not full text walls.

### 1.7 Writing avoidance as self-protection, not defiance

"Task avoidance is one of the most common behaviors that students with undiagnosed dyslexia may exhibit ... ranging from consistently not turning in work while still attending class, to skipping class when a book reading or written assignment is due. Parents may see rushing, procrastination, daydreaming, 'I forgot my book,' and other behaviors that appear to be defiance but are actually forms of coping" ([SmartBrief](https://www.smartbrief.com/original/identifying-students-dyslexia-middle-high-school)). Teens with dyslexia "choose shorter assignments ... put off homework that involves a lot of reading, and prefer to explain ideas out loud rather than in writing" ([Dyslexia.com](https://www.dyslexia.com/about-dyslexia/signs-of-dyslexia/the-undiagnosed-teenager-with-dyslexia/)).

*Implication for Diana*: Dictation-to-draft and "explain it out loud first" pipelines should be first-class entry points to any writing task, not buried features.

### 1.8 Note-taking during lectures is brutal

"For many students with dyslexia, handwriting is not automatic, which makes it an extremely slow and difficult process. It is difficult ... to listen and take notes at the same time" — attention on spelling each word means missing what the teacher said next ([Study.com](https://study.com/academy/lesson/note-taking-strategies-for-dyslexic-students.html); [LD OnLine](https://www.ldonline.org/ld-topics/writing-spelling/helping-students-who-struggle-write-classroom-compensations)). Spelling impairments persist into adulthood ([NCBI PMC11274375](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11274375/)).

*Implication for Diana*: In-class capture defaults to audio + AI transcript + structured outline scaffold; the student adds markers/sticky notes during class, not blank-page typing.

### 1.9 Math sequencing errors and "careless" mistakes

"The stumbling block with word problems lies in the combination of words and numbers that make it difficult to store the information in their memory as they progress through the problem" ([CHADD](https://chadd.org/attention-article/executive-functioning-disorder-and-mathematics/)). Documented patterns: "switch errors" (applying yesterday's operation to today's problem), losing track of step n while doing step n+1, burning so much working memory on organization that there's nothing left for computation ([Monster Math](https://www.monstermath.app/blog/6-ways-to-catch-careless-math-mistakes-in-adhd-learners); [Healthline](https://www.healthline.com/health/adhd-and-math)).

*Implication for Diana*: The math feature should not look like Photomath ("here's the answer"). It should externalize the working-memory stack as a visible per-problem step ledger the student fills in, with the AI checking sign/units/sense without doing the algebra. Recommended scaffold: per-problem "Plan → Compute → Check sign/units → Sense-check."

### 1.10 Test anxiety, RSD, and the emotional residue

**53% of students with learning difficulties show emotional distress**; anxiety the most common (53%), then stress (30%), then depression (27%); **~29% of kids with a learning disability also have an anxiety disorder** ([K12 Tutoring](https://tutoring.k12.com/resources/parent-guides/testing-and-exams/test-anxiety-support/helping-high-school-students-cope-with-test-anxiety/); [ResearchGate 398718430](https://www.researchgate.net/publication/398718430_Linking_Self-Reported_Symptoms_of_ADHD_Dyslexia_and_Emotional_Distress_to_Academic_Engagement_in_Students)). Dyslexic students experience "humiliation, being bullied and feelings of not belonging" ([Gemm Learning](https://www.gemmlearning.com/blog/dyslexia/dyslexia-mental-health/); [IDA](https://dyslexiaida.org/social-emotional/)). Rejection-Sensitive Dysphoria compounds this: years of criticism create "a 'mindset of failure' that distorts how they read social situations" ([ADDitude](https://www.additudemag.com/rejection-sensitive-dysphoria-adhd-emotional-dysregulation/)).

*Implication for Diana*: Tone matters enormously. AI feedback defaults to warm, non-evaluative. "You got X wrong" framing will lose users instantly. Celebrate micro-wins; never use red-pen styling; never publicly shame missed work.

### 1.11 The masking tax

Students burn cognitive load all day "masking" their difficulties. "The effort to keep up or 'mask' their difficulties may create chronic stress and anxiety" ([NCBI PMC9018082](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9018082/)).

*Implication for Diana*: The app must work in social contexts (in class, in study groups) without visible stigma — discreet TTS via headphones, AI that acts like a tutor rather than an obvious accommodation device.

---

## Question 2 — Existing tools gap analysis

For each tool: what it does well, where it specifically fails the ADHD/dyslexia high school population, and the gap Diana can fill.

### 2.1 MyHomework Student Planner
**Well**: Free, cross-platform assignment tracking with notifications; functional class/teacher organization ([App Store](https://apps.apple.com/us/app/myhomework-student-planner/id303490844); [JustUseApp](https://justuseapp.com/en/app/303490844/myhomework-student-planner/reviews)).
**Fails**: UI "feels like it was designed in 2010 and isn't super intuitive"; no multiple reminders for long-horizon projects; no *starting* scaffold — just a list of what's due; no LMS submission bridge; no reading-load awareness; pure text inputs hostile to dyslexic students ([Nocramming](https://forum.nocramming.com/threads/homework-planner-for-students-which-one-works-best.50/)).
**Diana fills**: "Done ≠ Submitted" state machine; time-blindness-calibrated estimates; task-paralysis first-action selection; dictation-based assignment entry.

### 2.2 Goodnotes 6
**Well**: Best-in-class iPad handwriting + PDF markup; searchable handwriting; AI Math Assistance ([Goodnotes 6 launch](https://www.goodnotes.com/blog/introducing-goodnotes-6); [MyNextTablet](https://mynexttablet.com/goodnotes-6-review/)).
**Fails**: iPad-only (expensive, not universal in US public HS); handwriting is the *worst* input modality for dyslexic students who can't spell at speed; the "endless customization" perk is also the trap (cf. Notion below); no audio-first capture; templates require executive function to choose and maintain.
**Diana fills**: Web/PWA-first (no device gatekeeping); audio + transcript as default capture pipeline; structured-from-the-start notes instead of blank-canvas-plus-template.

### 2.3 Notion (incl. Notion AI)
**Well**: Maximally flexible workspace; AI summarization and Q&A over your notes.
**Fails**: "~30% of Notion users mention that Notion's complexity can be a hurdle initially, particularly for those with ADHD"; ADHD users "gravitate toward comprehensive systems because they look impressive and promise total life organization, but if overwhelm is your primary challenge, that complexity becomes the enemy" ([AFFiNE](https://affine.pro/blog/notion-templates-for-adhd); [Producing Paradise](https://www.producingparadise.com/articles/tools/how-to-create-an-adhd-friendly-task-dashboard-in-notion)). Setup-as-procrastination is the known anti-pattern; templates require maintenance students don't have spoons for; nothing dyslexia-specific.
**Diana fills**: Opinionated, school-specific structure pre-built per class — no setup, no template hunt.

### 2.4 Quizlet
**Well**: Low-friction deck creation, millions of pre-made sets, game modes, classroom sharing ([Coursebox](https://www.coursebox.ai/blog/quizlet-vs-anki); [AnkiAI](https://www.ankiai.org/blog/anki-vs-quizlet)).
**Fails**: "Learn" mode "mimics spaced repetition but resets every session and doesn't track your performance across days and weeks" — doesn't build durable memory the way ADHD students with working-memory deficits need; pre-made decks often wrong or off-rubric for the actual teacher; paywalls block image upload, offline, analytics.
**Diana fills**: Decks auto-generated from *the student's own notes and the teacher's rubric*, with true spaced repetition tied to actual upcoming test dates.

### 2.5 Anki
**Well**: Gold-standard true spaced repetition; durable long-term retention; cross-platform ([FlashRecall](https://flashrecall.app/blog/anki-and-quizlet)).
**Fails**: "Steep learning curve"; card creation is exactly the executive-function-heavy task ADHD students avoid ([Noji](https://noji.io/blog/make-flashcards-with-adhd/)); dated unforgiving UI; no reading scaffolds.
**Diana fills**: Hide the SRS engine behind an AI that builds the cards from the student's notes and quizzes them in conversational/voice modes.

### 2.6 Speechify / NaturalReader
**Well**: Speechify — natural voices (9/10), synced text highlighting, explicitly built for dyslexia, $11.58/mo ([Speechify comparison](https://speechify.com/product-reviews/vs/speechify-vs-natural-reader/)). NaturalReader — used in 2,000+ educational institutions; broad language support ([Voice.ai](https://voice.ai/hub/tts/natural-reader-vs-speechify/)).
**Fails**: Pure TTS — don't comprehend or summarize; don't connect to assignments or rubric; no quiz-yourself loop; require manual import of every reading; subscription cost stacks on top of school tech.
**Diana fills**: TTS as a feature *inside* an integrated reading + comprehension + assignment loop.

### 2.7 OpenDyslexic font (and dyslexia-font category broadly)
**Well**: Free; popular; available as a low-friction toggle.
**Fails**: **Evidence is weak.** A controlled study found "no improvement in reading rate or accuracy for individual students with dyslexia, as well as the group as a whole"; another found it the **least preferred font** by readers ([Springer Annals of Dyslexia](https://link.springer.com/article/10.1007/s11881-016-0127-1); [Nessy](https://www.nessy.com/en-us/dyslexia-explained/understanding-dyslexia/dyslexia-fonts-do-they-work); [Edutopia](https://www.edutopia.org/article/do-dyslexia-fonts-actually-work/)). What *does* help: increased letter/line spacing.
**Diana fills**: Offer the font as an optional toggle but ship evidence-based defaults — increased letter/line spacing, generous margins, sans-serif (Lexend / Atkinson Hyperlegible).

### 2.8 Bionic Reading
**Well**: Eye-catching UI gimmick; some users report subjective benefit.
**Fails**: A 2,000+ participant study found users read **2.6 wpm slower** with Bionic Reading; a 245-participant study found no significant differences; the inventor's own 12-person test did not include people with dyslexia ([The Conversation](https://theconversation.com/can-bionic-reading-make-you-a-speed-reader-not-so-fast-183905); [Language Educators Assemble](https://languageeducatorsassemble.com/bionic-reading/)).
**Diana fills**: Don't lead with it as marketed feature; offer as one of several optional rendering modes with honest UX language.

### 2.9 Grammarly
**Well**: 250+ error types in free tier; color-coded suggestions; widely used by dyslexic students ([Adapt and Learn](https://www.adaptandlearn.com/post/grammarly-as-assistive-technology-for-writing); [U Mich Dyslexia Help](https://dyslexiahelp.umich.edu/latest/grammarly-grammar-checker/)).
**Fails**: "Grammarly is not designed as a tool for people with dyslexia" — some users report it's "no longer dyslexic-friendly" after generative AI changes ([Permies thread](https://permies.com/t/218187/Grammarly-longer-dyslexic-friendly-alternitive)); universities increasingly flag Grammarly's generative features as academic-integrity gray zones ([American University](https://www.american.edu/news/grappling-with-grammarly-and-generative-ai.cfm)). It corrects without teaching — students don't internalize patterns.
**Diana fills**: Writing feedback that explains *why* and asks the student to make the fix, with per-teacher rubric awareness (e.g., your English teacher hates passive voice; your bio teacher requires it).

### 2.10 Photomath
**Well**: Step-by-step solutions for photographed problems; instant.
**Fails**: The defining gray zone — teachers strip questions Photomath can solve from tests ([RETHINK Math Teacher](https://www.rethinkmathteacher.com/how-to-stop-students-from-using-the-photomath-app/); [Cherish Study](https://cherishstudy.com/is-photomath-cheating-photomath-and-cheating/)). For ADHD/dyscalculia students it skips the working-memory externalization step they actually need — they get an answer without ever building procedural memory or self-monitoring habit.
**Diana fills**: Math feature that *requires* the student to fill in the step ledger and only validates each line — never solves the whole problem. This is the defensible accommodation-not-ghostwriter line.

### 2.11 Khanmigo (Khan Academy AI)
**Well**: GPT-4-based Socratic tutor; high marks on Common Sense Media; $4/mo individual; "students who used Khanmigo for math showed noticeably better retention compared to those who watched video explanations alone" ([Common Sense Media](https://www.commonsensemedia.org/ai-ratings/khanmigo); [KidsAITools](https://www.kidsaitools.com/en/articles/khanmigo-review-khan-academy-ai-tutor); [Education Next](https://www.educationnext.org/comparing-online-ai-assisted-learning-students-view-khan-academy-khanmigo/)). "Designed to never give students direct answers ... uses the Socratic method, guiding learners through problems with questions and hints" ([Khanmigo](https://www.khanmigo.ai/learners); [Skywork](https://skywork.ai/skypage/en/Khanmigo-Deep-Dive:-How-Khan-Academy's-AI-is-Shaping-the-Future-of-Education/1972857707881885696)).
**Fails**: "The Socratic method requires patience, and for students who get frustrated easily, being asked question after question can feel annoying rather than educational, with some students ... simply stopping use" ([MyEngineeringBuddy](https://www.myengineeringbuddy.com/blog/khanmigo-reviews-alternatives-pricing-offerings/)); tied to Khan content — not the student's *own* teacher's rubric; math-strong, weak on humanities; no reading aids, planner, or writing scaffold.
**Diana fills**: Same Socratic discipline, but (a) tuned for ADHD frustration tolerance (shorter chains, adaptive directness, "show a worked example of a *different* problem" escape valve), (b) integrated with the student's actual class materials and rubric, (c) extends to reading and writing not just problem-solving.

### 2.12 ChatGPT-as-study-aid
**Well**: Universal availability; **~97% of Gen Z students surveyed have used AI for schoolwork** ([Freedom For All Americans](https://freedomforallamericans.org/chatgpt-education-debate/)); can summarize, draft, quiz, explain.
**Fails**: Default behavior is to *do* the work; "excessive use of AI tools can decline writing skills, increase incidents of plagiarism and cheating, and decrease focus" ([Missouri Office of Academic Integrity](https://oai.missouri.edu/chatgpt-artificial-intelligence-and-academic-integrity/)); generic blank chat = decision paralysis for ADHD students; no per-class memory across sessions; inaccurate answers go undetected by students who lack the meta-skill to verify.
**Diana fills**: A locked-down student-AI persona that *cannot* produce finished work, only scaffolds; per-class memory; teacher-visible interaction logs so use is defensibly an accommodation.

### 2.13 Microsoft Immersive Reader
**Well**: Free; built into Word/Edge/Teams; adjustable text size/spacing/font/theme; syllable breaks; parts-of-speech coloring; line focus; picture dictionary; "originally designed to support readers with dyslexia and dysgraphia" ([Microsoft Learn](https://learn.microsoft.com/en-us/training/educator-center/product-guides/immersive-reader/); [UWE Bristol](https://digitallearning.uwe.ac.uk/make-learning-more-accessible-using-microsofts-immersive-reader/)).
**Fails**: Only works on content in Microsoft surfaces; one-way consumption — no quiz, no comprehension scaffold, no link to assignments; many US HS students live in Google Classroom/Canvas.
**Diana fills**: Immersive-Reader-style controls applied to *any* content the student loads into Diana, plus comprehension-check and recall layers on top.

### 2.14 Co:Writer / Read&Write by Texthelp (Everway)
**Well**: Word prediction tuned to dyslexic writers; comprehensive literacy support; multi-sensory; used at scale in K-12 ([Texthelp](https://www.texthelp.com/products/read-and-write-education/readwrite-reviews/); [Pressbooks case study](https://pressbooks.pub/thealttext/chapter/boosting-writing-skills-in-k12-dyslexic-students-using-read-and-write/)).
**Fails**: Browser-extension UX that lives on top of other apps — fragmented; assumes student is already in the right document; doesn't plan, prioritize, or remind; nothing for math; nothing for ADHD task-initiation; a "toolbox" model that asks the student to know which tool to reach for; usually district-licensed.
**Diana fills**: Integrated workflow (plan → read → think → write → submit) rather than a floating toolbar; covers ADHD-side needs alongside dyslexia-side; available to individual students.

### 2.15 MagicSchool AI
**Well**: 80+ teacher-facing tools; FERPA/COPPA/GDPR/SOC 2 Type 2 compliant; supervised student "rooms" with teacher visibility ([MagicSchool](https://www.magicschool.ai/faq); [Educators Technology](https://www.educatorstechnology.com/2026/02/magicschool-ai-review.html)).
**Fails**: Teacher-first — student-facing rooms only exist if a teacher sets them up; performance issues at peak; text leveler doesn't always hit target grade ([Notie AI](https://www.notieai.com/magic-school-ai-review-2025-guide-for-teachers/); [Unite.AI](https://www.unite.ai/magicschool-ai-review/)); no persistent personal organizer.
**Diana fills**: A student-owned account that follows the student across all their classes (including teachers who don't use MagicSchool), with personal organization, planning, and a personality tuned for ADHD/dyslexia rather than generic K-12.

---

## Question 3 — Misunderstandings and accommodation myths

The dominant pattern: schools treat accommodations as *substitutions* (more time, an audiobook, a planner) rather than as *scaffolds layered with explicit instruction*. The myths below carry real daily-life costs.

### 3.1 "Just give them extended time"

Extended time appears on **88% of IEP/504 plans** for adolescents with ADHD, despite limited evidence it improves their performance ([PMC4285444](https://pmc.ncbi.nlm.nih.gov/articles/PMC4285444/)). A 2021 JAACAP systematic review (Lovett & Nelson) of 497 documents found "most accommodations fail to show evidence of benefits that are specific to students with ADHD" ([PMC5424262](https://pmc.ncbi.nlm.nih.gov/articles/PMC5424262/)). "Fewer than half of students with ADHD actually used their extended time accommodations, and only those who used them saw any improvement"; some research suggests extended time can have an *iatrogenic* effect, worsening outcomes for ADHD students who fatigue ([Structural Learning](https://www.structural-learning.com/post/504-accommodations-adhd-evidence-based)).

*Implication for Diana*: Never frame extra time as the headline support. Build features that restructure *the work itself* — chunking, time-boxing, externalized prompts.

### 3.2 "Use audiobooks" — without comprehension scaffolds

Audiobooks reduce decoding burden ([Learning Ally](https://learningally.org/resource/why-graphic-novels-audiobooks-are-a-game-changer-for-struggling-readers)), but the research nuance is missed: audio-support changed the *strategies* students used; for open-ended assignments, students moved toward "more intensive reading strategies" and spent *more* time, and performance was only similar to non-audio peers ([PMC9187546](https://pmc.ncbi.nlm.nih.gov/articles/PMC9187546/)). Schools hand a student a Bookshare login and assume comprehension is solved; in practice, the student still needs vocabulary preview, comprehension checks, pacing scaffolds.

*Implication for Diana*: TTS alone is table stakes. Pair it with active-reading prompts (predict, summarize, define-this-word) embedded in the listening experience.

### 3.3 "Just use a planner" — without teaching planning

Executive-function skills "are often not typically explicitly taught, leaving students with executive dysfunction feeling as if they're bad at school with no way to improve" ([Effective Students](https://effectivestudents.com/articles/executive-function-skills-checklists-for-students-free-pdf-download/)). The only thing that works is "I do it / we do it / you do it" with extensive scaffolding ([Life Skills Advocate](https://lifeskillsadvocate.com/blog/teaching-executive-function-skills/); [CHADD](https://chadd.org/attention-article/executive-functioning-support-for-kids-with-adhd/)). "Show students how to use tools like planners or digital apps to manage their time and tasks. Don't just provide them with the tool and expect them to automatically begin using it" ([Life Skills Advocate](https://lifeskillsadvocate.com/blog/teaching-executive-function-skills/)).

*Implication for Diana*: The planner UI must *teach* planning — model the breakdown of an assignment into steps the first time, fade scaffolding as the student takes over.

### 3.4 "Dyslexia is letter reversals / a visual problem"

The single most persistent teacher misconception. Head Start teachers "held the prevailing misconception that dyslexia is a visual processing disorder rather than a phonological processing disorder"; 71.8% of teachers in another study said dyslexia was "not covered well at all" in initial training ([PMC6099274](https://pmc.ncbi.nlm.nih.gov/articles/PMC6099274/)). U-Mich Dyslexia Help: "individuals with dyslexia do not 'read backwards.' Their spelling can look quite jumbled at times not because they read or see words backwards, but because students have trouble remembering letter symbols for sounds" ([Dyslexia Help](https://dyslexiahelp.umich.edu/parents/learn-about-dyslexia/what-is-dyslexia/debunking-common-myths-about-dyslexia/)).

Louisa Moats also dismantles the "dyslexia is a gift" myth ([IDA](https://dyslexiaida.org/louisa-moats-debunks-five-popular-myths-about-dyslexia/)).

*Implication for Diana*: Avoid visual-distortion gimmicks as if they were the fix. Lean on TTS, phonics-friendly font choices, and never imply dyslexia is "seeing letters wrong."

### 3.5 "ADHD kids are lazy / could try harder"

Russell Barkley: "ADHD isn't a knowledge problem — it's a performance problem. Kids with ADHD know what they're supposed to do; they just struggle to do it in the moment" ([Growing Minds](https://www.growingmindscoaching.com/blog/why-punishment-backfires-with-adhd-kids-and-what-to-do-instead)). Forgetfulness "is a performance gap rooted in working memory and time-perception differences" ([Psychology Today](https://www.psychologytoday.com/us/blog/promoting-empathy-with-your-teen/202503/why-adhd-teens-struggle-with-discipline-and-what-works)). Punishment "doesn't build executive function. It builds resentment and learned helplessness" ([Alex AG Therapy](https://www.alexagtherapy.com/post/why-punishment-doesn-t-work-for-kids-with-adhd-and-what-to-do-instead)).

*Implication for Diana*: Every reminder/notification must externalize time and future consequences. Failure-state tone must never read as scolding — missed deadline = reset, not failure.

### 3.6 The 2e blind spot — "smart kids can't have a learning disability"

Twice-exceptional students "are among the most under-identified and underserved population in schools" because "giftedness can mask learning disabilities while learning disabilities can hide intellectual gifts" ([Davidson Institute](https://www.davidsongifted.org/gifted-blog/twice-exceptional-definition-characteristics-identification/); [Frontiers 2025](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2025.1696805/full)). Common pattern: "a child with dyslexia might memorize passages to hide their reading troubles" ([Davidson](https://www.davidsongifted.org/gifted-blog/gifted-adhd-masking-signs-effects-how-to-help/)). 2e students are routinely labeled "lazy and unmotivated" ([Foundations Cognitive](https://foundationscognitive.com/blog/twice-exceptional)). Crucially: "you can have a learning disability and also be in like AP classes" ([Counseling Center Group](https://counselingcentergroup.com/adhd-misconceptions/)).

*Implication for Diana*: Never gate accommodations behind low-performance signals. An AP student using TTS and step-organizers is the rule, not the edge case.

### 3.7 Inattentive ADHD in girls — invisible all the way through HS

"You don't see these young people; they just sit in the back of the classroom, don't cause trouble and often fall through the cracks" ([Cedars-Sinai](https://www.cedars-sinai.org/stories-and-insights/healthy-living/why-adhd-goes-undetected-in-girls)). Inattentive symptoms "are more likely to be present in a structured educational environment, such as in high school or college, which may delay diagnosis among females" ([Capital Area Pediatrics](https://www.capitalareapediatrics.com/blog/why-adhd-is-underdiagnosed-in-girls)). Girls "overcompensate or try harder to cover up their symptoms" ([Child Mind Institute](https://childmind.org/article/how-to-tell-if-your-daughter-has-adhd/)).

*Implication for Diana*: Features must work for self-identified strugglers without an IEP. Don't require a diagnosis to unlock supports.

### 3.8 Reading aloud in class — actively harmful, still routine

"Children with dyslexia ... are more likely to feel stressed when asked to read aloud in class because of their fear of being humiliated or rejected by their peers" ([Springer 2025](https://link.springer.com/article/10.1007/s11881-025-00356-9)). The practice "can give way to stress and anxiety in readers with less confidence" ([Succeed With Dyslexia](https://www.succeedwithdyslexia.org/blog/dyslexia-me-mental-health-reading-anxiety-and-reading-for-pleasure/)). Recommended: "give them opportunities to rehearse if they accept the challenge" ([Reading Rockets](https://www.readingrockets.org/topics/dyslexia/articles/reading-aloud-tips-students-dyslexia)).

*Implication for Diana*: Any read-aloud / oral practice feature must be private-by-default with student-controlled "perform" mode.

### 3.9 Forgotten homework treated as discipline issue

Schools punish missing homework as character problem. "Future consequences feel abstract, making punishments ineffective in changing long-term behavior" ([Forbrain](https://www.forbrain.com/adhd-learning/how-to-discipline-a-child-with-adhd/)). Solution is "setting up a system to support their executive functioning ... rather than punishing forgetfulness" ([Alex AG Therapy](https://www.alexagtherapy.com/post/why-punishment-doesn-t-work-for-kids-with-adhd-and-what-to-do-instead)).

*Implication for Diana*: Capture friction must approach zero — any assignment the student hears about must be capturable in under 10 seconds (voice, photo, one tap).

### 3.10 Plans exist on paper but aren't implemented

**66.4% of parents and students have run into problems with 504 plans not being implemented correctly**; teachers implement only ~62% of documented strategies; "nearly 6 in 10 teachers had 'never' or only 'sometimes' received training on Section 504" ([Sachs Center](https://sachscenter.com/504-plan-template-adhd/); [CHADD](https://chadd.org/adhd-weekly/section-504-what-to-do-when-your-childs-school-doesnt-follow-the-plan/)). Common case: "the teacher either didn't know what a 504 plan was or hadn't even read the plan" ([A Day in Our Shoes](https://adayinourshoes.com/what-to-do-if-your-school-is-not-following-the-plan/)).

*Implication for Diana*: Diana must function fully *without* teacher cooperation — that's the typical case. Self-serve accommodation.

---

## Question 4 — The AI-as-cheating boundary in US high schools (2024–2026)

The discourse has moved fast. Blanket bans have been quietly replaced by AI-literacy frameworks, traffic-light models, and a process-based authorship view.

### 4.1 The current school-policy landscape

By mid-2025, **more than half of US states had issued substantive K-12 AI guidance** ([AI for Education](https://www.aiforeducation.io/ai-resources/state-ai-guidance)). Examples:

- **Ohio**: every public district must publish a comprehensive AI policy by July 1, 2026.
- **Tennessee**: districts have had to publish AI policies since March 2024.
- **Washington OSPI** published Human-Centered AI Guidance v3.0 ([OSPI PDF](https://ospi.k12.wa.us/sites/default/files/2024-07/comprehensive-ai-guidance-accessible-format_0.pdf)).
- **NYC DOE** adopted a "red light / yellow light / green light" model: AI *prohibited* for grading, discipline, and developing IEPs; *allowed* for translation, organizing information, lesson planning, drafting parent communications; *cautioned* for student use in research, exploration, creative projects ([Gothamist](https://gothamist.com/news/nyc-schools-get-ai-guidance-using-red-light-green-light-model); [GovTech](https://www.govtech.com/education/k-12/nyc-schools-prohibit-ai-for-grading-discipline-ieps)).

Federal: U.S. DOE issued AI guidance for federal grant funds; an April 2025 executive order promotes integration of AI in education ([U.S. DOE](https://www.ed.gov/about/ed-overview/artificial-intelligence-ai-guidance); [AASA](https://www.aasa.org/resources/blog/leadership-imperative-defining-ai-guidance)). AASA is rolling out a model AI policy co-developed with student representatives ([Ed Week](https://www.edweek.org/technology/students-will-take-the-lead-on-crafting-a-model-ai-policy-for-schools/2026/04)).

A blanket ban is no longer considered viable. Fortune reports faculty told a blanket ban "is not a viable policy" without redesigned assessments ([Fortune](https://fortune.com/2025/09/12/college-cheating-ai-literacy-bans-exams-homework/)).

*Implication for Diana*: Treat AI policy as varying *per teacher, per class*. Add a class-level traffic-light setting (red/yellow/green) that Diana enforces — e.g., an English class with a "red" essay policy gets Socratic-only behavior; an algebra class with a "yellow" policy gets step-validation; a "green" research project gets brainstorm-and-cite assistance.

### 4.2 Widely-accepted AI uses

Converging consensus around legitimate-accommodation uses:

- **Text-to-speech** — "Under IDEA and Section 504, TTS is a legitimate support for students with documented reading disabilities" ([Edutopia](https://www.edutopia.org/article/using-text-to-speech-technology-to-support-all-students/); [Keys to Literacy](https://keystoliteracy.com/blog/accommodations-modifications-and-assistive-technology-for-students-with-dyslexia/)).
- **Speech-to-text / dictation** as writing accommodation.
- **Grammar and mechanics feedback** on the student's own text.
- **Summarizing the student's own notes** (input is student work).
- **Citation formatting** (mechanical, not analytical).
- **Step-by-step math explanation of a worked example** (Socratic, not answer-giving).
- **Brainstorming and outlining** — many syllabus templates explicitly permit ([UT Austin CTL](https://ctl.utexas.edu/chatgpt-and-generative-ai-tools-sample-syllabus-policy-statements)).

*Implication for Diana*: This is Diana's natural footprint. Stay tightly inside it.

### 4.3 Widely-condemned AI uses

- **Full-essay generation** in any submittable form.
- **Problem-set answer generation** without working-through.
- **Pasted AI text** — "Directly pasted AI text is not permitted in many academic contexts" ([UNC Writing Center](https://writingcenter.unc.edu/tips-and-tools/generative-ai-in-academic-writing/)).
- **AI-generated visual/creative work submitted as the student's own art**.
- **Edited AI-generated arguments** — UNC: "Generating core arguments or analytical claims and then editing them significantly leaves the intellectual contribution ambiguous" ([UNC](https://writingcenter.unc.edu/tips-and-tools/generative-ai-in-academic-writing/)).

*Implication for Diana*: The system must refuse to emit "final-product text" the student could paste into Google Docs. The closer to a final draft an output looks, the closer Diana is to cheating territory.

### 4.4 How peer tools position on the line

- **Khanmigo**: "designed to never give students direct answers ... Socratic method, guiding learners through problems with questions and hints" ([Skywork](https://skywork.ai/skypage/en/Khanmigo-Deep-Dive:-How-Khan-Academy's-AI-is-Shaping-the-Future-of-Education/1972857707881885696)). Caveat — Socratic-only frustrates some students out ([NeuralClass](https://neuralclass.uk/articles/khanmigo-in-the-classroom-what-teachers-actually-get)).
- **MagicSchool MagicStudent**: "built-in guardrails and content filtering" plus "teacher controls and visibility ... responsible-use reminders that redirect students when they respond inappropriately" ([MagicSchool](https://www.magicschool.ai/magicstudent); [FAQ](https://www.magicschool.ai/faq)).
- **Grammarly Authorship**: takes the **transparency** path — a document automatically classifies every passage as human-typed, AI-generated, modified-with-AI, pasted-from-known-source, pasted-from-unknown-source, or spell-checked. "Rather than using Authorship to penalize students, educators are encouraged to use it as an opportunity to proactively discuss how students should use AI" ([Grammarly Authorship](https://www.grammarly.com/authorship); [Grammarly Blog](https://www.grammarly.com/blog/company/ai-detector-authorship/)).
- **OpenAI Study Mode / Claude Learning Mode**: both adopt Socratic patterns ([OpenAI](https://openai.com/index/chatgpt-study-mode/); [Claude Learning](https://medium.com/@CherryZhouTech/claude-ais-learning-style-transform-ai-into-a-socratic-tutor-d4e48f2c9249)).

### 4.5 Design patterns that make AI defensibly an accommodation

1. **Socratic-by-default** — ask, don't tell.
2. **Refuse to produce final work product** — "scaffold, question, and guide — but fundamentally will not do the work for the student, enforcing productive struggle by design" ([AI Competence](https://aicompetence.org/ai-socratic-tutors/)).
3. **Process logs / authorship trails** — visible to student, parent, teacher.
4. **Rate-limit / friction**: research found "on-demand AI assistance can erode practice, productive struggle, and long-term skill growth — even when [students] know it harms their learning." A chess-club study showed **30% gains** with on-demand AI vs. **64% gains** with controlled assistance ([INSEAD](https://knowledge.insead.edu/responsibility/how-demand-ai-assistance-undermines-learning); [Wharton](https://knowledge.wharton.upenn.edu/article/when-does-ai-assistance-undermine-learning/)).
5. **Explain-the-rule, not fix-it-for-me**.
6. **Operate on the student's own input** — student's intellectual contribution stays intact.
7. **Teacher- and parent-visibility controls**.
8. **Refuse-with-redirect** — surface the legitimate alternative; never just say no.
9. **Honor per-class / per-teacher policy** — NYC traffic-light, Leon Furze's "AI Assessment Scale," A.J. Juliani's Traffic Light Protocol all assume different assignments allow different levels ([Furze](https://leonfurze.com/2024/09/02/aias-why-weve-driven-through-the-traffic-lights/); [Juliani](https://www.ajjuliani.com/blog/the-traffic-light-protocol-a-simple-way-to-manage-the-ai-classroom)).
10. **Never run AI detectors against students** — detectors disproportionately flag ESL students (30–40% higher false positives, 61% of ESL essays wrongly flagged) and students with autism/ADHD/dyslexia whose writing patterns trigger algorithms ([Plagiarism Checker AI](https://plagiarismcheckerai.app/ai-detector-false-positives-international-students); [Essay Check](https://essaycheck.ai/blog/false-positives-in-ai-detection)). Vanderbilt, Curtin, UCT have disabled them. Diana must never become a detector.

### 4.6 Published frameworks for legitimate AI accommodation use

- **ISTE Standards for AI in Education** — "Schools should never allow AI to be the sole decision-maker for grading, disciplinary actions, or admissions"; tiered guidelines providing more structure for younger students, more autonomy for older ([ISTE+ASCD](https://iste-ascd.org/ai); [Edpolicy.online](https://edupolicy.online/frameworks/iste-ai-framework.html)).
- **AASA model AI policy** (in development).
- **Washington OSPI Human-Centered AI Guidance v3.0**.
- **Nevada STELLAR principles** (Security, Transparency, Empowerment, Learning, Leadership, Achievement, Responsible Use).
- **CAST's UDL + AI work**: frames generative AI as enabling UDL's "multiple means of representation/engagement/expression" rather than as a per-disability bolt-on ([CAST](https://www.cast.org/what-we-do/artificial-intelligence/); [Evelyn Learning](https://www.evelynlearning.com/blog/the-accessibility-revolution-how-universal-design-for-learning-and-ai-are-breaking-down-barriers-for-students-with-disabilities)).

---

## Question 5 — Subject-specific patterns

Students hit different walls in different classes; US HS teachers grade against a small set of recurring rubric formats. Diana should recognize the rubric in play and scaffold accordingly.

### 5.1 Cross-subject baseline

Language-heavy subjects are hardest. A primary-school comparison found English most challenging for students with language-based learning differences, "reflecting the high levels of language demand it incurs," with science intermediate "because some tasks in these subjects can be performed with less reliance on verbal processing" ([PMC4371659](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4371659/)). ~66.6% of students with prior dyslexia diagnosis also show math difficulty ([PMC10869821](https://pmc.ncbi.nlm.nih.gov/articles/PMC10869821/)).

### 5.2 English / Literature

Dominant HS formats: **five-paragraph essay**, **literary analysis**, **MLA-formatted research writing**. Rubrics consistently weight: thesis clarity, body paragraphs with concrete details + commentary, transitions, conclusion that restates without introducing new ideas, mechanics ([Edutopia YES Prep rubric](https://www.edutopia.org/pdfs/stw/edutopia-stw-yesprep-rubric-literary-analysis.pdf); [Saylor 5-paragraph rubric](https://resources.saylor.org/wwwresources/archived/site/wp-content/uploads/2014/01/K12ELA7-3.3.9.2-FiveParagraphRubric-BY-SA.pdf)). MLA is the default HS citation style; "every fact or quote has a citation" and a properly formatted Works Cited are common rubric line-items ([Daring English Teacher](https://thedaringenglishteacher.com/teachingmlaandapa/); [Rise Global](https://riseglobaleducation.com/blogs/a-high-school-student-s-guide-to-bibliographic-citations-mla-vs-apa-vs-chicago)).

*Implication for Diana*: Ship a "thesis → evidence → commentary" outliner; a citation generator (MLA 9 default, APA secondary); a paragraph-shape checker so dyslexic writers don't lose mechanics points on otherwise strong arguments.

### 5.3 Math (Algebra → Pre-Calc / Calc)

Recurring rubric pattern: **"show all work or zero credit"** — precisely what hurts ADHD/dyscalculia students most. Recommended accommodations: demonstrate understanding "with verbal explanations, illustrations, color-coding to organize elements and operations" or "submitted as a video, presentation, website, PDF, illustrated study guide"; full-time calculator access; 50–100% extended time ([dyscalculia.org](https://www.dyscalculia.org/dyscalculia/school-accommodations); [Understood](https://www.understood.org/en/articles/classroom-accommodations-for-dyscalculia)).

*Implication for Diana*: Build a structured "math step organizer" that lets students dictate or annotate each step, then export clean numbered work that satisfies "show work" rubrics. Color-coding of operations is a first-class feature.

### 5.4 Science (Biology, Chemistry, Physics)

Two dominant artifacts: **Claim–Evidence–Reasoning (CER) lab reports** and **AP Free-Response Questions (FRQs)**. Across AP science exams, rubrics reward "accuracy of content, use of appropriate evidence, and demonstration of reasoning or causal explanation"; students are coached to literally label "Claim:", "Evidence:", "Reasoning:" so graders can find the points ([Sparkl](https://sparkl.me/blog/ap/claim-evidence-reasoning-a-reusable-frq-frame-to-boost-your-ap-scores/)). AP Bio lab reports require hypothesis with IV/DV, results tied back to hypothesis, sources of error, discussion ([UWorld](https://collegeprep.uworld.com/ap/ap-biology/frq/)).

*Implication for Diana*: A "lab report" template pre-structures CER sections and prompts for IV/DV/error/discussion. An FRQ-mode writing assistant auto-tags claim/evidence/reasoning chunks before submission.

### 5.5 History (US / World)

At AP level the **DBQ** dominates, scored on a 7-point rubric: thesis (1), contextualization (1), evidence from documents — use 4+ documents (2), evidence beyond documents (1), sourcing/HIPP analysis for 3+ documents (1), complexity (1). Each point earned independently ([College Board 2025 USH](https://apcentral.collegeboard.org/media/pdf/ap25-apc-us-history-dbq-set-2.pdf); [TomRichey APUSH](https://www.tomrichey.net/the-apush-dbq.html)). Non-AP history more often uses 5-paragraph essay or thematic source-analysis.

*Implication for Diana*: DBQ-mode keeps a visible 7-point checklist; surfaces a doc-citation tracker (which docs have been quoted/described, which still need sourcing); reminds the student about contextualization and complexity (the most-missed points).

### 5.6 Foreign Language

ADHD/dyslexic students struggle with the high-volume rote drill that is foreign-language rubric staples — irregular conjugations, gender, accent marks. Recommended: **Multisensory Structured Language (MSL)** method, endorsed by IDA, plus gamification/frequent reward cycles ([Understood](https://www.understood.org/en/articles/learning-a-foreign-language-with-dyslexia); [Study.com](https://study.com/blog/help-with-learning-a-foreign-language-for-children-with-adhd.html)). Some US HS schools accept ASL as the foreign-language requirement.

*Implication for Diana*: Foreign-language flashcards ship in MSL mode by default (audio + visual + typed/spoken response); FSRS under the hood; rapid-cycle gamified rewards. Conjugation drills let students hear and speak, not only spell.

---

## Question 6 — Compliance baseline

Diana's day-1 model — student-installed, parent-verified, 14–18 year olds with a 13-year-old edge case — sits in a real but navigable regulatory band. Build to the strictest (NY §2-d + CA SOPIPA) and you're compliant nearly everywhere.

### 6.1 COPPA (with 2025 amendments)

COPPA applies to operators of online services "directed to children under 13" or with "actual knowledge" they're collecting personal info from under-13s. The 2025 amendments — published April 22, 2025, effective **June 23, 2025**, compliance deadline **April 22, 2026** — shifted default from opt-out to opt-in for third-party sharing and added new verifiable parental consent (VPC) methods including knowledge-based authentication, facial recognition against a government ID, and text-plus ([FTC Jan 2025](https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-finalizes-changes-childrens-privacy-rule-limiting-companies-ability-monetize-kids-data); [Securiti](https://securiti.ai/ftc-coppa-final-rule-amendments/); [White & Case](https://www.whitecase.com/insight-alert/unpacking-ftcs-coppa-amendments-what-you-need-know)).

*Implication for Diana*: Set the gate at 13+. For 13-year-old freshmen, require VPC before account creation (signed form via email, knowledge-based auth, or text-plus). For 14–17, still get parent attestation (legally distinct but expected by parents and some state laws). Block under-13 until the full COPPA workflow is built. Track proposed COPPA 2.0 — if it raises to under-17, the entire user base becomes COPPA-covered overnight.

### 6.2 FERPA — does it apply?

FERPA governs "education records" held by schools or districts receiving federal funding. A student-installed consumer app **is not a FERPA-covered entity** unless and until a school contracts with you, at which point the "school official" exception flows through and FERPA applies ([studentprivacy.ed.gov](https://studentprivacy.ed.gov/); [UpGuard](https://www.upguard.com/blog/ferpa-compliance-guide)). Critically: "school consent under FERPA does not replace COPPA parental consent, and both must be met separately" ([Avant](https://www.avantassessment.com/blog/webinar-summary-understanding-coppa-compliance-and-student-data-privacy-in-edtech)).

*Implication for Diana*: Day 1, FERPA mostly doesn't apply. But architect the data model so that once the school tier ships, a tenant can flip into "FERPA mode" with school-as-customer, signed DPA, and data treated as an education record.

### 6.3 State laws (the operative day-1 floor)

Most state student-privacy laws apply to services "designed, marketed, or used primarily for K–12 school purposes" — Diana likely qualifies even when student-purchased.

- **California SOPIPA** (eff. Jan 1, 2016) — applies regardless of school contract; prohibits targeted ads, sale of student info, building advertising profiles; requires sound security; requires deletion on request; AG-enforced ([Common Sense](https://www.commonsensemedia.org/kids-action/about-us/our-issues/digital-life/sopipa); [TermsFeed](https://www.termsfeed.com/blog/sopipa/); [CA SB 1177](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=201320140SB1177)).
- **New York Education Law §2-d** — strictest in the country. Vendors must encrypt PII in transit and at rest, sign a Parents' Bill of Rights, submit a Data Security and Privacy Plan, adopt the NIST Cybersecurity Framework. Penalties scale to **$10,000 per repeat violation** ([NYSED §2-d](https://www.nysed.gov/data-privacy-security/education-law-section-2-d-definitions); [CyberNut](https://www.cybernut.com/blog/all-about-new-yorks-education-law-2-d-student-data-privacy-explained)).
- **Illinois SOPPA** (eff. Jul 1, 2021) — signed agreement and reasonable security; districts post annual vendor list ([CPS](https://www.cps.edu/about/policies/student-online-personal-protection-act/); [IASB](https://www.iasb.com/policy-services-and-school-law/guidance-and-resources/student-online-personal-protection-act)).
- **Connecticut PA 16-189** — written contracts; CT Student Data Privacy Pledge ([CT.gov](https://portal.ct.gov/DAS/CTEdTech/Commission-for-Educational-Technology/Initiatives/Student-Data-Privacy)).
- **Colorado HB 16-1423** (eff. Aug 10, 2016) — public vendor list; vendor sign-on before data collection ([CDE](https://ed.cde.state.co.us/dataprivacyandsecurity); [HB 16-1423](https://content.leg.colorado.gov/sites/default/files/2016a_1423_signed.pdf)).
- **Texas Student Privacy Act (Ed Code §32.151)** + **SB 820** (eff. Sept 2019) — cybersecurity policies aligned to Texas Cybersecurity Framework or NIST; breach reporting to TEA ([CyberNut TSPA](https://www.cybernut.com/blog/what-to-know-about-the-texas-student-privacy-act-ed-code-32-151); [Virtru](https://www.virtru.com/blog/compliance/texas-sb-820)).

Unifying themes: no targeted ads, no selling data, no behavioral profiling, encryption, breach notification, parent access rights, deletion on request, NIST-aligned security.

*Implication for Diana*: Build to the strictest (NY §2-d + CA SOPIPA). Keep a public state-laws posture page. When school tier ships, sign DPAs per state/district.

### 6.4 SDPC / 1EdTech (for the future school tier)

**Student Data Privacy Consortium's National Data Privacy Agreement (NDPA)** is the de-facto standard: 275,000+ standard DPAs signed; 130,000+ agreements between 12,000+ districts and 6,674 vendors in the public Resource Registry. SDPC runs **28 state alliances** that negotiate collectively ([SDPC](https://privacy.a4l.org/); [SDPC NDPA](https://privacy.a4l.org/national-dpa/); [SpellingJoy](https://spellingjoy.com/best-apps/student-data-privacy-which-apps-are-dpa-ready)). 1EdTech publishes a complementary DPSA Template ([1EdTech](https://www.1edtech.org/blog/prioritize-security-with-1edtechs-data-privacy-and-security-agreement-template)).

*Implication for Diana*: When school tier launches, sign the SDPC NDPA and post in the public registry. Short-circuits dozens of district-by-district legal cycles.

### 6.5 Privacy-by-design

The FTC explicitly recommends ed-tech services "make COPPA notices available to parents and allow them to review collected personal information, while using plain language" ([Honigman](https://www.honigman.com/alert-privacy-tips-for-ed-tech-companies-and-schools-conducting-remote-learning); [IAPP](https://iapp.org/news/a/kids-and-teens-online-privacy-and-safety-8-compliance-considerations)).

*Implication for Diana*:
- Data minimization at schema level — don't collect what you don't need.
- Clear retention (e.g., delete after 12 months of inactivity).
- One-click data export (JSON/CSV) and one-click delete.
- "AI training: off by default" toggle actually wired to provider no-train flags.

### 6.6 Using Claude / OpenAI with minors

- **Anthropic**: "It is the responsibility of organizations to comply with all applicable child safety and data privacy regulations, such as COPPA"; organizations serving minors must implement age verification, content moderation/filtering, monitoring ([Anthropic minors guidelines](https://support.claude.com/en/articles/9307344-responsible-use-of-anthropic-s-models-guidelines-for-organizations-serving-minors); [TechCrunch](https://techcrunch.com/2024/05/10/anthropic-now-lets-kids-use-its-ai-tech-within-limits/)).
- **OpenAI** (if used for any feature): users must be ≥13; under-18 needs parent permission; to process under-13 personal data via API, organizations "must implement zero data retention" and comply with COPPA ([OpenAI Under-18 API](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance); [OpenAI Privacy](https://openai.com/policies/row-privacy-policy/)).

*Implication for Diana*: Anthropic Claude is our chosen provider per the approved plan. Document the safeguards (age gate, parental verification, content moderation, no-training default) in writing. Add an app-level age-aware guardrail layer; don't trust the provider alone. Log moderation decisions for audit.

### 6.7 Privacy policy + ToS — what parents need to see

Plain language; what data is collected and why each item is needed; not sold, not used for targeted ads, not used to build profiles; named third-party processors (LLM, hosting, analytics) and roles; retention period and deletion process; export rights; AI-training opt-out (default off for minors); breach notification commitment; parent access rights; encryption posture (NIST alignment); a Parents' Bill of Rights mirroring NY §2-d even if not yet contracted in NY ([NYSED example](https://www.nysed.gov/sites/default/files/programs/data-privacy-security/c014180-suntex-international-inc.pdf); [Alston & Bird](https://www.alston.com/en/insights/publications/2025/11/minors-privacy-online-safety-laws)).

---

## Question 7 — Evidence base for interventions

For each technique: what the research says (with effect size where reported) and the design implication. Honest where evidence is weaker than reputation.

### 7.1 Spaced repetition — FSRS, not SM-2

SM-2 (1987 SuperMemo, Anki's default for decades) is "battle-tested but rigid" — same forgetting curve for every learner. **FSRS** (2022, Jarrett Ye) is ML-trained and "outperforms SM-2 for 99.6 percent of users" in Anki's own evaluation. **FSRS-5 cuts reviews by 25% at identical retention** and hits a 90% retention target with ±5.3% accuracy vs. SM-2's ±16.2% ([DeckStudy](https://deckstudy.com/blog/fsrs-vs-sm2-modern-spaced-repetition); [Diane.app](https://www.diane.app/en/guides/fsrs-vs-sm2); [Anki FAQ](https://faqs.ankiweb.net/what-spaced-repetition-algorithm)).

*Implication for Diana*: Use FSRS. For ADHD students, 25% fewer daily reviews is a meaningful adherence win. Expose one "target retention" knob (default ~90%); hide the rest.

### 7.2 Retrieval practice (testing effect)

Adesope et al. 2017 meta-analysis of 200+ comparisons: overall effect size **g ≈ 0.70** for practice testing vs. restudy ([Sage / Adesope](https://journals.sagepub.com/doi/abs/10.3102/0034654316689306)). For ADHD specifically: 2023 study found "benefits do not depend on ADHD status and do not interact with item difficulty or medication use," though unmedicated ADHD students performed worse overall due to weaker encoding ([Frontiers 2023](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2023.1186566/full)). Important caveat: separate study on educationally relevant texts found *no* free-recall benefit for ADHD students on long passages ([PMC10715433](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10715433/)) — whole-text recall is too hard; section-by-section retrieval works.

*Implication for Diana*: Default review action = "quiz yourself," not "re-read." Chunk long textbook chapters into section-level retrieval.

### 7.3 Interleaving

Pooled effect size **g = 0.42** across all studies (Brunmair & Richter 2019); for math specifically **g ≈ 0.34**; individual classroom trials huge — Rohrer & Taylor 4th-grade study d=1.21; 54-classroom algebra RCT **d=0.83** on delayed tests ([AFT/Agarwal](https://www.aft.org/ae/spring2020/agarwal_agostinelli); [PMC8589969](https://pmc.ncbi.nlm.nih.gov/articles/PMC8589969/); [Frontiers 2019](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2019.00086/full)). Results inconsistent — works best when problems are *discriminable* and the student already has baseline competence.

*Implication for Diana*: Default math/science review to mixed-topic once a topic is past initial mastery. Don't interleave during initial acquisition.

### 7.4 Pomodoro / timed work blocks

2021 *J. Clinical Psychology* study: **27% improvement** in task completion among ADHD adults using structured timeboxing vs. unstructured. 2024 trial: 17% focus improvement when intervals shortened to **15 minutes + movement breaks** ([Peakflow](https://getpeakflow.pro/blog/pomodoro-technique-science); [Focus Keeper](https://focuskeeper.co/blog/how-the-pomodoro-technique-helps-adhd-students-improve-concentration)). 2020 systematic review in *J. of Attention Disorders*: "moderate to strong evidence for techniques involving explicit timeboxing." Caveat: classic 25-min can be too long or short; resets disrupt flow.

*Implication for Diana*: Session length configurable (default 15–25 min); every break paired with a movement prompt; never force reset mid-flow.

### 7.5 Body doubling

Honestly: weak empirical evidence. "Controlled studies have yet to show conclusive effects of body doubling, and despite its growing popularity ... empirical evidence is mixed" ([Medical News Today](https://www.medicalnewstoday.com/articles/body-doubling-adhd)). A 2025 VR-based study (n=12) found body-doubling produced faster task completion and higher perceived attention vs. working alone ([arXiv 2509.12153](https://arxiv.org/abs/2509.12153)). Mechanism plausible (external accountability, unconscious imitation), unproven.

*Implication for Diana*: Ship a lightweight body-doubling mode (silent video tile of peers studying, or shared timer/avatar). Frame as community feature, not clinical intervention. Don't oversell.

### 7.6 Structured literacy / Orton-Gillingham

Honest read: OG-branded programs have surprisingly weak meta-analytic evidence. Stevens et al. 2021: OG interventions "do not statistically significantly improve foundational skill outcomes ... **effect size = 0.22, p = .40**" ([PMC8497161](https://pmc.ncbi.nlm.nih.gov/articles/PMC8497161/)). A 2014 meta-analysis found OG effective but "not significantly more effective than other structured phonics-based interventions." The *components* of OG — explicit, systematic, multisensory phonics — are evidence-backed; the branded program is not specially magical.

*Implication for Diana*: Don't market "OG-based." Market "structured-literacy aligned" with explicit phonics support, backed by broader science-of-reading evidence. For high schoolers specifically, focus on morphology, syllable types, and decoding longer words — most have already had foundational phonics.

### 7.7 Multi-sensory instruction

Broader than OG and better supported. Reviews report "compelling evidence for the efficacy of multisensory training programs in remediating reading scores in dyslexia"; phonemic awareness is "most effective when the letters were present as well" ([Really Great Reading](https://www.reallygreatreading.com/sites/default/files/2025-01/rgr_research_on_multisensory_instruction.pdf); [PMC4258132](https://pmc.ncbi.nlm.nih.gov/articles/PMC4258132/)).

*Implication for Diana*: Wherever the student reviews material, default to multimodal — TTS audio + highlighted text + active response (type, tap, speak). Don't default to audio-only or text-only.

### 7.8 Text-to-speech for comprehension

Meta-analysis: weighted effect size **d = 0.35 (95% CI 0.14–0.56, p < .01)** for TTS on reading comprehension in dyslexic students, with one study showing **a 1.58 grade-level jump** ([J. ASES](https://www.journal-ases.online/6/2/184); [ResearchGate 387455055](https://www.researchgate.net/publication/387455055)). Students with dyslexia derive significantly more benefit than students with general reading/language impairment. Caveat: TTS can introduce distraction.

*Implication for Diana*: TTS is one of the highest-ROI features. Build it throughout — textbook chapters, articles, even the user's own draft writing. Per-paragraph re-listen, variable speed, dual-mode (audio + highlighted text).

### 7.9 Dyslexia-friendly fonts (be honest)

Popular intuition wrong. 2017 study found OpenDyslexic **"actually reduced reading speed and accuracy"** vs. Arial and Times New Roman; 2018 study of Dyslexie found no benefit. "There is no reliable research evidence that special fonts for children with dyslexia have any beneficial effect" ([PMC5629233](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5629233/); [Edutopia](https://www.edutopia.org/article/do-dyslexia-fonts-actually-work/); [Nessy](https://www.nessy.com/en-us/dyslexia-explained/understanding-dyslexia/dyslexia-fonts-do-they-work)). What *does* help: high legibility — sans-serif, generous line spacing, wider character spacing, off-white background.

*Implication for Diana*: Offer OpenDyslexic as an option (some students subjectively prefer it), but default to clean well-spaced sans-serif (Atkinson Hyperlegible, Lexend, system sans) with user-controlled line height and background color. Don't market "dyslexia font" as a headline feature.

### 7.10 Executive-function coaching / externalized working memory

"Working memory holds about 3-4 chunks of information at a time" — anything externalized is capacity reclaimed. EF coaching consistently recommends external tools — "timers, planners, colour coding, and visual reminders" as "external executive function" ([NeurodivergentInsights](https://neurodivergentinsights.com/executive-function-helpers/); [Heal & Thrive](https://heal-thrive.com/adhd-coaching-for-executive-function-skills-a-practical-guide/); [Teuscher](https://www.teuscher-coaching.com/executive-functioning-tools-adhd-external-memory/)). Computerized EF *training* has mixed evidence; external *compensation* tools are well-supported.

*Implication for Diana*: This is Diana's core value prop: **"the external brain for ADHD school life."** Every assignment, due date, rubric, partial draft offloaded out of working memory and surfaced contextually (today / this-class / this-rubric view).

### 7.11 Premack principle

Original Premack (1965) and *Behavior Modification* review (Mazur 2006) confirm it works for kids and adults — preferred-activity-as-reward increases completion of less-preferred ([DevelopGoodHabits](https://www.developgoodhabits.com/premack-principle-ss3/); [MasterMind Behavior](https://www.mastermindbehavior.com/post/what-is-premack-principle)). Effectiveness diminishes if rewards too frequent/routine.

*Implication for Diana*: Let students chain rewards into the timer ("after 25 min I get 10 min of [chosen activity]"). Vary the reward menu to prevent satiation.

### 7.12 Implementation intentions (if-then plans)

Solidly supported for ADHD specifically: children with ADHD "made fewer perseverative errors on a shifting task when instructed to make if-then plans," benefiting on math tasks requiring working memory + inhibition. In Go/No-Go, if-then plans brought ADHD inhibition up to non-ADHD level ([Gawrilow & Gollwitzer 2008](https://link.springer.com/article/10.1007/s10608-007-9150-1); [ResearchGate 228874906](https://www.researchgate.net/publication/228874906)).

*Implication for Diana*: When a student adds a task, prompt for an if-then attachment: "When [time/place/cue], I will [first concrete step]." Use the cue as the notification trigger, not just the clock.

---

## Feature priorities derived from research (Phase 1 input)

The research above converges on a clear feature spine. Items are ranked by evidence-strength × user-impact × competitive-differentiation. Each Phase 1 feature must trace back to one or more research findings above.

### Tier 1 — Must ship in MVP (research-mandated)

1. **Class & teacher rubric substrate** — every class holds the teacher's syllabus/rubric/rules. All AI calls are grounded in this. *Source: §4 (per-class policy honoring), §2.11/2.15 (no competitor does this), §5 (rubric variance by subject/teacher).*

2. **"Done ≠ Submitted" state machine** — the most-cited daily failure with no competitor solution. *Source: §1.3.*

3. **"Your next 5 minutes" home view** — one specific next action; not a list of 12. *Source: §1.4, §1.2.*

4. **Universal capture inbox** — voice + photo + one-tap text; AI sorts later. <10-second friction. *Source: §1.9, §3.9.*

5. **Time-blindness aids** — visual countdowns; "if you start now you'll finish at 9:15 PM" planner; per-student calibrated time estimates. *Source: §1.5, §3.5.*

6. **TTS everywhere** — applied to readings, drafts, even AI responses; sync highlighting; variable speed; off-white background defaults. *Source: §7.8 (d=0.35; up to 1.58 grade levels), §3.2 (must pair with comprehension scaffolds).*

7. **Reading scaffolds layered onto TTS** — vocab preview, paragraph "what just happened" checks, post-reading retrieval. *Source: §3.2, §7.2 (chunked retrieval works for ADHD).*

8. **Note-taking: audio + AI transcript + outline scaffold** — not blank-page typing. *Source: §1.8, §7.7 (multimodal default).*

9. **Math step organizer** — student fills in each step; AI checks but never solves. Per-step "Plan / Compute / Check sign-units / Sense-check." Color-coding operations. *Source: §1.9, §2.10 (Photomath anti-pattern), §5.3.*

10. **Writing aids that explain the rule, not fix it** — per-teacher rubric awareness. *Source: §2.9, §4.2, §4.5.5.*

11. **Citation generator** (MLA 9 default, APA secondary) that explains *why* the citation looks how it does. *Source: §5.2.*

12. **FSRS spaced repetition** with cards auto-generated from student's notes + rubric. Default review action across the app = "quiz yourself," not "re-read." *Source: §7.1 (25% fewer reviews), §7.2 (g≈0.70).*

13. **Configurable timer** (15–25 min default) with movement-break prompts and Premack reward chaining. *Source: §7.4, §7.11.*

14. **Implementation-intention prompts on task creation** — "When [cue], I will [first step]." Use cue as notification trigger. *Source: §7.12.*

15. **Authorship log** for every AI interaction — visible to student, exportable for parent/teacher. *Source: §4.5.3, §4.4 (Grammarly model).*

16. **Per-class AI traffic-light** (red/yellow/green) controlling AI behavior in that class context. *Source: §4.1, §4.5.9.*

17. **Refuse-with-redirect on disallowed AI requests** — never just say no; surface the legitimate alternative. *Source: §2.15, §4.5.8.*

18. **Frustration escape valve on Socratic interactions** — "show a worked example of a *different* problem" exit so frustrated students don't defect to unrestricted ChatGPT. *Source: §2.11, §4.4 (Khanmigo failure mode).*

19. **Evidence-backed reading typography defaults** — Atkinson Hyperlegible or Lexend, generous line/letter spacing, off-white background, adjustable. OpenDyslexic and Bionic Reading as optional toggles only. *Source: §7.9, §2.7, §2.8.*

20. **Warm, non-evaluative tone throughout**; missed deadlines = reset, not failure; no public dashboards; no streak-shaming. *Source: §1.10, §3.5.*

### Tier 2 — Ship in MVP if capacity permits

21. **Subject-specific templates** — DBQ 7-point checklist; CER lab report; 5-paragraph essay; FRQ tagger.
22. **OCR on photo of board / assignment paper** — captured assignments auto-parsed to class + due date.
23. **Reading-load awareness view** — "you have 47 pages of reading queued tonight."
24. **Lightweight body-doubling mode** (silent peer presence) — framed as community feature.
25. **MSL-mode foreign-language flashcards** (audio + visual + spoken/typed response).

### Tier 3 — Architect for, build in Phase 2

26. **Google Classroom / Canvas import** (assignments + rubrics).
27. **School/district tier** — multi-tenant data model with FERPA-mode flip; SDPC NDPA signed; admin dashboards.
28. **IEP/504 integration** — pull accommodations from plan; surface them automatically.
29. **Parent dashboard** — read-only view of student-permitted slices; never punitive.

### Cross-cutting design principles (must hold across all features)

- **Composite-profile users**: features additive, never mode-gated by diagnosis. *Source: §1.1.*
- **Self-serve accommodation**: works without teacher buy-in. *Source: §3.10.*
- **No diagnosis required**: undiagnosed inattentive girls and 2e students are the *typical* user, not edge cases. *Source: §3.6, §3.7.*
- **Discreet in social contexts**: headphone-mode UI; AI as tutor, not visible accommodation. *Source: §1.11.*
- **Private by default**: read-aloud features student-controlled "perform" mode. *Source: §3.8.*
- **AI operates on the student's input**: summarize *their* notes; check *their* draft; transcribe *their* voice. Never emit submittable prose or final answers. *Source: §4.3, §4.5.6.*
- **Process logs > AI detection**: never run detectors against the student. *Source: §4.5.10.*

### Compliance gates that block public launch

- COPPA gate at 13+ with documented VPC method for 13-year-olds.
- Parent attestation flow for 14–17.
- Anthropic no-training default; documented age verification, content moderation, monitoring.
- One-click data export (JSON/CSV) and one-click account deletion.
- Plain-language privacy policy + Parents' Bill of Rights (NY §2-d modeled).
- Encryption in transit and at rest; NIST CSF alignment.
- Public state-laws posture page.

### What we are *not* building (and why)

- **An AI essay writer** — outside the accommodation line; would lose schools/parents permanently.
- **Photomath-style answer-giver** — research-contraindicated for the target population.
- **A teacher-facing tool** — explicitly out of scope; we follow the teacher's rubric, we don't try to replace them.
- **An AI detector** — disproportionately harms our target population; antithetical to the product's purpose.
- **A "dyslexia font" headline feature** — evidence doesn't support it; would mislead.
- **A streak/shame motivation system** — directly harmful to RSD-prone users.

---

## Open questions for Phase 1 design

1. **Onboarding length** — how much friction is acceptable to set up the per-class rubric? Pilot needed.
2. **Voice for the AI persona** — what does "warm, non-evaluative, age-appropriate" actually sound like in copy? Needs writing test with real teens.
3. **Parent-link UX** — what minimum parent involvement satisfies COPPA/state-law without making the kid feel surveilled?
4. **Pricing posture** — free with paywalled AI? subscription? family plan? Open until the school tier is closer.
5. **Beta recruitment channel** — CHADD/IDA local chapters, school counselor networks, or direct (Reddit r/ADHD, r/dyslexia, parent forums)?

---

## Hand-off to Phase 1

This document is the input to Phase 1 (MVP feature design). Recommended sequence:

1. User reviews this findings doc; flags anything that doesn't match lived experience or product vision.
2. On approval, Phase 1 produces a detailed feature spec + data schema grounded in the Tier 1 list above.
3. Architecture doc (`docs/architecture.md`) and AI-ethics positioning doc (`docs/ai-ethics.md`) drafted from this.
4. Supabase project provisioned; Next.js scaffold; first vertical slice = the "Class & teacher rubric substrate" + "Your next 5 minutes" + "Done ≠ Submitted" trio, because those three are necessary for any other feature to feel right.
