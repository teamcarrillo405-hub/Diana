# Diana — Phase 1 Feature Spec

Translates the Tier 1 features from `docs/research/findings.md` into concrete user stories, acceptance criteria, data model needs, and AI involvement. This is the input to the first vertical slice and to the database schema.

**Scope of this doc**: Tier 1 only (must-ship in MVP). Tier 2 and Tier 3 are stubbed at the end. All references like `§4.1` point back to the corresponding finding in `findings.md`.

**User personas**:
- **Maya, 16, 10th grade**, diagnosed ADHD-Inattentive at 14, no IEP, takes APs. Loses assignments to "I did it but forgot to submit." Reads at grade level but slowly.
- **Devon, 15, 9th grade**, diagnosed dyslexia + ADHD with an IEP. TTS user. Strong verbal, avoids writing.
- **Sam, 17, 11th grade**, undiagnosed inattentive ADHD, grade-slipping junior, parents don't know what's wrong. No formal accommodations.

Diana must work for all three on day one.

---

## Glossary

- **Class** — a course the student is taking (e.g., "AP US History, Mr. Chen, period 3").
- **Rubric pack** — the syllabus + grading rubric + class rules the student has uploaded for a class.
- **Assignment** — a discrete piece of work due on a date.
- **Submission state** — the assignment's lifecycle: `captured → planned → in_progress → done → submitted → graded`.
- **AI traffic light** — per-class setting controlling AI behavior: `red` (Socratic-only, no draft text emitted), `yellow` (step-validation, citation help, no full prose), `green` (brainstorm + outline + grammar feedback allowed). §4.5.9.
- **Authorship event** — a logged AI interaction tagged to the assignment, classifying what the student did vs. what Diana did.

---

## F1. Class & teacher rubric substrate

*Source: §4.1, §5, gap analysis §2.* The substrate everything else uses.

**User story (Maya)**: "When I add Mr. Chen's AP US History to Diana, I paste in his syllabus, his DBQ rubric, and his class rule about 'no AI-generated prose, but you may use grammar checkers.' From then on, every AI feature in Diana for this class grounds itself in those rules."

**Acceptance criteria**:
- Student can create a class with: name, subject category (English / Math / Science / History / Foreign Language / Other), teacher name, schedule (period/day pattern), color.
- Student uploads up to 5 documents per class (PDF, image, pasted text) — syllabus, rubric(s), class rules. OCR runs on images/PDFs to extract text.
- Student can set the **AI traffic light** for the class: red / yellow / green (default: yellow). One-line explanation per choice in the UI.
- Every AI call made in the context of this class injects the rubric text as part of the system prompt (cached). The traffic-light setting selects the prompt template.
- Student can edit class details and rubric documents anytime; cache invalidates.

**Data model touchpoints**: `classes`, `class_documents`, `class_ai_policy`.

**AI involvement**: At class creation, an Edge Function call summarizes the uploaded rubric into structured fields (assignment types listed, required citation style, "show work" requirement, mechanics weight, AI policy if any). The summary is cached per-class and prepended to every subsequent AI call.

**Out of scope for v1**: LMS auto-import of classes (Phase 2).

---

## F2. "Done ≠ Submitted" state machine

*Source: §1.3 — most-cited daily failure, no competitor solves it.*

**User story (Sam)**: "I finished my chemistry lab report at 11 PM. I closed my laptop. The next morning Diana asks: 'Did you actually upload the lab report to Google Classroom?' I forgot to. I open it and submit. Diana now marks the assignment `submitted`."

**Acceptance criteria**:
- Every assignment has six states: `captured`, `planned`, `in_progress`, `done`, `submitted`, `graded`.
- The transition from `done → submitted` is **never automatic**. The student must explicitly confirm submission.
- When the student marks an assignment `done`, Diana surfaces a "Submit step" panel with: the LMS URL the student saved on the assignment, a "I submitted on paper" option, a "photo of submission confirmation" option (camera + image stored), and a "remind me in N minutes" snooze.
- If an assignment sits in `done` past its due date, Diana escalates: home screen prompt, push notification, voice reminder if enabled.
- The dashboard distinguishes `done-but-not-submitted` as its own visually distinct bucket.
- Submission confirmation never punitive — copy reads "Nice — you finished. One more click to actually turn it in," not "You forgot to submit."

