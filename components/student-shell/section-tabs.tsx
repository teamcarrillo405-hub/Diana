"use client";

import { navigationHistoryState } from "@/lib/navigation-history";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./section-tabs.module.css";

type Section = {
  id: string;
  label: string;
  content: ReactNode;
  continueAction?: { label: string; className: string };
};

type Props = {
  id: string;
  label: string;
  sections: Section[];
  initial?: string;
  /** Opt in to a shareable, refresh-safe selection. Other query values are retained. */
  queryKey?: string;
  clearQueryKeys?: readonly string[];
};

export function SectionTabs({ id, label, sections, initial, queryKey, clearQueryKeys = [] }: Props) {
  const fallback = sections.some(section => section.id === initial) ? initial : sections[0]?.id;
  const [selected, setSelected] = useState(fallback);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const sectionIds = JSON.stringify(sections.map(section => section.id));

  useEffect(() => {
    if (!queryKey) return;
    const validIds = JSON.parse(sectionIds) as string[];
    const restore = () => {
      const value = new URLSearchParams(window.location.search).get(queryKey);
      setSelected(value && validIds.includes(value) ? value : fallback);
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [queryKey, sectionIds, fallback]);

  function select(sectionId: string, focus = false) {
    setSelected(sectionId);
    if (queryKey) {
      const url = new URL(window.location.href);
      url.searchParams.set(queryKey, sectionId);
      clearQueryKeys.forEach(key => url.searchParams.delete(key));
      // Next.js observes the public History API and refreshes its canonical URL.
      window.history.replaceState(navigationHistoryState(window.history.state), "", `${url.pathname}${url.search}${url.hash}`);
    }
    if (focus) refs.current.get(sectionId)?.focus();
  }

  return <>
    <div className={styles.tabs} role="tablist" aria-label={label}>{sections.map((section, index) => <button key={section.id} type="button" role="tab" id={`${id}-tab-${section.id}`} aria-controls={`${id}-panel-${section.id}`} aria-selected={selected === section.id} tabIndex={selected === section.id ? 0 : -1} ref={el => { if (el) refs.current.set(section.id, el); else refs.current.delete(section.id); }} onClick={() => select(section.id)} onKeyDown={event => {
      const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (!direction && event.key !== "Home" && event.key !== "End") return;
      event.preventDefault();
      const next = sections[event.key === "Home" ? 0 : event.key === "End" ? sections.length - 1 : (index + direction + sections.length) % sections.length];
      select(next.id, true);
    }}>{section.label}</button>)}</div>
    {sections.map((section, index) => {
      const next = sections[index + 1];
      return <section key={section.id} className={styles.panel} id={`${id}-panel-${section.id}`} role="tabpanel" aria-labelledby={`${id}-tab-${section.id}`} hidden={selected !== section.id}>
        {section.content}
        {next && section.continueAction ? <button type="button" className={section.continueAction.className} onClick={() => select(next.id, true)}>{section.continueAction.label}<ArrowRight size={19} aria-hidden="true" /></button> : null}
      </section>;
    })}
  </>;
}
