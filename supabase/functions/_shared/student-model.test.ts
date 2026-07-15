import { callStudentTextModel } from "./student-model.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function withEnvironment(values: Record<string, string | null>, run: () => Promise<void>) {
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, Deno.env.get(key) ?? null]),
  );
  for (const [key, value] of Object.entries(values)) {
    if (value === null) Deno.env.delete(key);
    else Deno.env.set(key, value);
  }
  return run().finally(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === null) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  });
}

Deno.test("uses the configured OpenAI provider and maps image parts", async () => {
  await withEnvironment({
    STUDENT_AI_PROVIDER: "openai",
    OPENAI_API_KEY: "test-openai-key",
  }, async () => {
    const originalFetch = globalThis.fetch;
    let requestUrl = "";
    let requestBody: Record<string, unknown> = {};
    globalThis.fetch = async (input, init) => {
      requestUrl = String(input);
      requestBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"ok":true}' } }],
        usage: { prompt_tokens: 7, completion_tokens: 3 },
      }), { status: 200 });
    };

    try {
      const result = await callStudentTextModel({
        system: "Return JSON.",
        user: "Inspect the image.",
        parts: [
          { type: "image", mediaType: "image/png", data: "aW1hZ2U=" },
          { type: "text", text: "Inspect the image." },
        ],
        maxTokens: 50,
        json: true,
      });

      assert(requestUrl === "https://api.openai.com/v1/chat/completions", "OpenAI endpoint was not used");
      const messages = requestBody.messages as Array<{ content?: unknown }>;
      const userParts = messages[1]?.content as Array<{ type?: string; image_url?: { url?: string } }>;
      assert(userParts[0]?.type === "image_url", "Image was not mapped for OpenAI");
      assert(userParts[0]?.image_url?.url?.startsWith("data:image/png;base64,"), "Image data URL is missing");
      assert(result.content === '{"ok":true}', "JSON content changed unexpectedly");
      assert(result.tokens === 10, "Token accounting is incorrect");
      assert(result.model === "gpt-4.1-nano", "Fast model routing is incorrect");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

Deno.test("falls back to OpenAI when Anthropic is preferred but not configured", async () => {
  await withEnvironment({
    STUDENT_AI_PROVIDER: "anthropic",
    ANTHROPIC_API_KEY: null,
    OPENAI_API_KEY: "test-openai-key",
  }, async () => {
    const originalFetch = globalThis.fetch;
    let requestUrl = "";
    globalThis.fetch = async (input) => {
      requestUrl = String(input);
      return new Response(JSON.stringify({
        choices: [{ message: { content: "A calm next move." } }],
        usage: { prompt_tokens: 2, completion_tokens: 2 },
      }), { status: 200 });
    };

    try {
      const result = await callStudentTextModel({
        system: "Help safely.",
        user: "I am stuck.",
        maxTokens: 40,
      });
      assert(requestUrl.includes("api.openai.com"), "Missing Anthropic key did not fall back to OpenAI");
      assert(result.content === "A calm next move.", "Fallback provider response was not returned");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

Deno.test("returns a feature fallback when the provider request does not complete", async () => {
  await withEnvironment({
    STUDENT_AI_PROVIDER: "openai",
    OPENAI_API_KEY: "test-openai-key",
  }, async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () => Promise.reject(new Error("network unavailable"));
    try {
      const result = await callStudentTextModel({
        system: "Return JSON.",
        user: "Classify this.",
        maxTokens: 40,
        json: true,
        fallbackContent: '{"confidence":0}',
      });
      assert(result.content === '{"confidence":0}', "Feature fallback was not returned");
      assert(result.model.endsWith(":fallback"), "Fallback model was not labeled");
      assert(result.tokens === 0, "Fallback should not spend tokens");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
