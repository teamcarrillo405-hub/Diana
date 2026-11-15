"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { PreviewNavigation } from "../_components/preview-navigation";
import { ArrowLeft, Check, CheckCircle2, FileText, Keyboard, RotateCcw, Upload, X } from "lucide-react";
import base from "../work-concept-review/work-concept-review.module.css";
import styles from "./work-capture-review.module.css";

type Mode = "file" | "text";
type Phase = "source" | "review" | "ready";
type Example = "ready" | "uncertain" | "unavailable" | "no-classes";
const PHASES: { id: Phase; label: string }[] = [{ id: "source", label: "Source" }, { id: "review", label: "Review" }, { id: "ready", label: "Ready" }];
export const SAMPLE_SOURCE = "Linear Equations\nShow each step and check your answer by substitution.\n\n1. Solve for x: 3x + 5 = 20\n2. Solve for x: 2(x - 4) = 14\n3. Solve for x: 5x - 7 = 3x + 9";

export function WorkCaptureReview() {
  const [mode, setMode] = useState<Mode>("file");
  const [phase, setPhase] = useState<Phase>("source");
  const [example, setExample] = useState<Example>("ready");
  const [selectedFile, setSelectedFile] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [course, setCourse] = useState("Algebra");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sourceSnapshot, setSourceSnapshot] = useState("");
  const tabs = useRef(new Map<Mode, HTMLButtonElement>());
  const titleInput = useRef<HTMLInputElement>(null);
  const textInput = useRef<HTMLTextAreaElement>(null);
  const fileButton = useRef<HTMLButtonElement>(null);
  const courseInput = useRef<HTMLSelectElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const sourceHeading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [phase]);

  function switchMode(next: Mode) { setMode(next); setError(""); setNotice(""); }
  function tabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "file" : event.key === "End" ? "text" : mode === "file" ? "text" : "file";
    switchMode(next);
    tabs.current.get(next)?.focus();
  }
  function useSample() {
    setSelectedFile(true); setError(""); setNotice("");
    if (!title.trim()) setTitle("Linear Equations");
  }
  function review(event: FormEvent) {
    event.preventDefault(); setError(""); setNotice("");
    if (example === "no-classes" || !course) { setError("Choose a class before continuing."); courseInput.current?.focus(); return; }
    if (mode === "file" && !selectedFile) { setError("Choose the sample document first, or paste instructions."); fileButton.current?.focus(); return; }
    if (mode === "text" && !instructions.trim()) { setError("Add the assignment instructions first."); textInput.current?.focus(); return; }
    if (mode === "file" && example === "unavailable") { setError("This sample could not be read. Try again or use pasted instructions."); return; }
    setSourceSnapshot(mode === "file" ? SAMPLE_SOURCE : instructions.trim());
    if (!title.trim()) setTitle(mode === "file" ? "Linear Equations" : "New assignment");
    setConfirmed(false); setPhase("review");
  }
  function confirm(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) { setError("Add an assignment name."); titleInput.current?.focus(); return; }
    if (!confirmed) { setError("Confirm the details before adding this example."); return; }
    setError(""); setPhase("ready");
  }
  function reset() {
    setPhase("source"); setMode("file"); setSelectedFile(false); setInstructions(""); setTitle(""); setCourse("Algebra");
    setDue(""); setConfirmed(false); setError(""); setNotice(""); setSourceSnapshot(""); setExample("ready");
  }
  const sourceText = phase === "source" ? mode === "file" ? selectedFile ? SAMPLE_SOURCE : "" : instructions : sourceSnapshot;

  return <div className={`${base.root} ${styles.root}`}>
    <img className={`${base.world} ${styles.world}`} src="/assets/today-now/diana-signature-studio-v1-1678.webp" alt="" />
    <PreviewNavigation active="Work" />
    <div className={styles.reviewBar}><div><strong>Design preview / Sample intake</strong><span>No uploads, AI calls, or account changes.</span></div><label>Example state<select value={example} disabled={phase !== "source"} onChange={event => { setExample(event.target.value as Example); setError(""); setNotice(""); }}><option value="ready">Ready to read</option><option value="uncertain">Needs a closer look</option><option value="unavailable">Cannot read source</option><option value="no-classes">No classes</option></select></label></div>
    <main className={styles.main} id="main-content" tabIndex={-1}>
      <div className={styles.pageTop}><div><p className={styles.eyebrow}>Your next assignment</p><h1>Add to Work</h1></div><ol className={styles.steps} aria-label="Intake progress">{PHASES.map((step, index) => <li key={step.id} aria-current={phase === step.id ? "step" : undefined} data-complete={PHASES.findIndex(item => item.id === phase) > index}><span>{PHASES.findIndex(item => item.id === phase) > index ? <Check aria-hidden="true" /> : `0${index + 1}`}</span>{step.label}</li>)}</ol></div>
      <div className={styles.stage}>
        <section className={styles.editor} aria-labelledby="capture-stage-title">
          <header className={styles.stageHeading}><p>{phase === "source" ? "01 / Assignment source" : phase === "review" ? "02 / Confirm the details" : "03 / Preview complete"}</p><h2 id="capture-stage-title" ref={heading} tabIndex={-1}>{phase === "source" ? "Bring in your assignment" : phase === "review" ? "Make it yours" : "Ready for your workspace"}</h2></header>
          {phase === "source" && <form onSubmit={review} noValidate>
            <div className={styles.modeTabs} role="tablist" aria-label="Assignment input">
              {(["file", "text"] as const).map(id => <button key={id} type="button" role="tab" id={`capture-tab-${id}`} aria-controls={`capture-panel-${id}`} aria-selected={mode === id} tabIndex={mode === id ? 0 : -1} ref={element => { if (element) tabs.current.set(id, element); else tabs.current.delete(id); }} onClick={() => switchMode(id)} onKeyDown={tabKey}>{id === "file" ? <Upload aria-hidden="true" /> : <Keyboard aria-hidden="true" />}{id === "file" ? "Upload file" : "Paste instructions"}</button>)}
            </div>
            <div className={styles.fields}><label>Class<select ref={courseInput} value={example === "no-classes" ? "" : course} onChange={event => setCourse(event.target.value)} aria-describedby={example === "no-classes" ? "capture-class-help" : undefined}><option value="">Choose a class</option>{example !== "no-classes" && <><option>Algebra</option><option>English</option><option>Science</option></>}</select></label><label>Assignment name <span>optional</span><input value={title} maxLength={160} onChange={event => setTitle(event.target.value)} placeholder="Name this assignment" /></label></div>
            {example === "no-classes" && <p className={styles.warning} id="capture-class-help">There are no classes in this example. <Link href="/landing-3d/classes-concept-review" prefetch={false}>Review Classes</Link></p>}
            <div role="tabpanel" id="capture-panel-file" aria-labelledby="capture-tab-file" hidden={mode !== "file"} inert={mode !== "file"}>
              {!selectedFile ? <div className={styles.fileEntry}><FileText aria-hidden="true" /><h3>Original directions. All together.</h3><p>Photo, PDF, or text file. Up to 20 MB.</p><button type="button" ref={fileButton} className={styles.sampleButton} onClick={useSample}><Upload aria-hidden="true" />Use sample PDF</button></div> : <div className={styles.selectedFile}><FileText aria-hidden="true" /><div><strong>linear-equations.pdf</strong><span>Sample document / 3 questions</span></div><button type="button" className={styles.iconButton} title="Remove sample document" aria-label="Remove sample document" onClick={() => { setSelectedFile(false); setError(""); }}><X aria-hidden="true" /></button></div>}
            </div>
            <div role="tabpanel" id="capture-panel-text" aria-labelledby="capture-tab-text" hidden={mode !== "text"} inert={mode !== "text"}><label className={styles.instructions}>Assignment instructions<textarea ref={textInput} value={instructions} onChange={event => setInstructions(event.target.value)} rows={8} maxLength={50000} placeholder="Directions, questions, or a rubric" /></label><button type="button" className={styles.textAction} onClick={() => { setInstructions(SAMPLE_SOURCE); setTitle(title || "Linear Equations"); }}>Use sample instructions</button></div>
            {error && <p className={styles.warning} role="alert">{error}</p>}
            {error && example === "unavailable" && <button type="button" className={styles.textAction} onClick={() => { setExample("ready"); setError(""); setNotice("Sample source is available. Review when ready."); }}><RotateCcw aria-hidden="true" />Try again</button>}
            {notice && <p role="status" className={styles.notice}>{notice}</p>}
            <footer className={styles.actionBar}><span><FileText aria-hidden="true" />Keep the original with your work</span><button className={styles.primary} type="submit">Review source</button></footer>
          </form>}
          {phase === "review" && <form onSubmit={confirm} noValidate>
            <button className={`${styles.textAction} ${styles.sourceJump}`} type="button" onClick={() => { sourceHeading.current?.focus(); sourceHeading.current?.scrollIntoView({ block: "start" }); }}><FileText aria-hidden="true" />View original directions</button>
            {example === "uncertain" && <p className={styles.warning} role="status">Sample source needs a closer look. Check the original directions before confirming.</p>}
            <div className={styles.reviewFields}><label>Assignment name<input ref={titleInput} value={title} onChange={event => setTitle(event.target.value)} maxLength={160} /></label><div className={styles.fields}><label>Class<select value={course} onChange={event => setCourse(event.target.value)}><option>Algebra</option><option>English</option><option>Science</option></select></label><label>Due date <span>optional</span><input type="date" value={due} onChange={event => setDue(event.target.value)} /></label></div></div>
            <dl className={styles.summary}><div><dt>Source</dt><dd>{mode === "file" ? "Sample PDF" : "Pasted instructions"}</dd></div><div><dt>Due date in source</dt><dd>Not confirmed</dd></div></dl>
            <label className={styles.confirmation}><input type="checkbox" checked={confirmed} onChange={event => { setConfirmed(event.target.checked); setError(""); }} />I checked the source and assignment details.</label>
            {error && <p className={styles.warning} role="alert">{error}</p>}
            <footer className={styles.actionBar}><button className={styles.textAction} type="button" onClick={() => { setError(""); setPhase("source"); }}><ArrowLeft aria-hidden="true" />Edit source</button><button type="submit" className={styles.primary}>Add to Work</button></footer>
            <button type="button" className={styles.setAside} onClick={() => { setPhase("source"); setNotice("Set aside in this preview. Your inputs are still here."); setError(""); }}>Set aside for now</button>
          </form>}
          {phase === "ready" && <div className={styles.receipt}>
            <CheckCircle2 className={styles.receiptIcon} aria-hidden="true" /><p className={styles.readyStatus}>Added to this preview</p><h3>{title}</h3><p className={styles.receiptCourse}>{course}{due ? ` / ${due}` : " / Due date not set"}</p><p className={styles.receiptNote}>No assignment was created in your account. The workspace link opens the prepared Algebra example, not these inputs.</p>
            <div className={styles.readyActions}><Link className={styles.primary} href="/landing-3d/workspace-concept-review" prefetch={false}>Open sample workspace</Link><button type="button" className={styles.textAction} onClick={reset}><RotateCcw aria-hidden="true" />Start another preview</button></div>
          </div>}
        </section>
        <aside className={styles.source} aria-labelledby="source-preview-title"><header><div><p className={styles.eyebrow}>Original source</p><h2 id="source-preview-title" ref={sourceHeading} tabIndex={-1}>{sourceText ? mode === "file" ? "Sample document" : "Your instructions" : "Source preview"}</h2></div><FileText aria-hidden="true" /></header>
          {sourceText ? <article className={styles.paper}><div className={styles.paperTop}><span>{mode === "file" ? "ALGEBRA / SAMPLE" : "PASTED TEXT"}</span><span>01</span></div><pre>{sourceText}</pre><footer>Original directions</footer></article> : <div className={styles.emptySource}><FileText aria-hidden="true" /><p>No source selected</p></div>}
          {phase === "review" && <button className={`${styles.textAction} ${styles.sourceJump}`} type="button" onClick={() => { heading.current?.focus(); heading.current?.scrollIntoView({ block: "start" }); }}><ArrowLeft aria-hidden="true" />Back to details</button>}
        </aside>
      </div>
    </main>
  </div>;
}
