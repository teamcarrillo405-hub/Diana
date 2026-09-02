import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  log: vi.fn(),
  invoke: vi.fn(),
  createAiServiceClient: vi.fn(),
  classAiMode: "green",
  assignmentTitle: "Algebra homework",
  assignmentDescription: "Solve 3x + 5 = 20.",
  assignmentKind: "math",
  authorshipInserts: [] as unknown[],
  authorshipInsertThrows: false,
}));

vi.mock("@/lib/ai/safety", () => ({
  logInteraction: mocks.log,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => makeSupabase(),
}));

vi.mock("@/lib/supabase/ai-service", () => ({
  createAiServiceClient: mocks.createAiServiceClient,
}));

import { POST } from "./route";

function tableChain(result: unknown, options: {
  onInsert?: (value: unknown) => void;
} = {}) {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    gte: () => chain,
    order: () => chain,
    limit: () => chain,
    insert: (value: unknown) => {
      if (mocks.authorshipInsertThrows) throw new Error("authorship transport unavailable");
      options.onInsert?.(value);
      return Promise.resolve({ error: null });
    },
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

function makeSupabase() {
  const authorship = tableChain(
    { count: 0, error: null },
    { onInsert: (value) => mocks.authorshipInserts.push(value) },
  );
  const profiles = tableChain({
    data: { school_year: 9, tutor_persona: "diana", tutor_style: "socratic", tutor_complexity: "balanced" },
    error: null,
  });
  const assignments = tableChain({
    data: {
      id: "11111111-1111-4111-8111-111111111111",
      title: mocks.assignmentTitle,
      description: mocks.assignmentDescription,
      rubric_text: "Show your reasoning.",
      kind: mocks.assignmentKind,
      class_id: "22222222-2222-4222-8222-222222222222",
    },
    error: null,
  });
  const classes = tableChain({ data: { ai_mode: mocks.classAiMode }, error: null });
  const sources = tableChain({ data: [], error: null });
  const problems = tableChain({ data: [], error: null });
  const artifactBlocks = tableChain({ data: [], error: null });
  const snapshots = tableChain({ data: null, error: null });
  const taskSignals = tableChain(
    { data: [], error: null },
  );
  const courseMaterials = tableChain(
    { data: [], error: null },
  );
  const masteryConcepts = tableChain(
    { data: [], error: null },
  );
  return {
    auth: { getUser: async () => ({ data: { user: { id: "student-1" } } }) },
    from: (table: string) => {
      if (table === "profiles") return profiles;
      if (table === "assignments") return assignments;
      if (table === "classes") return classes;
      if (table === "assignment_sources") return sources;
      if (table === "assignment_problems") return problems;
      if (table === "artifact_blocks") return artifactBlocks;
      if (table === "student_state_snapshots") return snapshots;
      if (table === "task_signals") return taskSignals;
      if (table === "rubrics" || table === "class_syllabi") return courseMaterials;
      if (table === "mastery_concepts") return masteryConcepts;
      return authorship;
    },
    rpc: vi.fn(),
    functions: { invoke: mocks.invoke },
  };
}

function request() {
  return new Request("http://diana.test/api/diana/study-buddy", {
    method: "POST",
    headers: { "content-type": "application/json", "x-idempotency-key": "study-1" },
    body: JSON.stringify({ source: "A class source", question: "How do I start?", mode: "guide" }),
  });
}

const edgeEvidence = {
  verificationLevel: "ai_guidance",
  confidence: 0.65,
  validatedAnchors: [],
  verifierResult: null,
  limitations: ["The provider response was not independently tool checked."],
  escalationReason: null,
};

const availableProviderState = {
  availability: "available",
  visible: false,
  title: null,
  message: null,
  reasonCode: null,
  retryable: false,
  retryAfterSeconds: null,
  verificationLevelCap: "tool_checked",
  confidenceCap: 1,
  escalationReason: null,
};

describe("study buddy AI guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorshipInserts.length = 0;
    mocks.authorshipInsertThrows = false;
    vi.stubEnv("DIANA_OPENJARVIS_SIDECAR_ENABLED", "false");
    mocks.invoke.mockResolvedValue({
      data: {
        ok: true,
        response: {
          title: "Guided step",
          main: "Name one source detail.",
          reason: "That keeps the work yours.",
          steps: ["Point to it.", "Explain it.", "Connect it."],
          anchor: "This help is anchored to: A class source",
        },
        evidence: edgeEvidence,
        providerState: availableProviderState,
        model: "gpt-homework-test",
        tokens: 37,
      },
      error: null,
    });
    mocks.log.mockResolvedValue(undefined);
    mocks.classAiMode = "green";
    mocks.assignmentTitle = "Algebra homework";
    mocks.assignmentDescription = "Solve 3x + 5 = 20.";
    mocks.assignmentKind = "math";
    mocks.createAiServiceClient.mockReturnValue(makeSupabase());
  });

  it("routes study help through the authenticated Supabase homework function", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.invoke).toHaveBeenCalledWith("study-buddy", expect.objectContaining({
      body: expect.objectContaining({
        ownerId: "student-1",
        question: "How do I start?",
        idempotencyKey: "study-1",
      }),
    }));
    expect(mocks.log).not.toHaveBeenCalled();
    expect(await response.json()).toEqual(expect.objectContaining({
      ok: true,
      evidence: expect.objectContaining({ verificationLevel: "ai_guidance" }),
      providerState: expect.objectContaining({ availability: "available", visible: false }),
    }));
  });

  it("does not accept an Edge success without the reliability envelope", async () => {
    mocks.invoke.mockResolvedValueOnce({
      data: {
        ok: true,
        response: {
          title: "Guided step",
          main: "Name one source detail.",
          reason: "That keeps the work yours.",
          steps: ["Point to it."],
          anchor: "A class source",
        },
        model: "gpt-homework-test",
        tokens: 12,
      },
      error: null,
    });

    const response = await POST(request());
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json.ok).toBe(false);
    expect(json.response).toBeUndefined();
    expect(json.evidence).toEqual(expect.objectContaining({ verificationLevel: "needs_more_information" }));
    expect(json.providerState).toEqual(expect.objectContaining({ availability: "unavailable", visible: true }));
  });

  it("does not accept provider fallback output labeled as an Edge success", async () => {
    mocks.invoke.mockResolvedValueOnce({
      data: {
        ok: true,
        response: {
          title: "One next move",
          main: "Point to the exact sticking point.",
          reason: "That keeps the response focused.",
          steps: ["Point to it.", "Share your attempt.", "What should we inspect first?"],
          anchor: "Latest student message",
        },
        evidence: edgeEvidence,
        providerState: availableProviderState,
        model: "gpt-homework-test:fallback",
        tokens: 0,
      },
      error: null,
    });

    const response = await POST(request());
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json.ok).toBe(false);
    expect(json.response).toBeUndefined();
    expect(json.providerState).toEqual(expect.objectContaining({
      availability: "unavailable",
      visible: true,
    }));
  });

  it("does not trust source anchors supplied by the provider boundary", async () => {
    mocks.invoke.mockResolvedValueOnce({
      data: {
        ok: true,
        response: {
          title: "Source step",
          main: "Use this quoted detail.",
          reason: "It appears in the source.",
          steps: ["Read it.", "Explain it.", "Connect it."],
          anchor: "Page 99",
        },
        evidence: {
          ...edgeEvidence,
          verificationLevel: "source_checked",
          confidence: 0.9,
          validatedAnchors: [{
            sourceId: "provider-invented",
            pageLabel: "Page 99",
            startOffset: 0,
            endOffset: 10,
            exactText: "not stored",
          }],
        },
        providerState: availableProviderState,
        model: "gpt-homework-test",
        tokens: 24,
      },
      error: null,
    });

    const response = await POST(request());
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json.ok).toBe(false);
    expect(json.response).toBeUndefined();
    expect(JSON.stringify(json)).not.toContain("provider-invented");
    expect(json.providerState).toEqual(expect.objectContaining({
      availability: "unavailable",
      visible: true,
    }));
  });

  it("passes through a visible Edge degradation as an error, never a normal success", async () => {
    mocks.invoke.mockResolvedValueOnce({
      data: {
        ok: false,
        error: "Provider fallback output was rejected.",
        evidence: {
          ...edgeEvidence,
          verificationLevel: "needs_more_information",
          confidence: 0.3,
          escalationReason: "The verification provider is degraded.",
        },
        providerState: {
          ...availableProviderState,
          availability: "degraded",
          visible: true,
          title: "Verification is limited right now",
          message: "Diana can still use exact source passages or offer clearly labeled guidance, but tool checking is temporarily unavailable.",
          reasonCode: "timeout",
          retryable: true,
          verificationLevelCap: "source_checked",
          confidenceCap: 0.7,
          escalationReason: "The verification provider is degraded, so this response cannot rely on a new tool-checked result.",
        },
      },
      error: null,
    });

    const response = await POST(request());
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json.ok).toBe(false);
    expect(json.response).toBeUndefined();
    expect(json.providerState).toEqual(expect.objectContaining({
      availability: "degraded",
      visible: true,
      title: "Verification is limited right now",
    }));
  });

  it("keeps the service client for daily limits and authorship receipts", async () => {
    const service = makeSupabase();
    mocks.createAiServiceClient.mockReturnValue(service);

    await POST(request());

    expect(mocks.createAiServiceClient).toHaveBeenCalledTimes(1);
    expect(service.from("authorship_log")).toBeTruthy();
    expect(mocks.authorshipInserts).toEqual([
      expect.objectContaining({
        owner_id: "student-1",
        event_type: "study_buddy_response",
        payload: expect.objectContaining({
          evidence: expect.objectContaining({
            verificationLevel: "ai_guidance",
            providerAvailability: "available",
          }),
        }),
      }),
    ]);
  });

  it("keeps a valid tutor response when authorship logging cannot complete", async () => {
    mocks.authorshipInsertThrows = true;
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({
      ok: true,
      evidence: expect.any(Object),
      providerState: expect.any(Object),
    }));
    expect(warning).toHaveBeenCalledWith("study_buddy authorship log did not complete");
    warning.mockRestore();
  });

  it("returns a visible unavailable state when protected accounting is not configured", async () => {
    mocks.createAiServiceClient.mockReturnValue(null);

    const response = await POST(request());
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json).toEqual(expect.objectContaining({
      ok: false,
      evidence: expect.objectContaining({ verificationLevel: "needs_more_information" }),
      providerState: expect.objectContaining({
        availability: "unavailable",
        visible: true,
        title: "Verification needs another try",
      }),
    }));
  });


  it("routes algebra chat through the shared homework function", async () => {
    const response = await POST(new Request("http://diana.test/api/diana/study-buddy", {
      method: "POST",
      headers: { "content-type": "application/json", "x-idempotency-key": "study-linear-openai" },
      body: JSON.stringify({
        assignmentId: "11111111-1111-4111-8111-111111111111",
        source: "Problem: Solve 3x + 5 = 20\nStudent work: 3x=15",
        question: "3x=15 is what i get",
        mode: "guide",
      }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.invoke).toHaveBeenCalledWith("study-buddy", expect.objectContaining({
      body: expect.objectContaining({ idempotencyKey: "study-linear-openai" }),
    }));
    expect(mocks.log).not.toHaveBeenCalled();
    expect(await response.json()).toEqual(expect.objectContaining({
      evidence: expect.objectContaining({ verificationLevel: "tool_checked" }),
      providerState: expect.objectContaining({ availability: "available" }),
    }));
  });

  it("keeps algebra chat working with a deterministic fallback when the edge function is unavailable", async () => {
    mocks.invoke.mockResolvedValueOnce({ data: null, error: new Error("unavailable") });

    const response = await POST(new Request("http://diana.test/api/diana/study-buddy", {
      method: "POST",
      headers: { "content-type": "application/json", "x-idempotency-key": "study-linear" },
      body: JSON.stringify({
        assignmentId: "11111111-1111-4111-8111-111111111111",
        source: "Problem: Solve 3x + 5 = 20\nStudent work: 3x=15",
        question: "3x=15 is what i get",
        mode: "guide",
      }),
    }));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.response.main).toContain("divide both sides by 3");
    expect(JSON.stringify(json)).not.toContain("x = 4");
    expect(json.evidence).toEqual(expect.objectContaining({ verificationLevel: "tool_checked" }));
    expect(json.providerState).toEqual(expect.objectContaining({
      availability: "degraded",
      visible: true,
      title: "Verification is limited right now",
    }));
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(mocks.log).toHaveBeenCalledWith(expect.objectContaining({
      assignmentId: "11111111-1111-4111-8111-111111111111",
      model: "deterministic-linear-equation",
    }), expect.any(Object));
  });



  it("uses an availability fallback instead of saying study help is off", async () => {
    mocks.invoke.mockResolvedValueOnce({ data: null, error: new Error("unavailable") });
    mocks.assignmentTitle = "Nixon report";
    mocks.assignmentDescription = "Write a report about President Nixon.";
    mocks.assignmentKind = "essay";

    const response = await POST(new Request("http://diana.test/api/diana/study-buddy", {
      method: "POST",
      headers: { "content-type": "application/json", "x-idempotency-key": "study-unavailable" },
      body: JSON.stringify({
        assignmentId: "11111111-1111-4111-8111-111111111111",
        source: "History source notes about Nixon.",
        question: "Help me make an outline.",
        mode: "guide",
      }),
    }));

    expect(response.status).toBe(503);
    const json = await response.json();
    expect(json.error).toContain("working verification service");
    expect(json.evidence).toEqual(expect.objectContaining({ verificationLevel: "needs_more_information" }));
    expect(json.providerState).toEqual(expect.objectContaining({
      availability: "unavailable",
      visible: true,
      title: "Verification needs another try",
    }));
    expect(JSON.stringify(json)).not.toContain("off right now");
  });
  it("keeps Chemistry Study Buddy available without a local OpenAI key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    mocks.assignmentTitle = "Chemistry: balancing reactions";
    mocks.assignmentDescription = "Balance Fe + O2 -> Fe2O3 and explain atom conservation.";
    mocks.assignmentKind = "lab";

    const response = await POST(new Request("http://diana.test/api/diana/study-buddy", {
      method: "POST",
      headers: { "content-type": "application/json", "x-idempotency-key": "chemistry-1" },
      body: JSON.stringify({
        assignmentId: "11111111-1111-4111-8111-111111111111",
        source: "My atom count has 1 Fe on the left and 2 Fe on the right.",
        question: "Why can I not change the small numbers?",
        mode: "guide",
      }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.invoke).toHaveBeenCalledWith("study-buddy", expect.objectContaining({
      body: expect.objectContaining({
        assignmentId: "11111111-1111-4111-8111-111111111111",
        question: "Why can I not change the small numbers?",
        routing: expect.objectContaining({
          subjectDomain: "science",
          academicBand: "high_foundation",
        }),
      }),
    }));
  });
  it("keeps assignment chat working when the dormant class policy is yellow", async () => {
    mocks.classAiMode = "yellow";

    const response = await POST(new Request("http://diana.test/api/diana/study-buddy", {
      method: "POST",
      headers: { "content-type": "application/json", "x-idempotency-key": "study-yellow" },
      body: JSON.stringify({
        assignmentId: "11111111-1111-4111-8111-111111111111",
        source: "A class source",
        question: "How do I start?",
        mode: "guide",
      }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({ ok: true }));
  });
  it("preserves a calm safety redirect from the homework function", async () => {
    mocks.invoke.mockResolvedValueOnce({
      data: null,
      error: {
        context: new Response(JSON.stringify({
          message: "I cannot help plan harm. I can help with a safe class analysis.",
        }), { status: 422, headers: { "content-type": "application/json" } }),
      },
    });

    const response = await POST(request());

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      ok: false,
      error: "I cannot help plan harm. I can help with a safe class analysis.",
    });
  });
});
