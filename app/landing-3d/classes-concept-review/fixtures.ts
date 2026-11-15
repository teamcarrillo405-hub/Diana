export type ClassWork = {
  id: string;
  title: string;
  due: string;
  state: "active" | "ready" | "submitted";
  minutes: number;
  brief: string;
};
export type CourseResource = {
  id: string;
  title: string;
  kind: "Note" | "Syllabus" | "Rubric";
  date: string;
  paragraphs: string[];
};
export type PracticeQuestion = {
  prompt: string;
  choices: string[];
  answer: number;
  explanation: string;
};
export type ConceptCourse = {
  id: string;
  name: string;
  discipline: string;
  code: string;
  teacher: string;
  period: string;
  image: string;
  imageAlt: string;
  color: string;
  topic: string;
  grade: { percent: number; letter: string; recorded: string } | null;
  assignments: ClassWork[];
  resources: CourseResource[];
  questions: PracticeQuestion[];
};

// Every record is synthetic. These fixtures never read or write student data.
const seeds = [
  {
    id: "biology", name: "Biology", discipline: "Science", code: "BIO 101", teacher: "Dr. Patel", period: "Period 1",
    art: "biology", imageAlt: "Plant cell structures seen through a microscope", color: "#6cebbb", topic: "Cell structure",
    grade: { percent: 91, letter: "A-", recorded: "Sep 14" },
    titles: ["Cell structure & function", "Microscope observations", "Exploring ecosystems"],
    brief: "Label the visible cell structures and explain how each structure supports the cell.",
    note: "Plant cells have a cell wall, a cell membrane, and chloroplasts. The cell wall supports the cell; the membrane controls what moves in and out. Chloroplasts capture light energy for photosynthesis.",
    questions: [
      { prompt: "Which structure captures light energy for photosynthesis?", choices: ["Cell membrane", "Chloroplast", "Nucleus"], answer: 1, explanation: "Chloroplasts contain chlorophyll, which absorbs light energy used in photosynthesis." },
      { prompt: "What is the main role of the cell membrane?", choices: ["Control what enters and leaves the cell", "Store all genetic information", "Produce sunlight"], answer: 0, explanation: "The cell membrane is selectively permeable, regulating the movement of substances into and out of the cell." },
    ],
  },
  {
    id: "english", name: "English 9", discipline: "Language arts", code: "ENG 109", teacher: "Ms. Rivera", period: "Period 2",
    art: "english", imageAlt: "Books and printed pages for English literature", color: "#ffa495", topic: "Evidence & voice",
    grade: { percent: 88, letter: "B+", recorded: "Sep 14" },
    titles: ["A point of view", "Evidence in the text", "Close reading journal"],
    brief: "Develop a claim about the narrator and support it with two specific passages from the text.",
    note: "A claim is an interpretation you can support. Evidence is a relevant detail or quotation from the text. Analysis explains how that evidence supports the claim rather than simply repeating it.",
    questions: [
      { prompt: "What connects a quotation to your claim?", choices: ["A longer title", "An unrelated example", "Your analysis of the evidence"], answer: 2, explanation: "Analysis explains why the evidence supports the interpretation in your claim." },
      { prompt: "Which statement is a claim that could be supported with textual evidence?", choices: ["The book has pages", "The narrator becomes more confident over time", "The cover is blue"], answer: 1, explanation: "A change in the narrator's confidence is an interpretation that can be supported with passages from the text." },
    ],
  },
  {
    id: "algebra", name: "Algebra I", discipline: "Mathematics", code: "MAT 101", teacher: "Mr. Chen", period: "Period 3",
    art: "math", imageAlt: "Mathematical equations and function graphs on a blackboard", color: "#92c7ff", topic: "Linear relationships",
    grade: null,
    titles: ["Functions & graphs", "Finding the slope", "Patterns & sequences"],
    brief: "Match each linear function to its graph. Show how the slope and intercept determine the line.",
    note: "In y = mx + b, m is the slope and b is the y-intercept. Slope is the change in y divided by the change in x. A positive slope rises from left to right; a negative slope falls.",
    questions: [
      { prompt: "What is the slope of y = 3x + 2?", choices: ["2", "3", "5"], answer: 1, explanation: "In slope-intercept form, y = mx + b, the coefficient of x is the slope. Here it is 3." },
      { prompt: "Where does y = 3x + 2 cross the y-axis?", choices: ["(0, 2)", "(2, 0)", "(0, 3)"], answer: 0, explanation: "On the y-axis, x equals 0. Substituting x = 0 gives y = 2." },
    ],
  },
  {
    id: "chemistry", name: "Chemistry", discipline: "Science", code: "CHM 101", teacher: "Ms. Brooks", period: "Period 4",
    art: "chemistry", imageAlt: "Colorful solutions and glassware in a chemistry laboratory", color: "#68def4", topic: "Chemical reactions",
    grade: { percent: 94, letter: "A", recorded: "Sep 12" },
    titles: ["Reaction lab notes", "Balancing equations", "Elements & compounds"],
    brief: "Use observations from the lab to identify evidence of a chemical reaction and balance the given equations.",
    note: "A balanced chemical equation has the same number of atoms of each element on both sides. Change coefficients to balance an equation, not the subscripts that define each substance.",
    questions: [
      { prompt: "What should you change when balancing a chemical equation?", choices: ["Element symbols", "Subscripts", "Coefficients"], answer: 2, explanation: "Coefficients change the number of molecules without changing the identity of a substance." },
      { prompt: "Which principle explains why an equation must be balanced?", choices: ["Conservation of mass", "Increasing volume", "Constant temperature"], answer: 0, explanation: "Atoms are rearranged in a chemical reaction, so the number of each kind of atom remains the same." },
    ],
  },
  {
    id: "history", name: "World History", discipline: "Social studies", code: "HIS 101", teacher: "Ms. Johnson", period: "Period 5",
    art: "history", imageAlt: "Historic photographs arranged in an archive", color: "#ffcf7c", topic: "Reading primary sources",
    grade: { percent: 90, letter: "A-", recorded: "Sep 13" },
    titles: ["Reading the archive", "Two perspectives", "Historical context"],
    brief: "Compare two primary sources. Explain each author's perspective and support your comparison with evidence.",
    note: "A primary source comes from the time or event being studied. Consider who made it, the intended audience, its purpose, and its historical context. A firsthand account can still reflect a limited perspective.",
    questions: [
      { prompt: "Which is a primary source for studying a historical event?", choices: ["A textbook written a century later", "A diary written by a witness", "A modern summary video"], answer: 1, explanation: "A witness's diary is a firsthand source created during the period being studied." },
      { prompt: "Why consider a source's intended audience?", choices: ["Audience determines whether the paper is old", "All audiences have the same perspective", "Audience can influence what the author emphasizes"], answer: 2, explanation: "An author may select language and details to inform or persuade a particular audience." },
    ],
  },
  {
    id: "media", name: "Digital Media", discipline: "Creative arts", code: "ART 110", teacher: "Mr. Adams", period: "Period 6",
    art: "computer-science", imageAlt: "A computer circuit board with processors and electronic components", color: "#b8e47d", topic: "Visual storytelling",
    grade: null,
    titles: ["A story in three frames", "Composition study", "Digital citizenship poster"],
    brief: "Create a three-frame visual sequence with a clear beginning, middle, and end.",
    note: "Visual hierarchy guides attention. Contrast, placement, scale, and spacing can help the viewer find the main subject before moving to supporting information. Strong compositions do not make every element equally prominent.",
    questions: [
      { prompt: "What is the purpose of visual hierarchy?", choices: ["Make every element identical", "Guide attention through the composition", "Fill every empty space"], answer: 1, explanation: "Hierarchy helps viewers identify the main subject and understand the order of supporting information." },
      { prompt: "Which change can make a headline easier to find?", choices: ["Give it a clear size contrast", "Make all text the same size", "Hide it behind an image"], answer: 0, explanation: "A deliberate size difference establishes a clear distinction between the headline and supporting text." },
    ],
  },
];

