import Link from "next/link";
import type { ReactNode } from "react";
import { CampusWordmark } from "@/components/student-shell/campus-wordmark";
import styles from "@/components/student-shell/public.module.css";
export function PublicPageFrame({
  children,
  intro,
  title
}: {
  children: ReactNode;
  intro?: string;
  title: string;
}) {
  return <div className={styles.root} data-public-shell data-campus-family="entry">
    <a className={styles.skip} href="#main-content">Skip to content</a>
    <header className={styles.header}>
      <CampusWordmark className={styles.brand} href="/" light />
      <nav aria-label="Public navigation"><Link href="/#how-it-works">How it works</Link><Link href="/student-control">Student control</Link><Link href="/trust">Trust</Link></nav>
      <Link className={styles.cta} href="/signup">Create account</Link>
    </header>
    <main id="main-content" className={styles.main}><header className={styles.hero}><h1>{title}</h1>{intro ? <p>{intro}</p> : null}</header><div className={styles.reading}>{children}</div></main>
    <footer className={styles.footer}><Link href="/">Diana</Link><Link href="/privacy.html">Privacy</Link><Link href="/login">Sign in</Link></footer>
  </div>;
}
