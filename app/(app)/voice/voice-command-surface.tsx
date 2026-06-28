"use client";

import { useMemo, useState } from "react";
import { AudioLines, BookOpenCheck, LockKeyhole, Mic2, ShieldCheck } from "lucide-react";
import { FutureModeToggle } from "@/components/future-mode-toggle";
import { VoiceTextarea } from "@/components/voice-textarea";

type VoicePlan = {
  subject: string;
  nextMove: string;
  reason: string;
};

type VoiceCandidate = {
  response: string;
  trace: {
    traceId?: string;
    queueMode?: string;
    readOnly: boolean;
    policyMode: string;
  };
};

type VoiceCandidateStatusResponse = {
  ok?: boolean;
  status?: "queued" | "running" | "succeeded" | "error" | "rate_limited";
  error?: string;
  response?: string;
  trace?: VoiceCandidate["trace"];
};

const QUEUED_POLL_ATTEMPTS = 10;
const QUEUED_POLL_DELAY_MS = 1500;

export function VoiceCommandSurface({ sidecarEnabled = false }: { sidecarEnabled?: boolean }) {
  const [transcript, setTranscript] = useState("");
  const [inputSource, setInputSource] = useState<"typed" | "voice">("typed");
  const [candidate, setCandidate] = useState<VoiceCandidate | null>(null);
  const [candidateStatus, setCandidateStatus] = useState<"idle" | "asking" | "ready" | "queued" | "blocked">("idle");
  const [candidateMessage, setCandidateMessage] = useState("");
  const plan = useMemo(() => buildVoicePlan(transcript), [transcript]);

  function addTranscript(chunk: string) {
    setTranscript((current) => [current.trim(), chunk.trim()].filter(Boolean).join(" "));
    setInputSource("voice");
    setCandidate(null);
    setCandidateStatus("idle");
    setCandidateMessage("");
  }

  function updateTranscript(value: string) {
    setTranscript(value);
    setInputSource("typed");
    setCandidate(null);
    setCandidateStatus("idle");
    setCandidateMessage("");
  }

  async function askForCandidate() {
    const text = transcript.trim();
    if (!text || candidateStatus === "asking") return;
    setCandidateStatus("asking");
    setCandidateMessage("");
    setCandidate(null);

    try {
      const response = await fetch("/api/diana/voice-candidate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transcript: text, source: inputSource }),
      });
      const data = await response.json().catch(() => null) as {
        ok?: boolean;
        queued?: boolean;
        error?: string;
        response?: string;
        trace?: VoiceCandidate["trace"];
      } | null;

      if (response.status === 202 && data?.ok && data.queued && data.trace?.traceId) {
        setCandidateStatus("queued");
        setCandidateMessage("Diana is preparing that request.");
        await pollQueuedCandidate(data.trace.traceId);
        return;
      }

      if (!response.ok || !data?.ok || !data.response || !data.trace) {
        setCandidateStatus("blocked");
        setCandidateMessage(data?.error ?? "Diana could not get a candidate right now.");
        return;
      }

      setCandidate({
        response: data.response,
        trace: data.trace,
      });
      setCandidateStatus("ready");
    } catch {
      setCandidateStatus("blocked");
      setCandidateMessage("Diana could not get a candidate right now.");
    }
  }

  async function pollQueuedCandidate(traceId: string) {
    for (let attempt = 0; attempt < QUEUED_POLL_ATTEMPTS; attempt += 1) {
      if (attempt > 0) {
        await delay(QUEUED_POLL_DELAY_MS);
      }

      const response = await fetch(`/api/diana/voice-candidate/status?traceId=${encodeURIComponent(traceId)}`);
      const data = await response.json().catch(() => null) as VoiceCandidateStatusResponse | null;

      if (response.ok && data?.ok && data.status === "succeeded" && data.response && data.trace) {
        setCandidate({
          response: data.response,
          trace: data.trace,
        });
        setCandidateStatus("ready");
        setCandidateMessage("");
        return;
      }

      if (response.ok && data?.ok && (data.status === "queued" || data.status === "running")) {
        setCandidateStatus("queued");
        setCandidateMessage("Diana is preparing that request.");
        continue;
      }

      setCandidateStatus("blocked");
      setCandidateMessage(data?.error ?? "Diana could not get a candidate right now.");
      return;
    }

    setCandidateStatus("queued");
    setCandidateMessage("Diana is still preparing that request.");
  }

  return (
    <div className="space-y-5">
      <header className="future-card future-command-surface rounded-3xl border border-brand/20 bg-surface-raised p-5 shadow-sm">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-strong dark:text-brand">
              Voice-first thinking
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight">Talk it through</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Say what feels stuck. Diana turns it into one student-owned academic move and keeps the source as your voice note.
            </p>
          </div>
          <FutureModeToggle />
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <div className="future-card rounded-3xl border border-border bg-surface-raised p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="future-mic flex size-10 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <Mic2 size={18} />
            </span>
            <div>
              <h2 className="text-base font-semibold">Voice capture</h2>
              <p className="text-sm text-muted">Choose a mic, check the level, then use the visible recording controls. Text fallback always works.</p>
            </div>
          </div>
          <VoiceTextarea
            provider="openai"
            showDeviceStatus
            value={transcript}
            onChange={(event) => updateTranscript(event.target.value)}
            onTranscript={addTranscript}
            rows={8}
            className="w-full rounded-2xl border border-border bg-surface px-3 py-3 text-sm leading-6"
            placeholder="Example: I understand the evidence, but I do not know how to start the first sentence."
          />
        </div>

        <aside className="future-card rounded-3xl border border-border bg-surface-raised p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <AudioLines size={17} className="text-subject-science" />
            <h2 className="text-base font-semibold">What Diana can do next</h2>
          </div>

          <div className="mt-4 space-y-3">
            <VoiceProof icon={BookOpenCheck} label="Source" value="Your voice note" />
            <VoiceProof icon={ShieldCheck} label="Subject read" value={plan.subject} />
            <VoiceProof icon={LockKeyhole} label="Boundary" value="Diana gives the next move, not final work." />
          </div>

          <div className="mt-4 rounded-2xl border border-subject-science/30 bg-subject-science/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Next academic move</p>
            <p className="mt-2 text-sm font-semibold">{plan.nextMove}</p>
            <p className="mt-2 text-sm text-muted">{plan.reason}</p>
          </div>

          {sidecarEnabled && (
            <div className="mt-4 rounded-2xl border border-brand/25 bg-brand/10 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Diana candidate</p>
                  <p className="mt-2 text-sm text-muted">Ask for one read-only next move from your words.</p>
                </div>
                <button
                  type="button"
                  disabled={!transcript.trim() || candidateStatus === "asking" || candidateStatus === "queued"}
                  onClick={() => void askForCandidate()}
                  className="touch-target inline-flex items-center justify-center rounded-xl border border-brand/30 bg-surface-raised px-3 py-2 text-xs font-semibold text-brand-strong hover:bg-brand/10 disabled:opacity-50"
                >
                  {candidateStatus === "asking" ? "Asking" : candidateStatus === "queued" ? "Preparing" : "Ask Diana"}
                </button>
              </div>

              {candidate && (
                <div className="mt-3 rounded-xl border border-border bg-surface-raised p-3">
                  <p className="text-sm font-semibold">{candidate.response}</p>
                  <p className="mt-2 text-xs text-muted">
                    Read-only candidate. Diana keeps the receipt before showing it.
                  </p>
                </div>
              )}

              {candidateStatus === "blocked" && candidateMessage && (
                <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-50 p-2 text-xs text-amber-950 dark:bg-amber-400/10 dark:text-amber-100">
                  {candidateMessage}
                </p>
              )}

              {candidateStatus === "queued" && candidateMessage && (
                <p className="mt-3 rounded-xl border border-brand/25 bg-brand/10 p-2 text-xs font-medium text-brand-strong dark:text-brand">
                  {candidateMessage}
                </p>
              )}
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function VoiceProof({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpenCheck;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 gap-3 rounded-2xl border border-border bg-surface/70 p-3">
      <Icon size={17} className="mt-0.5 shrink-0 text-brand" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
        <p className="mt-1 text-sm">{value}</p>
      </div>
    </div>
  );
}

function buildVoicePlan(transcript: string): VoicePlan {
  const text = transcript.toLowerCase();
  if (!text.trim()) {
    return {
      subject: "Waiting for your words",
      nextMove: "Say the assignment and the first part that feels stuck.",
      reason: "Diana needs your source before it can anchor a next step.",
    };
  }

  if (text.includes("math") || text.includes("equation") || text.includes("solve")) {
    return {
      subject: "Math step board",
      nextMove: "Write what is given, what you need to find, and the operation you think fits.",
      reason: "This keeps the first move visible without solving the problem for you.",
    };
  }

  if (text.includes("essay") || text.includes("claim") || text.includes("paragraph") || text.includes("conclusion")) {
    return {
      subject: "Writing studio",
      nextMove: "Write one rough claim sentence using your evidence, then ask Diana to check the structure.",
      reason: "The sentence stays yours; Diana can help with claim, evidence, and reasoning.",
    };
  }

  if (text.includes("read") || text.includes("chapter") || text.includes("paragraph")) {
    return {
      subject: "Reading map",
      nextMove: "Mark the paragraph that seems most important and say what it is mostly about.",
      reason: "The helper can anchor questions and cards to that part of the text.",
    };
  }

  return {
    subject: "General next move",
    nextMove: "Name the deliverable, then do the smallest visible part you can complete in five minutes.",
    reason: "This reduces choices while still giving you a concrete academic action.",
  };
}
