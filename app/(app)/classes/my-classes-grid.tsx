import { ArrowUpRight, BookOpen, Plus } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";

export type SubjectLibraryCardModel = {
  id: string;
  name: string;
  teacher: string | null;
  href: string;
  progressPct: number;
  openWorkCount: number;
  nextAssignmentTitle: string | null;
  gradeLabel?: string | null;
  gradePercent?: number | null;
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

export const CLASS_LIBRARY_STYLES = `
  :root:has(.sd-class-library), body:has(.sd-class-library), .diana-app:has(.sd-class-library), .diana-app-shell:has(.sd-class-library), .diana-authenticated-field:has(.sd-class-library), .app-command-frame:has(.sd-class-library) { background:linear-gradient(rgb(12 17 24 / .1),rgb(12 17 24 / .2)),#141922 url("/images/classes-gamer-classroom.png") center / cover fixed no-repeat!important; }
  .diana-app-shell:has(.sd-class-library) .agent-fab-anchor, .app-command-frame:has(.sd-class-library) .diana-mobile-command { display:none!important; }
  .app-command-frame:has(.sd-class-library) { width:100%!important; max-width:none!important; padding:0!important; }
  .sd-class-library { --classes-ink:#182126; --classes-muted:#53615c; --classes-line:rgb(24 33 38 / .26); --classes-yellow:#e8f56b; min-height:100dvh; background:linear-gradient(rgb(12 17 24 / .1),rgb(12 17 24 / .2)),#141922 url("/images/classes-gamer-classroom.png") center / cover fixed no-repeat; color:var(--classes-ink); font-family:var(--font-lexend),Lexend,system-ui,sans-serif; }
  .sd-class-library *, .sd-class-library *::before, .sd-class-library *::after { box-sizing:border-box; }
  .sd-class-library a:focus-visible, .sd-class-library button:focus-visible, .sd-class-library summary:focus-visible { outline:3px solid #fff; outline-offset:3px; }
  .sd-class-library-mobile-header { display:none; }
  .sd-class-library-main { position:relative; width:calc(100% - (2 * clamp(12px,1.6vw,28px))); max-width:1800px; min-height:calc(100dvh - 118px); margin:22px auto 24px; overflow:visible; border:7px solid #fff; border-radius:30px; clip-path:polygon(0 0,calc(50% - 131px) 0,calc(50% - 61px) 49px,calc(50% + 61px) 49px,calc(50% + 131px) 0,100% 0,100% calc(100% - 0px),calc(50% + 131px) calc(100% - 0px),calc(50% + 61px) calc(100% - 49px),calc(50% - 61px) calc(100% - 49px),calc(50% - 131px) 100%,0 100%); background:rgb(220 224 222 / .42); box-shadow:0 22px 56px rgb(50 61 66 / .2),inset 0 1px 0 rgb(255 255 255 / .5); backdrop-filter:blur(24px) saturate(.82); -webkit-backdrop-filter:blur(24px) saturate(.82); padding:clamp(26px,3.2vw,48px) clamp(20px,3.2vw,54px) clamp(42px,5vw,78px); }
  .sd-class-library-notch { position:absolute; z-index:4; left:50%; width:262px; height:56px; transform:translateX(-50%); background:transparent; pointer-events:none; }
  .sd-class-library-notch::after { position:absolute; inset:0; background:center/100% 100% no-repeat; content:""; }
  .sd-class-library-notch--top { top:-7px; }
  .sd-class-library-notch--top::after { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 262 56'%3E%3Cpath d='M0 4 L70 49 H192 L262 4' fill='none' stroke='%23ffffff' stroke-width='7' stroke-linejoin='round'/%3E%3C/svg%3E"); }
  .sd-class-library-notch--bottom { bottom:-7px; }
  .sd-class-library-notch--bottom::after { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 262 56'%3E%3Cpath d='M0 52 L70 7 H192 L262 52' fill='none' stroke='%23ffffff' stroke-width='7' stroke-linejoin='round'/%3E%3C/svg%3E"); }
  .sd-class-library-content { position:relative; z-index:4; display:grid; gap:clamp(18px,2vw,28px); }
  .sd-class-library-heading { display:flex; min-height:48px; align-items:center; justify-content:space-between; gap:18px; }
  .sd-class-library-heading h1, .sd-class-library-heading p, .sd-course-card h2, .sd-course-card p, .sd-course-featured h2, .sd-course-featured p { margin:0; }
  .sd-class-library-heading h1 { color:#f8faf7; font:640 clamp(23px,2.1vw,30px)/1.1 var(--font-lexend),Lexend,sans-serif; letter-spacing:0; text-shadow:0 2px 18px rgb(9 17 19 / .62); }
  .sd-class-library-heading p { margin-top:5px; color:var(--classes-muted); font-size:14px; line-height:1.45; }
  .sd-class-add-action { display:inline-flex; min-height:44px; flex:none; align-items:center; gap:8px; border:1px solid #c6d23f; border-radius:8px; background:var(--classes-yellow); padding:0 13px; color:#141d20; font:500 14px/1 var(--font-lexend),Lexend,sans-serif; text-decoration:none; transition:transform 180ms cubic-bezier(.32,.72,0,1),background 180ms cubic-bezier(.32,.72,0,1); }
  .sd-class-add-action:hover { background:#f0fb86; transform:translateY(-1px); }
  .sd-class-add-panel { display:grid; gap:14px; border:1px solid var(--classes-line); border-radius:12px; background:rgb(248 250 247 / .54); padding:20px; backdrop-filter:blur(24px) saturate(1.05); -webkit-backdrop-filter:blur(24px) saturate(1.05); }
  .sd-class-add-panel h2 { margin:0; color:var(--classes-ink); font-size:18px; font-weight:600; }
  .sd-course-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:clamp(14px,1.6vw,20px); }
  .sd-course-card { position:relative; display:flex; min-height:188px; flex-direction:column; overflow:hidden; border:1.5px solid color-mix(in srgb,var(--course-accent,#53615c) 44%,rgb(255 255 255 / .78)); border-radius:12px 20px 12px 20px; background:linear-gradient(135deg,color-mix(in srgb,var(--course-accent,#53615c) 7%,rgb(248 250 247 / .6)),rgb(238 244 238 / .4)); box-shadow:inset 0 1px 0 rgb(255 255 255 / .66),inset 0 0 0 1px color-mix(in srgb,var(--course-accent,#53615c) 10%,transparent),0 12px 30px rgb(24 33 38 / .09); color:var(--classes-ink); text-decoration:none; backdrop-filter:blur(22px) saturate(1.04); -webkit-backdrop-filter:blur(22px) saturate(1.04); transition:transform 180ms cubic-bezier(.32,.72,0,1),background 180ms cubic-bezier(.32,.72,0,1),border-color 180ms cubic-bezier(.32,.72,0,1),box-shadow 180ms cubic-bezier(.32,.72,0,1); }
  .sd-course-card:hover { border-color:color-mix(in srgb,var(--course-accent,#53615c) 72%,rgb(255 255 255 / .9)); background:linear-gradient(135deg,color-mix(in srgb,var(--course-accent,#53615c) 11%,rgb(253 254 252 / .68)),rgb(238 244 238 / .5)); box-shadow:inset 0 1px 0 rgb(255 255 255 / .8),inset 0 0 0 1px color-mix(in srgb,var(--course-accent,#53615c) 18%,transparent),0 16px 34px rgb(24 33 38 / .12); transform:translateY(-3px); }
  .sd-course-card-content { display:flex; min-width:0; min-height:100%; flex-direction:column; padding:23px 23px 20px; }
  .sd-course-card-top { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
  .sd-course-card-teacher { color:#394742; font-size:13px; line-height:1.4; }
  .sd-course-grade { display:grid; min-width:42px; flex:none; gap:1px; text-align:right; }
  .sd-course-grade strong { color:var(--classes-ink); font-size:19px; font-weight:650; line-height:1.05; }
  .sd-course-grade span { color:var(--classes-muted); font-size:11px; line-height:1.2; }
  .sd-course-card h2 { max-width:18ch; margin:17px 0 0; color:var(--classes-ink); font:630 clamp(20px,1.75vw,26px)/1.14 var(--font-lexend),Lexend,sans-serif; letter-spacing:0; }
  .sd-class-library .sd-course-status { min-height:21px; margin-top:10px!important; overflow:hidden; color:#394742!important; font-size:14px; line-height:1.45; text-overflow:ellipsis; white-space:nowrap; }
  .sd-course-open { display:inline-flex; align-items:center; gap:7px; margin-top:auto; color:var(--classes-ink); font-size:14px; font-weight:540; line-height:1; }
  .sd-course-open svg { transition:transform 180ms cubic-bezier(.32,.72,0,1); }
  .sd-course-card:hover .sd-course-open svg { transform:translate(2px,-2px); }
  .sd-class-library-empty { display:grid; min-height:min(62dvh,560px); place-items:center; text-align:center; }
  .sd-class-library-empty-inner { width:min(100%,470px); border:1px solid rgb(255 255 255 / .7); border-radius:18px 28px 18px 28px; background:rgb(248 250 247 / .37); padding:42px 30px; box-shadow:inset 0 1px 0 rgb(255 255 255 / .62),0 20px 44px rgb(24 33 38 / .1); backdrop-filter:blur(26px) saturate(1.05); -webkit-backdrop-filter:blur(26px) saturate(1.05); }
  .sd-class-library-empty-icon { display:grid; width:58px; height:58px; place-items:center; margin:0 auto 18px; border:1px solid var(--classes-line); border-radius:16px; background:rgb(255 255 255 / .3); }
  .sd-class-library-empty h2 { margin:0; font-size:24px; font-weight:630; }
  .sd-class-library-empty p { max-width:34ch; margin:10px auto 22px; color:var(--classes-muted); font-size:15px; line-height:1.55; }
  .sd-class-library-empty-action { display:inline-flex; min-height:46px; align-items:center; gap:8px; border:1px solid #c6d23f; border-radius:8px; background:var(--classes-yellow); padding:0 16px; color:#141d20; font-size:15px; font-weight:540; text-decoration:none; }
  @media (min-width:901px) {
    .sd-class-library > .sd-student-desktop-nav { position:sticky; z-index:90; top:0; display:block!important; height:72px; border-bottom:0!important; background:#d6dad6; }
    .sd-class-library > .sd-student-desktop-nav .sd-student-desktop-nav-inner { display:flex; width:100%; height:72px; align-items:center; gap:46px; margin-inline:0; padding-inline:clamp(12px,1.6vw,28px); }
    .sd-class-library > .sd-student-desktop-nav .sd-student-desktop-tools, .sd-class-library > .sd-student-desktop-nav .sd-student-desktop-actions, .sd-class-library > .sd-student-desktop-nav .sd-student-desktop-destinations { display:flex; align-items:center; }
    .sd-class-library > .sd-student-desktop-nav .sd-student-desktop-brand { display:flex; min-width:120px; height:44px; align-items:center; color:var(--classes-ink); text-decoration:none; }
    .sd-class-library > .sd-student-desktop-nav .sd-student-desktop-brand .sd-source-wordmark { width:auto; height:36px; }
    .sd-class-library > .sd-student-desktop-nav .sd-student-desktop-destinations { align-self:stretch; gap:28px; }
    .sd-class-library > .sd-student-desktop-nav .sd-student-desktop-destinations > a { position:relative; display:flex; align-items:center; color:#53615c; font:600 13px/24px var(--font-lexend),Lexend,sans-serif; letter-spacing:0; text-decoration:none; text-transform:none; }
    .sd-class-library > .sd-student-desktop-nav .sd-student-desktop-destinations > a[aria-current="page"] { color:#182126!important; }
    .sd-class-library > .sd-student-desktop-nav .sd-student-desktop-destinations > a[aria-current="page"]::after { position:absolute; right:0; bottom:0; left:0; height:3px; background:#182126!important; content:""; }
    .sd-class-library > .sd-student-desktop-nav .sd-student-desktop-actions { gap:8px; margin-left:auto; }
    .sd-class-library > .sd-student-desktop-nav .sd-student-desktop-settings, .sd-class-library > .sd-student-desktop-nav .sd-student-desktop-avatar { display:grid; width:44px; height:44px; flex:none; place-items:center; border:1px solid var(--classes-line); background:rgb(255 255 255 / .44); color:var(--classes-ink); text-decoration:none; }
    .sd-class-library > .sd-student-desktop-nav .sd-student-desktop-settings { border-radius:8px; }
    .sd-class-library > .sd-student-desktop-nav .sd-student-desktop-avatar { overflow:hidden; border-radius:999px; background:linear-gradient(135deg,#e8eee8,#aebcb5); }
    .sd-class-library > .sd-student-desktop-nav .sd-student-desktop-avatar img { width:100%; height:100%; object-fit:cover; }
    .sd-class-library > .sd-student-desktop-nav .sd-student-desktop-add-menu { position:relative; }
    .sd-class-library > .sd-student-desktop-nav .sd-student-desktop-add-menu > summary { display:flex; min-width:74px; min-height:44px; align-items:center; gap:7px; border:1px solid #c6d23f!important; border-radius:8px; background:#e8f56b!important; padding-inline:13px; color:#141d20!important; font:700 13px/24px var(--font-lexend),Lexend,sans-serif; letter-spacing:0; list-style:none; cursor:pointer; box-shadow:none!important; }
    .sd-class-library > .sd-student-desktop-nav .sd-student-desktop-add-menu > summary > span, .sd-class-library > .sd-student-desktop-nav .sd-student-desktop-add-menu > summary > svg { color:#141d20!important; }
    .sd-class-library > .sd-student-desktop-nav .sd-student-desktop-add-menu > summary::-webkit-details-marker { display:none; }
    .sd-class-library > .sd-student-bottom-nav { display:none!important; }
  }
  @media (max-width:1180px) and (min-width:768px) {
    .sd-class-library > .sd-student-desktop-nav .sd-student-desktop-nav-inner { gap:24px; }
    .sd-class-library > .sd-student-desktop-nav .sd-student-desktop-brand { min-width:120px; }
    .sd-class-library > .sd-student-desktop-nav .sd-student-desktop-destinations { gap:16px; }
    .sd-class-library > .sd-student-desktop-nav .sd-student-desktop-add-menu > summary { width:44px; min-width:44px; justify-content:center; padding:0; }
    .sd-class-library > .sd-student-desktop-nav .sd-student-desktop-add-menu > summary span { display:none; }
  }
  @media (max-width:1200px) { .sd-course-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
  @media (max-width:900px) {
    .sd-class-library > .sd-student-desktop-nav { display:none!important; }
    .sd-class-library-mobile-header { display:flex; min-height:64px; align-items:center; justify-content:space-between; padding:10px 16px; }
    .sd-class-library-mobile-header .sd-source-wordmark { width:auto; height:32px; }
    .sd-class-library-mobile-add { display:grid; width:44px; height:44px; place-items:center; border:1px solid var(--classes-line); border-radius:9px; background:rgb(255 255 255 / .44); color:var(--classes-ink); text-decoration:none; }
    .sd-class-library-main { width:min(100% - 24px,680px); min-height:calc(100dvh - 152px); margin:6px auto calc(98px + env(safe-area-inset-bottom)); border-width:5px; border-radius:20px; padding:28px 18px 36px; }
    .sd-class-library-heading .sd-class-add-action { display:none; }
    .sd-class-library-notch { display:none; }
    .sd-class-library-heading { align-items:flex-start; }
    .sd-class-library-heading h1 { font-size:25px; }
    .sd-class-library > .sd-student-bottom-nav { position:fixed!important; z-index:75; right:12px!important; bottom:calc(8px + env(safe-area-inset-bottom))!important; left:12px!important; display:grid!important; width:auto!important; min-height:68px; grid-template-columns:repeat(5,minmax(0,1fr)); border:1px solid rgb(84 98 92 / .3); border-radius:18px; background:rgb(231 236 231 / .9); padding:5px 6px; box-shadow:0 18px 44px rgb(24 33 38 / .16); backdrop-filter:blur(24px); }
    .sd-class-library > .sd-student-bottom-nav a { display:flex; min-width:0; min-height:54px; flex-direction:column; align-items:center; justify-content:center; gap:3px; border-radius:11px; color:var(--classes-muted); font-size:11px; text-decoration:none; }
    .sd-class-library > .sd-student-bottom-nav a[aria-current="page"] { background:rgb(255 255 255 / .62); color:var(--classes-ink); }
  }
  @media (max-width:620px) { .sd-class-library-heading p { display:none; } .sd-class-add-action span { display:none; } .sd-class-add-action { width:44px; justify-content:center; padding:0; } .sd-course-grid { grid-template-columns:1fr; } .sd-course-card { min-height:174px; } }
  @media (prefers-reduced-motion:reduce) { .sd-class-library *, .sd-class-library *::before, .sd-class-library *::after { transition:none!important; } }
`;

function ClassMobileHeader() {
  return <header className="sd-class-library-mobile-header"><Link href="/dashboard" aria-label="Diana home"><DianaWordmark tight tone="dark" /></Link><Link href="/classes?create=1" className="sd-class-library-mobile-add" aria-label="Add a class"><Plus size={20} aria-hidden="true" /></Link></header>;
}

function CreateClassPanel({ createForm }: { createForm: ReactNode }) {
  return <section className="sd-class-add-panel" aria-label="Add a class"><h2>Add a class</h2>{createForm}</section>;
}

function subjectAccent(name: string) {
  const subject = name.toLowerCase();
  if (/math|algebra|geometry|calculus|statistics|trig/u.test(subject)) return "#2e5b85";
  if (/english|writing|literature|language|essay|grammar/u.test(subject)) return "#9a6074";
  if (/science|biology|chemistry|physics|earth/u.test(subject)) return "#5d7d70";
  if (/history|government|economics|geography|social/u.test(subject)) return "#9a7654";
  if (/art|music|theater|theatre|dance|creative/u.test(subject)) return "#876993";
  if (/health|physical|fitness|pe\b/u.test(subject)) return "#738c62";
  if (/spanish|french|german|latin|chinese|japanese|korean/u.test(subject)) return "#6a7898";
  return "#687a75";
}

function courseStatus(card: SubjectLibraryCardModel) {
  if (card.nextAssignmentTitle) return card.nextAssignmentTitle;
  if (card.openWorkCount > 0) return `${card.openWorkCount} ${card.openWorkCount === 1 ? "assignment" : "assignments"} ready`;
  return "No work due";
}

function CourseCard({ card }: { card: SubjectLibraryCardModel }) {
  return <Link href={card.href} className="sd-course-card" style={{ "--course-accent": subjectAccent(card.name) } as CSSProperties} aria-label={`Open ${card.name} class`}><div className="sd-course-card-content"><div className="sd-course-card-top"><span className="sd-course-card-teacher">{card.teacher || "Teacher not added"}</span>{card.gradeLabel ? <span className="sd-course-grade" aria-label={`Current grade ${card.gradeLabel}${card.gradePercent != null ? `, ${card.gradePercent}%` : ""}`}><strong>{card.gradeLabel}</strong>{card.gradePercent != null ? <span>{card.gradePercent}%</span> : null}</span> : null}</div><h2>{card.name}</h2><p className="sd-course-status">{courseStatus(card)}</p><span className="sd-course-open">Open class <ArrowUpRight size={16} aria-hidden="true" /></span></div></Link>;
}

function Frame({ children }: { children: ReactNode }) {
  return <main className="sd-class-library-main" id="main-content"><span className="sd-class-library-notch sd-class-library-notch--top" aria-hidden="true" /><span className="sd-class-library-notch sd-class-library-notch--bottom" aria-hidden="true" />{children}</main>;
}

export function EmptyClassLibrary({ createForm, createOpen, profile }: ClassLibrarySharedProps) {
  return <ScreenDesignViewport className="sd-class-library" aria-label="Classes"><style>{CLASS_LIBRARY_STYLES}</style><StudentDesktopNav active="Classes" {...profile} /><ClassMobileHeader /><Frame><div className="sd-class-library-content sd-class-library-empty">{createOpen ? <CreateClassPanel createForm={createForm} /> : <section className="sd-class-library-empty-inner"><span className="sd-class-library-empty-icon" aria-hidden="true"><BookOpen size={26} /></span><h2>Your classes, in one place</h2><p>Add a class to keep its assignments, notes, and study work together.</p><Link href="/classes?create=1" className="sd-class-library-empty-action"><Plus size={18} aria-hidden="true" /> Add a class</Link></section>}</div></Frame><StudentBottomNav /></ScreenDesignViewport>;
}

export function MyClassesGrid({ cards, createForm, createOpen, profile }: ClassLibrarySharedProps & { cards: SubjectLibraryCardModel[] }) {
  return <ScreenDesignViewport className="sd-class-library" aria-label="Classes"><style>{CLASS_LIBRARY_STYLES}</style><StudentDesktopNav active="Classes" {...profile} /><ClassMobileHeader /><Frame><div className="sd-class-library-content"><header className="sd-class-library-heading"><div><h1>CLASSES</h1></div><Link href="/classes?create=1" className="sd-class-add-action"><Plus size={17} aria-hidden="true" /><span>Add class</span></Link></header>{createOpen ? <CreateClassPanel createForm={createForm} /> : null}<section className="sd-course-grid" aria-label="All classes">{cards.map((card) => <CourseCard key={card.id} card={card} />)}</section></div></Frame><StudentBottomNav /></ScreenDesignViewport>;
}
