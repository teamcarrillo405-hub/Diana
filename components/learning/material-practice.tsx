"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { evidenceAnchorSchema } from "@/lib/learning-engine/contracts";
import { problemStateSchema, type ProblemState } from "@/lib/learning-engine/problem-state";
import { courseFeedbackSchema, type CourseFeedback } from "@/lib/learning-engine/course-feedback";
import { LEVEL_LABELS } from "@/lib/learning-engine/course-domains";
import { materialDestination } from "@/lib/learning-engine/material-navigation";
import { responseRubricSchema } from "@/lib/learning-engine/response-rubric";
import { ResponseRubric } from "./response-rubric";
import type { MaterialBinding } from "@/lib/learning-engine/material-activity";
import styles from "./learning-material.module.css";
const passageSchema = z.object({ id: z.string(), title: z.string(), text: z.string(), documentId: z.string(), anchor: evidenceAnchorSchema });
const activitySchema = z.object({ id: z.string(), title: z.string(), prompt: z.string(), limits: z.string(), rubric: responseRubricSchema.nullable().optional(), criteria: z.array(z.string()), sources: z.array(passageSchema) });
const dataSchema = z.object({ title: z.string(),documentId:z.string(), subject: z.string(), pages: z.array(z.object({ page: z.number(), label: z.string() })), passages: z.array(passageSchema), competencySuggestions: z.array(z.object({skillId:z.string(),title:z.string(),blockId:z.string(),matchedTerms:z.array(z.string()),mappingHash:z.string(),status:z.literal("proposed")})).default([]), limited: z.boolean(), searchLimited: z.boolean(), excluded: z.number(), recent: z.array(z.object({ id: z.string(), updated_at: z.string() })), session: problemStateSchema.nullable(), activity: activitySchema.nullable() });
type Passage = z.infer<typeof passageSchema>;
type Activity = z.infer<typeof activitySchema>;
type Data = z.infer<typeof dataSchema>;
async function read(url: string, signal?: AbortSignal) { const result = await fetch(url, { cache: "no-store", signal }), value = await result.json(); if (!result.ok)
    throw new Error(value.error || "Practice could not load."); return dataSchema.parse(value); }
