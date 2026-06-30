// First-week guided journey.
//
// The wow moment of the product is imported school chaos becoming one clear
// move. New students should be walked there in four small steps instead of
// landing on an empty dashboard and having to assemble it themselves. Each
// step derives from real data — nothing to dismiss, nothing nagging: a step
// disappears by being done, and the whole card disappears when the journey
// is complete or the student is clearly past their first weeks.

export type JourneyInputs = {
  hasClassOrConnection: boolean;
  assignmentCount: number;
  /** Any started/completed signal ever — the student has touched a task. */
  hasStartedAnything: boolean;
  /** Any focus/timer session ever logged. */
  hasFocusSession: boolean;
  onboardedAt: string | null;
  now: Date;
};

export type JourneyStep = {
  key: "home" | "work-in" | "first-move" | "first-session";
  title: string;
  detail: string;
  href: string;
  done: boolean;
};

export type FirstWeekJourney = {
  steps: JourneyStep[];
  doneCount: number;
  complete: boolean;
  /** The first not-done step — the one the card spotlights. */
  active: JourneyStep | null;
  /** Whether the dashboard should show the card at all. */
  show: boolean;
};

const JOURNEY_WINDOW_DAYS = 21;

export function firstWeekJourney(inputs: JourneyInputs): FirstWeekJourney {
  const steps: JourneyStep[] = [
    {
      key: "home",
      title: "Give your work a home",
      detail: "Connect Canvas or add one class — everything you capture lands somewhere.",
      href: "/imports",
      done: inputs.hasClassOrConnection,
    },
    {
      key: "work-in",
      title: "Get your assignments in",
      detail: "Import due dates or add one assignment by hand.",
      href: "/imports",
      done: inputs.assignmentCount > 0,
    },
    {
      key: "first-move",
      title: "See your first move",
      detail: "Diana picks the one thing worth starting — open it and look around.",
      href: "/assignments",
      done: inputs.hasStartedAnything,
    },
    {
      key: "first-session",
      title: "Run one short focus session",
      detail: "Even 10 minutes counts. The timer has a calm start ritual.",
      href: "/timer",
      done: inputs.hasFocusSession,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const complete = doneCount === steps.length;
  const active = steps.find((s) => !s.done) ?? null;

  // Show while incomplete and the student is in their first weeks — or any
  // time the dashboard would otherwise be empty (the journey IS the empty
  // state's path out).
  const withinWindow =
    inputs.onboardedAt != null &&
    inputs.now.getTime() - new Date(inputs.onboardedAt).getTime() <
      JOURNEY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const show = !complete && (withinWindow || inputs.assignmentCount === 0);

  return { steps, doneCount, complete, active, show };
}
