"use client";

import { useEffect, useReducer, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, Check, CheckCheck, Circle, Clock3, PanelRightOpen, Play, Square, WifiOff, X } from "lucide-react";
import { createPreviewState, elapsedFocus, FIXTURES, previewReducer, resolveFixture, resolveScenario, toggleFocus, unitStatus, workKey, workSnapshot, type FixtureId, type FocusClock, type InspectorMode, type Scenario } from "./fixtures";
import { PreviewConversation } from "./preview-conversation";
import { PreviewWorkPad } from "./preview-work-pad";
import styles from "./workspace-concept-review.module.css";
import { PreviewNavigation } from "../_components/preview-navigation";

const MODES = ["source", "rubric"] as const;
const MODE_LABELS = { source: "Source", rubric: "Rubric" };

function nextSelection(event: KeyboardEvent<HTMLButtonElement>, index: number, length: number) {
  const step = ["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : ["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 : 0;
  if (!step && event.key !== "Home" && event.key !== "End") return null;
  event.preventDefault();
  return event.key === "Home" ? 0 : event.key === "End" ? length - 1 : (index + step + length) % length;
}

export function WorkspaceConceptReview({ initialFixture = "algebra", initialScenario = "draft", isActive = true, onBack, onFocusTime }: {
  initialFixture?: FixtureId; initialScenario?: Scenario; isActive?: boolean; onBack?: () => void; onFocusTime?: (seconds: number) => void;
}) {
  const [state, dispatch] = useReducer(previewReducer, { fixture: initialFixture, scenario: initialScenario }, ({ fixture, scenario }) => createPreviewState(fixture, scenario));
  const embedded = Boolean(onBack);
  const [mode, setMode] = useState<InspectorMode>("source");
  const [compact, setCompact] = useState(false);
  const [horizontalRoster, setHorizontalRoster] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [reviews, setReviews] = useState<Record<string, boolean>>({});
  const [clock, setClock] = useState<FocusClock>({ elapsedMs: 0, startedAt: null });
  const [now, setNow] = useState(0);
  const unitButtons = useRef(new Map<string, HTMLButtonElement>());
  const inspectorTrigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const assignment = FIXTURES[state.fixture];
  const work = state.work[workKey(state.fixture, state.scenario)];
  const active = assignment.units.find(unit => unit.id === work.selected)!;
  const draft = work.units[work.selected];
  const reviewed = draft.reviewedText !== null && draft.reviewedText === workSnapshot(draft);
  const unitKey = `${workKey(state.fixture, state.scenario)}:${active.id}`;
  const completed = Object.values(work.units).filter(unit => unit.complete).length;
  const seconds = Math.floor(elapsedFocus(clock, now) / 1000);
  const timeLabel = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  useEffect(() => { dispatch({ type: "fixture", fixture: initialFixture }); }, [initialFixture]);
  useEffect(() => {
    if (isActive && embedded) heading.current?.focus({ preventScroll: true });
    if (!isActive) {
      setInspectorOpen(false);
      const timestamp = Date.now();
      setNow(timestamp);
      setClock(current => current.startedAt === null ? current : toggleFocus(current, timestamp));
    }
  }, [isActive, embedded]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1100px)");
    const rosterMedia = window.matchMedia("(max-width: 760px)");
    const sync = () => { setCompact(media.matches); setHorizontalRoster(rosterMedia.matches); if (!media.matches) setInspectorOpen(false); };
    sync();
    media.addEventListener("change", sync);
    rosterMedia.addEventListener("change", sync);
    return () => { media.removeEventListener("change", sync); rosterMedia.removeEventListener("change", sync); };
  }, []);

  useEffect(() => {
    if (clock.startedAt === null) return;
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [clock.startedAt]);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (inspectorOpen && compact && !element.open) element.showModal();
    if ((!inspectorOpen || !compact) && element.open) {
      element.close();
      if (compact) inspectorTrigger.current?.focus();
      else editor.current?.focus();
    }
  }, [inspectorOpen, compact]);

  function selectUnit(id: string, focus = false) {
    dispatch({ type: "select", id });
    if (focus) unitButtons.current.get(id)?.focus();
  }

  function backToLobby() {
    onFocusTime?.(Math.floor(elapsedFocus(clock, Date.now()) / 1000));
    onBack?.();
  }

  function inspectorKey(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setInspectorOpen(false);
      return;
    }
    if (event.key !== "Tab") return;
    const sheet = event.currentTarget;
    const controls = Array.from(sheet.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]"))
      .filter(element => element.tabIndex >= 0 && !element.matches(":disabled") && !element.closest('[hidden], [inert], [aria-hidden="true"]'));
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!first || !last) { event.preventDefault(); return; }
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !sheet.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !sheet.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }

  return <div className={styles.root} data-workspace-preview>
    <img className={styles.world} src="/assets/today-now/diana-signature-studio-v1-1678.webp" alt="" />
    <PreviewNavigation active="Work" onLobby={onBack ? backToLobby : undefined} />
    <aside className={styles.previewBar} aria-label="Design preview controls">
      <div><strong>LOCAL PREVIEW</strong><p>Chat and voice are not connected. Reload resets your work.</p></div>
      {!onBack && <div className={styles.fixtureControls}>
        <label>Fixture<select aria-label="Preview fixture" value={state.fixture} onChange={event => dispatch({ type: "fixture", fixture: resolveFixture(event.target.value) })}><option value="algebra">Algebra</option><option value="english">English</option><option value="history">History</option><option value="biology">Biology</option></select></label>
        <label>State<select aria-label="Preview state" value={state.scenario} onChange={event => dispatch({ type: "scenario", scenario: resolveScenario(event.target.value) })}><option value="draft">Draft</option><option value="empty">Empty</option><option value="connection-unavailable">Connection unavailable</option></select></label>
      </div>}
    </aside>
    <div className={styles.navigation}>
      {onBack ? <button type="button" className={styles.back} onClick={backToLobby}><ArrowLeft aria-hidden="true" />Back to Lobby</button> : <a href="/landing-3d/work-capture-review" className={styles.back}><ArrowLeft aria-hidden="true" />Back to capture</a>}
    </div>
    <main id={isActive ? "main-content" : undefined} tabIndex={-1} className={styles.main}>
      <header className={styles.heading}>
        <div><p>{assignment.course} <span>/ SAMPLE ASSIGNMENT</span></p><h1 ref={heading} tabIndex={-1}>{assignment.title}</h1></div>
        <div className={styles.focusClock} role="group" aria-label="Local focus timer">
          <Clock3 aria-hidden="true" /><span><small>Focus / local only</small><output aria-label="Focus elapsed time">{timeLabel}</output></span>
          <button className={styles.timerButton} type="button" aria-label={clock.startedAt === null ? "Start focus timer" : "Stop focus timer"} onClick={() => { const timestamp = Date.now(); if (clock.startedAt !== null) onFocusTime?.(Math.floor(elapsedFocus(clock, timestamp) / 1000)); setNow(timestamp); setClock(current => toggleFocus(current, timestamp)); }}>
            {clock.startedAt === null ? <Play aria-hidden="true" /> : <Square aria-hidden="true" />}{clock.startedAt === null ? "Start" : "Stop"}
          </button>
        </div>
      </header>
      {state.scenario === "connection-unavailable" && <div className={styles.connectionNotice} role="status"><WifiOff aria-hidden="true" /><span>Connection unavailable example. Your draft stays in this preview. No connection or retry is attempted.</span></div>}
      <div className={styles.workspace}>
        <aside className={styles.roster} aria-label="Work units">
          <h2>Your work</h2><p>{completed} of {assignment.units.length} complete locally</p>
          <div role="tablist" aria-label="Assignment units" aria-orientation={horizontalRoster ? "horizontal" : "vertical"} className={styles.unitList}>
            {assignment.units.map((unit, index) => <button type="button" role="tab" key={unit.id} id={`tab-${unit.id}`} aria-controls={`panel-${unit.id}`} aria-selected={unit.id === active.id} tabIndex={unit.id === active.id ? 0 : -1}
              ref={element => { if (element) unitButtons.current.set(unit.id, element); else unitButtons.current.delete(unit.id); }}
              onClick={() => selectUnit(unit.id)} onKeyDown={event => { const next = nextSelection(event, index, assignment.units.length); if (next !== null) selectUnit(assignment.units[next].id, true); }}>
              <span><strong>{unit.label}</strong><small>{unitStatus(work.units[unit.id])}</small></span>{work.units[unit.id].complete ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}
            </button>)}
          </div>
          <div className={styles.submissionState}><CheckCheck aria-hidden="true" /><span>Not submitted<small>Completion is local to this preview.</small></span></div>
        </aside>
        <div className={styles.studentWork}>
          {assignment.units.filter(unit => unit.id !== active.id).map(unit => <div hidden key={unit.id} id={`panel-${unit.id}`} role="tabpanel" aria-labelledby={`tab-${unit.id}`} />)}
          <section className={styles.workPlane} id={`panel-${active.id}`} role="tabpanel" aria-labelledby={`tab-${active.id}`}>
            <header className={styles.prompt}>
              <div className={styles.promptMeta}><span>{active.label}</span><span className={styles.unitStatus} data-complete={draft.complete} role="status">{unitStatus(draft)}</span><button ref={inspectorTrigger} type="button" className={`${styles.iconButton} ${styles.mobileInspector}`} title="Open source and rubric" aria-label="Open source and rubric" aria-haspopup="dialog" aria-expanded={inspectorOpen} onClick={() => setInspectorOpen(true)}><PanelRightOpen aria-hidden="true" /></button></div>
              <h2 className={state.fixture === "algebra" ? styles.equation : styles.writingPrompt}>{active.prompt}</h2>
              <p>{assignment.directions}</p>
            </header>
            <PreviewConversation key={`chat:${unitKey}`} draft={draft} cue={active.cue} rubric={assignment.rubric} reviewed={reviewed} reviewOpen={Boolean(reviews[unitKey])} onCloseReview={() => setReviews(current => ({ ...current, [unitKey]: false }))} onKeepWorking={() => editor.current?.focus()} dispatch={dispatch} />
            <PreviewWorkPad key={`pad:${unitKey}`} work={draft.text} ink={draft.ink} onWorkChange={text => dispatch({ type: "edit", text })} onInkChange={ink => dispatch({ type: "ink", ink })} onReview={() => setReviews(current => ({ ...current, [unitKey]: true }))} editorRef={editor} onUndoText={() => { dispatch({ type: "undo" }); editor.current?.focus(); }} canUndoText={draft.history.length > 0} />
          </section>
        </div>
        {!compact && <aside className={styles.inspector} aria-label="Assignment inspector"><Inspector fixture={state.fixture} unitId={active.id} mode={mode} onMode={setMode} prefix="desktop" /></aside>}
      </div>
      <p className={styles.sessionNote}>Sample work / this session only <span>Focus time does not complete your work.</span></p>
    </main>
    <dialog ref={dialog} className={styles.sheet} aria-labelledby="inspector-title" aria-describedby="inspector-description" onCancel={event => { event.preventDefault(); setInspectorOpen(false); }} onKeyDown={inspectorKey} onClick={event => { if (event.target === event.currentTarget) setInspectorOpen(false); }}>
      {compact && <><header className={styles.sheetHeading}><div><h2 id="inspector-title">Assignment inspector</h2><p id="inspector-description">Original directions and sample rubric.</p></div><button autoFocus type="button" className={styles.iconButton} title="Close inspector" aria-label="Close inspector" onClick={() => setInspectorOpen(false)}><X aria-hidden="true" /></button></header><Inspector fixture={state.fixture} unitId={active.id} mode={mode} onMode={setMode} prefix="mobile" /></>}
    </dialog>
  </div>;
}

