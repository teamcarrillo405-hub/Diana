"use client";

import { cloneElement, isValidElement, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import Link from "next/link";
import { StudentShell } from "@/components/student-shell/student-shell";
import type { StudentNavigationProfile } from "@/components/screen-design/student-desktop-nav";
import type { ReactNode } from "react";
import { formatCampusName } from "@/lib/school-branding";
import { buildCalendarReturnHref, withCalendarReturn } from "@/lib/calendar-return";
import { calendarInstant } from "@/lib/calendar/time-zone";
import { saveCalendarEvent, setCalendarEventDeleted } from "./actions";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameMonth, parseISO, startOfMonth, startOfWeek, eachDayOfInterval } from "date-fns";
import { ArrowRight, BookOpen, CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { clockLabel, dayKey, itemsForDay, itemTime, weekDays, type CalendarItem } from "@/lib/calendar/calendar-items";
import { chronological, expandPersonalEvents, newPersonalEvent, overlappingEvents, REMINDERS, type PersonalEvent } from "@/lib/calendar/personal-events";
import { EventEditor } from "./event-editor";
import { CalendarWeekPlanning } from "./calendar-week-planning";
import base from "@/components/student-shell/command.module.css";
import styles from "./calendar.module.css";
import personal from "./personal-calendar.module.css";

const VIEWS = ["Schedule", "Week", "Month"] as const;
type View = typeof VIEWS[number];
const KIND = { deadline: "Assignment deadline", session: "Study block", event: "Calendar event" };
const dateLabel = (day: string) => format(parseISO(day), "EEEE, MMMM d");
const handedIn = (item: CalendarItem) => ["Submitted", "Graded"].includes(item.status ?? "");

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
    <div><dt>Source</dt><dd>{item.source}{item.personalId ? " / You added" : ""}</dd></div>
    {item.repeatUntil && <div><dt>Repeats</dt><dd>Weekly through {format(parseISO(item.repeatUntil), "MMM d")}</dd></div>}
    {item.personalId && item.reminder !== "none" && <div><dt>Calendar reminder</dt><dd>{REMINDERS.find(reminder => reminder.value === item.reminder)?.label}</dd></div>}
  </dl>;
}

type CalendarProps = { today: string; importedItems: CalendarItem[]; savedEvents: PersonalEvent[]; timeZone: string; profile: StudentNavigationProfile; sync: ReactNode; unavailable?: boolean; initialDay?: string; initialView?: View;
  schoolName?: string | null; feedErrors?: { assignments?: string; imported?: string; personal?: string }; initialItem?: string; planningNote?: string | null; suggestedBlockMinutes?: number | null; weekPlans?: Array<{ weekStart: string; availableMinutes: number }>; planningUnavailable?: boolean };

