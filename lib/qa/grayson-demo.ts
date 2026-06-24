import type { SupabaseClient } from "@supabase/supabase-js";
import { buildChecklist } from "@/lib/checklists/templates";
import { parseRubricText } from "@/lib/rubric/rubric";
import type {
  AssignmentKind,
  Database,
  Diagnosis,
  Json,
  TablesInsert,
} from "@/lib/supabase/types";

type AppSupabaseClient = SupabaseClient<Database>;
type StepRow = { step: number; action: string; minutes: number; done: boolean };

type AssignmentSeed = {
  slug: string;
  title: string;
  kind: AssignmentKind;
  daysOut: number;
  hour?: number;
  estimatedMinutes: number;
  difficulty: number;
  readingLoad: number;
  writingLoad: number;
  description: string;
  rubricText: string;
  steps: StepRow[];
};

type ConceptSeed = {
  name: string;
  mastery: number;
  confidence: number;
};

type ClassSeed = {
  slug: string;
  name: string;
  teacher: string;
  color: string;
  notes: string;
  rubric: string;
  progressNote: string;
  concepts: ConceptSeed[];
  assignments: AssignmentSeed[];
};

type ClassRecord = ClassSeed & {
  classId: string;
  rubricId: string | null;
};

const DEMO_EXTERNAL_SOURCE = "clever";
const DEMO_EXTERNAL_ID_PREFIX = "grayson-demo";
const DEMO_DIAGNOSES: Diagnosis[] = ["adhd", "dyslexia"];
const timezone = "America/Los_Angeles";

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

