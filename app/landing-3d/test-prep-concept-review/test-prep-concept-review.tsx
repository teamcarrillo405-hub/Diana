"use client";

import { PreviewNavigation } from "../_components/preview-navigation";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, ChevronRight, Pencil, Play, Plus, RotateCcw } from "lucide-react";
import { PREP_FIXTURES, PREP_MODES, scoreLabel, type LocalRecord, type PracticeKind, type PrepFixture, type PrepMode } from "./fixtures";
import styles from "./test-prep-concept-review.module.css";

const SUBJECT_ART = {
  chemistry: { src: "/assets/landing-10k/subjects/chemistry.webp", alt: "Glassware and solutions in a chemistry laboratory" },
  english: { src: "/assets/landing-10k/subjects/english.webp", alt: "A collection of books for English study" },
};

function Event({ fixture, focus, onFocusChange, onPractice, recordCount }: {
  fixture: PrepFixture; focus: string; onFocusChange: (value: string) => void; onPractice: () => void; recordCount: number;
}) {
  const art = SUBJECT_ART[fixture.id];
  return <div className={styles.event}>
    <div className={styles.eventIdentity}>
      <section className={styles.eventArt} aria-labelledby="test-event-title">
        <img src={art.src} alt={art.alt} width={1600} height={1200} />
        <span className={styles.subject}>{fixture.course}</span>
        <h2 id="test-event-title">{fixture.assessment}</h2>
      </section>
      <aside className={styles.eventFacts} aria-label="Test details">
        <div className={styles.countdown}><span>Until test day</span><strong>{fixture.countdown.split(" ")[0].padStart(2, "0")}<small>days</small></strong><p>{fixture.date}</p></div>
        <dl><div><dt>Topics</dt><dd>{String(fixture.topics.length).padStart(2, "0")}</dd></div><div><dt>Sets recorded</dt><dd>{String(recordCount).padStart(2, "0")}</dd></div></dl>
      </aside>
    </div>
    <section className={styles.launchBand} aria-label="Next practice">
      <div><span className={styles.eyebrow}>Practice focus</span><h3>{focus || fixture.focus}</h3></div>
      <button type="button" className={styles.primaryAction} onClick={onPractice}><Play aria-hidden="true" fill="currentColor" />Enter training</button>
    </section>
    <details className={styles.focusEditor}>
      <summary><Pencil aria-hidden="true" />Edit prep focus</summary>
      <label><span>Current prep focus</span><input aria-label="Current prep focus" value={focus} onChange={event => onFocusChange(event.target.value)} /></label>
    </details>
  </div>;
}

function Scouting({ fixture }: { fixture: PrepFixture }) {
  const [active, setActive] = useState(fixture.topics[0].id);
  const selected = fixture.topics.find(topic => topic.id === active) ?? fixture.topics[0];
  return <div className={styles.coverage}>
    <section><header className={styles.sectionHeading}><span className={styles.eyebrow}>Scouting</span><h2>Know the topics.</h2></header>
      <div className={styles.topicRows} role="list" aria-label="Coverage topics">{fixture.topics.map((topic, index) => <div role="listitem" key={topic.id}>
        <button type="button" aria-pressed={topic.id === active} onClick={() => setActive(topic.id)}>
          <span className={styles.index}>{String(index + 1).padStart(2, "0")}</span><span><strong>{topic.label}</strong><small data-state={topic.status}>{topic.status === "priority" ? "Focus next" : topic.status === "building" ? "Building" : "Practiced"}</small></span><ChevronRight aria-hidden="true" />
        </button>
      </div>)}</div>
    </section>
    <aside className={styles.topicDetail} aria-live="polite"><span className={styles.eyebrow}>Practice detail</span><h3>{selected.label}</h3><p>{selected.note}</p><span className={styles.nextRep}>{selected.nextRep}</span></aside>
  </div>;
}

