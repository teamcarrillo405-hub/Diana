"use client";
import { useState } from "react";
import { BookOpen, Calculator, Camera, FlaskConical, PenLine, Ruler } from "lucide-react";
import { requestMathStep, requestMathExample, requestMathScaffold, uploadMathPhoto } from "./ai-tools-actions";
import { AiTooltip } from "@/components/ai-tooltip";
import { CALC_FORMULAS, PHYSICS_FORMULAS, ALGEBRA_FORMULAS, type Formula } from "@/lib/math/formulas";
import type { MathScaffoldResult, MathSubject } from "@/lib/math/scaffold";

interface MathHelperProps {
  assignmentId: string;
  classAiMode: "red" | "yellow" | "green";
}

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export function MathHelper({ assignmentId, classAiMode }: MathHelperProps) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Formula accordion state — available in both yellow and green modes (D-07)
  const [accordionOpen, setAccordionOpen] = useState<"calculus" | "physics" | "algebra" | null>(null);

  // Worked example state — green only (D-07)
  const [example, setExample] = useState<string | null>(null);
  const [exampleLoading, setExampleLoading] = useState(false);
  const [exampleError, setExampleError] = useState<string | null>(null);
  const [exampleSubject, setExampleSubject] = useState<"calculus" | "physics" | "algebra">("calculus");
  const [scaffoldSubject, setScaffoldSubject] = useState<MathSubject>("algebra");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [scaffold, setScaffold] = useState<MathScaffoldResult | null>(null);
  const [scaffoldLoading, setScaffoldLoading] = useState(false);
  const [scaffoldError, setScaffoldError] = useState<string | null>(null);
  const [studentWork, setStudentWork] = useState<Record<string, string>>({});

  // Gate 1: red → render nothing at all
  if (classAiMode === "red") return null;

  // Gate 2: yellow → render formula accordion only (formulas have zero AI cost — D-07)
  if (classAiMode === "yellow") {
    return (
      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Calculator size={15} className="text-muted" />
          <p className="text-sm font-medium">Math tools</p>
        </div>
        {/* Formula reference — static data, always available (D-01, D-07) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen size={13} className="text-muted" />
            <p className="text-xs font-medium uppercase tracking-wider text-muted">Formula reference</p>
          </div>
          {(["calculus", "physics", "algebra"] as const).map((s) => {
            const list: Formula[] = s === "calculus" ? CALC_FORMULAS : s === "physics" ? PHYSICS_FORMULAS : ALGEBRA_FORMULAS;
            const isOpen = accordionOpen === s;
            return (
              <div key={s} className="rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setAccordionOpen(isOpen ? null : s)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium hover:bg-border/20"
                >
                  <span>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                  <span className="text-xs text-muted">{isOpen ? "Hide" : `${list.length} formulas`}</span>
                </button>
                {isOpen && (
                  <ul className="divide-y divide-border border-t border-border">
                    {list.map((f, i) => (
                      <li key={i} className="px-3 py-2">
                        <p className="text-xs font-medium text-muted">{f.name}</p>
                        <p className="font-mono text-sm">{f.formula}</p>
                        {f.notes && <p className="text-xs text-muted">{f.notes}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  // Green mode — full math tools: Socratic chat + worked example + formula reference

  async function send() {
    if (!prompt.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    const userTurn: ChatTurn = { role: "user", content: prompt };
    const nextHistory = [...history, userTurn];
    const res = await requestMathStep({
      assignmentId,
      aiMode: classAiMode,
      prompt,
      history,
    });
    if ("error" in res) {
      setErrorMsg(res.error);
    } else {
      setHistory([...nextHistory, { role: "assistant", content: res.content }]);
      setPrompt("");
    }
    setLoading(false);
  }

  async function sendExample() {
    if (!prompt.trim()) {
      setExampleError("Paste your problem first so Diana can write a similar one.");
      return;
    }
    setExampleLoading(true);
    setExampleError(null);
    const res = await requestMathExample({
      assignmentId,
      aiMode: classAiMode,
      problem: prompt,
      subject: exampleSubject,
    });
    if ("error" in res) {
      setExampleError(res.error);
    } else {
      setExample(res.content);
    }
    setExampleLoading(false);
  }

  async function buildScaffold() {
    if (!prompt.trim() && !photoFile) {
      setScaffoldError("Paste the problem or add a photo first.");
      return;
    }
    setScaffoldLoading(true);
    setScaffoldError(null);
    setScaffold(null);
    setStudentWork({});

    let storageKey: string | undefined;
    if (photoFile) {
      const formData = new FormData();
      formData.append("mathPhoto", photoFile);
      const upload = await uploadMathPhoto(formData);
      if (!upload.ok) {
        setScaffoldError(upload.error);
        setScaffoldLoading(false);
        return;
      }
      storageKey = upload.storageKey;
    }

    const result = await requestMathScaffold({
      assignmentId,
      aiMode: classAiMode,
      subject: scaffoldSubject,
      problemText: prompt.trim() || undefined,
      storageKey,
    });
    if (result.ok) {
      setScaffold(result.result);
      if (!prompt.trim()) setPrompt(result.result.extractedProblem);
    } else {
      setScaffoldError(result.error);
    }
    setScaffoldLoading(false);
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
        >
          <Calculator size={13} />
          Help me with this math
        </button>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                Math step organizer
              </p>
              {history.length > 0 && <AiTooltip feature="math_step" />}
            </div>
            <p className="text-xs text-muted">Diana hints, never solves.</p>
          </div>

          {history.length > 0 && (
            <div className="max-h-[400px] space-y-2 overflow-y-auto">
              {history.map((t, i) => (
                <div
                  key={i}
                  className={
                    t.role === "user"
                      ? "rounded-lg bg-border/20 px-3 py-2 text-sm"
                      : "rounded-lg border border-border bg-card/60 px-3 py-2 text-sm whitespace-pre-wrap"
                  }
                >
                  {t.content}
                </div>
              ))}
            </div>
          )}

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Paste the problem or describe what's stuck."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            rows={3}
          />

          <div className="space-y-3 rounded-lg border border-border bg-background/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PenLine size={13} className="text-muted" />
                <p className="text-xs font-medium uppercase tracking-wider text-muted">Step board</p>
                {scaffold && <AiTooltip feature="math_scaffold" />}
              </div>
              <p className="text-xs text-muted">Photo, units, graph shape, next step.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(["algebra", "geometry", "precalculus", "calculus", "statistics", "physics", "chemistry"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScaffoldSubject(s)}
                  aria-pressed={scaffoldSubject === s}
                  className={`rounded-md border px-2 py-1 text-xs ${
                    scaffoldSubject === s
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-card text-muted hover:bg-border/20"
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs text-muted">
                <Camera size={12} />
                Photo scan
              </span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                className="block w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-2 file:py-1 file:text-xs file:font-medium file:text-white"
              />
            </label>

            {scaffoldError && (
              <p className="rounded border border-amber-500/40 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
                {scaffoldError}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={buildScaffold}
                disabled={scaffoldLoading || (!prompt.trim() && !photoFile)}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {scaffoldLoading ? "Building..." : "Build step board"}
              </button>
            </div>

            {scaffold && (
              <div className="space-y-3 border-t border-border pt-3">
                <div className="rounded-md border border-border bg-card px-3 py-2">
                  <p className="text-xs font-medium text-muted">Problem Diana read</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{scaffold.extractedProblem}</p>
                  {scaffold.latex && (
                    <p className="mt-1 font-mono text-xs text-muted">{scaffold.latex}</p>
                  )}
                </div>

                <ol className="grid gap-2 md:grid-cols-2">
                  {scaffold.steps.map((step, index) => (
                    <li key={step.id} className="space-y-2 rounded-md border border-border bg-card p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted">
                          Step {index + 1}
                        </p>
                        <p className="text-xs text-muted">{step.label}</p>
                      </div>
                      <p className="text-sm">{step.prompt}</p>
                      {step.unitHint && (
                        <p className="rounded border border-amber-500/30 bg-amber-50 px-2 py-1 text-xs text-amber-900">
                          {step.unitHint}
                        </p>
                      )}
                      <textarea
                        value={studentWork[step.id] ?? ""}
                        onChange={(e) => setStudentWork((prev) => ({ ...prev, [step.id]: e.target.value }))}
                        placeholder="Write your line here."
                        rows={2}
                        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                      />
                      {step.studentCheck && <p className="text-xs text-muted">{step.studentCheck}</p>}
                    </li>
                  ))}
                </ol>

                <div className="grid gap-2 md:grid-cols-2">
                  <div className="rounded-md border border-border bg-card p-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted">Common check</p>
                    <p className="mt-1 text-sm">{scaffold.commonError}</p>
                  </div>
                  {scaffold.unitTracker.length > 0 && (
                    <div className="rounded-md border border-border bg-card p-3">
                      <div className="flex items-center gap-1.5">
                        <Ruler size={13} className="text-muted" />
                        <p className="text-xs font-medium uppercase tracking-wider text-muted">Unit tracker</p>
                      </div>
                      <ul className="mt-2 space-y-1">
                        {scaffold.unitTracker.map((unit, index) => (
                          <li key={`${unit.unit}-${index}`} className="text-sm">
                            <span className="font-medium">{unit.quantity}</span>
                            <span className="text-muted"> / {unit.unit}: {unit.note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {scaffold.graphSketch && (
                  <div className="rounded-md border border-border bg-card p-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted">Graph sketch</p>
                    <p className="mt-1 text-sm">{scaffold.graphSketch.prompt}</p>
                    <div className="mt-2 grid gap-2 text-xs text-muted md:grid-cols-2">
                      <p>{scaffold.graphSketch.xBehavior}</p>
                      <p>{scaffold.graphSketch.yBehavior}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {errorMsg && (
            <p className="rounded border border-amber-500/40 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
              {errorMsg}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={send}
              disabled={loading || !prompt.trim()}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "Thinking…" : "Get a hint"}
            </button>
          </div>

          {/* Worked example (D-03, D-04 — analogous problem, separate from F18) — green only */}
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <FlaskConical size={13} className="text-muted" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted">Show a worked example</p>
              {example && <AiTooltip feature="math_example" />}
            </div>
            <p className="text-xs text-muted">Diana solves a similar problem so you can see the pattern. Yours stays yours.</p>
            <div className="flex flex-wrap gap-2">
              {(["calculus", "physics", "algebra"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setExampleSubject(s)}
                  className={`rounded-md border px-2 py-1 text-xs ${
                    exampleSubject === s
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-card text-muted hover:bg-border/20"
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
              <button
                type="button"
                onClick={sendExample}
                disabled={exampleLoading || !prompt.trim()}
                className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
              >
                {exampleLoading ? "Writing…" : "Show example"}
              </button>
            </div>
            {exampleError && (
              <p className="rounded border border-amber-500/40 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
                {exampleError}
              </p>
            )}
            {example && (
              <pre className="whitespace-pre-wrap rounded-lg border border-border bg-card/60 px-3 py-2 text-sm font-sans">
                {example}
              </pre>
            )}
          </div>

          {/* Formula reference (D-01 static, D-02 plain text) — green mode shows both */}
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <BookOpen size={13} className="text-muted" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted">Formula reference</p>
            </div>
            {(["calculus", "physics", "algebra"] as const).map((s) => {
              const list: Formula[] = s === "calculus" ? CALC_FORMULAS : s === "physics" ? PHYSICS_FORMULAS : ALGEBRA_FORMULAS;
              const isOpen = accordionOpen === s;
              return (
                <div key={s} className="rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setAccordionOpen(isOpen ? null : s)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium hover:bg-border/20"
                  >
                    <span>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                    <span className="text-xs text-muted">{isOpen ? "Hide" : `${list.length} formulas`}</span>
                  </button>
                  {isOpen && (
                    <ul className="divide-y divide-border border-t border-border">
                      {list.map((f, i) => (
                        <li key={i} className="px-3 py-2">
                          <p className="text-xs font-medium text-muted">{f.name}</p>
                          <p className="font-mono text-sm">{f.formula}</p>
                          {f.notes && <p className="text-xs text-muted">{f.notes}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
