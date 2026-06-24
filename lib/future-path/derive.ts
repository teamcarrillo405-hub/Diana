export type FuturePathInput = {
  schoolYear: number | null;
  interests: string[];
  accommodations: string[];
  proofCount: number;
  openAssignmentCount: number;
  portfolioItemCount: number;
};

export type FutureMilestone = {
  title: string;
  body: string;
  status: "now" | "soon" | "later";
};

export type FuturePathModel = {
  stageTitle: string;
  stageBody: string;
  weeklyAction: string;
  strengths: string[];
  milestones: FutureMilestone[];
  proofCount: number;
  portfolioItemCount: number;
};

export function deriveFuturePath(input: FuturePathInput): FuturePathModel {
  const stage = stageForYear(input.schoolYear);
  const strengths = deriveStrengths(input);

  return {
    stageTitle: stage.title,
    stageBody: stage.body,
    weeklyAction: weeklyActionFor(stage.gradeBand, input),
    strengths,
    milestones: milestonesFor(stage.gradeBand),
    proofCount: input.proofCount,
    portfolioItemCount: input.portfolioItemCount,
  };
}

function stageForYear(year: number | null): { gradeBand: "freshman" | "sophomore" | "junior" | "senior" | "open"; title: string; body: string } {
  if (year === 9) {
    return {
      gradeBand: "freshman",
      title: "Freshman map",
      body: "Build habits, learn what supports work, and start saving proof of effort and interests.",
    };
  }
  if (year === 10) {
    return {
      gradeBand: "sophomore",
      title: "Sophomore map",
      body: "Explore interests, notice strengths, and turn activities into real proof points.",
    };
  }
  if (year === 11) {
    return {
      gradeBand: "junior",
      title: "Junior map",
      body: "Prepare tests, essays, recommendations, and a college list without losing the daily work.",
    };
  }
  if (year === 12) {
    return {
      gradeBand: "senior",
      title: "Senior map",
      body: "Finish applications, compare options, track scholarships, and keep support needs clear.",
    };
  }
  return {
    gradeBand: "open",
    title: "Future map",
    body: "Connect schoolwork, strengths, proof, and support needs to the next step after high school.",
  };
}

function deriveStrengths(input: FuturePathInput): string[] {
  const strengths = new Set<string>();

  if (input.accommodations.includes("scribe")) strengths.add("I think better when I can talk first.");
  if (input.accommodations.includes("reader")) strengths.add("Audio and visible sources help me understand faster.");
  if (input.accommodations.includes("extended_time")) strengths.add("I do stronger work when time is planned early.");
  if (input.proofCount > 0) strengths.add("I am building evidence from real schoolwork.");
  if (input.portfolioItemCount > 0) strengths.add("I have work samples that can become essay and scholarship material.");
  if (input.interests.length > 0) strengths.add(`My interests can shape future examples: ${input.interests.slice(0, 3).join(", ")}.`);

  if (strengths.size === 0) {
    strengths.add("I can start with one small step and build from there.");
    strengths.add("I can learn my best support patterns over time.");
  }

  return [...strengths].slice(0, 5);
}

function weeklyActionFor(
  gradeBand: "freshman" | "sophomore" | "junior" | "senior" | "open",
  input: FuturePathInput,
) {
  if (input.proofCount === 0) return "Save one assignment, project, note, or teacher comment as a proof point.";
  if (gradeBand === "junior") return "Add one essay idea from a real class moment or activity.";
  if (gradeBand === "senior") return "Check one application, scholarship, or support due date.";
  if (gradeBand === "sophomore") return "Add one activity or interest you might want colleges to understand.";
  if (gradeBand === "freshman") return "Write one sentence about what helped you finish schoolwork this week.";
  return "Add one proof point that shows how you think, work, or ask for support.";
}

function milestonesFor(gradeBand: "freshman" | "sophomore" | "junior" | "senior" | "open"): FutureMilestone[] {
  const shared: FutureMilestone[] = [
    { title: "Proof folder", body: "Save work samples, comments, projects, and reflections.", status: "now" },
    { title: "Support plan", body: "Know what helps before due dates, tests, and teacher check-ins.", status: "soon" },
  ];

  if (gradeBand === "junior") {
    return [
      { title: "College list", body: "Compare programs, cost, support services, and fit.", status: "now" },
      { title: "Essay idea bank", body: "Collect stories from real schoolwork and life moments.", status: "now" },
      { title: "Recommendations", body: "Choose teachers who have seen real effort and growth.", status: "soon" },
      ...shared,
    ];
  }

  if (gradeBand === "senior") {
    return [
      { title: "Applications", body: "Track essays, recommenders, due dates, and decisions.", status: "now" },
      { title: "Scholarships", body: "Match proof points to requirements before due dates.", status: "now" },
      { title: "FAFSA and support", body: "Prepare family and disability support details.", status: "soon" },
      ...shared,
    ];
  }

  if (gradeBand === "sophomore") {
    return [
      { title: "Interests", body: "Notice which classes, clubs, and projects give energy.", status: "now" },
      { title: "Activities", body: "Start recording what you do and why it matters.", status: "soon" },
      ...shared,
      { title: "Course path", body: "Plan classes that match strengths and college options.", status: "later" },
    ];
  }

  return [
    { title: "Habits", body: "Learn what helps you start, read, write, and focus.", status: "now" },
    ...shared,
    { title: "Future options", body: "Explore college, career, trade, gap year, or undecided paths.", status: "later" },
  ];
}