function Training({ fixture, kind, onKindChange, started, onStart, answer, onAnswer, checked, onCheck, onReset }: {
  fixture: PrepFixture; kind: PracticeKind; onKindChange: (kind: PracticeKind) => void; started: boolean; onStart: () => void;
  answer: number | null; onAnswer: (index: number) => void; checked: boolean; onCheck: () => void; onReset: () => void;
}) {
  const [written, setWritten] = useState("");
  function reset() { setWritten(""); onReset(); }
  if (!started) return <section className={styles.training}>
    <header className={styles.sectionHeading}><span className={styles.eyebrow}>Training</span><h2>Choose your practice.</h2></header>
    <div className={styles.practiceFormats} role="group" aria-label="Practice format">
      {(["Mixed", "Multiple choice", "Written response"] as const).map((value, index) => <button type="button" key={value} aria-pressed={kind === value} onClick={() => onKindChange(value)}>
        <span className={styles.index} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><strong>{value}</strong>{kind === value ? <Check aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
      </button>)}
    </div>
    <div className={styles.trainingLaunch}><div><span className={styles.eyebrow}>One sample question</span><p>{fixture.focus}</p></div><button type="button" className={styles.primaryAction} onClick={onStart}><Play aria-hidden="true" fill="currentColor" />Start training rep</button></div>
  </section>;
  const isWritten = kind === "Written response";
  return <section className={styles.questionRound} aria-labelledby="sample-question-heading">
    <div className={styles.questionTop}><span className={styles.eyebrow}>Practice / 01</span><button type="button" className={styles.textAction} onClick={reset}><RotateCcw aria-hidden="true" />Change format</button></div>
    <h2 id="sample-question-heading">{fixture.sample.prompt}</h2>
    {isWritten ? <label className={styles.writtenAnswer}><span>Your response</span><textarea value={written} onChange={event => setWritten(event.target.value)} rows={6} readOnly={checked} /></label> :
      <fieldset className={styles.answers}><legend className={styles.srOnly}>Sample answers</legend>{fixture.sample.answers.map((choice, index) => <label key={choice} data-selected={answer === index} data-answer={checked && index === fixture.sample.answer}>
        <input type="radio" name={`answer-${fixture.id}`} checked={answer === index} disabled={checked} onChange={() => onAnswer(index)} />
        <span className={styles.answerLetter} aria-hidden="true">{String.fromCharCode(65 + index)}</span><span>{choice}</span>{checked && index === fixture.sample.answer && <Check aria-hidden="true" />}
      </label>)}</fieldset>}
    {checked && <p className={styles.feedback} role="status">{fixture.sample.explanation}</p>}
    <div className={styles.questionActions}>
      {!checked && <button type="button" className={styles.primaryAction} disabled={isWritten ? !written.trim() : answer === null} onClick={onCheck}><Check aria-hidden="true" />{isWritten ? "Review explanation" : "Check sample"}</button>}
      {checked && <button type="button" className={styles.primaryAction} onClick={reset}><RotateCcw aria-hidden="true" />Return to practice formats</button>}
    </div>
  </section>;
}

function Playbook({ fixture }: { fixture: PrepFixture }) {
  return <section className={styles.plan}><header className={styles.sectionHeading}><span className={styles.eyebrow}>Playbook</span><h2>Your prep schedule.</h2></header>
    <ol>{fixture.plan.map((entry, index) => <li key={entry.day} data-current={entry.state === "now"}>
      <span className={styles.planNumber}>{String(index + 1).padStart(2, "0")}</span><div><h3>{entry.day}</h3><p>{entry.label}</p></div>
    </li>)}</ol>
  </section>;
}

function Review({ records, onAdd }: {
  records: LocalRecord[]; onAdd: (kind: PracticeKind, correct: string, total: string, focus: string) => void;
}) {
  const [kind, setKind] = useState<PracticeKind>("Mixed");
  const [correct, setCorrect] = useState("");
  const [total, setTotal] = useState("");
  const [focus, setFocus] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  function submit() {
    if (!scoreLabel(correct, total)) { setNotice("Enter a whole-number result where the correct count does not exceed the total."); return; }
    onAdd(kind, correct, total, focus); setCorrect(""); setTotal(""); setFocus(""); setNotice("Local practice result added. Nothing was saved to your account.");
  }
  return <section className={styles.review}>
    <header className={styles.sectionHeading}><span className={styles.eyebrow}>Review</span><h2>Your practice record.</h2></header>
    <ol className={styles.recordRows}>{records.map(record => <li key={record.id}><span>{record.date}</span><div><h3>{record.kind}</h3><p>{record.focus}</p></div><strong>{record.score}</strong></li>)}</ol>
    <details className={styles.resultEntry}>
      <summary><Plus aria-hidden="true" />Log a result<ChevronDown aria-hidden="true" /></summary>
      <div className={styles.resultForm}>
        <label><span>Practice format</span><select aria-label="Practice format" value={kind} onChange={event => setKind(event.target.value as PracticeKind)}><option>Mixed</option><option>Multiple choice</option><option>Written response</option></select></label>
        <div className={styles.scoreInputs}><label><span>Correct</span><input aria-label="Correct answers" inputMode="numeric" value={correct} onChange={event => setCorrect(event.target.value)} /></label><label><span>Total</span><input aria-label="Total questions" inputMode="numeric" value={total} onChange={event => setTotal(event.target.value)} /></label></div>
        <label className={styles.reviewFocus}><span>Review next</span><textarea aria-label="Next review focus" value={focus} onChange={event => setFocus(event.target.value)} rows={2} /></label>
        {notice && <p role="status" className={styles.formNotice}>{notice}</p>}
        <button type="button" className={styles.primaryAction} onClick={submit}><Plus aria-hidden="true" />Log local rep</button>
      </div>
    </details>
  </section>;
}

export function TestPrepConceptReview() {
  const [fixtureId, setFixtureId] = useState<PrepFixture["id"]>("chemistry");
  const [mode, setMode] = useState<PrepMode>("Event");
  const [practiceKind, setPracticeKind] = useState<PracticeKind>("Mixed");
  const [focus, setFocus] = useState(PREP_FIXTURES.chemistry.focus);
  const [practiceStarted, setPracticeStarted] = useState(false);
  const [answer, setAnswer] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [records, setRecords] = useState<Record<PrepFixture["id"], LocalRecord[]>>({ chemistry: PREP_FIXTURES.chemistry.records, english: PREP_FIXTURES.english.records });
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const launchHeading = useRef<HTMLDivElement>(null);
  const recordId = useRef(0);
  const fixture = PREP_FIXTURES[fixtureId];
  const panelId = useId();

  function resetPractice() { setPracticeStarted(false); setAnswer(null); setChecked(false); }
  function changeFixture(id: PrepFixture["id"]) { setFixtureId(id); setFocus(PREP_FIXTURES[id].focus); resetPractice(); }
  function openPractice() {
    setMode("Training"); resetPractice();
    requestAnimationFrame(() => launchHeading.current?.focus({ preventScroll: true }));
  }
  function selectMode(next: PrepMode, moveFocus = false) {
    setMode(next);
    const tab = tabRefs.current[PREP_MODES.indexOf(next)];
    if (moveFocus) tab?.focus({ preventScroll: true });
    tab?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }
  function selectFromKeyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = ["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : ["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 : 0;
    if (!step && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? PREP_MODES.length - 1 : (index + step + PREP_MODES.length) % PREP_MODES.length;
    selectMode(PREP_MODES[next], true);
  }
  function addResult(kind: PracticeKind, correct: string, total: string, review: string) {
    const score = scoreLabel(correct, total); if (!score) return;
    const record: LocalRecord = { id: `local-${++recordId.current}`, kind, score, date: "LOCAL", focus: review.trim() || "No next focus entered", local: true };
    setRecords(previous => ({ ...previous, [fixtureId]: [record, ...previous[fixtureId]] }));
  }

  return <main className={styles.root} id="main-content" data-mode={mode.toLowerCase()}>
    <img className={styles.world} src="/assets/today-now/diana-signature-studio-v1-1678.webp" alt="" />
    <PreviewNavigation active="Classes" />
    <div className={styles.shell}>
      <header className={styles.pageHeading}><h1>Test prep</h1><select aria-label="Preview test" value={fixtureId} onChange={event => changeFixture(event.target.value as PrepFixture["id"])}><option value="chemistry">Chemistry Unit 4</option><option value="english">AP English Language</option></select></header>
      <div className={styles.composition}>
        <aside className={styles.rail}>
          <div role="tablist" aria-label="Test preparation sections" className={styles.modeTabs}>{PREP_MODES.map((item, index) => <button key={item} ref={element => { tabRefs.current[index] = element; }} type="button" role="tab" aria-label={item} aria-selected={mode === item} aria-controls={`${panelId}-${item}`} id={`${panelId}-tab-${item}`} tabIndex={mode === item ? 0 : -1} onClick={() => selectMode(item)} onKeyDown={event => selectFromKeyboard(event, index)}><strong>{item}</strong></button>)}</div>
        </aside>
        <div className={styles.stage}>
          {mode !== "Event" && <div className={styles.eventContext}><span>{fixture.course}</span><span>{fixture.assessment}</span></div>}
          {PREP_MODES.map(item => <section key={item} id={`${panelId}-${item}`} role="tabpanel" aria-labelledby={`${panelId}-tab-${item}`} hidden={mode !== item} className={styles.panel}>
            {item === "Event" && <Event fixture={fixture} focus={focus} onFocusChange={setFocus} onPractice={openPractice} recordCount={records[fixtureId].length} />}
            {item === "Scouting" && <Scouting key={fixtureId} fixture={fixture} />}
            {item === "Training" && <div ref={launchHeading} tabIndex={-1} className={styles.trainingFocus}><Training key={fixtureId} fixture={fixture} kind={practiceKind} onKindChange={setPracticeKind} started={practiceStarted} onStart={() => setPracticeStarted(true)} answer={answer} onAnswer={setAnswer} checked={checked} onCheck={() => setChecked(true)} onReset={resetPractice} /></div>}
            {item === "Playbook" && <Playbook fixture={fixture} />}
            {item === "Review" && <Review key={fixtureId} records={records[fixtureId]} onAdd={addResult} />}
          </section>)}
        </div>
      </div>
      <footer className={styles.previewNote}>Design preview <span>/</span> Sample data</footer>
    </div>
  </main>;
}
