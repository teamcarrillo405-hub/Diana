"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Loader2, Send, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
import type { StudyArtifactQuizItem } from "@/lib/study-helper/artifacts";
import type { PracticeProgress } from "@/lib/study-helper/practice-progress";
import type { PracticeScoreSummary } from "@/lib/study-helper/practice-scoring";
import {
  normalizeQuizSupportState,
  quizSupportCopy,
  type QuizSupportState,
  type QuizSupportUsage,
} from "@/lib/study-helper/quiz-support-fading";

import { restartPracticeTest, savePracticeTestProgress } from "../actions";

type DianaStudyResponse = {
  title: string;
  main: string;
  reason: string;
  steps: string[];
  anchor: string;
};

type QuizChatMessage =
  | { id: string; role: "student"; text: string }
  | { id: string; role: "assistant"; response: DianaStudyResponse };

function QuizReviewChat({
  assignmentId,
  source,
  prompt = "Talk through the question before your next pass.",
  onStudentTurn,
}: {
  assignmentId: string | null;
  source: string;
  prompt?: string;
  onStudentTurn?: () => void;
}) {
  const [messages, setMessages] = useState<QuizChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [isThinking, startTransition] = useTransition();
  const [error, setError] = useState("");

  function askDiana() {
    const nextQuestion = question.trim();
    if (!nextQuestion || isThinking) return;

    const studentMessage: QuizChatMessage = {
      id: `student-${Date.now()}`,
      role: "student",
      text: nextQuestion,
    };
    const conversation = messages.map((message) => message.role === "student"
      ? { role: "student" as const, text: message.text }
      : { role: "assistant" as const, text: `${message.response.main} ${message.response.reason}` },
    );

    setMessages((current) => [...current, studentMessage]);
    onStudentTurn?.();
    setQuestion("");
    setError("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/diana/study-buddy", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            source,
            question: nextQuestion,
            mode: "guide",
            assignmentId,
            conversation,
          }),
        });
        const data = await response.json() as {
          ok?: boolean;
          response?: DianaStudyResponse;
          error?: string;
        };
        if (!data.ok || !data.response) {
          setError(data.error ?? "Diana is unavailable right now. Try again in a moment.");
          return;
        }
        const dianaResponse = data.response;
        setMessages((current) => [
          ...current,
          { id: `diana-${Date.now()}`, role: "assistant", response: dianaResponse },
        ]);
      } catch {
        setError("Diana is unavailable right now. Check your connection and try again.");
      }
    });
  }

  return (
    <section className="sd-quiz-review-chat" aria-label="Ask Diana about this quiz">
      <header>
        <span>Ask Diana</span>
        <p>{prompt}</p>
      </header>
      <div className="sd-quiz-review-chat-messages" aria-live="polite">
        {messages.length === 0 ? <p>Tell Diana which question or step felt unclear.</p> : messages.map((message) => message.role === "student" ? (
          <article key={message.id} data-role="student"><p>{message.text}</p></article>
        ) : (
          <article key={message.id} data-role="assistant">
            <strong>{message.response.title}</strong>
            <p>{message.response.main}</p>
            {message.response.steps.length > 0 ? <ol>{message.response.steps.map((step) => <li key={step}>{step}</li>)}</ol> : null}
          </article>
        ))}
        {isThinking ? <p className="sd-quiz-review-chat-thinking"><Loader2 size={15} aria-hidden="true" /> Diana is thinking</p> : null}
      </div>
      <div className="sd-quiz-review-chat-composer">
        <textarea
          aria-label="Message Diana about this quiz"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              askDiana();
            }
          }}
          placeholder="Ask about a question"
          rows={2}
        />
        <button type="button" onClick={askDiana} disabled={!question.trim() || isThinking} aria-label="Send message to Diana">
          {isThinking ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}
        </button>
      </div>
      {error ? <p className="sd-quiz-review-chat-error" role="status">{error}</p> : null}
    </section>
  );
}

