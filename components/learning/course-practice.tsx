"use client";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { courseLevelSchema, domainSchema, LEVEL_LABELS, type CourseLevel } from "@/lib/learning-engine/course-domains";
import { problemStateSchema, type ProblemState } from "@/lib/learning-engine/problem-state";
import { courseFeedbackSchema, type CourseFeedback } from "@/lib/learning-engine/course-feedback";
import { responseRubricSchema } from "@/lib/learning-engine/response-rubric";
import { ResponseRubric } from "./response-rubric";
import { LocalRecognitionCapture } from "./local-recognition-capture";
import { CourseResponseReviewRequest } from "./course-response-review-request";
import { CourseDataGraph } from "./course-data-graph";
import { courseDataGraphSchema } from "@/lib/learning-engine/course-graphs";
import { coursePathSchema } from "@/lib/learning-engine/course-path-schema";
import styles from "./learning-material.module.css";
const activitySchema = z.object({ id: z.string(), courseId: z.string(), skillId: z.string(), title: z.string(), prompt: z.string(), subject: domainSchema, level: courseLevelSchema, versionId: z.string(), method: z.string(), review: z.literal("pending"), publication: z.enum(["draft", "published", "withdrawn", "suspended"]).default("draft"), limits: z.string(), rubric: responseRubricSchema.nullable().optional(), criteria: z.array(z.string()), graph: courseDataGraphSchema.optional(), sources: z.array(z.object({ id: z.string(), title: z.string(), text: z.string() })) });
const dataSchema = z.object({ courses: z.array(z.object({ id: z.string(), title: z.string(), subject: domainSchema, level: courseLevelSchema })), activities: z.array(activitySchema), competencies: z.array(z.object({ id: z.string(), title: z.string(), objective: z.string(), prerequisiteTitles: z.array(z.string()) })), paths: z.array(coursePathSchema).default([]), session: problemStateSchema.nullable(), staleSession: z.boolean() });
type Activity = z.infer<typeof activitySchema>;
const subjectNames:Record<z.infer<typeof domainSchema>,string>={english:"English",reading:"Reading",math:"Math",science:"Science",history:"History",computing:"Computing",other:"Other"};
export function CoursePractice({ classId, initialSubject = "english", initialLevel = "middle_school", initialCourseId }: {
    classId: string;
    initialSubject?: "english" | "math" | "science" | "history" | "computing";
    initialLevel?: CourseLevel;
    initialCourseId?: string;
}) {
    const [data, setData] = useState<z.infer<typeof dataSchema> | null>(null), [courseId, setCourseId] = useState(""), [level, setLevel] = useState<CourseLevel>(initialLevel), [subject, setSubject] = useState<string>(initialSubject), [selected, setSelected] = useState("");
    const [active, setActive] = useState<Activity | null>(null), [state, setState] = useState<ProblemState | null>(null), [response, setResponse] = useState(""), [feedback, setFeedback] = useState<CourseFeedback | null>(null);
    const [modality, setModality] = useState<"typed" | "handwriting" | "voice">("typed"), [confirmed, setConfirmed] = useState(true), [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
    const [recognitionProof,setRecognitionProof]=useState<string|null>(null);
    const [responseEditRevision,setResponseEditRevision]=useState(0);
    const [savedOtherSubject,setSavedOtherSubject]=useState<{session:ProblemState;activity:Activity}|null>(null);
    const questionHeading = useRef<HTMLHeadingElement>(null);
    const [focusRequest, setFocusRequest] = useState(0);
    useEffect(() => {
        if (!focusRequest) return;
        const heading = questionHeading.current;
        if (!heading) return;
        heading.focus({ preventScroll: true });
        heading.scrollIntoView?.({ block: "start", behavior: "auto" });
    }, [focusRequest]);
    const pending = useRef<{
        key: string;
        requestId: string;
        id: string;
    } | null>(null);
    useEffect(() => {
        const controller = new AbortController();setData(null);setState(null);setActive(null);setSavedOtherSubject(null);setRecognitionProof(null);setFocusRequest(0);
        void fetch(`/api/learning/course-practice?classId=${classId}`, { signal: controller.signal, cache: "no-store" }).then(async (result) => { const value = await result.json(); if (!result.ok)
            throw new Error(value.error || "Practice could not load."); return dataSchema.parse(value); }).then(value => {
            if (controller.signal.aborted)
                return;
            setData(value);
            const resumed = value.activities.find(item => item.id === value.session?.scope.exerciseId);
            const sameContext=resumed?.subject===initialSubject&&resumed.level===initialLevel&&(!initialCourseId||resumed.courseId===initialCourseId);
            const initial = (sameContext?resumed:null)
                ?? value.activities.find(item => item.subject === initialSubject && item.level === initialLevel && item.courseId === initialCourseId)
                ?? value.activities.find(item => item.subject === initialSubject && item.level === initialLevel)
                ?? value.activities.find(item => item.subject === initialSubject) ?? value.activities[0];
            if (initial) {
                setCourseId(initial.courseId);
                setSubject(value.courses.find(item => item.id === initial.courseId)?.subject ?? initial.subject);
                setLevel(initial.level);
                setSelected(initial.id);
            }
            if (sameContext && resumed && value.session)
                restore(value.session, resumed);
            else if(resumed&&value.session)setSavedOtherSubject({session:value.session,activity:resumed});
            if (value.staleSession)
                setNotice("A saved question has been updated. Open its current version to continue; your earlier record is retained.");
        }).catch(error => { if (!controller.signal.aborted)
            setNotice(error instanceof Error ? error.message : "Practice could not load."); });
        return () => controller.abort();
    }, [classId, initialSubject, initialLevel, initialCourseId]);
    function restore(saved: ProblemState, activity: Activity, focus = false) {
        setState(saved);
        setActive(activity);
        setFeedback(null);
        const answer = saved.observations.find(item => item.id === "response");
        setResponse(answer?.text ?? "");
        setRecognitionProof(null);
        const origin = answer?.modality;
        setModality(origin === "handwriting" || origin === "voice" ? origin : "typed");
        setConfirmed(!origin || origin === "typed" || answer?.confirmedHash === answer?.contentHash);
        if (focus) setFocusRequest(value => value + 1);
    }
    async function send(body: Record<string, unknown>) {
        const key = JSON.stringify(body);
        if (pending.current?.key !== key)
            pending.current = { key, requestId: crypto.randomUUID(), id: crypto.randomUUID() };
        const result = await fetch("/api/learning/course-practice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, ...(body.action === "start" ? { id: pending.current.id } : {}), requestId: pending.current.requestId }) });
        const value = await result.json();
        if (!result.ok)
            throw new Error(value.error || "Practice could not save.");
        pending.current = null;
        return value;
    }
    async function run(action: () => Promise<void>) { setBusy(true); setNotice(""); try {
        await action();
    }
    catch (error) {
        setNotice(error instanceof Error ? error.message : "Practice could not save.");
    }
    finally {
        setBusy(false);
    } }
    async function respond(mode: "check" | "hint" | "example" | "save") {
        if (!state)
            return;
        const value = z.object({ state: problemStateSchema, feedback: courseFeedbackSchema }).parse(await send({ action: "respond", id: state.id, classId, expectedRevision: state.revision, mode, response, confirmed, modality,
            ...(recognitionProof?{recognitionProof}:{}) }));
        setState(value.state);
        setFeedback(value.feedback);
        setRecognitionProof(null);
    }
    async function saveBeforeSwitch() {
        const answer = state?.observations.find(item => item.id === "response");
        const confirmationChanged = !!answer && confirmed !== (answer.confirmedHash === answer.contentHash);
        if (state && (response !== (answer?.text ?? "") || modality !== (answer?.modality ?? "typed") || confirmationChanged || recognitionProof !== null))
            await respond("save");
    }
    async function openQuestion(exerciseId: string) {
        await saveBeforeSwitch();
        const result = await fetch(`/api/learning/course-practice?classId=${classId}&exerciseId=${encodeURIComponent(exerciseId)}`, { cache: "no-store" });
        const body = await result.json();
        if (!result.ok)
            throw new Error(body.error || "Your saved question could not load.");
        const saved = dataSchema.parse(body), activity = saved.activities.find(item => item.id === exerciseId);
        if (!activity)
            throw new Error("This question was updated. Reload practice to continue.");
        setData(saved);
        if (saved.session) {
            restore(saved.session, activity, true);
            return activity;
        }
        const value = z.object({ state: problemStateSchema }).parse(await send({ action: "start", classId, exerciseId }));
        restore(value.state, activity, true);
        if (saved.staleSession)
            setNotice("This is an updated question. Your earlier version is retained in its saved record.");
        return activity;
    }
    async function start() { await openQuestion(selected); }
    async function followPath(exerciseId: string) {
        const activity = await openQuestion(exerciseId);
        setSubject(activity.subject); setLevel(activity.level); setCourseId(activity.courseId); setSelected(activity.id);
    }
    async function resumeSavedQuestion() {
        if (!savedOtherSubject) return;
        const activity = await openQuestion(savedOtherSubject.activity.id);
        setSubject(activity.subject);setLevel(activity.level);setCourseId(activity.courseId);setSelected(activity.id);setSavedOtherSubject(null);
    }
    function choose(nextSubject: string, nextLevel: CourseLevel) { setSubject(nextSubject); setLevel(nextLevel); const course = data?.courses.find(item => item.subject === nextSubject && item.level === nextLevel); setCourseId(course?.id ?? ""); setSelected(data?.activities.find(item => item.courseId === course?.id)?.id ?? ""); }
    const courses = data?.courses.filter(item => item.subject === subject && item.level === level) ?? [], activities = data?.activities.filter(item => item.courseId === courseId) ?? [];
    const paused = active?.publication === "withdrawn" || active?.publication === "suspended";
    const skill = data?.competencies.find(item => item.id === active?.skillId);
    const path = data?.paths.find(item => item.activityId === active?.id);
    const savedResponse = state?.observations.find(item => item.id === "response");
    const reviewSubject = active?.subject === "reading" || active?.subject === "english" || active?.subject === "science" || active?.subject === "history"
        ? active.subject : null;
    const reviewReady = Boolean(reviewSubject && state && active?.rubric && !paused && state.scope.classId === classId &&
        state.scope.assignmentId === null && state.scope.exerciseId === active.id && state.exerciseVersionId === active.versionId &&
        savedResponse?.text.trim() && savedResponse.confirmedHash === savedResponse.contentHash &&
        (savedResponse.provenance === "student_entered" || savedResponse.provenance === "machine_interpretation") &&
        response === savedResponse.text && modality === savedResponse.modality && confirmed);
    return <div className={styles.coursePractice}>
    {!data && !notice && <p role="status">Loading practice…</p>}
    {data && <>
      <div className={styles.courseSelectors}>
        <label className={styles.field}>Subject<select value={subject} disabled={busy} onChange={event => choose(event.target.value, level)}><option value="english">English</option><option value="math">Math</option><option value="science">Science</option><option value="history">History</option>{(["reading","computing","other"] as const).filter(item=>data.courses.some(course=>course.subject===item)).map(item=><option key={item} value={item}>{subjectNames[item]}</option>)}</select></label>
        <label className={styles.field}>Course level<select value={level} disabled={busy} onChange={event => choose(subject, event.target.value as CourseLevel)}>{Object.entries(LEVEL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      {savedOtherSubject&&<div className={styles.toolbar}><p className={styles.label}>You have saved {subjectNames[savedOtherSubject.activity.subject]} practice in this class.</p><button className={styles.button+" "+styles.secondary} disabled={busy} onClick={()=>void run(resumeSavedQuestion)}>Resume saved {subjectNames[savedOtherSubject.activity.subject]} question</button></div>}
      {courses.length ? <>
        <label className={styles.field}>Practice course<select value={courseId} disabled={busy} onChange={event => { setCourseId(event.target.value); setSelected(data.activities.find(item => item.courseId === event.target.value)?.id ?? ""); }}>{courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
        <div className={styles.courseQuestion}><label className={styles.field}>Question<select value={selected} disabled={busy} onChange={event => setSelected(event.target.value)}>{activities.map(activity => <option key={activity.id} value={activity.id}>{activity.title}</option>)}</select></label><button className={styles.button} disabled={busy || !selected} onClick={() => void run(start)}>Open question</button></div>
      </> : <p className={styles.notice}>Guided practice for this level is not available yet. Your class materials and Diana chat remain available.</p>}
      {active && state && <section className={styles.section} aria-label="Current practice">
        <div><p className={styles.label}>{data.courses.find(item => item.id === active.courseId)?.title}</p><h2 ref={questionHeading} tabIndex={-1} style={{ scrollMarginTop: 24 }}>{active.title}</h2></div>
        {paused && <p className={styles.notice}>This course version is paused for review. You can read and save your existing draft.</p>}<p className={styles.practicePrompt}>{active.prompt}</p>
        {active.graph && <CourseDataGraph graph={active.graph}/>}
        {active.sources.length > 0 && <div className={styles.coursePassages}>{active.sources.map(source => <section key={source.id} className={styles.section}><h3>{source.title}</h3><div className={styles.passage}>{source.text}</div></section>)}</div>}
        <ResponseRubric rubric={active.rubric}/>
        <label className={styles.field}>{modality === "typed" ? "Your response" : "Your transcription"}<textarea value={response} disabled={busy} maxLength={4000} onChange={event => { setResponse(event.target.value); setResponseEditRevision(value => value + 1); setFeedback(null); if (modality !== "typed")
                setConfirmed(false); setRecognitionProof(null); }}/></label>
        <details><summary>Working from handwriting or speech?</summary><label className={styles.field}>Response format<select value={modality} disabled={busy} onChange={event => { const origin = event.target.value as typeof modality; setModality(origin); setConfirmed(origin === "typed"); setFeedback(null); setRecognitionProof(null); }}><option value="typed">Typed work</option><option value="handwriting">Transcribed handwriting</option><option value="voice">Transcribed spoken work</option></select></label>
          {modality !== "typed"&&<LocalRecognitionCapture contextKey={`${state.id}:${state.exerciseVersionId}:${state.revision}:${responseEditRevision}`} kind={modality === "voice"?"speech":"handwriting_line"} disabled={busy} onDraft={(text,proof)=>{setResponse(text);setRecognitionProof(proof);setConfirmed(false);setFeedback(null);}}/>}
        </details>
        {modality !== "typed" && <label className={styles.confirmation}><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)}/>This transcription matches my work.</label>}
        <div className={styles.toolbar}>
          <button className={styles.button} disabled={busy || paused || !response.trim() || !confirmed} onClick={() => void run(() => respond("check"))}>{active.method === "writing_revision" ? "Review my draft" : active.method === "science_explanation" ? "Review my explanation" : (active.method === "reading_evidence" || active.method === "history_sources") ? "Check my evidence" : "Check my work"}</button>
          <button className={styles.button + " " + styles.secondary} disabled={busy || paused || !confirmed} onClick={() => void run(() => respond("hint"))}>Give me a hint</button>
          <button className={styles.button + " " + styles.secondary} disabled={busy || paused || !confirmed} onClick={() => void run(() => respond("example"))}>Show a similar example</button>
          <button className={styles.button + " " + styles.secondary} disabled={busy} onClick={() => void run(() => respond("save"))}>Save draft</button>
        </div>
        {feedback && <div className={styles.feedback} role="status"><h3>{feedback.title}</h3><p>{feedback.guidance}</p>{feedback.steps.length > 0 && <ul>{feedback.steps.map((step, index) => <li key={index}>{step}</li>)}</ul>}<p>{feedback.nextQuestion}</p><details><summary>About this feedback</summary>{feedback.limitations.map((item, index) => <p key={index}>{item}</p>)}</details></div>}
        {reviewReady && reviewSubject && state && <CourseResponseReviewRequest key={`${state.id}:${state.revision}`} recordId={state.id} revision={state.revision} subject={reviewSubject} disabled={busy}/>}
        {path && !paused && <nav aria-label="Practice path" className={styles.toolbar}>
          {path.nextId && <button className={styles.button + " " + styles.secondary} disabled={busy} onClick={() => void run(() => followPath(path.nextId!))}>Next question</button>}
          {path.transferId && <button className={styles.button + " " + styles.secondary} disabled={busy} onClick={() => void run(() => followPath(path.transferId!))}>Try a new context</button>}
          {path.returnId && <button className={styles.button + " " + styles.secondary} disabled={busy} onClick={() => void run(() => followPath(path.returnId!))}>Return to practice</button>}
        </nav>}
        <details><summary>What this practices</summary><p>{skill?.objective}</p>{!path && !!skill?.prerequisiteTitles.length && <p>Builds on {skill.prerequisiteTitles.join(", ")}</p>}
          {path && !paused && path.foundations.length > 0 && <ul>{path.foundations.map(foundation => <li key={foundation.skillId}>{foundation.activityId
            ? <button className={styles.button + " " + styles.secondary} disabled={busy} onClick={() => void run(() => followPath(foundation.activityId!))}>Review {foundation.title}</button>
            : <span>{foundation.title}: guided question not available yet.</span>}</li>)}</ul>}
          <p>{active.limits}</p><p>{active.publication === "published" ? "Original Diana practice. This course version has educator review." : "Original Diana practice. Educator review pending."}</p></details>
      </section>}
    </>}
    {busy && <p role="status">Saving your work…</p>}
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
  </div>;
}
