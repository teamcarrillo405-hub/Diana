"use client";

import { useEffect, useReducer, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { PreviewNavigation } from "../_components/preview-navigation";
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, FileDown, Info, LogOut, RotateCcw, Save, ShieldCheck, Undo2 } from "lucide-react";
import base from "../work-concept-review/work-concept-review.module.css";
import styles from "./settings-concept-review.module.css";
import {
  ACCESSIBILITY_FIELDS, ACCENTS, APPEARANCE_FIELDS, CONNECTIONS, INITIAL_STATE, NOTIFICATION_FIELDS,
  PROFILE_FIELDS, SECTIONS, changeCount, previewReducer, resolveSection,
  type Field, type Preferences, type SampleGoal, type SectionId,
} from "./fixtures";

type Detail = { id: string; title: string; body: string; value?: string; field?: Field; scopes?: readonly string[] };
const defaultDetail = (id: SectionId): Detail => ({
  id, title: SECTIONS.find(section => section.id === id)!.label,
  body: "",
});

export function SettingsConceptReview({ initialSection = "profile" }: { initialSection?: SectionId }) {
  const [section, setSection] = useState(initialSection);
  const [state, dispatch] = useReducer(previewReducer, INITIAL_STATE);
  const [detail, setDetail] = useState<Detail>(() => defaultDetail(initialSection));
  const [compact, setCompact] = useState(false);
  const [notice, setNotice] = useState("");
  const [invalid, setInvalid] = useState<"display_name" | "timezone" | null>(null);
  const [connectionExample, setConnectionExample] = useState("connected");
  const [iepName, setIepName] = useState("Sample learning plan");
  const [iepText, setIepText] = useState("Extra time: 25%. Text to speech for reading. Larger, spaced text.");
  const root = useRef<HTMLDivElement>(null);
  const detailRegion = useRef<HTMLElement>(null);
  const returnControl = useRef<HTMLButtonElement | null>(null);
  const [detailVisit, setDetailVisit] = useState(0);
  const tabs = useRef(new Map<SectionId, HTMLButtonElement>());
  const preferences = state.draft.preferences;
  const applied = state.applied.preferences;
  const changes = changeCount(state.draft, state.applied);
  const active = SECTIONS.find(item => item.id === section)!;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const syncLocation = () => {
      const next = resolveSection(new URLSearchParams(window.location.search).get("section") ?? initialSection);
      setSection(next);
      setDetail(defaultDetail(next));
    };
    window.addEventListener("popstate", syncLocation);
    return () => window.removeEventListener("popstate", syncLocation);
  }, [initialSection]);

  useEffect(() => {
    if (invalid) root.current?.querySelector<HTMLInputElement>(`#profile-${invalid}`)?.focus();
  }, [invalid, section]);

  useEffect(() => {
    if (!detailVisit) return;
    detailRegion.current?.focus({ preventScroll: true });
    detailRegion.current?.scrollIntoView?.({ block: "start", behavior: "auto" });
  }, [detailVisit]);

  function reviewDetail(next: Detail, trigger: HTMLButtonElement) {
    setDetail(next);
    if (window.matchMedia("(max-width: 1240px)").matches) {
      returnControl.current = trigger;
      setDetailVisit(visit => visit + 1);
    }
  }

  function returnToOption() {
    const control = returnControl.current;
    setDetailVisit(0);
    if (control?.isConnected && !control.closest("[hidden], [inert]")) {
      control.focus({ preventScroll: true });
      control.scrollIntoView?.({ block: "center", behavior: "auto" });
    }
    returnControl.current = null;
  }

  function selectSection(id: SectionId, focus = false, hash = "") {
    setSection(id);
    setDetail(defaultDetail(id));
    setNotice("");
    setDetailVisit(0);
    returnControl.current = null;
    const url = new URL(window.location.href);
    url.searchParams.set("section", id);
    url.hash = hash;
    window.history.replaceState(null, "", url);
    if (focus) {
      tabs.current.get(id)?.focus({ preventScroll: true });
      tabs.current.get(id)?.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "auto" });
    }
  }

  function tabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 0;
    if (!step && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? SECTIONS.length - 1 : (index + step + SECTIONS.length) % SECTIONS.length;
    selectSection(SECTIONS[next].id, true);
  }

  function apply() {
    let invalidKey: "display_name" | "timezone" | null = !preferences.display_name.trim() ? "display_name" : null;
    try { if (!preferences.timezone.trim()) throw new Error(); new Intl.DateTimeFormat("en-US", { timeZone: preferences.timezone }); }
    catch { invalidKey ??= "timezone"; }
    if (invalidKey) {
      selectSection("profile");
      setInvalid(invalidKey);
      setNotice(invalidKey === "display_name" ? "Add a display name to the sample profile." : "Use a timezone such as America/Los_Angeles.");
      return;
    }
    setInvalid(null);
    setNotice("");
    dispatch({ type: "apply" });
  }

  function fieldRows(fields: Field[], prefix: string) {
    return fields.filter(field => !field.visible || field.visible(preferences)).map(field => {
      const id = `${prefix}-${field.key}${field.label === "Custom voice ID" ? "-custom" : ""}`;
      const value = preferences[field.key];
      const help: Detail = { id, title: field.label, body: field.help, field };
      const change = (next: Preferences[keyof Preferences]) => {
        dispatch({ type: "edit", key: field.key, value: next });
        setInvalid(null);
        setNotice("");
      };
      return <div key={id} className={styles.optionRow} data-focused={detail.id === id} onFocusCapture={() => setDetail(help)} onMouseEnter={() => setDetail(help)}>
        <label htmlFor={id} className={styles.optionLabel}>{field.label}</label>
        <span className={styles.srOnly} id={`${id}-help`}>{field.help}</span>
        <div className={styles.control}>
          {field.kind === "text" && <input id={id} name={field.key} value={String(value)} maxLength={80} aria-describedby={`${id}-help`} aria-invalid={invalid === field.key || undefined} onChange={event => change(event.target.value)} />}
          {field.kind === "select" && <select id={id} name={field.key} value={String(value)} aria-describedby={`${id}-help`} onChange={event => change(typeof value === "number" ? Number(event.target.value) : event.target.value)}>
            {field.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>}
          {field.kind === "toggle" && <div className={styles.toggleControl}><span aria-hidden="true">{value ? "On" : "Off"}</span><input id={id} name={field.key} type="checkbox" checked={Boolean(value)} aria-describedby={`${id}-help`} onChange={event => change(event.target.checked)} /></div>}
          {field.kind === "range" && <div className={styles.rangeControl}><input id={id} name={field.key} type="range" min={field.min} max={field.max} step={field.step} value={Number(value)} aria-describedby={`${id}-help`} onChange={event => change(Number(event.target.value))} /><output htmlFor={id}>{Number(value).toFixed(2)}</output></div>}
          {field.kind === "swatches" && <fieldset className={styles.swatches} id={id} aria-describedby={`${id}-help`}><legend className={styles.srOnly}>Color</legend>{ACCENTS.map(accent => <label key={accent.value} title={accent.label} style={{ "--swatch": accent.color } as CSSProperties}><input type="radio" name="preview-accent" value={accent.value} aria-label={accent.label} checked={value === accent.value} onChange={() => change(accent.value)} /><span aria-hidden="true">{value === accent.value && <Check />}</span></label>)}</fieldset>}
        </div>
      </div>;
    });
  }

  function reviewRow(id: string, label: string, value: string, help: string, buttonLabel = "Review", scopes?: readonly string[]) {
    return <div className={styles.optionRow} data-focused={detail.id === id} onFocusCapture={() => setDetail({ id, title: label, body: help, value, scopes })}>
      <div className={styles.optionLabel}>{label}<small>{value}</small></div>
      <button type="button" className={styles.reviewAction} onClick={event => reviewDetail({ id, title: label, body: help, value, scopes }, event.currentTarget)} aria-label={`${buttonLabel} ${label}`}>{buttonLabel}<ChevronRight aria-hidden="true" /></button>
    </div>;
  }

  function learningBody(id: SectionId) {
    return <>
      <p className={styles.sectionNote}>How Diana is adapting to you</p>
      <div className={styles.observation}><span>Sample learning summary</span><p>{preferences.learning_loop_paused ? "Personalization is paused in this draft." : "Shorter work sessions and a clear first step have been useful in this sample."}</p></div>
      {fieldRows([{ key: "learning_loop_paused", label: "Pause personalization", kind: "toggle", help: "Do the work and Learning loop share this setting. Changing one updates the other; no learner profile is modified." }], id)}
      {reviewRow(`${id}-reset`, "Reset what Diana learned", "Preview review only", "The real control resets learned personalization. This preview has no learner history to reset and does not perform that action.")}
    </>;
  }

  const fonts: Record<string, string> = { system: "system-ui, sans-serif", lexend: "var(--font-lexend), sans-serif", atkinson: '"Atkinson Hyperlegible Next", sans-serif', opendyslexic: '"OpenDyslexic", sans-serif' };
  const readingStyle = {
    fontFamily: fonts[applied.reading_font],
    fontSize: ({ small: 14, normal: 16, large: 18, xlarge: 21 } as Record<string, number>)[applied.font_size],
    lineHeight: ({ compact: 1.4, normal: 1.7, loose: 2 } as Record<string, number>)[applied.line_spacing],
    wordSpacing: ({ normal: "normal", wide: ".14em", wider: ".25em" } as Record<string, string>)[applied.reading_word_spacing],
  } as CSSProperties;
  const selectedValue = detail.field ? displayValue(detail.field, preferences) : detail.value;

  return <div ref={root} className={`${base.root} ${styles.root}`} data-settings-preview data-theme={applied.theme} data-high-contrast={applied.high_contrast} data-reduced-motion={applied.reduced_motion}>
    <img className={`${base.world} ${styles.world}`} src="/assets/today-now/diana-signature-studio-v1-1678.webp" alt="" />
    <PreviewNavigation active="More" />
    <div className={styles.previewBanner}><span><span className={styles.previewDot} />DESIGN PREVIEW / SAMPLE SETTINGS</span><p>Local only. No account changes, messages, or connections.</p></div>
    <main className={styles.main} id="main-content" tabIndex={-1}>
      <header className={styles.pageHeading}><div><h1>Account options</h1></div><span className={styles.sampleIdentity}><span className={styles.avatar} aria-hidden="true">AM</span><span>Alex Morgan<small>Sample account</small></span></span></header>
      <div className={styles.workspace}>
        <aside className={styles.rail}>
          <div role="tablist" aria-label="Settings sections" aria-orientation={compact ? "horizontal" : "vertical"} className={styles.tabs}>
            {SECTIONS.map((item, index) => <div key={item.id} className={styles.tabEntry}>
              {(index === 0 || SECTIONS[index - 1].group !== item.group) && <span className={styles.groupLabel} aria-hidden="true">{item.group}</span>}
              <button type="button" role="tab" id={`settings-tab-${item.id}`} aria-controls={`settings-panel-${item.id}`} aria-selected={section === item.id} tabIndex={section === item.id ? 0 : -1}
                ref={element => { if (element) tabs.current.set(item.id, element); else tabs.current.delete(item.id); }}
                onClick={() => selectSection(item.id)} onKeyDown={event => tabKey(event, index)}>{item.label}</button>
            </div>)}
          </div>
          <button type="button" className={styles.exportAlias} onClick={() => selectSection("ai", true, "ai-history-export")}><FileDown aria-hidden="true" />Export &amp; privacy</button>
        </aside>
        <div className={styles.options}>
          <header className={styles.sectionHeading}><h2>{active.label}</h2></header>
          {SECTIONS.map(item => <section key={item.id} id={`settings-panel-${item.id}`} role="tabpanel" aria-labelledby={`settings-tab-${item.id}`} hidden={section !== item.id} inert={section !== item.id} className={styles.panel}>
            {item.id === "profile" && <>
              {fieldRows(PROFILE_FIELDS, "profile")}
              {reviewRow("photo", "Profile photo", "Initials / sample account", "Real photo upload, removal and crop positioning are intentionally omitted. No file is opened or uploaded in this preview.")}
            </>}
            {item.id === "appearance" && <>{fieldRows(APPEARANCE_FIELDS, "appearance")}{reviewRow("background", "Lobby background", "Current sample: Signature studio", "The live picker has one background key and device-local storage. This preview uses the approved signature world without writing that preference.")}</>}
            {item.id === "notifications" && <>
              <p className={styles.sectionNote}>Sample device / notifications available</p>
              {fieldRows(NOTIFICATION_FIELDS, "notifications")}
              {reviewRow("push-blocked", "Permission state", "Sample states: off, on, blocked, unsupported", "The sample toggles are local only. In the live app, blocked permission needs browser settings; unsupported Web Push is omitted. No permission prompt opens here.")}
              {reviewRow("offline", "Offline app", "Sample: ready / 0 queued items", "Install eligibility, offline sync and local reminders are separate from Web Push. Installation, service workers and queue syncing are not run here.")}
            </>}
            {item.id === "accessibility" && fieldRows(ACCESSIBILITY_FIELDS, "accessibility")}
            {item.id === "goals" && <Goals goals={state.draft.goals} onAdd={goal => dispatch({ type: "goal", goal })} />}
            {item.id === "learning" && learningBody(item.id)}
            {item.id === "study" && <div className={styles.optionRow}><div className={styles.optionLabel}>Quiz</div><Link href="/landing-3d/remaining-concept-review/study" prefetch={false} className={styles.reviewAction}>Open Study<ArrowUpRight aria-hidden="true" /></Link></div>}
            {item.id === "ai" && <div id="ai-history-export" className={styles.exportSection}>
              <ShieldCheck aria-hidden="true" /><h3>AI activity export</h3><p>Email export is the existing action in this section. No history editor or account deletion is added.</p>
              <button type="button" className={styles.reviewAction} onClick={event => { reviewDetail({ id: "ai-export", title: "AI history by email", value: "Preview only", body: "The live control requests an email export. This review does not request an export or send an email." }, event.currentTarget); setNotice("Preview only. No export requested and no email sent."); }}><FileDown aria-hidden="true" />Review email export</button>
            </div>}
            {item.id === "connections" && <>
              <label className={styles.fixtureControl}>Sample connection state<select aria-label="Sample connection state" value={connectionExample} onChange={event => setConnectionExample(event.target.value)}><option value="connected">Existing connections</option><option value="empty">No connections</option></select></label>
              <div id="school-materials"><h3 className={styles.rowHeading}>School platforms <span>Sample</span></h3>
                {connectionExample === "connected" ? CONNECTIONS.filter(connection => connection.id !== "canva").map(connection => <div key={connection.id}>{reviewRow(connection.id, connection.name, `Sample / ${connection.status}`, connection.detail, "Review scopes for", connection.scopes)}</div>) : <>
                  <p className={styles.sectionNote}>No school platforms in this sample.</p>
                  {CONNECTIONS.slice(0, 2).map(connection => <div key={connection.id}>{reviewRow(`empty-${connection.id}`, connection.name, "Sample / Not connected", connection.detail, "Review scopes for", connection.scopes)}</div>)}
                </>}
              </div>
              <div className={styles.iep}><h3 className={styles.rowHeading}>Learning supports</h3><label>Document name<input value={iepName} onChange={event => setIepName(event.target.value)} /></label><label>IEP / 504 text<textarea rows={4} value={iepText} onChange={event => setIepText(event.target.value)} /></label>
                <button type="button" className={styles.reviewAction} onClick={event => { reviewDetail({ id: "iep", title: iepName || "Sample learning plan", value: "Illustrative result, not parsed", body: "Example only: 25% extra time, text to speech, and more reading space. The text is not analyzed, uploaded, or applied to your accommodations.", scopes: ["Extra time", "Reading supports", "Accommodation summary"] }, event.currentTarget); setNotice("Sample accommodation result only. No import or account update."); }}>Review sample import<ChevronRight aria-hidden="true" /></button>
              </div>
              <h3 className={styles.rowHeading}>Design tools</h3>{reviewRow("canva", CONNECTIONS[3].name, "Sample / Not connected", CONNECTIONS[3].detail, "Review scopes for", CONNECTIONS[3].scopes)}
            </>}
            {item.id === "sign-out" && <div className={styles.exportSection}><LogOut aria-hidden="true" /><h3>Alex Morgan</h3><p>Sample account. There is no signed-in session attached to this preview.</p><button type="button" className={styles.reviewAction} onClick={() => setNotice("Preview only. Your real session is unchanged.")}><LogOut aria-hidden="true" />Sign out</button></div>}
          </section>)}
          <footer className={styles.applyBar}>
            <div role="status" aria-live="polite" className={styles.applyStatus} data-applied={!changes && state.message === "Applied to preview"}>{!changes && state.message === "Applied to preview" ? <Check aria-hidden="true" /> : <span className={styles.statusDot} />}<span>{changes ? `${changes} unapplied ${changes === 1 ? "change" : "changes"}` : state.message}</span></div>
            <div className={styles.applyActions}>
              <button type="button" className={styles.iconAction} aria-label="Undo last draft change" title="Undo last draft change" disabled={!state.history.length} onClick={() => { dispatch({ type: "undo" }); setInvalid(null); setNotice(""); }}><Undo2 aria-hidden="true" /></button>
              <button type="button" className={styles.iconAction} aria-label="Reset draft to applied settings" title="Reset draft to applied settings" disabled={!changes} onClick={() => { dispatch({ type: "reset" }); setInvalid(null); setNotice(""); }}><RotateCcw aria-hidden="true" /></button>
              <button type="button" className={styles.apply} disabled={!changes} onClick={apply}><Save aria-hidden="true" />Apply changes</button>
            </div>
          </footer>
          {notice && <p className={styles.notice} role={invalid ? "alert" : "status"}>{notice}</p>}
        </div>
        <aside ref={detailRegion} tabIndex={-1} className={styles.detail} aria-label="Selected option detail">
          {detailVisit > 0 && <button type="button" className={styles.reviewAction} onClick={returnToOption}><ArrowLeft aria-hidden="true" />Back to selected option</button>}
          {detail.body && <><span className={styles.detailKicker}><Info aria-hidden="true" />Selected option</span><h3>{detail.title}</h3>{selectedValue && <p className={styles.detailValue}>{selectedValue}</p>}<p>{detail.body}</p></>}
          {detail.scopes && <ul className={styles.scopes} aria-label="Sample access scopes">{detail.scopes.map(scope => <li key={scope}><Check aria-hidden="true" />{scope}</li>)}</ul>}
          {detail.field?.key === "accent" && <p className={styles.accentSample} aria-label="Applied accent"><span aria-hidden="true" style={{ background: ACCENTS.find(accent => accent.value === applied.accent)?.color }} />Applied: {ACCENTS.find(accent => accent.value === applied.accent)?.label}</p>}
          <div className={styles.readingSample} style={readingStyle}><span>Applied reading sample</span><p>{applied.bionic_reading ? <>A <b>sma</b>ll <b>fir</b>st <b>st</b>ep is <b>eno</b>ugh. <b>The</b>re is <b>ro</b>om to <b>ma</b>ke <b>th</b>is <b>yo</b>ur own.</> : "A small first step is enough. There is room to make this your own."}</p></div>
        </aside>
      </div>
    </main>
  </div>;
}

