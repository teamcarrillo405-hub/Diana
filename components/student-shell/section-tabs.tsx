"use client";

import { ArrowRight } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import styles from "./section-tabs.module.css";

type Section = {
  id: string;
  label: string;
  content: ReactNode;
  continueAction?: { label: string; className: string };
};

export function SectionTabs({ id, label, sections, initial }: { id: string; label: string; sections: Section[]; initial?: string }) {
  const [selected, setSelected] = useState(initial ?? sections[0]?.id);
  const refs = useRef(new Map<string, HTMLButtonElement>());

  function selectAndFocus(sectionId: string) {
    setSelected(sectionId);
    refs.current.get(sectionId)?.focus();
  }

  return <>
    <div className={styles.tabs} role="tablist" aria-label={label}>{sections.map((section, index) => <button key={section.id} role="tab" id={`${id}-tab-${section.id}`} aria-controls={`${id}-panel-${section.id}`} aria-selected={selected === section.id} tabIndex={selected === section.id ? 0 : -1} ref={el => { if (el) refs.current.set(section.id, el); else refs.current.delete(section.id); }} onClick={() => setSelected(section.id)} onKeyDown={event => {
      const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (!direction && event.key !== "Home" && event.key !== "End") return;
      event.preventDefault();
      const next = sections[event.key === "Home" ? 0 : event.key === "End" ? sections.length - 1 : (index + direction + sections.length) % sections.length];
      selectAndFocus(next.id);
    }}>{section.label}</button>)}</div>
    {sections.map((section, index) => {
      const next = sections[index + 1];
      return (
        <section key={section.id} className={styles.panel} id={`${id}-panel-${section.id}`} role="tabpanel" aria-labelledby={`${id}-tab-${section.id}`} hidden={selected !== section.id}>
          {section.content}
          {next && section.continueAction ? (
            <button type="button" className={section.continueAction.className} onClick={() => selectAndFocus(next.id)}>
              {section.continueAction.label}<ArrowRight size={19} aria-hidden="true" />
            </button>
          ) : null}
        </section>
      );
    })}
  </>;
}
