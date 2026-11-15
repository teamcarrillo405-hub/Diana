import Link from "next/link";
import type { ReactNode } from "react";

type PublicPageFrameProps = {
  children: ReactNode;
  intro: string;
  title: string;
};

export function PublicPageFrame({ children, intro, title }: PublicPageFrameProps) {
  return (
    <div className="dpl-subpage">
      <header className="dpl-sub-header">
        <Link className="dpl-sub-brand" href="/" aria-label="Diana home">
          <img src="/screendesign/brand/diana-logo-tight-dark-wordmark.png" alt="Diana" />
        </Link>
        <nav aria-label="Marketing navigation">
          <Link href="/#how-it-works">How It Works</Link>
          <a href="/student-control">Student Control</a>
          <a href="/trust">Trust</a>
        </nav>
        <Link className="dpl-sub-cta" href="/#early-access">Get Early Access</Link>
      </header>
      <main>
        <section className="dpl-sub-hero">
          <p>DIANA HOMEWORK WORKSPACE</p>
          <h1>{title}</h1>
          <p>{intro}</p>
        </section>
        {children}
      </main>
      <footer className="dpl-sub-footer">
        <img src="/screendesign/brand/diana-logo-tight-dark-wordmark.png" alt="Diana" />
        <p>Homework help that keeps the work yours.</p>
      </footer>
    </div>
  );
}
