// Grade insight engine.
//
// Grades only help a student when they convert into one clear, doable move.
// This module turns raw submission/score data into calm, forward-looking
// insights: where each class stands, which single action lifts a grade the
// most, and what is already going well. Calm invariant applies to every
// string produced here — no shame framing, no alarm language.

export type GradeRecord = {
  externalAssignmentId: string;
  courseId: string;
  courseName: string;
  title: string;
  /** Points earned; null when not graded yet. */
  score: number | null;
  pointsPossible: number | null;
  gradedAt: string | null;
  submitted: boolean;
  /** Provider's not-turned-in flag (Canvas `missing`). */
  notTurnedIn: boolean;
  late: boolean;
  excused: boolean;
  dueAt: string | null;
};

export type CourseGradeSnapshot = {
  courseId: string;
  courseName: string;
  /** Provider-computed current score percent when available. */
  currentScorePct: number | null;
  gradedCount: number;
  notTurnedInCount: number;
  /** Direction of the last few graded items. "settling" is the calm word for a dip. */
  trend: "rising" | "steady" | "settling" | null;
};

export type RecoveryMove = {
  kind: "turn_in" | "review_feedback";
  courseName: string;
  title: string;
  /** Points this move could add back. */
  pointsAvailable: number | null;
  reason: string;
};

export type GradeInsights = {
  courses: CourseGradeSnapshot[];
  /** At most three, highest-leverage first. */
  recovery: RecoveryMove[];
  /** Things already going well — shown first. */
  wins: string[];
};

const TREND_WINDOW = 3;
const TREND_THRESHOLD_PCT = 3;
const REVIEW_THRESHOLD_PCT = 70;
const WIN_THRESHOLD_PCT = 85;
const MAX_RECOVERY_MOVES = 3;

export function gradeInsights(
  records: GradeRecord[],
  courseScores: Map<string, number | null> = new Map(),
): GradeInsights {
  const byCourse = groupByCourse(records);
  const courses: CourseGradeSnapshot[] = [];
  const wins: string[] = [];

  for (const [courseId, courseRecords] of byCourse) {
    const courseName = courseRecords[0].courseName;
    const graded = courseRecords
      .filter((r) => r.score != null && r.pointsPossible != null && r.pointsPossible > 0 && !r.excused)
      .sort(byGradedAt);

    courses.push({
      courseId,
      courseName,
      currentScorePct: courseScores.get(courseId) ?? null,
      gradedCount: graded.length,
      notTurnedInCount: courseRecords.filter((r) => r.notTurnedIn && !r.excused).length,
      trend: trendFor(graded),
    });

    const strongRecent = graded.slice(-TREND_WINDOW).filter((r) => pct(r)! >= WIN_THRESHOLD_PCT);
    if (strongRecent.length >= 2) {
      wins.push(`${strongRecent.length} strong scores in ${courseName} lately.`);
    }
  }

  courses.sort((a, b) => a.courseName.localeCompare(b.courseName));

  return { courses, recovery: recoveryMoves(records), wins };
}

/**
 * The moves that add the most points back, best first:
 * 1) work not turned in yet (full points still on the table),
 * 2) graded work under the review threshold (feedback worth a look).
 * Excused work never appears. Capped so it reads as a plan, not a pile.
 */
export function recoveryMoves(records: GradeRecord[]): RecoveryMove[] {
  const turnIns: RecoveryMove[] = records
    .filter((r) => r.notTurnedIn && !r.excused && (r.pointsPossible ?? 0) > 0)
    .sort((a, b) => (b.pointsPossible ?? 0) - (a.pointsPossible ?? 0))
    .map((r) => ({
      kind: "turn_in" as const,
      courseName: r.courseName,
      title: r.title,
      pointsAvailable: r.pointsPossible,
      reason: `Still open — turning it in puts up to ${r.pointsPossible} pts back on the table.`,
    }));

  const reviews: RecoveryMove[] = records
    .filter(
      (r) =>
        r.score != null &&
        r.pointsPossible != null &&
        r.pointsPossible > 0 &&
        !r.excused &&
        pct(r)! < REVIEW_THRESHOLD_PCT,
    )
    .sort((a, b) => (b.pointsPossible! - b.score!) - (a.pointsPossible! - a.score!))
    .map((r) => ({
      kind: "review_feedback" as const,
      courseName: r.courseName,
      title: r.title,
      pointsAvailable: r.pointsPossible! - r.score!,
      reason: `Scored ${r.score}/${r.pointsPossible} — the feedback may show a quick win if a redo or correction is allowed.`,
    }));

  return [...turnIns, ...reviews].slice(0, MAX_RECOVERY_MOVES);
}

/** Recent graded direction: last window vs the window before it. */
function trendFor(gradedAsc: GradeRecord[]): CourseGradeSnapshot["trend"] {
  if (gradedAsc.length < TREND_WINDOW * 2) return null;
  const recent = gradedAsc.slice(-TREND_WINDOW);
  const prior = gradedAsc.slice(-TREND_WINDOW * 2, -TREND_WINDOW);
  const diff = mean(recent.map((r) => pct(r)!)) - mean(prior.map((r) => pct(r)!));
  if (diff > TREND_THRESHOLD_PCT) return "rising";
  if (diff < -TREND_THRESHOLD_PCT) return "settling";
  return "steady";
}

function pct(record: GradeRecord): number | null {
  if (record.score == null || record.pointsPossible == null || record.pointsPossible <= 0) return null;
  return (record.score / record.pointsPossible) * 100;
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

function byGradedAt(a: GradeRecord, b: GradeRecord): number {
  return (a.gradedAt ?? "").localeCompare(b.gradedAt ?? "");
}

function groupByCourse(records: GradeRecord[]): Map<string, GradeRecord[]> {
  const map = new Map<string, GradeRecord[]>();
  for (const record of records) {
    const list = map.get(record.courseId);
    if (list) list.push(record);
    else map.set(record.courseId, [record]);
  }
  return map;
}
