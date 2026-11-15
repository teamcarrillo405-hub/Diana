import { expect, test } from "@playwright/test";
import { openQaSession } from "./helpers/qa";

test.describe("live Chemistry Study Buddy", () => {
  test.skip(
    process.env.RUN_LIVE_STUDY_BUDDY !== "true",
    "Set RUN_LIVE_STUDY_BUDDY=true for the opt-in provider smoke test.",
  );

  test("answers through Supabase when Next.js has no local OpenAI key", async ({ page }) => {
    await openQaSession(page, { variant: "grayson" });

    const result = await page.evaluate(async () => {
      const response = await fetch("/api/diana/study-buddy", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-idempotency-key": "chemistry-live-provider-check",
        },
        body: JSON.stringify({
          source: [
            "Subject: Chemistry",
            "Current problem: Balance Fe + O2 -> Fe2O3.",
            "Student work: I counted one Fe atom on the left and two Fe atoms on the right.",
          ].join("\n"),
          question: "Why do I change the big number in front instead of the small number in the formula?",
          mode: "guide",
          conversation: [],
        }),
      });
      return { status: response.status, body: await response.json() };
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual(expect.objectContaining({ ok: true }));
    expect(JSON.stringify(result.body)).not.toContain("study help is unavailable");
    expect(JSON.stringify(result.body.response)).toMatch(/atom|coefficient|formula|subscript/iu);
  });
});
