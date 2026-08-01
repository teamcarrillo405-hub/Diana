"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Plus, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import type { StudyArtifactQuizItem } from "@/lib/study-helper/artifacts";
import type { PracticeProgress } from "@/lib/study-helper/practice-progress";
import type { PracticeScoreSummary } from "@/lib/study-helper/practice-scoring";

import { restartPracticeTest, savePracticeTestProgress } from "../actions";

export function PracticeTestSession({
  artifactId,
  artifactTitle,
  assignmentId,
  quiz,
  initialProgress,
  initialResult,
}: {
  artifactId: string;
  artifactTitle: string;
  assignmentId: string | null;
  quiz: StudyArtifactQuizItem[];
  initialProgress: PracticeProgress;
  initialResult: PracticeScoreSummary | null;
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

  if (completed) {
    return (
      <ScreenDesignViewport className="sd-practice-session sd-practice-complete">
        <DianaWordmark />
        <div className="sd-practice-complete-mark">
          <CheckCircle2 aria-hidden="true" />
        </div>
        <p>Practice saved</p>
        <h1>{artifactTitle}</h1>
        <span>{answeredCount} response{answeredCount === 1 ? "" : "s"} saved as your work.</span>
        {result?.percentage === null || !result ? (
          <strong>{result ? "Meaning-aware review ready." : "No score was generated."}</strong>
        ) : (
          <strong>{result.percentage}% on auto-checked questions</strong>
        )}
        {result ? (
          <div className="sd-practice-result-list" aria-label="Practice review">
            {result.results.map((questionResult) => (
              <article
                key={questionResult.questionIndex}
                data-result={questionResult.category}
              >
                <span>Question {questionResult.questionIndex + 1}</span>
                <h2>{questionResult.question}</h2>
                <p>{questionResult.explanation}</p>
                {questionResult.category !== "matched" ? (
                  <details>
                    <summary>Review answer and source</summary>
                    <p>{questionResult.expectedAnswer}</p>
                    <small>{questionResult.sourceAnchor}</small>
                  </details>
                ) : (
                  <small>{questionResult.sourceAnchor}</small>
                )}
              </article>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          disabled={isSaving}
          className="sd-practice-retry"
          onClick={() => {
            startTransition(async () => {
              const restart = await restartPracticeTest(artifactId);
              if (!restart.ok) {
                setStatus(restart.error);
                return;
              }
              setCurrentQuestion(0);
              setResponses({});
              setCompleted(false);
              setResult(null);
              setStatus("A new practice pass is ready.");
              router.refresh();
            });
          }}
        >
          Try another pass
        </button>
        <Link href={returnHref}>{returnLabel}</Link>
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
      });
      if (!result.ok) {
        setStatus(result.error);
        return;
      }
      setResponses(result.progress.responses);
      setCompleted(result.progress.completed);
      setResult(result.result);
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
    <ScreenDesignViewport className="sd-practice-session">
      <header className="sd-practice-header">
        <div>
          <DianaWordmark />
          <Link href={returnHref} aria-label={returnLabel}>
            <X aria-hidden="true" />
          </Link>
        </div>
        <div className="sd-practice-progress-count">
          <strong>{String(currentQuestion + 1).padStart(2, "0")}/{String(quiz.length).padStart(2, "0")}</strong>
          <span><i aria-hidden="true" /> Practice in progress</span>
        </div>
      </header>

      <main className="sd-practice-scroll">
        <article className="sd-practice-question-card">
          <div className="sd-practice-question-meta">
            <span>Question {currentQuestion + 1} of {quiz.length}</span>
            <strong>{artifactTitle}</strong>
          </div>
          <h1>{item.question}</h1>
          {showHint ? <p className="sd-practice-hint">Hint: {item.hint}</p> : null}

          {item.choices.length > 0 ? (
            <div className="sd-practice-choices" role="group" aria-label="Practice choices">
              {item.choices.map((choice, index) => {
                const selected = response === choice;
                return (
                  <button
                    type="button"
                    key={`${index}-${choice}`}
                    onClick={() => updateResponse(choice)}
                    aria-pressed={selected}
                    aria-label={`Choose ${choice}`}
                  >
                    <span>{String.fromCharCode(65 + index)}. {choice}</span>
                    {selected ? <CheckCircle2 aria-hidden="true" /> : <Circle aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <label className="sd-practice-written-response">
              <span>Your response</span>
              <textarea
                value={response}
                onChange={(event) => updateResponse(event.target.value)}
                rows={5}
                maxLength={2_000}
                aria-label="Practice response"
                placeholder="Write what you know before opening more help."
              />
            </label>
          )}

          <button
            type="button"
            onClick={submitResponse}
            disabled={isSaving || response.trim().length === 0}
            aria-label="Submit practice response"
            className="sd-practice-submit"
          >
            {isSaving ? "Saving…" : finalQuestion ? "Finish practice" : "Save and continue"}
          </button>
          <p className="sd-practice-status" aria-live="polite">{status}</p>
        </article>

        <section className="sd-practice-evidence" aria-label="Practice evidence">
          <div>
            <span>Responses saved</span>
            <strong>{answeredCount}/{quiz.length}</strong>
          </div>
          <i aria-hidden="true" />
          <div>
            <span>Result</span>
            <strong>{result?.percentage == null ? "Review after practice" : `${result.percentage}%`}</strong>
          </div>
        </section>
      </main>

      <Link href="/quick-add" className="sd-practice-quick-add" aria-label="Quick add">
        <Plus aria-hidden="true" />
      </Link>

      <footer className="sd-practice-footer">
        <Link href={returnHref}>Pause</Link>
        <button type="button" onClick={() => setShowHint((visible) => !visible)}>
          <Sparkles aria-hidden="true" />
          {showHint ? "Hide hint" : "Ask Diana"}
        </button>
      </footer>
    </ScreenDesignViewport>
  );
}
