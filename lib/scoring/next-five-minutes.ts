import type { Tables } from "@/lib/supabase/types";

export type Assignment = Pick<
  Tables<"assignments">,
  "id" | "title" | "due_at" | "status" | "estimated_minutes" | "difficulty" | "class_id"
>;

export type EnergyLevel = "low" | "medium" | "high";

export type ScoredAssignment = Assignment & {
  score: number;
  reasons: string[];
};

/**
 * Rule-based "what should I do in the next 5 minutes?" scorer.
 *
 * Inputs: assignments not yet submitted, current time, optional energy level.
 * Output: ordered by score desc with short, human reasons.
 *
 * Heuristics intentionally simple and inspectable (no ML for slice 1):
 *   - closer deadlines score higher
 *   - already-started (drafting/checking) gets a momentum bump
 *   - high energy → harder/longer tasks promoted; low energy → quick wins promoted
 *   - missing estimate gently penalized (encourage user to set one)
 */
export function rankAssignments(
  assignments: Assignment[],
  now: Date = new Date(),
  energy: EnergyLevel = "medium",
): ScoredAssignment[] {
  return assignments
    .filter((a) => a.status !== "submitted" && a.status !== "graded" && a.status !== "abandoned")
    .map((a) => score(a, now, energy))
    .sort((x, y) => y.score - x.score);
}

function score(a: Assignment, now: Date, energy: EnergyLevel): ScoredAssignment {
  let s = 0;
  const reasons: string[] = [];

  if (a.due_at) {
    const hoursUntilDue = (new Date(a.due_at).getTime() - now.getTime()) / 36e5;
    if (hoursUntilDue < 0) {
      s += 80;
      reasons.push("past due");
    } else if (hoursUntilDue < 24) {
      s += 60;
      reasons.push("due today");
    } else if (hoursUntilDue < 72) {
      s += 30;
      reasons.push(`due in ${Math.ceil(hoursUntilDue / 24)} days`);
    } else if (hoursUntilDue < 168) {
      s += 10;
      reasons.push(`due in ${Math.ceil(hoursUntilDue / 24)} days`);
    }
  }

  if (a.status === "drafting" || a.status === "checking") {
    s += 25;
    reasons.push("already started");
  }

  const est = a.estimated_minutes ?? null;
  const diff = a.difficulty ?? 3;

  if (energy === "low") {
    if (est !== null && est <= 15) {
      s += 15;
      reasons.push("quick win for low energy");
    }
    if (diff <= 2) {
      s += 8;
    }
    if (diff >= 4) {
      s -= 10;
    }
  } else if (energy === "high") {
    if (diff >= 4) {
      s += 15;
      reasons.push("good fit while focused");
    }
    if (est !== null && est >= 30) {
      s += 8;
    }
  }

  if (est === null) {
    s -= 3;
  }

  return { ...a, score: s, reasons };
}
