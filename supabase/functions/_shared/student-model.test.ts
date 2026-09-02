import { callStudentTextModel, selectHomeworkReviewQuality } from "./student-model.ts";

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
    STUDENT_AI_OPENAI_MODEL: null,
    STUDENT_AI_OPENAI_FAST_MODEL: null,
  }, async () => {
    const originalFetch = globalThis.fetch;
    let requestUrl = "";
    let requestBody: Record<string, unknown> = {};
    globalThis.fetch = async (input, init) => {
      requestUrl = String(input);
      requestBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      return new Response(JSON.stringify({
        output: [{ content: [{ type: "output_text", text: '{"ok":true}' }] }],
        usage: { input_tokens: 7, output_tokens: 3 },
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

      assert(requestUrl === "https://api.openai.com/v1/responses", "OpenAI Responses endpoint was not used");
      const input = requestBody.input as Array<{ content?: unknown }>;
      const userParts = input[0]?.content as Array<{ type?: string; image_url?: string }>;
      assert(userParts[0]?.type === "input_image", "Image was not mapped for OpenAI Responses");
      assert(userParts[0]?.image_url?.startsWith("data:image/png;base64,"), "Image data URL is missing");
      assert(result.content === '{"ok":true}', "JSON content changed unexpectedly");
      assert(result.tokens === 10, "Token accounting is incorrect");
      assert(result.model === "gpt-5.6-luna", "Fast model routing is incorrect");
      assert(requestBody.max_output_tokens === 50, "Reasoning model output limit is incorrect");
      assert((requestBody.reasoning as { effort?: string }).effort === "low", "Fast reasoning effort is incorrect");
      assert((requestBody.text as { format?: { type?: string } }).format?.type === "json_object", "JSON output format is missing");
      assert(requestBody.store === false, "Student responses should not be stored by the provider");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

Deno.test("uses OpenAI even if an old Anthropic preference is configured", async () => {
  await withEnvironment({
    STUDENT_AI_PROVIDER: "anthropic",
    ANTHROPIC_API_KEY: "legacy-anthropic-key",
    OPENAI_API_KEY: "test-openai-key",
    STUDENT_AI_OPENAI_MODEL: null,
    STUDENT_AI_OPENAI_FAST_MODEL: null,
  }, async () => {
    const originalFetch = globalThis.fetch;
    let requestUrl = "";
    globalThis.fetch = async (input) => {
      requestUrl = String(input);
      return new Response(JSON.stringify({
        output: [{ content: [{ type: "output_text", text: "A calm next move." }] }],
        usage: { input_tokens: 2, output_tokens: 2 },
      }), { status: 200 });
    };

    try {
      const result = await callStudentTextModel({
        system: "Help safely.",
        user: "I am stuck.",
        maxTokens: 40,
      });
      assert(requestUrl.includes("api.openai.com"), "Homework provider did not stay on OpenAI");
      assert(result.content === "A calm next move.", "OpenAI provider response was not returned");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

Deno.test("returns a feature fallback when the provider request does not complete", async () => {
  await withEnvironment({
    STUDENT_AI_PROVIDER: "openai",
    OPENAI_API_KEY: "test-openai-key",
    STUDENT_AI_OPENAI_MODEL: null,
    STUDENT_AI_OPENAI_FAST_MODEL: null,
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

Deno.test("routes normal and complex OpenAI work to separate documented GPT tiers", async () => {
  await withEnvironment({
    STUDENT_AI_PROVIDER: "openai",
    OPENAI_API_KEY: "test-openai-key",
    STUDENT_AI_OPENAI_MODEL: null,
    STUDENT_AI_OPENAI_QUALITY_MODEL: null,
    STUDENT_AI_OPENAI_COMPLEX_MODEL: null,
  }, async () => {
    const originalFetch = globalThis.fetch;
    const requests: Array<Record<string, unknown>> = [];
    globalThis.fetch = async (_input, init) => {
      requests.push(JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>);
      return new Response(JSON.stringify({
        output: [{ content: [{ type: "output_text", text: "One next move." }] }],
        usage: { input_tokens: 2, output_tokens: 2 },
      }), { status: 200 });
    };

    try {
      const quality = await callStudentTextModel({
        system: "Coach the student.",
        user: "Review one paragraph.",
        maxTokens: 100,
        quality: "quality",
      });
      const complex = await callStudentTextModel({
        system: "Coach the student.",
        user: "Review a source-heavy DBQ.",
        maxTokens: 200,
        quality: "complex",
      });

      assert(quality.model === "gpt-5.6-terra", "Quality work did not use the default quality model");
      assert(complex.model === "gpt-5.6-sol", "Complex work did not use the default complex model");
      assert((requests[0]?.reasoning as { effort?: string }).effort === "medium", "Quality reasoning effort is incorrect");
      assert((requests[1]?.reasoning as { effort?: string }).effort === "high", "Complex reasoning effort is incorrect");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

Deno.test("marks OpenAI provider usage before parsing a successful response", async () => {
  await withEnvironment({
    STUDENT_AI_PROVIDER: "openai",
    OPENAI_API_KEY: "test-openai-key",
    STUDENT_AI_OPENAI_MODEL: null,
    STUDENT_AI_OPENAI_FAST_MODEL: null,
  }, async () => {
    const originalFetch = globalThis.fetch;
    let marked = false;
    globalThis.fetch = async () => new Response("not-json", { status: 200 });

    try {
      let rejected = false;
      let rejectionMessage = "";
      try {
        await callStudentTextModel({
          system: "Help safely.",
          user: "A student question.",
          maxTokens: 40,
          markProviderUsage: () => {
            marked = true;
          },
        });
      } catch (error) {
        rejected = true;
        rejectionMessage = error instanceof Error ? error.message : "";
      }
      assert(rejected, "Malformed provider JSON did not reject");
      assert(marked, "Successful provider usage was not marked before parsing");
      assert(
        rejectionMessage === "student_model_invalid_response",
        "Raw provider parsing detail escaped the model adapter",
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});


Deno.test("does not mark provider usage for an unsuccessful response", async () => {
  await withEnvironment({
    STUDENT_AI_PROVIDER: "openai",
    OPENAI_API_KEY: "test-openai-key",
    STUDENT_AI_OPENAI_MODEL: null,
    STUDENT_AI_OPENAI_FAST_MODEL: null,
  }, async () => {
    const originalFetch = globalThis.fetch;
    let marked = false;
    globalThis.fetch = async () => new Response("provider unavailable", { status: 503 });

    try {
      const result = await callStudentTextModel({
        system: "Help safely.",
        user: "A student question.",
        maxTokens: 40,
        markProviderUsage: () => {
          marked = true;
        },
      });
      assert(result.model.endsWith(":fallback"), "Provider failure did not return fallback content");
      assert(!marked, "Unsuccessful provider usage was marked as consumed");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

Deno.test("escalates advanced and source-heavy homework reviews", () => {
  assert(selectHomeworkReviewQuality({
    template: "writing",
    subjectDomain: "english_language_arts",
    sourceChars: 500,
    studentWorkChars: 700,
    hasRubric: false,
  }) === "quality", "A routine writing review should use the quality tier");

  assert(selectHomeworkReviewQuality({
    template: "history",
    subjectDomain: "social_studies",
    sourceChars: 500,
    studentWorkChars: 700,
    hasRubric: false,
  }) === "complex", "A DBQ review should use the complex tier");

  assert(selectHomeworkReviewQuality({
    template: "math",
    subjectDomain: "mathematics",
    sourceChars: 500,
    studentWorkChars: 700,
    hasRubric: false,
    signals: "Evaluate this calculus integral.",
  }) === "complex", "Advanced math should use the complex tier");

  assert(selectHomeworkReviewQuality({
    template: "writing",
    subjectDomain: "english_language_arts",
    sourceChars: 3_500,
    studentWorkChars: 1_500,
    hasRubric: true,
  }) === "complex", "A source-heavy rubric review should use the complex tier");

  assert(selectHomeworkReviewQuality({
    template: "lab",
    subjectDomain: "science",
    sourceChars: 1_000,
    studentWorkChars: 700,
    hasRubric: false,
    signals: "Interpret a college biometrics regression model.",
  }) === "complex", "Advanced biometrics should use the complex tier");
});
