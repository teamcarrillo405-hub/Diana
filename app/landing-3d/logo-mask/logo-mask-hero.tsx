"use client";

import Link from "next/link";
import { ArrowRight, Pause, Play } from "lucide-react";
import { useState } from "react";

import { CinematicLogoMaskHero } from "@/components/cinematic-logo-mask-hero";

import styles from "./logo-mask-hero.module.css";

const navigation = (
  <nav aria-label="Primary navigation" className={styles.nav}>
    <Link className={styles.brand} href="#top" aria-label="Diana home">
      <img alt="Diana" src="/landing-3d/logo-mask/diana-logo-header.svg" />
    </Link>
    <div className={styles.navLinks}>
      <Link href="/#how-it-works">How It Works</Link>
      <Link href="/#meet-diana">Meet Diana</Link>
      <Link href="/#how-diana-helps">How Diana Helps</Link>
      <Link href="/#your-control">Your Control</Link>
    </div>
    <div className={styles.actions}>
      <Link href="/login">Sign In</Link>
      <Link className={styles.startButton} href="/signup">
        Start With Diana
        <ArrowRight aria-hidden="true" size={16} strokeWidth={1.9} />
      </Link>
    </div>
  </nav>
);

export function LogoMaskHero() {
  const [paused, setPaused] = useState(false);

  return (
    <main className={styles.pageShell}>
      <CinematicLogoMaskHero
        ctaHref="/signup"
        ctaLabel="Start With Diana"
        headline="Stuck On Homework?"
        navigation={navigation}
        paused={paused}
        subhead="Diana gives you one clear next move, then coaches you through it"
      />
      <button
        aria-label={paused ? "Resume motion" : "Pause motion"}
        aria-pressed={paused}
        className={styles.motionToggle}
        onClick={() => setPaused((value) => !value)}
        type="button"
      >
        {paused ? <Play aria-hidden="true" size={15} /> : <Pause aria-hidden="true" size={15} />}
      </button>
      <section aria-labelledby="proof-next-title" className={styles.afterHero}>
        <p className={styles.afterKicker}>YOUR SCHOOL DAY</p>
        <h2 id="proof-next-title">Your Day, Sorted</h2>
        <p>Everything due, one clear place to start.</p>
        <Link href="/" className={styles.afterLink}>
          View the full landing page
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </section>
    </main>
  );
}
