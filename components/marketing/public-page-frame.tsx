import Link from "next/link";
import type { ReactNode } from "react";
import styles from "@/components/student-shell/public.module.css";
export function PublicPageFrame({children,intro,title}:{children:ReactNode;intro?:string;title:string}) {
  return <div className={styles.root} data-public-shell>
    <header className={styles.header}>
      <Link className={styles.brand} href="/" aria-label="Diana home"><img src="/screendesign/brand/diana-logo-tight-no-shadow.png" alt="Diana" /></Link>
      <nav aria-label="Public navigation"><Link href="/#how-it-works">How it works</Link><Link href="/student-control">Student control</Link><Link href="/trust">Trust</Link></nav>
      <Link className={styles.cta} href="/#early-access">Get early access</Link>
    </header>
    <main id="main-content" className={styles.main}><header className={styles.hero}><h1>{title}</h1>{intro ? <p>{intro}</p> : null}</header>{children}</main>
    <footer className={styles.footer}><Link href="/">Diana</Link><Link href="/privacy.html">Privacy & terms</Link><Link href="/login">Sign in</Link></footer>
  </div>;
}
