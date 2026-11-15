export type PushSubscriptionTarget = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type PushSendOptions = {
  TTL: number;
  timeout: number;
  topic: string;
  urgency: "very-low" | "low" | "normal" | "high";
};

export type PushSender = (
  subscription: PushSubscriptionTarget,
  payload: string,
  options: PushSendOptions,
) => Promise<unknown>;

export type PushDeliveryResult = {
  ok: boolean;
  expired: boolean;
  attempts: number;
  status: number | null;
};

const PUSH_TIMEOUT_MS = 10_000;
const PUSH_TTL_SECONDS = 60 * 60;

export function dailyPushTopic(now: Date): string {
  return `diana-due-${now.toISOString().slice(0, 10).replaceAll("-", "")}`;
}

export async function sendPushWithRetry(input: {
  send: PushSender;
  subscription: PushSubscriptionTarget;
  payload: string;
  topic: string;
  sleep?: (milliseconds: number) => Promise<void>;
}): Promise<PushDeliveryResult> {
  const sleep = input.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const options: PushSendOptions = {
    TTL: PUSH_TTL_SECONDS,
    timeout: PUSH_TIMEOUT_MS,
    topic: input.topic,
    urgency: "low",
  };

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await input.send(input.subscription, input.payload, options);
      return { ok: true, expired: false, attempts: attempt, status: 201 };
    } catch (error) {
      const status = statusCode(error);
      const expired = status === 404 || status === 410;
      const retryable = status === 429 || status === null || status >= 500;
      if (expired || !retryable || attempt === 2) {
        return { ok: false, expired, attempts: attempt, status };
      }
      await sleep(250);
    }
  }

  return { ok: false, expired: false, attempts: 2, status: null };
}

function statusCode(error: unknown): number | null {
  if (!error || typeof error !== "object" || !("statusCode" in error)) return null;
  const value = (error as { statusCode?: unknown }).statusCode;
  return typeof value === "number" ? value : null;
}