export const CONCEPT_COURSES: ConceptCourse[] = seeds.map(seed => ({
  ...seed,
  image: `/assets/landing-10k/subjects/${seed.art}.webp`,
  assignments: seed.titles.map((title, index) => ({
    id: `${seed.id}-work-${index}`, title,
    due: index === 0 ? "Sep 17" : index === 1 ? "Sep 18" : "Sep 14",
    state: seed.id === "media" || index === 2 ? "submitted" : seed.id === "chemistry" && index === 1 ? "ready" : "active",
    minutes: index === 0 ? 25 : 15,
    brief: seed.brief,
  })),
  resources: [
    { id: `${seed.id}-notes`, title: `${seed.topic} notes`, kind: "Note", date: "Sep 15", paragraphs: [seed.note] },
    { id: `${seed.id}-rubric`, title: "Assignment rubric", kind: "Rubric", date: "Sep 12", paragraphs: ["Content: address each part of the assignment and support your ideas with specific evidence.", "Reasoning: explain the connection between your evidence and your conclusion.", "Presentation: organize the response so another reader can follow your work."] },
    { id: `${seed.id}-syllabus`, title: "Fall course syllabus", kind: "Syllabus", date: "Sep 1", paragraphs: [`${seed.name} explores ${seed.topic.toLowerCase()} through class work, discussion, and practice.`, "Keep source notes and show the reasoning behind your answers. Review the assignment instructions for the required submission format."] },
  ],
}));

export function courseSummary(course: ConceptCourse) {
  const open = course.assignments.filter(work => work.state !== "submitted");
  return { open: open.length, submitted: course.assignments.length - open.length, nextDue: open[0]?.due ?? null };
}
