"use client";

import { Check, ChevronLeft, ChevronRight, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  saveAssessmentResponseDraft,
  submitAssessmentAttempt,
} from "@/app/(app)/course-mode/student-actions";

export type AssessmentSessionItem = {
  id: string;
  title: string;
  interactionType: "choice" | "multiple_choice" | "text_entry" | "numeric_entry" | "extended_text";
  prompt: string;
  choices: Array<{ identifier: string; label: string }>;
  pointsPossible: number;
};

type AssessmentResponse = string | string[];
type SaveState = "idle" | "saving" | "saved" | "error";

export type AssessmentReviewResponse = {
  itemId: string;
  studentResponse: unknown;
  autoScore: number | null;
  teacherScore: number | null;
  teacherFeedback: string | null;
};

type AssessmentSessionProps = {
  blueprintId: string;
  attemptId: string;
  attemptNumber: number;
  items: AssessmentSessionItem[];
  initialResponses: Record<string, AssessmentResponse>;
  expiresAt?: string | null;
  allottedMinutes?: number | null;
  extraTimePct?: number;
};

type AssessmentResponseReviewProps = {
  attemptNumber: number;
  status: string;
  autoScore: number | null;
  teacherScore: number | null;
  finalScore: number | null;
  pointsPossible: number | null;
  finalPercent: number | null;
  items: AssessmentSessionItem[];
  responses: AssessmentReviewResponse[];
};

const AUTOSAVE_DELAY_MS = 650;

function responseHasContent(response: AssessmentResponse | undefined) {
  return Array.isArray(response)
    ? response.some((value) => value.trim().length > 0)
    : typeof response === "string" && response.trim().length > 0;
}