const freshmanClasses: ClassSeed[] = [
  {
    slug: "english-9",
    name: "English 9",
    teacher: "Ms. Rivera",
    color: "#35ddf2",
    notes: [
      "Teacher gather: current unit, exact prompt, accepted evidence, citation style, revision window, office hours, and preferred submission format.",
      "Student gather: which reading felt heavy, quote he wants to use, what he can explain in his own words, and whether read-aloud support helps today.",
      "Diana use: break reading and writing into one visible move, keep source anchors attached, and preserve authorship receipts.",
    ].join("\n"),
    rubric: [
      "Evidence choice - Uses a specific quote or scene from the assigned text - 25 pts",
      "Reasoning - Explains how the evidence supports the claim - 25 pts",
      "Organization - Keeps one clear claim, evidence, and explanation flow - 20 pts",
      "Voice - Uses Grayson's own wording and keeps source credit visible - 15 pts",
      "Mechanics - Checks spelling, capitalization, and citation format - 15 pts",
    ].join("\n"),
    progressNote:
      "Grayson participates more when the first move is a quote choice instead of a full paragraph. Reading support and a sentence frame help him start.",
    concepts: [
      { name: "Claim evidence reasoning", mastery: 1.8, confidence: 1.6 },
      { name: "Citation setup", mastery: 1.2, confidence: 1.1 },
      { name: "Theme tracking", mastery: 1.5, confidence: 1.4 },
    ],
    assignments: [
      {
        slug: "identity-quote-response",
        title: "Paragraph evidence check: identity quote response",
        kind: "essay",
        daysOut: 1,
        hour: 15,
        estimatedMinutes: 35,
        difficulty: 3,
        readingLoad: 3,
        writingLoad: 4,
        description:
          "Write one claim-evidence-reasoning paragraph about identity in the current novel. Teacher needs one quoted line, page number, and a short explanation in Grayson's own words.",
        rubricText: [
          "Claim - One sentence answers the prompt - 20 pts",
          "Quote - Includes a relevant quote with page number - 25 pts",
          "Explanation - Connects the quote to identity in two or more sentences - 35 pts",
          "Final check - Reads the paragraph once and checks citation format - 20 pts",
        ].join("\n"),
        steps: [
          { step: 1, action: "Pick the quote and page number.", minutes: 6, done: false },
          { step: 2, action: "Write one claim sentence.", minutes: 7, done: false },
          { step: 3, action: "Explain the quote in two short sentences.", minutes: 14, done: false },
          { step: 4, action: "Read it aloud and check the citation.", minutes: 8, done: false },
        ],
      },
      {
        slug: "unit-1-vocab-quiz",
        title: "Unit 1 vocab quiz prep",
        kind: "test_prep",
        daysOut: 5,
        hour: 8,
        estimatedMinutes: 25,
        difficulty: 2,
        readingLoad: 2,
        writingLoad: 1,
        description:
          "Prepare for ten vocabulary terms from the current reading unit. Teacher wants definitions, a sentence for each word, and one quick self-check before the quiz.",
        rubricText: [
          "Definitions - Can explain each term in student language - 40 pts",
          "Examples - Writes or says one sentence for each term - 35 pts",
          "Recall check - Covers the list and tries each word from memory - 25 pts",
        ].join("\n"),
        steps: [
          { step: 1, action: "Sort terms into know, maybe, and review.", minutes: 5, done: false },
          { step: 2, action: "Make sentence cards for the review terms.", minutes: 10, done: false },
          { step: 3, action: "Do one covered-list recall pass.", minutes: 7, done: false },
          { step: 4, action: "Mark two terms for morning review.", minutes: 3, done: false },
        ],
      },
    ],
  },
  {
    slug: "algebra-1",
    name: "Algebra I",
    teacher: "Mr. Chen",
    color: "#f45ba8",
    notes: [
      "Teacher gather: current skill, calculator rules, work-showing expectations, quiz date, retake policy, and examples that match the homework.",
      "Student gather: which step gets fuzzy, whether graph paper helps, and which problem he can explain without looking.",
      "Diana use: show one model problem, then one matching problem, then a quick confidence check.",
    ].join("\n"),
    rubric: [
      "Setup - Writes the equation or expression before solving - 20 pts",
      "Work shown - Keeps each algebra step visible - 30 pts",
      "Accuracy - Solves and checks the final value - 30 pts",
      "Notation - Uses labels, units, and clean graph markings when needed - 20 pts",
    ].join("\n"),
    progressNote:
      "Grayson does best when the page starts with one model problem and only one next practice item. He should say which algebra step changed each line.",
    concepts: [
      { name: "Solving linear equations", mastery: 1.9, confidence: 1.7 },
      { name: "Slope intercept form", mastery: 1.4, confidence: 1.2 },
      { name: "Graphing from a table", mastery: 1.6, confidence: 1.5 },
    ],
    assignments: [
      {
        slug: "linear-equations-practice",
        title: "Linear equations practice set",
        kind: "problem_set",
        daysOut: 2,
        hour: 16,
        estimatedMinutes: 30,
        difficulty: 3,
        readingLoad: 1,
        writingLoad: 2,
        description:
          "Complete odd problems 3-21 on solving one-variable equations. Teacher wants work shown on each line and a quick check for two answers.",
        rubricText: [
          "Equation setup - Copies the original equation clearly - 15 pts",
          "Step flow - Shows inverse operations in order - 35 pts",
          "Answer check - Substitutes two answers back into the equation - 25 pts",
          "Presentation - Boxes final answers and spaces work clearly - 25 pts",
        ].join("\n"),
        steps: [
          { step: 1, action: "Do problem 3 as the model.", minutes: 6, done: false },
          { step: 2, action: "Complete the next four odds.", minutes: 12, done: false },
          { step: 3, action: "Check two answers by substitution.", minutes: 8, done: false },
          { step: 4, action: "Box answers and upload a clear photo.", minutes: 4, done: false },
        ],
      },
      {
        slug: "slope-intercepts-quiz",
        title: "Quiz: slope and intercepts",
        kind: "test_prep",
        daysOut: 7,
        hour: 9,
        estimatedMinutes: 35,
        difficulty: 3,
        readingLoad: 1,
        writingLoad: 2,
        description:
          "Quiz covers finding slope from two points, reading y-intercept, and graphing y = mx + b. Teacher allows a calculator but expects work shown.",
        rubricText: [
          "Slope - Finds rise over run from points or graph - 35 pts",
          "Intercept - Identifies where the line crosses the y-axis - 25 pts",
          "Graph - Plots intercept and uses slope correctly - 25 pts",
          "Check - Explains one answer in words - 15 pts",
        ].join("\n"),
        steps: [
          { step: 1, action: "Review one slope example from notes.", minutes: 7, done: false },
          { step: 2, action: "Do three mixed practice problems.", minutes: 15, done: false },
          { step: 3, action: "Graph one line on paper.", minutes: 8, done: false },
          { step: 4, action: "Write the rule for slope in one sentence.", minutes: 5, done: false },
        ],
      },
    ],
  },
  {
    slug: "biology",
    name: "Biology",
    teacher: "Dr. Patel",
    color: "#e8b85d",
    notes: [
      "Teacher gather: lab safety requirements, vocabulary list, diagram expectations, test format, and what counts as evidence in a conclusion.",
      "Student gather: which terms need a picture, which concept connects to a real example, and whether diagram-first work is easier than paragraph-first work.",
      "Diana use: convert dense science text into labeled parts, image cues, and a short lab conclusion frame.",
    ].join("\n"),
    rubric: [
      "Science vocabulary - Uses accurate unit terms - 20 pts",
      "Visual evidence - Labels diagrams, tables, or graphs clearly - 25 pts",
      "Reasoning - Connects evidence to the biology concept - 30 pts",
      "Procedure care - Follows lab directions and safety expectations - 15 pts",
      "Reflection - Names what the result shows - 10 pts",
    ].join("\n"),
    progressNote:
      "Grayson understands biology faster when vocabulary has a visual anchor. He should keep diagrams near the written explanation.",
    concepts: [
      { name: "Cell organelles", mastery: 1.6, confidence: 1.5 },
      { name: "Structure and function", mastery: 1.4, confidence: 1.3 },
      { name: "Lab evidence", mastery: 1.7, confidence: 1.6 },
    ],
    assignments: [
      {
        slug: "cell-organelle-diagram",
        title: "Cell organelle diagram and function notes",
        kind: "lab",
        daysOut: 3,
        hour: 15,
        estimatedMinutes: 40,
        difficulty: 3,
        readingLoad: 3,
        writingLoad: 3,
        description:
          "Create a labeled plant or animal cell diagram and write one function sentence for each required organelle. Teacher wants color labels and source notes.",
        rubricText: [
          "Labels - Names all required organelles - 25 pts",
          "Function notes - Gives one clear function sentence for each organelle - 35 pts",
          "Visual clarity - Uses color or spacing so labels are readable - 20 pts",
          "Source notes - Keeps textbook or class slide source visible - 20 pts",
        ].join("\n"),
        steps: [
          { step: 1, action: "List the required organelles.", minutes: 6, done: false },
          { step: 2, action: "Sketch and label the cell.", minutes: 14, done: false },
          { step: 3, action: "Add one function sentence per part.", minutes: 14, done: false },
          { step: 4, action: "Check labels against the class slide.", minutes: 6, done: false },
        ],
      },
      {
        slug: "cell-structure-quiz",
        title: "Quiz: cell structure",
        kind: "test_prep",
        daysOut: 8,
        hour: 9,
        estimatedMinutes: 30,
        difficulty: 3,
        readingLoad: 3,
        writingLoad: 2,
        description:
          "Quiz covers organelle names, functions, and the difference between plant and animal cells. Teacher will include diagram labeling and short answers.",
        rubricText: [
          "Vocabulary - Matches organelles to functions - 40 pts",
          "Diagram recall - Labels a blank cell diagram - 35 pts",
          "Compare - Names two plant and animal cell differences - 25 pts",
        ].join("\n"),
        steps: [
          { step: 1, action: "Cover labels and name five organelles.", minutes: 8, done: false },
          { step: 2, action: "Practice one blank diagram.", minutes: 10, done: false },
          { step: 3, action: "Say each function out loud once.", minutes: 8, done: false },
          { step: 4, action: "Choose three morning-review terms.", minutes: 4, done: false },
        ],
      },
    ],
  },
  {
    slug: "world-history",
    name: "World History",
    teacher: "Ms. Johnson",
    color: "#5e8cff",
    notes: [
      "Teacher gather: reading pages, source questions, map regions, vocabulary, writing frame, and test format.",
      "Student gather: which event order makes sense, which names need pronunciation help, and what connection he can explain verbally.",
      "Diana use: make timelines, map anchors, source notes, and one-sentence summaries visible.",
    ].join("\n"),
    rubric: [
      "Context - Places the event or civilization in the right time and place - 20 pts",
      "Source use - Pulls information from class text, map, or primary source - 30 pts",
      "Cause and effect - Explains why the event mattered - 25 pts",
      "Vocabulary - Uses unit terms accurately - 15 pts",
      "Organization - Keeps timeline or notes easy to scan - 10 pts",
    ].join("\n"),
    progressNote:
      "Grayson responds well to map-first and timeline-first work. He should explain one cause and one effect before writing.",
    concepts: [
      { name: "River civilizations", mastery: 1.5, confidence: 1.3 },
      { name: "Primary source notes", mastery: 1.3, confidence: 1.2 },
      { name: "Map recall", mastery: 1.8, confidence: 1.7 },
    ],
    assignments: [
      {
        slug: "river-civilizations-source-notes",
        title: "River civilizations source notes",
        kind: "reading",
        daysOut: 4,
        hour: 16,
        estimatedMinutes: 35,
        difficulty: 3,
        readingLoad: 4,
        writingLoad: 2,
        description:
          "Read the source packet on Mesopotamia and Egypt. Teacher wants three source notes, one map label, and one cause-effect sentence.",
        rubricText: [
          "Source notes - Records three accurate facts from the packet - 35 pts",
          "Map anchor - Labels the river and region correctly - 25 pts",
          "Cause effect - Writes one sentence about why rivers mattered - 25 pts",
          "Vocabulary - Uses two unit words correctly - 15 pts",
        ].join("\n"),
        steps: [
          { step: 1, action: "Scan headings and circle two key words.", minutes: 6, done: false },
          { step: 2, action: "Write three source notes.", minutes: 15, done: false },
          { step: 3, action: "Label the map river and region.", minutes: 7, done: false },
          { step: 4, action: "Write the cause-effect sentence.", minutes: 7, done: false },
        ],
      },
      {
        slug: "early-civilizations-map-quiz",
        title: "Map quiz: early civilizations",
        kind: "test_prep",
        daysOut: 10,
        hour: 9,
        estimatedMinutes: 25,
        difficulty: 2,
        readingLoad: 2,
        writingLoad: 1,
        description:
          "Quiz asks students to locate Mesopotamia, Egypt, Indus Valley, China, and major rivers. Teacher says spelling counts for river names.",
        rubricText: [
          "Location - Places each civilization in the correct region - 45 pts",
          "River names - Spells and labels major rivers clearly - 35 pts",
          "Review method - Practices once on a blank map - 20 pts",
        ].join("\n"),
        steps: [
          { step: 1, action: "Look at the completed class map.", minutes: 5, done: false },
          { step: 2, action: "Try a blank-map label pass.", minutes: 10, done: false },
          { step: 3, action: "Check spelling for river names.", minutes: 5, done: false },
          { step: 4, action: "Star two locations for review.", minutes: 5, done: false },
        ],
      },
    ],
  },
  {
    slug: "spanish-1",
    name: "Spanish I",
    teacher: "Senora Lopez",
    color: "#a477ff",
    notes: [
      "Teacher gather: vocabulary list, pronunciation targets, speaking format, allowed notes, quiz schedule, and participation expectations.",
      "Student gather: which words he can say confidently, which words need audio, and whether speaking practice should happen alone first.",
      "Diana use: create listen-say-read-write loops and keep speaking checks short and repeatable.",
    ].join("\n"),
    rubric: [
      "Vocabulary - Uses current unit words accurately - 25 pts",
      "Pronunciation - Speaks clearly enough to be understood - 25 pts",
      "Grammar - Uses the target verb or structure correctly - 25 pts",
      "Completion - Includes every required part of the prompt - 15 pts",
      "Practice evidence - Shows one study or speaking practice pass - 10 pts",
    ].join("\n"),
    progressNote:
      "Grayson is more willing to speak after one private practice round. Audio support and a tiny script help him start.",
    concepts: [
      { name: "Greetings", mastery: 2.0, confidence: 1.7 },
      { name: "Ser forms", mastery: 1.2, confidence: 1.1 },
      { name: "Classroom vocabulary", mastery: 1.5, confidence: 1.4 },
    ],
    assignments: [
      {
        slug: "ser-greetings-practice",
        title: "Ser and greetings practice",
        kind: "problem_set",
        daysOut: 6,
        hour: 15,
        estimatedMinutes: 25,
        difficulty: 2,
        readingLoad: 2,
        writingLoad: 2,
        description:
          "Complete the worksheet on greetings and forms of ser. Teacher wants written answers plus one oral practice pass.",
        rubricText: [
          "Ser forms - Chooses the correct form for each subject - 40 pts",
          "Greetings - Uses appropriate greeting or goodbye phrases - 25 pts",
          "Accent marks - Checks accent marks from the word bank - 20 pts",
          "Oral pass - Says five answers out loud once - 15 pts",
        ].join("\n"),
        steps: [
          { step: 1, action: "Circle the subject in each sentence.", minutes: 5, done: false },
          { step: 2, action: "Fill the ser form from the chart.", minutes: 10, done: false },
          { step: 3, action: "Check accent marks with the word bank.", minutes: 5, done: false },
          { step: 4, action: "Say five answers out loud.", minutes: 5, done: false },
        ],
      },
      {
        slug: "introduce-yourself-speaking-check",
        title: "Speaking check: introduce yourself",
        kind: "presentation",
        daysOut: 9,
        hour: 10,
        estimatedMinutes: 30,
        difficulty: 3,
        readingLoad: 1,
        writingLoad: 3,
        description:
          "Prepare a short Spanish introduction with name, how you feel, one class, and one goodbye. Teacher will grade clarity, required phrases, and confidence.",
        rubricText: [
          "Required phrases - Includes name, feeling, class, and goodbye - 35 pts",
          "Pronunciation - Practices enough for clear delivery - 30 pts",
          "Grammar - Uses soy, estoy, and me llamo correctly - 25 pts",
          "Pacing - Speaks at a steady pace - 10 pts",
        ].join("\n"),
        steps: [
          { step: 1, action: "Write the four-line script.", minutes: 8, done: false },
          { step: 2, action: "Mark the words that need audio.", minutes: 4, done: false },
          { step: 3, action: "Practice privately two times.", minutes: 12, done: false },
          { step: 4, action: "Record one short rehearsal.", minutes: 6, done: false },
        ],
      },
    ],
  },
  {
    slug: "health-pe",
    name: "Health / PE",
    teacher: "Coach Miller",
    color: "#45d6a3",
    notes: [
      "Teacher gather: activity expectations, make-up options, wellness log format, health topic boundaries, and assessment schedule.",
      "Student gather: energy level, recovery needs, activity preference, and whether a private written response is better than a spoken one.",
      "Diana use: keep wellness tasks practical, short, and separated from academic load.",
    ].join("\n"),
    rubric: [
      "Participation plan - Knows the activity or health task for the day - 25 pts",
      "Reflection - Writes one honest and useful observation - 25 pts",
      "Evidence - Logs activity, nutrition label, or class response as requested - 25 pts",
      "Follow-through - Completes the next small wellness action - 25 pts",
    ].join("\n"),
    progressNote:
      "Grayson benefits from health tasks that connect to real routines. Short logs work better than long reflections.",
    concepts: [
      { name: "Wellness routines", mastery: 1.7, confidence: 1.6 },
      { name: "Nutrition labels", mastery: 1.3, confidence: 1.2 },
      { name: "Recovery and sleep", mastery: 1.5, confidence: 1.4 },
    ],
    assignments: [
      {
        slug: "wellness-goal-log",
        title: "Personal wellness goal log",
        kind: "other",
        daysOut: 6,
        hour: 19,
        estimatedMinutes: 15,
        difficulty: 1,
        readingLoad: 1,
        writingLoad: 1,
        description:
          "Track one wellness goal for the week. Teacher wants date, goal, what happened, and one adjustment for tomorrow.",
        rubricText: [
          "Log entries - Includes date and goal for each entry - 30 pts",
          "Reflection - Names one thing that helped or got in the way - 35 pts",
          "Adjustment - Chooses one next-day action - 35 pts",
        ].join("\n"),
        steps: [
          { step: 1, action: "Write today's goal.", minutes: 3, done: false },
          { step: 2, action: "Log what happened.", minutes: 5, done: false },
          { step: 3, action: "Pick tomorrow's adjustment.", minutes: 4, done: false },
          { step: 4, action: "Save the log photo or file.", minutes: 3, done: false },
        ],
      },
      {
        slug: "nutrition-label-check",
        title: "Nutrition label check",
        kind: "reading",
        daysOut: 12,
        hour: 15,
        estimatedMinutes: 20,
        difficulty: 2,
        readingLoad: 2,
        writingLoad: 2,
        description:
          "Bring or photograph a nutrition label. Teacher wants serving size, sugar, protein, and one sentence about what the label shows.",
        rubricText: [
          "Label data - Finds serving size, sugar, and protein - 45 pts",
          "Interpretation - Writes one clear sentence about the label - 35 pts",
          "Evidence - Includes a photo or copied label details - 20 pts",
        ].join("\n"),
        steps: [
          { step: 1, action: "Choose one label and take a photo.", minutes: 4, done: false },
          { step: 2, action: "Write serving size, sugar, and protein.", minutes: 6, done: false },
          { step: 3, action: "Write one sentence about the label.", minutes: 6, done: false },
          { step: 4, action: "Attach the photo or copied details.", minutes: 4, done: false },
        ],
      },
    ],
  },
  {
    slug: "digital-media",
    name: "Digital Media",
    teacher: "Mr. Adams",
    color: "#ff8cc6",
    notes: [
      "Teacher gather: project brief, required file type, design constraints, source requirements, peer-review date, and export instructions.",
      "Student gather: what style he wants, which asset is original, which source needs credit, and whether visual examples help him choose a direction.",
      "Diana use: keep creative choices open while making source credit and export steps impossible to miss.",
    ].join("\n"),
    rubric: [
      "Brief match - Meets the project prompt and size or format rules - 25 pts",
      "Original design - Uses student choices for layout, color, and message - 25 pts",
      "Source credit - Credits images, facts, or templates when required - 20 pts",
      "Craft - Aligns text, contrast, and spacing clearly - 20 pts",
      "Export - Submits the correct file type or link - 10 pts",
    ].join("\n"),
    progressNote:
      "Grayson engages strongly with visual work. The main support need is keeping file requirements and source credit visible.",
    concepts: [
      { name: "Digital citizenship", mastery: 1.6, confidence: 1.7 },
      { name: "Visual hierarchy", mastery: 1.4, confidence: 1.5 },
      { name: "Source credit", mastery: 1.2, confidence: 1.1 },
    ],
    assignments: [
      {
        slug: "digital-citizenship-poster-draft",
        title: "Canva poster draft: digital citizenship",
        kind: "presentation",
        daysOut: 5,
        hour: 16,
        estimatedMinutes: 45,
        difficulty: 3,
        readingLoad: 2,
        writingLoad: 3,
        description:
          "Create a first poster draft about one digital citizenship habit. Teacher wants a clear message, two design choices, and source credit for any outside image.",
        rubricText: [
          "Message - States one clear digital citizenship habit - 25 pts",
          "Design choices - Uses layout, contrast, and image placement on purpose - 30 pts",
          "Source credit - Credits any outside image or fact - 25 pts",
          "Draft readiness - Exports or shares the draft link correctly - 20 pts",
        ].join("\n"),
        steps: [
          { step: 1, action: "Choose the habit and write the poster message.", minutes: 8, done: false },
          { step: 2, action: "Pick layout, image, and two colors.", minutes: 12, done: false },
          { step: 3, action: "Build the first Canva draft.", minutes: 18, done: false },
          { step: 4, action: "Add source credit and share the link.", minutes: 7, done: false },
        ],
      },
      {
        slug: "project-source-list-checkpoint",
        title: "Project checkpoint: source list",
        kind: "other",
        daysOut: 11,
        hour: 15,
        estimatedMinutes: 20,
        difficulty: 2,
        readingLoad: 2,
        writingLoad: 2,
        description:
          "Submit a source list for the digital citizenship poster. Teacher wants the title, link, creator if available, and how each source is used.",
        rubricText: [
          "Source details - Includes title, link, and creator when available - 45 pts",
          "Use note - Says how each source supports the poster - 35 pts",
          "Format - Keeps the list readable and ready to attach - 20 pts",
        ].join("\n"),
        steps: [
          { step: 1, action: "Open the poster draft and list outside assets.", minutes: 5, done: false },
          { step: 2, action: "Copy source title and link.", minutes: 7, done: false },
          { step: 3, action: "Write how each source is used.", minutes: 5, done: false },
          { step: 4, action: "Attach the list to the checkpoint.", minutes: 3, done: false },
        ],
      },
    ],
  },
];

