"use client";

import { useRef, useState, type ReactNode } from "react";
import styles from "./section-tabs.module.css";

export function SectionTabs({ id, label, sections, initial }: { id: string; label: string; sections: { id: string; label: string; content: ReactNode }[]; initial?: string }) {
  const [selected, setSelected] = useState(initial ?? sections[0]?.id);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  return <>
    <div className={styles.tabs} role="tablist" aria-label={label}>{sections.map((section, index) => <button key={section.id} role="tab" id={`${id}-tab-${section.id}`} aria-controls={`${id}-panel-${section.id}`} aria-selected={selected === section.id} tabIndex={selected === section.id ? 0 : -1} ref={el => { if (el) refs.current.set(section.id, el); else refs.current.delete(section.id); }} onClick={() => setSelected(section.id)} onKeyDown={event => {
      const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (!direction && event.key !== "Home" && event.key !== "End") return;
      event.preventDefault();
      const next = sections[event.key === "Home" ? 0 : event.key === "End" ? sections.length - 1 : (index + direction + sections.length) % sections.length];
      setSelected(next.id); refs.current.get(next.id)?.focus();
    }}>{section.label}</button>)}</div>
    {sections.map(section => <section key={section.id} className={styles.panel} id={`${id}-panel-${section.id}`} role="tabpanel" aria-labelledby={`${id}-tab-${section.id}`} hidden={selected !== section.id}>{section.content}</section>)}
  </>;
}
