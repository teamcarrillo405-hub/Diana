import Link from "next/link";
import type { ReactNode } from "react";
import { CampusWordmark } from "@/components/student-shell/campus-wordmark";
import styles from "@/components/student-shell/public.module.css";
export function EntryFrame({
  children
}: {
  children: ReactNode;
}) {
  return <div className={styles.root} data-entry-shell data-campus-family="entry">
    <a className={styles.skip} href="#main-content">Skip to content</a>
    <header className={styles.header}><CampusWordmark className={styles.brand} href="/" light /><Link href="/trust">Trust & privacy</Link></header>
    <main id="main-content" className={styles.entryMain}>
      <aside className={styles.welcome} aria-label="Welcome to Diana"><p className={styles.eyebrow}>Your campus starts here</p><h2>A place to<br />find your next step.</h2><p>Bring your work. Make space to think.<br />Diana will meet you there.</p></aside>
      <section className={styles.form}>{children}</section>
    </main>
    <footer className={styles.footer}><a href="/privacy.html">Privacy</a><Link href="/trust">How Diana supports you</Link></footer>
  </div>;
}