function expectNoError(error: { message: string } | null, action: string) {
  if (error) throw new Error(`${action}: ${error.message}`);
}

function requireId(row: { id: string } | null, action: string) {
  if (!row?.id) throw new Error(`${action}: Supabase returned no row id.`);
  return row.id;
}

function dueAt(now: Date, daysOut: number, hour = 15) {
  const next = new Date(now);
  next.setDate(next.getDate() + daysOut);
  next.setHours(hour, 30, 0, 0);
  return next.toISOString();
}

function totalPoints(rawText: string) {
  const criteria = parseRubricText(rawText);
  if (!criteria.every((criterion) => criterion.points != null)) return null;
  return criteria.reduce((sum, criterion) => sum + (criterion.points ?? 0), 0);
}

function rubricParsed(rawText: string): Json {
  const criteria = parseRubricText(rawText);
  return {
    criteria,
    totalPoints: totalPoints(rawText),
    intendedUse: "student_self_check",
  } as Json;
}

async function ensureClass(client: AppSupabaseClient, ownerId: string, seed: ClassSeed) {
  const values: TablesInsert<"classes"> = {
    owner_id: ownerId,
    name: seed.name,
    teacher: seed.teacher,
    color: seed.color,
    ai_mode: "green",
    archived_at: null,
    notes: seed.notes,
  };

  const { data: existing, error: lookupError } = await client
    .from("classes")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("name", seed.name)
    .maybeSingle();
  expectNoError(lookupError, `Find ${seed.name}`);

  if (existing?.id) {
    const { data, error } = await client
      .from("classes")
      .update(values)
      .eq("id", existing.id)
      .select("id")
      .single();
    expectNoError(error, `Update ${seed.name}`);
    return requireId(data, `Update ${seed.name}`);
  }

  const { data, error } = await client
    .from("classes")
    .insert(values)
    .select("id")
    .single();
  expectNoError(error, `Create ${seed.name}`);
  return requireId(data, `Create ${seed.name}`);
}

