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
  { slug: "F5", path: "/study", title: "Study support", summary: "Practice and guided support that keep authorship student-owned.", slice: 2, status: "live" },
  { slug: "F6", path: "/assignments", title: "Task break-down", summary: "Split a big assignment into manageable next moves.", slice: 2, status: "live" },
  { slug: "F9", path: "/calendar", title: "Calendar view", summary: "Week ahead with workload weight per day.", slice: 3, status: "live" },
  { slug: "F12", path: "/quick-add", title: "Voice capture", summary: "Capture a voice note or assignment and Diana routes it to the right place.", slice: 4, status: "live" },
  { slug: "F13", path: "/sharing", title: "Parent share", summary: "Optional weekly read-only summary, with explicit teen consent.", slice: 4, status: "live" },
  { slug: "F14", path: "/sharing", title: "Teacher snapshot", summary: "Optional one-page status for IEP/504 check-ins, student-controlled.", slice: 4, status: "live" },
  { slug: "F17", path: "/dashboard", title: "Insights", summary: "Today keeps your workload, check-in, and next move in one place.", slice: 5, status: "live" },
  { slug: "F18", path: "/quick-add", title: "Quick capture", summary: "Throw an idea at Diana from anywhere; she will route it.", slice: 5, status: "live" },
  { slug: "F19", path: "/settings?section=ai", title: "Take your data", summary: "Request your AI activity export from Settings.", slice: 6, status: "live" },
  { slug: "F22", path: "/me", title: "Strengths profile", summary: "Student-controlled learning patterns, supports, interests, and accommodations.", slice: 7, status: "live" },
  { slug: "F23", path: "/proof", title: "Record", summary: "Completed work, authorship receipts, and portfolio evidence.", slice: 7, status: "live" },
  { slug: "F26", path: "/me", title: "Accommodation coach", summary: "Student-friendly scripts for teachers, counselors, and college disability offices.", slice: 7, status: "stub" },
  { slug: "F28", path: "/proof", title: "Parent and counselor view", summary: "Student-controlled snapshots for parents, counselors, IEP teams, and mentors.", slice: 7, status: "stub" },
];
