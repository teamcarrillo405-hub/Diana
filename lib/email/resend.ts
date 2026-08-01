// Resend sender — Diana's only email path. Plain fetch, no SDK.
// Gated on env: absent keys mean email features stay dormant, never broken.

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

export type EmailSendResult =
  | { ok: true; status: number; attempts: number }
  | {
      ok: false;
      status: number | null;
      attempts: number;
      retryable: boolean;
      reason: "not_configured" | "invalid_recipient" | "provider_error" | "timeout";
    };

type SendEmailOptions = {
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  timeoutMs?: number;
  maxAttempts?: number;
};

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const MAX_RETRY_DELAY_MS = 2_000;

export function isSafeEmailRecipient(value: string): boolean {
  return (
    value.length <= 200 &&
    !/[\r\n,;]/u.test(value) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)
  );
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
  attachments?: readonly {
    filename: string;
    content: string;
  }[];
}, options: SendEmailOptions = {}): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    return { ok: false, status: null, attempts: 0, retryable: false, reason: "not_configured" };
  }
  if (!isSafeEmailRecipient(input.to)) {
    return { ok: false, status: null, attempts: 0, retryable: false, reason: "invalid_recipient" };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = Math.max(1, options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  const body = JSON.stringify({
    from,
    to: [input.to],
    subject: input.subject,
    html: input.html,
    text: input.text,
    ...(input.attachments?.length ? { attachments: input.attachments } : {}),
  });

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
        },
        body,
        signal: controller.signal,
      });

      if (response.ok) return { ok: true, status: response.status, attempts: attempt };

      const errorName = await providerErrorName(response);
      const retryable =
        response.status === 429 ||
        response.status >= 500 ||
        (response.status === 409 && errorName === "concurrent_idempotent_requests");
      if (!retryable || attempt === maxAttempts) {
        return {
          ok: false,
          status: response.status,
          attempts: attempt,
          retryable,
          reason: "provider_error",
        };
      }

      await sleep(retryDelayMs(response, attempt));
    } catch (error) {
      const timedOut = controller.signal.aborted || (error instanceof Error && error.name === "AbortError");
      if (attempt === maxAttempts) {
        return {
          ok: false,
          status: null,
          attempts: attempt,
          retryable: true,
          reason: timedOut ? "timeout" : "provider_error",
        };
      }
      await sleep(Math.min(250 * 2 ** (attempt - 1), MAX_RETRY_DELAY_MS));
    } finally {
      clearTimeout(timeout);
    }
  }

  return { ok: false, status: null, attempts: maxAttempts, retryable: true, reason: "provider_error" };
}

async function providerErrorName(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { name?: unknown };
    return typeof body.name === "string" ? body.name : null;
  } catch {
    return null;
  }
}

function retryDelayMs(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1_000, MAX_RETRY_DELAY_MS);
    }
  }
  return Math.min(250 * 2 ** (attempt - 1), MAX_RETRY_DELAY_MS);
}
