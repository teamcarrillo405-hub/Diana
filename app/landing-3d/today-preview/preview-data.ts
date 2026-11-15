export const subjectColors = ["#00b6ce", "#438acc", "#00d99a", "#efb53f", "#ed806a", "#3e818b"];
export const reviewSubjectColors: Readonly<Record<string, string>> = {
  History: "var(--subject-cyan, #2589ae)",
  "Algebra I": "var(--subject-mint, #00a978)",
  Biology: "var(--subject-amber, #e0a12a)",
  English: "var(--subject-coral, #dc7554)",
  "Environmental Science": "var(--subject-teal, #407e8c)",
  "Spanish Language and Culture": "var(--subject-rose, #ac6f5d)",
};

export type PreviewTask = {
  id: string;
  title: string;
  subject: string;
  color: string;
  minutes: number;
  due: string;
  date: string;
  day: string;
  ready?: boolean;
};

export type PreviewScenario = "typical" | "busy" | "new" | "complete" | "unavailable";

const tasks: PreviewTask[] = [
  { id: "history", title: "President Nixon: Three-Page Report", subject: "History", color: subjectColors[0], minutes: 25, due: "Tomorrow", date: "Sep 10", day: "10" },
  { id: "math", title: "Linear equations practice", subject: "Algebra I", color: subjectColors[1], minutes: 20, due: "Fri, Sep 11", date: "Sep 11", day: "11" },
  { id: "biology", title: "Cell structure and functions", subject: "Biology", color: subjectColors[2], minutes: 30, due: "Mon, Sep 14", date: "Sep 14", day: "14" },
  { id: "english", title: "Paragraph evidence check", subject: "English", color: subjectColors[3], minutes: 15, due: "Ready to submit", date: "Sep 10", day: "10", ready: true },
];

export function getPreviewData(scenario: PreviewScenario) {
  const fresh = scenario === "new";
  const unavailable = scenario === "unavailable";
  const allDone = scenario === "complete";
  const busy = scenario === "busy";
  const scenarioTasks = tasks.map((task, index) => busy && index === 0 ? { ...task, title: "President Nixon: research, source evaluation, and a three-page report on domestic policy" } : task);
  const planned = fresh ? [0, 0, 0, 0, 0, 0, 0] : [45, 60, 60, 45, 60, 30, 0];
  const studied = fresh || unavailable ? [0, 0, 0, 0, 0, 0, 0] : allDone ? [90, 90, 120, 0, 0, 0, 0] : [45, 55, 35, 0, 0, 0, 0];
  const subjects = fresh ? [] : [
    { name: "History", minutes: 90, color: subjectColors[0] },
    { name: "Algebra I", minutes: 75, color: subjectColors[1] },
    { name: "Biology", minutes: 75, color: subjectColors[2] },
    { name: "English", minutes: 60, color: subjectColors[3] },
    ...(busy ? [
      { name: "Environmental Science", minutes: 50, color: subjectColors[4] },
      { name: "Spanish Language and Culture", minutes: 40, color: subjectColors[5] },
    ] : []),
  ];
  return {
    total: fresh ? 0 : busy ? 12 : 8,
    finished: fresh || unavailable ? 0 : allDone ? 8 : 5,
    sessions: fresh || unavailable ? 0 : allDone ? 12 : 6,
    submitted: fresh || unavailable ? 0 : allDone ? 8 : 3,
    planned,
    studied,
    subjects,
    plan: fresh || allDone ? [] : scenarioTasks.slice(0, busy ? 3 : 2),
    deadlines: fresh || allDone ? [] : [scenarioTasks[0], scenarioTasks[3], scenarioTasks[1], ...(busy ? [scenarioTasks[2]] : [])],
    earlierWork: busy ? [{ id: "earlier-math", title: "Graphing review", subject: "Algebra I", color: subjectColors[1], minutes: 15, due: "Earlier work", date: "Sep 8", day: "08" }] satisfies PreviewTask[] : [],
    unavailable,
  };
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const remainder = minutes % 60;
  return `${Math.floor(minutes / 60)}h${remainder ? ` ${remainder}m` : ""}`;
}