function responseFromStoredValue(
  item: AssessmentSessionItem,
  value: unknown,
): AssessmentResponse {
  if (item.interactionType === "multiple_choice") {
    return Array.isArray(value) ? value.map(String) : [];
  }
  if (Array.isArray(value)) return String(value[0] ?? "");
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function readableResponse(item: AssessmentSessionItem, response: unknown) {
  const values = Array.isArray(response) ? response.map(String) : [String(response ?? "")];
  if (item.interactionType === "choice" || item.interactionType === "multiple_choice") {
    return values
      .map((value) => item.choices.find((choice) => choice.identifier === value)?.label ?? value)
      .filter(Boolean)
      .join(", ");
  }
  return values.join(", ");
}

export function AssessmentSession({
  blueprintId,
  attemptId,
  attemptNumber,
  items,
  initialResponses,
  expiresAt = null,
  allottedMinutes = null,
  extraTimePct = 0,
}: AssessmentSessionProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, AssessmentResponse>>(() =>
    Object.fromEntries(items.map((item) => [
      item.id,
      responseFromStoredValue(item, initialResponses[item.id]),
    ])),
  );
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [message, setMessage] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(() =>
    expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)) : null,
  );
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const saveQueues = useRef<Map<string, Promise<boolean>>>(new Map());

  useEffect(() => () => {
    for (const timer of saveTimers.current.values()) clearTimeout(timer);
    saveTimers.current.clear();
  }, []);

  useEffect(() => {
    if (!expiresAt) return;
    const updateRemaining = () => {
      setRemainingSeconds(Math.max(
        0,
        Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000),
      ));
    };
    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1_000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const currentItem = items[currentIndex];
  const answeredCount = useMemo(
    () => items.filter((item) => responseHasContent(responses[item.id])).length,
    [items, responses],
  );

  const saveResponse = useCallback(async (
    itemId: string,
    response: AssessmentResponse,
  ) => {
    const pending = saveTimers.current.get(itemId);
    if (pending) clearTimeout(pending);
    saveTimers.current.delete(itemId);
    setSaveStates((current) => ({ ...current, [itemId]: "saving" }));
    const priorSave = saveQueues.current.get(itemId) ?? Promise.resolve(true);
    const queuedSave = priorSave.catch(() => false).then(async () => {
      const result = await saveAssessmentResponseDraft({
        blueprintId,
        attemptId,
        itemId,
        response,
      });
      if (!result.ok) setMessage(result.message ?? "Your response remains on this screen.");
      return result.ok;
    });
    saveQueues.current.set(itemId, queuedSave);
    const saved = await queuedSave;
    if (saveQueues.current.get(itemId) === queuedSave) {
      saveQueues.current.delete(itemId);
      setSaveStates((current) => ({
        ...current,
        [itemId]: saved ? "saved" : "error",
      }));
    }
    return saved;
  }, [attemptId, blueprintId]);

  const updateResponse = (itemId: string, response: AssessmentResponse) => {
    setResponses((current) => ({ ...current, [itemId]: response }));
    setSaveStates((current) => ({ ...current, [itemId]: "saving" }));
    setMessage("");
    const pending = saveTimers.current.get(itemId);
    if (pending) clearTimeout(pending);
    saveTimers.current.set(itemId, setTimeout(() => {
      void saveResponse(itemId, response);
    }, AUTOSAVE_DELAY_MS));
  };

  const moveToQuestion = async (nextIndex: number) => {
    if (!currentItem || nextIndex < 0 || nextIndex >= items.length) return;
    await saveResponse(currentItem.id, responses[currentItem.id] ?? "");
    setCurrentIndex(nextIndex);
  };

  const reviewSubmission = async () => {
    if (!currentItem) return;
    await saveResponse(currentItem.id, responses[currentItem.id] ?? "");
    const firstOpenIndex = items.findIndex((item) => !responseHasContent(responses[item.id]));
    if (firstOpenIndex >= 0) {
      setCurrentIndex(firstOpenIndex);
      setMessage(`Question ${firstOpenIndex + 1} still needs a response.`);
      return;
    }
    setMessage("");
    setShowConfirmation(true);
  };

  const confirmSubmission = async () => {
    setSubmitting(true);
    setMessage("");
    for (const timer of saveTimers.current.values()) clearTimeout(timer);
    saveTimers.current.clear();
    const draftsSaved = await Promise.all(
      items.map((item) => saveResponse(item.id, responses[item.id] ?? "")),
    );
    if (draftsSaved.some((saved) => !saved)) {
      setSubmitting(false);
      setShowConfirmation(false);
      setMessage("One response still needs to be saved. Try again.");
      return;
    }
    const result = await submitAssessmentAttempt({
      blueprintId,
      attemptId,
      responses: items.map((item) => ({
        itemId: item.id,
        response: responses[item.id] ?? "",
      })),
    });
    if (!result.ok) {
      setSubmitting(false);
      setShowConfirmation(false);
      setMessage(result.message ?? "The assessment remains open.");
      return;
    }
    const status = result.status ?? "scored";
    router.replace(`/course-mode/assessments/${blueprintId}?status=${status}`);
    router.refresh();
  };

  if (!currentItem) {
    return (
      <p className="mt-6 border border-amber-400 bg-amber-50 p-4 font-bold text-amber-950">
        This assessment does not have any questions yet.
      </p>
    );
  }

  const currentResponse = responses[currentItem.id];
  const currentSaveState = saveStates[currentItem.id] ?? "idle";

  return (
    <section className="mt-7" aria-labelledby="assessment-session-title">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/20 pb-4">
        <div>
          <p className="m-0 text-xs font-black uppercase text-[#ff79da]">Attempt {attemptNumber}</p>
          <h2 id="assessment-session-title" className="mb-0 mt-1 text-2xl font-black">
            Question {currentIndex + 1} of {items.length}
          </h2>
        </div>
        <div className="text-right">
          <p className="m-0 text-sm font-bold text-slate-200">{answeredCount} of {items.length} answered</p>
          {remainingSeconds !== null ? (
            <p className="mb-0 mt-1 text-sm font-black text-[#ff79da]" role="timer">
              {formatAssessmentTime(remainingSeconds)}
            </p>
          ) : null}
          {allottedMinutes ? (
            <p className="mb-0 mt-1 text-xs text-slate-300">
              {allottedMinutes} minutes
              {extraTimePct > 0 ? ` including ${extraTimePct}% extra time` : ""}
            </p>
          ) : null}
          <p className="mb-0 mt-1 flex min-h-5 items-center justify-end gap-1 text-xs text-slate-300" role="status" aria-live="polite">
            {currentSaveState === "saving" ? <><Loader2 size={13} className="animate-spin" /> Saving</> : null}
            {currentSaveState === "saved" ? <><Check size={13} /> Saved</> : null}
            {currentSaveState === "error" ? "Save needs another try" : null}
            {currentSaveState === "idle" ? <><Save size={13} /> Changes save automatically</> : null}
          </p>
        </div>
      </div>

      <nav className="mt-4 flex flex-wrap gap-2" aria-label="Assessment questions">
        {items.map((item, index) => {
          const answered = responseHasContent(responses[item.id]);
          const selected = index === currentIndex;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => void moveToQuestion(index)}
              aria-current={selected ? "step" : undefined}
              aria-label={`Question ${index + 1}${answered ? ", answered" : ""}`}
              className={`grid size-10 place-items-center border text-sm font-black ${
                selected
                  ? "border-white bg-white text-slate-950"
                  : answered
                    ? "border-emerald-300 bg-emerald-950 text-emerald-100"
                    : "border-white/35 bg-transparent text-white"
              }`}
            >
              {index + 1}
            </button>
          );
        })}
      </nav>

      {message ? (
        <p className="mt-4 border border-amber-400 bg-amber-50 p-3 text-sm font-bold text-amber-950" role="alert">
          {message}
        </p>
      ) : null}

      <fieldset className="course-mode-light mt-5 rounded-md border border-dashed border-white/30 bg-[#f4efe6] p-5 text-slate-950 sm:p-7">
        <legend className="px-2 text-sm font-black">
          {currentItem.pointsPossible} {currentItem.pointsPossible === 1 ? "point" : "points"}
        </legend>
        <h3 className="m-0 text-xl font-black">{currentItem.title}</h3>
        <p id={`prompt-${currentItem.id}`} className="mb-0 mt-3 whitespace-pre-wrap text-base leading-7 text-slate-800">
          {currentItem.prompt}
        </p>
        <div className="mt-5 grid gap-3">
          {currentItem.interactionType === "choice"
            ? currentItem.choices.map((choice) => (
              <label key={choice.identifier} className="flex min-h-12 cursor-pointer items-center gap-3 border border-slate-400 bg-white p-3 text-base">
                <input
                  type="radio"
                  name={`response-${currentItem.id}`}
                  value={choice.identifier}
                  checked={currentResponse === choice.identifier}
                  onChange={() => updateResponse(currentItem.id, choice.identifier)}
                />
                <span>{choice.label}</span>
              </label>
            ))
            : currentItem.interactionType === "multiple_choice"
              ? currentItem.choices.map((choice) => {
                const selected = Array.isArray(currentResponse) && currentResponse.includes(choice.identifier);
                return (
                  <label key={choice.identifier} className="flex min-h-12 cursor-pointer items-center gap-3 border border-slate-400 bg-white p-3 text-base">
                    <input
                      type="checkbox"
                      name={`response-${currentItem.id}`}
                      value={choice.identifier}
                      checked={selected}
                      onChange={() => {
                        const values = Array.isArray(currentResponse) ? currentResponse : [];
                        updateResponse(
                          currentItem.id,
                          selected
                            ? values.filter((value) => value !== choice.identifier)
                            : [...values, choice.identifier],
                        );
                      }}
                    />
                    <span>{choice.label}</span>
                  </label>
                );
              })
              : currentItem.interactionType === "extended_text"
                ? (
                  <label htmlFor={`response-${currentItem.id}`} className="text-sm font-bold">
                    Your response
                    <textarea
                      id={`response-${currentItem.id}`}
                      aria-describedby={`prompt-${currentItem.id}`}
                      rows={10}
                      value={typeof currentResponse === "string" ? currentResponse : ""}
                      onChange={(event) => updateResponse(currentItem.id, event.target.value)}
                      className="mt-2 w-full resize-y border border-slate-400 bg-white p-3 text-base font-normal leading-7"
                    />
                  </label>
                )
                : (
                  <label htmlFor={`response-${currentItem.id}`} className="text-sm font-bold">
                    Your response
                    <input
                      id={`response-${currentItem.id}`}
                      aria-describedby={`prompt-${currentItem.id}`}
                      value={typeof currentResponse === "string" ? currentResponse : ""}
                      onChange={(event) => updateResponse(currentItem.id, event.target.value)}
                      type={currentItem.interactionType === "numeric_entry" ? "number" : "text"}
                      step={currentItem.interactionType === "numeric_entry" ? "any" : undefined}
                      className="mt-2 min-h-12 w-full border border-slate-400 bg-white px-3 text-base font-normal"
                    />
                  </label>
                )}
        </div>
      </fieldset>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={currentIndex === 0}
          onClick={() => void moveToQuestion(currentIndex - 1)}
          className="inline-flex min-h-11 items-center gap-2 border border-white/40 px-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={18} /> Previous
        </button>
        {currentIndex < items.length - 1 ? (
          <button
            type="button"
            onClick={() => void moveToQuestion(currentIndex + 1)}
            className="inline-flex min-h-11 items-center gap-2 bg-white px-5 font-black text-slate-950"
          >
            Save and next <ChevronRight size={18} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void reviewSubmission()}
            className="min-h-11 bg-[#db2777] px-5 font-black text-white"
          >
            Review and submit
          </button>
        )}
      </div>

      {showConfirmation ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-5">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-assessment-title"
            className="w-full max-w-md rounded-md border border-slate-300 bg-[#f4efe6] p-6 text-slate-950 shadow-2xl"
          >
            <h2 id="submit-assessment-title" className="m-0 text-2xl font-black">Submit this assessment?</h2>
            <p className="mb-0 mt-3 leading-7 text-slate-700">
              All {items.length} responses are ready. After submission, this attempt can no longer be edited.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowConfirmation(false)}
                className="min-h-11 border border-slate-400 bg-white px-4 font-black text-slate-950"
              >
                Keep working
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void confirmSubmission()}
                className="inline-flex min-h-11 items-center gap-2 bg-[#db2777] px-5 font-black text-white disabled:opacity-60"
              >
                {submitting ? <Loader2 size={17} className="animate-spin" /> : null}
                Submit assessment
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function formatAssessmentTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")} remaining`;
}

