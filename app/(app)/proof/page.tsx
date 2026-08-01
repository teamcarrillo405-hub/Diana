import {
  ArrowRight,
  CheckCircle2,
  FolderOpen,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { SourceMedia } from "@/components/screen-design/source-media";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
import { loadProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

import {
  selectLatestProofMilestone,
  type CompletedProofRow,
} from "./proof-state";

type AuthorshipRow = {
  id: string;
  assignment_id: string | null;
  actor: string;
  event_type: string;
  created_at: string;
};

type ArtifactRow = {
  id: string;
  title: string;
  artifact_type: string;
  source_anchor_count: number;
  created_at: string;
};

type ShowcaseItemRow = {
  id: string;
  title: string;
  reflection_text: string | null;
  created_at: string;
};

type ShowcasePortfolioRow = {
  title: string;
  portfolio_items: ShowcaseItemRow[] | null;
};

const PROOF_STYLES = `
  .diana-app-shell:has(.sd-proof-screen) .agent-fab-anchor,
  .app-command-frame:has(.sd-proof-screen) .diana-mobile-command { display: none !important; }
  .app-command-frame:has(.sd-proof-screen) { padding: 0 !important; }
  .diana-app:has(.sd-proof-screen) nextjs-portal { display: none !important; }
  .diana-app:has(.sd-proof-screen) .skip-link { transition: none; }
  .diana-app:has(.sd-proof-screen) .skip-link:focus { transform: translateY(0) !important; }
  .sd-proof-screen { min-height: max(100dvh, 852px); font-family: var(--font-body); background: #0b1428; }
  .sd-proof-screen a { color: inherit; }
  .sd-proof-scroll { min-height: calc(852px - 88px); padding: 30px 22px 26px; background: radial-gradient(circle at 88% 6%, rgb(255 121 218 / .11), transparent 30%), #0b1428; }
  .sd-proof-content { width: 100%; margin: 0 auto; }
  .sd-proof-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .sd-proof-lock { display: inline-flex; align-items: center; gap: 7px; color: #94a3b8; font-size: 10px; font-weight: 900; letter-spacing: .15em; text-transform: uppercase; }
  .sd-proof-title { margin: 29px 0 0; font-family: var(--font-display); font-size: 39px; font-style: italic; font-weight: 950; letter-spacing: -.055em; line-height: .91; text-transform: uppercase; }
  .sd-proof-title span { color: #ff79da; }
  .sd-proof-section { margin-top: 25px; }
  .sd-proof-section-title { margin: 0 0 11px; color: #74c0ff; font-size: 10px; font-weight: 950; letter-spacing: .18em; text-transform: uppercase; }
  .sd-proof-card { display: grid; grid-template-columns: 42px 1fr auto; gap: 12px; align-items: center; margin-bottom: 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; padding: 14px; color: #0f172a; text-decoration: none; }
  .sd-proof-card-icon { display: grid; width: 42px; height: 42px; place-items: center; border-radius: 8px; background: rgb(41 208 255 / .12); color: #0369a1; }
  .sd-proof-card h2 { margin: 0; color: #0f172a; font-family: var(--font-display); font-size: 15px; font-style: italic; font-weight: 900; letter-spacing: -.02em; text-transform: uppercase; }
  .sd-proof-card p { margin: 4px 0 0; color: #64748b; font-size: 10px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
  .sd-proof-empty { border: 1px dashed #94a3b8; border-radius: 8px; background: #fff; padding: 22px; color: #0f172a; }
  .sd-proof-empty h2 { margin: 0 0 7px; color: #0f172a; font-family: var(--font-display); font-size: 18px; font-style: italic; text-transform: uppercase; }
  .sd-proof-empty p { margin: 0 0 16px; color: #475569; font-size: 12px; line-height: 1.55; }
  .sd-proof-empty a { display: inline-flex; align-items: center; gap: 8px; border: 1px solid #29d0ff; border-radius: 8px; background: #29d0ff; padding: 9px 12px; color: #0f172a; font-size: 11px; font-weight: 900; letter-spacing: .08em; text-decoration: none; text-transform: uppercase; }
  .sd-showcase-week { margin-top: 16px; }
  .sd-showcase-week:first-of-type { margin-top: 0; }
  .sd-showcase-week h3 { margin: 0 0 8px; color: #94a3b8; font-size: 9px; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; }
  .sd-showcase-item { display: grid; grid-template-columns: 42px minmax(0, 1fr) auto; gap: 12px; align-items: center; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; padding: 14px; color: #0f172a; text-decoration: none; }
  .sd-showcase-item + .sd-showcase-item { margin-top: 9px; }
  .sd-showcase-item-icon { display: grid; width: 42px; height: 42px; place-items: center; border-radius: 8px; background: rgb(255 121 218 / .12); color: #be185d; }
  .sd-showcase-item h4 { overflow: hidden; margin: 0; color: #0f172a; font-family: var(--font-display); font-size: 15px; font-style: italic; font-weight: 900; letter-spacing: -.02em; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
  .sd-showcase-item p { overflow: hidden; margin: 4px 0 0; color: #64748b; font-size: 10px; font-weight: 800; letter-spacing: .06em; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
  .sd-showcase-item > svg { color: #475569; }
  .sd-milestone-screen { display: flex; min-height: max(100dvh, 852px); flex-direction: column; overflow: hidden; font-family: var(--font-body); background: radial-gradient(circle at 50% 38%, rgb(255 121 218 / .13), transparent 34%), #0b1428; }
  .sd-milestone-confetti { pointer-events: none; position: absolute; inset: 0; overflow: hidden; }
  .sd-milestone-confetti i { position: absolute; width: 5px; height: 13px; border-radius: 4px; background: #74c0ff; transform: rotate(21deg); animation: sd-confetti-float 5s ease-in-out infinite; }
  .sd-milestone-confetti i:nth-child(2n) { background: #ff79da; transform: rotate(-31deg); }
  .sd-milestone-confetti i:nth-child(3n) { background: #2dd4bf; }
  .sd-milestone-confetti i:nth-child(1) { top: 8%; left: 9%; } .sd-milestone-confetti i:nth-child(2) { top: 13%; right: 12%; animation-delay: -.7s; }
  .sd-milestone-confetti i:nth-child(3) { top: 31%; left: 5%; animation-delay: -1.8s; } .sd-milestone-confetti i:nth-child(4) { top: 35%; right: 7%; animation-delay: -2.5s; }
  .sd-milestone-confetti i:nth-child(5) { top: 57%; left: 12%; animation-delay: -3.2s; } .sd-milestone-confetti i:nth-child(6) { top: 61%; right: 10%; animation-delay: -4s; }
  @keyframes sd-confetti-float { 0%,100% { translate: 0 -5px; opacity: .45; } 50% { translate: 0 8px; opacity: 1; } }
  .sd-milestone-main { position: relative; z-index: 1; display: flex; flex: 1; flex-direction: column; align-items: center; padding: 24px 25px 18px; text-align: center; }
  .sd-milestone-main .sd-source-wordmark { height: 18px; align-self: center; }
  .sd-milestone-kicker { margin: 31px 0 6px; color: #74c0ff; font-size: 11px; font-weight: 950; letter-spacing: .32em; text-transform: uppercase; }
  .sd-milestone-main h1 { max-width: 330px; margin: 0; font-family: var(--font-display); font-size: 35px; font-style: italic; font-weight: 950; letter-spacing: -.05em; line-height: .95; text-transform: uppercase; }
  .sd-milestone-main h1 span { display: block; color: #ff79da; }
  .sd-milestone-ring { width: 206px; height: 206px; margin: 16px auto 9px; object-fit: contain; filter: drop-shadow(0 0 24px rgb(116 192 255 / .18)); }
  .sd-milestone-label { margin: 0 0 10px; color: #ff79da; font-size: 9px; font-weight: 950; letter-spacing: .2em; text-transform: uppercase; }
  .sd-milestone-facts { display: grid; width: 100%; grid-template-columns: 1fr 1fr; gap: 10px; }
  .sd-milestone-fact { min-width: 0; border: 1px solid rgb(255 255 255 / .11); border-radius: 14px; background: #162136; padding: 13px 12px; text-align: left; }
  .sd-milestone-fact strong { display: block; overflow: hidden; color: #f8fafc; font-family: var(--font-display); font-size: 13px; font-style: italic; font-weight: 900; line-height: 1.15; text-overflow: ellipsis; text-transform: uppercase; }
  .sd-milestone-fact span { display: block; margin-top: 5px; color: #71809c; font-size: 8px; font-weight: 900; letter-spacing: .09em; text-transform: uppercase; }
  .sd-milestone-note { margin: 14px 12px 0; color: #94a3b8; font-size: 11px; font-style: italic; line-height: 1.45; }
  .sd-milestone-footer { position: relative; z-index: 2; display: grid; grid-template-columns: 1fr auto; gap: 10px; border-top: 1px solid rgb(255 255 255 / .07); background: rgb(8 15 31 / .96); padding: 15px 20px max(18px, env(safe-area-inset-bottom)); }
  .sd-milestone-share, .sd-milestone-continue { display: inline-flex; min-height: 48px; align-items: center; justify-content: center; gap: 8px; border-radius: 15px; font-size: 12px; font-style: italic; font-weight: 950; text-decoration: none; text-transform: uppercase; }
  .sd-milestone-share { background: linear-gradient(120deg, #74c0ff, #ff79da); color: #0b1428 !important; }
  .sd-milestone-continue { border: 1px solid rgb(255 255 255 / .15); padding-inline: 17px; color: #f8fafc !important; }
  @media (prefers-reduced-motion: reduce) { .sd-milestone-confetti i { animation: none; } }
  @media (min-width: 700px) { .sd-proof-screen, .sd-milestone-screen { min-height: max(100dvh, 852px); } }
  @media (min-width: 1100px) {
    .sd-proof-screen .sd-student-desktop-nav { position: relative; }
    .sd-proof-screen { min-height: 100dvh; }
    .sd-proof-scroll { min-height: calc(100dvh - 58px); padding: 40px 48px 72px; }
    .sd-proof-content { max-width: 960px; }
    .sd-proof-header { display: none; }
    .sd-proof-title { margin: 0; font-size: 56px; }
    .sd-proof-section { margin-top: 30px; }
  }
`;

export default async function ProofPage({
  searchParams,
}: {
  searchParams: Promise<{ celebrate?: string; sdState?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: completed }, { data: authorship }, { data: artifacts }, { data: showcasePortfolios }] =
    await Promise.all([
      supabase
        .from("task_signals")
        .select("id, occurred_at, assignments(id, title, kind)")
        .eq("owner_id", user.id)
        .eq("kind", "completed")
        .order("occurred_at", { ascending: false })
        .limit(8),
      supabase
        .from("authorship_log")
        .select("id, assignment_id, actor, event_type, created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("study_artifacts")
        .select("id, title, artifact_type, source_anchor_count, created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("portfolios")
        .select("title, portfolio_items(id, title, reflection_text, created_at)")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  const completedRows = (completed ?? []) as unknown as CompletedProofRow[];
  const authorshipRows = (authorship ?? []) as AuthorshipRow[];
  const artifactRows = (artifacts ?? []) as ArtifactRow[];
  const showcaseWeeks = groupShowcaseByWeek(
    ((showcasePortfolios ?? []) as unknown as ShowcasePortfolioRow[]).flatMap((portfolio) =>
      (portfolio.portfolio_items ?? []).map((item) => ({
        ...item,
        portfolioTitle: portfolio.title,
      })),
    ),
  );
  const requested =
    params.celebrate === "latest" || params.sdState === "celebrate=latest";
  const milestone = selectLatestProofMilestone({
    requested,
    completed: completedRows,
    authorship: authorshipRows,
  });

  if (milestone) {
    return (
      <ScreenDesignViewport className="sd-proof-screen sd-milestone-screen">
        <style>{PROOF_STYLES}</style>
        <div className="sd-milestone-confetti" aria-hidden="true">
          <i /><i /><i /><i /><i /><i />
        </div>
        <main className="sd-milestone-main">
          <DianaWordmark />
          <p className="sd-milestone-kicker">Mastered</p>
          <h1>
            Learning <span>milestone</span>
          </h1>
          <SourceMedia
            assetId="academic-championship-ring"
            width={256}
            height={256}
            alt="Academic milestone ring"
            className="sd-milestone-ring"
            priority
          />
          <p className="sd-milestone-label">Record updated</p>
          <div className="sd-milestone-facts">
            <div className="sd-milestone-fact">
              <strong>{milestone.title}</strong>
              <span>{formatKind(milestone.kind)}</span>
            </div>
            <div className="sd-milestone-fact">
              <strong>
                {milestone.hasAuthorshipReceipt ? "Authorship saved" : "Completion saved"}
              </strong>
              <span>{formatDate(milestone.occurredAt)}</span>
            </div>
          </div>
          <p className="sd-milestone-note">
            This completed work is now part of your private record.
          </p>
        </main>
        <footer className="sd-milestone-footer">
          <Link href="/sharing" className="sd-milestone-share">
            Share privately <ShieldCheck size={16} aria-hidden="true" />
          </Link>
          <Link href="/proof" className="sd-milestone-continue" aria-label="Continue">
            Continue <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </footer>
        <StudentBottomNav />
      </ScreenDesignViewport>
    );
  }

  const profile = await loadProfile();

  return (
    <ScreenDesignViewport className="sd-proof-screen">
      <style>{PROOF_STYLES}</style>
      <StudentDesktopNav
        active="More"
        displayName={profile?.display_name}
        photoUrl={profile?.photo_url}
        photoOffsetX={profile?.photo_offset_x}
        photoOffsetY={profile?.photo_offset_y}
      />
      <main className="sd-proof-scroll">
        <div className="sd-proof-content">
          <header className="sd-proof-header">
          <DianaWordmark />
          <span className="sd-proof-lock">
            <ShieldCheck size={14} aria-hidden="true" /> Private
          </span>
          </header>
          <h1 className="sd-proof-title">Record</h1>
          <section className="sd-proof-section" aria-labelledby="proof-completed-title">
          <p id="proof-completed-title" className="sd-proof-section-title">
            Completed work
          </p>
          {completedRows.length === 0 ? (
            <div className="sd-proof-empty">
              <h2>No completed work yet.</h2>
              <p>Complete work to add it to your record.</p>
              <Link href="/assignments">
                Open work <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          ) : (
            completedRows.map((row) => {
              const assignment = Array.isArray(row.assignments)
                ? row.assignments[0]
                : row.assignments;
              if (!assignment?.id || !assignment.title) return null;
              return (
                <Link
                  href={`/assignments/${assignment.id}`}
                  className="sd-proof-card"
                  key={String(row.id)}
                >
                  <span className="sd-proof-card-icon">
                    <CheckCircle2 size={20} aria-hidden="true" />
                  </span>
                  <span>
                    <h2>{assignment.title}</h2>
                    <p>{formatDate(row.occurred_at)}</p>
                  </span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              );
            })
          )}
        </section>

        {artifactRows.length > 0 ? (
          <section className="sd-proof-section" aria-labelledby="proof-artifacts-title">
            <p id="proof-artifacts-title" className="sd-proof-section-title">
              Study artifacts
            </p>
            {artifactRows.map((artifact) => (
              <Link
                href={`/study-artifacts/${artifact.id}`}
                className="sd-proof-card"
                key={artifact.id}
              >
                <span className="sd-proof-card-icon">
                  <FolderOpen size={20} aria-hidden="true" />
                </span>
                <span>
                  <h2>{artifact.title}</h2>
                  <p>
                    {formatKind(artifact.artifact_type)} · {artifact.source_anchor_count} source
                    {artifact.source_anchor_count === 1 ? "" : "s"}
                  </p>
                </span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            ))}
          </section>
        ) : null}

          <section id="showcase" className="sd-proof-section" aria-labelledby="showcase-title">
          <p id="showcase-title" className="sd-proof-section-title">
            Showcase
          </p>
          {showcaseWeeks.length === 0 ? (
            <div className="sd-proof-empty">
              <h2>No showcase work yet.</h2>
              <p>Add a project or work sample to build your showcase.</p>
            </div>
          ) : (
            showcaseWeeks.map((week) => (
              <div className="sd-showcase-week" key={week.key}>
                <h3>{week.label}</h3>
                {week.items.map((item) => (
                  <Link
                    className="sd-showcase-item"
                    href={`/portfolio?item=${item.id}`}
                    key={item.id}
                  >
                    <span className="sd-showcase-item-icon">
                      <FolderOpen size={20} aria-hidden="true" />
                    </span>
                    <span>
                      <h4>{item.title}</h4>
                      <p>{item.portfolioTitle}</p>
                    </span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            ))
          )}
        </section>
        </div>
      </main>
      <StudentBottomNav />
    </ScreenDesignViewport>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatKind(value: string): string {
  return value.replaceAll("_", " ");
}

function groupShowcaseByWeek(
  items: Array<ShowcaseItemRow & { portfolioTitle: string }>,
): Array<{
  key: string;
  label: string;
  items: Array<ShowcaseItemRow & { portfolioTitle: string }>;
}> {
  const weeks = new Map<string, Array<ShowcaseItemRow & { portfolioTitle: string }>>();

  for (const item of items.sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    const date = new Date(item.created_at);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    const key = date.toISOString().slice(0, 10);
    const group = weeks.get(key) ?? [];
    group.push(item);
    weeks.set(key, group);
  }

  return [...weeks.entries()].map(([key, groupedItems]) => ({
    key,
    label: `Week of ${new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(`${key}T12:00:00`))}`,
    items: groupedItems,
  }));
}