async function ensureRubric(
  client: AppSupabaseClient,
  ownerId: string,
  classId: string,
  seed: ClassSeed,
) {
  const title = `Freshman rubric: ${seed.name}`;
  const values: TablesInsert<"rubrics"> = {
    owner_id: ownerId,
    class_id: classId,
    title,
    source_kind: "manual",
    raw_text: seed.rubric,
    parsed: rubricParsed(seed.rubric),
    parse_status: "parsed",
    parse_error: null,
  };

  const { data: existing, error: lookupError } = await client
    .from("rubrics")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("class_id", classId)
    .eq("title", title)
    .maybeSingle();
  expectNoError(lookupError, `Find rubric for ${seed.name}`);

  if (existing?.id) {
    const { data, error } = await client
      .from("rubrics")
      .update(values)
      .eq("id", existing.id)
      .select("id")
      .single();
    expectNoError(error, `Update rubric for ${seed.name}`);
    return requireId(data, `Update rubric for ${seed.name}`);
  }

  const { data, error } = await client
    .from("rubrics")
    .insert(values)
    .select("id")
    .single();
  expectNoError(error, `Create rubric for ${seed.name}`);
  return requireId(data, `Create rubric for ${seed.name}`);
}

async function ensureAssignment(
  client: AppSupabaseClient,
  ownerId: string,
  classRecord: ClassRecord,
  assignment: AssignmentSeed,
  now: Date,
) {
  const externalId = `${DEMO_EXTERNAL_ID_PREFIX}:${classRecord.slug}:${assignment.slug}`;
  const values: TablesInsert<"assignments"> = {
    owner_id: ownerId,
    class_id: classRecord.classId,
    title: assignment.title,
    description: assignment.description,
    kind: assignment.kind,
    status: "todo",
    due_at: dueAt(now, assignment.daysOut, assignment.hour),
    estimated_minutes: assignment.estimatedMinutes,
    difficulty: assignment.difficulty,
    reading_load: assignment.readingLoad,
    writing_load: assignment.writingLoad,
    external_source: DEMO_EXTERNAL_SOURCE,
    external_id: externalId,
    external_url: `https://school.example/grayson/${classRecord.slug}/${assignment.slug}`,
    last_synced_at: now.toISOString(),
    submission_sync_status: "not_started",
    ai_mode_override: null,
    rubric_id: classRecord.rubricId,
    rubric_text: assignment.rubricText,
  };

  const { data: existing, error: lookupError } = await client
    .from("assignments")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("external_source", DEMO_EXTERNAL_SOURCE)
    .eq("external_id", externalId)
    .maybeSingle();
  expectNoError(lookupError, `Find ${assignment.title}`);

  if (existing?.id) {
    const { data, error } = await client
      .from("assignments")
      .update(values)
      .eq("id", existing.id)
      .select("id")
      .single();
    expectNoError(error, `Update ${assignment.title}`);
    return requireId(data, `Update ${assignment.title}`);
  }

  const { data, error } = await client
    .from("assignments")
    .insert(values)
    .select("id")
    .single();
  expectNoError(error, `Create ${assignment.title}`);
  return requireId(data, `Create ${assignment.title}`);
}

