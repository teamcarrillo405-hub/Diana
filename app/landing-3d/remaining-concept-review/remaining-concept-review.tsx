"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, ChevronRight, FileText, LockKeyhole, Search } from "lucide-react";
import { reviewHref, screenInfo, type Screen } from "./catalog";
import { PreviewNavigation } from "../_components/preview-navigation";
import { moreTools, screenPlacement, toolSection } from "./navigation";
import { ReviewTools, type Scenario } from "./review-tools";
import { learningRows, type LearningSourceId, type QuizQuestion } from "./study-sources";
import styles from "./remaining-concept-review.module.css";

const noteRows = [
  { title: "Cell observations", subject: "Biology", detail: "Plant and animal cell comparison", id: "cells" },
  { title: "Theme in chapter three", subject: "English 10", detail: "Claim and two quotations", id: "theme" },
  { title: "Slope from two points", subject: "Algebra I", detail: "Worked example and definition", id: "slope" },
];
const studyRows = [
  { title: "Cell structure guide", subject: "Guide", detail: "From Cell observations", id: "guide" },
  { title: "Cell structure quiz", subject: "Quiz", detail: "Choices, recall, and written response", id: "quiz" },
];

export function RemainingConceptReview({ screen, initialSource = "biology", initialSearch = "" }: { screen: Screen; initialSource?: LearningSourceId; initialSearch?: string }) {
  const info = screenInfo[screen];
  const placement = screenPlacement(screen);
  const [scenario, setScenario] = useState<Scenario>("ready");
  const [selected, setSelected] = useState<string>(screen === "study-library" ? "guide" : screen === "notes" || screen === "notes-detail" ? "cells" : screen === "share-portfolio" ? "cell" : initialSource);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState(initialSearch);
  const [text, setText] = useState("Plant cells have a visible cell wall. Animal cells do not.");
  const [mode, setMode] = useState(screen === "onboarding" ? "Personalize" : screen === "public-home" ? "Get organized" : ["study-library", "notes", "search"].includes(screen) ? "All" : screen === "wellness" ? "Week" : screen === "student-control" ? "Diana guides" : "Text");
  const [question, setQuestion] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const quizNavigated = useRef(false);
  const stageHeading = useRef<HTMLHeadingElement>(null);
  const quizHeading = useRef<HTMLHeadingElement>(null);
  const [draftAnswers, setDraftAnswers] = useState<Record<number, string>>({});
  const [savedAnswers, setSavedAnswers] = useState<Record<number, string>>({});
  const [permission, setPermission] = useState(false);
  const [hurdle, setHurdle] = useState("Getting started");

  function localAction(message: string) { setStatus(message); }
  const currentSource = learningRows.find(row => row.id === selected) ?? learningRows[0];
  const quizItem: QuizQuestion = currentSource.questions[question];
  const quizHref = (destination: Screen) => `${reviewHref(destination)}?source=${currentSource.id}`;
  const isPublic = placement === "public" || placement === "entry" || placement === "recipient";
  const hasRail = placement === "more" || placement === "classes";

  useEffect(() => {
    if (!quizNavigated.current) return;
    quizNavigated.current = false;
    const heading = finished ? stageHeading.current : quizHeading.current;
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView?.({ block: "nearest", behavior: "auto" });
  }, [question, finished]);

  return <div className={styles.root} data-remaining-preview data-screen={screen} data-public={isPublic}>
    <img className={styles.world} src="/assets/today-now/diana-signature-studio-v1-1678.webp" alt="" />
    {isPublic ? <header className={styles.publicHeader}>
      <Link href={reviewHref("public-home")} prefetch={false} className={styles.brand} aria-label="Diana home review"><img src="/screendesign/brand/diana-logo-tight-no-shadow.png" alt="Diana" /></Link>
      {placement === "public" && <nav aria-label="Public navigation"><Link prefetch={false} href={reviewHref("student-control")}>How it works</Link><Link prefetch={false} href={reviewHref("trust")}>Trust</Link><Link prefetch={false} href={reviewHref("login")}>Sign in</Link></nav>}
      {placement === "entry" && <Link className={styles.textLink} href={reviewHref(screen === "login" ? "signup" : "login")} prefetch={false}>{screen === "login" ? "Create account" : "Sign in"}</Link>}
    </header> : <PreviewNavigation active={placement === "classes" ? "Classes" : placement === "recovery" ? "Lobby" : "More"} />}
    <ReviewTools screen={screen} scenario={scenario} onScenario={next => { setScenario(next); setStatus(""); }} />
    <main id="main-content" className={`${styles.main} ${!hasRail ? styles.standaloneMain : ""}`}>
      {hasRail && <aside className={`${styles.rail} ${placement === "more" ? styles.toolRail : ""}`} aria-label={placement === "classes" ? "Class sections" : "More tools"}>
        <Link className={styles.railBack} prefetch={false} href={`/landing-3d/${placement === "classes" ? "classes" : "more"}-concept-review`}>Back to {placement === "classes" ? "Classes" : "More"}</Link>
        <div className={styles.railItems}>{placement === "classes" ? (["class-detail", "class-policy"] as const).map(id => <Link key={id} prefetch={false} href={reviewHref(id)} aria-current={id === screen ? "page" : undefined}><strong>{id === "class-detail" ? "Overview" : "Help rules"}</strong></Link>) : moreTools.map(item => <Link key={item.section} prefetch={false} href={item.href} aria-current={item.section === toolSection(screen) ? "page" : undefined}><strong>{item.label}</strong></Link>)}</div>
      </aside>}
      <div className={styles.stage}>
        {toolSection(screen) === "study" && <nav className={styles.sectionNav} aria-label="Quiz sections"><Link prefetch={false} href={reviewHref("study")} aria-current={screen === "study" || screen === "study-new" || screen === "study-quiz" || screen === "study-results" ? "page" : undefined}>Choose work</Link><Link prefetch={false} href={reviewHref("study-library")} aria-current={screen === "study-library" || screen === "study-guide" ? "page" : undefined}>Saved practice</Link></nav>}
        {screen === "share-unavailable" ? <h1 className={styles.srOnly}>{info.title}</h1> : screen !== "public-home" && <div className={styles.intro}><h1 ref={stageHeading} tabIndex={-1}>{screen === "study-quiz" ? finished ? "Your answers" : currentSource.title : info.title}</h1></div>}
        {scenario === "attention" && <div className={styles.attention} role="status">{attentionFor(screen)}</div>}
        {renderScreen()}
        {status && <div className={styles.receipt} role="status"><Check aria-hidden="true" />{status}</div>}
      </div>
    </main>
  </div>;

  function renderScreen() {
    switch (screen) {
      case "class-detail": return <><div className={styles.statStrip}><span>Biology · Ms. Rivera</span><span>Current work: 2</span><span>Grade: not available</span></div><Roster rows={scenario === "empty" ? [] : learningRows.filter(row => row.subject === "Biology")} selected={selected} onSelect={setSelected} empty="No current work in this class." /><div className={styles.ruleSection}><h2>Materials</h2><p>Cell structure reference sheet · Teacher directions</p><button onClick={() => localAction("Material details opened in this preview.")}>View materials</button></div><a className={styles.textLink} href={reviewHref("class-policy")}>Review help rules <ArrowRight /></a></>;
      case "class-policy": return <><div className={styles.readingPlane}><p>The class rule applies before assignment-level help.</p>{[{ label: "Full help", detail: "Study help, planning, citations, and guided steps" }, { label: "Citations only", detail: "Source and citation help without content generation" }, { label: "AI off", detail: "Assignments and sources stay organized without AI help" }].map((choice, index) => <label className={styles.choice} key={choice.label}><input type="radio" name="help-rule" defaultChecked={index === 0} /><span><strong>{choice.label}</strong><small>{choice.detail}</small></span></label>)}<button className={styles.primary} onClick={() => localAction("Preview only. The class rule was not changed.")}>Save class rule</button></div></>;
      case "study": return <StudySelection rows={scenario === "empty" ? [] : learningRows} selected={selected} onSelect={setSelected} current={currentSource} />;
      case "study-library": return <><div className={styles.filterLine}><button onClick={() => setMode("All")} aria-pressed={mode === "All"}>All</button>{["Guide", "Quiz"].map(type => <button key={type} onClick={() => { setMode(type); setSelected(type === "Guide" ? "guide" : "quiz"); }} aria-pressed={mode === type}>{type}</button>)}</div><Roster rows={scenario === "empty" ? [] : studyRows.filter(row => mode === "All" || row.subject === mode)} selected={selected} onSelect={setSelected} empty="No saved practice yet." /><div className={styles.actionLine}>{scenario !== "empty" && <Link className={styles.primary} prefetch={false} href={reviewHref(selected === "quiz" ? "study-quiz" : "study-guide")}>{selected === "quiz" ? "Start saved quiz" : "Open guide"}<ArrowRight /></Link>}<Link className={styles.textLink} prefetch={false} href={reviewHref("study")}>Create quiz <ArrowRight /></Link></div></>;
      case "study-new": return <div className={styles.readingPlane}><label className={styles.field}>Assignment<select value={selected} onChange={event => setSelected(event.target.value)}>{learningRows.map(row => <option key={row.id} value={row.id}>{row.title} · {row.subject}</option>)}</select></label><div className={styles.statStrip}><span>3 questions</span><span>Choice · Recall · Your words</span></div><Link className={styles.primary} href={quizHref("study-quiz")} prefetch={false}>Start quiz <ArrowRight /></Link></div>;
      case "study-guide": return scenario === "empty" ? <Empty text="This guide has no sections to show." /> : <div className={styles.paper}><span>BIOLOGY · SOURCE: CELL OBSERVATIONS</span><h2>Cell structure</h2><nav aria-label="Guide sections"><a href="#guide-overview">Overview</a><a href="#guide-compare">Compare</a><a href="#guide-review">Review</a></nav><section id="guide-overview"><h3>Overview</h3><p>Cells have structures that help them carry out specific jobs. Compare the structures visible in your notes before drawing a conclusion.</p></section><section id="guide-compare"><h3>Plant and animal cells</h3><p>Your observations describe a visible cell wall in Sample A. Use that feature as evidence when identifying the sample.</p></section><section id="guide-review"><h3>Review prompt</h3><p>Which observation supports your conclusion most clearly? Return to the original note when you answer.</p></section></div>;
      case "study-quiz": return finished ? <QuizResults source={currentSource} answers={savedAnswers} onRestart={() => { quizNavigated.current = true; setQuestion(0); setAnswer(""); setRevealed(false); setDraftAnswers({}); setSavedAnswers({}); setFinished(false); setStatus(""); }} /> : <>
        <div className={styles.statStrip}><span>Question {question + 1} / 3</span><span>{Object.keys(savedAnswers).length} saved</span></div>
        <div className={styles.quizProgress} aria-hidden="true"><span style={{ transform: `scaleX(${question / 3})` }} /></div>
        <div className={styles.quizPlane} key={question}>
          <span>{quizItem.kind === "recall" ? "RECALL" : quizItem.kind === "written" ? "YOUR WORDS" : "CHOOSE"} · {currentSource.subject.toUpperCase()}</span>
          <h2 ref={quizHeading} tabIndex={-1}>{quizItem.prompt}</h2>
          {quizItem.kind === "choice" && quizItem.choices.map(choice => <label className={styles.choice} key={choice}><input type="radio" name="quiz-choice" checked={answer === choice} onChange={() => { setAnswer(choice); setDraftAnswers({ ...draftAnswers, [question]: choice }); }} />{choice}</label>)}
          {quizItem.kind === "recall" && <div className={styles.recall}>
            {!revealed ? <button onClick={() => setRevealed(true)}>Reveal answer</button> : <><div className={styles.recallAnswer}><span>ANSWER</span><strong>{quizItem.answer}</strong></div><fieldset><legend>How did that feel?</legend>{["Got it", "Review again"].map(choice => <label className={styles.choice} key={choice}><input type="radio" name="quiz-recall" checked={answer === choice} onChange={() => { setAnswer(choice); setDraftAnswers({ ...draftAnswers, [question]: choice }); }} />{choice}</label>)}</fieldset></>}
          </div>}
          {quizItem.kind === "written" && <label className={styles.field}>Your response<textarea value={answer} onChange={event => { setAnswer(event.target.value); setDraftAnswers({ ...draftAnswers, [question]: event.target.value }); }} placeholder="Write your answer" /></label>}
          <div className={styles.actionLine}><button disabled={question === 0} onClick={() => { quizNavigated.current = true; const next = question - 1; setQuestion(next); setAnswer(draftAnswers[next] ?? savedAnswers[next] ?? ""); setRevealed(next === 1); }}>Previous</button><button className={styles.primary} disabled={!answer.trim()} onClick={() => { quizNavigated.current = true; setSavedAnswers({ ...savedAnswers, [question]: answer }); localAction(`Question ${question + 1} saved locally.`); if (question < 2) { setQuestion(question + 1); setAnswer(draftAnswers[question + 1] ?? savedAnswers[question + 1] ?? ""); setRevealed(false); } else { setFinished(true); setStatus(""); } }}>Save {question < 2 ? "and continue" : "and review"} <ArrowRight /></button></div>
        </div>
      </>;
      case "study-results": return <><div className={styles.statStrip}><span>3 responses</span><span>1 checked</span><span>1 self-reviewed</span><span>1 written</span></div><div className={styles.readingPlane}><h2>Your answers</h2>{["Cell wall · Checked", "Nucleus · Self-reviewed", "Sample comparison · Recorded"].map(item => <div className={styles.resultRow} key={item}><Check aria-hidden="true" />{item}</div>)}<p className={styles.quiet}>The written response has no automatic score.</p><a className={styles.primary} href={reviewHref("study-quiz")}>Try another pass <ArrowRight /></a></div></>;
      case "notes": return <><SearchField value={search} onChange={setSearch} label="Search notes" /><div className={styles.filterLine}>{["All", "Biology", "English 10", "Algebra I"].map(type => <button key={type} onClick={() => setMode(type)} aria-pressed={mode === type}>{type}</button>)}</div><Roster rows={scenario === "empty" ? [] : noteRows.filter(row => (mode === "All" || row.subject === mode) && row.title.toLowerCase().includes(search.toLowerCase()))} selected={selected} onSelect={setSelected} empty="No notes match this view." /><div className={styles.actionLine}><a className={styles.primary} href={reviewHref("notes-detail")}>Open sample note <ArrowRight /></a><a className={styles.textLink} href={reviewHref("notes-new")}>New note <ArrowRight /></a></div></>;
      case "notes-new": return <><div className={styles.filterLine}>{["Text", "Voice", "Audio file", "Photo or PDF"].map(type => <button key={type} onClick={() => setMode(type)} aria-pressed={mode === type}>{type}</button>)}</div><div className={styles.editor}><label className={styles.field}>Title<input placeholder="Give this note a name" defaultValue={mode === "Text" ? "Cell observations" : ""} /></label><label className={styles.field}>Class<select><option>Biology</option><option>General</option><option>English 10</option></select></label>{mode === "Text" ? <label className={styles.field}>Your note<textarea value={text} onChange={event => setText(event.target.value)} /></label> : <div className={styles.captureMode}><FileText aria-hidden="true" /><h2>{mode}</h2><p>{mode === "Voice" ? "A recording would appear here after microphone permission." : "Choose a source to attach. Nothing is uploaded in this preview."}</p><button onClick={() => localAction("Capture control is a local specimen. No device or file was accessed.")}>Try {mode.toLowerCase()} control</button></div>}<button className={styles.primary} onClick={() => localAction("Draft saved in this preview only.")}>Save note <ArrowRight /></button></div></>;
      case "notes-detail": return <><div className={styles.statStrip}><span>Biology</span><span>Edited today · preview data</span></div><div className={styles.editor}><label className={styles.field}>Title<input defaultValue="Cell observations" /></label><label className={styles.field}>Your note<textarea value={text} onChange={event => setText(event.target.value)} /></label><div className={styles.actionLine}><button onClick={() => localAction("Source panel opened in this preview.")}>View source</button><button className={styles.primary} onClick={() => localAction("Note edit saved in this preview only.")}>Save changes <ArrowRight /></button></div></div><div className={styles.ruleSection}><h2>Ask Diana about this note</h2><p>Questions stay tied to the note and should cite the source.</p><label className={styles.field}>Your question<input placeholder="Ask about a detail" /></label><button onClick={() => localAction("No AI request was sent in this preview.")}>Ask with source</button></div></>;
      case "search": return <><SearchField value={search} onChange={setSearch} label="Search across Diana" /><div className={styles.filterLine}>{["All", "Concepts", "Work", "Notes", "Classes", "Artifacts"].map(type => <button key={type} onClick={() => setMode(type)} aria-pressed={mode === type}>{type}</button>)}</div>{scenario === "empty" || (search && !"cell structure biology observations".includes(search.toLowerCase())) ? <Empty text="No matches in this preview. Try a different term or filter." /> : <Roster rows={[{ title: "Cell structure lab", subject: "Work", detail: "Biology · assignment", id: "work" }, { title: "Cell observations", subject: "Notes", detail: "Biology · note", id: "note" }, { title: "Cell structure guide", subject: "Artifacts", detail: "Biology · study guide", id: "artifact" }].filter(row => mode === "Text" || mode === "All" || row.subject.toLowerCase() === mode.toLowerCase())} selected={selected} onSelect={setSelected} empty="No matches in this category." />}</>;
      case "proof": return <>{scenario === "empty" ? <Empty text="Completed work and saved materials will appear here." /> : <><div className={styles.statStrip}><span>2 items</span><span>Private record</span></div><Roster rows={[{ title: "Linear equations", subject: "Completed work", detail: "Algebra I · student confirmation", id: "linear" }, { title: "Cell structure guide", subject: "Study material", detail: "Biology · saved guide", id: "guide" }]} selected={selected} onSelect={setSelected} empty="No evidence yet." /></>}</>;
      case "wellness": return <><div className={styles.filterLine}>{["Week", "Month"].map(type => <button key={type} onClick={() => setMode(type)} aria-pressed={mode === type || mode === "Text" && type === "Week"}>{type}</button>)}</div><div className={styles.statStrip}><span>{mode === "Month" ? "September 2026" : "This week"}</span><span>{scenario === "empty" ? "No recorded check-ins" : "3 recorded check-ins"}</span></div>{scenario === "empty" ? <Empty text="No check-ins were recorded for this range." /> : <div className={styles.timeline}>{["Monday · Energy: steady", "Wednesday · Energy: low", "Friday · Energy: steady"].map(item => <div key={item}><span aria-hidden="true" />{item}</div>)}</div>}<p className={styles.quiet}>This history is private. A missing day is simply no entry.</p></>;
      case "sharing": return <div className={styles.readingPlane}><p>A weekly summary goes to the parent email when you turn this on.</p><label className={styles.field}>Parent email<input type="email" placeholder="parent@example.com" /></label><label className={styles.choice}><input type="checkbox" checked={permission} onChange={event => setPermission(event.target.checked)} />Turn on parent digest</label><button className={styles.primary} onClick={() => localAction(`Preview preference: ${permission ? "on" : "off"}. No email was sent.`)}>Save sharing choice <ArrowRight /></button></div>;
      case "share-parent": return scenario === "empty" ? <Empty text="No report details are available in this preview." /> : <div className={styles.paper}><span>EXAMPLE REPORT · ONE WEEK · VIEW ONLY</span><h2>Weekly summary</h2><div className={styles.paperMetrics}><span>Completed work<strong>2</strong></span><span>Study time<strong>48 min</strong></span><span>Coming up<strong>1</strong></span></div><section><h3>Concepts</h3><p>Linear equations · cell structure</p></section><section><h3>Shared note</h3><p>No teacher note was shared this week.</p></section><button onClick={() => window.print()}>Print example report</button></div>;
      case "share-portfolio": return scenario === "empty" ? <Empty text="No selected work is available to display." /> : <><div className={styles.statStrip}><span>EXAMPLE EVIDENCE</span><span>2 items visible</span><span>View only</span></div><Roster rows={[{ title: "Cell structure lab", subject: "Biology", detail: "Observation and conclusion", id: "cell" }, { title: "Linear equations", subject: "Algebra I", detail: "Worked solutions", id: "linear" }]} selected={selected} onSelect={setSelected} empty="No items were selected." /><div className={styles.paper}><span>STUDENT REFLECTION</span><h2>{selected === "linear" ? "Linear equations" : "Cell structure lab"}</h2><p>{selected === "linear" ? "I showed each step and checked the solution." : "I compared what I could see in both samples before naming them."}</p></div></>;
      case "share-unavailable": return <div className={styles.locked}><LockKeyhole aria-hidden="true" /><h2>This link is unavailable</h2><p>Ask the student for a new link if they still want to share this report.</p></div>;
      case "login": return <AuthForm title="Welcome back" button="Sign in" onSubmit={() => localAction("Sign-in preview only. No credentials were sent.")} />;
      case "signup": return <AuthForm title="Your details" button="Create account" variant="signup" onSubmit={() => localAction("Account preview only. No account was created.")} />;
      case "onboarding": return <><div className={styles.stepLine}><span aria-current={mode === "Personalize" ? "step" : undefined}>Personalize</span><span aria-current={mode === "Connect" ? "step" : undefined}>Connect school</span></div><div className={styles.readingPlane}>{mode === "Personalize" ? <><h2>What gets in the way?</h2><p>Choose what feels most useful right now. This is a preference, not a diagnosis.</p>{["Getting started", "Staying focused", "Understanding directions", "Keeping track"].map(choice => <label className={styles.choice} key={choice}><input type="radio" name="hurdle" checked={hurdle === choice} onChange={() => setHurdle(choice)} />{choice}</label>)}<fieldset className={styles.segment}><legend>When do you usually study?</legend>{["Morning", "Afternoon", "Evening"].map(choice => <label key={choice}><input type="radio" name="schedule" checked={selected === choice || selected === "biology" && choice === "Afternoon"} onChange={() => setSelected(choice)} />{choice}</label>)}</fieldset><button className={styles.textButton} onClick={() => localAction("Photo action is optional and inactive in this preview.")}>Add a photo later (optional)</button><div className={styles.actionLine}><button className={styles.primary} onClick={() => { setMode("Connect"); setStatus(""); }}>Continue <ArrowRight /></button></div></> : <><h2>Connect school work</h2><p>This step is optional. A connection is only ready after the school provider confirms it.</p><div className={styles.providerRows}><button onClick={() => localAction("Google Classroom handoff simulated. No connection was started.")}>Google Classroom <ArrowRight /></button><button onClick={() => setSelected("canvas")}>Canvas <ArrowRight /></button></div>{selected === "canvas" && <label className={styles.field}>School Canvas address<input type="url" placeholder="https://school.instructure.com" /></label>}<div className={styles.actionLine}><button onClick={() => { setMode("Personalize"); setStatus(""); }}>Back</button><button className={styles.primary} onClick={() => localAction("Setup preview complete. No profile was saved.")}>Skip for now <ArrowRight /></button></div></>}</div></>;
      case "public-home": return <>
        <div className={styles.heroStatement}><h1>Your day, sorted.</h1><p>See what is next. Do the work. You choose when it is ready.</p><a className={styles.primary} href={reviewHref("student-control")}>See it in action <ArrowRight /></a></div>
        <div className={styles.filterLine} role="group" aria-label="Product chapters">{["Get organized", "Do the work", "Practice"].map(type => <button key={type} onClick={() => setMode(type)} aria-pressed={mode === type}>{type}</button>)}</div>
        <figure className={styles.productFigure}><img src={mode === "Practice" ? "/assets/landing-10k/hero/story-preview/practice-desktop.png" : mode === "Do the work" ? "/assets/homework/diana-workspace-source-analysis-today.png" : "/assets/comfyui-i2v/diana-product-home-screen.png"} alt={mode === "Practice" ? "Diana practice screen example" : mode === "Do the work" ? "Diana work area with source steps and student writing space" : "Diana Today screen example"} /></figure>
        <section className={styles.ruleSection} id="how-it-works"><h2>From source to handoff</h2><p>Collect work · Work through it · Review the handoff</p></section>
        <form className={styles.waitlist} id="early-access" onSubmit={event => { event.preventDefault(); localAction("Early access interest recorded in this preview only. No email was sent."); }}><h2>Join the early access list</h2><p>The list is for invitations. It does not create an account.</p><label className={styles.field}>Email<input type="email" required placeholder="you@example.com" /></label><button className={styles.primary}>Join the list <ArrowRight /></button></form>
      </>;
      case "trust": return <div className={styles.readingPlane}><h2>Early access</h2><p>Joining the waitlist collects an email address for an invitation. It does not create a Diana account.</p><h2>Student work</h2><p>Diana keeps guidance distinct from student writing and leaves the turn-in decision with the student.</p><h2>Privacy and terms</h2><p>The published notices hold the full account, privacy, and age requirements. This summary is not the legal text.</p><h2>Questions</h2><p>For early access questions, use the contact route provided with an invitation.</p><a className={styles.textLink} href={reviewHref("policy")}>Read policy layout <ArrowRight /></a></div>;
      case "student-control": return <><div className={styles.filterLine}>{["Diana guides", "You write", "You decide"].map(type => <button key={type} onClick={() => setMode(type)} aria-pressed={mode === type}>{type}</button>)}</div><div className={styles.feature}><p>{mode === "You write" ? "Your response stays in your own editor." : mode === "You decide" ? "Review the destination and contents before any handoff." : "Ask for a hint while your work stays visible."}</p></div><figure className={styles.productFigure}><img src="/assets/video/diana-work-stays-yours-film-poster-v2.webp" alt="Diana guidance and student writing shown in separate areas" /></figure></>;
      case "early-confirm": case "early-unsubscribe": return <div className={styles.locked}>{scenario === "ready" ? <Check aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}<h2>{scenario === "attention" ? "We could not confirm this request" : scenario === "empty" ? "Checking this request" : screen === "early-confirm" ? "Email confirmed" : "Email removed"}</h2><p>{scenario === "attention" ? screen === "early-confirm" ? "The email could not be confirmed. Return to Diana and request a fresh link if needed." : "Removal could not be confirmed. Return to Diana for help with this request." : scenario === "empty" ? "This is a local progress specimen. No token is checked." : screen === "early-confirm" ? "You are on the early access list. This does not create an account." : "This address has been removed from the early access list."}</p><a className={styles.textLink} href={reviewHref("public-home")}>Back to Diana <ArrowRight /></a></div>;
      case "policy": return <div className={styles.paper}><span>POLICY READER · EXAMPLE PRESENTATION</span><h2>Privacy and terms</h2><nav aria-label="Policy sections"><a href="#privacy">Privacy</a><a href="#terms">Terms</a></nav><section id="privacy"><h3>Privacy</h3><p>This review shows reading layout only. The published privacy notice remains the source of legal wording.</p></section><section id="terms"><h3>Terms</h3><p>This review shows reading layout only. The published terms remain the source of legal wording.</p></section></div>;
      case "loading": return <div className={styles.loadingPlane} role="status" aria-label="Loading page"><div /><div /><div /></div>;
      case "error": return <div className={styles.locked}><p>If you were editing, check the saved status after the page returns. Unsaved changes may need to be entered again.</p><button className={styles.primary} onClick={() => localAction("Retry simulated. No network request was made.")}>Try again <ArrowRight /></button></div>;
      case "not-found": return <div className={styles.locked}><p>The link may have changed.</p><a className={styles.primary} href="/landing-3d/today-now-assets?character=relit">Go to Lobby <ArrowRight /></a></div>;
      case "offline": return <div className={styles.locked}><p>Some saved work may be available on this device. This preview cannot verify whether your latest changes were saved.</p><button className={styles.primary} onClick={() => localAction("Connection check simulated.")}>Check again <ArrowRight /></button></div>;
    }
  }
}