export function PracticeTestSession({
  artifactId,
  artifactTitle,
  assignmentId,
  quiz,
  initialProgress,
  initialResult,
  initialSupportState,
}: {
  artifactId: string;
  artifactTitle: string;
  assignmentId: string | null;
  quiz: StudyArtifactQuizItem[];
  initialProgress: PracticeProgress;
  initialResult: PracticeScoreSummary | null;
  initialSupportState?: QuizSupportState;
}) {
  const router = useRouter();
  const [isSaving, startTransition] = useTransition();
  const [currentQuestion, setCurrentQuestion] = useState(() =>
    Math.min(initialProgress.currentQuestion, Math.max(quiz.length - 1, 0)),
  );
  const [responses, setResponses] = useState<Record<string, string>>(
    initialProgress.responses,
  );
  const [completed, setCompleted] = useState(initialProgress.completed);
  const [result, setResult] = useState(initialResult);
  const [showHint, setShowHint] = useState(false);
  const [status, setStatus] = useState("");
  const [supportState, setSupportState] = useState(() => normalizeQuizSupportState(initialSupportState));
  const [supportUsage, setSupportUsage] = useState<QuizSupportUsage>({ hintViews: 0, dianaTurns: 0 });
  const supportPresentation = quizSupportCopy(supportState.stage);
  const [supportEnabled, setSupportEnabled] = useState(() => !supportPresentation.startsQuiet);

  const answeredCount = useMemo(
    () => Object.values(responses).filter((response) => response.trim().length > 0).length,
    [responses],
  );
  const item = quiz[currentQuestion];
  const response = responses[String(currentQuestion)] ?? "";
  const returnHref = assignmentId
    ? `/assignments/${assignmentId}/workspace`
    : "/study-artifacts";
  const returnLabel = assignmentId ? "Back to assignment" : "Back to study lab";
  const needsReviewHelp = result?.percentage !== null && (result?.percentage ?? 100) < 70;
  const quizReviewSource = useMemo(() => [
    `Quiz: ${artifactTitle}`,
    ...quiz.map((question, index) => {
      const scored = result?.results[index];
      return [
        `Question ${index + 1}: ${question.question}`,
        `Student response: ${responses[String(index)] || "No response recorded"}`,
        scored ? `Review status: ${scored.category}. Source: ${question.sourceAnchor}.` : `Source: ${question.sourceAnchor}.`,
      ].join("\n");
    }),
  ].join("\n\n"), [artifactTitle, quiz, responses, result]);
  const activeQuizSource = `${quizReviewSource}\n\nCurrent question: ${item?.question ?? ""}`;

  if (completed) {
    return (
      <ScreenDesignViewport className="sd-assignment-workspace sd-practice-session sd-practice-complete" data-version="11">
        <StudentDesktopNav active="Classes" />
        <main className="sd-assignment-workspace-main">
          <section className="sd-assignment-gamer-shell sd-quiz-complete-shell">
            <div className="sd-assignment-workspace-topline"><Link href={returnHref} className="sd-assignment-workspace-back">{returnLabel}</Link></div>
            <div className="sd-quiz-complete-room">
              <aside className="sd-assignment-math-left" aria-label="Quiz review"><div className="sd-assignment-mission-heading"><p>{artifactTitle}</p></div><div className="sd-assignment-math-left-heading"><p>Questions</p><span>{answeredCount}/{quiz.length}</span></div><div className="sd-assignment-problem-queue">{quiz.map((question, index) => <button key={`${index}-${question.question}`} type="button" onClick={() => { setCurrentQuestion(index); setCompleted(false); }} className="sd-assignment-problem-tab"><span className="sd-assignment-problem-tab-heading"><span>Question {index + 1}</span><CheckCircle2 size={16} aria-hidden="true" /></span><small>Saved</small></button>)}</div></aside>
              <section className="sd-quiz-complete-center" aria-label="Quiz result"><div className="sd-quiz-complete-mark"><CheckCircle2 aria-hidden="true" /></div><p>Quiz complete</p><h1>{artifactTitle}</h1><span>{answeredCount} response{answeredCount === 1 ? "" : "s"} saved as your work.</span><strong>{result?.percentage == null ? "Your source-based review is ready." : `${result.percentage}% on auto-checked questions`}</strong><small>{quizSupportCopy(supportState.stage).label} is ready for the next pass.</small>{status ? <p className="sd-quiz-complete-status" role="status">{status}</p> : null}<button type="button" disabled={isSaving} onClick={() => { startTransition(async () => { const restart = await restartPracticeTest(artifactId); if (!restart.ok) { setStatus(restart.error); return; } const restartedSupport = normalizeQuizSupportState(restart.supportState); setCurrentQuestion(0); setResponses({}); setCompleted(false); setResult(null); setSupportState(restartedSupport); setSupportUsage({ hintViews: 0, dianaTurns: 0 }); setSupportEnabled(!quizSupportCopy(restartedSupport.stage).startsQuiet); setStatus("A new practice pass is ready."); router.refresh(); }); }}>Try another pass</button></section>
              <aside className="sd-assignment-math-right" aria-label="Quiz review details"><section className="sd-quiz-workspace-tool"><span>Review</span><strong>{result ? "Your responses" : "Saved responses"}</strong><p>Open a question from the left rail to look back through your work.</p></section>{result ? <section className="sd-quiz-workspace-tool"><span>Next step</span><p>{result.percentage == null || result.percentage < 70 ? "Review the questions that still need another look." : "You are ready to move on or practice again."}</p></section> : null}{needsReviewHelp ? <QuizReviewChat assignmentId={assignmentId} source={quizReviewSource} /> : null}</aside>
            </div>
          </section>
        </main>
      </ScreenDesignViewport>
    );
  }

  if (!item) {
    return (
      <ScreenDesignViewport className="sd-practice-session sd-practice-complete">
        <DianaWordmark />
        <p>Practice session</p>
        <h1>This set has no questions yet.</h1>
        <span>Open the source or create another practice set when you are ready.</span>
        <Link href={returnHref}>{returnLabel}</Link>
      </ScreenDesignViewport>
    );
  }

  const finalQuestion = currentQuestion === quiz.length - 1;

  function updateResponse(nextResponse: string) {
    setResponses((current) => ({
      ...current,
      [String(currentQuestion)]: nextResponse,
    }));
    setStatus("");
  }

  function submitResponse() {
    const cleaned = response.trim();
    if (!cleaned || isSaving) {
      setStatus("Add your own response before saving this practice step.");
      return;
    }
    const nextQuestion = finalQuestion ? currentQuestion : currentQuestion + 1;
    setStatus("Saving your response…");
    startTransition(async () => {
      const result = await savePracticeTestProgress({
        artifactId,
        currentQuestion: nextQuestion,
        responses: [{ questionIndex: currentQuestion, response: cleaned }],
        completed: finalQuestion,
        supportUsage,
      });
      if (!result.ok) {
        setStatus(result.error);
        return;
      }
      setResponses(result.progress.responses);
      setCompleted(result.progress.completed);
      setResult(result.result);
      setSupportState(normalizeQuizSupportState(result.supportState));
      if (!result.progress.completed) {
        setCurrentQuestion(nextQuestion);
        setShowHint(false);
        setStatus("Response saved. The next question is ready.");
      } else {
        setStatus("Practice saved.");
      }
      router.refresh();
    });
  }

  return (
    <ScreenDesignViewport className="sd-assignment-workspace sd-practice-session" data-version="11">
      <StudentDesktopNav active="Classes" />
      <main className="sd-assignment-workspace-main">
        <section className="sd-assignment-gamer-shell sd-quiz-workspace-shell">
          <div className="sd-assignment-workspace-topline">
            <Link href={returnHref} className="sd-assignment-workspace-back">{returnLabel}</Link>
          </div>
          <div className="sd-quiz-workspace-room">
            <aside className="sd-assignment-math-left" aria-label="Quiz questions">
              <div className="sd-assignment-mission-heading"><p>{artifactTitle}</p></div>
              <div className="sd-assignment-math-left-heading"><p>Questions</p><span>{answeredCount}/{quiz.length}</span></div>
              <div className="sd-assignment-problem-queue">
                {quiz.map((question, index) => {
                  const answered = Boolean(responses[String(index)]?.trim());
                  return <button key={`${index}-${question.question}`} type="button" onClick={() => { setCurrentQuestion(index); setShowHint(false); }} className="sd-assignment-problem-tab" aria-current={index === currentQuestion ? "step" : undefined}><span className="sd-assignment-problem-tab-heading"><span>Question {index + 1}</span>{answered ? <CheckCircle2 size={16} aria-label="Response saved" /> : <Circle size={16} aria-hidden="true" />}</span><small>{answered ? "Saved" : index === currentQuestion ? "Current" : "Not started"}</small></button>;
                })}
              </div>
            </aside>
            <section className="sd-quiz-workspace-center" aria-label="Current quiz question">
              <header><span>Question {currentQuestion + 1} of {quiz.length}</span><h1>{item.question}</h1></header>
              {showHint ? <p className="sd-quiz-workspace-hint">{item.hint}</p> : null}
              {item.choices.length > 0 ? <div className="sd-quiz-workspace-choices" role="group" aria-label="Quiz choices">{item.choices.map((choice, index) => <button type="button" key={`${index}-${choice}`} onClick={() => updateResponse(choice)} aria-pressed={response === choice}><span>{String.fromCharCode(65 + index)}. {choice}</span>{response === choice ? <CheckCircle2 aria-hidden="true" /> : <Circle aria-hidden="true" />}</button>)}</div> : <label className="sd-quiz-workspace-response"><span>Your response</span><textarea value={response} onChange={(event) => updateResponse(event.target.value)} rows={8} maxLength={2_000} aria-label="Practice response" placeholder="Write what you know. Diana will save each answer as you continue." /></label>}
              <div className="sd-quiz-workspace-actions"><button type="button" onClick={submitResponse} disabled={isSaving || response.trim().length === 0}>{isSaving ? "Saving…" : finalQuestion ? "Finish quiz" : "Save and continue"}</button><p aria-live="polite">{status}</p></div>
            </section>
              <aside className="sd-assignment-math-right" aria-label="Quiz tools">
              <section className="sd-quiz-workspace-tool"><span>Quiz progress</span><strong>{answeredCount} of {quiz.length} answered</strong><p>{result?.percentage == null ? "Your review appears after you finish." : `${result.percentage}% on auto-checked questions`}</p></section>
              <section className="sd-quiz-workspace-tool"><span>{supportPresentation.label}</span><p>{supportPresentation.description}</p>{supportEnabled ? <button type="button" onClick={() => setShowHint((visible) => { if (!visible) setSupportUsage((usage) => ({ ...usage, hintViews: usage.hintViews + 1 })); return !visible; })}><Sparkles size={16} aria-hidden="true" /> {showHint ? "Hide hint" : "Show hint"}</button> : <button type="button" onClick={() => setSupportEnabled(true)}><Sparkles size={16} aria-hidden="true" /> Turn support on</button>}</section>
              {supportEnabled ? <QuizReviewChat assignmentId={assignmentId} source={activeQuizSource} prompt="Ask about the question you are working on." onStudentTurn={() => setSupportUsage((usage) => ({ ...usage, dianaTurns: usage.dianaTurns + 1 }))} /> : null}
            </aside>
          </div>
        </section>
      </main>
    </ScreenDesignViewport>
  );
}
