"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { PreviewNavigation } from "../_components/preview-navigation";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameMonth, parseISO, startOfMonth, startOfWeek, eachDayOfInterval } from "date-fns";
import { ArrowRight, BookOpen, CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { clockLabel, createCalendarItems, dayKey, itemsForDay, itemTime, weekDays, type CalendarItem } from "./fixtures";
import { chronological, createPersonalExamples, expandPersonalEvents, newPersonalEvent, overlappingEvents, REMINDERS, type PersonalEvent } from "./personal-events";
import { EventEditor } from "./event-editor";
import base from "../work-concept-review/work-concept-review.module.css";
import styles from "./calendar-concept-review.module.css";
import personal from "./personal-calendar.module.css";

const VIEWS = ["Schedule", "Week", "Month"] as const;
type View = typeof VIEWS[number];
const KIND = { deadline: "Assignment deadline", session: "Study block", event: "Calendar event" };
const dateLabel = (day: string) => format(parseISO(day), "EEEE, MMMM d");

function tabIndexFor(event: KeyboardEvent<HTMLButtonElement>, index: number, length: number) {
  const direction = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 0;
  if (!direction && !["Home", "End"].includes(event.key)) return null;
  event.preventDefault();
  return event.key === "Home" ? 0 : event.key === "End" ? length - 1 : (index + direction + length) % length;
}

function ItemFacts({ item, showTime = true }: { item: CalendarItem; showTime?: boolean }) {
  return <dl className={styles.facts}>
    {showTime && <div><dt>{item.kind === "deadline" ? "Due" : "Scheduled"}</dt><dd>{format(parseISO(item.day), "EEE, MMM d")}<strong>{itemTime(item)}</strong></dd></div>}
    {item.minutes && <div><dt>{item.kind === "deadline" ? "Estimated work" : "Planned time"}</dt><dd>{item.minutes} minutes</dd></div>}
    {item.status && <div><dt>Assignment status</dt><dd data-ready={item.status === "Ready to submit"} data-submitted={item.status === "Submitted"}>{item.status}</dd></div>}
    {item.location && <div><dt>Location</dt><dd><MapPin aria-hidden="true" />{item.location}</dd></div>}
    <div><dt>Source</dt><dd>{item.source}{item.personalId ? " / You added" : " / Sample import"}</dd></div>
    {item.repeatUntil && <div><dt>Repeats</dt><dd>Weekly through {format(parseISO(item.repeatUntil), "MMM d")}</dd></div>}
    {item.personalId && item.reminder !== "none" && <div><dt>Reminder preference</dt><dd>{REMINDERS.find(reminder => reminder.value === item.reminder)?.label}</dd></div>}
  </dl>;
}

export function CalendarConceptReview({ today }: { today: string }) {
  const importedItems = useMemo(() => createCalendarItems(today), [today]);
  const [personalEvents, setPersonalEvents] = useState(() => createPersonalExamples(today));
  const [selectedDay, setSelectedDay] = useState(today);
  const [selectedId, setSelectedId] = useState("");
  const [view, setView] = useState<View>("Schedule");
  const [dialogItem, setDialogItem] = useState<CalendarItem | null>(null);
  const [editing, setEditing] = useState<PersonalEvent | null>(null);
  const [deleting, setDeleting] = useState<CalendarItem | null>(null);
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const editorDialog = useRef<HTMLDialogElement>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const eventTitle = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());
  const viewRefs = useRef(new Map<View, HTMLButtonElement>());
  const days = weekDays(selectedDay);
  const date = parseISO(selectedDay);
  const monthDays = eachDayOfInterval({ start: startOfWeek(startOfMonth(date), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(date), { weekStartsOn: 1 }) });
  const items = [...importedItems, ...expandPersonalEvents(personalEvents, dayKey(monthDays[0]), dayKey(monthDays[monthDays.length - 1]))];
  const dayItems = chronological(itemsForDay(items, selectedDay));
  const deadlines = dayItems.filter(item => item.kind === "deadline");
  const scheduled = dayItems.filter(item => item.kind !== "deadline");
  const agendaItems = [...deadlines, ...scheduled];
  const selectedItem = dayItems.find(item => item.id === selectedId) ?? scheduled.find(item => item.personalId) ?? scheduled[0] ?? deadlines[0];
  const overlaps = selectedItem ? overlappingEvents(selectedItem, dayItems) : [];
  const weekItems = items.filter(item => item.day >= dayKey(days[0]) && item.day <= dayKey(days[6]));

  useEffect(() => { if (dialogItem && !dialog.current?.open) dialog.current?.showModal(); }, [dialogItem]);
  useEffect(() => {
    if (editing && !editorDialog.current?.open) {
      editorDialog.current?.showModal();
      editorDialog.current?.querySelector("input")?.focus();
    }
  }, [editing]);
  useEffect(() => { if (deleting && !deleteDialog.current?.open) deleteDialog.current?.showModal(); }, [deleting]);

  function chooseDay(day: string, focus = false) {
    setSelectedDay(day); setSelectedId("");
    if (focus) requestAnimationFrame(() => { dayRefs.current.get(day)?.focus({ preventScroll: true }); dayRefs.current.get(day)?.scrollIntoView?.({ block: "nearest", inline: "nearest" }); });
  }
  function chooseItem(id: string, focus = false) {
    setSelectedId(id);
    if (focus) {
      itemRefs.current.get(id)?.focus({ preventScroll: true });
      itemRefs.current.get(id)?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    }
  }
  function openDay(day: string, item?: CalendarItem) {
    setSelectedDay(day); setSelectedId(item?.id ?? ""); setView("Schedule");
    requestAnimationFrame(() => item ? chooseItem(item.id, true) : dayRefs.current.get(day)?.focus({ preventScroll: true }));
  }
  function changePeriod(direction: number) {
    chooseDay(dayKey(view === "Month" ? addMonths(date, direction) : addDays(date, direction * 7)));
  }
  function restoreFocus() {
    if (opener.current?.isConnected) opener.current.focus(); else addButton.current?.focus();
  }
  function saveEvent(event: PersonalEvent) {
    const value = { ...event, id: event.id || `preview-${crypto.randomUUID()}` };
    setPersonalEvents(current => [...current.filter(item => item.id !== value.id), value]);
    setSelectedDay(value.day); setSelectedId(`${value.id}@${value.day}`); setView("Schedule");
    setNotice(`${value.title} ${event.id ? "updated" : "added"} in this preview.`);
    editorDialog.current?.close();
    requestAnimationFrame(() => eventTitle.current?.focus());
  }
  function agendaButton(item: CalendarItem) {
    const index = agendaItems.findIndex(entry => entry.id === item.id);
    return <button key={item.id} role="tab" id={`event-${item.id}`} aria-controls="selected-event" aria-selected={selectedItem?.id === item.id} aria-label={item.title} tabIndex={selectedItem?.id === item.id ? 0 : -1}
      className={item.kind === "deadline" ? personal.deadline : personal.scheduleItem} style={{ "--event-color": item.color } as CSSProperties}
      ref={el => { if (el) itemRefs.current.set(item.id, el); else itemRefs.current.delete(item.id); }} onClick={() => chooseItem(item.id)} onKeyDown={event => { const next = tabIndexFor(event, index, agendaItems.length); if (next !== null) chooseItem(agendaItems[next].id, true); }}>
      {item.kind === "deadline" ? <><BookOpen aria-hidden="true" /><span><strong>{item.title}</strong><small>{item.subject} / Due {itemTime(item)}</small></span>{item.status === "Submitted" && <small className={personal.submitted}>Submitted</small>}</> : <>
        <span className={personal.agendaTime}>{item.allDay ? "ALL DAY" : clockLabel(item.time)}{item.endTime && <small>{clockLabel(item.endTime)}</small>}</span><span className={personal.timeMarker} aria-hidden="true" />
        <span className={personal.agendaCopy}><small>{item.kind === "session" ? "STUDY" : item.subject.toUpperCase()}</small><strong>{item.title}</strong><span>{item.location || item.source}</span></span>
      </>}
    </button>;
  }
  const periodLabel = view === "Month" ? format(date, "MMMM yyyy") : `${format(days[0], "MMM d")} - ${format(days[6], isSameMonth(days[0], days[6]) ? "d, yyyy" : "MMM d, yyyy")}`;

  return <div className={`${base.root} ${styles.root} ${personal.root}`}>
    <img className={base.world} src="/assets/today-now/diana-signature-studio-v1-1678.webp" alt="" />
    <PreviewNavigation active="Calendar" />
    <div className={`${base.reviewBar} ${styles.reviewBar}`}><span className={base.reviewLabel}>CONCEPT REVIEW <span>/ SAMPLE DATA</span></span><span className={styles.reviewName}>PERSONAL SCHEDULE / RESETS ON RELOAD</span></div>
    <main id="main-content" className={styles.main} tabIndex={-1}>
      <header className={styles.heading}><h1>CALENDAR</h1><button ref={addButton} className={`${base.launch} ${personal.addEvent}`} onClick={event => { opener.current = event.currentTarget; setEditing(newPersonalEvent(selectedDay)); }}><Plus aria-hidden="true" />Add event</button></header>
      <div className={styles.toolbar}>
        <div className={styles.period}><h2 aria-live="polite">{periodLabel}</h2><div className={styles.periodActions}>
          <button title={`Previous ${view === "Month" ? "month" : "week"}`} aria-label={`Previous ${view === "Month" ? "month" : "week"}`} onClick={() => changePeriod(-1)}><ChevronLeft aria-hidden="true" /></button>
          <button className={styles.today} onClick={() => chooseDay(today)}>Today</button>
          <button title={`Next ${view === "Month" ? "month" : "week"}`} aria-label={`Next ${view === "Month" ? "month" : "week"}`} onClick={() => changePeriod(1)}><ChevronRight aria-hidden="true" /></button>
        </div></div>
        <div className={styles.viewTabs} role="tablist" aria-label="Calendar views">{VIEWS.map((value, i) => <button key={value} role="tab" id={`view-${value}`} aria-controls={`panel-${value}`} aria-selected={view === value} tabIndex={view === value ? 0 : -1} ref={el => { if (el) viewRefs.current.set(value, el); else viewRefs.current.delete(value); }} onClick={() => setView(value)} onKeyDown={event => { const next = tabIndexFor(event, i, VIEWS.length); if (next !== null) { setView(VIEWS[next]); viewRefs.current.get(VIEWS[next])?.focus(); } }}>{value}</button>)}</div>
      </div>

      <section id="panel-Schedule" role="tabpanel" aria-labelledby="view-Schedule" hidden={view !== "Schedule"}>
        <div className={styles.dayRibbon} role="tablist" aria-label="Schedule days">{days.map((day, index) => {
          const key = dayKey(day); const entries = itemsForDay(items, key); const due = entries.filter(item => item.kind === "deadline").length; const events = entries.length - due;
          return <button key={key} role="tab" id={`day-${key}`} aria-controls="day-schedule" aria-label={dateLabel(key)} aria-describedby={`day-count-${key}`} aria-selected={selectedDay === key} aria-current={key === today ? "date" : undefined} tabIndex={selectedDay === key ? 0 : -1}
            ref={el => { if (el) dayRefs.current.set(key, el); else dayRefs.current.delete(key); }} onClick={() => chooseDay(key)} onKeyDown={event => { const next = tabIndexFor(event, index, days.length); if (next !== null) chooseDay(dayKey(days[next]), true); }}>
            <span className={styles.dayTop}>{format(day, "EEE")}<span>{key === today ? "TODAY" : format(day, "MMM")}</span></span><strong>{format(day, "dd")}</strong>
            <span className={styles.daySubject}>{events ? `${events} ${events === 1 ? "event" : "events"}` : "No events"}</span><span className={styles.dayCount} id={`day-count-${key}`}>{due ? `${due} due` : "No deadlines"}</span><span className={styles.mobileCount} aria-hidden="true">{entries.length || ""}</span>
          </button>;
        })}</div>
        <div id="day-schedule" role="tabpanel" aria-labelledby={`day-${selectedDay}`} className={personal.composition}>
          <section className={personal.dayBoard} aria-label="Your day">
            <header className={personal.dayHeading}><div><span>{format(date, "MMMM d, yyyy")}</span><h2>{format(date, "EEEE")}</h2></div><span>PACIFIC TIME</span></header>
            {dayItems.length ? <div role="tablist" aria-label="Day agenda" aria-orientation="vertical">
              <div className={personal.deadlineLane}><h3><BookOpen aria-hidden="true" />Due today <span>{deadlines.length}</span></h3>{deadlines.length ? deadlines.map(agendaButton) : <p>No assignment deadlines.</p>}</div>
              <div className={personal.dayTimeline}><h3>On your schedule <span>{scheduled.length}</span></h3>{scheduled.length ? scheduled.map(agendaButton) : <p className={personal.emptySchedule}>No events scheduled.</p>}</div>
            </div> : <div className={personal.emptySchedule}><CalendarDays aria-hidden="true" /><h2>NOTHING SCHEDULED</h2><p>No deadlines or events on this day.</p><button className={styles.textAction} onClick={() => { setView("Week"); viewRefs.current.get("Week")?.focus(); }}>View the week <ArrowRight aria-hidden="true" /></button></div>}
          </section>

          {selectedItem && <section className={personal.selectedEvent} id="selected-event" role="tabpanel" aria-labelledby={`event-${selectedItem.id}`} style={{ "--event-color": selectedItem.color } as CSSProperties}>
            <div className={personal.eventArrival} key={selectedItem.id}>
              <div className={personal.eventPhoto}><img src={selectedItem.image} alt={selectedItem.imageAlt} /><span>{selectedItem.category || KIND[selectedItem.kind]}</span></div>
              <aside className={personal.eventDetails} aria-label="Event details">
                <div className={personal.eventTime}><span>{selectedItem.kind === "deadline" ? `DUE ${format(date, "EEE, MMM d").toUpperCase()}` : format(date, "EEE, MMM d").toUpperCase()}</span><strong>{selectedItem.allDay ? "ALL DAY" : clockLabel(selectedItem.time)}</strong>{selectedItem.endTime && <span>TO {clockLabel(selectedItem.endTime)}</span>}</div>
                <h2 ref={eventTitle} tabIndex={-1}>{selectedItem.title}</h2>{selectedItem.brief && <p className={personal.eventBrief}>{selectedItem.brief}</p>}
                {overlaps.length > 0 && <p className={personal.overlap}><Clock3 aria-hidden="true" /><span>Overlaps with {overlaps.map(item => item.title).join(", ")}.</span></p>}
                <ItemFacts item={selectedItem} showTime={false} />
                <div className={personal.eventActions}>{selectedItem.personalId ? <>
                  <button className={base.launch} onClick={event => { opener.current = event.currentTarget; setEditing(personalEvents.find(item => item.id === selectedItem.personalId) ?? null); }}><Pencil aria-hidden="true" />Edit event</button>
                  <button className={personal.deleteEvent} aria-label={`Delete ${selectedItem.title}`} title="Delete event" onClick={event => { opener.current = event.currentTarget; setDeleting(selectedItem); }}><Trash2 aria-hidden="true" /></button>
                </> : <button className={base.launch} onClick={event => { opener.current = event.currentTarget; setDialogItem(selectedItem); }}>{selectedItem.kind === "deadline" ? <BookOpen aria-hidden="true" /> : selectedItem.kind === "session" ? <Clock3 aria-hidden="true" /> : <CalendarDays aria-hidden="true" />}{selectedItem.kind === "deadline" ? "Open assignment" : selectedItem.kind === "session" ? "View study plan" : "Event details"}</button>}</div>
              </aside>
            </div>
          </section>}
        </div>
        <footer className={styles.weekRecord}><span>THIS WEEK</span>{(["deadline", "event", "session"] as const).map(kind => { const count = weekItems.filter(item => item.kind === kind).length; const label = kind === "deadline" ? "assignment deadline" : kind === "event" ? "calendar event" : "study block"; return <p key={kind}><strong>{count}</strong>{`${label}${count !== 1 ? "s" : ""}`}</p>; })}</footer>
      </section>

      <section id="panel-Week" role="tabpanel" aria-labelledby="view-Week" hidden={view !== "Week"} className={styles.weekView}>
        {days.map(day => { const key = dayKey(day); const entries = chronological(itemsForDay(items, key)); return <section key={key} className={styles.weekDay} data-today={key === today}>
          <button className={styles.weekDayTitle} onClick={() => openDay(key)} aria-label={`Open ${dateLabel(key)}`}><span>{format(day, "EEE")}</span><strong>{format(day, "dd")}</strong>{key === today && <small>Today</small>}</button>
          {["deadline", "scheduled"].map(group => <div className={styles.weekGroup} key={group}><h3>{group === "deadline" ? "Due" : "Scheduled"}</h3>{entries.filter(item => group === "deadline" ? item.kind === "deadline" : item.kind !== "deadline").map(item => <button key={item.id} onClick={() => openDay(key, item)} style={{ "--event-color": item.color } as CSSProperties}><small>{itemTime(item)}</small><strong>{item.title}</strong><span>{item.subject}{item.kind === "session" ? " / Study block" : ""}</span></button>)}</div>)}
          {!entries.length && <p className={styles.emptyDay}>Nothing scheduled</p>}
        </section>; })}
      </section>

      <section id="panel-Month" role="tabpanel" aria-labelledby="view-Month" hidden={view !== "Month"} className={styles.monthView}>
        <div className={styles.monthLabels} aria-hidden="true">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(name => <span key={name}>{name}</span>)}</div>
        <div className={styles.monthGrid}>{monthDays.map(day => { const key = dayKey(day); const entries = chronological(itemsForDay(items, key)); return <button key={key} data-outside={!isSameMonth(day, date)} data-today={key === today} aria-label={`${dateLabel(key)}${key === today ? ", today" : ""}, ${entries.length} ${entries.length === 1 ? "item" : "items"}`} onClick={() => openDay(key)}>
          <strong>{format(day, "d")}</strong><span className={styles.monthEntries}>{entries.slice(0, 2).map(item => <span key={item.id} style={{ "--event-color": item.color } as CSSProperties}>{item.title}</span>)}{entries.length > 2 && <small>+{entries.length - 2} more</small>}</span><span className={styles.monthCount} aria-hidden="true">{entries.length || ""}</span>
        </button>; })}</div>
      </section>
    </main>
    <p className={personal.status} role="status">{notice}</p>
    <dialog ref={dialog} className={`${base.dialog} ${styles.dialog}`} aria-labelledby="calendar-dialog-title" onClose={() => { setDialogItem(null); restoreFocus(); }}>
      <button className={`${base.dialogClose} ${styles.close}`} aria-label="Close preview" title="Close preview" onClick={() => dialog.current?.close()}><X aria-hidden="true" /></button>
      <p className={base.eyebrow}>{dialogItem ? KIND[dialogItem.kind] : ""} / sample</p><h2 id="calendar-dialog-title">{dialogItem?.title}</h2><p>{dialogItem?.brief}</p>
      {dialogItem && <ItemFacts item={dialogItem} />}<p className={styles.previewNotice}>Preview only. No assignment, session, or calendar event has been changed.</p>
      <button className={base.secondary} onClick={() => dialog.current?.close()}>Back to schedule</button>
    </dialog>
    <dialog ref={editorDialog} className={`${base.dialog} ${personal.editorDialog}`} aria-labelledby="event-editor-title" onClose={() => { setEditing(null); restoreFocus(); }}>
      <button className={`${base.dialogClose} ${styles.close}`} aria-label="Close event editor" title="Close event editor" onClick={() => editorDialog.current?.close()}><X aria-hidden="true" /></button>
      <p className={base.eyebrow}>DIANA / PERSONAL CALENDAR</p><h2 id="event-editor-title">{editing?.id ? "Edit event" : "Add event"}</h2>
      {editing && <EventEditor key={editing.id || "new"} initial={editing} onSave={saveEvent} onCancel={() => editorDialog.current?.close()} />}
    </dialog>
    <dialog ref={deleteDialog} className={base.dialog} aria-labelledby="delete-event-title" onClose={() => { setDeleting(null); restoreFocus(); }}>
      <h2 id="delete-event-title">Delete {deleting?.title}?</h2><p>{deleting?.repeatUntil ? "This removes the entire repeating series from this preview." : "This removes the event from this preview."}</p>
      <div className={personal.formActions}><button className={base.secondary} onClick={() => deleteDialog.current?.close()}>Keep event</button><button className={base.launch} onClick={() => {
        setPersonalEvents(current => current.filter(item => item.id !== deleting?.personalId)); setNotice(`${deleting?.title} removed from this preview.`); setSelectedId(""); deleteDialog.current?.close(); requestAnimationFrame(() => addButton.current?.focus());
      }}>{deleting?.repeatUntil ? "Delete series" : "Delete event"}</button></div>
    </dialog>
  </div>;
}
