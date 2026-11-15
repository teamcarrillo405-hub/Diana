"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";

const uuid = z.string().uuid();
const requestSchema = z.object({ id: uuid, createdAt: z.string(), expiresAt: z.string(), revokedAt: z.string().nullable() }).passthrough();
const listSchema = z.object({ requests: z.array(requestSchema) });
const criterionSchema = z.object({ id: z.string(), title: z.string(), descriptors: z.tuple([z.string(), z.string(), z.string(), z.string()]) });
const packetSchema = z.object({
  response: z.string(), prompt: z.string(), sources: z.array(z.object({ title: z.string(), text: z.string() }).passthrough()),
  rubric: z.object({ criteria: z.array(criterionSchema) }),
});
const detailSchema = z.object({ owner: z.literal(false), packet: packetSchema });
type Criterion = z.infer<typeof criterionSchema>;
type Evidence = { start: number; end: number; exactText: string };
type Draft = { score: number | null; rationale: string; evidence: Evidence[] };

export function CourseResponseReviewRater() {
  const [requests, setRequests] = useState<z.infer<typeof requestSchema>[]>([]);
  const [selected, setSelected] = useState("");
  const [packet, setPacket] = useState<z.infer<typeof packetSchema> | null>(null);
  const [draft, setDraft] = useState<Record<string, Draft>>({});
  const [activeCriterion, setActiveCriterion] = useState("");
  const [noConflict, setNoConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const responseRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/learning/response-review?role=reviewer", { cache: "no-store", signal: controller.signal })
      .then(async response => response.ok ? listSchema.parse(await response.json()).requests : [])
      .then(rows => { if (!controller.signal.aborted) setRequests(rows.filter(row => !row.revokedAt && Date.parse(row.expiresAt) > Date.now())); })
      .catch(() => { if (!controller.signal.aborted) setRequests([]); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selected) { setPacket(null); return; }
    const controller = new AbortController();
    setPacket(null); setDraft({}); setActiveCriterion(""); setNoConflict(false); setNotice("");
    void fetch(`/api/learning/response-review?id=${encodeURIComponent(selected)}`, { cache: "no-store", signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error("unavailable"); return detailSchema.parse(await response.json()).packet; })
      .then(item => { if (!controller.signal.aborted) { setPacket(item); setActiveCriterion(item.rubric.criteria[0]?.id ?? ""); } })
      .catch(() => { if (!controller.signal.aborted) setNotice("This response review is unavailable. Choose another request or refresh the page."); });
    return () => controller.abort();
  }, [selected]);

  if (!requests.length && !notice) return null;
  const criteria = packet?.rubric.criteria ?? [];
  function change(criterionId: string, patch: Partial<Draft>) {
    setDraft(current => ({ ...current, [criterionId]: { ...(current[criterionId] ?? { score: null, rationale: "", evidence: [] }), ...patch } }));
  }
  function addSelection() {
    if (!packet || !activeCriterion || !responseRef.current) return;
    const { selectionStart: start, selectionEnd: end } = responseRef.current;
    if (end <= start || end - start > 4000) { setNotice("Select a short passage in the response first."); return; }
    const exactText = packet.response.slice(start, end);
    if (!exactText) return;
    const existing = draft[activeCriterion]?.evidence ?? [];
    if (existing.length >= 6) { setNotice("This criterion already has six selections."); return; }
    change(activeCriterion, { evidence: [...existing, { start, end, exactText }] });
    setNotice("Response evidence added to the selected criterion.");
  }
  const complete = !!packet && criteria.length >= 2 && noConflict && criteria.every(item => {
    const entry = draft[item.id];
    return entry && entry.score !== null && entry.rationale.trim().length >= 20 &&
      (entry.score === 0 || entry.evidence.length > 0);
  });
  async function submit() {
    if (!complete || !packet || !selected || busy) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/learning/response-review", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rateDraft", requestId: selected, noConflict: true,
          criteria: criteria.map(item => ({ criterionId: item.id, ...draft[item.id], rationale: draft[item.id].rationale.trim() })) }),
      });
      if (!response.ok) throw new Error("unavailable");
      z.object({ ratingId: uuid }).parse(await response.json());
      setRequests(current => current.filter(row => row.id !== selected));
      setSelected(""); setPacket(null);
      setNotice("Your independent review was recorded.");
    } catch {
      setNotice("The review could not be recorded. The request or your reviewer access may have changed.");
    } finally { setBusy(false); }
  }

  return <section aria-label="Response rating">
    <h2>Review a saved response</h2>
    {!!requests.length && <label>Response request<select value={selected} disabled={busy} onChange={event => setSelected(event.target.value)}>
      <option value="">Choose a response</option>
      {requests.map((item, index) => <option key={item.id} value={item.id}>Response {index + 1} · {new Date(item.createdAt).toLocaleDateString()}</option>)}
    </select></label>}
    {packet && <>
      <h3>Task</h3><p>{packet.prompt}</p>
      {packet.sources.map((source, index) => <details key={`${source.title}:${index}`}><summary>{source.title}</summary><p>{source.text}</p></details>)}
      <label>Saved response<textarea ref={responseRef} value={packet.response} readOnly rows={7} aria-label="Saved response text" /></label>
      <p>Select words in the saved response, choose a criterion, then add the selection as evidence.</p>
      <label>Evidence for<select value={activeCriterion} onChange={event => setActiveCriterion(event.target.value)}>
        {criteria.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select></label>
      <button type="button" disabled={!activeCriterion || busy} onClick={addSelection}>Add selected response text</button>
      {criteria.map((item: Criterion) => <fieldset key={item.id} disabled={busy}>
        <legend>{item.title}</legend>
        <label>Descriptor<select value={draft[item.id]?.score ?? ""} onChange={event => change(item.id, { score: event.target.value === "" ? null : Number(event.target.value) })}>
          <option value="">Choose a descriptor</option>
          {item.descriptors.map((description, score) => <option key={score} value={score}>{description}</option>)}
        </select></label>
        <label>Reason for this descriptor<textarea value={draft[item.id]?.rationale ?? ""} minLength={20} maxLength={2000} onChange={event => change(item.id, { rationale: event.target.value })} /></label>
        {(draft[item.id]?.evidence ?? []).map((span, index) => <p key={`${span.start}:${span.end}:${index}`}>
          Evidence {index + 1}: “{span.exactText}” <button type="button" onClick={() => change(item.id, { evidence: draft[item.id].evidence.filter((_, position) => position !== index) })}>Remove</button>
        </p>)}
        <p>A positive descriptor needs at least one selection from the saved response.</p>
      </fieldset>)}
      <label><input type="checkbox" checked={noConflict} disabled={busy} onChange={event => setNoConflict(event.target.checked)} />I reviewed this response independently and have no conflict of interest.</label>
      <button type="button" disabled={!complete || busy} onClick={() => void submit()}>Record independent review</button>
      <p>This review describes one response. It does not assign a course grade or establish mastery.</p>
    </>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
