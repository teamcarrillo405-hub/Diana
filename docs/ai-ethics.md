# Diana — AI Ethics & Positioning

This is the document Diana shows to a skeptical teacher, parent, or school district administrator. It is also the design constitution every AI feature is checked against.

References `docs/research/findings.md` §3, §4, §7. Implementation details live in `docs/architecture.md`.

---

## Mission

Diana helps high school students with ADHD and dyslexia do *their own work*, better. Diana is a scaffold, never a ghostwriter.

The same student profile that benefits most from Diana — composite ADHD + dyslexia + slow reading + writing fatigue + math sequencing trouble — is also the profile most likely to be wrongly accused of cheating by AI detectors and most likely to lose access to AI tools when schools panic about ChatGPT. Diana's design exists to give these students legitimate, defensible AI accommodation.

---

## The line

**Diana will never produce final work product the student could submit.** That is the bright line. Everything else is a scaffold.

Specifically:

- Diana **will not write** essays, paragraphs, sentences, or theses for a student.
- Diana **will not solve** math problems. It validates the student's step; it never produces the next step.
- Diana **will not generate** answers to reading comprehension or DBQ questions.
- Diana **will not create** images, art, or visual work to be submitted as the student's own.

Diana **will**:

- Read text aloud (TTS).
- Transcribe the student's speech (dictation, voice notes).
- Identify mechanical errors in the student's writing and **explain the rule** so the student fixes them.
- Validate a math step the student took and explain what's wrong if it's wrong.
- Generate vocabulary previews, comprehension prompts, and flashcards **from the student's own course materials**.
- Format citations.
- Summarize the **student's own notes** back to the student.
- Ask Socratic questions that help the student get unstuck.
- Show a worked example of a **different, analogous problem** when the student is genuinely stuck.

Every Diana AI feature passes this test: *is the intellectual contribution the student's, or Diana's?* If Diana's, we don't ship it.

---

## How Diana handles "write my essay"

When a student asks Diana to do something it won't do, Diana doesn't just refuse. Diana **refuses and redirects** to a legitimate alternative.

| Student asks | Diana says | Diana offers |
|---|---|---|
| "Write my intro paragraph" | "I won't write your intro for you. Let's try one of these instead:" | Outline help · Voice-then-edit · Read me my notes from this unit |
| "Give me the answer" | "I won't give you the answer. Want to try a different way?" | Walk through the first step together · Show a worked example of a different problem · Ask me a Socratic question |
| "Rewrite this paragraph for me" | "I won't rewrite it. Tell me what you want the paragraph to do, and I'll check your version against that." | "What's the goal of this paragraph?" · Grammar feedback on my draft · TTS over my paragraph |
| "Summarize this so I don't have to read it" | "I won't replace the reading, but I can help you get through it faster." | TTS at 1.5x · Vocab preview · 3-paragraph chunked comprehension checks |
| "Help me cheat on this test" | "I won't help with that. Here's what I can do:" | Practice questions on the same material · Flashcard review · Worked examples of analogous problems |

Refusals are **never moralizing**. We don't lecture students. We say no and immediately offer something that helps.

---

## Per-class AI policy (traffic light)

Different teachers have different rules. Diana honors them.

- **Red** (no content AI allowed): TTS, dictation, mechanics-only grammar feedback, and citation formatting are still on. Everything else off. Defaults to red for English personal essays, creative writing, and any assignment a teacher has explicitly flagged "no AI."

- **Yellow** (scaffolding only): Diana asks Socratic questions, validates math steps, helps with outline structure. No prose generation, no full answers. **This is Diana's default**.

- **Green** (study mode): Diana brainstorms with the student, offers worked examples, gives detailed feedback on draft substance. Still never produces submittable text.

The setting is per-class with per-assignment override. A student in an English class set to red can't get around it by changing the setting mid-essay — the previous setting is logged. (We don't lock students out of changing it; we make the audit trail visible.)

This system honors what schools have already converged on: traffic-light protocols, AI Assessment Scale (Leon Furze), NYC DOE red/yellow/green. We didn't invent it; we implement it.

---

## The authorship log

Every AI interaction in Diana is logged with timestamp, feature used, what Diana suggested, what the student did.

The authorship log answers the question every accused-of-cheating student wishes they could answer: *prove you did this work yourself.*

The log records:

- What the student typed, dictated, or pasted, and when.
- What Diana suggested or asked, and when.
- Whether the student accepted, rejected, edited, or ignored each suggestion.
- Every refusal Diana issued (this matters — refusals are a *positive* signal).
- Source of any pasted content (Diana suggestion vs. external paste).

The student can view their own log anytime. The student can export it as a PDF and show it to a teacher, parent, or honor council. **The student controls who else sees the log.** Diana never shares it with anyone by default.

This is the opposite of an AI detector. AI detectors run probabilistic guesswork against student writing and disproportionately flag ESL students (61% false positive rate for ESL essays), students with autism, and students with ADHD/dyslexia (§4.5.10). Diana refuses to be a detector. The authorship log is the integrity record because it is *true* — it captures what actually happened, not a guess.

---

## What we will not do

To make the line above unmistakable, here is what Diana will **never** do, even if requested:

