"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { StudentShell } from "./student-shell";
import type { StudentNavigationProfile } from "@/components/screen-design/student-desktop-nav";
import { ChevronRight, Search, X } from "lucide-react";
import { MORE_SECTIONS, type MoreMode } from "./more-destinations";

import styles from "./more-menu.module.css";

export function MoreMenu({ profile }: { profile?: StudentNavigationProfile }) {
  const [mode, setMode] = useState<MoreMode>("study");
  const [query, setQuery] = useState("");
  const [compact, setCompact] = useState(false);
  const tabs = useRef(new Map<MoreMode, HTMLButtonElement>());
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 0;
    if (!step && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? MORE_SECTIONS.length - 1 : (index + step + MORE_SECTIONS.length) % MORE_SECTIONS.length;
    const id = MORE_SECTIONS[next].id;
    setMode(id);
    tabs.current.get(id)?.focus({ preventScroll: true });
    tabs.current.get(id)?.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "auto" });
  }

  return <StudentShell active="More" profile={profile} className={styles.root}>
    <main className={styles.main} id="main-content" tabIndex={-1}>
      <aside className={styles.rail}>
        <h1>More</h1>
        <div className={styles.tabs} role="tablist" aria-label="More categories" aria-orientation={compact ? "horizontal" : "vertical"}>
          {MORE_SECTIONS.map((section, index) => <button
            type="button" role="tab" key={section.id} id={`more-tab-${section.id}`} aria-label={section.title} aria-controls={`more-panel-${section.id}`}
            aria-selected={mode === section.id} tabIndex={mode === section.id ? 0 : -1}
            ref={element => { if (element) tabs.current.set(section.id, element); else tabs.current.delete(section.id); }}
            onClick={() => setMode(section.id)} onKeyDown={event => onTabKey(event, index)}
          >{section.id === "study" ? <><span className={styles.wideLabel}>Study tools</span><span className={styles.shortLabel}>Tools</span></> : section.title}</button>)}
        </div>
      </aside>

      <div className={styles.stage}>
        {MORE_SECTIONS.map(section => <section className={styles.panel} key={section.id} role="tabpanel" id={`more-panel-${section.id}`}
          aria-labelledby={`more-tab-${section.id}`} hidden={mode !== section.id} inert={mode !== section.id}>
          <header className={styles.panelHeading}><h2>{section.title}</h2></header>
          {section.id === "study" && <form className={styles.searchForm} role="search" aria-label="Search Diana" action="/search" method="get">
            <label htmlFor="more-search">Search</label>
            <div className={styles.searchField}>
              <input ref={search} id="more-search" name="q" type="search" placeholder="Class, work, or note" value={query} onChange={event => setQuery(event.target.value)} />
              {query && <button type="button" className={styles.clear} title="Clear search" aria-label="Clear search" onClick={() => { setQuery(""); search.current?.focus(); }}><X aria-hidden="true" /></button>}
              <button type="submit" className={styles.searchAction} title="Search Diana" aria-label="Search Diana"><Search aria-hidden="true" /></button>
            </div>
          </form>}
          <ul className={styles.destinations} aria-label={`${section.title} destinations`}>
            {section.links.map(({ href, label, Icon }) => <li key={href}>
              <Link href={href} prefetch={false}>
                <Icon className={styles.destinationIcon} aria-hidden="true" strokeWidth={1.6} />
                <span>{label}</span><ChevronRight className={styles.openIcon} aria-hidden="true" />
              </Link>
            </li>)}
          </ul>
        </section>)}
      </div>
    </main>
  </StudentShell>;
}