async function resetAssignmentSupport(client: AppSupabaseClient, assignmentId: string) {
  const checklistDelete = await client
    .from("submission_checklist")
    .delete()
    .eq("assignment_id", assignmentId);
  expectNoError(checklistDelete.error, "Reset submission checklist");

  const stepsDelete = await client
    .from("assignment_steps")
    .delete()
    .eq("assignment_id", assignmentId);
  expectNoError(stepsDelete.error, "Reset assignment steps");

  const assignmentChecklistDelete = await client
    .from("assignment_checklists")
    .delete()
    .eq("assignment_id", assignmentId);
  expectNoError(assignmentChecklistDelete.error, "Reset assignment checklist");
}

async function seedAssignmentSupport(
  client: AppSupabaseClient,
  ownerId: string,
  assignmentId: string,
  assignment: AssignmentSeed,
) {
  await resetAssignmentSupport(client, assignmentId);

  const checklist = buildChecklist(assignment.kind, DEMO_DIAGNOSES);
  if (checklist.length > 0) {
    const { error } = await client.from("submission_checklist").insert(
      checklist.map((item, index) => ({
        owner_id: ownerId,
        assignment_id: assignmentId,
        label: item.label,
        detail: item.detail,
        required: item.required,
        checked: false,
        position: index,
      })),
    );
    expectNoError(error, `Seed submission checklist for ${assignment.title}`);
  }

  const { error: checklistError } = await client.from("assignment_checklists").insert({
    owner_id: ownerId,
    assignment_id: assignmentId,
    items: checklist as unknown as Json,
  });
  expectNoError(checklistError, `Seed assignment checklist for ${assignment.title}`);

  const { error: stepsError } = await client.from("assignment_steps").insert({
    owner_id: ownerId,
    assignment_id: assignmentId,
    steps: assignment.steps,
  });
  expectNoError(stepsError, `Seed steps for ${assignment.title}`);
}

