"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Loader2, Send, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";

import type { StudentNavigationProfile } from "@/components/screen-design/student-desktop-nav";
import { StudentShell } from "@/components/student-shell/student-shell";
import styles from "@/components/student-shell/quiz.module.css";
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
  onStudentTurn,
}: {
  assignmentId: string | null;
  source: string;
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
      <header><h2>Ask Diana</h2></header>
      <div className="sd-quiz-review-chat-messages" aria-live="polite">
        {messages.map((message) => message.role === "student" ? (
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

export function PracticeTestSession({ navigationProfile, artifactId, artifactTitle, assignmentId, classId, quiz, initialProgress, initialResult, initialSupportState }: {
  navigationProfile?: StudentNavigationProfile; artifactId: string; artifactTitle: string; assignmentId: string | null; classId?: string | null; quiz: StudyArtifactQuizItem[]; initialProgress: PracticeProgress; initialResult: PracticeScoreSummary | null; initialSupportState?: QuizSupportState;
}) {
  const router = useRouter();
  const [isSaving, startTransition] = useTransition();
  const [currentQuestion, setCurrentQuestion] = useState(Math.min(initialProgress.currentQuestion, Math.max(quiz.length-1,0)));
  const [responses, setResponses] = useState(initialProgress.responses);
  const [drafts, setDrafts] = useState<Record<string,string>>({});
  const [completed, setCompleted] = useState(initialProgress.completed);
  const [result, setResult] = useState(initialResult);
  const [showHint, setShowHint] = useState(false);
  const [status, setStatus] = useState("");
  const [supportState, setSupportState] = useState(()=>normalizeQuizSupportState(initialSupportState));
  const [supportUsage, setSupportUsage] = useState<QuizSupportUsage>({hintViews:0,dianaTurns:0});
  const [supportEnabled, setSupportEnabled] = useState(()=>!quizSupportCopy(supportState.stage).startsQuiet);
  const heading = useRef<HTMLHeadingElement>(null);
  const questionButtons = useRef(new Map<number,HTMLButtonElement>());
  const answeredCount = Object.values(responses).filter(value=>value.trim()).length;
  const item = quiz[currentQuestion];
  const response = drafts[String(currentQuestion)] ?? responses[String(currentQuestion)] ?? "";
  const savedHref = classId ? `/classes/${encodeURIComponent(classId)}?section=quiz` : "/study?view=saved";
  const returnHref = !classId && assignmentId ? `/assignments/${assignmentId}/workspace` : savedHref;
  const returnLabel = classId ? "Back to class" : assignmentId ? "Back to assignment" : "Back to Quiz";
  const quizSource = useMemo(()=>[`Quiz: ${artifactTitle}`,...quiz.map((question,index)=>`Question ${index+1}: ${question.question}\nStudent response: ${responses[String(index)] || "No saved response"}\nSource: ${question.sourceAnchor}`)].join("\n\n"),[artifactTitle,quiz,responses]);
  const hasUnsaved = Object.entries(drafts).some(([key,value])=>value !== (responses[key] ?? ""));

  function chooseQuestion(index: number) { setCurrentQuestion(index); setShowHint(false); }
  function restart() {
    startTransition(async()=>{
      const next = await restartPracticeTest(artifactId);
      if (!next.ok) { setStatus(next.error); return; }
      const support = normalizeQuizSupportState(next.supportState);
      setCurrentQuestion(0); setResponses({}); setDrafts({}); setCompleted(false); setResult(null); setSupportState(support); setSupportUsage({hintViews:0,dianaTurns:0}); setSupportEnabled(!quizSupportCopy(support.stage).startsQuiet); setStatus(""); router.refresh();
    });
  }
  function saveResponse(finish: boolean) {
    if (isSaving || !response.trim()) return;
    const questionIndex = currentQuestion;
    const pendingResponses: Record<string,string> = {...drafts,[String(questionIndex)]:response};
    const updates = Object.entries(pendingResponses).filter(([,value])=>value.trim()).map(([index,value])=>({questionIndex:Number(index),response:value.trim()}));
    const nextResponses = {...responses,...Object.fromEntries(updates.map(answer=>[String(answer.questionIndex),answer.response]))};
    if (finish && quiz.some((_,index)=>!nextResponses[String(index)]?.trim())) { setStatus("Add a response to each question before finishing."); return; }
    setStatus("Saving your response");
    startTransition(async()=>{
      const saved = await savePracticeTestProgress({artifactId,currentQuestion:finish ? questionIndex : Math.min(questionIndex+1,quiz.length-1),responses:updates,completed:finish,supportUsage});
      if (!saved.ok) { setStatus(saved.error); return; }
      setResponses(saved.progress.responses); setDrafts({}); setCompleted(saved.progress.completed); setResult(saved.result); setSupportState(normalizeQuizSupportState(saved.supportState)); setCurrentQuestion(saved.progress.currentQuestion); setShowHint(false); setStatus(saved.progress.completed ? "Quiz saved." : "Response saved."); router.refresh();
      requestAnimationFrame(()=>heading.current?.focus());
    });
  }
  return <StudentShell profile={navigationProfile} active={classId ? "Classes" : "More"} scene={classId ? "classes" : "seminar"} mode="focus" version="13" className={styles.root}>
    <main id="main-content" className={styles.main}>
      <Link className={styles.back} href={returnHref}>{returnLabel}</Link>
      <header className={styles.heading}><div><p>Quiz</p><h1>{artifactTitle}</h1></div>{!classId ? <Link href={savedHref}>Saved practice</Link> : null}</header>
      {!item ? <section className={`${styles.paper} reading-view`}><h2>No questions yet</h2><Link href="/study">Choose work to create a quiz</Link></section> : completed ? <div className={styles.results}>
        <section className={`${styles.paper} reading-view`} aria-label="Quiz result"><CheckCircle2 size={28} aria-hidden="true" /><p>Quiz complete</p><h2 ref={heading} tabIndex={-1}>Your answers</h2><p>{answeredCount} responses saved</p>{result?.percentage != null ? <strong>{result.percentage}% on auto-checked questions</strong> : null}
          <div className={styles.answers}>{quiz.map((question,index)=>{const score=result?.results[index]; return <article key={index}><h3>Question {index+1}</h3><p>{question.question}</p><blockquote>{responses[String(index)] || "No response saved"}</blockquote><span>{score?.category === "matched" ? "Checked" : score?.category === "check_again" ? "Review again" : "Written response saved"}</span>{score?.scored ? <p>Answer: {score.expectedAnswer}</p> : <p className={styles.quiet}>This response has no automatic score.</p>}<small>{question.sourceAnchor}</small></article>;})}</div>
          <button className={styles.primary} disabled={isSaving} onClick={restart}>Try another pass</button><p role="status">{status}</p>
        </section>
        <aside className={styles.tools}><QuizReviewChat assignmentId={assignmentId} source={quizSource} /></aside>
      </div> : <div className={styles.room}>
        <aside className={styles.rail} aria-label="Quiz questions"><h2>Questions</h2><p>{answeredCount} of {quiz.length} saved</p><nav aria-label="Question navigation">{quiz.map((question,index)=>{
          const draft=drafts[String(index)]; const saved=Boolean(responses[String(index)]?.trim()); const dirty=draft !== undefined && draft !== (responses[String(index)] ?? "");
          return <button key={`${index}-${question.question}`} ref={el=>{if(el)questionButtons.current.set(index,el);else questionButtons.current.delete(index);}} type="button" disabled={isSaving} onClick={()=>chooseQuestion(index)} aria-current={index===currentQuestion ? "step" : undefined} tabIndex={index===currentQuestion ? 0 : -1} onKeyDown={event=>{const direction=event.key==="ArrowDown"?1:event.key==="ArrowUp"?-1:0;if(!direction)return;event.preventDefault();const next=(index+direction+quiz.length)%quiz.length;chooseQuestion(next);questionButtons.current.get(next)?.focus();}}><strong>Question {index+1}</strong><small>{dirty ? "Draft" : saved ? "Saved" : index===currentQuestion ? "Current" : "Not started"}</small>{saved && !dirty ? <CheckCircle2 size={16} aria-label="Response saved" /> : <Circle size={16} aria-hidden="true" />}</button>;
        })}</nav></aside>
        <section className={`${styles.paper} reading-view`} aria-label="Current quiz question"><p className={styles.eyebrow}>{item.choices.length ? "Choose" : "Your words"} · {currentQuestion+1} of {quiz.length}</p><h2 ref={heading} tabIndex={-1}>{item.question}</h2>
          {showHint ? <p className={styles.hint}>{item.hint}</p> : null}
          {item.choices.length ? <fieldset className={styles.choices}><legend className="sr-only">Quiz choices</legend>{item.choices.map((choice,index)=><label key={`${index}-${choice}`} data-selected={response===choice}><input type="radio" name={`question-${currentQuestion}`} value={choice} checked={response===choice} disabled={isSaving} onChange={()=>setDrafts(current=>({...current,[currentQuestion]:choice}))} />{choice}</label>)}</fieldset> : <label className={styles.response}>Your response<textarea aria-label="Practice response" value={response} disabled={isSaving} onChange={event=>setDrafts(current=>({...current,[currentQuestion]:event.target.value}))} maxLength={2000} rows={7} placeholder="Write your answer" /></label>}
          <div className={styles.actions}><button disabled={isSaving || currentQuestion===0} onClick={()=>chooseQuestion(currentQuestion-1)}>Previous</button><button className={styles.primary} disabled={isSaving || !response.trim()} onClick={()=>saveResponse(currentQuestion===quiz.length-1)}>{isSaving ? "Saving" : currentQuestion===quiz.length-1 ? "Finish quiz" : "Save and continue"}</button></div><p role="status" className={styles.quiet}>{status || (hasUnsaved ? "Draft · Save to keep your answers" : "")}</p>
        </section>
        <aside className={styles.tools} aria-label="Quiz tools"><button className={styles.support} onClick={()=>supportEnabled ? setShowHint(visible=>{if(!visible)setSupportUsage(usage=>({...usage,hintViews:usage.hintViews+1}));return !visible;}) : setSupportEnabled(true)}><Sparkles size={16} aria-hidden="true" />{supportEnabled ? showHint ? "Hide hint" : "Show hint" : "Turn support on"}</button>{supportEnabled ? <QuizReviewChat assignmentId={assignmentId} source={`${quizSource}\nCurrent question: ${item.question}`} onStudentTurn={()=>setSupportUsage(usage=>({...usage,dianaTurns:usage.dianaTurns+1}))} /> : null}<details><summary>Source</summary><p>{item.sourceAnchor}</p></details></aside>
      </div>}
    </main>
  </StudentShell>;
}
