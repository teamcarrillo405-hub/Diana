import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpenCheck, LockKeyhole, PencilRuler, ShieldCheck } from "lucide-react";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
import { createClient } from "@/lib/supabase/server";

import { saveClassAiMode } from "./actions";

const CLASS_AI_SETTINGS_STYLES = `
  .diana-app-shell:has(.sd-class-ai-settings) .agent-fab-anchor { display:none!important; }
  .sd-class-ai-settings { min-height:calc(100dvh - 72px)!important; background:linear-gradient(rgb(214 218 214 / .66),rgb(214 218 214 / .72)),url("/images/classes-high-tech-classroom.png") center/cover fixed!important; color:#182126!important; font-family:var(--font-lexend),Lexend,system-ui,sans-serif!important; }
  .sd-class-ai-settings * { box-sizing:border-box; }
  .sd-class-ai-settings :is(h1,h2,h3,p,span,strong,label,legend) { font-family:var(--font-lexend),Lexend,system-ui,sans-serif!important; font-style:normal!important; letter-spacing:0!important; text-transform:none!important; }
  .sd-class-ai-settings__shell { width:calc(100% - (2 * clamp(12px,1.6vw,28px))); max-width:1800px; min-height:calc(100dvh - 118px); margin:22px auto 24px; border:7px solid #fff; border-radius:30px; background:linear-gradient(135deg,rgb(248 250 247 / .72),rgb(238 244 238 / .48)); padding:clamp(30px,3.2vw,48px) clamp(20px,3.2vw,54px) clamp(44px,5vw,78px); box-shadow:inset 0 1px 0 rgb(255 255 255 / .72),0 14px 34px rgb(24 33 38 / .12); backdrop-filter:blur(24px) saturate(1.04); }
  .sd-class-ai-settings__content { width:min(100%,760px); }
  .sd-class-ai-settings__mobile-brand { display:none; }
  .sd-class-ai-settings__header { display:grid; gap:10px; }
  .sd-class-ai-settings__eyebrow { display:inline-flex; width:max-content; align-items:center; gap:7px; margin:0; color:#681ce0; font-size:14px; font-weight:650; line-height:1.3; }
  .sd-class-ai-settings__header h1 { margin:0; color:#182126; font-size:clamp(30px,3.4vw,46px); font-weight:650; letter-spacing:0; line-height:1.1; }
  .sd-class-ai-settings__header > span { max-width:60ch; color:#53615c; font-size:15px; line-height:1.55; }
  .sd-class-ai-settings__back { display:inline-flex; width:max-content; min-height:42px; align-items:center; gap:8px; margin-top:26px; border:1px solid rgb(84 98 92 / .32); border-radius:8px; background:rgb(255 255 255 / .5); padding:10px 13px; color:#182126; font-size:14px; font-weight:600; text-decoration:none; }
  .sd-class-ai-settings__form { display:grid; gap:18px; margin-top:16px; }
  .sd-class-ai-settings__panel { display:grid; gap:10px; min-width:0; margin:0; border:1px solid rgb(255 255 255 / .76); border-radius:12px; background:linear-gradient(135deg,rgb(248 250 247 / .76),rgb(238 244 238 / .52)); padding:clamp(16px,2.4vw,24px); box-shadow:inset 0 1px 0 rgb(255 255 255 / .76),0 12px 28px rgb(24 33 38 / .1); backdrop-filter:blur(20px); }
  .sd-class-ai-settings__panel legend { padding:0 6px; color:#182126; font-size:16px; font-weight:650; }
  .sd-class-ai-settings__option { display:grid; min-height:88px; grid-template-columns:20px 42px minmax(0,1fr) auto; align-items:center; gap:13px; border:1px solid rgb(84 98 92 / .26); border-radius:10px; background:rgb(255 255 255 / .42); padding:14px; cursor:pointer; transition:border-color 160ms ease,background 160ms ease,box-shadow 160ms ease; }
  .sd-class-ai-settings__option:hover,.sd-class-ai-settings__option:focus-within { border-color:#8622ed; background:rgb(255 255 255 / .68); box-shadow:0 8px 18px rgb(24 33 38 / .08); }
  .sd-class-ai-settings__option input { width:18px; height:18px; margin:0; accent-color:#8622ed; }
  .sd-class-ai-settings__icon { display:grid; width:42px; height:42px; place-items:center; border-radius:8px; background:rgb(134 34 237 / .14); color:#681ce0; }
  .sd-class-ai-settings__option--yellow .sd-class-ai-settings__icon { background:rgb(232 245 107 / .64); color:#182126; }
  .sd-class-ai-settings__option--red .sd-class-ai-settings__icon { background:rgb(84 98 92 / .14); color:#53615c; }
  .sd-class-ai-settings__copy { display:grid; min-width:0; gap:4px; }
  .sd-class-ai-settings__copy strong { color:#182126; font-size:15px; font-weight:650; line-height:1.25; }
  .sd-class-ai-settings__copy span { color:#53615c; font-size:13px; line-height:1.42; }
  .sd-class-ai-settings__status { align-self:start; border:1px solid rgb(134 34 237 / .28); border-radius:6px; background:rgb(134 34 237 / .1); padding:5px 7px; color:#681ce0; font-size:12px; font-weight:650; line-height:1.2; }
  .sd-class-ai-settings__option--yellow .sd-class-ai-settings__status { border-color:rgb(166 180 35 / .38); background:rgb(232 245 107 / .58); color:#29351f; }
  .sd-class-ai-settings__option--red .sd-class-ai-settings__status { border-color:rgb(84 98 92 / .3); background:rgb(84 98 92 / .1); color:#53615c; }
  .sd-class-ai-settings__save { justify-self:end; min-height:46px; border:1px solid #681ce0!important; border-radius:8px!important; background:#8622ed!important; padding:11px 16px!important; color:#fff!important; font:650 14px/1.2 var(--font-lexend),Lexend,sans-serif!important; letter-spacing:0!important; text-transform:none!important; cursor:pointer; box-shadow:0 8px 18px rgb(134 34 237 / .22)!important; }
  .sd-class-ai-settings__back:hover,.sd-class-ai-settings__save:hover { filter:brightness(1.04); }
  .sd-class-ai-settings :is(a,button,input):focus-visible { outline:3px solid #8622ed; outline-offset:3px; }
  @media (max-width:900px) {
    .sd-class-ai-settings { min-height:100dvh!important; background:#d6dad6!important; padding:0 12px 108px!important; }
    .sd-class-ai-settings__shell { width:100%; min-height:100dvh; margin:0; border:0; border-radius:0; background:transparent; padding:24px 8px 28px; box-shadow:none; backdrop-filter:none; }
    .sd-class-ai-settings__mobile-brand { display:block; width:132px; margin:0 0 22px; }
    .sd-class-ai-settings__mobile-brand .sd-source-wordmark { width:132px; height:auto; }
    .sd-class-ai-settings__header h1 { font-size:32px; }
    .sd-class-ai-settings__back { margin-top:22px; }
    .sd-class-ai-settings__option { grid-template-columns:20px 40px minmax(0,1fr); gap:12px; }
    .sd-class-ai-settings__status { grid-column:3; width:max-content; }
    .sd-class-ai-settings__save { width:100%; }
  }
  @media (min-width:901px) { .sd-class-ai-settings + .sd-student-bottom-nav { display:none!important; } }
`;

