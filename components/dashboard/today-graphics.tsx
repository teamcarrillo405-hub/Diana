"use client";

import { useState, type ReactNode } from "react";
import { formatMinutes } from "@/lib/dashboard/today-view";
import styles from "./today-dashboard.module.css";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const subjectPalette = ["#2589ae", "#00a978", "#e0a12a", "#dc7554", "#4f6fa8"];

export function PanelHeading({ title, label, action }: { title: string; label: string; action?: ReactNode }) {
  return <header className={styles.panelHeading}><div><p>{label}</p><h2>{title}</h2></div>{action}</header>;
}

export function ProgressRing({ completed, total, unavailable }: { completed: number; total: number; unavailable: boolean }) {
  const percent = total ? Math.round(completed / total * 100) : 0;
  return <div className={styles.progressRing}>
    <svg viewBox="0 0 160 160" role="img" aria-label={unavailable ? "Assignment history unavailable" : total ? `${completed} of ${total} assignments complete, ${percent}%` : "No assignments planned this week"}>
      <circle cx="80" cy="80" r="65" fill="none" stroke="currentColor" strokeWidth="20" className={styles.ringTrack} />
      {!unavailable && percent > 0 && <circle cx="80" cy="80" r="65" fill="none" stroke="var(--mint)" strokeWidth="20" strokeLinecap="round" pathLength="100" strokeDasharray={`${percent} 100`} transform="rotate(-90 80 80)" className={styles.progressArc} />}
    </svg>
    <div className={styles.ringValue}><strong>{unavailable || !total ? "--" : <>{percent}<span>%</span></>}</strong><span>{unavailable ? "unavailable" : !total ? "no weekly goal" : "weekly goal"}</span></div>
  </div>;
}

export function WeeklyBars({ planned, studied, unavailable, initialDay = 2 }: { planned: number[]; studied: number[]; unavailable: boolean; initialDay?: number }) {
  const [selected, setSelected] = useState(initialDay);
  const scale = Math.max(60, Math.ceil(Math.max(...planned, ...studied) / 30) * 30);
  return <div className={styles.barChart}>
    <div className={styles.chartTop}><span>Study time</span><span>{scale}m</span></div>
    <div className={styles.barPlot}>
      <span className={styles.chartGrid} aria-hidden="true" />
      {days.map((day, index) => <button type="button" key={day} className={styles.dayButton} aria-pressed={selected === index} onClick={() => setSelected(index)} onFocus={() => setSelected(index)} onMouseEnter={() => setSelected(index)} aria-label={`${day}: ${planned[index]} minutes planned, ${unavailable ? "study time unavailable" : `${studied[index]} minutes studied`}`}>
        <span className={styles.barPair} aria-hidden="true"><span className={styles.plannedBar} style={{ height: `${planned[index] / scale * 100}%` }} /><span className={styles.studiedBar} style={{ height: `${studied[index] / scale * 100}%` }} /></span>
        <span className={styles.dayLabel}>{day.charAt(0)}</span>
      </button>)}
    </div>
    <div className={styles.chartLegend}><span><i className={styles.plannedKey} />Planned</span><span><i className={styles.studiedKey} />Studied</span></div>
    <p className={styles.chartReadout} aria-live="polite">{days[selected]} <b>{planned[selected]}m</b> planned <span>/</span> {unavailable ? "Unavailable" : <><b>{studied[selected]}m</b> studied</>}</p>
  </div>;
}

export function SubjectDonut({ subjects, palette = subjectPalette, totalLabel = "planned" }: { subjects: readonly { name: string; minutes: number; color: string }[]; palette?: readonly string[]; totalLabel?: string }) {
  const [focused, setFocused] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? focused;
  const colors = palette.length ? palette : subjectPalette;
  const total = subjects.reduce((sum, subject) => sum + subject.minutes, 0);
  let offset = 0;
  return <div className={styles.subjectContent} data-subject-breakdown>
    <div className={styles.subjectChart} data-subject-chart>
      <svg viewBox="0 0 180 180" role="img" aria-label={subjects.length ? subjects.map(subject => `${subject.name}: ${subject.minutes} minutes`).join(", ") : "No weekly subject work planned"}>
        <circle cx="90" cy="90" r="70" fill="none" stroke="#71827b" strokeOpacity=".18" strokeWidth="30" />
        {subjects.map((subject, index) => { const length = total ? subject.minutes / total * 100 : 0; const start = offset; const color = colors[index % colors.length]; offset += length; return <circle key={subject.name} cx="90" cy="90" r="70" fill="none" stroke={color} strokeWidth={active === index ? 33 : 30} pathLength="100" strokeDasharray={`${Math.max(0, length - 1.1)} ${100 - Math.max(0, length - 1.1)}`} strokeDashoffset={-start} transform="rotate(-90 90 90)" opacity={active === null || active === index ? 1 : .3} />; })}
      </svg>
      <div className={styles.donutValue} data-subject-value><strong>{formatMinutes(active === null ? total : subjects[active]?.minutes ?? total)}</strong><span>{active === null ? totalLabel : "this subject"}</span></div>
    </div>
    <ul className={styles.subjectList} data-subject-list onMouseLeave={() => setHovered(null)}>{subjects.map((subject, index) => <li key={subject.name}><button type="button" onMouseEnter={() => setHovered(index)} onFocus={() => { setFocused(index); setHovered(null); }} onBlur={() => setFocused(null)} onClick={() => setFocused(index)} aria-pressed={active === index}><i style={{ background: colors[index % colors.length] }} /><span>{subject.name}<small>{formatMinutes(subject.minutes)}</small></span><b>{Math.round(total ? subject.minutes / total * 100 : 0)}%</b></button></li>)}</ul>
    {!subjects.length && <p className={styles.emptyNote}>Your subjects appear here when you plan some work.</p>}
  </div>;
}
