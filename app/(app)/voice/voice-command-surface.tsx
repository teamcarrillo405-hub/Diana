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

export function VoiceCommandSurface() {
  const [transcript, setTranscript] = useState("");
  const plan = useMemo(() => buildVoicePlan(transcript), [transcript]);

  function addTranscript(chunk: string) {
    setTranscript((current) => [current.trim(), chunk.trim()].filter(Boolean).join(" "));
  }

  return (
    <div className="space-y-5">
      <header className="future-card future-command-surface rounded-3xl border border-brand/20 bg-surface-raised p-5 shadow-sm">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-strong dark:text-brand">
              Future voice mode
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight">Talk it through</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Say what feels stuck. Diana turns it into one student-owned academic move and keeps the source as your voice note.
              Use Start recording, or turn on Hey Diana standby when the desktop shell supports wake phrases.
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
            enableWakePhrase
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            onTranscript={addTranscript}
            rows={8}
            className="w-full rounded-2xl border border-border bg-surface px-3 py-3 text-sm leading-6"
            placeholder="Example: I understand the evidence, but I do not know how to start the first sentence."
          />
        </div>

        <aside className="future-card rounded-3xl border border-border bg-surface-raised p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <AudioLines size={17} className="text-subject-science" />
            <h2 className="text-base font-semibold">Diana response mode</h2>
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
        </aside>
      </section>
    </div>
  );
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