async function seedProfile(client: AppSupabaseClient, ownerId: string, now: Date) {
  const { error } = await client.from("profiles").upsert(
    {
      user_id: ownerId,
      display_name: "Grayson",
      date_of_birth: "2011-09-01",
      age_bracket: "13_to_17",
      timezone,
      onboarded_at: now.toISOString(),
      consent_ai: true,
      school_year: 9,
      class_count_hint: freshmanClasses.length,
      diagnoses: DEMO_DIAGNOSES,
      accommodations: ["extended_time", "breaks", "alternate_format", "quiet_setting"],
      extra_time_pct: 50,
      dyslexia_font: true,
      line_focus: true,
      bionic_reading: true,
      tts_enabled: true,
      tts_provider: "browser",
      tts_voice: "nova",
      tts_speed: 0.95,
      tts_pitch: 1,
      font_size: "normal",
      line_spacing: "loose",
      reading_letter_spacing: "wide",
      reading_word_spacing: "wide",
      visual_pacing: "line",
      interests: ["basketball", "music", "digital_art", "technology"],
      session_mood: "meh",
      mastery_signals: {
        source: "grayson-demo",
        goal: "freshman readiness",
        strongestModes: ["visual", "short practice", "read aloud"],
      } as Json,
      ai_verbosity_by_subject: {
        default: "short",
        English: "guided",
        Algebra: "steps",
        Biology: "visual",
      } as Json,
      notification_preferences: {
        homeworkDigest: "evening",
        quizPrepNudge: true,
        quietHours: "21:30-07:00",
      } as Json,
      privacy_preferences: {
        teacherSharesNeedReview: true,
        parentSummary: "weekly",
        showProofReceipts: true,
      } as Json,
    },
    { onConflict: "user_id" },
  );
  expectNoError(error, "Seed Grayson profile");
}

