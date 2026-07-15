"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Pause, Play, Send, Sparkles } from "lucide-react";
import { openAgentFab } from "@/components/agent-fab";
import { SUBJECT_META, SUBJECT_FIELDS, type HmSubject } from "@/lib/homework-mission/subjects";
import type { BreakdownStep } from "@/lib/task-breakdown/types";
import type { MathScaffoldResult } from "@/lib/math/scaffold";
import { saveHandInField, addProblem, saveProblemWork, saveProblemScaffold, submitFromWorkspace } from "./hm-actions";
import { requestMathScaffold, requestTaskBreakdown, toggleStepDone, uploadMathPhoto } from "./ai-tools-actions";
import styles from "../../quiet-command.module.css";

const SF = "var(--font-saira-condensed), 'Saira Condensed', sans-serif";
const BF = "var(--font-barlow), 'Barlow Semi Condensed', sans-serif";

export type AssignmentProblem = {
  id: string;
  problem_number: number;
  problem_text: string;
  scaffold: MathScaffoldResult | null;
  student_work: Record<string, string>;
};

export type HomeworkMissionProps = {
  assignmentId: string;
  subject: HmSubject;
  title: string;
  courseLabel: string;
  dueLine: string;
  estimate: string | null;
  briefText: string;
  rubricText: string | null;
  deliverables: string[];
  classAiMode: "red" | "yellow" | "green";
  status: string;
  savedWork: Record<string, string>;
  steps: BreakdownStep[];
  problems: AssignmentProblem[];
  startInWork: boolean;
  startWithSteps: boolean;
};

