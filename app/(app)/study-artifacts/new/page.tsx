import Link from "next/link";
import { ArrowLeft, BookOpenCheck, ChevronRight, FileText, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { createClient } from "@/lib/supabase/server";

import { generateStudyArtifact } from "../actions";

const QUESTION_COUNTS = [5, 10, 15, 20] as const;

type Source = {
  id: string;
  title: string;
  classId: string | null;
  type: "assignment" | "note";
};

async function createPracticeQuiz(formData: FormData) {
  "use server";

  const source = String(formData.get("source") ?? "");
  const [sourceType, sourceId] = source.split(":", 2);
  const questionCount = Number(formData.get("questionCount"));
  const returnTo = String(formData.get("returnTo") ?? "/study-artifacts");

  if ((sourceType !== "assignment" && sourceType !== "note") || !sourceId) redirect("/study-artifacts");
  if (!QUESTION_COUNTS.includes(questionCount as (typeof QUESTION_COUNTS)[number])) {
    redirect(`${returnTo}?quiz=choose-count`);
  }

  const result = await generateStudyArtifact({
    sourceType,
    sourceId,
    artifactType: "practice_test",
    studyMode: "retrieval_quiz",
    questionCount,
  });

  if (!result.ok) redirect(`${returnTo}?quiz=try-again`);
  redirect(`/study-artifacts/${result.id}`);
}

export default async function NewPracticeQuizPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; quiz?: string }>;
}) {
  const params = await searchParams;
  const [sourceType, sourceId] = (params.source ?? "").split(":", 2);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let source: Source | null = null;
  if (sourceType === "assignment" && sourceId) {
    const { data } = await supabase.from("assignments").select("id, title, class_id").eq("id", sourceId).eq("owner_id", user.id).maybeSingle();
    if (data) source = { id: data.id, title: data.title, classId: data.class_id, type: "assignment" };
  }
  if (sourceType === "note" && sourceId) {
    const { data } = await supabase.from("notes").select("id, title, class_id").eq("id", sourceId).eq("owner_id", user.id).maybeSingle();
    if (data) source = { id: data.id, title: data.title || "Class notes", classId: data.class_id, type: "note" };
  }
  if (!source) redirect("/study-artifacts");

  const [{ data: course }, { data: profile }] = await Promise.all([
    source.classId ? supabase.from("classes").select("id, name").eq("id", source.classId).eq("owner_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("profiles").select("display_name, photo_url, photo_offset_x, photo_offset_y").eq("user_id", user.id).maybeSingle(),
  ]);

  const courseName = course?.name ?? "Your class";
  const returnTo = source.classId ? `/classes/${source.classId}` : "/study-artifacts";
  const notice = params.quiz === "choose-count"
    ? "Choose how many questions you want first."
    : params.quiz === "try-again"
      ? "Diana could not make that quiz yet. Check the class material and try again."
      : null;

  return (
    <ScreenDesignViewport className="sd-quiz-setup diana-current-page">
      <style>{QUIZ_SETUP_STYLES}</style>
      <StudentDesktopNav active="Classes" displayName={profile?.display_name} photoUrl={profile?.photo_url} photoOffsetX={profile?.photo_offset_x} photoOffsetY={profile?.photo_offset_y} />
      <main id="main-content" className="sd-quiz-setup-main">
        <span className="sd-quiz-setup-notch sd-quiz-setup-notch--top" aria-hidden="true" />
        <span className="sd-quiz-setup-notch sd-quiz-setup-notch--bottom" aria-hidden="true" />
        <header className="sd-quiz-setup-header">
          <Link href={returnTo} className="sd-quiz-setup-back"><ArrowLeft size={17} aria-hidden="true" /> Back to {courseName}</Link>
          <span>Quiz</span>
        </header>
        <section className="sd-quiz-setup-grid" aria-label="Quiz setup">
          <aside className="sd-quiz-setup-rail">
            <p className="sd-quiz-setup-eyebrow">Study Lab</p>
            <h1>{courseName}</h1>
            <p>Choose the size of this quiz. Diana will use your saved class material.</p>
            <div className="sd-quiz-setup-rail-step" aria-current="step"><span>1</span><strong>Choose quiz length</strong></div>
            <div className="sd-quiz-setup-rail-step"><span>2</span><strong>Answer one question at a time</strong></div>
          </aside>
          <form action={createPracticeQuiz} className="sd-quiz-setup-card">
            <input type="hidden" name="source" value={`${source.type}:${source.id}`} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <div className="sd-quiz-setup-card-head"><span className="sd-quiz-setup-count">Quiz setup</span><h2>How many questions?</h2><p>Pick a number that feels doable right now.</p></div>
            <fieldset className="sd-quiz-setup-options"><legend className="sr-only">Number of quiz questions</legend>{QUESTION_COUNTS.map((count) => <label key={count}><input type="radio" name="questionCount" value={count} defaultChecked={count === 10} /><span><strong>{count}</strong><small>questions</small></span></label>)}</fieldset>
            {notice ? <p role="status" className="sd-quiz-setup-notice">{notice}</p> : null}
            <button type="submit" className="sd-quiz-setup-submit"><Sparkles size={18} aria-hidden="true" /> Generate quiz <ChevronRight size={18} aria-hidden="true" /></button>
          </form>
          <aside className="sd-quiz-setup-source"><div><FileText size={19} aria-hidden="true" /><span>Using</span></div><h2>{source.title}</h2><p>{source.type === "assignment" ? "Assignment" : "Class note"} from {courseName}</p><Link href={source.type === "assignment" ? `/assignments/${source.id}` : `/notes/${source.id}`}>Review source <BookOpenCheck size={16} aria-hidden="true" /></Link></aside>
        </section>
      </main>
    </ScreenDesignViewport>
  );
}

const QUIZ_SETUP_STYLES = `
  .diana-app:has(.sd-quiz-setup) .diana-mobile-command, .diana-app:has(.sd-quiz-setup) .agent-fab-anchor { display:none!important; }
  .sd-quiz-setup { min-height:100dvh; background:#8b9193; color:#111b24; }
  .sd-quiz-setup-main { position:relative; z-index:2; width:min(1460px,calc(100% - 48px)); min-height:calc(100dvh - 88px); margin:0 auto; padding:112px 0 44px; }
  .sd-quiz-setup-main::before { position:absolute; inset:88px -22px 22px; z-index:-1; border:1px solid rgb(255 255 255 / .58); border-radius:24px 46px 24px 46px; background:linear-gradient(145deg,rgb(246 248 244 / .28),rgb(219 226 226 / .16)); box-shadow:inset 0 1px 0 rgb(255 255 255 / .55),0 22px 58px rgb(17 27 36 / .18); backdrop-filter:blur(20px) saturate(1.04); -webkit-backdrop-filter:blur(20px) saturate(1.04); content:""; }
  .sd-quiz-setup-notch { position:absolute; z-index:1; left:50%; width:168px; height:25px; transform:translateX(-50%); background:#8b9193; }
  .sd-quiz-setup-notch--top { top:88px; border-radius:0 0 20px 20px; border:1px solid rgb(255 255 255 / .58); border-top:0; }
  .sd-quiz-setup-notch--bottom { bottom:22px; border-radius:20px 20px 0 0; border:1px solid rgb(255 255 255 / .58); border-bottom:0; }
  .sd-quiz-setup-header { display:flex; min-height:44px; align-items:center; justify-content:space-between; gap:20px; margin-bottom:28px; color:#f8faf8; font:500 14px/1.4 var(--font-lexend),Lexend,sans-serif; text-shadow:0 2px 12px rgb(10 18 24 / .48); }
  .sd-quiz-setup-back { display:inline-flex; min-height:44px; align-items:center; gap:8px; color:inherit; text-decoration:none; }
  .sd-quiz-setup-grid { display:grid; grid-template-columns:minmax(220px,.58fr) minmax(460px,1.25fr) minmax(230px,.58fr); align-items:stretch; gap:20px; }
  .sd-quiz-setup-rail,.sd-quiz-setup-card,.sd-quiz-setup-source { min-width:0; border:1px solid rgb(255 255 255 / .7); box-shadow:inset 0 1px 0 rgb(255 255 255 / .6),0 16px 38px rgb(17 27 36 / .13); backdrop-filter:blur(24px) saturate(1.05); -webkit-backdrop-filter:blur(24px) saturate(1.05); }
  .sd-quiz-setup-rail { display:flex; flex-direction:column; gap:14px; border-radius:14px 26px 14px 26px; background:rgb(246 248 244 / .42); padding:24px; }
  .sd-quiz-setup-eyebrow,.sd-quiz-setup-rail h1,.sd-quiz-setup-rail p,.sd-quiz-setup-card h2,.sd-quiz-setup-card p,.sd-quiz-setup-source h2,.sd-quiz-setup-source p { margin:0; }
  .sd-quiz-setup-eyebrow { color:#0b8d9a; font-size:13px; font-weight:640; }.sd-quiz-setup-rail h1 { font:650 clamp(28px,3vw,42px)/1.05 var(--font-lexend),Lexend,sans-serif; }.sd-quiz-setup-rail > p,.sd-quiz-setup-source p { color:#48555c; font-size:15px; line-height:1.55; }
  .sd-quiz-setup-rail-step { display:flex; align-items:center; gap:10px; margin-top:4px; color:#263139; font-size:14px; line-height:1.35; }.sd-quiz-setup-rail-step span { display:grid; width:30px; height:30px; flex:0 0 auto; place-items:center; border:1px solid rgb(17 27 36 / .24); border-radius:50%; background:rgb(255 255 255 / .3); font-weight:650; }.sd-quiz-setup-rail-step[aria-current="step"] span { border-color:#c7d23d; background:#e6f044; }
  .sd-quiz-setup-card { display:grid; align-content:center; gap:28px; border-radius:18px 34px 18px 34px; background:rgb(250 251 248 / .58); padding:clamp(28px,5vw,58px); }.sd-quiz-setup-card-head { display:grid; gap:8px; }.sd-quiz-setup-count { color:#56636a; font-size:14px; font-weight:600; }.sd-quiz-setup-card h2 { font:650 clamp(30px,4vw,50px)/1.04 var(--font-lexend),Lexend,sans-serif; letter-spacing:0; }.sd-quiz-setup-card p { color:#48555c; font-size:16px; line-height:1.55; }
  .sd-quiz-setup-options { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin:0; padding:0; border:0; }.sd-quiz-setup-options label { position:relative; min-height:112px; cursor:pointer; }.sd-quiz-setup-options input { position:absolute; opacity:0; pointer-events:none; }.sd-quiz-setup-options span { display:grid; height:100%; place-content:center; gap:3px; border:1px solid rgb(17 27 36 / .2); border-radius:10px; background:rgb(255 255 255 / .36); color:#18242b; text-align:center; transition:background .16s ease,border-color .16s ease,transform .16s ease; }.sd-quiz-setup-options strong { font-size:30px; font-weight:650; line-height:1; }.sd-quiz-setup-options small { color:#59666d; font-size:13px; }.sd-quiz-setup-options input:checked + span { border-color:#c7d23d; background:#e6f044; transform:translateY(-2px); }.sd-quiz-setup-options input:focus-visible + span { outline:3px solid #1b2931; outline-offset:3px; }
  .sd-quiz-setup-notice { border-left:3px solid #c79625; padding-left:10px; color:#5a4211!important; font-size:14px!important; }.sd-quiz-setup-submit { display:inline-flex; min-height:52px; align-items:center; justify-content:center; gap:9px; border:1px solid #c7d23d; border-radius:9px; background:#e6f044; padding:0 18px; color:#142027; font:600 16px/1 var(--font-lexend),Lexend,sans-serif; cursor:pointer; }
  .sd-quiz-setup-source { display:flex; flex-direction:column; align-items:flex-start; justify-content:center; gap:12px; border-radius:14px 26px 14px 26px; background:rgb(246 248 244 / .42); padding:24px; }.sd-quiz-setup-source > div { display:flex; align-items:center; gap:8px; color:#48555c; font-size:13px; font-weight:620; }.sd-quiz-setup-source h2 { color:#17232a; font:620 19px/1.35 var(--font-lexend),Lexend,sans-serif; }.sd-quiz-setup-source a { display:inline-flex; min-height:44px; align-items:center; gap:7px; margin-top:4px; color:#17232a; font-size:14px; font-weight:600; text-decoration:none; }
  @media (max-width:1190px) { .sd-quiz-setup-grid { grid-template-columns:minmax(210px,.65fr) minmax(420px,1.35fr); }.sd-quiz-setup-source { grid-column:1 / -1; min-height:150px; } } @media (max-width:760px) { .sd-quiz-setup-main { width:min(100% - 28px,650px); padding-top:80px; padding-bottom:96px; }.sd-quiz-setup-main::before { inset:58px -10px 66px; }.sd-quiz-setup-notch--top { top:58px; }.sd-quiz-setup-notch--bottom { bottom:66px; }.sd-quiz-setup-header { margin-bottom:16px; }.sd-quiz-setup-header > span { display:none; }.sd-quiz-setup-grid { grid-template-columns:1fr; gap:14px; }.sd-quiz-setup-rail { order:2; }.sd-quiz-setup-card { order:1; gap:22px; padding:28px 20px; }.sd-quiz-setup-source { order:3; }.sd-quiz-setup-options { gap:8px; }.sd-quiz-setup-options label { min-height:88px; }.sd-quiz-setup-options strong { font-size:25px; } }
`;
