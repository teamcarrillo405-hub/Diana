import type { LobbyCheckInValue } from "@/lib/dashboard/lobby-check-in";
import type { LobbyDashboardView } from "@/lib/dashboard/lobby-view";

export type TodayVoicePhase =
  | "idle"
  | "requesting_permission"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "confirming"
  | "reconnecting"
  | "retryable_error"
  | "stopped";

export type TodayVoiceToolName =
  | "get_today_summary"
  | "list_assignments"
  | "list_calendar"
  | "get_weather"
  | "search_current_information"
  | "answer_complex_question"
  | "open_destination"
  | "start_focus_session"
  | "create_quick_capture"
  | "confirm_action";

export type TodayVoiceToolCall = Readonly<{
  callId: string;
  name: TodayVoiceToolName;
  arguments: Record<string, unknown>;
}>;

export type TodayVoiceToolResult = Readonly<{
  ok: boolean;
  message: string;
  data?: unknown;
  confirmation?: TodayConfirmedAction;
}>;

export type TodayConfirmedAction = Readonly<{
  token: string;
  action: "open_destination" | "start_focus_session" | "create_quick_capture";
  title: string;
  detail: string;
  expiresAt: number;
}>;

export type TodayVoiceFeedback = Readonly<{
  id: string;
  kind: "heard" | "completed" | "error";
  message: string;
  persistent?: boolean;
}>;

export function todayVoiceFeedbackDuration(
  feedback: TodayVoiceFeedback | null,
): number | null {
  if (!feedback || feedback.persistent) return null;
  return 4_000;
}

export type TodayOrbVisualState = Readonly<{
  phase: TodayVoicePhase;
  inputLevel: number;
  outputLevel: number;
  reducedMotion: boolean;
}>;

export type TodayDashboardVisualModel = Readonly<{
  attentionTotal: number;
  readiness: Readonly<{
    energy: number;
    sleep: number;
    movement: number;
    checkedIn: boolean;
  }>;
}>;

const ENERGY_LEVEL = { low: 0.32, okay: 0.62, good: 0.9 } as const;
const MOVEMENT_TYPE_LEVEL = {
  walk: 0.5,
  run: 0.75,
  bike: 0.65,
  team_sport: 0.8,
  strength: 0.7,
  stretch: 0.45,
  dance: 0.7,
  other: 0.55,
} as const;

export function buildTodayDashboardVisualModel(
  view: Pick<LobbyDashboardView, "attention">,
  checkIn: LobbyCheckInValue | null,
): TodayDashboardVisualModel {
  return {
    attentionTotal: view.attention
      .filter((category) => category.key !== "feedback")
      .reduce((total, category) => total + Math.max(0, category.count), 0),
    readiness: checkIn
      ? {
          energy: ENERGY_LEVEL[checkIn.energy],
          sleep: checkIn.sleepHours / 12,
          movement: Math.min(1, checkIn.movementMinutes / 60) * MOVEMENT_TYPE_LEVEL[checkIn.movementType],
          checkedIn: true,
        }
      : { energy: 0.46, sleep: 0.46, movement: 0.46, checkedIn: false },
  };
}

export function todayVoicePhaseLabel(phase: TodayVoicePhase): string {
  switch (phase) {
    case "requesting_permission":
      return "Allow microphone";
    case "connecting":
      return "Connecting";
    case "listening":
      return "Listening";
    case "thinking":
      return "Thinking";
    case "speaking":
      return "Speaking";
    case "confirming":
      return "Confirm";
    case "reconnecting":
      return "Reconnecting";
    case "retryable_error":
      return "Retry";
    case "stopped":
      return "Stopped";
    default:
      return "Ready";
  }
}

export function isTodayVoiceToolName(value: unknown): value is TodayVoiceToolName {
  return typeof value === "string" && new Set<TodayVoiceToolName>([
    "get_today_summary",
    "list_assignments",
    "list_calendar",
    "get_weather",
    "search_current_information",
    "answer_complex_question",
    "open_destination",
    "start_focus_session",
    "create_quick_capture",
    "confirm_action",
  ]).has(value as TodayVoiceToolName);
}
