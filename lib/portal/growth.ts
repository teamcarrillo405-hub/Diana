// Parent growth story.
//
// Parents are won by trajectory, not snapshots. This turns four weeks of
// existing signals into a short story: a gentle headline about direction and
// a few concrete facts. No streaks, no comparisons to other students, no
// alarm framing — a quieter stretch is described as a rhythm, never a lapse.

export type GrowthInputs = {
  /** task_signals kind=completed timestamps within the window. */
  completedAt: string[];
  /** Distinct ISO dates (yyyy-mm-dd) with at least one study session. */
  studyDays: string[];
  flashcardReviews: number;
  /** Assignments that reached submitted/graded in the window. */
  submittedCount: number;
  windowDays: number;
  now: Date;
};

export type GrowthStory = {
  headline: string;
  facts: string[];
};

export function growthStory(inputs: GrowthInputs): GrowthStory {
  const facts: string[] = [];
  const weeks = Math.max(1, Math.round(inputs.windowDays / 7));

  if (inputs.completedAt.length > 0) {
    facts.push(
      `Finished ${inputs.completedAt.length} piece${plural(inputs.completedAt.length)} of work in the last ${weeks} weeks.`,
    );
  }
  if (inputs.studyDays.length > 0) {
    facts.push(`Showed up to work on ${inputs.studyDays.length} different day${plural(inputs.studyDays.length)}.`);
  }
  if (inputs.submittedCount > 0) {
    facts.push(`Turned in ${inputs.submittedCount} assignment${plural(inputs.submittedCount)}.`);
  }
  if (inputs.flashcardReviews > 0) {
    facts.push(`Reviewed ${inputs.flashcardReviews} flashcard${plural(inputs.flashcardReviews)} on a memory schedule.`);
  }

  if (facts.length === 0) {
    return {
      headline: "Just getting started.",
      facts: ["The first weeks are about setting up: finished work will show here as it happens."],
    };
  }

  return { headline: headlineFor(inputs), facts };
}

/** Direction of completions: recent half of the window vs the earlier half. */
function headlineFor(inputs: GrowthInputs): string {
  const midpoint = inputs.now.getTime() - (inputs.windowDays / 2) * 24 * 60 * 60 * 1000;
  const recent = inputs.completedAt.filter((t) => new Date(t).getTime() >= midpoint).length;
  const earlier = inputs.completedAt.length - recent;

  if (recent > earlier) return "Momentum is building.";
  if (recent === earlier) return "Steady, consistent work.";
  return "A quieter stretch lately: rhythms vary, and the structure is holding.";
}

function plural(n: number): string {
  return n === 1 ? "" : "s";
}
