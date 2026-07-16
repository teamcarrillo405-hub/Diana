import { Award, BookOpen, Layers3, Share2 } from "lucide-react";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { SourceMedia } from "@/components/screen-design/source-media";
import type { ExternalScoutPortfolio } from "@/lib/sharing/types";

const EXTERNAL_SCOUT_STYLES = `
  .skip-link:focus { transform:translateY(0) !important; }
  .diana-app:has(.sd-external-scout) nextjs-portal { display:none !important; }
  .sd-external-scout { min-height:max(100dvh,852px); overflow:hidden; background:#0f172a; color:#fff; font-family:var(--font-body),Arial,sans-serif; }
  .sd-external-scout-scroll { height:max(100dvh,852px); overflow-y:auto; padding-bottom:38px; scrollbar-width:none; }
  .sd-external-scout-header { position:sticky; z-index:30; top:0; display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:92px; padding:40px 24px 14px; background:rgb(15 23 42 / .82); backdrop-filter:blur(14px); }
  .sd-external-scout-header .sd-source-wordmark { width:auto; height:20px; }
  .sd-external-scout-badge { display:inline-flex; align-items:center; gap:6px; border-radius:6px; background:linear-gradient(90deg,#fde047,#fb923c); padding:6px 9px; color:#0f172a; font-size:7px; font-weight:950; letter-spacing:.12em; text-transform:uppercase; box-shadow:0 0 16px rgb(251 191 36 / .2); }
  .sd-external-scout-badge svg { width:11px; height:11px; }
  .sd-external-scout-hero { position:relative; display:grid; min-height:375px; align-content:end; justify-items:center; overflow:hidden; padding:38px 24px 34px; text-align:center; background:radial-gradient(circle at 50% 27%,rgb(116 192 255 / .24),transparent 12rem),linear-gradient(180deg,#182841 0%,#0f172a 100%); }
  .sd-external-scout-hero::before { position:absolute; inset:0; background:linear-gradient(135deg,transparent 0 46%,rgb(255 255 255 / .03) 46% 47%,transparent 47% 100%); background-size:28px 28px; content:""; mask-image:linear-gradient(to bottom,#000,transparent 76%); }
  .sd-external-scout-mascot { position:absolute; top:38px; width:190px; height:190px; object-fit:contain; opacity:.9; filter:drop-shadow(0 14px 34px rgb(0 0 0 / .4)); }
  .sd-external-scout-hero-copy { position:relative; z-index:2; display:grid; justify-items:center; gap:7px; }
  .sd-external-scout-hero-copy > span { color:#74c0ff; font-size:8px; font-weight:950; letter-spacing:.3em; text-transform:uppercase; }
  .sd-external-scout-hero h1 { max-width:9ch; margin:0; font:italic 950 46px/.88 var(--font-display),Arial,sans-serif; letter-spacing:-.06em; text-transform:uppercase; }
  .sd-external-scout-hero p { max-width:31ch; margin:2px 0 0; color:#94a3b8; font-size:9px; font-weight:800; line-height:1.45; text-transform:uppercase; }
  .sd-external-scout-stats { display:flex; gap:46px; margin-top:16px; }
  .sd-external-scout-stats div { display:grid; gap:3px; }
  .sd-external-scout-stats strong { color:#ff79da; font:italic 950 23px/1 var(--font-display),Arial,sans-serif; }
  .sd-external-scout-stats span { color:#64748b; font-size:7px; font-weight:900; letter-spacing:.13em; text-transform:uppercase; }
  .sd-external-scout-feature { padding:22px 24px 8px; }
  .sd-external-scout-feature > div { position:relative; display:grid; grid-template-columns:82px minmax(0,1fr); align-items:center; gap:16px; overflow:hidden; border:1px solid rgb(255 255 255 / .11); border-radius:24px; background:rgb(255 255 255 / .045); padding:17px; }
  .sd-external-scout-ring { width:82px; height:82px; object-fit:contain; filter:drop-shadow(0 0 18px rgb(255 121 218 / .32)); }
  .sd-external-scout-feature span { color:#ff79da; font-size:8px; font-weight:950; letter-spacing:.14em; text-transform:uppercase; }
  .sd-external-scout-feature h2 { margin:5px 0 0; font:italic 950 19px/.95 var(--font-display),Arial,sans-serif; text-transform:uppercase; }
  .sd-external-scout-feature p { margin:6px 0 0; color:#94a3b8; font-size:8px; font-weight:700; line-height:1.4; text-transform:uppercase; }
  .sd-external-scout-work { display:grid; gap:13px; padding:20px 24px 0; scroll-margin-top:96px; }
  .sd-external-scout-section-head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:0 5px; }
  .sd-external-scout-section-head h2 { margin:0; color:#64748b; font:italic 950 11px/1 var(--font-display),Arial,sans-serif; letter-spacing:.14em; text-transform:uppercase; }
  .sd-external-scout-section-head a { display:inline-flex; align-items:center; gap:4px; color:#74c0ff; font-size:8px; font-weight:900; letter-spacing:.08em; text-decoration:none; text-transform:uppercase; }
  .sd-external-scout-section-head a svg { width:11px; height:11px; }
  .sd-external-scout-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
  .sd-external-scout-card { min-width:0; overflow:hidden; border:1px solid rgb(255 255 255 / .1); border-radius:17px; background:rgb(255 255 255 / .045); }
  .sd-external-scout-card-visual { display:grid; aspect-ratio:1.08; place-items:center; background:rgb(255 255 255 / .025); color:rgb(255 255 255 / .15); }
  .sd-external-scout-card-visual svg { width:40px; height:40px; }
  .sd-external-scout-card:nth-child(2n) .sd-external-scout-card-visual { color:rgb(116 192 255 / .25); }
  .sd-external-scout-card details { border-top:1px solid rgb(255 255 255 / .06); padding:11px; }
  .sd-external-scout-card summary { cursor:pointer; color:#fff; font:italic 950 10px/1.1 var(--font-display),Arial,sans-serif; list-style:none; text-transform:uppercase; }
  .sd-external-scout-card p { margin:7px 0 0; color:#94a3b8; font-size:8px; line-height:1.45; }
  .sd-external-scout-empty { grid-column:1 / -1; display:grid; justify-items:center; gap:8px; border:1px dashed rgb(116 192 255 / .3); border-radius:18px; padding:28px 18px; text-align:center; }
  .sd-external-scout-empty svg { width:28px; color:#74c0ff; }
  .sd-external-scout-empty h3 { margin:0; font:italic 950 17px/1 var(--font-display),Arial,sans-serif; text-transform:uppercase; }
  .sd-external-scout-empty p { margin:0; color:#94a3b8; font-size:9px; line-height:1.45; }
  .sd-external-scout-foot { display:grid; gap:7px; margin:26px 24px 0; border-top:1px solid rgb(255 255 255 / .08); padding:18px 4px 0; color:#64748b; font-size:8px; line-height:1.45; text-align:center; }
  .sd-external-scout-foot strong { color:#94a3b8; text-transform:uppercase; }
`;