function displayValue(field: Field, preferences: Preferences) {
  const value = preferences[field.key];
  if (typeof value === "boolean") return value ? "On" : "Off";
  if (field.kind === "swatches") return ACCENTS.find(accent => accent.value === value)?.label ?? String(value);
  return field.options?.find(option => option.value === String(value))?.label ?? (String(value) || "Not set");
}

function Goals({ goals, onAdd }: { goals: SampleGoal[]; onAdd: (goal: SampleGoal) => void }) {
  const [draft, setDraft] = useState<SampleGoal>({ title: "", category: "skill", targetText: "", nextStep: "" });
  const [message, setMessage] = useState("");
  function field(key: keyof SampleGoal, label: string, control?: ReactNode) {
    return <label className={styles.goalField}>{label}{control ?? <input required maxLength={200} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} />}</label>;
  }
  return <>
    <h3 className={styles.rowHeading}>Current goals <span>Sample</span></h3>
    <ul className={styles.goalList}>{goals.map((goal, index) => <li key={`${index}-${goal.title}`}><span>{String(index + 1).padStart(2, "0")}</span><div><h4>{goal.title}</h4><p>{goal.targetText}</p><small>Next: {goal.nextStep}</small></div></li>)}</ul>
    <form className={styles.goalForm} onSubmit={event => { event.preventDefault(); if (!draft.title.trim() || !draft.targetText.trim() || !draft.nextStep.trim()) return; onAdd({ ...draft }); setDraft({ title: "", category: "skill", targetText: "", nextStep: "" }); setMessage("Sample goal added to draft."); }}>
      <h3 className={styles.rowHeading}>Set a goal</h3>
      {field("title", "Goal title")}{field("category", "Category", <select value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })}><option value="skill">Skill</option><option value="consistency">Consistency</option><option value="recovery">Recovery</option></select>)}
      {field("targetText", "What progress looks like")}{field("nextStep", "Next step")}
      <button type="submit" className={styles.reviewAction}>Add sample goal<ChevronRight aria-hidden="true" /></button>
      {message && <p role="status" className={styles.sectionNote}>{message}</p>}
    </form>
  </>;
}
