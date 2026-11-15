"use client";

import { ArrowRight, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { StudentShell } from "@/components/student-shell/student-shell";
import type { StudentNavigationProfile } from "@/components/screen-design/student-desktop-nav";
import { ClassIdentity } from "@/components/student-shell/class-identity";
import shell from "@/components/student-shell/student-shell.module.css";
import styles from "@/components/student-shell/classes.module.css";

export type SubjectLibraryCardModel = { id: string; name: string; teacher: string | null; href: string; progressPct: number; openWorkCount: number; submittedCount?: number; nextAssignmentTitle: string | null; gradeLabel?: string | null; gradePercent?: number | null };
type Props = { createForm: ReactNode; createOpen: boolean; profile?: StudentNavigationProfile; unavailable?: boolean };

export function EmptyClassLibrary(props: Props) { return <MyClassesGrid {...props} cards={[]} />; }

export function MyClassesGrid({ cards, createForm, createOpen, profile, unavailable = false }: Props & { cards: SubjectLibraryCardModel[] }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(cards[0]?.id);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const visible = cards.filter(card => `${card.name} ${card.teacher ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  const selected = visible.find(card => card.id === selectedId) ?? visible[0];
  return <StudentShell active="Classes" profile={profile} className={styles.root}>
    <main id="main-content" className={styles.main} tabIndex={-1}>
      <header className={styles.pageHeading}><h1>Classes</h1><Link href={createOpen ? "/classes" : "/classes?create=1"} className={shell.secondary}>{createOpen ? "Close" : <><Plus size={18} aria-hidden="true" />Add class</>}</Link></header>
      {createOpen && <section className={styles.classForm} aria-label="Add a class"><h2>Add a class</h2>{createForm}</section>}
      {unavailable ? <div className={shell.empty} role="status"><h2>Classes could not load</h2><button className={shell.secondary} onClick={() => window.location.reload()}>Try again</button></div> : !cards.length ? <div className={shell.empty}><h2>Add your first class</h2>{!createOpen && <Link className={shell.primary} href="/classes?create=1">Add class <Plus aria-hidden="true" /></Link>}</div> : <div className={styles.composition}>
        <aside className={styles.lineup}>
          <label className={styles.search}><Search size={16} aria-hidden="true" /><input aria-label="Find a class" placeholder="Find a class" value={query} onChange={event => setQuery(event.target.value)} /></label>
          <label className={styles.mobilePicker}>Class<select value={selected?.id ?? ""} onChange={event => setSelectedId(event.target.value)}>{visible.map(card => <option key={card.id} value={card.id}>{card.name}</option>)}</select></label>
          <div className={styles.classTabs} role="tablist" aria-label="Your classes" aria-orientation="vertical">{visible.map((card, index) => <button key={card.id} role="tab" id={`class-${card.id}`} aria-controls="selected-class" aria-selected={selected?.id === card.id} tabIndex={selected?.id === card.id ? 0 : -1} ref={el => { if (el) refs.current.set(card.id, el); else refs.current.delete(card.id); }} onClick={() => setSelectedId(card.id)} onKeyDown={event => {
            const direction = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
            if (!direction && event.key !== "Home" && event.key !== "End") return;
            event.preventDefault(); const next = visible[event.key === "Home" ? 0 : event.key === "End" ? visible.length - 1 : (index + direction + visible.length) % visible.length]; setSelectedId(next.id); refs.current.get(next.id)?.focus();
          }}><strong>{card.name}</strong></button>)}</div>
        </aside>
        {selected ? <section id="selected-class" role="tabpanel" aria-labelledby={`class-${selected.id}`} className={styles.profile}>
          <ClassIdentity name={selected.name} teacher={selected.teacher} grade={selected.gradeLabel ? { label: selected.gradeLabel, percent: selected.gradePercent } : null} openCount={selected.openWorkCount} submittedCount={selected.submittedCount} />
          {selected.nextAssignmentTitle && <p className={styles.nextWork}><span>Next assignment</span><strong>{selected.nextAssignmentTitle}</strong></p>}
          <Link className={`${shell.primary} ${styles.openClass}`} href={selected.href}>Open class <ArrowRight aria-hidden="true" /></Link>
        </section> : <div className={shell.empty}><h2>No matching classes</h2><button className={shell.secondary} onClick={() => setQuery("")}>Clear search</button></div>}
      </div>}
    </main>
  </StudentShell>;
}