export function StudentCalendar({ today, importedItems, savedEvents, timeZone, profile, sync, unavailable = false, initialDay, initialView, schoolName, feedErrors = {}, initialItem, planningNote, suggestedBlockMinutes, weekPlans, planningUnavailable }: CalendarProps) {
  const [personalEvents, setPersonalEvents] = useState(savedEvents);
  const [removed, setRemoved] = useState<PersonalEvent | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [selectedDay, setSelectedDay] = useState(initialDay ?? today);
  const [selectedId, setSelectedId] = useState(initialItem ?? "");
  const [view, setView] = useState<View>(initialView ?? "Schedule");
  const [editing, setEditing] = useState<PersonalEvent | null>(null);
  const [deleting, setDeleting] = useState<CalendarItem | null>(null);
  const [notice, setNotice] = useState("");
  const [phone, setPhone] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(Boolean(initialItem));
  const [deleteError, setDeleteError] = useState("");
  const sheetDialog = useRef<HTMLDialogElement>(null);
  const deleteErrorRef = useRef<HTMLParagraphElement>(null);
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
  const items = [...importedItems, ...expandPersonalEvents(personalEvents, dayKey(addDays(monthDays[0], -1)), dayKey(addDays(monthDays[monthDays.length - 1], 1)), timeZone)];
  const dayItems = chronological(itemsForDay(items, selectedDay));
  const deadlines = dayItems.filter(item => item.kind === "deadline");
  const actionableDeadlines = deadlines.filter(item => !handedIn(item));
  const scheduled = dayItems.filter(item => item.kind !== "deadline");
  const agendaItems = [...deadlines, ...scheduled];
  const selectedItem = dayItems.find(item => item.id === selectedId) ?? scheduled.find(item => item.personalId) ?? scheduled[0] ?? deadlines[0];
  const weekItems = items.filter(item => item.day >= dayKey(days[0]) && item.day <= dayKey(days[6]));
  const returnTo = buildCalendarReturnHref({ day: selectedDay, view: view.toLowerCase() as "schedule" | "week" | "month", item: selectedItem?.id });
  const activeWeekAssignments = weekItems.filter(item => item.kind === "deadline" && !["Submitted", "Graded", "Ready to submit"].includes(item.status ?? ""));
  const estimatedMinutes = activeWeekAssignments.reduce((sum, item) => sum + (item.minutes ?? 0), 0);
  const unknownEstimateCount = activeWeekAssignments.filter(item => item.minutes == null).length;
  const weekStart = calendarInstant(dayKey(days[0]), "00:00", timeZone).getTime();
  const weekEnd = calendarInstant(dayKey(addDays(days[6], 1)), "00:00", timeZone).getTime();
  const studySessions = [...new Map(weekItems.filter(item => item.kind === "session").map(item => [item.occurrenceId ?? item.id, item])).values()];
  const plannedMinutes = studySessions.reduce((sum, item) => sum + (item.startsAt && item.endsAt
    ? Math.max(0, Math.min(weekEnd, Date.parse(item.endsAt)) - Math.max(weekStart, Date.parse(item.startsAt))) / 60_000 : item.minutes ?? 0), 0);

  useEffect(() => { setPersonalEvents(savedEvents); }, [savedEvents]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => { setPhone(media.matches); if (!media.matches) sheetDialog.current?.close(); };
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    function restoreLocation() {
      const url = new URL(window.location.href);
      const day = url.searchParams.get("day");
      if (day && /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(day))) setSelectedDay(day);
      setView(VIEWS.find(value => value.toLowerCase() === url.searchParams.get("view")) ?? "Schedule");
      setSelectedId(url.searchParams.get("item") ?? ""); sheetDialog.current?.close();
    }
    window.addEventListener("popstate", restoreLocation);
    return () => window.removeEventListener("popstate", restoreLocation);
  }, []);
  useEffect(() => { if (sheetOpen && phone && !sheetDialog.current?.open) sheetDialog.current?.showModal(); }, [sheetOpen, phone]);
  useEffect(() => { if (view === "Schedule") requestAnimationFrame(() => dayRefs.current.get(selectedDay)?.scrollIntoView?.({ block: "nearest", inline: "nearest" })); }, [selectedDay, view]);

  useEffect(() => {
    if (editing && !editorDialog.current?.open) {
      editorDialog.current?.showModal();
      editorDialog.current?.querySelector("input")?.focus();
    }
  }, [editing]);
  useEffect(() => { if (deleting && !deleteDialog.current?.open) deleteDialog.current?.showModal(); }, [deleting]);

  function chooseDay(day: string, focus = false) {
    setSelectedDay(day); setSelectedId(""); persist(day, view);
    if (focus) requestAnimationFrame(() => { dayRefs.current.get(day)?.focus({ preventScroll: true }); dayRefs.current.get(day)?.scrollIntoView?.({ block: "nearest", inline: "nearest" }); });
  }
  function persist(day: string, nextView: View, item = "") {
    window.history.replaceState(window.history.state, "", buildCalendarReturnHref({ day, view: nextView.toLowerCase() as "schedule" | "week" | "month", item: item || undefined }));
  }
  function changeView(next: View) { setView(next); persist(selectedDay, next, selectedId); }
  function chooseItem(id: string, focus = false, reveal = false) {
    setSelectedId(id); persist(selectedDay, view, id);
    if (reveal && phone) { opener.current = itemRefs.current.get(id) ?? null; setSheetOpen(true); }
    if (focus) {
      itemRefs.current.get(id)?.focus({ preventScroll: true });
      itemRefs.current.get(id)?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    }
  }
  function openDay(day: string, item?: CalendarItem) {
    setSelectedDay(day); setSelectedId(item?.id ?? ""); setView("Schedule"); persist(day, "Schedule", item?.id);
    if (item && phone) setSheetOpen(true);
    requestAnimationFrame(() => item ? itemRefs.current.get(item.id)?.focus({ preventScroll: true }) : dayRefs.current.get(day)?.focus({ preventScroll: true }));
  }
  function changePeriod(direction: number) {
    chooseDay(dayKey(view === "Month" ? addMonths(date, direction) : addDays(date, direction * 7)));
  }
  function restoreFocus() {
    if (sheetDialog.current?.open || editorDialog.current?.open || deleteDialog.current?.open) return;
    const row = itemRefs.current.get(selectedId);
    if (row?.isConnected && (row.checkVisibility?.() ?? true)) row.focus();
    else if (opener.current?.isConnected && (opener.current.checkVisibility?.() ?? true)) opener.current.focus();
    else addButton.current?.focus();
  }
  async function saveEvent(event: PersonalEvent) {
    const result = await saveCalendarEvent(event);
    if (result.error || !result.event) throw new Error(result.error || "Your event could not be saved.");
    const value = result.event;
    setPersonalEvents(current => [...current.filter(item => item.id !== value.id), value]);
    const displayed = expandPersonalEvents([value], dayKey(addDays(parseISO(value.day), -2)), dayKey(addDays(parseISO(value.endDay ?? value.day), 2)), timeZone)[0];
    const displayDay = displayed?.day ?? value.day;
    const displayId = displayed?.id ?? `${value.id}@${value.day}`;
    setSelectedDay(displayDay); setSelectedId(displayId); setView("Schedule");
    persist(displayDay, "Schedule", displayId);
    setNotice(`${value.title} saved.`); editorDialog.current?.close();
    requestAnimationFrame(() => eventTitle.current?.focus());
  }
  async function removeEvent() {
    if (!deleting?.personalId || deletingBusy) return;
    setDeletingBusy(true);
    try {
      const result = await setCalendarEventDeleted(deleting.personalId, true);
      if (result.error) { setDeleteError(result.error); requestAnimationFrame(() => deleteErrorRef.current?.focus()); return; }
      setRemoved(personalEvents.find(item => item.id === deleting.personalId) ?? null);
      setPersonalEvents(current => current.filter(item => item.id !== deleting.personalId));
      setNotice(`${deleting.title} removed.`); setSelectedId(""); deleteDialog.current?.close();
    } catch { setDeleteError("The event could not be removed. Try again."); requestAnimationFrame(() => deleteErrorRef.current?.focus()); }
    finally { setDeletingBusy(false); }
  }
  async function undoRemove() {
    if (!removed || deletingBusy) return;
    setDeletingBusy(true);
    try {
      const result = await setCalendarEventDeleted(removed.id, false);
      if (result.error) { setNotice(result.error); return; }
      setPersonalEvents(current => [...current, removed]); setNotice(`${removed.title} restored.`); setRemoved(null);
    } catch { setNotice("The event could not be restored. Try again."); }
    finally { setDeletingBusy(false); }
  }  function agendaButton(item: CalendarItem) {
    const index = agendaItems.findIndex(entry => entry.id === item.id);
    return <button key={item.id} role="tab" id={`event-${item.id}`} aria-controls={phone ? "calendar-item-sheet" : "selected-event"} aria-selected={selectedItem?.id === item.id} aria-label={item.title} tabIndex={selectedItem?.id === item.id ? 0 : -1}
      className={item.kind === "deadline" ? personal.deadline : personal.scheduleItem} style={{ "--event-color": item.color } as CSSProperties}
      ref={el => { if (el) itemRefs.current.set(item.id, el); else itemRefs.current.delete(item.id); }} onClick={() => chooseItem(item.id, false, true)} onKeyDown={event => { const next = tabIndexFor(event, index, agendaItems.length); if (next !== null) chooseItem(agendaItems[next].id, true); }}>
      {item.kind === "deadline" ? <><BookOpen aria-hidden="true" /><span><strong>{item.title}</strong><small>{item.subject} · {itemTime(item)}{item.status ? ` · ${item.status}` : ""}</small></span></> : <>
        <span className={personal.agendaTime}>{item.allDay ? "ALL DAY" : clockLabel(item.time)}{item.endTime && <small>{clockLabel(item.endTime)}</small>}</span><span className={personal.timeMarker} aria-hidden="true" />
        <span className={personal.agendaCopy}><small>{item.kind === "session" ? "STUDY" : item.subject.toUpperCase()}</small><strong>{item.title}</strong><span>{item.location || item.source}</span></span>
      </>}
    </button>;
  }
  function planStudy(item?: CalendarItem) {
    const event = newPersonalEvent(selectedDay);
    const minutes = Math.max(1, Math.round((selectedDay === today ? suggestedBlockMinutes : null) ?? item?.minutes ?? 25));
    const end = 16 * 60 + minutes;
    sheetDialog.current?.close();
    setEditing({ ...event, title: item ? `Study ${item.title}`.slice(0, 100) : "Study time", category: "Study", assignmentId: item?.assignmentId,
      endDay: dayKey(addDays(parseISO(selectedDay), Math.floor(end / 1440))), endTime: `${String(Math.floor(end / 60) % 24).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}` });
  }
  function itemDetails(item: CalendarItem, inSheet = false) {
    const collisions = overlappingEvents(item, dayItems);
    const label = ["Submitted", "Graded"].includes(item.status ?? "") ? "View submission" : item.status === "Ready to submit" ? "Review submission" : item.status === "Not started" ? "Start assignment" : "Resume assignment";
    return <div className={personal.eventArrival}>
      {item.personalId && personalEvents.find(event => event.id === item.personalId)?.photo && <div className={personal.eventPhoto}><img src={item.image} alt={item.imageAlt} /></div>}
      <div className={personal.eventDetails}>
        <p className={styles.eyebrow}>{item.category || KIND[item.kind]}</p>
        <div className={personal.eventTime}><span>{format(parseISO(item.day), "EEE, MMM d")}</span><strong>{itemTime(item)}</strong></div>
        <h2 ref={inSheet ? undefined : eventTitle} id={inSheet ? "calendar-sheet-title" : "selected-event-title"} tabIndex={-1}>{item.title}</h2>
        {item.brief && <p className={personal.eventBrief}>{item.brief}</p>}
        {item.continuesBefore && <p className={personal.formNotice}>Continues from the previous day.</p>}
        {item.continuesAfter && <p className={personal.formNotice}>Continues tomorrow.</p>}
        {collisions.length > 0 && <p className={personal.overlap}><Clock3 aria-hidden="true" /><span>Also scheduled at this time · {collisions.map(entry => entry.title).join(", ")}.</span></p>}
        <ItemFacts item={item} showTime={false} />
        <div className={personal.eventActions}>{item.personalId ? <>
          <button className={base.launch} onClick={event => { if (!phone) opener.current = event.currentTarget; sheetDialog.current?.close(); setEditing(personalEvents.find(event => event.id === item.personalId) ?? null); }}><Pencil aria-hidden="true" />Edit event</button>
          <button className={personal.deleteEvent} aria-label={`Delete ${item.title}`} onClick={event => { if (!phone) opener.current = event.currentTarget; sheetDialog.current?.close(); setDeleteError(""); setDeleting(item); }}><Trash2 aria-hidden="true" /></button>
          <a className={base.secondary} href={`/calendar/events/${item.personalId}/export`}>Add to device calendar</a>
        </> : item.href ? item.external ? <a className={base.launch} href={item.href} target="_blank" rel="noreferrer">Open in Google Calendar <ArrowRight aria-hidden="true" /></a>
          : <Link className={base.launch} href={withCalendarReturn(item.href, returnTo)}>{label}<ArrowRight aria-hidden="true" /></Link> : null}
          {item.kind === "deadline" && item.assignmentId && !["Submitted", "Graded", "Ready to submit"].includes(item.status ?? "") && <button className={base.secondary} onClick={() => planStudy(item)}><Clock3 aria-hidden="true" />Plan study time</button>}
        </div>
      </div>
    </div>;
  }
  const periodLabel = view === "Month" ? format(date, "MMMM yyyy") : `${format(days[0], "MMM d")} - ${format(days[6], isSameMonth(days[0], days[6]) ? "d, yyyy" : "MMM d, yyyy")}`;

  return <StudentShell active="Calendar" profile={profile} campus campusScene className={`${base.root} ${styles.root} ${personal.root}`}>
    <main id="main-content" className={styles.main} tabIndex={-1}>
      <header className={styles.heading}><div><p className={styles.eyebrow}>{formatCampusName(schoolName)}</p><h1>Calendar</h1></div><div className={styles.headingActions}><a className={base.secondary} href="/api/calendar.ics">Export deadlines</a><button ref={addButton} className={base.launch} onClick={event => { opener.current = event.currentTarget; setEditing(newPersonalEvent(selectedDay)); }}><Plus aria-hidden="true" />Add event</button></div></header>
      {Object.entries(feedErrors).map(([feed, error]) => error && <p key={feed} className={personal.formError} role="status">{error} <a href={returnTo}>Try again</a></p>)}
      {unavailable && !Object.values(feedErrors).some(Boolean) && <p className={personal.formError} role="status">Some calendar items could not load. <a href={returnTo}>Try again</a></p>}
      <div className={styles.toolbar}>
        <div className={styles.period}><h2 aria-live="polite">{periodLabel}</h2><div className={styles.periodActions}>
          <button title={`Previous ${view === "Month" ? "month" : "week"}`} aria-label={`Previous ${view === "Month" ? "month" : "week"}`} onClick={() => changePeriod(-1)}><ChevronLeft aria-hidden="true" /></button>
          <button className={styles.today} onClick={() => chooseDay(today)}>Today</button>
          <button title={`Next ${view === "Month" ? "month" : "week"}`} aria-label={`Next ${view === "Month" ? "month" : "week"}`} onClick={() => changePeriod(1)}><ChevronRight aria-hidden="true" /></button>
        </div></div>
        <div className={styles.viewTabs} role="tablist" aria-label="Calendar views">{VIEWS.map((value, i) => <button key={value} role="tab" id={`view-${value}`} aria-controls={`panel-${value}`} aria-selected={view === value} tabIndex={view === value ? 0 : -1} ref={el => { if (el) viewRefs.current.set(value, el); else viewRefs.current.delete(value); }} onClick={() => changeView(value)} onKeyDown={event => { const next = tabIndexFor(event, i, VIEWS.length); if (next !== null) { changeView(VIEWS[next]); viewRefs.current.get(VIEWS[next])?.focus(); } }}>{value}</button>)}</div>
      </div>

      <section id="panel-Schedule" role="tabpanel" aria-labelledby="view-Schedule" hidden={view !== "Schedule"}>
        <div className={styles.dayRibbon} role="tablist" aria-label="Schedule days">{days.map((day, index) => {
          const key = dayKey(day); const entries = itemsForDay(items, key); const due = entries.filter(item => item.kind === "deadline" && !handedIn(item)).length; const events = entries.filter(item => item.kind !== "deadline").length; const recorded = entries.filter(handedIn).length;
          return <button key={key} role="tab" id={`day-${key}`} aria-controls="day-schedule" aria-label={dateLabel(key)} aria-describedby={`day-count-${key}`} aria-selected={selectedDay === key} aria-current={key === today ? "date" : undefined} tabIndex={selectedDay === key ? 0 : -1}
            ref={el => { if (el) dayRefs.current.set(key, el); else dayRefs.current.delete(key); }} onClick={() => chooseDay(key)} onKeyDown={event => { const next = tabIndexFor(event, index, days.length); if (next !== null) chooseDay(dayKey(days[next]), true); }}>
            <span className={styles.dayTop}>{format(day, "EEE")}<span>{key === today ? "TODAY" : format(day, "MMM")}</span></span><strong>{format(day, "dd")}</strong>
            <span className={styles.daySubject}>{events} {events === 1 ? "event" : "events"}</span><span className={styles.dayCount} id={`day-count-${key}`}>{due} due{recorded > 0 ? ` · ${recorded} handed in` : ""}</span>
          </button>;
        })}</div>
        <div id="day-schedule" role="tabpanel" aria-labelledby={`day-${selectedDay}`} className={personal.composition}>
          <section className={personal.dayBoard} aria-label="Your day">
            <header className={personal.dayHeading}><div><span>{format(date, "MMMM d, yyyy")}</span><h2>{format(date, "EEEE")}</h2></div><span title={timeZone}>{timeZone.split("/").at(-1)?.replaceAll("_", " ")} time</span></header>
            {dayItems.length ? <div role="tablist" aria-label="Day agenda" aria-orientation="vertical">
              <div className={personal.deadlineLane}><h3><BookOpen aria-hidden="true" />Assignment deadlines <span>{actionableDeadlines.length} due</span></h3>{deadlines.length ? deadlines.map(agendaButton) : <p>{feedErrors.assignments ? "Assignment deadlines unavailable." : "No assignment deadlines."}</p>}</div>
              <div className={personal.dayTimeline}><h3>On your schedule <span>{scheduled.length}</span></h3>{scheduled.length ? scheduled.map(agendaButton) : <p className={personal.emptySchedule}>{feedErrors.imported || feedErrors.personal ? "Some scheduled events are unavailable." : "No events scheduled."}</p>}</div>
            </div> : <div className={personal.emptySchedule}><CalendarDays aria-hidden="true" /><h2>{Object.values(feedErrors).some(Boolean) ? "Calendar unavailable" : "Nothing scheduled"}</h2><p>{Object.values(feedErrors).some(Boolean) ? "Try loading your calendar again." : "No deadlines or events on this day."}</p><button className={styles.textAction} onClick={() => { changeView("Week"); viewRefs.current.get("Week")?.focus(); }}>View the week <ArrowRight aria-hidden="true" /></button></div>}
          </section>

          {selectedItem && <section className={personal.selectedEvent} id="selected-event" role="tabpanel" aria-labelledby={`event-${selectedItem.id}`}>{itemDetails(selectedItem)}</section>}
        </div>
      </section>

      <section id="panel-Week" role="tabpanel" aria-labelledby="view-Week" hidden={view !== "Week"} className={styles.weekView}>
        {days.map(day => { const key = dayKey(day); const entries = chronological(itemsForDay(items, key)); return <section key={key} className={styles.weekDay} data-today={key === today} data-expanded={key === selectedDay}>
          <button className={styles.weekDayTitle} onClick={() => chooseDay(key)} aria-expanded={key === selectedDay} aria-label={`Show ${dateLabel(key)}`}><span>{format(day, "EEE")}</span><strong>{format(day, "dd")}</strong><small>{entries.filter(item => item.kind === "deadline" && !handedIn(item)).length} due · {entries.filter(item => item.kind !== "deadline").length} events{entries.some(handedIn) ? ` · ${entries.filter(handedIn).length} handed in` : ""}</small></button>
          {["deadline", "scheduled"].map(group => <div className={styles.weekGroup} key={group}><h3>{group === "deadline" ? "Assignments" : "Scheduled"}</h3>{entries.filter(item => group === "deadline" ? item.kind === "deadline" : item.kind !== "deadline").map(item => <button key={item.id} onClick={event => { opener.current = event.currentTarget; openDay(key, item); }} style={{ "--event-color": item.color } as CSSProperties}><small>{itemTime(item)}</small><strong>{item.title}</strong><span>{item.subject}{item.status ? ` · ${item.status}` : item.kind === "session" ? " / Study block" : ""}</span></button>)}</div>)}
          {!entries.length && <p className={styles.emptyDay}>Nothing scheduled</p>}
        </section>; })}
      </section>

      <section id="panel-Month" role="tabpanel" aria-labelledby="view-Month" hidden={view !== "Month"} className={styles.monthView}>
        <div className={styles.monthScroller}>
        <div className={styles.monthLabels} aria-hidden="true">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(name => <span key={name}>{name}</span>)}</div>
        <div className={styles.monthGrid}>{monthDays.map(day => { const key = dayKey(day); const entries = chronological(itemsForDay(items, key)); return <button key={key} data-outside={!isSameMonth(day, date)} data-today={key === today} aria-pressed={key === selectedDay} aria-label={`${dateLabel(key)}${key === today ? ", today" : ""}, ${entries.length} ${entries.length === 1 ? "item" : "items"}, ${entries.filter(item => item.kind === "deadline" && !handedIn(item)).length} due, ${entries.filter(handedIn).length} handed in`} onClick={() => chooseDay(key)}>
          <strong>{format(day, "d")}</strong><span className={styles.monthEntries}>{entries.slice(0, 2).map(item => <span key={item.id} style={{ "--event-color": item.color } as CSSProperties}>{item.title}</span>)}{entries.length > 2 && <small>+{entries.length - 2} more</small>}</span><span className={styles.monthCount} aria-hidden="true">{entries.length || ""}</span>
        </button>; })}</div></div>
        <p className={styles.monthHint}>Counts include deadlines, events and handed-in work. Select a date to see its agenda.</p>
        <section className={styles.monthAgenda} aria-label="Selected date agenda"><h2>{dateLabel(selectedDay)}</h2>{dayItems.length ? dayItems.map(item => <button key={item.id} className={styles.compactItem} onClick={event => { opener.current = event.currentTarget; setSelectedId(item.id); persist(selectedDay, view, item.id); if (phone) setSheetOpen(true); else { setSelectedDay(item.day); setView("Schedule"); persist(item.day, "Schedule", item.id); } }}><span>{itemTime(item)}</span><strong>{item.title}</strong><small>{item.kind === "deadline" ? `${item.subject} · ${item.status ?? "Deadline"}` : item.kind === "session" ? "Study block" : item.subject}</small><ChevronRight aria-hidden="true" /></button>) : <p>{Object.values(feedErrors).some(Boolean) ? "Some calendar items are unavailable." : "No deadlines or events on this day."}</p>}</section>
      </section>
      <CalendarWeekPlanning key={dayKey(days[0])} weekStart={dayKey(days[0])} estimatedMinutes={estimatedMinutes} unknownEstimateCount={unknownEstimateCount} plannedMinutes={plannedMinutes} initialAvailableMinutes={weekPlans?.find(plan => plan.weekStart === dayKey(days[0]))?.availableMinutes ?? null} unavailable={planningUnavailable} planningNote={selectedDay === today ? planningNote : null} onPlanStudy={() => planStudy(selectedItem?.kind === "deadline" && !["Submitted", "Graded", "Ready to submit"].includes(selectedItem.status ?? "") ? selectedItem : undefined)} />
      <div className={personal.connection}>{isValidElement<{ returnTo?: string }>(sync) && typeof sync.type !== "string" ? cloneElement(sync, { returnTo }) : sync}</div>
    </main>
    <div className={personal.status} role="status">{notice}{removed && <button className={base.secondary} disabled={deletingBusy} onClick={undoRemove}>Undo removal</button>}</div>
    <dialog ref={sheetDialog} id="calendar-item-sheet" className={`${base.dialog} ${styles.dialog} ${personal.itemSheet}`} aria-labelledby="calendar-sheet-title" onClose={() => { setSheetOpen(false); restoreFocus(); }}>
      <button className={styles.close} aria-label="Close event details" onClick={() => sheetDialog.current?.close()}><X aria-hidden="true" /></button>
      {selectedItem && itemDetails(selectedItem, true)}
    </dialog>
    <dialog ref={editorDialog} className={`${base.dialog} ${personal.editorDialog}`} aria-labelledby="event-editor-title" onClose={() => { setEditing(null); restoreFocus(); }}>
      <header className={personal.editorHeader}><div><p className={styles.eyebrow}>{formatCampusName(schoolName)}</p><h2 id="event-editor-title">{editing?.id ? "Edit event" : editing?.assignmentId ? "Plan study time" : "Add event"}</h2></div><button className={styles.close} aria-label="Close event editor" onClick={() => editorDialog.current?.close()}><X aria-hidden="true" /></button></header>
      {editing && <EventEditor key={editing.id || "new"} initial={editing} assignmentTitle={importedItems.find(item => editing.assignmentId && item.assignmentId === editing.assignmentId)?.title} timeZone={editing.timeZone ?? timeZone} onSave={saveEvent} onCancel={() => editorDialog.current?.close()} />}
    </dialog>
    <dialog ref={deleteDialog} className={`${base.dialog} ${styles.dialog}`} aria-labelledby="delete-event-title" onClose={() => { setDeleting(null); setDeleteError(""); restoreFocus(); }}>
      <h2 id="delete-event-title">Delete {deleting?.title}?</h2><p>{deleting?.repeatUntil ? "This removes the entire repeating series from your calendar." : "This removes the event from your calendar."}</p>
      {deleteError && <p ref={deleteErrorRef} className={personal.formError} tabIndex={-1} role="alert">{deleteError}</p>}
      <div className={personal.formActions}><button className={base.secondary} disabled={deletingBusy} onClick={() => deleteDialog.current?.close()}>Keep event</button><button className={base.launch} disabled={deletingBusy} onClick={removeEvent}>{deletingBusy ? "Removing..." : deleting?.repeatUntil ? "Delete series" : "Delete event"}</button></div>
    </dialog>
  </StudentShell>;
}

