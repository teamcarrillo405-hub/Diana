"use client";

import { BookOpen, ChevronDown, Loader2, MoreHorizontal, Send, Sparkles } from "lucide-react";
import { useState } from "react";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { isRefusalNeeded } from "@/lib/ai/refuse-redirect";

type Mode = "guide" | "hint" | "quiz";

type DianaResponse = {
  title: string;
  main: string;
  reason: string;
  steps: string[];
  anchor: string;
};

type ChatMessage =
  | { id: string; role: "student"; text: string }
  | { id: string; role: "coach"; response: DianaResponse };

const MODES: Array<{ id: Mode; label: string }> = [
  { id: "guide", label: "Guide me" },
  { id: "hint", label: "Hint ladder" },
  { id: "quiz", label: "Quiz me" },
];

const BOUNDARY_RESPONSE: DianaResponse = {
  title: "Help boundary",
  main: "I can help you build the next part, but the final work stays yours.",
  reason: "That protects authorship and keeps the learning move visible.",
  anchor: "",
  steps: [
    "Name the part you want to create first.",
    "Draft one rough sentence or setup line.",
    "Ask Diana to check structure, evidence, or reasoning.",
  ],
};

export function StudyBuddyClient({
  initialSource,
  initialQuestion,
  initialMode = "guide",
  tutorName = "Coach Diana",
  tutorStyle = "socratic",
  complexity = "balanced",
  classId,
  qaScenario,
}: {
  initialSource?: string;
  initialQuestion?: string;
  initialMode?: Mode;
  tutorName?: string;
  tutorStyle?: "socratic" | "supportive" | "direct";
  complexity?: "simple" | "balanced" | "advanced";
  classId?: string;
  qaScenario?: string;
} = {}) {
  const [source, setSource] = useState(
    initialSource?.trim() || "Rubric: use one quote, explain the evidence, and connect it to the claim.",
  );
  const [question, setQuestion] = useState(
    initialQuestion?.trim() || "I have evidence but do not know how to start the paragraph.",
  );
  const [mode, setMode] = useState<Mode>(initialMode);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function appendResponse(response: DianaResponse) {
    setMessages((current) => [
      ...current,
      { id: `coach-${Date.now()}-${current.length}`, role: "coach", response },
    ]);
  }

  async function handleAsk() {
    const studentQuestion = question.trim();
    if (studentQuestion.length < 2) return;

    setMessages((current) => [
      ...current,
      { id: `student-${Date.now()}-${current.length}`, role: "student", text: studentQuestion },
    ]);
    setQuestion("");
    setError(null);

    if (isRefusalNeeded(studentQuestion)) {
      appendResponse(BOUNDARY_RESPONSE);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/diana/study-buddy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source, question: studentQuestion, mode, classId, qaScenario }),
      });
      const data = (await res.json()) as { ok: boolean; response?: DianaResponse; error?: string };
      if (!data.ok || !data.response) {
        setError(data.error ?? "Diana study help is unavailable right now.");
      } else {
        appendResponse(data.response);
      }
    } catch {
      setError("Could not reach Diana. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenDesignViewport className="sd-tutor-chat" aria-label="Tutor chat">
      <header className="sd-tutor-chat-header">
        <DianaWordmark />
        <div>
          <strong>{tutorName}</strong>
          <span><i aria-hidden="true" /> Active now</span>
        </div>
        <button type="button" aria-label="More tutor options"><MoreHorizontal size={19} aria-hidden="true" /></button>
      </header>

      <main className="sd-tutor-chat-feed" aria-live="polite">
        <details className="sd-tutor-source">
          <summary><BookOpen size={14} aria-hidden="true" /> Source context <ChevronDown size={14} aria-hidden="true" /></summary>
          <textarea aria-label="Source or class material" value={source} onChange={(event) => setSource(event.target.value)} />
        </details>

        <article className="sd-tutor-bubble sd-tutor-bubble-coach">
          <span>{tutorName}</span>
          <p>What are you working through? Share where you feel stuck, and we will find the next move together.</p>
        </article>

        {messages.map((message) => message.role === "student" ? (
          <article key={message.id} className="sd-tutor-bubble sd-tutor-bubble-student">
            <span>You</span>
            <p>{message.text}</p>
          </article>
        ) : (
          <article key={message.id} className="sd-tutor-bubble sd-tutor-bubble-coach">
            <span>{message.response.title}</span>
            <p>{message.response.main}</p>
            <small>{message.response.reason}</small>
            {message.response.steps.length > 0 ? (
              <ol>{message.response.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            ) : null}
            {message.response.anchor ? <small>{message.response.anchor}</small> : null}
          </article>
        ))}

        {loading ? (
          <div className="sd-tutor-thinking"><Loader2 size={15} className="animate-spin" aria-hidden="true" /> {tutorName} is thinking...</div>
        ) : null}
        {error ? <p className="sd-tutor-error" role="status">{error}</p> : null}
      </main>

      <section className="sd-tutor-composer" aria-label="Tutor message composer">
        <div className="sd-tutor-modes" aria-label="Tutor mode">
          {MODES.map((item) => (
            <button key={item.id} type="button" onClick={() => setMode(item.id)} aria-pressed={mode === item.id}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="sd-tutor-input-row">
          <Sparkles size={16} aria-hidden="true" />
          <textarea
            aria-label="Tutor message"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleAsk();
              }
            }}
            placeholder={`Message ${tutorName}`}
            rows={1}
          />
          <button
            type="button"
            onClick={() => void handleAsk()}
            disabled={loading || question.trim().length < 2}
            aria-label="Send tutor message"
          >
            {loading ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}
          </button>
        </div>
        <small>{tutorStyle} guidance · {complexity} detail</small>
      </section>
      <StudentBottomNav />
    </ScreenDesignViewport>
  );
}