export function AssessmentResponseReview({
  attemptNumber,
  status,
  autoScore,
  teacherScore,
  finalScore,
  pointsPossible,
  finalPercent,
  items,
  responses,
}: AssessmentResponseReviewProps) {
  const responsesByItem = new Map(responses.map((response) => [response.itemId, response]));
  const shownScore = status === "confirmed" ? finalScore : teacherScore ?? autoScore;

  return (
    <section className="mt-7" aria-labelledby="assessment-review-title">
      <div className="course-mode-light rounded-md border border-dashed border-white/30 bg-[#f4efe6] p-5 text-slate-950">
        <div className="flex items-center gap-2">
          <Check className="text-emerald-700" />
          <h2 id="assessment-review-title" className="m-0 text-xl font-black">Attempt {attemptNumber}</h2>
        </div>
        <p className="mb-0 mt-2 text-sm text-slate-700">
          {status === "confirmed" && finalPercent !== null
            ? `Teacher-confirmed score: ${finalScore}/${pointsPossible} (${finalPercent}%)`
            : status === "submitted"
              ? "Your responses are with your teacher for review."
              : shownScore !== null
                ? `Recorded score: ${shownScore}/${pointsPossible}`
                : "Your assessment was submitted."}
        </p>
      </div>

      <div className="mt-5 grid gap-4">
        {items.map((item, index) => {
          const response = responsesByItem.get(item.id);
          const itemScore = response?.teacherScore ?? response?.autoScore;
          return (
            <article key={item.id} className="course-mode-light rounded-md border border-dashed border-white/30 bg-[#f4efe6] p-5 text-slate-950">
              <p className="m-0 text-xs font-black uppercase text-[#9d174d]">Question {index + 1}</p>
              <h3 className="mb-0 mt-1 text-lg font-black">{item.title}</h3>
              <p className="mb-0 mt-2 whitespace-pre-wrap leading-7 text-slate-700">{item.prompt}</p>
              <div className="mt-4 border border-slate-300 bg-white p-4">
                <p className="m-0 text-xs font-black uppercase text-slate-600">Your response</p>
                <p className="mb-0 mt-2 whitespace-pre-wrap text-slate-950">
                  {response ? readableResponse(item, response.studentResponse) : "No response was recorded."}
                </p>
              </div>
              {itemScore !== null && itemScore !== undefined ? (
                <p className="mb-0 mt-3 text-sm font-bold text-slate-700">
                  {itemScore}/{item.pointsPossible} points
                </p>
              ) : null}
              {response?.teacherFeedback ? (
                <div className="mt-3 border-l-4 border-[#db2777] bg-white p-4">
                  <p className="m-0 text-xs font-black uppercase text-slate-600">Teacher feedback</p>
                  <p className="mb-0 mt-2 whitespace-pre-wrap text-slate-950">{response.teacherFeedback}</p>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
