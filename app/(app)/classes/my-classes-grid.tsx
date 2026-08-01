import {
  Atom,
  BookOpen,
  Calculator,
  Landmark,
  Network,
  Play,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { SourceMedia } from "@/components/screen-design/source-media";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";

export type SubjectLibraryCardModel = {
  id: string;
  name: string;
  teacher: string | null;
  href: string;
  progressPct: number;
  openWorkCount: number;
};

type ClassLibrarySharedProps = {
  createForm: ReactNode;
  createOpen: boolean;
  profile?: {
    displayName?: string | null;
    photoUrl?: string | null;
    photoOffsetX?: number | null;
    photoOffsetY?: number | null;
  };
};

const CLASS_LIBRARY_STYLES = `
  .sd-class-library {
    --sd-library-navy: #0f172a;
    --sd-library-pink: #ff79da;
    --sd-library-blue: #74c0ff;
    --sd-library-purple: #a78bfa;
    display: flex;
    height: max(100dvh, 852px);
    max-height: max(100dvh, 852px);
    flex-direction: column;
    overflow: hidden;
    background: var(--sd-library-navy);
    color: #fff;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }

  .sd-class-library-header {
    position: relative;
    z-index: 20;
    display: flex;
    flex: none;
    align-items: center;
    justify-content: space-between;
    padding: 56px 24px 24px;
    border-bottom: 1px solid rgb(255 255 255 / 0.05);
    background: rgb(15 23 42 / 0.82);
    backdrop-filter: blur(12px);
  }

  .sd-class-library-wordmark {
    width: auto;
    height: 22px;
    margin-bottom: 8px;
    object-fit: contain;
    opacity: 0.92;
  }

  .sd-class-library h1,
  .sd-class-library h2,
  .sd-class-library h3,
  .sd-class-library p {
    font-family: inherit;
  }

  .sd-class-library-title {
    margin: 0;
    color: #fff;
    font-size: 30px;
    font-style: italic;
    font-weight: 900;
    letter-spacing: -0.05em;
    line-height: 0.92;
    text-transform: uppercase;
  }

  .sd-class-library-title span {
    display: block;
    color: var(--sd-library-pink);
  }

  .sd-class-library-round-action {
    display: grid;
    width: 40px;
    height: 40px;
    flex: none;
    place-items: center;
    border: 1px solid rgb(255 255 255 / 0.08);
    border-radius: 999px;
    background: rgb(255 255 255 / 0.06);
    color: #fff;
    text-decoration: none;
    transition: transform 150ms ease, border-color 150ms ease;
  }

  .sd-class-library-round-action:active,
  .sd-subject-card:active,
  .sd-library-empty-cta:active,
  .sd-class-add-fab:active {
    transform: scale(0.96);
  }

  .sd-class-library-main {
    position: relative;
    z-index: 10;
    min-height: 0;
    flex: 1;
    overflow-y: auto;
    padding: 24px 24px 132px;
    scrollbar-width: none;
  }

  .sd-class-library-main::-webkit-scrollbar {
    display: none;
  }

  .sd-class-add-panel {
    display: grid;
    gap: 14px;
    margin-bottom: 22px;
    border: 1px solid rgb(116 192 255 / 0.3);
    border-radius: 18px;
    background: rgb(255 255 255 / 0.06);
    padding: 16px;
    backdrop-filter: blur(12px);
  }

  .sd-class-add-panel h2 {
    margin: 0;
    color: var(--sd-library-blue);
    font-size: 13px;
    font-style: italic;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .sd-class-library > .sd-student-desktop-nav,
  .sd-class-library-desktop-header,
  .sd-subject-card-eyebrow,
  .sd-subject-completion,
  .sd-subject-card-actions {
    display: none;
  }

  .sd-subject-card-main {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    gap: 10px;
    color: inherit;
    text-decoration: none;
  }

  .sd-subject-card-summary {
    display: contents;
  }

  .sd-subject-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .sd-subject-card {
    --sd-subject-accent: var(--sd-library-blue);
    position: relative;
    display: flex;
    min-height: 154px;
    flex-direction: column;
    gap: 10px;
    overflow: hidden;
    border: 1px solid rgb(255 255 255 / 0.08);
    border-left: 4px solid var(--sd-subject-accent);
    border-radius: 16px;
    background: rgb(255 255 255 / 0.035);
    padding: 16px 14px;
    color: #fff;
    text-decoration: none;
    backdrop-filter: blur(12px);
    transition: transform 150ms ease, border-color 150ms ease;
  }

  .sd-subject-card[data-tone="pink"] { --sd-subject-accent: var(--sd-library-pink); }
  .sd-subject-card[data-tone="slate"] { --sd-subject-accent: #64748b; }
  .sd-subject-card[data-tone="purple"] { --sd-subject-accent: var(--sd-library-purple); }

  .sd-subject-icon {
    color: var(--sd-subject-accent);
  }

  .sd-subject-card h2 {
    margin: 0;
    color: #fff;
    font-size: 14px;
    font-style: italic;
    font-weight: 900;
    letter-spacing: -0.02em;
    line-height: 1;
    text-transform: uppercase;
  }

  .sd-subject-card-meta {
    display: grid;
    gap: 4px;
    margin-top: auto;
    color: #64748b;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.04em;
    line-height: 1.25;
    text-transform: uppercase;
  }

  .sd-subject-progress {
    height: 3px;
    overflow: hidden;
    border-radius: 999px;
    background: rgb(255 255 255 / 0.08);
  }

  .sd-subject-progress span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--sd-subject-accent);
  }

  .sd-class-add-fab {
    position: absolute;
    z-index: 50;
    right: 24px;
    bottom: 112px;
    display: grid;
    width: 64px;
    height: 64px;
    place-items: center;
    border-radius: 16px;
    background: linear-gradient(135deg, var(--sd-library-blue), var(--sd-library-pink));
    box-shadow: 0 10px 30px rgb(45 212 191 / 0.28);
    color: var(--sd-library-navy);
    text-decoration: none;
    transition: transform 150ms ease;
  }

  .sd-library-empty-main {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .sd-library-empty-mascot-wrap {
    position: relative;
    display: grid;
    width: 224px;
    height: 224px;
    flex: none;
    place-items: center;
    margin-bottom: 18px;
  }

  .sd-library-empty-mascot-wrap::before {
    position: absolute;
    inset: 20px;
    border-radius: 999px;
    background: rgb(116 192 255 / 0.13);
    filter: blur(48px);
    content: "";
  }

  .sd-library-empty-mascot {
    position: relative;
    width: 224px;
    height: 224px;
    object-fit: contain;
  }

  .sd-library-empty-main h2 {
    margin: 0 0 8px;
    font-size: 24px;
    font-style: italic;
    font-weight: 900;
    line-height: 1;
    text-transform: uppercase;
  }

  .sd-library-empty-copy {
    max-width: 280px;
    margin: 0 0 26px;
    color: #94a3b8;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.45;
  }

  .sd-library-tutorial {
    display: flex;
    width: 100%;
    align-items: center;
    gap: 16px;
    border: 1px solid rgb(255 255 255 / 0.1);
    border-left: 4px solid var(--sd-library-blue);
    border-radius: 16px;
    background: rgb(255 255 255 / 0.05);
    padding: 16px;
    text-align: left;
    backdrop-filter: blur(12px);
  }

  .sd-library-tutorial-visual {
    display: grid;
    width: 96px;
    height: 64px;
    flex: none;
    place-items: center;
    border-radius: 9px;
    background: linear-gradient(135deg, rgb(116 192 255 / 0.2), #1e293b);
    color: rgb(255 255 255 / 0.45);
  }

  .sd-library-tutorial strong,
  .sd-library-tutorial span {
    display: block;
  }

  .sd-library-tutorial strong {
    margin-bottom: 4px;
    color: var(--sd-library-blue);
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .sd-library-tutorial span {
    font-size: 12px;
    font-style: italic;
    font-weight: 900;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .sd-library-empty-cta {
    display: flex;
    width: 100%;
    min-height: 58px;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-top: 28px;
    border-radius: 16px;
    background: #fff;
    color: var(--sd-library-navy);
    font-size: 12px;
    font-style: italic;
    font-weight: 900;
    letter-spacing: 0.14em;
    text-decoration: none;
    text-transform: uppercase;
    transition: transform 150ms ease;
  }

  .sd-class-library > .sd-student-bottom-nav {
    position: relative;
    z-index: 60;
    min-height: 94px;
    flex: none;
  }

  .diana-app-shell:has(.sd-class-library) .agent-fab-anchor,
  .app-command-frame:has(.sd-class-library) .diana-mobile-command {
    display: none !important;
  }

  .app-command-frame:has(.sd-class-library) {
    padding: 0 !important;
  }

  .diana-app:has(.sd-class-library) .skip-link {
    transition: none;
  }

  .diana-app:has(.sd-class-library) .skip-link:focus {
    transform: translateY(0) !important;
  }

  .diana-app:has(.sd-class-library) nextjs-portal {
    display: none !important;
  }

  @media (min-width: 1100px) {
    .sd-class-library {
      min-height: 700px;
      height: 100dvh;
      max-height: 100dvh;
      background:
        radial-gradient(circle at 88% 6%, rgb(255 121 218 / 0.11), transparent 30%),
        #0b1428;
      font-family: var(--font-body), "Barlow Semi Condensed", sans-serif;
    }

    .sd-class-library > .sd-student-desktop-nav {
      position: relative;
      display: flex;
      flex: none;
    }

    .sd-class-library > .sd-student-bottom-nav,
    .sd-class-library-header,
    .sd-class-add-fab {
      display: none;
    }

    .sd-class-library-main {
      width: min(100%, 1180px);
      margin: 0 auto;
      padding: 40px 48px 72px;
    }

    .sd-class-library-desktop-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 28px;
    }

    .sd-class-library-term {
      margin: 0 0 10px;
      color: #29d0ff;
      font-family: var(--font-display), "Saira Condensed", sans-serif;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.34em;
      line-height: 1;
      text-transform: uppercase;
    }

    .sd-class-library-desktop-title {
      margin: 0;
      color: #fff;
      font-family: var(--font-display), "Saira Condensed", sans-serif;
      font-size: 56px;
      font-style: italic;
      font-weight: 800;
      letter-spacing: 0;
      line-height: 0.92;
      text-transform: uppercase;
    }

    .sd-class-library-desktop-add {
      display: inline-flex;
      min-height: 40px;
      align-items: center;
      gap: 8px;
      border: 1px solid rgb(41 208 255 / 0.28);
      border-radius: 8px;
      background: rgb(41 208 255 / 0.08);
      padding: 8px 16px;
      color: #29d0ff;
      font-family: var(--font-display), "Saira Condensed", sans-serif;
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0;
      text-decoration: none;
      text-transform: uppercase;
    }

    .sd-subject-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
    }

    .sd-subject-card {
      min-height: 196px;
      gap: 0;
      border: 1px solid #cbd5e1;
      border-left-width: 1px;
      border-radius: 8px;
      background: #f4efe6;
      padding: 22px;
      color: #111827;
      backdrop-filter: none;
      box-shadow: 0 6px 22px rgb(2 6 23 / 0.1);
    }

    .sd-subject-card:first-child {
      border-color: #38bdf8;
    }

    .sd-subject-card-main {
      display: block;
      color: inherit;
      text-decoration: none;
    }

    .sd-subject-icon,
    .sd-subject-card-meta,
    .sd-subject-progress {
      display: none;
    }

    .sd-subject-card-eyebrow {
      display: flex;
      min-height: 16px;
      align-items: center;
      margin-bottom: 14px;
      color: #475569;
      font-family: var(--font-display), "Saira Condensed", sans-serif;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    .sd-subject-card-summary {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
    }

    .sd-subject-card h2 {
      color: #111827;
      font-family: var(--font-display), "Saira Condensed", sans-serif;
      font-size: 38px;
      font-style: normal;
      font-weight: 800;
      letter-spacing: 0;
      line-height: 0.92;
    }

    .sd-subject-completion {
      display: block;
      flex: none;
      color: #0f172a;
      text-align: right;
    }

    .sd-subject-completion strong,
    .sd-subject-completion span {
      display: block;
    }

    .sd-class-library .sd-subject-completion strong {
      color: #0f172a;
      font-family: var(--font-display), "Saira Condensed", sans-serif;
      font-size: 25px;
      font-weight: 800;
      line-height: 0.9;
    }

    .sd-subject-completion span {
      margin-top: 4px;
      color: #475569;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .sd-subject-card-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: auto;
      border-top: 1px solid #d9dee7;
      padding-top: 16px;
    }

    .sd-subject-card-actions a {
      display: inline-flex;
      min-height: 38px;
      align-items: center;
      justify-content: center;
      border: 1px solid #94a3b8;
      border-radius: 6px;
      background: #fff;
      color: #0f172a;
      font-family: var(--font-display), "Saira Condensed", sans-serif;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0;
      text-decoration: none;
      text-transform: uppercase;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sd-class-library-round-action,
    .sd-subject-card,
    .sd-library-empty-cta,
    .sd-class-add-fab {
      transition: none;
    }
  }
`;

function DesktopClassHeader() {
  return (
    <header className="sd-class-library-desktop-header">
      <div>
        <p className="sd-class-library-term">Current term</p>
        <h1 className="sd-class-library-desktop-title">Classes</h1>
      </div>
      <Link href="/classes?create=1" className="sd-class-library-desktop-add">
        <Plus size={14} strokeWidth={2.6} aria-hidden="true" />
        Add class
      </Link>
    </header>
  );
}

function CreateClassPanel({ createForm }: { createForm: ReactNode }) {
  return (
    <section className="sd-class-add-panel" aria-label="Add class form">
      <h2>Draft a subject</h2>
      {createForm}
    </section>
  );
}

function SubjectIcon({ name }: { name: string }) {
  const lower = name.toLowerCase();
  if (lower.includes("physics") || lower.includes("science") || lower.includes("biology")) {
    return <Atom size={24} aria-hidden="true" />;
  }
  if (lower.includes("calc") || lower.includes("math") || lower.includes("algebra")) {
    return <Calculator size={24} aria-hidden="true" />;
  }
  if (lower.includes("econ") || lower.includes("history") || lower.includes("government")) {
    return <Landmark size={24} aria-hidden="true" />;
  }
  if (lower.includes("computer") || lower.includes("coding")) {
    return <Network size={24} aria-hidden="true" />;
  }
  return <BookOpen size={24} aria-hidden="true" />;
}

function subjectTone(index: number): "blue" | "pink" | "slate" | "purple" {
  return (["blue", "pink", "slate", "purple"] as const)[index % 4] ?? "blue";
}

export function EmptyClassLibrary({ createForm, createOpen, profile }: ClassLibrarySharedProps) {
  return (
    <ScreenDesignViewport className="sd-class-library" aria-label="Academic roster">
      <style>{CLASS_LIBRARY_STYLES}</style>
      <StudentDesktopNav
        active="Classes"
        displayName={profile?.displayName}
        photoUrl={profile?.photoUrl}
        photoOffsetX={profile?.photoOffsetX}
        photoOffsetY={profile?.photoOffsetY}
      />
      <header className="sd-class-library-header">
        <div>
          <DianaWordmark className="sd-class-library-wordmark" />
          <h1 className="sd-class-library-title">
            Academic
            <span>Roster</span>
          </h1>
        </div>
        <Link
          href="/classes?create=1"
          className="sd-class-library-round-action"
          aria-label="Add a class"
        >
          <Plus size={20} aria-hidden="true" />
        </Link>
      </header>

      <main className="sd-class-library-main sd-library-empty-main">
        {createOpen && <CreateClassPanel createForm={createForm} />}
        <div className="sd-library-empty-mascot-wrap">
          <SourceMedia
            assetId="diana-mascot"
            width={1024}
            height={1024}
            alt="Diana assistant"
            className="sd-library-empty-mascot"
            sizes="224px"
          />
        </div>
        <h2>Empty playbook?</h2>
        <p className="sd-library-empty-copy">
          You have not drafted a subject yet. Start a class so Diana can keep
          its work, notes, and course rules together.
        </p>
        <div className="sd-library-tutorial" aria-label="Class roster tutorial">
          <div className="sd-library-tutorial-visual">
            <Play size={25} aria-hidden="true" />
          </div>
          <div>
            <strong>Tutorial</strong>
            <span>How to use the Diana study roster</span>
          </div>
        </div>
        <Link
          href="/classes?create=1"
          className="sd-library-empty-cta"
          aria-label="Add a class"
        >
          <Plus size={20} aria-hidden="true" />
          Pick your first subject
        </Link>
      </main>

      <StudentBottomNav />
    </ScreenDesignViewport>
  );
}

export function MyClassesGrid({
  cards,
  createForm,
  createOpen,
  profile,
}: ClassLibrarySharedProps & { cards: SubjectLibraryCardModel[] }) {
  return (
    <ScreenDesignViewport className="sd-class-library" aria-label="Subject library">
      <style>{CLASS_LIBRARY_STYLES}</style>
      <StudentDesktopNav
        active="Classes"
        displayName={profile?.displayName}
        photoUrl={profile?.photoUrl}
        photoOffsetX={profile?.photoOffsetX}
        photoOffsetY={profile?.photoOffsetY}
      />
      <header className="sd-class-library-header">
        <div>
          <DianaWordmark className="sd-class-library-wordmark" />
          <h1 className="sd-class-library-title">
            Your
            <span>Classes</span>
          </h1>
        </div>
        <Link
          href="/search"
          className="sd-class-library-round-action"
          aria-label="Search classes"
        >
          <Search size={20} aria-hidden="true" />
        </Link>
      </header>

      <main className="sd-class-library-main">
        <DesktopClassHeader />
        {createOpen && <CreateClassPanel createForm={createForm} />}
        <div className="sd-subject-grid">
          {cards.map((card, index) => (
            <article
              key={card.id}
              className="sd-subject-card"
              data-tone={subjectTone(index)}
            >
              <Link
                href={card.href}
                className="sd-subject-card-main"
                aria-label={`Open ${card.name} class`}
              >
                <span className="sd-subject-icon">
                  <SubjectIcon name={card.name} />
                </span>
                <div className="sd-subject-card-eyebrow">
                  {card.teacher || "Teacher not added"}
                </div>
                <div className="sd-subject-card-summary">
                  <h2>{card.name}</h2>
                  <div className="sd-subject-completion" aria-label={`${card.progressPct}% complete`}>
                    <strong>{card.progressPct}%</strong>
                    <span>complete</span>
                  </div>
                </div>
                <div className="sd-subject-card-meta">
                  <span>{card.progressPct}% complete</span>
                  <span>
                    {card.openWorkCount} open {card.openWorkCount === 1 ? "move" : "moves"}
                  </span>
                </div>
                <span className="sd-subject-progress" aria-hidden="true">
                  <span style={{ width: `${card.progressPct}%` }} />
                </span>
              </Link>
              <div className="sd-subject-card-actions">
                <Link href="/notes" aria-label={`Open ${card.name} notes`}>
                  Notes
                </Link>
                <Link href={card.href} aria-label={`Open ${card.name} class`}>
                  Open class
                </Link>
              </div>
            </article>
          ))}
        </div>
      </main>

      <Link
        href="/classes?create=1"
        className="sd-class-add-fab"
        aria-label="Add a class"
      >
        <Plus size={30} aria-hidden="true" />
      </Link>
      <StudentBottomNav />
    </ScreenDesignViewport>
  );
}
