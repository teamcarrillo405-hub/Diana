export type StudentModelQuality = "fast" | "quality" | "complex";

export type HomeworkReviewRoutingInput = {
  template: string;
  subjectDomain?: string | null;
  sourceChars: number;
  studentWorkChars: number;
  hasRubric: boolean;
  signals?: string;
};

export type StudentModelPart =
  | { type: "text"; text: string }
  | { type: "image"; mediaType: string; data: string };

export type StudentModelResult = {
  content: string;
  moderationContent?: string;
  model: string;
  tokens: number;
};

const FAST_TIMEOUT_MS = 12_000;
const QUALITY_TIMEOUT_MS = 20_000;
const COMPLEX_TIMEOUT_MS = 35_000;

const OPENAI_DEFAULT_MODELS: Record<StudentModelQuality, string> = {
  fast: "gpt-5.6-luna",
  quality: "gpt-5.6-terra",
  complex: "gpt-5.6-sol",
};

const OPENAI_REASONING_EFFORT: Record<StudentModelQuality, "low" | "medium" | "high"> = {
  fast: "low",
  quality: "medium",
  complex: "high",
};

const COMPLEX_REVIEW_TEMPLATES = new Set(["research", "history", "lab", "coding", "project"]);
const COMPLEX_SUBJECT_DOMAINS = new Set([
  "computer_science",
  "accounting",
  "economics",
  "engineering",
  "trade_cte",
  "cad",
  "advanced_technical_labs",
]);
const ADVANCED_PROBLEM_PATTERN =
  /\b(calculus|derivative|integral|limit|trigonometry|logarithm|matrix|vectors?|proof|theorem|statistical inference|regression|probability distribution|stoichiometry|thermodynamics|kinematics|electromagnetism|organic chemistry|algorithm|data structure|recursion|debug|dbq|document[- ]based|primary sources?|research synthesis)\b/iu;

export function selectHomeworkReviewQuality(input: HomeworkReviewRoutingInput): StudentModelQuality {
  if (COMPLEX_REVIEW_TEMPLATES.has(input.template)) return "complex";
  if (input.subjectDomain && COMPLEX_SUBJECT_DOMAINS.has(input.subjectDomain)) return "complex";
  if (ADVANCED_PROBLEM_PATTERN.test(input.signals ?? "")) return "complex";
  if (input.sourceChars >= 10_000 || input.studentWorkChars >= 6_000) return "complex";
  if (input.hasRubric && input.sourceChars >= 3_000 && input.studentWorkChars >= 1_200) return "complex";
  return "quality";
}

export async function callStudentTextModel({
  system,
  user,
  maxTokens,
  quality = "fast",
  json = false,
  parts,
  fallbackContent,
  timeoutMs,
  markProviderUsage,
}: {
  system: string;
  user: string;
  maxTokens: number;
  quality?: StudentModelQuality;
  json?: boolean;
  parts?: StudentModelPart[];
  fallbackContent?: string;
  timeoutMs?: number;
  markProviderUsage?: () => void;
}): Promise<StudentModelResult> {
  const requestTimeoutMs = timeoutMs ??
    (quality === "complex" ? COMPLEX_TIMEOUT_MS : quality === "quality" ? QUALITY_TIMEOUT_MS : FAST_TIMEOUT_MS);
  const preferredProvider = (Deno.env.get("STUDENT_AI_PROVIDER") ?? "openai").toLowerCase();
  if (preferredProvider !== "anthropic") {
    return callOpenAiStudentModel({
      system,
      user,
      maxTokens,
      quality,
      json,
      parts,
      fallbackContent,
      timeoutMs: requestTimeoutMs,
      markProviderUsage,
    });
  }

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  if (anthropicKey) {
    const anthropicModel = quality === "fast" ? "claude-haiku-4-5" : "claude-sonnet-4-6";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    let anthropicRes: Response | null = null;
    try {
      anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: anthropicModel,
          max_tokens: maxTokens,
          system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: parts ? toAnthropicParts(parts) : user }],
        }),
      });
    } catch (error) {
      console.error("student model Anthropic request did not complete", {
        errorName: error instanceof Error ? error.name : "unknown",
      });
    } finally {
      clearTimeout(timeout);
    }

    if (anthropicRes?.ok) {
      markProviderUsage?.();
      let data: {
        content?: Array<{ type: string; text: string }>;
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      try {
        data = await anthropicRes.json() as typeof data;
      } catch {
        throw new Error("student_model_invalid_response");
      }
      const providerContent = data.content?.[0]?.text ?? "";
      const content = sanitizeStudentModelContent(providerContent);
      return {
        content: json ? normalizeJsonContent(content, user, fallbackContent) : content,
        moderationContent: providerContent,
        model: anthropicModel,
        tokens: Number(data.usage?.input_tokens ?? 0) + Number(data.usage?.output_tokens ?? 0),
      };
    }

    if (anthropicRes) {
      const providerError = await anthropicRes.text();
      console.error("student model Anthropic response did not complete", {
        status: anthropicRes.status,
        responseBytes: new TextEncoder().encode(providerError).byteLength,
        correlationId: anthropicRes.headers.get("request-id") ?? "unavailable",
      });
    }
  }

  return callOpenAiStudentModel({
    system,
    user,
    maxTokens,
    quality,
    json,
    parts,
    fallbackContent,
    timeoutMs: requestTimeoutMs,
    markProviderUsage,
  });
}