async function resetClassContext(
  client: AppSupabaseClient,
  ownerId: string,
  classIds: string[],
) {
  const notesDelete = await client
    .from("notes")
    .delete()
    .eq("owner_id", ownerId)
    .contains("tags", ["grayson-demo"]);
  expectNoError(notesDelete.error, "Reset Grayson notes");

  if (classIds.length === 0) return;

  const progressDelete = await client
    .from("teacher_progress_notes")
    .delete()
    .eq("owner_id", ownerId)
    .in("class_id", classIds);
  expectNoError(progressDelete.error, "Reset Grayson teacher notes");

  const accommodationsDelete = await client
    .from("accommodation_confirmations")
    .delete()
    .eq("owner_id", ownerId)
    .in("class_id", classIds);
  expectNoError(accommodationsDelete.error, "Reset Grayson accommodation confirmations");

  const masteryDelete = await client
    .from("mastery_concepts")
    .delete()
    .eq("owner_id", ownerId)
    .eq("source", "seeded")
    .in("class_id", classIds);
  expectNoError(masteryDelete.error, "Reset Grayson mastery concepts");
}

async function seedClassContext(
  client: AppSupabaseClient,
  ownerId: string,
  classRecords: ClassRecord[],
  assignmentIds: Record<string, string>,
  now: Date,
) {
  await resetClassContext(
    client,
    ownerId,
    classRecords.map((record) => record.classId),
  );

  const progressRows: TablesInsert<"teacher_progress_notes">[] = classRecords.map((record) => ({
    owner_id: ownerId,
    class_id: record.classId,
    assignment_id: null,
    author_name: record.teacher,
    note_text: record.progressNote,
    visible_to_parent: true,
  }));
  const { error: progressError } = await client.from("teacher_progress_notes").insert(progressRows);
  expectNoError(progressError, "Seed Grayson teacher progress notes");

  const accommodationRows: TablesInsert<"accommodation_confirmations">[] = classRecords.map((record) => ({
    owner_id: ownerId,
    class_id: record.classId,
    confirmed_by: record.teacher,
    extra_time_pct: 50,
    tts_enabled: true,
    dyslexia_font: true,
    accommodations: {
      extendedTime: true,
      breaks: true,
      alternateFormat: true,
      quietSetting: true,
      teacherNotes: "Confirm assignment prompt, rubric, and test format before work starts.",
    } as Json,
    notes: "Freshman demo accommodation packet: extended time, reading support, short check-ins, and source-visible work.",
    confirmed_at: now.toISOString(),
  }));
  const { error: accommodationError } = await client
    .from("accommodation_confirmations")
    .insert(accommodationRows);
  expectNoError(accommodationError, "Seed Grayson accommodation confirmations");

  const masteryRows: TablesInsert<"mastery_concepts">[] = classRecords.flatMap((record) =>
    record.concepts.map((concept) => ({
      owner_id: ownerId,
      class_id: record.classId,
      name: concept.name,
      source: "seeded",
      mastery_level: concept.mastery,
      self_confidence: concept.confidence,
      last_practiced_at: null,
    })),
  );
  const { error: masteryError } = await client.from("mastery_concepts").insert(masteryRows);
  expectNoError(masteryError, "Seed Grayson mastery concepts");

  const noteRows: TablesInsert<"notes">[] = classRecords.flatMap((record) => [
    {
      owner_id: ownerId,
      class_id: record.classId,
      title: `Teacher context: ${record.name}`,
      body_text: [
        `${record.teacher} - ${record.name}`,
        record.notes,
        `Progress note: ${record.progressNote}`,
      ].join("\n\n"),
      source: "manual",
      tags: ["grayson-demo", "teacher-context", record.slug],
      ai_suggested_tags: ["rubric", "teacher", "freshman"],
      action_items_json: [
        "Confirm next due date",
        "Attach rubric",
        "Capture teacher-specific submission rules",
      ] as unknown as Json,
      outline_json: {
        type: "teacher_context",
        class: record.name,
        teacher: record.teacher,
      } as Json,
    },
    {
      owner_id: ownerId,
      class_id: record.classId,
      assignment_id: assignmentIds[`${record.slug}:${record.assignments[0].slug}`] ?? null,
      title: `Student context: ${record.name}`,
      body_text: [
        "What Grayson should tell Diana before work starts:",
        "- How much energy he has today.",
        "- Which part feels clear enough to start.",
        "- Which support helps: read aloud, diagram, sample problem, private rehearsal, or timer.",
        "- What he already tried and what the teacher said matters most.",
      ].join("\n"),
      source: "manual",
      tags: ["grayson-demo", "student-context", record.slug],
      ai_suggested_tags: ["student-voice", "support", "freshman"],
      action_items_json: [
        "Ask Grayson to choose today's energy",
        "Pick one support mode",
        "Save one proof point after work",
      ] as unknown as Json,
      outline_json: {
        type: "student_context",
        class: record.name,
        preferredSupports: ["small first move", "visual anchor", "read aloud"],
      } as Json,
    },
  ]);

  const { error: notesError } = await client.from("notes").insert(noteRows);
  expectNoError(notesError, "Seed Grayson context notes");

  const bySlug = new Map(classRecords.map((record) => [record.slug, record]));
  const inboxRows = [
    {
      raw: "[Grayson demo] Patel said the cell diagram needs labels, function notes, and one sentence about mitochondria before Friday.",
      capture_mode: "voice",
      status: "classified",
      suggested_class_id: bySlug.get("biology")?.classId ?? null,
      suggested_kind: "lab",
      suggested_due_at: addDays(now, 3).toISOString(),
      suggestion_confidence: 0.86,
      created_at: addMinutes(now, -34).toISOString(),
    },
    {
      raw: "[Grayson demo] Photo of English board: quote response needs page number, claim, evidence, reasoning. Teacher wants it before tomorrow.",
      capture_mode: "photo",
      status: "classified",
      suggested_class_id: bySlug.get("english-9")?.classId ?? null,
      suggested_kind: "essay",
      suggested_due_at: addDays(now, 1).toISOString(),
      suggestion_confidence: 0.91,
      created_at: addMinutes(now, -52).toISOString(),
    },
    {
      raw: "[Grayson demo] Reminder from math: slope intercept quiz review, odd problems only, bring one question to class.",
      capture_mode: "text",
      status: "unclassified",
      suggested_class_id: bySlug.get("algebra-1")?.classId ?? null,
      suggested_kind: "test_prep",
      suggested_due_at: addDays(now, 6).toISOString(),
      suggestion_confidence: 0.62,
      created_at: addMinutes(now, -81).toISOString(),
    },
  ];

  const ownerResult = await resetAndInsertInboxRows(client, ownerId, "owner_id", inboxRows);
  if (ownerResult.ok) return;

  const shouldTryUserId =
    ownerResult.message.includes("owner_id") ||
    ownerResult.message.includes("schema cache") ||
    ownerResult.message.includes("column");
  if (!shouldTryUserId) {
    throw new Error(`Seed Grayson inbox captures: ${ownerResult.message}`);
  }

  const userResult = await resetAndInsertInboxRows(client, ownerId, "user_id", inboxRows);
  if (!userResult.ok) {
    throw new Error(`Seed Grayson inbox captures: ${userResult.message}`);
  }
}