**Data model**: `assignments.state`, `assignments.submission_proof_url`, `assignments.submission_link`, `assignments.submitted_at`.

**AI involvement**: None required for state transitions. Optional: AI parses the LMS URL to confirm the expected upload location (Phase 2).

---

## F3. "Your next 5 minutes" home view

*Source: §1.4, §1.2 — decision elimination beats decision support.*

**User story (Devon)**: "I open Diana. I see one thing: 'Open Spanish, page 47, do first 3 vocab cards. Estimated 5 min.' I don't see a list of 12 things competing for my attention. After I finish, the next 5-minute action surfaces."

**Acceptance criteria**:
- The home screen displays a single, specific next action — not a list. Format: "[Verb] [object], [class], [≤5-min concrete first step]. Est. N min."
- A "Show me my week" toggle reveals the full backlog, collapsed by default.
- The "next action" is selected by a scoring function: due-date proximity × estimated time × class-priority × not-recently-shown. Tie-break favors a `captured` (un-planned) assignment to force planning early.
- After the student marks the action started or done, a *different* next action surfaces.
- A "skip this one, show me something else" option exists with no penalty (no streak break, no "you skipped 3 things" message). §3.5.
- If literally nothing is due, the screen reads "You're caught up. Want to study something for next week?" with a single optional study action.

**Data model**: virtual — computed from `assignments`. Persisted state: `assignments.last_shown_at`, `user_settings.home_view_mode`.

**AI involvement**: Minor. When breaking a too-big task into a 5-min first step, an Edge Function call asks Claude Haiku 4.5 to suggest the first sub-step ("Open Spanish, page 47" rather than "Do the Spanish homework"). Cached at the assignment level.

---

## F4. Universal capture inbox

*Source: §1.9, §3.9 — capture friction must approach zero.*

**User story (Maya)**: "I hear the teacher say 'AP Bio test next Friday on chapter 12.' I tap the Diana app icon on my home screen, say 'Bio test Friday on chapter 12,' and put my phone away. Later Diana asks me to confirm: 'Capture: AP Biology test, Friday Dec 5, chapter 12. Right class?' I tap yes."

**Acceptance criteria**:
- One-tap entry from the PWA home-screen icon to a capture surface — no login wall, no menu.
- Three capture modes, all immediate:
  - **Voice**: tap-and-hold mic, release to stop, transcript appears.
  - **Photo**: camera opens, single shot, OCR runs.
  - **Text**: focused text field, return to submit.
- Captured items go to an **Inbox** queue, *not* directly into a class. The student (or Diana, with confirmation) sorts them later.
- AI suggests: which class this belongs to (from rubric + recent context), assignment type, due date if any. Student confirms or edits in one tap.
- Capture-to-saved latency must be < 3 seconds for text/voice; < 8 seconds for photo+OCR. Verify in Phase 1 testing.
- Works offline; queued items sync when reconnected.

**Data model**: `inbox_items` table separate from `assignments` until classified.

**AI involvement**: Claude Haiku 4.5 (cheap, fast) parses the captured text/transcript/OCR into structured fields. If confidence is low, the item stays unclassified for student review rather than guessing wrong.

---

## F5. Time-blindness aids

*Source: §1.5, §3.5 — time should be felt, not just displayed.*

**User story (Devon)**: "Diana shows me 'AP English essay due Thursday 11:59 PM' as a visual countdown bar that fills as time passes. When I plan to start, Diana says 'If you start at 7 PM and it usually takes you 90 minutes, you'll finish at 8:30. That gives you buffer.' If I estimate 30 min, Diana gently notes 'Last 3 essays you said 30 and took ~85.'"

