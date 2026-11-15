"use client";

import { useState } from "react";
import Link from "next/link";
import { families, reviewHref, screenInfo, type Screen } from "./catalog";
import styles from "./remaining-concept-review.module.css";

export type Scenario = "ready" | "empty" | "attention";

export function ReviewTools({ screen, scenario, onScenario }: { screen: Screen; scenario: Scenario; onScenario: (next: Scenario) => void }) {
  const [open, setOpen] = useState(false);
  return <aside className={styles.previewControls} aria-label="Design preview controls">
    <span>LOCAL PREVIEW</span>
    <details className={styles.previewDrawer} open={open}>
      <summary onClick={event => { event.preventDefault(); setOpen(current => !current); }}>Preview tools</summary>
      <div className={styles.previewDrawerBody} hidden={!open}>
        <label>Preview state <select aria-label="Preview state" value={scenario} onChange={event => onScenario(event.target.value as Scenario)}><option value="ready">With example data</option><option value="empty">Empty</option><option value="attention">Needs attention</option></select></label>
        <nav aria-label="Review screen catalog">
          {families.map(family => <section key={family.id}><h2>{family.label}</h2>{family.screens.map(id => <Link key={id} prefetch={false} href={reviewHref(id)} aria-current={id === screen ? "page" : undefined}>{screenInfo[id].label}</Link>)}</section>)}
        </nav>
        <p>Example data. Actions stay in this preview.</p>
      </div>
    </details>
  </aside>;
}