function Inspector({ fixture, unitId, mode, onMode, prefix }: { fixture: FixtureId; unitId: string; mode: InspectorMode; onMode: (mode: InspectorMode) => void; prefix: string }) {
  const buttons = useRef(new Map<InspectorMode, HTMLButtonElement>());
  const assignment = FIXTURES[fixture];
  const unit = assignment.units.find(item => item.id === unitId)!;
  return <>
    <div className={styles.inspectorTabs} role="tablist" aria-label="Inspector views">
      {MODES.map((item, index) => <button key={item} type="button" role="tab" id={`${prefix}-tab-${item}`} aria-controls={`${prefix}-panel-${item}`} aria-selected={mode === item} tabIndex={mode === item ? 0 : -1} ref={element => { if (element) buttons.current.set(item, element); else buttons.current.delete(item); }} onClick={() => onMode(item)} onKeyDown={event => { const next = nextSelection(event, index, MODES.length); if (next !== null) { onMode(MODES[next]); buttons.current.get(MODES[next])?.focus(); } }}>{MODE_LABELS[item]}</button>)}
    </div>
    {MODES.map(item => <section key={item} id={`${prefix}-panel-${item}`} role="tabpanel" aria-labelledby={`${prefix}-tab-${item}`} hidden={mode !== item} className={styles.inspectorContent} tabIndex={0}>
      {item === "source" && <><p className={styles.overline}>Sample source / not imported</p><h3>{assignment.sourceTitle}</h3><p className={styles.sourceText}>{assignment.source}</p><div className={styles.sourceContext}><span>Current unit</span><strong>{unit.prompt}</strong></div><p className={styles.muted}>Fixture text only. No original file or school connection.</p></>}
      {item === "rubric" && <><p className={styles.overline}>Sample rubric</p><h3>What to look for</h3><ol className={styles.rubric}>{assignment.rubric.map(line => <li key={line}>{line}</li>)}</ol><p className={styles.muted}>For your self-review. No score or teacher approval.</p></>}
    </section>)}
  </>;
}
