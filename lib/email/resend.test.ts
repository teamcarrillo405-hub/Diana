import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isSafeEmailRecipient, sendEmail } from "./resend";

describe("Resend email delivery", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "resend-secret";
    process.env.RESEND_FROM = "Diana <notes@diana.test>";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM;
  });

  it("sends one recipient with a provider idempotency key and no secret in the body", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 200 }));

    const result = await sendEmail(
      {
        to: "parent@example.com",
        subject: "Weekly note",
        html: "<p>Calm update</p>",
        text: "Calm update",
        idempotencyKey: "parent-digest/2026-07-26/student-key",
      },
      { fetchImpl },
    );

    expect(result).toEqual({ ok: true, status: 200, attempts: 1 });
    const [, request] = fetchImpl.mock.calls[0];
    expect(new Headers(request?.headers).get("Idempotency-Key")).toBe(
      "parent-digest/2026-07-26/student-key",
    );
    expect(String(request?.body)).not.toContain("resend-secret");
    expect(JSON.parse(String(request?.body)).to).toEqual(["parent@example.com"]);
  });

  it("retries transient provider errors with the same request", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('{"name":"rate_limit_exceeded"}', { status: 429 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    const sleep = vi.fn().mockResolvedValue(undefined);

    const result = await sendEmail(
      { to: "parent@example.com", subject: "Note", html: "Note", text: "Note", idempotencyKey: "stable" },
      { fetchImpl, sleep },
    );

    expect(result).toEqual({ ok: true, status: 200, attempts: 2 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledOnce();
    expect(fetchImpl.mock.calls.map(([, init]) => new Headers(init?.headers).get("Idempotency-Key"))).toEqual([
      "stable",
      "stable",
    ]);
  });

  it("does not retry permanent errors or accept recipient-list injection", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 422 }));
    const sleep = vi.fn().mockResolvedValue(undefined);

    const result = await sendEmail(
      { to: "parent@example.com", subject: "Note", html: "Note", text: "Note" },
      { fetchImpl, sleep },
    );

    expect(result).toMatchObject({ ok: false, status: 422, attempts: 1, retryable: false });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
    expect(isSafeEmailRecipient("first@example.com,second@example.com")).toBe(false);
    expect(isSafeEmailRecipient("parent@example.com\r\nBcc: other@example.com")).toBe(false);
  });
});