export function MaterialPractice({ classId, assignmentId, versionId, initialPage = 1, initialSessionId }: {
    classId: string;
    assignmentId: string;
    versionId: string;
    initialPage?: number;
    initialSessionId?: string;
}) {
    const router = useRouter(), [data, setData] = useState<Data | null>(null), [page, setPage] = useState(initialPage), [query, setQuery] = useState("");
    const [selected, setSelected] = useState<Passage[]>([]), [task, setTask] = useState<MaterialBinding["task"]>("read"), [level, setLevel] = useState<MaterialBinding["level"]>("middle_school");
    const [state, setState] = useState<ProblemState | null>(null), [activity, setActivity] = useState<Activity | null>(null), [response, setResponse] = useState("");
    const [modality, setModality] = useState<"typed" | "handwriting" | "voice">("typed"), [confirmed, setConfirmed] = useState(true), [feedback, setFeedback] = useState<CourseFeedback | null>(null);
    const [busy, setBusy] = useState(true), [notice, setNotice] = useState("");
    const pending = useRef<{
        key: string;
        id: string;
        requestId: string;
    } | null>(null);
    const base = "/api/learning/material-practice?" + new URLSearchParams({ classId, assignmentId, versionId });
    const saved = state?.observations.find(item => item.id === "response"), dirty = !!state && (response !== (saved?.text ?? "") || (!!response && modality !== (saved?.modality ?? "typed")));
    useEffect(() => {
        const controller = new AbortController();
        setBusy(true);
        void read(base + "&page=" + initialPage + (initialSessionId ? "&sessionId=" + initialSessionId : ""), controller.signal).then(value => {
            if (controller.signal.aborted)
                return;
            setData(value);
            if (value.subject === "science")
                setTask("explain");
            if (value.session && value.activity)
                restore(value.session, value.activity);
        }).catch(error => { if (!controller.signal.aborted)
            setNotice(error.message); }).finally(() => { if (!controller.signal.aborted)
            setBusy(false); });
        return () => controller.abort();
    }, [base, initialPage, initialSessionId]);
    useEffect(() => { if (!dirty)
        return; const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); }; window.addEventListener("beforeunload", prevent); return () => window.removeEventListener("beforeunload", prevent); }, [dirty]);
    function restore(next: ProblemState, current: Activity) { setState(next); setActivity(current); setFeedback(null); const answer = next.observations.find(item => item.id === "response"), origin = answer?.modality; setResponse(answer?.text ?? ""); setModality(origin === "voice" || origin === "handwriting" ? origin : "typed"); setConfirmed(!origin || origin === "typed"); }
    function locate(sessionId?: string) { const url = new URL(window.location.href); if (sessionId)
        url.searchParams.set("sessionId", sessionId);
    else
        url.searchParams.delete("sessionId"); router.replace(url.pathname+url.search,{scroll:false}); }
    async function run(action: () => Promise<void>) { setBusy(true); setNotice(""); try {
        await action();
    }
    catch (error) {
        setNotice(error instanceof Error ? error.message : "Practice is unavailable.");
    }
    finally {
        setBusy(false);
    } }
    async function send(body: Record<string, unknown>) {
        const key = JSON.stringify(body);
        if (pending.current?.key !== key)
            pending.current = { key, id: crypto.randomUUID(), requestId: crypto.randomUUID() };
        const result = await fetch("/api/learning/material-practice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, ...(body.action === "start" ? { id: pending.current.id } : {}), requestId: pending.current.requestId }) }), value = await result.json();
        if (!result.ok)
            throw new Error(value.error || "Your work could not save. Try again.");
        const parsed = z.object({ state: problemStateSchema, activity: activitySchema.optional(), feedback: courseFeedbackSchema.optional() }).parse(value);
        pending.current = null;
        return parsed;
    }
    async function respond(mode: "save" | "check" | "hint" | "example") {
        if (!state)
            return;
        const result = await send({ action: "respond", id: state.id, expectedRevision: state.revision, mode, response, confirmed, modality });
        setState(result.state);
        setFeedback(result.feedback ?? null);
    }
    async function leave() {
        if (dirty) await respond("save");
        const source=activity?.sources[0];
        router.push(source?sourceUrl(source):materialDestination(assignmentId,classId,data?.documentId)+(data?"&version="+versionId+"&page="+page:""));
    }
    async function loadPassages(nextPage: number, search: string) { const value = await read(base + "&page=" + nextPage + (search ? "&query=" + encodeURIComponent(search) : "")); setData(value); setPage(nextPage); }
    async function start() { if (dirty)
        await respond("save"); const result = await send({ action: "start", classId, assignmentId, binding: { version: "material-practice-v1", task, level, passages: selected.map(item => ({ versionId: item.anchor.versionId, blockId: item.anchor.blockId })) } }); if (!result.activity)
        throw new Error("Practice could not load."); restore(result.state, result.activity); locate(result.state.id); }
    async function resume(id: string) { if (dirty)
        await respond("save"); const value = await read(base + "&sessionId=" + id); if (!value.session || !value.activity)
        throw new Error("Saved practice is unavailable."); restore(value.session, value.activity); locate(id); }
    function sourceUrl(source: Passage) { return materialDestination(assignmentId, classId, source.documentId) + "&version=" + source.anchor.versionId + "&page=" + source.anchor.location.page; }
    return <div className={styles.coursePractice}>
    <div className={styles.toolbar}><button className={styles.button + " " + styles.secondary} disabled={busy} onClick={() => void run(leave)}>Back to materials</button>{activity && <button className={styles.button + " " + styles.secondary} disabled={busy} onClick={() => void run(async () => { if (dirty)
        await respond("save"); setActivity(null); setState(null); setFeedback(null); setResponse(""); setSelected([]); locate(); await loadPassages(page, query); })}>Choose new passages</button>}</div>
    {!activity && data && <>
      <h2>{data.title}</h2>
      <div className={styles.courseSelectors}><label className={styles.field}>Practice<select value={task} disabled={busy} onChange={event => setTask(event.target.value as MaterialBinding["task"])}><option value="read">Read with evidence</option><option value="revise">Build an argument</option><option value="explain">Explain scientific evidence</option></select></label><label className={styles.field}>Course level<select value={level} disabled={busy} onChange={event => setLevel(event.target.value as MaterialBinding["level"])}>{(["middle_school", "high_school", "college_intro"] as const).map(value => <option key={value} value={value}>{LEVEL_LABELS[value]}</option>)}</select></label></div>
      <div className={styles.bookSearch}><label className={styles.field}>Find a passage<input value={query} disabled={busy} maxLength={1000} onChange={event => setQuery(event.target.value)}/></label><button className={styles.button} disabled={busy || !query.trim()} onClick={() => void run(() => loadPassages(page, query))}>Search material</button></div>
      <label className={styles.field}>Page<select value={page} disabled={busy} onChange={event => { const next = Number(event.target.value); setQuery(""); void run(() => loadPassages(next, "")); }}>{data.pages.map(item => <option key={item.page} value={item.page}>{item.label}</option>)}</select></label>
      <p className={styles.label}>Choose up to three passages. Feedback checks quotation wording and offers revision questions.</p>
      <div className={styles.bookMatches}>{data.passages.map((passage, index) => <article key={passage.id}><label className={styles.confirmation}><input type="checkbox" checked={selected.some(item => item.id === passage.id)} disabled={busy || selected.length === 3 && !selected.some(item => item.id === passage.id)} onChange={event => setSelected(items => event.target.checked ? [...items, passage] : items.filter(item => item.id !== passage.id))}/>{passage.title} · Passage {index + 1}</label><p className={styles.bookQuote}>{passage.text}</p></article>)}</div>
      {!data.passages.length && <p>No eligible text passages here. Try another page or confirm the text in Materials.</p>}
      {data.competencySuggestions.length > 0 && <details><summary>Suggested skills</summary><p>Matched by source wording. Educator review is needed before using these as course alignment.</p><ul>{data.competencySuggestions.map(item=><li key={item.mappingHash}>{item.title}: {item.matchedTerms.join(", ")}</li>)}</ul></details>}{(data.limited || data.searchLimited || data.excluded > 0) && <details><summary>Passage coverage</summary>{data.limited && <p>Showing up to 50 blocks on this page. Search for a phrase to narrow the selection.</p>}{data.searchLimited && <p>These are the top matching passages from this source version. Search does not cover every passage.</p>}{data.excluded > 0 && <p>Headings, tables, diagrams and unconfirmed text are excluded from this practice.</p>}</details>}
      {selected.length > 0 && <div><h3>Selected passages ({selected.length}/3)</h3>{selected.map(item => <div key={item.id} className={styles.toolbar}><span>{item.title}: {item.text.slice(0, 80)}…</span><button className={styles.button + " " + styles.secondary} disabled={busy} onClick={() => setSelected(items => items.filter(value => value.id !== item.id))} aria-label={"Remove passage " + item.text.slice(0, 40)}>Remove</button></div>)}</div>}
      <button className={styles.button + " " + styles.practiceToggle} disabled={busy || !selected.length} onClick={() => void run(start)}>Start practice</button>
      {!!data.recent.length && <details><summary>Recent saved practice</summary><p className={styles.label}>The ten most recent sessions for this assignment.</p>{data.recent.map(item => <button key={item.id} className={styles.button + " " + styles.secondary} disabled={busy} onClick={() => void run(() => resume(item.id))}>Open {new Date(item.updated_at).toLocaleString()}</button>)}</details>}
    </>}
    {activity && <>
      <h2>{activity.title}</h2><p className={styles.practicePrompt}>{activity.prompt}</p>
      <div className={styles.coursePassages}>{activity.sources.map(source => <article key={source.id}><h3>{source.title}</h3><p className={styles.passage}>{source.text}</p><a href={sourceUrl(source)} target="_blank" rel="noopener noreferrer">Open source page</a></article>)}</div>
      <ResponseRubric rubric={activity.rubric}/>
      <label className={styles.field}>Response format<select value={modality} disabled={busy} onChange={event => { const next = event.target.value as typeof modality; setModality(next); setConfirmed(next === "typed"); setFeedback(null); }}><option value="typed">Typed response</option><option value="handwriting">Transcribed handwriting</option><option value="voice">Transcribed speech</option></select></label>
      {modality !== "typed" && <p className={styles.label}>Enter the transcription, then confirm it matches your original work.</p>}
      <label className={styles.field}>Your response<textarea value={response} disabled={busy} maxLength={4000} onChange={event => { setResponse(event.target.value); setFeedback(null); if (modality !== "typed")
            setConfirmed(false); }}/></label>
      {modality !== "typed" && <label className={styles.confirmation}><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)}/>This transcription matches my work</label>}
      <div className={styles.toolbar}><button className={styles.button} disabled={busy || !response.trim() || !confirmed} onClick={() => void run(() => respond("check"))}>Review my response</button><button className={styles.button + " " + styles.secondary} disabled={busy || !dirty} onClick={() => void run(() => respond("save"))}>Save draft</button><button className={styles.button + " " + styles.secondary} disabled={busy || !confirmed} onClick={() => void run(() => respond("hint"))}>Get a hint</button><button className={styles.button + " " + styles.secondary} disabled={busy || !confirmed} onClick={() => void run(() => respond("example"))}>Different example</button></div>
      <p className={styles.label}>{dirty ? "Unsaved changes" : "Saved"}</p>
      {feedback && <section className={styles.feedback} aria-label="Practice feedback" role="status"><h3>{feedback.title}</h3><p>{feedback.guidance}</p><ul>{feedback.steps.map((step, index) => <li key={index}>{step}</li>)}</ul>{feedback.quotes.filter(item => item.anchor).map((quote, index) => { const source = activity.sources.find(item => item.id === quote.sourceId); return source ? <p key={index}><a href={sourceUrl(source)} target="_blank" rel="noopener noreferrer">“{quote.quote}” · {quote.anchor!.location.pageLabel}</a></p> : null; })}<p>{feedback.nextQuestion}</p><details><summary>How this was checked</summary>{feedback.limitations.map((text, index) => <p key={index}>{text}</p>)}</details></section>}
    </>}
    {busy && <p role="status">Loading…</p>}{notice && <p role="alert" className={styles.notice}>{notice}</p>}
  </div>;
}
