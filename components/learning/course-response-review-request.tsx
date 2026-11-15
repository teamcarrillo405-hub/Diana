"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import styles from "./learning-material.module.css";

const choiceSchema = z.object({
  id: z.string().uuid(),
  displayLabel: z.string().min(1).max(160),
  subject: z.enum(["reading", "english", "science", "history"]),
  expiresAt: z.string().datetime({ offset: true }),
  acceptedAt: z.string().datetime({ offset: true }).nullable(),
}).strict();
const listSchema = z.object({ invitations: z.array(choiceSchema) });
const ownerListSchema = z.object({ requests: z.array(z.object({
  id: z.string().uuid(), recordId: z.string().uuid(), revision: z.number().int().positive(),
  expiresAt: z.string().datetime({ offset: true }), revokedAt: z.string().datetime({ offset: true }).nullable(),
})) });
const detailSchema = z.object({ owner: z.literal(true), report: z.object({
  status: z.enum(["invalid", "incomplete", "review_complete"]),
  agreement: z.object({ pairedCriteria: z.number().int(), agreedCriteria: z.number().int(), exactRate: z.number().nullable() }),
  rows: z.array(z.object({ status: z.enum(["invalid", "pending", "agreed", "adjudicated", "disagreement"]),
    criteria: z.array(z.object({ criterionId: z.string(), score: z.number().int().nullable(), rationale: z.string() }).passthrough()).nullable() })),
}), packet: z.object({ rubric: z.object({ criteria: z.array(z.object({ id: z.string(), title: z.string(), descriptors: z.tuple([z.string(), z.string(), z.string(), z.string()]) })) }) }) });
type Choice = z.infer<typeof choiceSchema>;
type Detail = z.infer<typeof detailSchema>;
async function currentChoices(subject: "reading" | "english" | "science" | "history", signal?: AbortSignal) {
  const result = await fetch("/api/learning/response-review?invitations=1&role=owner", { signal, cache: "no-store" });
  if (!result.ok) return [];
  const value = listSchema.parse(await result.json()), now = Date.now();
  return value.invitations.filter(item => item.subject === subject && item.acceptedAt && Date.parse(item.expiresAt) > now);
}

