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
  { slug: "F3", path: "/dashboard", title: "Next 5 minutes", summary: "One task on screen at a time, ranked by due date, momentum, and energy.", slice: 1, status: "live" },
  { slug: "F4", path: "/focus", title: "Focus timer", summary: "Pomodoro-style sessions with single-task lock and a soft end signal.", slice: 2, status: "live" },
  { slug: "F5", path: "/study-buddy", title: "Study buddy chat", summary: "Socratic Q&A that keeps authorship student-owned.", slice: 2, status: "live" },
  { slug: "F6", path: "/break-down", title: "Task break-down", summary: "Split a big assignment into five-minute pieces.", slice: 2, status: "live" },
  { slug: "F7", path: "/reminders", title: "Smart reminders", summary: "Quiet hours and calm due-date pickup for open work.", slice: 3, status: "live" },
  { slug: "F8", path: "/wins", title: "Wins feed", summary: "A small private log of completed work.", slice: 3, status: "live" },
  { slug: "F9", path: "/calendar", title: "Calendar view", summary: "Week ahead with workload weight per day.", slice: 3, status: "live" },
  { slug: "F10", path: "/recap", title: "Daily recap", summary: "End-of-day 60-second wrap: what moved and what opens next.", slice: 3, status: "live" },
  { slug: "F11", path: "/shame-mode", title: "Reset mode", summary: "Reframes open work as one calm academic move.", slice: 4, status: "live" },
  { slug: "F12", path: "/voice", title: "Voice capture", summary: "Talk through a task; Diana turns it into a checklist.", slice: 4, status: "live" },
  { slug: "F13", path: "/parent-share", title: "Parent share", summary: "Optional weekly read-only summary, with explicit teen consent.", slice: 4, status: "live" },
  { slug: "F14", path: "/teacher-share", title: "Teacher snapshot", summary: "Optional one-page status for IEP/504 check-ins, student-controlled.", slice: 4, status: "live" },
  { slug: "F15", path: "/imports", title: "Calendar imports", summary: "Pull due dates from Google Classroom, Canvas, or .ics feeds.", slice: 5, status: "live" },
  { slug: "F16", path: "/templates", title: "Assignment templates", summary: "Reusable structures for lab reports, essays, problem sets.", slice: 5, status: "live" },
  { slug: "F17", path: "/insights", title: "Insights", summary: "Patterns in your week: focus windows, open loops, and study signals.", slice: 5, status: "live" },
  { slug: "F18", path: "/quick-add", title: "Quick capture", summary: "Throw an idea at Diana from anywhere; she will route it.", slice: 5, status: "live" },
  { slug: "F19", path: "/export", title: "Take your data", summary: "One-click JSON export and account deletion.", slice: 6, status: "live" },
  { slug: "F20", path: "/accessibility", title: "Accessibility profile", summary: "Font size, contrast, motion, dyslexia-friendly typeface, and reading ruler.", slice: 6, status: "live" },
  { slug: "F21", path: "/future-path", title: "Future Path", summary: "Grade-based college and career map connected to daily schoolwork and proof.", slice: 7, status: "live" },
  { slug: "F22", path: "/me", title: "Strengths profile", summary: "Student-controlled learning patterns, supports, interests, and accommodations.", slice: 7, status: "live" },
  { slug: "F23", path: "/proof", title: "Proof Folder", summary: "Authorship receipts, source-backed work, wins, and portfolio evidence.", slice: 7, status: "live" },
  { slug: "F24", path: "/future-path", title: "Essay Builder", summary: "College essay support that starts from student thoughts before structure or checks.", slice: 7, status: "stub" },
  { slug: "F25", path: "/future-path", title: "Scholarship tracker", summary: "Deadlines, requirements, essays, recommendations, and status.", slice: 7, status: "stub" },
  { slug: "F26", path: "/me", title: "Accommodation coach", summary: "Student-friendly scripts for teachers, counselors, and college disability offices.", slice: 7, status: "stub" },
  { slug: "F27", path: "/future-path", title: "College fit finder", summary: "Compare colleges by cost, support, location, programs, class size, and resources.", slice: 7, status: "stub" },
  { slug: "F28", path: "/proof", title: "Parent and counselor view", summary: "Student-controlled snapshots for parents, counselors, IEP teams, and mentors.", slice: 7, status: "stub" },
];