async function callOpenAiStudentModel({
  system,
  user,
  maxTokens,
  quality = "fast",
  json = false,
  parts,
  fallbackContent,
  timeoutMs,
  markProviderUsage,
}: {
  system: string;
  user: string;
  maxTokens: number;
  quality?: StudentModelQuality;
  json?: boolean;
  parts?: StudentModelPart[];
  fallbackContent?: string;
  timeoutMs: number;
  markProviderUsage?: () => void;
}): Promise<StudentModelResult> {
  const openAiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  if (!openAiKey) throw new Error("No configured student AI provider.");

  const tierOverride = Deno.env.get(`STUDENT_AI_OPENAI_${quality.toUpperCase()}_MODEL`);
  const openAiModel = tierOverride ?? Deno.env.get("STUDENT_AI_OPENAI_MODEL") ?? OPENAI_DEFAULT_MODELS[quality];
  const usesReasoningParameters = /^gpt-5(?:\.|$)/iu.test(openAiModel);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let openAiRes: Response;
  try {
    openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: openAiModel,
        ...(usesReasoningParameters
          ? {
              max_completion_tokens: maxTokens,
              reasoning_effort: OPENAI_REASONING_EFFORT[quality],
            }
          : { max_tokens: maxTokens }),
        ...(json ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: system },
          { role: "user", content: parts ? toOpenAiParts(parts) : user },
        ],
      }),
    });
  } catch (error) {
    console.error("student model OpenAI request did not complete", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    const fallback = fallbackStudentContent(user, json, fallbackContent);
    return {
      content: fallback,
      moderationContent: fallback,
      model: `${openAiModel}:fallback`,
      tokens: 0,
    };
  } finally {
    clearTimeout(timeout);
  }

  if (!openAiRes.ok) {
    const providerError = await openAiRes.text();
    console.error("student model OpenAI response did not complete", {
      status: openAiRes.status,
      responseBytes: new TextEncoder().encode(providerError).byteLength,
      correlationId: openAiRes.headers.get("x-request-id") ?? "unavailable",
    });
    const fallback = fallbackStudentContent(user, json, fallbackContent);
    return {
      content: fallback,
      moderationContent: fallback,
      model: `${openAiModel}:fallback`,
      tokens: 0,
    };
  }

  markProviderUsage?.();
  let data: {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  try {
    data = await openAiRes.json() as typeof data;
  } catch {
    throw new Error("student_model_invalid_response");
  }

  const providerContent = data.choices?.[0]?.message?.content ?? "";
  const content = sanitizeStudentModelContent(providerContent);
  return {
    content: json ? normalizeJsonContent(content, user, fallbackContent) : content,
    moderationContent: providerContent,
    model: openAiModel,
    tokens: Number(data.usage?.prompt_tokens ?? 0) + Number(data.usage?.completion_tokens ?? 0),
  };
}

function normalizeJsonContent(content: string, user: string, fallbackContent?: string): string {
  const trimmed = content.trim();
  if (isJsonObject(trimmed)) return trimmed;

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const candidate = trimmed.slice(start, end + 1);
    if (isJsonObject(candidate)) return candidate;
  }

  return fallbackStudentContent(user, true, fallbackContent);
}