export function CourseResponseReviewRequest({ recordId, revision, subject, disabled = false }: {
  recordId: string;
  revision: number;
  subject: "reading" | "english" | "science" | "history";
  disabled?: boolean;
}) {
  const [choices, setChoices] = useState<Choice[]>([]);
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [consent, setConsent] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setChoices([]); setFirst(""); setSecond(""); setConsent(false); setRequestId(null); setDetail(null); setMessage("");
    void (async () => {
      const list = await fetch("/api/learning/response-review?role=owner", { signal: controller.signal, cache: "no-store" });
      if (!list.ok) return;
      const value = ownerListSchema.parse(await list.json());
      if (controller.signal.aborted) return;
      const active = value.requests.find(item => item.recordId === recordId && item.revision === revision &&
        item.revokedAt === null && Date.parse(item.expiresAt) > Date.now());
      if (active) { setRequestId(active.id); return; }
      const accepted = await currentChoices(subject, controller.signal);
      if (!controller.signal.aborted && accepted.length >= 2) setChoices(accepted);
    })().catch(() => { /* Review may be disabled or unavailable. Keep the practice flow clear. */ });
    return () => controller.abort();
  }, [recordId, revision, subject]);

  async function loadReport(id: string, signal?: AbortSignal) {
    const result = await fetch(`/api/learning/response-review?id=${encodeURIComponent(id)}`, { signal, cache: "no-store" });
    if (!result.ok) throw new Error("review_unavailable");
    const parsed = detailSchema.parse(await result.json());
    if (!signal?.aborted) setDetail(parsed);
  }
  useEffect(() => {
    if (!requestId) { setDetail(null); return; }
    const controller = new AbortController();
    void loadReport(requestId, controller.signal).catch(() => {
      if (!controller.signal.aborted) setMessage("The latest review status is unavailable. Your response remains saved.");
    });
    return () => controller.abort();
  }, [requestId]);

  if (choices.length < 2 && !requestId) return null;

  async function submit(action: "request" | "revoke") {
    if (busy || disabled) return;
    const firstChoice = first === "" ? null : choices[Number(first)];
    const secondChoice = second === "" ? null : choices[Number(second)];
    if (action === "request" && (!consent || !firstChoice || !secondChoice || first === second ||
      !firstChoice.acceptedAt || !secondChoice.acceptedAt)) return;
    if (action === "request" && (Date.parse(firstChoice!.expiresAt) <= Date.now() || Date.parse(secondChoice!.expiresAt) <= Date.now())) {
      setMessage("An educator invitation expired. Reload this question for current choices.");
      return;
    }
    if (action === "revoke" && !requestId) return;
    setBusy(true); setMessage("");
    try {
      const body = action === "request"
        ? { action, recordId, revision, invitationIds: [firstChoice!.id, secondChoice!.id], consent: true }
        : { action, requestId };
      const result = await fetch("/api/learning/response-review", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!result.ok) throw new Error("review_unavailable");
      const value = await result.json();
      if (action === "request") {
        const parsed = z.object({ requestId: z.string().uuid() }).parse(value);
        setRequestId(parsed.requestId);
      } else {
        z.object({ revoked: z.literal(true) }).parse(value);
        setRequestId(null); setDetail(null); setConsent(false); setFirst(""); setSecond(""); setChoices([]);
        try {
          const accepted = await currentChoices(subject);
          if (accepted.length >= 2) setChoices(accepted);
        } catch { /* One-use invitations may no longer be available. */ }
      }
    } catch {
      setMessage(action === "request"
        ? "The review request could not be sent. The educators or saved response may have changed. Your work is still saved. Reload this question to choose again."
        : "The review request could not be withdrawn. Please try again.");
    } finally { setBusy(false); }
  }

  return <section className={styles.section} aria-label="Educator response review">
    <h3>Educator review</h3>
    {requestId ? <>
      <p>Request sent to two educators.</p>
      {detail && <div aria-label="Response review report">
        <p>{detail.report.status === "review_complete" ? "Educator review complete." :
          detail.report.status === "invalid" ? "Review needs operator attention." : "Waiting for both independent reviews."}</p>
        {detail.report.agreement.pairedCriteria > 0 && <p>Educators agreed on {detail.report.agreement.agreedCriteria} of {detail.report.agreement.pairedCriteria} rubric criteria.</p>}
        {detail.report.status === "review_complete" && detail.report.rows[0]?.criteria?.map(item => {
          const criterion = detail.packet.rubric.criteria.find(row => row.id === item.criterionId);
          return <div key={item.criterionId}><h4>{criterion?.title ?? item.criterionId}</h4>
            <p>{item.score !== null ? criterion?.descriptors[item.score] : "A descriptor is not available."}</p>
            <p>{item.rationale}</p></div>;
        })}
        <p>This describes agreement on this response. It is not a course grade or a claim of mastery.</p>
      </div>}
      <button className={styles.button + " " + styles.secondary} disabled={busy || disabled} onClick={() => {
        setMessage(""); void loadReport(requestId).catch(() => setMessage("The latest review status is unavailable. Please try again."));
      }}>Refresh review status</button>
      <button className={styles.button + " " + styles.secondary} disabled={busy || disabled} onClick={() => void submit("revoke")}>Withdraw request</button>
    </> : <>
      <p>Choose two educators to review this saved response.</p>
      <div className={styles.courseSelectors}>
        <label className={styles.field}>First educator<select value={first} disabled={busy || disabled} onChange={event => { setFirst(event.target.value); setConsent(false); }}>
          <option value="">Choose an educator</option>{choices.map((item, index) => <option key={item.id} value={index}>{item.displayLabel}</option>)}
        </select></label>
        <label className={styles.field}>Second educator<select value={second} disabled={busy || disabled} onChange={event => { setSecond(event.target.value); setConsent(false); }}>
          <option value="">Choose an educator</option>{choices.map((item, index) => index.toString() !== first && <option key={item.id} value={index}>{item.displayLabel}</option>)}
        </select></label>
      </div>
      <label className={styles.confirmation}><input type="checkbox" checked={consent} disabled={busy || disabled} onChange={event => setConsent(event.target.checked)}/>I agree to share this saved response with these educators for review.</label>
      <button className={styles.button} disabled={busy || disabled || !consent || !first || !second || first === second} onClick={() => void submit("request")}>Request educator review</button>
    </>}
    {message && <p className={styles.notice} role="status">{message}</p>}
  </section>;
}
