import { BookOpenCheck, Clock3, FolderOpen } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
import { loadProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { startStudentStudy } from "./actions";

const STUDY_STYLES = `
  .diana-authenticated-field:has(.sd-study-home) { padding-bottom:0!important; }
  .app-command-frame:has(.sd-study-home) { padding:0!important; }
  .app-command-frame:has(.sd-study-home) .diana-mobile-command,
  .diana-app-shell:has(.sd-study-home) .agent-fab-anchor { display:none!important; }
  .sd-study-home { min-height:100dvh; background:#0b1428; color:#fff; }
  .sd-study-home * { box-sizing:border-box; }
  .sd-study-home > .sd-student-desktop-nav { display:none; }
  .sd-study-main { width:100%; padding:28px 20px 100px; }
  .sd-study-mobile-brand { margin-bottom:24px; }
  .sd-study-mobile-brand .sd-source-wordmark { width:auto; height:28px; }
  .sd-study-heading { display:flex; align-items:end; justify-content:space-between; gap:18px; margin-bottom:24px; }
  .sd-study-heading h1 { margin:0; color:#fff; font-family:var(--font-saira-condensed),"Saira Condensed",sans-serif; font-size:44px; font-style:italic; font-weight:800; letter-spacing:0; line-height:1; text-transform:uppercase; }
  .sd-study-heading p { margin:8px 0 0; color:#cbd5e1; font-size:15px; }
  .sd-study-saved { display:inline-flex; min-height:42px; align-items:center; gap:8px; border:1px solid #8290aa; border-radius:7px; background:#f4efe6; padding:0 14px; color:#0f172a; font-family:var(--font-saira-condensed),"Saira Condensed",sans-serif; font-size:14px; font-weight:800; text-decoration:none; text-transform:uppercase; }
  .sd-study-notice { margin:0 0 18px; border:1px solid #f0bf63; border-radius:7px; background:#fff7df; padding:12px 14px; color:#422006; font-size:14px; }
  .sd-study-list { display:grid; gap:13px; }
  .sd-study-card { display:grid; gap:16px; border:1px dotted #8b96ad; border-radius:8px; background:#f4efe6; padding:18px; color:#0f172a; }
  .sd-study-card-copy { min-width:0; }
  .sd-study-card small { display:block; margin-bottom:5px; color:#475569; font-size:12px; font-weight:700; text-transform:uppercase; }
  .sd-study-card h2 { overflow-wrap:anywhere; margin:0; color:#0f172a; font-family:var(--font-saira-condensed),"Saira Condensed",sans-serif; font-size:22px; font-weight:800; letter-spacing:0; line-height:1.1; text-transform:uppercase; }
  .sd-study-meta { display:flex; flex-wrap:wrap; gap:10px 16px; margin-top:10px; color:#334155; font-size:13px; }
  .sd-study-meta span { display:inline-flex; align-items:center; gap:5px; }
  .sd-study-card form { width:100%; align-self:center; }
  .diana-app .sd-study-start { display:inline-flex; width:100%; min-height:48px; align-items:center; justify-content:center; gap:9px; border:1px solid #e43a9d; border-radius:7px; background:#f25fb0; padding:0 18px; color:#190b17; cursor:pointer; font-family:var(--font-saira-condensed),"Saira Condensed",sans-serif; font-size:17px; font-weight:900; letter-spacing:0; text-transform:uppercase; }
  .diana-app .sd-study-start:hover { background:#ff79c0; }
  .diana-app .sd-study-start:focus-visible,.sd-study-saved:focus-visible { outline:3px solid #29d0ff; outline-offset:3px; }
  .sd-study-empty { border:1px dotted #8b96ad; border-radius:8px; background:#f4efe6; padding:28px; color:#0f172a; text-align:center; }
  .sd-study-empty h2 { margin:0 0 8px; font-family:var(--font-saira-condensed),"Saira Condensed",sans-serif; font-size:24px; text-transform:uppercase; }
  .sd-study-empty a { color:#9d174d; font-weight:800; }
  .sd-study-home > .sd-student-bottom-nav { position:fixed; z-index:40; right:0; bottom:0; left:0; }

  @media (min-width:1100px) {
    .sd-study-home { background:radial-gradient(circle at 88% 6%,rgb(242 95 176 / .1),transparent 30%),#0b1428; }
    .sd-study-home > .sd-student-desktop-nav { display:block; }
    .sd-study-home > .sd-student-bottom-nav { display:none; }
    .sd-study-main { width:min(100%,1440px); margin-inline:auto; padding:42px 242px 72px 225px; }
    .sd-study-mobile-brand { display:none; }
    .sd-study-heading { margin-bottom:32px; }
    .sd-study-heading h1 { font-size:52px; }
    .sd-study-list { gap:15px; }
    .sd-study-card { grid-template-columns:minmax(0,1fr) 154px; align-items:center; padding:20px 22px; }
    .sd-study-card form { width:154px; }
    .diana-app .sd-study-start { width:154px; }
  }

  /* Current student visual system. This intentionally replaces the retired navy, neon, and condensed type treatment above. */
  .sd-study-home { background:#d6dad6!important; color:#182126!important; font-family:var(--font-lexend),Lexend,system-ui,sans-serif!important; }
  .sd-study-heading h1 { color:#182126!important; font-family:var(--font-lexend),Lexend,sans-serif!important; font-style:normal!important; font-weight:620!important; line-height:1.12!important; text-transform:none!important; }
  .sd-study-heading p,.sd-study-meta { color:#53615c!important; }
  .sd-study-saved { border:1px solid rgb(24 33 38 / .24)!important; border-radius:8px!important; background:rgb(255 255 255 / .56)!important; color:#182126!important; font-family:var(--font-lexend),Lexend,sans-serif!important; font-weight:500!important; text-transform:none!important; }
  .sd-study-card,.sd-study-empty { border:1px solid rgb(255 255 255 / .76)!important; border-radius:12px 20px 12px 20px!important; background:linear-gradient(135deg,rgb(248 250 247 / .7),rgb(238 244 238 / .46))!important; color:#182126!important; box-shadow:inset 0 1px 0 rgb(255 255 255 / .72),0 14px 34px rgb(24 33 38 / .12)!important; backdrop-filter:blur(24px) saturate(1.04)!important; }
  .sd-study-card small { color:#53615c!important; font-size:13px!important; font-weight:600!important; text-transform:none!important; }
  .sd-study-card h2,.sd-study-empty h2 { color:#182126!important; font-family:var(--font-lexend),Lexend,sans-serif!important; font-style:normal!important; font-weight:620!important; text-transform:none!important; }
  .diana-app .sd-study-start { border:1px solid #c6d23f!important; border-radius:8px!important; background:#e8f56b!important; color:#141d20!important; font-family:var(--font-lexend),Lexend,sans-serif!important; font-size:14px!important; font-style:normal!important; font-weight:600!important; text-transform:none!important; }
  .sd-study-empty a { color:#223f4d!important; }
  @media (min-width:1100px) {
    .sd-study-home { background:linear-gradient(rgb(214 218 214 / .84),rgb(214 218 214 / .9)),url("/images/classes-high-tech-classroom.png") center/cover fixed!important; }
    .sd-study-main { width:calc(100% - (2 * clamp(12px,1.6vw,28px)))!important; max-width:1800px!important; min-height:calc(100dvh - 118px); margin:22px auto 24px!important; border:7px solid #fff; border-radius:30px!important; padding:clamp(30px,3.2vw,48px) clamp(20px,3.2vw,54px) clamp(44px,5vw,78px)!important; }
    .sd-study-heading { max-width:920px; margin:0 auto 26px!important; }
    .sd-study-list,.sd-study-empty,.sd-study-notice { width:min(100%,920px); margin-inline:auto; }
  }
`;

type StudyPageSearchParams = {
  notice?: string;
};

export default async function StudyPage({
  searchParams,
}: {
  searchParams: Promise<StudyPageSearchParams>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fstudy");

  const [{ data: assignments }, profile, params] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, title, due_at, estimated_minutes, status, classes(name)")
      .eq("owner_id", user.id)
      .not("status", "in", "(submitted,graded,abandoned)")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(30),
    loadProfile(),
    searchParams,
  ]);

  return (
    <ScreenDesignViewport className="sd-study-home diana-current-page">
      <style>{STUDY_STYLES}</style>
      <StudentDesktopNav
        active="More"
        displayName={profile?.display_name}
        photoUrl={profile?.photo_url}
        photoOffsetX={profile?.photo_offset_x}
        photoOffsetY={profile?.photo_offset_y}
      />

      <main className="sd-study-main">
        <div className="sd-study-mobile-brand"><DianaWordmark /></div>
        <div className="sd-study-heading">
          <div>
            <h1>Study</h1>
            <p>Choose the assignment. Diana chooses the right study move.</p>
          </div>
          <Link className="sd-study-saved" href="/study-artifacts">
            <FolderOpen size={17} aria-hidden="true" /> Saved sets
          </Link>
        </div>

        {params.notice ? (
          <p className="sd-study-notice" role="status">{studyNotice(params.notice)}</p>
        ) : null}

        {(assignments ?? []).length > 0 ? (
          <div className="sd-study-list">
            {(assignments ?? []).map((assignment) => (
              <article className="sd-study-card" key={assignment.id}>
                <div className="sd-study-card-copy">
                  <small>{className(assignment.classes)}</small>
                  <h2>{assignment.title}</h2>
                  <div className="sd-study-meta">
                    <span><Clock3 size={14} aria-hidden="true" /> {assignment.estimated_minutes ?? 20} min</span>
                    <span>{dueLabel(assignment.due_at)}</span>
                  </div>
                </div>
                <form action={startStudentStudy}>
                  <input type="hidden" name="assignmentId" value={assignment.id} />
                  <button className="sd-study-start" type="submit">
                    <BookOpenCheck size={19} aria-hidden="true" /> Study
                  </button>
                </form>
              </article>
            ))}
          </div>
        ) : (
          <section className="sd-study-empty">
            <h2>Caught up</h2>
            <p>Your next assignment will appear here. <Link href="/assignments">Open Work</Link></p>
          </section>
        )}
      </main>
      <StudentBottomNav />
    </ScreenDesignViewport>
  );
}

function className(value: unknown): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && typeof candidate === "object" && "name" in candidate && typeof candidate.name === "string"
    ? candidate.name
    : "Class";
}

function dueLabel(value: string | null): string {
  if (!value) return "No due date";
  return `Due ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value))}`;
}

function studyNotice(value: string): string {
  if (value === "assignment-not-found") return "That assignment is not available in your Study list.";
  return decodeURIComponent(value).slice(0, 180);
}