**Acceptance criteria**:
- Every assignment shows a visual countdown (filling bar, not just a date) on its detail view and in summary lists.
- "Plan to start" picker: student picks a start time → Diana computes finish time using the student's calibrated average for this assignment type, not the student's estimate. Calibration uses past `actual_minutes` data.
- Time estimates per assignment type are tracked: when student transitions `in_progress → done`, log the elapsed wall time (with student edit allowed in case they walked away).
- The "you said X, you usually take Y" prompt fires only after 3+ data points for that assignment type. Tone: factual, never scolding.
- "What's left tonight?" view shows current backlog as a real-time **time budget**, not a count of items: "3 hours 20 minutes of school work queued, plus 47 pages of reading."

**Data model**: `assignment_time_log` (assignment_id, start_at, end_at, edited_by_student); `assignment_type_estimates` (user_id, assignment_type, mean_minutes, n_samples).

**AI involvement**: None for the core feature. AI optionally summarizes "what's left tonight" in natural language.

---

## F6. TTS everywhere (with sync highlighting)

*Source: §7.8 (d=0.35, up to 1.58 grade levels); §3.2 (must pair with comprehension scaffolds).*

**User story (Devon)**: "I paste a 12-page chapter into Diana. Diana reads it to me at 1.3× speed with each word highlighted in turn. I can tap any word to re-listen to that sentence. The font is Atkinson Hyperlegible on an off-white background by default. Every 3 paragraphs Diana pauses and asks 'What just happened in your own words?' — I type or speak a one-sentence answer."

