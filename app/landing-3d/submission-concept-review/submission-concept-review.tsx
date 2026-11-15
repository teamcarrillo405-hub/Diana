"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronRight, CircleAlert, FileText, RotateCcw } from "lucide-react";
import styles from "./submission-concept-review.module.css";
import { PreviewNavigation } from "../_components/preview-navigation";

type Section = "review" | "handoff" | "receipt";
type Scenario = "ready" | "incomplete" | "stale" | "unavailable" | "pending" | "not-accepted" | "accepted" | "graded";
type Outcome = "recorded" | "pending" | "not-accepted" | "accepted" | "graded" | null;
type FixtureId = "manual" | "canvas" | "classroom";

const FIXTURES = {
  manual: {
    course: "Algebra I",
    title: "Linear equations",
    destination: "Teacher's school portal",
    method: "PDF hand-in",
    output: "linear-equations.pdf",
    handoff: "manual",
    work: [
      { label: "Problem 1", prompt: "3x + 5 = 20", answer: "3x = 15\nx = 5\nCheck: 3(5) + 5 = 20" },
      { label: "Problem 2", prompt: "2(x - 4) = 14", answer: "x - 4 = 7\nx = 11" },
      { label: "Problem 3", prompt: "5x - 7 = 3x + 9", answer: "2x = 16\nx = 8" },
    ],
  },
  canvas: {
    course: "English 10",
    title: "A claim with evidence",
    destination: "Canvas",
    method: "Text entry",
    output: "The text shown in this review",
    handoff: "connected",
    work: [
      { label: "Response", prompt: "How does the author build the central claim?", answer: "The author begins with a clear claim, then supports it with a specific example. The final paragraph connects that example back to the opening idea." },
    ],
  },
  classroom: {
    course: "Biology",
    title: "Cell structure lab",
    destination: "Google Classroom",
    method: "PDF file",
    output: "cell-structure-lab.pdf",
    handoff: "connected",
    work: [
      { label: "Observation", prompt: "Compare the two cell samples.", answer: "Sample A has a visible cell wall and a more regular shape. Sample B has no visible cell wall." },
      { label: "Conclusion", prompt: "What does the evidence suggest?", answer: "The visible wall in Sample A supports identifying it as a plant cell." },
    ],
  },
} as const;

const SECTIONS: { id: Section; label: string }[] = [
  { id: "review", label: "Review work" },
  { id: "handoff", label: "Handoff" },
  { id: "receipt", label: "Receipt" },
];

const CHECKS = [
  { id: "work", label: "I reviewed the outgoing work" },
  { id: "instructions", label: "I checked the assignment directions" },
  { id: "destination", label: "This is the right destination" },
] as const;

function initialOutcome(scenario: Scenario): Outcome {
  if (scenario === "pending" || scenario === "not-accepted" || scenario === "accepted" || scenario === "graded") return scenario;
  return null;
}

