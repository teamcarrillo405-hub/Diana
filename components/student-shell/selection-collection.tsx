"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { Search } from "lucide-react";
import styles from "./collection.module.css";

export type CollectionItem = { id: string; title: string; meta: string; image?: string; content: ReactNode };

export function SelectionCollection({ items, label, initial, empty, searchable = true }: { items: CollectionItem[]; label: string; initial?: string; empty: ReactNode; searchable?: boolean }) {
  const id = useId();
  const [compact, setCompact] = useState(false);
  useEffect(() => { const media = window.matchMedia("(max-width: 760px)"); const update = () => setCompact(media.matches); update(); media.addEventListener("change", update); return () => media.removeEventListener("change", update); }, []);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(initial ?? items[0]?.id);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const visible = items.filter(item => `${item.title} ${item.meta}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const active = visible.find(item => item.id === selected) ?? visible[0];
  useEffect(() => { if (!compact || !active) return; const button = refs.current.get(active.id); const rail = button?.parentElement; if (button && rail) rail.scrollLeft = button.offsetLeft - rail.offsetLeft; }, [active, compact]);
  return <div className={styles.collection} data-empty={items.length === 0 || undefined}>
    <aside className={styles.rail} aria-label={label} hidden={!items.length}>
      {searchable ? <label className={styles.search}><Search size={16} aria-hidden="true" /><input aria-label={`Search ${label.toLowerCase()}`} placeholder="Search" value={query} onChange={event => setQuery(event.target.value)} /></label> : null}
      <div className={styles.items} role="tablist" aria-label={label} aria-orientation={compact ? "horizontal" : "vertical"}>
        {visible.map((item,index) => <button type="button" role="tab" key={item.id} id={`${id}-${item.id}`} aria-controls={`${id}-panel`} aria-selected={item.id === active?.id} tabIndex={item.id === active?.id ? 0 : -1} ref={element => { if (element) refs.current.set(item.id,element); else refs.current.delete(item.id); }} onClick={() => setSelected(item.id)} onKeyDown={event => {
          const step = ["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : ["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 : 0;
          if (!step && event.key !== "Home" && event.key !== "End") return;
          event.preventDefault();
          const next = visible[event.key === "Home" ? 0 : event.key === "End" ? visible.length-1 : (index+step+visible.length)%visible.length];
          setSelected(next.id); refs.current.get(next.id)?.focus();
        }}><small>{item.meta}</small><strong>{item.title}</strong></button>)}
      </div>
      {items.length > 0 && !visible.length ? <p className={styles.muted}>No matches.</p> : null}
    </aside>
    {active ? <section id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${active.id}`} className={styles.stage}>
      {active.image ? <div className={styles.art}><Image src={active.image} alt="" fill sizes="(max-width:760px) 100vw, 55vw" /></div> : null}
      <div className={styles.stageContent}><p className={styles.eyebrow}>{active.meta}</p><h2>{active.title}</h2>{active.content}</div>
    </section> : <section className={styles.stage}>{query ? <p>Try another search.</p> : empty}</section>}
  </div>;
}