**Acceptance criteria**:
- Reader view supports any uploaded text (PDF, paste, URL, OCR'd photo).
- TTS uses a high-quality voice (OpenAI/ElevenLabs/Polly — provider choice deferred to architecture doc; must support timed boundaries for highlighting).
- Word-level synced highlighting; tap-to-replay sentence.
- Speed controls (0.7×, 1.0×, 1.3×, 1.5×, 2.0×); user setting persists.
- Typography defaults: Atkinson Hyperlegible (free, open license); line height 1.6; letter-spacing 0.02em; max line length ~70 chars; off-white background (#FAF8F3). User can override font (Lexend, OpenDyslexic, system sans) and background.
- Comprehension prompts fire every N paragraphs (default 3, configurable). Prompts come from §F7 (next feature). Skippable, never blocking.
- Reading time tracked; counts toward F5 time budget.
- Per-paragraph re-listen, replay-last-sentence button (large hit target).

**Data model**: `readings` (id, class_id, title, source, full_text, word_offsets), `reading_sessions` (reading_id, started_at, current_offset, comprehension_checks_passed).

**AI involvement**: TTS is the third-party voice provider. Claude generates the comprehension prompts and validates student answers (see F7).

---

## F7. Reading comprehension scaffolds

*Source: §3.2, §7.2 (chunked retrieval works for ADHD; whole-text recall doesn't).*

**User story (Maya)**: "After every few paragraphs Diana asks 'In your own words, what just happened?' I answer in one sentence. If I miss something, Diana doesn't grade me — it gently shows what I missed and lets me re-listen to that section. Before the chapter, Diana shows me 8 key vocab words with one-line definitions. After the chapter, Diana asks me 4 retrieval questions, not a quiz with a score."

**Acceptance criteria**:
- **Pre-reading**: AI generates a vocab preview (up to 12 terms) from the upcoming reading and the student's grade level + class rubric. Student can tap any term to add it to their flashcard deck for this class.
- **Mid-reading prompts**: every N paragraphs (default 3), AI generates a one-sentence "what just happened?" prompt. Student answers in voice or text. AI validates against the passage; if missing/incorrect, AI shows the relevant 2-3 sentences and offers a re-listen. Never assigns a numeric score; never says "incorrect."
- **Post-reading retrieval**: 3–5 questions generated from the passage, mixing factual and inferential. Student answers freely; AI shows the relevant passage for any answer that misses.
- All prompts respect class traffic-light setting — even in `green`, Diana never gives away inferential answers without the student attempting first.
- Vocab terms added to flashcards flow into F12 (FSRS reviews).

**AI involvement**: Claude Sonnet 4.6 for prompt generation (high quality matters here). Prompt-cached on the full reading text + class system prompt. Validation of student answers also Sonnet, single-call.

**Cost note**: This is one of the heavier AI features. A 30-page reading with 30 mid-reading checks + 5 post-reading questions ≈ ~$0.04 per session at Sonnet 4.6 rates with caching. Acceptable.

---

## F8. Note-taking: audio + AI transcript + outline scaffold

*Source: §1.8, §7.7 (multimodal default).*

**User story (Maya)**: "In class I tap 'Start recording.' Diana records audio + transcribes in real time. I can tap a star to mark important moments and a question mark to mark things I didn't understand. After class, Diana shows me a structured outline of the lecture with my stars and question marks called out. The transcript is searchable. I can ask Diana to make flashcards from this lecture."

**Acceptance criteria**:
- One-tap "Start recording" associated with a class. Records audio + streams transcript.
- During recording: large UI for "mark important" and "mark confused" — single tap, no dialog.
- Transcript is editable post-recording. Audio is retained and playable scrubbed to any transcript position.
- After recording, AI generates a structured outline (sections, main points, terms-introduced) preserving student markers.
- The student's confused markers generate a follow-up list: "things to clarify" surfaced in the class hub.
- Photo notes (board photos) OCR'd and inserted at the corresponding timestamp if recording was active.
- Note privacy: recordings stored encrypted; transcript fully editable; "delete this recording" is one tap; default retention is "kept until student deletes."

**Data model**: `notes` (class_id, title, audio_url, transcript, outline_json, created_at), `note_markers` (note_id, offset_seconds, type {important, confused, photo}, content_url).

**AI involvement**: STT (speech-to-text) via the chosen provider (defer to architecture). Outline generation via Claude Sonnet 4.6.

---

## F9. Math step organizer

*Source: §1.9, §2.10 (Photomath anti-pattern), §5.3.*

**User story (Sam)**: "I take a photo of the algebra problem. Diana reads it. Diana asks 'What's your first step?' I type 'subtract 3 from both sides.' Diana confirms the step is valid and shows me the resulting equation, then asks 'What's next?' Diana never tells me the next step. If I'm stuck, I tap 'Hint' and Diana asks me a Socratic question. If I'm really stuck after 3 hints, Diana offers to show me a worked example of a *different but analogous* problem."

**Acceptance criteria**:
- Problem capture: photo (OCR + math expression parsing), keyboard, or voice ("two x plus three equals seven").
- Display the problem at the top of a vertical "step ledger" with empty rows.
- For each row, student enters their next operation in plain language ("subtract 3 from both sides") or expression. AI **validates** the step against the current state of the problem; AI **does not** generate the next step.
- Validation outputs: ✓ (valid step, here's the resulting state), ⚠️ (step doesn't help — gently nudge), ✗ (step is invalid — explain *why* the rule was broken without revealing the next move). Always non-scoring.
- **Hint ladder**: tap "Hint" → Socratic question ("What property lets you remove a constant from both sides?"). Tap again → narrower question. Third tap → "Want a worked example of a different problem?" — the **escape valve** from §4.4/§2.11.
- Step ledger exports as a clean, numbered, color-coded PDF satisfying "show all work" rubrics. §5.3.
- Per-teacher rule enforcement: if class rubric says "no calculator," Diana refuses to compute decimal arithmetic in validation and asks the student.

**Data model**: `math_problems` (id, class_id, problem_text, problem_image_url, final_state), `math_steps` (problem_id, ordinal, student_input, validated_state, validation_result, hint_count).

**AI involvement**: Claude Sonnet 4.6 for validation (math reasoning quality matters); Opus 4.7 for hard/calculus problems where the student is genuinely stuck; Haiku 4.5 for simple arithmetic validation.

---

## F10. Writing aids — explain the rule, don't fix it

*Source: §2.9, §4.2, §4.5.5.*

**User story (Devon)**: "I write a paragraph. Diana underlines 'Their going to the store.' Diana doesn't fix it. Diana says 'There's a homophone here. \"They're\" = they are. \"Their\" = belonging to them. \"There\" = location. Which fits?' I pick one and apply it myself. Diana logs that I fixed this homophone."

**Acceptance criteria**:
- Writing surface (rich text) with a side panel for feedback.
- Three feedback layers, controllable per class via traffic-light:
  - **Mechanics** (spelling, homophones, punctuation, capitalization, basic grammar): always on. Each finding shows the **rule**, asks the student to fix it. Diana never auto-corrects.
  - **Style** (passive voice, wordiness, transitions): on for `yellow` and `green`. Same rule-explaining mode.
  - **Substance** (thesis strength, evidence-claim alignment): only on `green`. Even then, Diana asks Socratic questions about the student's draft, never rewrites it.
- "Read my draft to me" — TTS over the student's own text. §3.2 — dyslexic writers catch errors aurally.
- Per-teacher rubric awareness: if class rubric says "MLA citations required," Diana flags uncited quotes; if it says "first person banned," Diana flags I/me/my; if it says "no passive voice," Diana flags it as mechanics instead of style.
- Authorship log: every Diana suggestion + student decision logged (accept rule-fix, reject, edit own way).

**Data model**: `drafts` (assignment_id, content, version), `feedback_events` (draft_id, range, type, suggestion, student_action), `authorship_log` (assignment_id, event).

**AI involvement**: Sonnet 4.6 for feedback generation. Cached against the rubric pack. Mechanics findings can mostly come from a fast rule-based pass (LanguageTool-style) with Claude as fallback — cheaper.

---

## F11. Citation generator

*Source: §5.2.*

**User story (Maya)**: "I paste a URL. Diana generates an MLA 9 citation and a one-line explanation of *why* the citation has a hanging indent, *why* the author name is last-first, *why* the date appears where it does. I tap 'copy citation,' it goes in my draft."

**Acceptance criteria**:
- Input: URL, DOI, ISBN, paste-the-source-info. OCR'd photo of a book's title page works.
- Output: MLA 9 (default), APA 7, Chicago (notes/bibliography). Format choice per class (auto-set from rubric pack).
- Each generated citation accompanied by 2–3 bullets explaining its structure rules.
- Copy-to-clipboard one-tap. Insert-into-active-draft if a draft is open.
- Citations stored on the assignment for the Works Cited assembly at submission time.

**Data model**: `citations` (assignment_id, source_data_json, formatted_text, style).

**AI involvement**: Claude Sonnet 4.6 with the citation style guide cached. Could be a tools call if we add `@anthropic-ai/sdk` tool use.

---

## F12. FSRS spaced repetition for flashcards

*Source: §7.1 (25% fewer reviews than SM-2), §7.2 (g≈0.70 from retrieval practice).*

**User story (Devon)**: "Diana built me a Spanish vocab deck from my notes and the chapter vocab. Every morning at 7 AM Diana shows me ~12 cards. The deck mixes the harder ones with newer ones. I rate each: 'Again, Hard, Good, Easy.' Diana decides when each comes back."

**Acceptance criteria**:
- Deck per class. Cards auto-generated from: chapter vocab (F7), student-confused note markers (F8), and manual entries.
- FSRS-5 scheduling. Default target retention 90%. User can adjust (one knob).
- Card types: front-back text, cloze, image+term, audio+term (foreign language §5.6).
- Review session UX: one card at a time, large rating buttons (Again / Hard / Good / Easy), per-card audio + speak-your-answer for FL.
- "Daily reviews" count surfaced on the dashboard. No "streaks." If a day is missed, the next day's queue is the accumulated forgetting-curve picks, *not* a guilt-trip multiplier.
- Multisensory mode for FL (§5.6, §7.7): audio + visual + spoken/typed response in one card flow.

**Data model**: `decks` (class_id), `cards` (deck_id, front, back, type, metadata), `card_reviews` (card_id, reviewed_at, rating, scheduler_state_json).

**AI involvement**: Sonnet 4.6 generates cards from student notes/readings. Card scheduling is local FSRS; no AI per review.

**Library decision**: implement FSRS-5 from the open algorithm (Jarrett Ye, 2022). Don't reinvent.

---

## F13. Configurable timer with Premack rewards

*Source: §7.4 (Pomodoro 27% completion lift), §7.11 (Premack).*

**User story (Sam)**: "I tap 'Start a 20-minute block.' Diana shows the timer. When it hits 20 minutes Diana plays a soft chime and says 'Stand up, walk to the kitchen, get water.' After the break I can do another block or stop. I picked '10 minutes of YouTube' as my reward — after 3 blocks I unlock it."

**Acceptance criteria**:
- Timer session lengths: 15, 20, 25, 30 min (default 20). User setting.
- Break length: 3–5 min, with a specific movement prompt ("stand and stretch," "walk 2 minutes," "drink water"). User can set their own list.
- Premack reward chain: user defines preferred activities (YouTube, game, snack). Chain: N completed blocks → reward unlocked.
- Reward menu varies (random pick from the user's list) to prevent satiation. §7.11.
- Timer doesn't auto-restart; doesn't punish for not finishing a block. Stopping early just stops.
- Pairs with F3 — the timer can be started from the "Your next 5 minutes" card.

**Data model**: `timer_sessions` (started_at, ended_at, length_min, finished, rewards_unlocked).

**AI involvement**: None.

---

## F14. Implementation-intention prompts on task creation

*Source: §7.12.*

**User story (Maya)**: "I add a new assignment 'AP History chapter 14 reading.' Diana asks 'When and where will you start this?' I type 'After dinner, at my desk.' Later that evening Diana reminds me at 7:30 PM: 'You said: after dinner at your desk. Start the chapter 14 reading.'"

**Acceptance criteria**:
- On assignment creation (any path: capture, manual, OCR), Diana prompts for an if-then intention: "When [time/place/cue], I will [first concrete step]."
- The prompt is **skippable** in one tap (no penalty). For ADHD users who won't fill forms.
- If filled, the cue becomes the notification trigger — not just a clock time but a context (after dinner, after first period, on the bus home).
- For time-based cues, Diana schedules a push notification.
- For event-based cues (after dinner), Diana surfaces it during a daily ~6 PM "evening planning" home-screen prompt.

**Data model**: `assignment_intentions` (assignment_id, cue_type, cue_value, action_text, fired_at).

**AI involvement**: Optional — Haiku 4.5 can parse "after dinner" into a probable time window from prior data.

---

## F15. Authorship log

*Source: §4.5.3, §4.4 (Grammarly Authorship model).*

**User story (parent of Devon)**: "Devon's English teacher accused him of cheating on his essay. I open Devon's Diana account, navigate to that assignment's authorship log, and show the teacher: every paragraph started as Devon's voice transcription or typed text; Diana flagged 7 grammar issues which Devon resolved himself; Diana never produced any prose. The teacher drops the accusation."

**Acceptance criteria**:
- Every AI interaction inside an assignment is logged: timestamp, AI feature invoked, prompt summary, AI output type (suggestion / question / refusal / scaffold), student response (accept / edit / reject / ignore).
- Each authored chunk in a draft is tagged: `student_typed`, `student_dictated`, `student_pasted_from_diana_suggestion` (rare — only when Diana provides e.g. a citation block the student inserted), `student_pasted_from_external`.
- The authorship log is exportable (PDF) per assignment.
- Student can view their own log anytime ("Show me what I did vs. what Diana did").
- Parent and (future) teacher access is opt-in by the student; never automatic.
- Refusal events are logged too: when a student asked Diana for something it wouldn't do, that's a positive signal Diana shouldn't suppress.

**Data model**: `authorship_log` (id, assignment_id, ts, actor {student, diana}, event_type, payload_json).

**AI involvement**: None — it's instrumentation.

---

## F16. Per-class AI traffic-light

*Source: §4.1, §4.5.9.*

**User story (Maya)**: "Mr. Chen's history class is 'yellow' — Diana can help me outline a DBQ but won't write any of the prose. Ms. Park's English class is 'red' for the personal essay unit — Diana refuses to discuss substance at all, only TTS and grammar feedback. My algebra is 'green' — Diana can offer worked examples freely."

**Acceptance criteria**:
- Setting on the class record: `red` / `yellow` / `green`. Default `yellow`.
- Per-class default applies; per-assignment override allowed.
- Selecting a level shows a clear one-line description of what AI will/won't do:
  - **Red**: "No content help. Only TTS, dictation, mechanics, and citation formatting."
  - **Yellow**: "Scaffolding only. Diana asks Socratic questions, validates math steps, suggests outline structure. No prose, no full answers."
  - **Green**: "Full study mode. Worked examples, brainstorming, draft feedback. Diana never writes your final words."
- The traffic-light is *not* a security boundary against a determined cheating student — it's a teacher-policy honoring system. Authorship log is the integrity record.
- Visible "current AI mode: yellow" badge inside any class context so the student isn't surprised by Diana's behavior.

**Data model**: `classes.ai_policy` (enum), `assignments.ai_policy_override` (nullable enum).

**AI involvement**: The chosen policy injects a specific system-prompt block into every AI call in that context.

---

## F17. Refuse-with-redirect

*Source: §2.15, §4.5.8.*

**User story (Sam)**: "I'm tired and frustrated and I ask Diana 'just write the intro paragraph for me.' Diana says 'I won't write your intro. Want to try one of these instead?' and offers three buttons: 'Help me outline,' 'Ask me what I want to say first,' 'Read me my notes from this unit.'"

**Acceptance criteria**:
- Every refusal includes 2–4 concrete alternative actions, mapped to the legitimate features Diana does offer.
- Refusal tone is non-judgmental: "I won't" / "I can't" / "Let's try a different way," never "That's cheating."
- Refusal is logged in the authorship log (positive signal).
- Common refusal patterns documented and tested:
  - "write my essay" → outline help, dictation, voice-then-edit
  - "give me the answer" → step organizer, worked example of a different problem
  - "rewrite this paragraph for me" → "tell me what you want this paragraph to do" + grammar feedback on what they write
  - "summarize this so I don't have to read it" → TTS at higher speed + chunked comprehension scaffolds
- The redirect menu is **specific** to what the student tried to ask, not a generic "try something else."

**AI involvement**: The system prompt for every Diana AI call includes the refuse-with-redirect rubric. Refusal classification can be model-side; redirect menu is generated alongside refusal.

---

## F18. Frustration escape valve on Socratic interactions

*Source: §2.11, §4.4 (Khanmigo failure mode).*

**User story (Devon)**: "I'm stuck on the math problem. Diana asks me 3 questions and I still don't get it. I tap 'I'm stuck for real.' Diana shows me a worked example of a *different* problem with similar structure, fully explained. Then asks if I want to try my original problem again now."

**Acceptance criteria**:
- After 3 Socratic prompts on the same problem/concept with no progress, Diana proactively offers the escape valve.
- The student can also invoke it at any time with one tap.
- The worked example is on an **analogous but different** problem — never the student's actual problem. (This is the bright line preserving "doesn't do the work for them.")
- After the worked example, Diana asks "want to try yours again?" and returns to Socratic mode.
- Frustration signals trigger softer follow-ups: if student types "idk" or "I don't know" twice, Diana drops in directness, doesn't pile on questions.

**AI involvement**: Sonnet 4.6 generates analogous problems with full worked solutions. Cached per concept where possible.

---

## F19. Evidence-backed reading typography defaults

*Source: §7.9, §2.7, §2.8.*

**Acceptance criteria** (cross-cutting setting, not a feature view):

- **Default font**: Atkinson Hyperlegible (Braille Institute, free, open license, evidence-backed for high legibility).
- **Default line height**: 1.6.
- **Default letter spacing**: 0.02em.
- **Default max line length**: 70 chars.
- **Default background**: off-white (#FAF8F3) for reading surfaces; pure white acceptable elsewhere.
- **Default text size**: 17px body, scales with system font setting.
- **Optional fonts**: Lexend (evidence-backed for reading), OpenDyslexic, system sans, system serif. Picker in settings.
- **Optional backgrounds**: off-white, pale yellow, pale blue, pale gray, white, dark mode (light text on near-black).
- **High-contrast mode** for low-vision overlap.

**No marketing of "dyslexia font" as a headline feature**: §7.9 — evidence doesn't support it. The default is just "high legibility for everyone."

---

## F20. Tone and copy guidelines

*Source: §1.10, §3.5 — RSD-aware copy throughout.*

**Acceptance criteria** (copy review checklist for every UI string):

- **No** "incorrect" / "wrong" — say "let's revisit that" / "not quite, look again."
- **No** "you missed" / "you forgot" — say "this one is still open."
- **No** red color for errors. Use amber for caution, blue for guidance.
- **No** streak language. Counters are neutral ("3 days reviewed" not "🔥 3-day streak").
- **No** "you're behind" framing for any view. Use "X items waiting."
- **Always** offer a path forward. Never a dead-end "you failed."
- **Default voice**: warm, peer-level, dry humor allowed, never patronizing. Test copy with three real teens before launch.
- Loading states: never "you're slow" or "be patient" — just spinners.
- Error states: "Something went wrong on our end. Here's what to try." Never the student's fault.

---

## Out-of-scope reminders (do NOT build in MVP)

These are explicitly rejected by the research:

1. **AI essay writer** — outside the accommodation line.
2. **AI answer generator (Photomath-style)** — research-contraindicated.
3. **AI detection / plagiarism checker** — harms the target population.
4. **Teacher-facing tool** — not our role.
5. **Streak/shame motivation** — RSD-harmful.
6. **"Dyslexia font" as headline marketing** — evidence doesn't support it.
7. **Diagnosis-gated features** — undiagnosed strugglers are the typical user.

---

## Tier 2 stubs (ship in MVP if capacity, otherwise Phase 1.5)

- **F21. Subject-specific templates** — DBQ 7-point checklist; CER lab report; 5-paragraph essay; FRQ tagger.
- **F22. OCR on photo of board / assignment paper** — auto-parsed to class + due date.
- **F23. Reading-load awareness view** — "you have 47 pages queued tonight."
- **F24. Lightweight body-doubling mode** — silent peer presence; framed as community.
- **F25. MSL-mode foreign-language flashcards** — audio + visual + spoken/typed response.

## Tier 3 stubs (architect for, build in Phase 2)

- LMS import (Google Classroom, Canvas).
- School/district tier with multi-tenant + FERPA mode + SDPC NDPA.
- IEP/504 plan integration.
- Parent dashboard (read-only, opt-in slices).

---

## First vertical slice for Phase 1 build

To get a usable system end-to-end without building all 20 features at once, the first slice ships **F1 + F2 + F3** plus the minimum supporting infrastructure:

- F1: Class & rubric substrate (without AI-traffic-light enforcement yet — yellow default for everyone)
- F2: "Done ≠ Submitted" state machine
- F3: "Your next 5 minutes" home view
- Supporting: auth (Supabase, Google OAuth), basic PWA shell, dashboard navigation, manual assignment creation (no OCR/voice capture yet — that's F4 in the second slice)

This slice gives a real student a usable assignment tracker that doesn't lose work and doesn't overwhelm. Everything else layers on.

**Second slice**: F4 (capture inbox) + F5 (time-blindness) + F14 (implementation intentions) — the "doesn't drop tasks" layer.

**Third slice**: F6 (TTS) + F7 (comprehension scaffolds) + F19 typography — the "doesn't fail dyslexic users" layer.

**Fourth slice**: F8 (notes) + F12 (FSRS) — the "studies what's actually in your class" layer.

**Fifth slice**: F9 (math) + F10 (writing) + F11 (citations) + F15 (authorship log) + F16 (traffic light) + F17 (refuse-with-redirect) + F18 (escape valve) — the AI-feature core. Authorship log + traffic light must ship simultaneously with any AI feature that produces content.

**Sixth slice**: F13 (timer) + F20 (tone polish) + Tier 2 stretch.

Compliance work (privacy policy, ToS, COPPA flow, data export/delete) runs in parallel from slice 1; must be complete before any public launch.