function nextSection(event: KeyboardEvent<HTMLButtonElement>, index: number, available: Section[]) {
  const step = ["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : ["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 : 0;
  if (!step && event.key !== "Home" && event.key !== "End") return null;
  event.preventDefault();
  return available[event.key === "Home" ? 0 : event.key === "End" ? available.length - 1 : (index + step + available.length) % available.length];
}

export function SubmissionConceptReview() {
  const [fixtureId, setFixtureId] = useState<FixtureId>("manual");
  const [scenario, setScenario] = useState<Scenario>("ready");
  return <div className={styles.root} data-submission-preview>
    <img className={styles.world} src="/assets/today-now/diana-signature-studio-v1-1678.webp" alt="" />
    <PreviewNavigation active="Work" />
    <aside className={styles.previewBar} aria-label="Design preview controls">
      <div><strong>DESIGN PREVIEW / LOCAL FIXTURES</strong><p>Memory only. Reload resets the flow. No PDF, school submission, or account receipt is created.</p></div>
      <div className={styles.fixtureControls}>
        <label>Destination<select aria-label="Preview destination" value={fixtureId} onChange={event => { const next = event.target.value as FixtureId; setFixtureId(next); if (next === "manual" && ["unavailable", "pending", "not-accepted", "accepted"].includes(scenario)) setScenario("ready"); }}><option value="manual">Manual hand-in</option><option value="canvas">Canvas text</option><option value="classroom">Classroom PDF</option></select></label>
        <label>State<select aria-label="Preview state" value={scenario} onChange={event => { const next = event.target.value as Scenario; setScenario(next); if (fixtureId === "manual" && ["unavailable", "pending", "not-accepted", "accepted"].includes(next)) setFixtureId("canvas"); }}><option value="ready">Ready to review</option><option value="incomplete">Incomplete work</option><option value="stale">Work changed</option><option value="unavailable">School unavailable</option><option value="pending">Awaiting school</option><option value="not-accepted">Not accepted</option><option value="accepted">Accepted receipt</option><option value="graded">Graded receipt</option></select></label>
      </div>
    </aside>
    <div className={styles.navigation}>
      <a href="/landing-3d/workspace-concept-review" className={styles.back}><ArrowLeft aria-hidden="true" />Back to active work</a>
    </div>
    <SubmissionScreen key={`${fixtureId}:${scenario}`} fixtureId={fixtureId} scenario={scenario} />
  </div>;
}

function SubmissionScreen({ fixtureId, scenario }: { fixtureId: FixtureId; scenario: Scenario }) {
  const fixture = FIXTURES[fixtureId];
  const [outcome, setOutcome] = useState<Outcome>(() => initialOutcome(scenario));
  const [section, setSection] = useState<Section>(() => initialOutcome(scenario) === "accepted" || initialOutcome(scenario) === "graded" ? "receipt" : initialOutcome(scenario) ? "handoff" : "review");
  const [checks, setChecks] = useState<Record<string, boolean>>(() => initialOutcome(scenario) ? Object.fromEntries(CHECKS.map(check => [check.id, true])) : {});
  const [confirmed, setConfirmed] = useState(false);
  const [stale, setStale] = useState(scenario === "stale");
  const [preparedFile, setPreparedFile] = useState(fixture.method === "Text entry" || initialOutcome(scenario) !== null);
  const [horizontalRail, setHorizontalRail] = useState(false);
  const [feedback, setFeedback] = useState("");
  const checkCount = CHECKS.filter(check => checks[check.id]).length;
  const ready = checkCount === CHECKS.length && !stale;
  const hasReceipt = outcome === "recorded" || outcome === "accepted" || outcome === "graded";
  const available = SECTIONS.filter(item => item.id !== "receipt" || hasReceipt).map(item => item.id);
  const selectedIndex = available.indexOf(section);

  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia("(max-width: 700px)");
    const sync = () => setHorizontalRail(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  function selectSection(next: Section, focus = false) {
    setSection(next);
    if (focus) requestAnimationFrame(() => document.getElementById(`submission-tab-${next}`)?.focus());
  }

  function completeHandoff() {
    if (!ready || !confirmed || !preparedFile || scenario === "unavailable") return;
    const next = fixture.handoff === "manual" ? "recorded" : "pending";
    setOutcome(next);
    setFeedback(next === "recorded" ? "Hand-in recorded in this preview. School delivery has not been verified." : "Sample school response is pending. No request was sent.");
    setConfirmed(false);
    if (next === "recorded") selectSection("receipt", true);
  }

  return <main id="main-content" className={styles.main}>
    <div className={styles.heading}>
      <div><p>{fixture.course} <span>/ SAMPLE ASSIGNMENT</span></p><h1>{fixture.title}</h1></div>
      <span className={styles.overallState} data-receipt={hasReceipt}>{hasReceipt ? outcome === "graded" ? "Grade recorded" : outcome === "accepted" ? "Accepted by school / sample" : "Recorded in Diana / sample" : "Not submitted"}</span>
    </div>
    <div className={styles.composition}>
      <aside className={styles.rail} aria-label="Submission stages">
        <p className={styles.railHeading}>Submission</p>
        <div role="tablist" aria-label="Submission stages" aria-orientation={horizontalRail ? "horizontal" : "vertical"} className={styles.stageTabs}>
          {SECTIONS.map(item => <button key={item.id} type="button" role="tab" id={`submission-tab-${item.id}`} aria-controls={`submission-panel-${item.id}`} aria-selected={section === item.id} aria-disabled={item.id === "receipt" && !hasReceipt} tabIndex={section === item.id ? 0 : -1}
            onClick={() => { if (item.id !== "receipt" || hasReceipt) selectSection(item.id); }}
            onKeyDown={event => { const next = nextSection(event, selectedIndex, available); if (next) selectSection(next, true); }}>
            <strong>{item.label}</strong>{item.id === "receipt" && !hasReceipt ? <small>After handoff</small> : null}
          </button>)}
        </div>
        <p className={styles.railFoot}>Done in your workspace does not mean submitted.</p>
      </aside>
      <div className={styles.stage}>
        <section id="submission-panel-review" role="tabpanel" aria-labelledby="submission-tab-review" hidden={section !== "review"} className={styles.panel}>
          <div className={styles.stageIntro}><span>Outgoing work</span><h2>Review what leaves Diana</h2><p>{fixture.work.length} {fixture.work.length === 1 ? "section" : "sections"} · {fixture.method} · {fixture.destination}</p></div>
          {stale && <div className={styles.warning} role="status"><CircleAlert aria-hidden="true" /><span>Your work changed after this review was prepared. Refresh the sample before continuing.</span><button type="button" onClick={() => setStale(false)}>Refresh review</button></div>}
          {scenario === "incomplete" && <div className={styles.warning} role="status"><CircleAlert aria-hidden="true" /><span>{fixture.work.at(-1)?.label} is still marked incomplete. You can continue after checking the outgoing work.</span></div>}
          <div className={styles.document} aria-label="Sample outgoing artifact">
            <div className={styles.documentHeader}><FileText aria-hidden="true" /><span>{fixture.output}</span><small>Sample preview</small></div>
            {fixture.work.map((work, index) => <article className={styles.workRow} key={work.label}><div><h3>{work.label}</h3>{scenario === "incomplete" && index === fixture.work.length - 1 ? <small>Incomplete</small> : <small>Complete</small>}</div><p>{work.prompt}</p><pre>{scenario === "incomplete" && index === fixture.work.length - 1 ? "No final work saved for this section." : work.answer}</pre></article>)}
          </div>
        </section>
        <section id="submission-panel-handoff" role="tabpanel" aria-labelledby="submission-tab-handoff" hidden={section !== "handoff"} className={styles.panel}>
          <div className={styles.stageIntro}><span>Final handoff</span><h2>{fixture.handoff === "manual" ? "Record your hand-in" : `Send to ${fixture.destination}`}</h2><p>{fixture.handoff === "manual" ? "Diana records your confirmation after you hand this in through your teacher's method." : "The school system must accept the submission before a receipt is shown."}</p></div>
          <dl className={styles.handoffFacts}><div><dt>Destination</dt><dd>{fixture.destination}</dd></div><div><dt>Type</dt><dd>{fixture.method}</dd></div><div><dt>Output</dt><dd>{fixture.output}</dd></div></dl>
          {fixture.method !== "Text entry" && !outcome && <div className={styles.filePrep}><div><strong>{preparedFile ? "Sample PDF prepared" : "Prepare the PDF"}</strong><p>{preparedFile ? "This preview marks the file ready in memory. No file was generated or downloaded." : "Preparing the file is separate from handing it in or sending it to school."}</p></div>{!preparedFile && <button type="button" onClick={() => setPreparedFile(true)}>Prepare sample PDF</button>}</div>}
          {scenario === "unavailable" && <div className={styles.warning} role="status"><CircleAlert aria-hidden="true" /><span>School connection unavailable in this sample. Keep your work and use the school site when it returns.</span></div>}
          {outcome === "pending" && <div className={styles.pending} role="status"><strong>Awaiting school confirmation</strong><p>This is a sample pending state. Diana has no accepted school receipt yet.</p><button type="button" onClick={() => { setOutcome("accepted"); setFeedback("Sample school acceptance shown. No request was sent."); selectSection("receipt", true); }}>Show sample accepted response</button></div>}
          {outcome === "not-accepted" && <div className={styles.warning} role="status"><CircleAlert aria-hidden="true" /><span>The sample school response did not accept the handoff. Review the destination and work before trying again.</span><button type="button" onClick={() => { setOutcome(null); selectSection("review", true); }}>Review again</button></div>}
          {hasReceipt ? <p className={styles.completedNote} role="status"><Check aria-hidden="true" />{outcome === "recorded" ? "Hand-in recorded in Diana's sample receipt." : "Sample school receipt is available."}</p> : null}
          {!outcome && scenario !== "unavailable" && <div className={styles.confirmation}>
            <label><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /><span>{fixture.handoff === "manual" ? "I handed in this work using my teacher's required method." : `I checked the ${fixture.destination} destination and the ${fixture.method.toLowerCase()} above.`}</span></label>
            <button className={styles.primaryAction} type="button" disabled={!ready || !confirmed || !preparedFile} onClick={completeHandoff}>{fixture.handoff === "manual" ? "Record hand-in in Diana" : `Confirm and send to ${fixture.destination}`}<ArrowRight aria-hidden="true" /></button>
          </div>}
        </section>
        <section id="submission-panel-receipt" role="tabpanel" aria-labelledby="submission-tab-receipt" hidden={section !== "receipt"} className={styles.panel}>
          {hasReceipt && <div className={styles.receipt}><Check aria-hidden="true" /><span>Sample receipt</span><h2>{outcome === "graded" ? "Grade recorded" : outcome === "accepted" ? "School accepted this submission" : "Hand-in recorded in Diana"}</h2><p>{outcome === "recorded" ? "You confirmed that you handed this in through your teacher's method. Diana has not verified school delivery." : outcome === "graded" ? "This fixture shows a graded state. No real grade or school response was loaded." : "This fixture shows an accepted school response. No real school submission occurred."}</p><dl><div><dt>Assignment</dt><dd>{fixture.title}</dd></div><div><dt>Destination</dt><dd>{fixture.destination}</dd></div><div><dt>Output</dt><dd>{fixture.output}</dd></div><div><dt>Status</dt><dd>{outcome === "graded" ? "Graded / sample" : outcome === "accepted" ? "Accepted / sample" : "Recorded in Diana / sample"}</dd></div></dl><div className={styles.receiptLinks}><a href="/landing-3d/work-concept-review">Back to Work</a><button type="button" onClick={() => selectSection("review")}>Review outgoing work</button></div></div>}
        </section>
      </div>
      <aside className={styles.inspector} aria-label="Submission checks and destination">
        <div className={styles.destination}><span>Destination</span><strong>{fixture.destination}</strong><p>{fixture.handoff === "manual" ? "Your teacher's hand-in method" : "Connected school handoff / sample"}</p></div>
        <div className={styles.checks}><div className={styles.checkHeading}><h2>Final checks</h2><span>{checkCount} / {CHECKS.length}</span></div><p>{outcome ? "Checks from this sample handoff." : "Complete these before the handoff."}</p>{CHECKS.map(check => <label key={check.id}><input type="checkbox" checked={Boolean(checks[check.id])} disabled={Boolean(outcome)} onChange={event => setChecks(current => ({ ...current, [check.id]: event.target.checked }))} /><span>{check.label}</span></label>)}</div>
        {section === "review" && <button type="button" className={styles.primaryAction} disabled={!ready || Boolean(outcome)} onClick={() => selectSection("handoff", true)}>Continue to handoff<ChevronRight aria-hidden="true" /></button>}
        {section !== "review" && <button type="button" className={styles.secondaryAction} onClick={() => selectSection("review")}><RotateCcw aria-hidden="true" />Review work</button>}
        <p className={styles.previewNote}>Preview controls use sample data only. The check marks and receipt reset on reload.</p>
      </aside>
    </div>
    {feedback && <p className={styles.srOnly} role="status">{feedback}</p>}
  </main>;
}