async function resetAndInsertInboxRows(
  client: AppSupabaseClient,
  ownerId: string,
  ownerColumn: "owner_id" | "user_id",
  rows: Array<Omit<TablesInsert<"inbox_items">, "owner_id">>,
) {
  const table = client.from("inbox_items") as ReturnType<AppSupabaseClient["from"]>;
  const statusProbe = await table.select("status").limit(0);
  if (statusProbe.error?.message.includes("status")) {
    return { ok: true, message: "Skipped optional inbox seed; local inbox_items schema is older." };
  }

  const inboxDelete = await table
    .delete()
    .eq(ownerColumn, ownerId)
    .in("status", ["unclassified", "classified"])
    .like("raw", "[Grayson demo]%");
  if (inboxDelete.error) return { ok: false, message: inboxDelete.error.message };

  const insertRows = rows.map((row) => ({ ...row, [ownerColumn]: ownerId }));
  const { error } = await table.insert(insertRows as never);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "" };
}

export async function seedGraysonFreshmanDemo(
  client: AppSupabaseClient,
  ownerId: string,
  now = new Date(),
) {
  await seedProfile(client, ownerId, now);

  const classRecords: ClassRecord[] = [];
  for (const seed of freshmanClasses) {
    const classId = await ensureClass(client, ownerId, seed);
    const rubricId = await ensureRubric(client, ownerId, classId, seed);
    classRecords.push({ ...seed, classId, rubricId });
  }

  const assignmentIds: Record<string, string> = {};
  for (const classRecord of classRecords) {
    for (const assignment of classRecord.assignments) {
      const assignmentId = await ensureAssignment(client, ownerId, classRecord, assignment, now);
      assignmentIds[`${classRecord.slug}:${assignment.slug}`] = assignmentId;
      await seedAssignmentSupport(client, ownerId, assignmentId, assignment);
    }
  }

  await seedClassContext(client, ownerId, classRecords, assignmentIds, now);

  return {
    classCount: classRecords.length,
    assignmentCount: Object.keys(assignmentIds).length,
    rubricCount: classRecords.length,
  };
}
