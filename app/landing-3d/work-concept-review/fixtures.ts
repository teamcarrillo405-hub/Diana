export type WorkState = "active" | "review" | "ready" | "submitted";
export type ConceptAssignment = {
  id: string;
  subject: string;
  title: string;
  image: string;
  imageAlt: string;
  color: string;
  state: WorkState;
  due: string;
  day: string;
  dueDate: string;
  dueTime?: string;
  minutes: number;
  completed: number;
  total: number;
  brief: string;
  requirements: string[];
  materials: string[];
};

// Synthetic review fixtures only. Neither concept reads or writes student data.
export const WORK_REVIEW_TODAY = "2026-09-16";
export const CONCEPT_ASSIGNMENTS: ConceptAssignment[] = [
  {
    id: "chemistry", subject: "Chemistry", title: "Reaction lab notes",
    image: "/assets/landing-10k/subjects/chemistry.webp",
    imageAlt: "Colorful solutions and glassware in a chemistry laboratory",
    color: "#68def4", state: "active", due: "Tomorrow, 4 PM", day: "THU 17",
    dueDate: "2026-09-17", dueTime: "16:00",
    minutes: 35, completed: 2, total: 5,
    brief: "Use the lab observations to explain what changed in each reaction.",
    requirements: ["Record your observations", "Balance the reaction equations", "Explain the evidence of a chemical change"],
    materials: ["Reaction lab sheet.pdf", "Class observations"],
  },
  {
    id: "biology", subject: "Biology", title: "Inside the cell",
    image: "/assets/landing-10k/subjects/biology.webp",
    imageAlt: "Plant cells and their boundaries through a microscope",
    color: "#66ebba", state: "active", due: "Friday, 2 PM", day: "FRI 18",
    dueDate: "2026-09-18", dueTime: "14:00",
    minutes: 25, completed: 0, total: 4,
    brief: "Identify the visible cell structures and connect each structure to its function.",
    requirements: ["Label the cell diagram", "Describe four organelle functions", "Compare plant and animal cells"],
    materials: ["Cell diagram.pdf", "Chapter 3 notes"],
  },
  {
    id: "history", subject: "History", title: "Reading the archive",
    image: "/assets/landing-10k/subjects/history.webp",
    imageAlt: "A collection of historic portrait photographs in an archive",
    color: "#ffcf7c", state: "active", due: "Friday, 5 PM", day: "FRI 18",
    dueDate: "2026-09-18", dueTime: "17:00",
    minutes: 40, completed: 1, total: 4,
    brief: "Compare two primary sources and explain how their perspectives shape the story.",
    requirements: ["Identify each source's perspective", "Choose two pieces of evidence", "Write your comparison"],
    materials: ["Primary sources.pdf", "Response rubric"],
  },
  {
    id: "math", subject: "Algebra", title: "Functions & graphs",
    image: "/assets/landing-10k/subjects/math.webp",
    imageAlt: "Mathematical diagrams, graphs, and equations on a blackboard",
    color: "#98c6ff", state: "active", due: "Monday, 9 AM", day: "MON 21",
    dueDate: "2026-09-21", dueTime: "09:00",
    minutes: 30, completed: 3, total: 8,
    brief: "Connect each function to its graph and explain the changes to its shape.",
    requirements: ["Complete eight practice problems", "Show the transformations", "Explain your reasoning"],
    materials: ["Function practice.pdf"],
  },
  {
    id: "review", subject: "Biology", title: "Microscope field notes",
    image: "/assets/landing-10k/subjects/biology.webp",
    imageAlt: "Plant cells viewed under a microscope",
    color: "#66ebba", state: "review", due: "Friday, 2 PM", day: "FRI 18",
    dueDate: "2026-09-18", dueTime: "14:00",
    minutes: 15, completed: 4, total: 4,
    brief: "Check the labels and evidence in your microscope observations before preparing the submission.",
    requirements: ["Check the specimen labels", "Review the observations", "Check the required format"],
    materials: ["Observation rubric.pdf"],
  },
  {
    id: "ready", subject: "History", title: "Perspectives in history",
    image: "/assets/landing-10k/subjects/history.webp",
    imageAlt: "Historic photographs arranged in an archive",
    color: "#ffcf7c", state: "ready", due: "Friday, 5 PM", day: "FRI 18",
    dueDate: "2026-09-18", dueTime: "17:00",
    minutes: 5, completed: 3, total: 3,
    brief: "Your response is ready for the final submission check.",
    requirements: ["Confirm the destination", "Check the attached response", "Confirm submission yourself"],
    materials: ["Perspective response.pdf"],
  },
  {
    id: "submitted", subject: "Algebra", title: "Patterns & sequences",
    image: "/assets/landing-10k/subjects/math.webp",
    imageAlt: "Equations and graphs on a blackboard",
    color: "#98c6ff", state: "submitted", due: "Submitted Monday", day: "MON 14",
    dueDate: "2026-09-14",
    minutes: 20, completed: 6, total: 6,
    brief: "The completed response and submission record remain available.",
    requirements: ["Six completed problems", "Written explanations", "Submission confirmed"],
    materials: ["Completed response.pdf", "Submission receipt"],
  },
];

export function assignmentAction(item: ConceptAssignment) {
  if (item.state === "submitted") return "View submission";
  if (item.state === "ready") return "Review submission";
  if (item.state === "review") return "Review work";
  return item.completed > 0 ? "Resume" : "Start";
}