function Roster({ rows, selected, onSelect, empty }: { rows: { id: string; title: string; subject: string; detail: string }[]; selected: string; onSelect: (id: string) => void; empty: string }) {
  if (!rows.length) return <Empty text={empty} />;
  return <div className={styles.roster}>{rows.map(row => <button key={row.id} className={styles.rosterRow} aria-pressed={selected === row.id} onClick={() => onSelect(row.id)}><span>{row.subject}</span><strong>{row.title}</strong><small>{row.detail}</small><ChevronRight aria-hidden="true" /></button>)}</div>;
}
function StudySelection({ rows, selected, onSelect, current }: { rows: readonly (typeof learningRows)[number][]; selected: string; onSelect: (id: string) => void; current: (typeof learningRows)[number] }) {
  const options = useRef(new Map<string, HTMLButtonElement>());
  if (!rows.length) return <Empty text="No open assignments to practice right now." />;
  return <div className={styles.studySelection}>
    <div className={styles.studyChoices} role="radiogroup" aria-label="Assignments to practice">
      {rows.map((row, index) => <button key={row.id} role="radio" aria-checked={selected === row.id} tabIndex={selected === row.id ? 0 : -1} ref={element => { if (element) options.current.set(row.id, element); else options.current.delete(row.id); }} onClick={() => onSelect(row.id)} onKeyDown={event => {
        const step = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 0;
        if (!step && event.key !== "Home" && event.key !== "End") return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? rows.length - 1 : (index + step + rows.length) % rows.length;
        onSelect(rows[next].id); options.current.get(rows[next].id)?.focus();
      }}><span>{row.subject}</span><strong>{row.title}</strong><ChevronRight aria-hidden="true" /></button>)}
    </div>
    <section className={styles.studyEvent} aria-label={`${current.title} practice`}>
      <img key={current.image} src={current.image} alt="" />
      <div key={current.id}><span>{current.subject}</span><h2>{current.title}</h2><Link className={styles.primary} prefetch={false} href={`${reviewHref("study-new")}?source=${current.id}`}>Start quiz <ArrowRight /></Link></div>
    </section>
  </div>;
}
function QuizResults({ source, answers, onRestart }: { source: (typeof learningRows)[number]; answers: Record<number, string>; onRestart: () => void }) {
  return <div className={styles.readingPlane}>
    <div className={styles.statStrip}><span>{source.subject}</span><span>{Object.keys(answers).length} responses saved</span></div>
    {source.questions.map((item, index) => <section className={styles.answerReview} key={item.prompt}>
      <h2>{item.prompt}</h2><p>{answers[index]}</p>
      {item.kind === "choice" && <span>{answers[index] === item.answer ? "Correct" : `Review: ${item.answer}`}</span>}
      {item.kind === "recall" && <span>Self-check</span>}
      {item.kind === "written" && <span>Saved for review</span>}
    </section>)}
    <div className={styles.actionLine}><button className={styles.primary} onClick={onRestart}>Try again <ArrowRight /></button><Link className={styles.textLink} href={reviewHref("study")} prefetch={false}>Choose another assignment</Link></div>
  </div>;
}
function Empty({ text }: { text: string }) { return <div className={styles.empty}><BookOpen aria-hidden="true" /><p>{text}</p></div>; }
function SearchField({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) { return <label className={styles.searchField}><Search aria-hidden="true" /><input aria-label={label} value={value} onChange={event => onChange(event.target.value)} placeholder={label} /></label>; }
function AuthForm({ title, button, onSubmit, variant = "login" }: { title: string; button: string; onSubmit: () => void; variant?: "login" | "signup" }) {
  const [birthDate, setBirthDate] = useState("");
  const [feedback, setFeedback] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (variant === "signup") {
      const birthday = new Date(`${birthDate}T12:00:00`);
      const today = new Date();
      const age = today.getFullYear() - birthday.getFullYear() - (today.getMonth() < birthday.getMonth() || today.getMonth() === birthday.getMonth() && today.getDate() < birthday.getDate() ? 1 : 0);
      if (!birthDate || Number.isNaN(age) || age < 13) { setFeedback("This account path is available from age 13. No account was created."); return; }
    }
    setFeedback(""); onSubmit();
  }
  return <form className={styles.authForm} onSubmit={submit}><h2>{title}</h2>{variant === "signup" && <label className={styles.field}>Name (optional)<input autoComplete="name" placeholder="What should Diana call you?" /></label>}<label className={styles.field}>Email<input type="email" required autoComplete="email" placeholder="you@example.com" /></label><label className={styles.field}>Password<input type="password" required minLength={8} autoComplete={variant === "signup" ? "new-password" : "current-password"} placeholder="At least 8 characters" /></label>{variant === "signup" && <label className={styles.field}>Date of birth<input type="date" required value={birthDate} onChange={event => setBirthDate(event.target.value)} /></label>}{feedback && <p className={styles.formFeedback} role="status">{feedback}</p>}<button className={styles.primary} type="submit">{button} <ArrowRight /></button></form>;
}
function attentionFor(screen: Screen) {
  if (screen === "share-unavailable") return "This preview never reveals why a share link is unavailable.";
  if (screen === "study-new" || screen.startsWith("study")) return "The selected source may be unavailable or generation may need another try. Existing material is kept.";
  if (screen === "login" || screen === "signup") return "A sign-in or confirmation request may need another try. Account state is not assumed.";
  if (screen === "offline" || screen === "error") return "Save state is uncertain until it is checked after recovery.";
  return "This source needs attention. The preview keeps its current selection and offers a clear next step.";
}