export function TeacherSnapshotView({
  portfolio,
}: {
  portfolio: ExternalScoutPortfolio;
}) {
  const expiresLabel = new Date(portfolio.expiresAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <ScreenDesignViewport className="sd-external-scout sd-public-share-screen">
      <style>{EXTERNAL_SCOUT_STYLES}</style>
      <main id="main-content" className="sd-external-scout-scroll">
        <header className="sd-external-scout-header">
          <DianaWordmark />
          <span className="sd-external-scout-badge">
            <Award aria-hidden="true" />
            Verified student share
          </span>
        </header>

        <section className="sd-external-scout-hero" aria-labelledby="portfolio-title">
          <SourceMedia
            assetId="diana-mascot"
            width={256}
            height={256}
            className="sd-external-scout-mascot"
            decorative
            priority
          />
          <div className="sd-external-scout-hero-copy">
            <span>Student-approved portfolio</span>
            <h1 id="portfolio-title">{portfolio.title}</h1>
            {portfolio.description ? <p>{portfolio.description}</p> : null}
            <div className="sd-external-scout-stats" aria-label="Shared portfolio summary">
              <div>
                <strong>{String(portfolio.items.length).padStart(2, "0")}</strong>
                <span>Work samples</span>
              </div>
              <div>
                <strong>Private</strong>
                <span>Token access</span>
              </div>
            </div>
          </div>
        </section>

        <section className="sd-external-scout-feature" aria-label="Share scope">
          <div>
            <SourceMedia
              assetId="academic-championship-ring"
              width={160}
              height={160}
              className="sd-external-scout-ring"
              decorative
            />
            <div>
              <span>Shared evidence</span>
              <h2>Portfolio showcase</h2>
              <p>Only the work selected for this private share appears here.</p>
            </div>
          </div>
        </section>

        <section id="shared-evidence" className="sd-external-scout-work">
          <div className="sd-external-scout-section-head">
            <h2>Top work</h2>
            <a href="#shared-evidence">
              <Share2 aria-hidden="true" />
              Open shared evidence
            </a>
          </div>
          <div className="sd-external-scout-grid">
            {portfolio.items.length === 0 ? (
              <div className="sd-external-scout-empty">
                <BookOpen aria-hidden="true" />
                <h3>No work is included</h3>
                <p>The student can create a new share when selected work is ready.</p>
              </div>
            ) : (
              portfolio.items.map((item, index) => (
                <article className="sd-external-scout-card" key={item.id}>
                  <div className="sd-external-scout-card-visual" aria-hidden="true">
                    {index % 2 === 0 ? <Layers3 /> : <BookOpen />}
                  </div>
                  <details>
                    <summary>{item.title}</summary>
                    {item.reflectionText ? <p>{item.reflectionText}</p> : null}
                  </details>
                </article>
              ))
            )}
          </div>
        </section>

        <footer className="sd-external-scout-foot">
          <strong>Private link expires {expiresLabel}</strong>
          <span>Only the selected portfolio evidence is included.</span>
        </footer>
      </main>
    </ScreenDesignViewport>
  );
}
