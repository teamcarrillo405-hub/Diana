"use client";

import { useEffect, useState } from "react";
import { z } from "zod";

const invitationSchema = z.object({
  id: z.string().uuid(), displayLabel: z.string().min(1).max(160),
  subject: z.enum(["reading", "english", "science", "history"]),
  expiresAt: z.string().datetime({ offset: true }), acceptedAt: z.string().datetime({ offset: true }).nullable(),
}).strict();
type Invitation = z.infer<typeof invitationSchema>;
const listSchema = z.object({ invitations: z.array(invitationSchema) });
const subjectName: Record<Invitation["subject"], string> = {
  reading: "Reading", english: "English", science: "Science", history: "History",
};

export function CourseResponseReviewInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  async function load(signal?: AbortSignal) {
    const response = await fetch("/api/learning/response-review?invitations=1&role=reviewer", { cache: "no-store", signal });
    if (!response.ok) { setInvitations([]); return; }
    const parsed = listSchema.parse(await response.json());
    if (!signal?.aborted) setInvitations(parsed.invitations.filter(item => Date.parse(item.expiresAt) > Date.now()));
  }
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).catch(() => { if (!controller.signal.aborted) setInvitations([]); });
    return () => controller.abort();
  }, []);

  if (!invitations.length) return null;
  async function accept(invitation: Invitation) {
    if (busy || invitation.acceptedAt) return;
    setBusy(invitation.id); setNotice("");
    try {
      const response = await fetch("/api/learning/response-review", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept", invitationId: invitation.id }),
      });
      if (!response.ok || !z.object({ accepted: z.literal(true) }).safeParse(await response.json()).success)
        throw new Error("accept_unavailable");
      setInvitations(current => current.map(item => item.id === invitation.id ? { ...item, acceptedAt: new Date().toISOString() } : item));
      setNotice("Invitation accepted.");
      await load().catch(() => { /* The accepted state remains visible if the refresh is interrupted. */ });
    } catch {
      setNotice("This invitation changed or expired. Please refresh the page for current invitations.");
    } finally { setBusy(null); }
  }

  return <section aria-label="Response review invitations">
    <h2>Response review invitations</h2>
    <p>Each invitation is for one saved response review. Accepting does not show student work yet.</p>
    {invitations.map(item => <div key={item.id}>
      <p>{item.displayLabel} · {subjectName[item.subject]} · Expires {new Date(item.expiresAt).toLocaleDateString()}</p>
      {item.acceptedAt ? <p>Accepted. Waiting for a response request.</p>
        : <button disabled={busy !== null} onClick={() => void accept(item)}>Accept invitation</button>}
    </div>)}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