function fmtTimer(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function HomeworkMission(props: HomeworkMissionProps) {
  const { assignmentId, subject, classAiMode } = props;
  const meta = SUBJECT_META[subject];
  const fields = SUBJECT_FIELDS[subject];
  const aiAvailable = classAiMode !== "red";

  const [phase, setPhase] = useState<"brief" | "work" | "submitted">(
    props.status === "submitted" || props.status === "graded" ? "submitted" : props.startInWork ? "work" : "brief",
  );
  const [stepsOn, setStepsOn] = useState(props.startWithSteps);
  const [steps, setSteps] = useState<BreakdownStep[]>(props.steps);
  const [stepIdx, setStepIdx] = useState(0);
  const [stepsLoading, setStepsLoading] = useState(false);

  const [savedWork, setSavedWork] = useState<Record<string, string>>(props.savedWork);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved">("saved");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [timerOn, setTimerOn] = useState(false);
  const [timerSec, setTimerSec] = useState(0);

  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitPending, startSubmit] = useTransition();

  // Math only — per-problem list + navigation. The design itself has no real
  // multi-problem model ("Problem 3 of 8" is hardcoded text with no backing
  // array); this is the fix for that.
  const [problems, setProblems] = useState<AssignmentProblem[]>(props.problems);
  const [problemIdx, setProblemIdx] = useState(0);
  const [newProblemText, setNewProblemText] = useState("");
  const [addingProblem, setAddingProblem] = useState(problems.length === 0);
  const [scaffoldLoading, setScaffoldLoading] = useState(false);
  const [scaffoldError, setScaffoldError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    if (!timerOn) return;
    const id = setInterval(() => setTimerSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [timerOn]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [phase]);

  // Debounces the actual write, not just the badge — the old version fired a
  // server action + DB write on every keystroke. 900ms unsaved → save →
  // 600ms "saving" → "saved", matching the design's own autosave timing.
  function touchSave(persistFn: () => Promise<unknown>) {
    setSaveState("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaveState("saving");
      void persistFn().then(() => setSaveState("saved"));
    }, 900);
  }

  function setField(key: string, value: string) {
    setSavedWork((w) => ({ ...w, [key]: value }));
    touchSave(() => saveHandInField({ assignmentId, key, value }));
  }

  const currentProblem = subject === "math" ? problems[problemIdx] : null;

  function setProblemField(key: string, value: string) {
    if (!currentProblem) return;
    const updated = { ...currentProblem.student_work, [key]: value };
    setProblems((list) => list.map((p, i) => (i === problemIdx ? { ...p, student_work: updated } : p)));
    const problemId = currentProblem.id;
    touchSave(() => saveProblemWork({ problemId, key, value }));
  }

  async function handleAddProblem() {
    if (!newProblemText.trim() && !photoFile) return;
    setScaffoldLoading(true);
    setScaffoldError(null);
    let text = newProblemText.trim();

    if (!text && photoFile) {
      const upload = await uploadMathPhoto((() => {
        const fd = new FormData();
        fd.append("mathPhoto", photoFile);
        return fd;
      })());
      if (!upload.ok) {
        setScaffoldError(upload.error);
        setScaffoldLoading(false);
        return;
      }
      const scan = await requestMathScaffold({
        assignmentId,
        aiMode: classAiMode,
        subject: "algebra",
        storageKey: upload.storageKey,
      });
      if (!scan.ok) {
        setScaffoldError(scan.error);
        setScaffoldLoading(false);
        return;
      }
      text = scan.result.extractedProblem;
    }

    const added = await addProblem({ assignmentId, problemText: text });
    if (!added.ok) {
      setScaffoldError(added.error);
      setScaffoldLoading(false);
      return;
    }

    const newProblem: AssignmentProblem = {
      id: added.id,
      problem_number: added.problemNumber,
      problem_text: text,
      scaffold: null,
      student_work: {},
    };
    setProblems((list) => [...list, newProblem]);
    setProblemIdx(problems.length);
    setNewProblemText("");
    setPhotoFile(null);
    setAddingProblem(false);
    setScaffoldLoading(false);
  }

  async function buildScaffoldForCurrent() {
    if (!currentProblem) return;
    setScaffoldLoading(true);
    setScaffoldError(null);
    const result = await requestMathScaffold({
      assignmentId,
      aiMode: classAiMode,
      subject: "algebra",
      problemText: currentProblem.problem_text,
    });
    if (!result.ok) {
      setScaffoldError(result.error);
      setScaffoldLoading(false);
      return;
    }
    setProblems((list) => list.map((p, i) => (i === problemIdx ? { ...p, scaffold: result.result } : p)));
    void saveProblemScaffold({ problemId: currentProblem.id, scaffold: result.result as unknown as Record<string, unknown> });
    setScaffoldLoading(false);
  }

  async function generateSteps() {
    setStepsLoading(true);
    const res = await requestTaskBreakdown({
      assignmentId,
      aiMode: classAiMode,
      title: props.title,
      // Real fix for "break it down isn't giving exact steps": feed it the
      // actual assignment content + rubric + the current math problem (if
      // any), not just the title — the old flow only sent title/kind/minutes.
      description: [
        props.briefText,
        props.rubricText ? `Rubric: ${props.rubricText}` : null,
        currentProblem ? `Current problem: ${currentProblem.problem_text}` : null,
      ]
        .filter(Boolean)
        .join("\n\n"),
      kind: subject,
      estimatedMinutes: undefined,
    });
    setStepsLoading(false);
    if (!("error" in res)) {
      setSteps(res.steps);
      setStepIdx(0);
    }
  }

  function tapStepPill(i: number) {
    if (i === stepIdx) {
      const updated = steps.map((s, idx) => (idx === i ? { ...s, done: !s.done } : s));
      setSteps(updated);
      void toggleStepDone({ assignmentId, stepIndex: i, done: updated[i].done });
    } else {
      setStepIdx(i);
    }
  }

  async function handleSubmit() {
    startSubmit(async () => {
      const res = await submitFromWorkspace({ assignmentId, currentStatus: props.status });
      if (res.ok) {
        setShowSubmitConfirm(false);
        setPhase("submitted");
      }
    });
  }

  const material = subject === "math" ? currentProblem?.problem_text ?? "" : props.briefText;
  const materialTitle =
    subject === "math" && problems.length > 0 ? `Problem ${problemIdx + 1} of ${problems.length}` : meta.materialLabel;
  const activeStep = steps[stepIdx]?.action ?? null;
  const materialLead = material.trim().split(/\r?\n/)[0]?.slice(0, 220) ?? "";
  const guidedPrompt = activeStep
    ? `Start here: ${activeStep}`
    : materialLead
      ? `Read this first, then write what you understand in your own words: ${materialLead}`
      : "Read the assignment once. Then write the first thing you know in your own words.";
  const saveMessage = saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving…" : "Typing…";

  return (
    <div className={styles.missionRoot}>
      <section className={styles.mobileMission} aria-label={phase === "work" ? "Coach Diana workspace" : "Assignment brief"}>
        <header className={styles.mobileHeader}>
          {phase === "work" ? (
            <button type="button" className={styles.backButton} onClick={() => setPhase("brief")} aria-label="Back to assignment brief">
              <ArrowLeft size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
          ) : (
            <Link href="/dashboard" className={styles.backButton} aria-label="Back to Today">
              <ArrowLeft size={18} strokeWidth={1.8} aria-hidden="true" />
            </Link>
          )}
          <div className={styles.missionHeaderTitle}>
            <span>{phase === "work" ? "Coach Diana" : props.courseLabel}</span>
            <strong>{phase === "submitted" ? "Assignment sent" : props.title}</strong>
          </div>
          <span className={styles.brandSignal} aria-hidden="true" />
        </header>

        <main className={styles.missionContent}>
          {phase === "brief" && (
            <>
              <div>
                <p className={styles.eyebrow}>Next assignment</p>
                <div className={styles.missionMeta}>
                  <span className={styles.courseName}>{props.courseLabel}</span>
                  <span>{props.dueLine}</span>
                  {props.estimate ? <span>{props.estimate}</span> : null}
                </div>
                <h1 className={styles.missionTitle}>{props.title}</h1>
              </div>

              <section className={styles.briefCard} aria-labelledby="first-focus-label">
                <div id="first-focus-label" className={styles.sectionLabel}>First focus</div>
                <p className={styles.briefText}>{props.briefText}</p>
                {props.deliverables.length > 0 ? (
                  <div className={styles.deliverables} aria-label="What you will hand in">
                    {props.deliverables.map((deliverable) => (
                      <span key={deliverable} className={styles.deliverable}>{deliverable}</span>
                    ))}
                  </div>
                ) : null}
              </section>

              <div className={styles.buttonStack}>
                <button type="button" className={styles.primaryButton} onClick={() => setPhase("work")}>
                  Start first focus
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={styles.quietButton}
                  onClick={() => {
                    setStepsOn(true);
                    setPhase("work");
                    if (steps.length === 0) void generateSteps();
                  }}
                  disabled={!aiAvailable || stepsLoading}
                >
                  <Sparkles size={16} aria-hidden="true" />
                  {stepsLoading ? "Building small steps…" : "Break into small steps"}
                </button>
              </div>
              <p className={styles.helperNote}>Diana can guide the process. The ideas and final work stay yours.</p>
            </>
          )}

          {phase === "work" && (
            <>
              <div>
                <p className={styles.eyebrow}>Guided help</p>
                <h1 className={styles.workTitle}>Let&apos;s make the first move.</h1>
                <p className={styles.subhead}>Work in your own words. Ask for a smaller step whenever you need one.</p>
              </div>

              <div className={styles.workControlBar} aria-label="Workspace status">
                <div className={styles.saveState}>
                  <span className={`${styles.saveDot} ${saveState === "saved" ? styles.saveDotSaved : ""}`} aria-hidden="true" />
                  <span className={styles.saveLabel}>{saveMessage}</span>
                </div>
                <div className={styles.controlButtons}>
                  <button type="button" className={styles.timerButton} onClick={() => setTimerOn((value) => !value)} aria-label={timerOn ? "Pause focus timer" : "Start focus timer"}>
                    {timerOn ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
                    {fmtTimer(timerSec)}
                  </button>
                  <button type="button" className={styles.submitButton} onClick={() => setShowSubmitConfirm(true)}>
                    <Send size={14} aria-hidden="true" />
                    Submit
                  </button>
                </div>
              </div>

              <section className={styles.guidedCard} aria-labelledby="guided-prompt-label">
                <div className={styles.coachLine}>
                  <div className={styles.coachAvatar} aria-hidden="true">D</div>
                  <div>
                    <div id="guided-prompt-label" className={styles.coachLabel}>Coach Diana</div>
                    <p className={styles.guidedPrompt}>{guidedPrompt}</p>
                  </div>
                </div>

                {steps.length > 0 ? (
                  <div className={styles.stepRow} aria-label="Assignment steps">
                    {steps.map((step, index) => (
                      <button
                        key={`${step.action}-${index}`}
                        type="button"
                        className={`${styles.stepChip} ${index === stepIdx ? styles.stepChipActive : ""}`}
                        onClick={() => tapStepPill(index)}
                        aria-current={index === stepIdx ? "step" : undefined}
                      >
                        <span>{step.done ? <Check size={13} aria-hidden="true" /> : index + 1}</span>
                        <span>{step.action}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <button type="button" className={styles.utilityButton} onClick={generateSteps} disabled={!aiAvailable || stepsLoading}>
                    <Sparkles size={15} aria-hidden="true" />
                    {stepsLoading ? "Building steps…" : "Show me smaller steps"}
                  </button>
                )}

                {subject === "math" && currentProblem && !currentProblem.scaffold ? (
                  <button type="button" className={styles.utilityButton} onClick={buildScaffoldForCurrent} disabled={!aiAvailable || scaffoldLoading}>
                    {scaffoldLoading ? "Building the math path…" : "Break down this problem"}
                  </button>
                ) : null}
              </section>

              {subject === "math" && problems.length > 0 ? (
                <div className={styles.problemRow} aria-label="Math problems">
                  {problems.map((problem, index) => (
                    <button
                      key={problem.id}
                      type="button"
                      className={`${styles.problemChip} ${index === problemIdx && !addingProblem ? styles.problemChipActive : ""}`}
                      onClick={() => {
                        setProblemIdx(index);
                        setAddingProblem(false);
                      }}
                    >
                      Problem {problem.problem_number}
                    </button>
                  ))}
                  <button type="button" className={styles.problemChip} onClick={() => setAddingProblem(true)}>Add problem</button>
                </div>
              ) : null}

              {subject === "math" && (addingProblem || problems.length === 0) ? (
                <section className={styles.addProblemCard} aria-labelledby="add-problem-label">
                  <div id="add-problem-label" className={styles.fieldLabel}>{problems.length === 0 ? "Add your first problem" : "Add another problem"}</div>
                  <textarea
                    className={styles.problemInput}
                    value={newProblemText}
                    onChange={(event) => setNewProblemText(event.target.value)}
                    placeholder="Type or paste the problem"
                    rows={4}
                  />
                  <label className={styles.filePicker}>
                    <input type="file" accept="image/*" onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)} />
                    {photoFile ? photoFile.name : "Add a photo instead"}
                  </label>
                  <button type="button" className={styles.primaryButton} onClick={handleAddProblem} disabled={scaffoldLoading || (!newProblemText.trim() && !photoFile)}>
                    {scaffoldLoading ? "Adding problem…" : "Add problem"}
                  </button>
                  {problems.length > 0 ? (
                    <button type="button" className={styles.quietButton} onClick={() => setAddingProblem(false)}>Cancel</button>
                  ) : null}
                  {scaffoldError ? <p className={styles.helperNote}>{scaffoldError}</p> : null}
                </section>
              ) : (
                <div className={styles.fieldList}>
                  {fields.map((field) => {
                    const value = subject === "math" ? (currentProblem?.student_work[field.key] ?? "") : (savedWork[field.key] ?? "");
                    const onChange = (value: string) => subject === "math" ? setProblemField(field.key, value) : setField(field.key, value);
                    return (
                      <label key={field.key} className={styles.fieldCard}>
                        <span className={styles.fieldLabel}>{field.label}</span>
                        <span className={styles.fieldHint}>{field.hint}</span>
                        {field.multi ? (
                          <textarea
                            className={styles.fieldInput}
                            value={value}
                            onChange={(event) => onChange(event.target.value)}
                            placeholder={field.placeholder}
                            rows={field.rows ?? 3}
                          />
                        ) : (
                          <input
                            className={styles.fieldInput}
                            value={value}
                            onChange={(event) => onChange(event.target.value)}
                            placeholder={field.placeholder}
                          />
                        )}
                      </label>
                    );
                  })}
                </div>
              )}

              {aiAvailable ? (
                <button type="button" className={styles.quietButton} onClick={() => openAgentFab()}>
                  <Sparkles size={16} aria-hidden="true" />
                  Ask Coach Diana
                </button>
              ) : (
                <p className={styles.helperNote}>AI help is not enabled for this class. Your workspace and saved work are still available.</p>
              )}
              <p className={styles.authorshipNote}>Diana can ask questions, explain a step, and help you plan. Your response remains your own work.</p>
            </>
          )}

          {phase === "submitted" && (
            <section className={styles.submittedCard}>
              <div className={styles.submittedMark} aria-hidden="true"><Check size={20} /></div>
              <h1>It&apos;s in.</h1>
              <p>Your teacher receives exactly what you wrote. Feedback will appear here when it is available.</p>
              <Link href="/assignments" className={styles.primaryButton}>See what&apos;s next <ArrowRight size={16} aria-hidden="true" /></Link>
            </section>
          )}
        </main>
      </section>

      <div className={styles.desktopMission}>
      {/* Sticky editor bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, maxWidth: 1440, margin: "0 auto", height: 56, display: "flex", alignItems: "center", gap: 16, padding: "0 22px", background: "rgba(2,5,14,.82)", borderBottom: "1px solid rgba(41,208,255,.18)", backdropFilter: "blur(20px)" }}>
        <Link href="/assignments" style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: SF, fontWeight: 700, fontSize: 13, letterSpacing: ".04em", textTransform: "uppercase", color: "#aab8e0", textDecoration: "none" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Work
        </Link>
        <div style={{ width: 1, height: 22, background: "rgba(120,150,220,.18)" }} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 9 }}>
          <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: meta.accent, flexShrink: 0 }} />
          <span style={{ fontFamily: SF, fontWeight: 700, fontSize: 15, letterSpacing: ".03em", textTransform: "uppercase", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{props.title}</span>
          <span style={{ fontSize: 12.5, color: "#7d88ad", whiteSpace: "nowrap" }}>{props.dueLine}</span>
        </div>
        {phase === "work" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
              <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: saveState === "saved" ? "#36e07a" : "#ffd24a" }} />
              <span style={{ fontSize: 12, color: "#7d88ad" }}>{saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving…" : "Typing…"}</span>
            </div>
            <button
              type="button"
              onClick={() => setTimerOn((v) => !v)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 9, border: `1px solid ${timerOn ? "rgba(41,208,255,.25)" : "rgba(120,150,220,.18)"}`, background: timerOn ? "rgba(41,208,255,.08)" : "transparent", cursor: "pointer" }}
            >
              {timerOn ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#29d0ff"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#aab8e0"><polygon points="5,3 19,12 5,21" /></svg>
              )}
              <span style={{ fontFamily: SF, fontWeight: 800, fontSize: 14, letterSpacing: ".05em", color: timerOn ? "#29d0ff" : "#aab8e0" }}>{fmtTimer(timerSec)}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSubmitConfirm(true)}
              style={{ padding: "9px 20px", borderRadius: 9, background: "#29d0ff", cursor: "pointer", border: "none", fontFamily: SF, fontWeight: 800, fontSize: 14, letterSpacing: ".05em", textTransform: "uppercase", color: "#04080f" }}
            >
              Submit
            </button>
          </>
        )}
      </div>

      {phase === "brief" && (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "64px 34px 90px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12, flexWrap: "wrap" }}>
            <span style={{ fontFamily: SF, fontWeight: 700, fontSize: 13, letterSpacing: ".12em", textTransform: "uppercase", color: meta.accent }}>{props.courseLabel}</span>
            <span style={{ fontSize: 12, color: "#7d88ad" }}>·</span>
            <span style={{ padding: "3px 11px", borderRadius: 16, border: "1px solid rgba(255,210,74,.3)", background: "rgba(255,210,74,.14)", fontFamily: SF, fontWeight: 700, fontSize: 12, letterSpacing: ".03em", textTransform: "uppercase", color: "#ffd24a" }}>{props.dueLine}</span>
            {props.estimate && <span style={{ fontSize: 13, color: "#7d88ad" }}>~{props.estimate}</span>}
          </div>

          <h1 style={{ margin: "0 0 26px", fontFamily: SF, fontStyle: "italic", fontWeight: 800, fontSize: 46, lineHeight: 0.94, textTransform: "uppercase", color: "#fff" }}>{props.title}</h1>

          <div style={{ borderRadius: 16, border: "1px solid rgba(120,150,220,.18)", background: "rgba(4,8,20,.72)", padding: "26px 28px" }}>
            <div style={{ fontFamily: SF, fontWeight: 800, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#7d88ad", marginBottom: 12 }}>From your teacher</div>
            <div style={{ fontFamily: BF, fontSize: 17, lineHeight: 1.75, color: "#e8f0ff", whiteSpace: "pre-wrap" }}>{props.briefText}</div>
            {props.deliverables.length > 0 && (
              <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#7d88ad" }}>You hand in:</span>
                {props.deliverables.map((d) => (
                  <span key={d} style={{ padding: "5px 13px", borderRadius: 16, border: "1px solid rgba(120,150,220,.18)", background: "rgba(255,255,255,.03)", fontSize: 13.5, fontWeight: 600, color: "#cdd6f2" }}>{d}</span>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 26, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setPhase("work")}
              style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "15px 30px", borderRadius: 12, background: "#29d0ff", boxShadow: "0 0 30px rgba(41,208,255,.35)", cursor: "pointer", border: "none", fontFamily: SF, fontWeight: 800, fontSize: 19, letterSpacing: ".04em", textTransform: "uppercase", color: "#04080f" }}
            >
              Start working
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#04080f" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
            <button
              type="button"
              onClick={() => {
                setStepsOn(true);
                setPhase("work");
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "14px 22px", borderRadius: 12, border: "1px solid rgba(41,208,255,.25)", background: "rgba(41,208,255,.08)", cursor: "pointer", fontFamily: SF, fontWeight: 700, fontSize: 15, letterSpacing: ".03em", textTransform: "uppercase", color: "#29d0ff" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#29d0ff" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
              Break it into small steps
            </button>
          </div>
          <div style={{ marginTop: 14, fontSize: 13.5, color: "#7d88ad" }}>Diana can help while you work, but only when you ask.</div>
        </div>
      )}

      {phase === "work" && (
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 28px 80px" }}>
          {stepsOn ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                {steps.map((s, i) => {
                  const isCurrent = i === stepIdx;
                  const isDone = s.done && !isCurrent;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => tapStepPill(i)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 15px",
                        borderRadius: 18,
                        cursor: "pointer",
                        border: `1px solid ${isCurrent ? "#29d0ff" : isDone ? "rgba(54,224,122,.3)" : "rgba(120,150,220,.18)"}`,
                        background: isCurrent ? "rgba(41,208,255,.08)" : "transparent",
                      }}
                    >
                      {s.done ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#36e07a" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : (
                        <span style={{ fontFamily: SF, fontWeight: 800, fontSize: 11.5, color: isCurrent ? "#29d0ff" : "#7d88ad" }}>{i + 1}</span>
                      )}
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: isCurrent ? "#fff" : isDone ? "#7d88ad" : "#cdd6f2", textDecoration: isDone ? "line-through" : "none" }}>{s.action}</span>
                    </button>
                  );
                })}
                <button type="button" onClick={() => setStepsOn(false)} style={{ marginLeft: "auto", cursor: "pointer", fontSize: 12, color: "#7d88ad", background: "none", border: "none" }}>
                  Hide steps
                </button>
              </div>
              {steps[stepIdx] && (
                <div style={{ margin: "0 4px 16px" }}>
                  <span style={{ fontWeight: 700, color: "#29d0ff", textTransform: "uppercase", fontSize: 11.5, letterSpacing: ".08em" }}>Now: </span>
                  <span style={{ fontSize: 13.5, color: "#cdd6f2" }}>{steps[stepIdx].action}</span>
                </div>
              )}
              {steps.length === 0 && (
                <div style={{ marginBottom: 16 }}>
                  <button type="button" onClick={generateSteps} disabled={stepsLoading || !aiAvailable} style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", padding: "7px 14px", borderRadius: 16, border: "1px solid rgba(120,150,220,.18)", background: "transparent", fontSize: 12.5, fontWeight: 600, color: "#aab8e0" }}>
                    {stepsLoading ? "Breaking it down…" : "Break this down"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  setStepsOn(true);
                  if (steps.length === 0) void generateSteps();
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", padding: "7px 14px", borderRadius: 16, border: "1px solid rgba(120,150,220,.18)", background: "transparent", fontSize: 12.5, fontWeight: 600, color: "#aab8e0" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aab8e0" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
                Break into steps
              </button>
            </div>
          )}

          {subject === "math" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {problems.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setProblemIdx(i);
                    setAddingProblem(false);
                  }}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 16,
                    cursor: "pointer",
                    border: `1px solid ${i === problemIdx && !addingProblem ? "#b09cff" : "rgba(120,150,220,.18)"}`,
                    background: i === problemIdx && !addingProblem ? "rgba(176,156,255,.1)" : "transparent",
                    fontFamily: SF,
                    fontWeight: 700,
                    fontSize: 12.5,
                    color: i === problemIdx && !addingProblem ? "#b09cff" : "#aab8e0",
                  }}
                >
                  Problem {p.problem_number}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAddingProblem(true)}
                style={{ padding: "7px 14px", borderRadius: 16, cursor: "pointer", border: "1px dashed rgba(120,150,220,.3)", background: "transparent", fontFamily: SF, fontWeight: 700, fontSize: 12.5, color: "#7d88ad" }}
              >
                + Add problem
              </button>
              {problems.length > 1 && !addingProblem && (
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  <button type="button" disabled={problemIdx === 0} onClick={() => setProblemIdx((i) => Math.max(0, i - 1))} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(120,150,220,.18)", background: "transparent", cursor: "pointer", color: "#aab8e0", opacity: problemIdx === 0 ? 0.4 : 1 }}>
                    ← Prev
                  </button>
                  <button type="button" disabled={problemIdx === problems.length - 1} onClick={() => setProblemIdx((i) => Math.min(problems.length - 1, i + 1))} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(120,150,220,.18)", background: "transparent", cursor: "pointer", color: "#aab8e0", opacity: problemIdx === problems.length - 1 ? 0.4 : 1 }}>
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}

          {subject === "math" && addingProblem ? (
            <div style={{ borderRadius: 15, border: "1px solid rgba(120,150,220,.18)", background: "rgba(4,8,20,.72)", padding: "22px 24px", marginBottom: 18 }}>
              <div style={{ fontFamily: SF, fontWeight: 800, fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: "#b09cff", marginBottom: 12 }}>
                {problems.length === 0 ? "Add your first problem" : `Add problem ${problems.length + 1}`}
              </div>
              <textarea
                value={newProblemText}
                onChange={(e) => setNewProblemText(e.target.value)}
                placeholder="Paste or type the problem…"
                rows={3}
                style={{ width: "100%", padding: "13px 15px", borderRadius: 11, border: "1px solid rgba(120,150,220,.18)", background: "rgba(10,16,36,.8)", color: "#e8f0ff", fontFamily: BF, fontSize: 15.5, lineHeight: 1.65, boxSizing: "border-box" }}
              />
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
                <label style={{ fontSize: 12.5, color: "#7d88ad", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} style={{ display: "none" }} />
                  <span style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(120,150,220,.18)" }}>{photoFile ? photoFile.name : "Or add a photo"}</span>
                </label>
                <button type="button" onClick={handleAddProblem} disabled={scaffoldLoading || (!newProblemText.trim() && !photoFile)} style={{ marginLeft: "auto", padding: "10px 20px", borderRadius: 9, background: "#b09cff", border: "none", cursor: "pointer", fontFamily: SF, fontWeight: 800, fontSize: 13, letterSpacing: ".04em", textTransform: "uppercase", color: "#1a0d3c", opacity: scaffoldLoading ? 0.6 : 1 }}>
                  {scaffoldLoading ? "Adding…" : "Add problem"}
                </button>
                {problems.length > 0 && (
                  <button type="button" onClick={() => setAddingProblem(false)} style={{ padding: "10px 16px", borderRadius: 9, background: "transparent", border: "1px solid rgba(120,150,220,.18)", cursor: "pointer", color: "#aab8e0", fontSize: 13 }}>
                    Cancel
                  </button>
                )}
              </div>
              {scaffoldError && <p style={{ marginTop: 10, fontSize: 12.5, color: "#ffd24a" }}>{scaffoldError}</p>}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(300px,5fr) minmax(0,7fr)", gap: 18, alignItems: "start" }}>
              {/* LEFT — material */}
              <div style={{ position: "sticky", top: 72, borderRadius: 15, border: "1px solid rgba(120,150,220,.18)", background: "rgba(4,8,20,.72)", backdropFilter: "blur(10px)", padding: "20px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, gap: 12 }}>
                  <span style={{ fontFamily: SF, fontWeight: 800, fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: meta.accent }}>{materialTitle}</span>
                </div>
                <div style={{ fontFamily: BF, fontSize: 15.5, lineHeight: 1.8, color: "#e8f0ff", whiteSpace: "pre-wrap" }}>{material || "No material yet: check the assignment description."}</div>

                {subject === "math" && currentProblem && (
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(120,150,220,.18)" }}>
                    {!currentProblem.scaffold ? (
                      <button type="button" onClick={buildScaffoldForCurrent} disabled={scaffoldLoading || !aiAvailable} style={{ padding: "9px 16px", borderRadius: 9, border: "1px solid rgba(176,156,255,.3)", background: "rgba(176,156,255,.08)", cursor: "pointer", color: "#b09cff", fontSize: 13, fontWeight: 600 }}>
                        {scaffoldLoading ? "Building steps…" : "Ask Diana to break this problem down"}
                      </button>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#7d88ad" }}>Diana's step-by-step</div>
                        {currentProblem.scaffold.steps.map((s) => (
                          <div key={s.id} style={{ fontSize: 13.5, color: "#cdd6f2" }}>
                            <span style={{ color: "#b09cff", fontWeight: 700 }}>{s.label}: </span>
                            {s.prompt}
                          </div>
                        ))}
                        {currentProblem.scaffold.commonError && (
                          <div style={{ fontSize: 12.5, color: "#ffd24a" }}>Watch for: {currentProblem.scaffold.commonError}</div>
                        )}
                      </div>
                    )}
                    {scaffoldError && <p style={{ marginTop: 8, fontSize: 12.5, color: "#ffd24a" }}>{scaffoldError}</p>}
                  </div>
                )}

                <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(120,150,220,.18)", fontSize: 12, color: "#7d88ad" }}>
                  Not sure about something here? Tap "Ask Diana" and describe what's confusing.
                </div>
              </div>

              {/* RIGHT — your work */}
              <div style={{ borderRadius: 15, border: "1px solid rgba(41,208,255,.25)", background: "rgba(4,8,20,.72)", backdropFilter: "blur(10px)", padding: "24px 26px", minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
                  <span style={{ fontFamily: SF, fontWeight: 800, fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: "#29d0ff" }}>Your work: this is what you hand in</span>
                  {aiAvailable && (
                    <button
                      type="button"
                      onClick={() => openAgentFab()}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px 6px 8px", borderRadius: 20, border: "1px solid rgba(41,208,255,.25)", background: "rgba(41,208,255,.08)", cursor: "pointer", flexShrink: 0 }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/agent-robot-bust.png" alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", objectPosition: "50% 15%" }} />
                      <span style={{ fontFamily: SF, fontWeight: 800, fontSize: 13, letterSpacing: ".04em", textTransform: "uppercase", color: "#29d0ff" }}>Ask Diana</span>
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {fields.map((f) => {
                    const value = subject === "math" ? (currentProblem?.student_work[f.key] ?? "") : (savedWork[f.key] ?? "");
                    const onChange = (v: string) => (subject === "math" ? setProblemField(f.key, v) : setField(f.key, v));
                    return (
                      <div key={f.key}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                          <span style={{ fontFamily: SF, fontWeight: 700, fontSize: 14, letterSpacing: ".05em", textTransform: "uppercase", color: "#cdd6f2" }}>{f.label}</span>
                          <span style={{ fontSize: 12.5, color: "#7d88ad" }}>{f.hint}</span>
                        </div>
                        {f.multi ? (
                          <textarea
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder={f.placeholder}
                            rows={f.rows ?? 3}
                            style={{ width: "100%", resize: "vertical", padding: "13px 15px", borderRadius: 11, border: "1px solid rgba(120,150,220,.18)", background: "rgba(10,16,36,.8)", color: "#e8f0ff", fontFamily: BF, fontSize: 15.5, lineHeight: 1.65, boxSizing: "border-box" }}
                          />
                        ) : (
                          <input
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder={f.placeholder}
                            style={{ width: "100%", padding: "13px 15px", borderRadius: 11, border: "1px solid rgba(120,150,220,.18)", background: "rgba(10,16,36,.8)", color: "#e8f0ff", fontFamily: BF, fontSize: 15.5, boxSizing: "border-box" }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === "submitted" && (
        <div style={{ maxWidth: 560, margin: "90px auto", textAlign: "center", padding: "0 34px" }}>
          <div style={{ width: 58, height: 58, borderRadius: "50%", background: "#36e07a", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#04310f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h1 style={{ marginTop: 20, fontFamily: SF, fontStyle: "italic", fontWeight: 800, fontSize: 36, textTransform: "uppercase", color: "#fff" }}>It&apos;s in.</h1>
          <p style={{ marginTop: 10, fontSize: 15, lineHeight: 1.6, color: "rgba(200,218,255,.6)" }}>
            Your teacher gets it exactly as you wrote it. Feedback will show up here when it comes back.
          </p>
          <Link href="/assignments" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 24, padding: "12px 24px", borderRadius: 11, background: "#29d0ff", color: "#04080f", textDecoration: "none", fontFamily: SF, fontWeight: 800, fontSize: 14, letterSpacing: ".04em", textTransform: "uppercase" }}>
            What&apos;s next on my list
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#04080f" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </Link>
        </div>
      )}
      </div>

      {showSubmitConfirm && (
        <div onClick={() => setShowSubmitConfirm(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(2,4,10,.72)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 440, maxWidth: "92vw", borderRadius: 16, border: "1px solid rgba(41,208,255,.25)", background: "linear-gradient(180deg,rgba(8,12,26,.96),rgba(12,18,42,.96))", padding: "26px 28px" }}>
            <div style={{ fontFamily: SF, fontWeight: 800, fontSize: 22, letterSpacing: ".03em", textTransform: "uppercase", color: "#fff" }}>Ready to send it?</div>
            <p style={{ marginTop: 10, fontSize: 14.5, lineHeight: 1.6, color: "rgba(200,218,255,.6)" }}>
              Quick gut check: read your work out loud once. If it answers the teacher&apos;s question and sounds like you, it&apos;s ready.
            </p>
            <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={() => setShowSubmitConfirm(false)} style={{ padding: "10px 18px", borderRadius: 9, border: "1px solid rgba(120,150,220,.18)", background: "transparent", cursor: "pointer", color: "#aab8e0" }}>
                One more look
              </button>
              <button type="button" onClick={handleSubmit} disabled={submitPending} style={{ padding: "10px 24px", borderRadius: 9, background: "#36e07a", border: "none", cursor: "pointer", color: "#04310f", fontWeight: 700, opacity: submitPending ? 0.6 : 1 }}>
                {submitPending ? "Sending…" : "Submit it"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