const AI_MODES = [
  {
    value: "green",
    Icon: BookOpenCheck,
    label: "Full help",
    description: "Study help, planning, citation support, and guided scaffolds are available for this class.",
    status: "Available",
  },
  {
    value: "yellow",
    Icon: PencilRuler,
    label: "Citations only",
    description: "Diana can help with sources and citations, but not content-generating support.",
    status: "Citations",
  },
  {
    value: "red",
    Icon: LockKeyhole,
    label: "AI off",
    description: "AI help stays unavailable for this class. Diana still keeps assignments, sources, and rules organized.",
    status: "Off",
  },
] as const;

export default async function ClassAiSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: cls } = await supabase
    .from("classes")
    .select("id, name, ai_mode")
    .eq("id", id)
    .single();
  if (!cls) notFound();

  const currentMode = (cls.ai_mode ?? "green") as "green" | "yellow" | "red";

  async function action(formData: FormData) {
    "use server";
    const aiMode = String(formData.get("aiMode")) as "green" | "yellow" | "red";
    const classId = String(formData.get("classId"));
    await saveClassAiMode({ classId, aiMode });
    redirect(`/classes/${classId}`);
  }

  return (
    <>
      <style>{CLASS_AI_SETTINGS_STYLES}</style>
      <StudentDesktopNav active="Classes" />
      <ScreenDesignViewport className="sd-class-ai-settings diana-current-page" aria-label="Class AI rules">
        <main className="sd-class-ai-settings__shell" id="main-content">
          <div className="sd-class-ai-settings__content">
            <DianaWordmark tight tone="dark" className="sd-class-ai-settings__mobile-brand" />
            <header className="sd-class-ai-settings__header">
              <p className="sd-class-ai-settings__eyebrow"><ShieldCheck size={16} aria-hidden="true" /> Class AI rules</p>
              <h1>AI rules for {cls.name}</h1>
              <span>Choose how Diana can help in this subject. The class rule applies before any assignment-level setting.</span>
            </header>
            <Link href={`/classes/${id}`} className="sd-class-ai-settings__back">
              <ArrowLeft size={17} aria-hidden="true" />
              Back to {cls.name}
            </Link>
            <form action={action} className="sd-class-ai-settings__form">
              <input type="hidden" name="classId" value={id} />
              <fieldset className="sd-class-ai-settings__panel">
                <legend>How Diana can help</legend>
                {AI_MODES.map(({ value, Icon, label, description, status }) => (
                  <label key={value} className={`sd-class-ai-settings__option sd-class-ai-settings__option--${value}`}>
                    <input type="radio" name="aiMode" value={value} defaultChecked={currentMode === value} />
                    <span className="sd-class-ai-settings__icon"><Icon size={20} aria-hidden="true" /></span>
                    <span className="sd-class-ai-settings__copy">
                      <strong>{label}</strong>
                      <span>{description}</span>
                    </span>
                    <span className="sd-class-ai-settings__status">{status}</span>
                  </label>
                ))}
              </fieldset>
              <button type="submit" className="sd-class-ai-settings__save">Save class rule</button>
            </form>
          </div>
        </main>
      </ScreenDesignViewport>
      <StudentBottomNav />
    </>
  );
}
