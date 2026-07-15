"use client";

import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  LockKeyhole,
  School,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import { layout, prepare, type PreparedText } from "@chenglou/pretext";

const focusNotes = [
  { className: "qc-note-one", subject: "English", detail: "Essay due Friday" },
  { className: "qc-note-two", subject: "Biology", detail: "Read pages 84-96" },
  { className: "qc-note-three", subject: "History", detail: "Outline + three sources" },
  { className: "qc-note-four", subject: "Right now", detail: "Where do I start?" },
];

type PreparedEntry = {
  element: HTMLElement;
  prepared: PreparedText;
  lineHeight: number;
};

function usePretextLayout(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;

    let cancelled = false;
    let frame = 0;
    let entries: PreparedEntry[] = [];

    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        for (const entry of entries) {
          const width = Math.max(1, entry.element.clientWidth);
          const result = layout(entry.prepared, width, entry.lineHeight);
          entry.element.style.setProperty("--pretext-height", `${Math.ceil(result.height)}px`);
          entry.element.dataset.pretextLines = String(result.lineCount);
        }
      });
    };

    const setup = async () => {
      await document.fonts.ready;
      if (cancelled) return;

      entries = Array.from(root.querySelectorAll<HTMLElement>("[data-pretext]")).map((element) => {
        const styles = getComputedStyle(element);
        const lineHeight = Number.parseFloat(styles.lineHeight) || Number.parseFloat(styles.fontSize) * 1.2;
        const letterSpacing = Number.parseFloat(styles.letterSpacing);
        const font = `${styles.fontStyle} ${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;

        return {
          element,
          prepared: prepare(element.textContent ?? "", font, {
            letterSpacing: Number.isFinite(letterSpacing) ? letterSpacing : 0,
          }),
          lineHeight,
        };
      });

      measure();
    };

    const observer = new ResizeObserver(measure);
    observer.observe(root);
    void setup();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [rootRef]);
}

export function QuietCommandLanding() {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointerFrame = useRef(0);

  usePretextLayout(rootRef);

  useEffect(() => () => cancelAnimationFrame(pointerFrame.current), []);

  const moveStage = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const stage = stageRef.current;
    if (!stage) return;

    const bounds = stage.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;

    cancelAnimationFrame(pointerFrame.current);
    pointerFrame.current = requestAnimationFrame(() => {
      stage.style.setProperty("--tilt-x", `${(-y * 5).toFixed(2)}deg`);
      stage.style.setProperty("--tilt-y", `${(x * 7).toFixed(2)}deg`);
      stage.style.setProperty("--shift-x", `${(x * 12).toFixed(2)}px`);
      stage.style.setProperty("--shift-y", `${(y * 10).toFixed(2)}px`);
    });
  };

  const resetStage = () => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.style.setProperty("--tilt-x", "0deg");
    stage.style.setProperty("--tilt-y", "0deg");
    stage.style.setProperty("--shift-x", "0px");
    stage.style.setProperty("--shift-y", "0px");
  };

  return (
    <main ref={rootRef} id="main-content" className="qc-page">
      <header className="qc-nav-wrap">
        <nav className="qc-nav" aria-label="Primary navigation">
          <Link href="/" className="qc-brand" aria-label="Diana home">
            <span className="qc-brand-mark" aria-hidden="true">
              D
            </span>
            <span>Diana</span>
          </Link>

          <div className="qc-nav-links">
            <Link href="#product">How it works</Link>
            <Link href="/teacher-share">For schools</Link>
            <Link href="/login">Sign in</Link>
          </div>

          <Link href="/signup" className="qc-nav-cta">
            Start free
            <ArrowRight aria-hidden="true" size={15} strokeWidth={1.8} />
          </Link>
        </nav>
      </header>

      <section className="qc-hero" aria-labelledby="qc-hero-title">
        <div className="qc-hero-atmosphere" aria-hidden="true">
          <span className="qc-hero-halo qc-hero-halo-cyan" />
          <span className="qc-hero-halo qc-hero-halo-gold" />
          <span className="qc-hero-grain" />
        </div>

        <div className="qc-hero-copy">
          <p className="qc-overline">
            <span>Quiet Command</span>
            <span aria-hidden="true" />
            Private focus for the next move
          </p>

          <h1 id="qc-hero-title" className="qc-hero-title">
            <span>The next</span>
            <span className="qc-title-signal">
              five minutes,
            </span>
            <span>made obvious.</span>
          </h1>

          <p className="qc-hero-summary">
            Diana turns the pile into one private, doable move without taking over the work.
          </p>

          <div className="qc-hero-actions" aria-label="Get started with Diana">
            <Link href="/signup" className="qc-button qc-button-primary">
              Start free
              <ArrowRight aria-hidden="true" size={18} strokeWidth={1.7} />
            </Link>
            <Link href="/teacher-share" className="qc-button qc-button-secondary">
              For schools: book a demo
            </Link>
          </div>

          <div className="qc-proof-line" aria-label="Diana product principles">
            <span>
              <LockKeyhole aria-hidden="true" size={14} />
              Private by default
            </span>
            <span>
              <BookOpen aria-hidden="true" size={14} />
              Sources stay visible
            </span>
            <span>
              <ShieldCheck aria-hidden="true" size={14} />
              Student-owned
            </span>
          </div>
        </div>

        <div
          ref={stageRef}
          className="qc-focus-stage"
          onPointerMove={moveStage}
          onPointerLeave={resetStage}
          aria-label="A motion sequence showing scattered schoolwork resolving into one next action"
        >
          <div className="qc-stage-label" aria-hidden="true">
            <span>Noise</span>
            <i />
            <span>Next move</span>
          </div>

          <svg className="qc-signal-line" viewBox="0 0 800 720" fill="none" aria-hidden="true">
            <path
              d="M36 206C179 107 237 342 347 269C444 205 371 102 482 105C601 109 596 327 759 240"
              pathLength="1"
            />
            <path
              className="qc-signal-line-focus"
              d="M38 500C189 506 243 431 331 462C424 495 442 601 523 540C603 479 659 485 760 489"
              pathLength="1"
            />
          </svg>

          <div className="qc-note-field" aria-hidden="true">
            {focusNotes.map((note) => (
              <div key={note.className} className={`qc-noise-note ${note.className}`}>
                <span>{note.subject}</span>
                <strong>{note.detail}</strong>
              </div>
            ))}
          </div>

          <div className="qc-focus-object">
            <span className="qc-focus-orbit qc-focus-orbit-one" aria-hidden="true" />
            <span className="qc-focus-orbit qc-focus-orbit-two" aria-hidden="true" />
            <span className="qc-focus-shadow" aria-hidden="true" />
            <span className="qc-paper-layer qc-paper-layer-back" aria-hidden="true" />
            <span className="qc-paper-layer qc-paper-layer-mid" aria-hidden="true" />

            <article className="qc-action-sheet">
              <div className="qc-action-sheet-topline">
                <span>
                  <TimerReset aria-hidden="true" size={15} />
                  Next 5 minutes
                </span>
                <strong>05:00</strong>
              </div>

              <div className="qc-action-index" aria-hidden="true">
                01
              </div>

              <p className="qc-action-kicker">Your clearest move</p>
              <h2 data-pretext>Open your history outline.</h2>
              <p className="qc-action-copy" data-pretext>
                Write one sentence that answers: what changed after the New Deal?
              </p>

              <div className="qc-start-line">
                <span>Start here</span>
                <strong>One claim sentence</strong>
                <Check aria-hidden="true" size={16} />
              </div>

              <footer className="qc-action-source">
                <BookOpen aria-hidden="true" size={15} />
                <span>Source open: Chapter 12 notes</span>
              </footer>
            </article>
          </div>

          <p className="qc-stage-caption" aria-hidden="true">
            Diana finds the smallest useful beginning.
          </p>
        </div>

        <a className="qc-scroll-cue" href="#product" aria-label="See how Diana works">
          <span>See the shift</span>
          <i aria-hidden="true" />
        </a>
      </section>

      <section id="product" className="qc-product" aria-labelledby="qc-product-title">
        <div className="qc-product-intro">
          <p className="qc-product-overline">Inside Diana / one task at a time</p>
          <h2 id="qc-product-title" data-pretext>
            One useful move, with the source still open.
          </h2>
          <p data-pretext>
            The signal becomes the workspace. Diana keeps the assignment, the evidence, and the student's own words in the same calm view.
          </p>
        </div>

        <div className="qc-workspace" aria-label="Preview of the Diana student workspace">
          <header className="qc-workspace-header">
            <div>
              <span className="qc-workspace-mark">D</span>
              <strong>Diana</strong>
            </div>
            <p>History / New Deal reflection</p>
            <span className="qc-workspace-private">
              <LockKeyhole aria-hidden="true" size={13} />
              Private workspace
            </span>
          </header>

          <div className="qc-workspace-body">
            <div className="qc-source-panel" role="group" aria-label="Open assignment sources">
              <div className="qc-panel-label">
                <span>Sources</span>
                <strong>2 open</strong>
              </div>

              <article className="qc-source-active">
                <span>01</span>
                <div>
                  <strong>Chapter 12 notes</strong>
                  <p>Recovery programs, labor, public works</p>
                </div>
              </article>

              <article>
                <span>02</span>
                <div>
                  <strong>Assignment prompt</strong>
                  <p>Explain one lasting change</p>
                </div>
              </article>

              <div className="qc-source-policy">
                <ShieldCheck aria-hidden="true" size={17} />
                <p>
                  <strong>Your ideas stay yours.</strong>
                  Diana helps with the next move, not the final answer.
                </p>
              </div>
            </div>

            <article className="qc-writing-panel">
              <div className="qc-writing-meta">
                <span>Next five minutes</span>
                <strong>One claim sentence</strong>
              </div>

              <h3>What changed after the New Deal?</h3>
              <p className="qc-writing-prompt">
                Start with one change you can point to in your notes. It does not need to be polished yet.
              </p>

              <div className="qc-draft-line" aria-label="Student draft beginning">
                <span className="qc-cursor" aria-hidden="true" />
                <p>The New Deal changed</p>
              </div>

              <div className="qc-writing-footer">
                <span>
                  <BookOpen aria-hidden="true" size={15} />
                  Source linked
                </span>
                <span>
                  <Check aria-hidden="true" size={15} />
                  Authorship visible
                </span>
              </div>
            </article>
          </div>
        </div>

        <div className="qc-product-close">
          <div>
            <p>Less deciding. More beginning.</p>
            <span>Free for students. Built to make the first move feel possible.</span>
          </div>
          <div>
            <Link href="/signup" className="qc-button qc-button-ink">
              Start free
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
            <Link href="/teacher-share" className="qc-school-link">
              <School aria-hidden="true" size={17} />
              Schools: book a demo
            </Link>
          </div>
        </div>
      </section>

      <footer className="qc-footer">
        <Link href="/" className="qc-brand" aria-label="Diana home">
          <span className="qc-brand-mark" aria-hidden="true">
            D
          </span>
          <span>Diana</span>
        </Link>
        <p>Private, student-owned support for the next move.</p>
        <Link href="/signup">
          Start free <ArrowRight aria-hidden="true" size={15} />
        </Link>
      </footer>
    </main>
  );
}
