import { describe, expect, it, vi } from "vitest";

import { dailyPushTopic, sendPushWithRetry, type PushSender } from "./delivery";

const subscription = {
  endpoint: "https://push.example.test/subscription",
  keys: { p256dh: "key", auth: "auth" },
};

describe("push delivery reliability", () => {
  it("uses a stable daily coalescing topic, short TTL, and timeout", async () => {
    const send = vi.fn<PushSender>().mockResolvedValue({ statusCode: 201 });
    const topic = dailyPushTopic(new Date("2026-07-31T13:00:00Z"));

    const result = await sendPushWithRetry({ send, subscription, payload: "{}", topic });

    expect(topic).toBe("diana-due-20260731");
    expect(result).toEqual({ ok: true, expired: false, attempts: 1, status: 201 });
    expect(send).toHaveBeenCalledWith(subscription, "{}", {
      TTL: 3600,
      timeout: 10_000,
      topic,
      urgency: "low",
    });
  });

  it("retries transient errors once and does not retry expired subscriptions", async () => {
    const transient = vi
      .fn<PushSender>()
      .mockRejectedValueOnce({ statusCode: 503 })
      .mockResolvedValueOnce({ statusCode: 201 });
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(sendPushWithRetry({
      send: transient,
      subscription,
      payload: "{}",
      topic: "diana-due-20260731",
      sleep,
    })).resolves.toEqual({ ok: true, expired: false, attempts: 2, status: 201 });
    expect(sleep).toHaveBeenCalledWith(250);

    const expired = vi.fn<PushSender>().mockRejectedValue({ statusCode: 410 });
    await expect(sendPushWithRetry({
      send: expired,
      subscription,
      payload: "{}",
      topic: "diana-due-20260731",
    })).resolves.toEqual({ ok: false, expired: true, attempts: 1, status: 410 });
    expect(expired).toHaveBeenCalledOnce();
  });
});