function isJsonObject(value: string): boolean {
  try {
    const parsed = JSON.parse(value);
    return parsed != null && typeof parsed === "object" && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

function fallbackStudentContent(user: string, json: boolean, fallbackContent?: string): string {
  if (fallbackContent) return fallbackContent;
  if (!json) {
    return [
      "One useful next move: name the exact part of the prompt you are working on.",
      "Then write one short attempt in your own words.",
      "Want to try rewriting yours?",
    ].join(" ");
  }

  const source = user.replace(/\s+/g, " ").slice(0, 180);
  return JSON.stringify({
    title: "Next move scaffold",
    extractedProblem: source,
    latex: null,
    subject: "algebra",
    steps: [
      {
        id: "start",
        label: "Name the ask",
        prompt: "Write what the problem or prompt is asking you to do.",
        unitHint: null,
        studentCheck: "Can you point to the source line that tells you this?",
      },
      {
        id: "evidence",
        label: "Use the source",
        prompt: "Pick one detail, number, quote, term, or line from the source.",
        unitHint: null,
        studentCheck: "Keep that detail visible before writing the next line.",
      },
    ],
    commonError: "A common mix-up is moving to the final answer before naming the source detail. Check the prompt first.",
    unitTracker: [],
    graphSketch: {
      prompt: "If this has a graph, mark the axes and one known point before sketching.",
      xBehavior: "Use the prompt to decide what x represents.",
      yBehavior: "Use the prompt to decide what y represents.",
    },
    cards: [
      {
        label: "First move",
        prompt: "Name the task, then choose one source detail to use.",
        sentenceFrame: "The prompt is asking me to __.",
        evidenceHint: "Use the assignment prompt, source, or class note.",
        exampleFrame: "The source shows __, so my next step is __.",
        studentAction: "Write one short attempt before asking for more help.",
      },
    ],
    formulaContext: [],
    mermaid: null,
    causeEffect: [],
    happ: [],
    dbqOutline: [],
    comparison: [],
    currentConnections: [
      {
        then: "Name the historical example.",
        now: "Name the current example.",
        bridgeQuestion: "What is similar, and what is different?",
      },
    ],
    targetLanguage: "Spanish",
    vocabularyCards: [
      {
        term: "source word",
        meaning: "Use the class list or passage to define it.",
        cognateHint: null,
        interestSentence: "Build one sentence connected to your class topic.",
        pronunciation: null,
      },
    ],
    conjugationRows: [],
    readingQuestions: [
      {
        questionEnglish: "What does the source say directly?",
        answerFrameTarget: "La fuente dice __.",
      },
    ],
    speakingPrompts: [
      {
        label: "Private practice",
        feedbackPrompt: "Say one short line, then mark the word that needs another pass.",
        practiceLine: null,
      },
    ],
    writingSuggestions: [
      {
        label: "Own words",
        prompt: "Write one sentence yourself, then check it against the prompt.",
        exampleFrame: null,
      },
    ],
    cultureCards: [],
    pseudocodeSteps: [
      "Name the input.",
      "Name the action.",
      "Name the output.",
    ],
    reviewQuestions: [
      "What should happen first?",
      "What is the smallest thing you can test?",
    ],
    debugLog: [
      {
        label: "Observed",
        prompt: "Write what happened and which line or step you checked.",
      },
    ],
    milestones: [
      {
        label: "First checkpoint",
        goal: "Create a small working piece.",
        check: "Test one part before adding more.",
      },
    ],
    outline: [
      {
        label: "Set up",
        prompt: "Choose the claim, source detail, formula, or first step.",
        evidence: "Use the assignment source.",
      },
    ],
    questions: [
      {
        stem: "Which source detail should you use first?",
        bestChoice: "A",
        skill: "Source anchoring",
        choices: [
          { label: "A", text: "A detail from the prompt or source", explanation: "Best fit because it keeps the work anchored." },
          { label: "B", text: "A guess without the source", explanation: "Less supported because it skips the evidence." },
        ],
      },
    ],
    plan: ["Name the task", "Choose one source detail", "Try one short response"],
    checklist: ["Prompt checked", "Source detail chosen", "One student attempt written"],
    prompts: ["What is the prompt asking you to do first?"],
    checkPrompt: "What is one source detail you can use before the next step?",
  });
}

function toAnthropicParts(parts: StudentModelPart[]) {
  return parts.map((part) => part.type === "text"
    ? { type: "text", text: part.text }
    : {
      type: "image",
      source: {
        type: "base64",
        media_type: part.mediaType,
        data: part.data,
      },
    });
}

function toOpenAiParts(parts: StudentModelPart[]) {
  return parts.map((part) => part.type === "text"
    ? { type: "text", text: part.text }
    : {
      type: "image_url",
      image_url: { url: `data:${part.mediaType};base64,${part.data}`, detail: "high" },
    });
}

function sanitizeStudentModelContent(content: string): string {
  return content
    .replace(/\bwrong\b/gi, "less supported")
    .replace(/\bincorrect\b/gi, "not supported")
    .replace(/\bfailed\b/gi, "did not land")
    .replace(/\byou missed\b/gi, "add this part")
    .replace(/\bbehind\b/gi, "needs attention");
}