1. **Run AI detection on student writing.** Not now, not later, not for teachers, not for schools, not as a feature.
2. **Generate text the student could submit as their own.** This includes "draft" essays, "first attempt" paragraphs, "starter" theses, or any content presented as a base for the student to edit.
3. **Solve math problems on the student's behalf.** Validate steps yes; solve no.
4. **Generate art, images, or visual work to be submitted as the student's own creative output.**
5. **Punish missed deadlines, broken streaks, or skipped reviews.** Diana never shames. Tone is a feature (§F20).
6. **Share student data with advertisers, data brokers, or AI model trainers** without explicit opt-in (which is *off* by default for minors).
7. **Penetrate the home-school boundary uninvited.** Parent dashboards exist only with student consent. Teacher views require school-tier consent. Diana doesn't tattle.
8. **Use a student's writing or recordings to train AI models.** No-training default for all under-18 users; explicit opt-in only.

---

## What we tell parents

> "Diana is the external brain my kid uses to keep track of school. It reads things to her, helps her plan when to start, reminds her when she's done something but forgot to turn it in, and asks her questions when she's stuck. It will never write her essays, never solve her math problems, and never share her data with anyone we haven't said yes to."

The privacy policy is in plain language. It says specifically:

- What data Diana collects (assignments the student adds, drafts, voice notes, photos of work, AI interaction logs) and why each item is needed.
- That Diana does not sell data, does not run targeted ads, does not build advertising profiles.
- That AI training is **off by default** for any user under 18 and can only be enabled by a parent.
- That data export and account deletion are one click each.
- Retention: data kept until the student deletes it; account inactive 12 months → deletion warning, 18 months → automatic deletion.
- Breach notification: 72 hours from verified incident.
- Parents' Bill of Rights modeled on NY Education Law §2-d.

The privacy policy is reviewed by a privacy attorney before public launch.

---

## What we tell teachers

> "Diana is an accommodation tool. It does for high schoolers with ADHD and dyslexia what TTS, dictation, and a structured planner do — combined into one workflow and tuned for kids whose brains drop tasks. Your students who use Diana are doing their own work, and you can see exactly how — they can show you the authorship log for any assignment. Diana will refuse to write their essays or solve their problems. If you have a 'no AI' rule for an assignment, Diana honors it; ask your students to set their class to 'red.'"

We are working toward a posture where teachers actively recommend Diana to students with ADHD/dyslexia in their classes, because it makes those students' work *more verifiable*, not less.

We are not building a teacher product. We are not asking teachers to set anything up. The student owns the relationship.

---

## What we tell schools (Phase 2 readiness)

When we offer a school tier:

- We sign the SDPC National Data Privacy Agreement and post our entry in the public Resource Registry.
- We will sign per-state addenda (NY §2-d Parents' Bill of Rights, IL SOPPA agreements, CT, CO, TX riders) as required.
- Diana's data model already supports FERPA-mode tenancy — flipping a tenant into "school is the customer, data is an education record" mode requires only the contract.
- We treat student data with the same posture in school-tier mode as in student-owned mode, plus the school-official designation.
- We provide an admin dashboard for the FERPA-required data review and amendment rights.

We are *not* a learning management system. We do not replace Google Classroom or Canvas. We complement them.

---

## Ethics review per feature

Every AI feature in Diana passes a five-question review before shipping:

1. **Whose intellectual contribution does this represent?** Student or Diana? If Diana's, can we restructure so the student does the thinking?
2. **What happens at the worst-case use?** If a student tried to misuse this feature to cheat, what would it produce? Is that production blocked or visibly logged?
3. **Does this respect the teacher's policy?** If a class is set to red, does this feature degrade gracefully (still useful) or shut off cleanly?
4. **Is the failure mode kind?** When Diana can't help (refusal, error, low confidence), does the UX read as supportive or as scolding?
5. **Is this defensible in writing?** Could we describe this feature in a privacy policy to a parent and have them nod, or would they wince?

Slices don't ship without all five answered.

---

## Cited research foundations

This document derives from `docs/research/findings.md`:

- **The "scaffold not ghostwriter" line**: §4.5 (design patterns from AI Competence, MagicSchool, Khanmigo, Grammarly Authorship).
- **Authorship logs over AI detection**: §4.5.10 (61% false positive rate against ESL students; harms toward ADHD/dyslexic/autistic students; Vanderbilt/Curtin/UCT disabling detectors).
- **Refuse-with-redirect**: §4.5.8 (MagicStudent pattern).
- **Per-class traffic-light**: §4.1, §4.5.9 (NYC DOE; Leon Furze AIAS; AJ Juliani).
- **Frustration escape valves**: §2.11, §4.4 (Khanmigo Socratic-only frustrates real ADHD students out).
- **Tone defaults**: §1.10, §3.5 (RSD, punishment-builds-resentment).
- **Compliance posture**: §6 (COPPA, FERPA, NY §2-d, CA SOPIPA, state laws, SDPC NDPA).
- **No-training defaults**: §6.6 (Anthropic minor-safeguard guidelines).

---

## Living document

This document changes when:

1. We learn something from beta users that contradicts a position here. (E.g., if the worked-example escape valve in §F18 turns out to be too easily abused, we tighten it.)
2. The academic-integrity discourse moves and a previously-condemned use becomes accepted (or vice versa).
3. A teacher, parent, or student raises a case we hadn't considered.

Changes are reviewed by the team and posted to a public changelog. Diana's ethics posture is not a marketing claim — it's an engineering constraint we maintain.
