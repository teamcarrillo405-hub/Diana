export type FeatureMeta = {
  slug: string;
  path: `/${string}`;
  title: string;
  summary: string;
  slice: number;
  status: "live" | "stub";
};

export const FEATURES: FeatureMeta[] = [
  { slug: "F1", path: "/classes", title: "Classes & rubrics", summary: "Add classes and paste rubrics that drive submission checklists.", slice: 1, status: "live" },
  { slug: "F2", path: "/assignments", title: "Submission helper", summary: "A state machine that walks you from blank page to clicking submit, with a pre-submit checklist.", slice: 1, status: "live" },
  { slug: "F3", path: "/dashboard", title: "Next 5 minutes", summary: "One task on screen at a time, ranked by deadline, momentum, and energy.", slice: 1, status: "live" },
  { slug: "F4", path: "/focus", title: "Focus timer", summary: "Pomodoro-style sessions with single-task lock and a soft end signal.", slice: 2, status: "stub" },
  { slug: "F5", path: "/study-buddy", title: "Study buddy chat", summary: "Socratic Q&A that won't write your essay. Rubric-aware.", slice: 2, status: "stub" },
  { slug: "F6", path: "/break-down", title: "Task break-down", summary: "Split a scary assignment into 15-minute pieces.", slice: 2, status: "stub" },
  { slug: "F7", path: "/reminders", title: "Smart reminders", summary: "Quiet hours, no-weekend rule, escalating only when truly overdue.", slice: 3, status: "stub" },
  { slug: "F8", path: "/wins", title: "Wins feed", summary: "A small log of completed work — the dopamine receipt.", slice: 3, status: "stub" },
  { slug: "F9", path: "/calendar", title: "Calendar view", summary: "Week ahead with workload weight per day.", slice: 3, status: "stub" },
  { slug: "F10", path: "/recap", title: "Daily recap", summary: "End-of-day 60-second wrap: what you did, what's left.", slice: 3, status: "stub" },
  { slug: "F11", path: "/shame-mode", title: "Anti-shame mode", summary: "Reframes overdue tasks without piling on. No red, no exclamation marks.", slice: 4, status: "stub" },
  { slug: "F12", path: "/voice", title: "Voice capture", summary: "Talk through a task; Diana turns it into a checklist.", slice: 4, status: "stub" },
  { slug: "F13", path: "/parent-share", title: "Parent share", summary: "Optional weekly read-only summary, with explicit teen consent.", slice: 4, status: "stub" },
  { slug: "F14", path: "/teacher-share", title: "Teacher snapshot", summary: "Optional one-page status for IEP/504 check-ins, student-controlled.", slice: 4, status: "stub" },
  { slug: "F15", path: "/imports", title: "Calendar imports", summary: "Pull due dates from Google Classroom / Canvas / .ics feeds.", slice: 5, status: "stub" },
  { slug: "F16", path: "/templates", title: "Assignment templates", summary: "Reusable structures for lab reports, essays, problem sets.", slice: 5, status: "stub" },
  { slug: "F17", path: "/insights", title: "Insights", summary: "Patterns in your week (when you focus best, where you stall).", slice: 5, status: "stub" },
  { slug: "F18", path: "/quick-add", title: "Quick capture", summary: "Throw an idea at Diana from anywhere; she'll route it.", slice: 5, status: "stub" },
  { slug: "F19", path: "/export", title: "Take your data", summary: "One-click JSON export, account deletion.", slice: 6, status: "stub" },
  { slug: "F20", path: "/accessibility", title: "Accessibility profile", summary: "Font size, contrast, motion, dyslexia-friendly typeface, reading-ruler.", slice: 6, status: "stub" },
];
