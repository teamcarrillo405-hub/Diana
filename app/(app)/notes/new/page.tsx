import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
import { loadProfile } from "@/lib/profile";
import type { ClassCandidate } from "@/lib/notes/class-router";
import { createClient } from "@/lib/supabase/server";
import { NoteEditor } from "./note-editor";

type NoteMode = "text" | "voice" | "audio" | "photo-pdf";

export default async function NewNotePage({
  searchParams,
}: {
  searchParams: Promise<{ assignment?: string; class?: string; mode?: string }>;
}) {
  const { assignment, class: requestedClassId, mode } = await searchParams;
  const profile = await loadProfile();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let classCandidates: ClassCandidate[] = [];

  if (user) {
    const [{ data: classes }, { data: recentAssignments }] = await Promise.all([
      supabase
        .from("classes")
        .select("id, name")
        .eq("owner_id", user.id)
        .is("archived_at", null)
        .order("name", { ascending: true })
        .limit(20),
      supabase
        .from("assignments")
        .select("title, class_id, created_at")
        .eq("owner_id", user.id)
        .not("class_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const recentByClass = new Map<string, string[]>();
    for (const assignmentRow of recentAssignments ?? []) {
      if (!assignmentRow.class_id || !assignmentRow.title) continue;
      const list = recentByClass.get(assignmentRow.class_id) ?? [];
      if (list.length < 10) list.push(assignmentRow.title);
      recentByClass.set(assignmentRow.class_id, list);
    }

    classCandidates = (classes ?? []).map((classRow) => ({
      id: classRow.id,
      name: classRow.name,
      recentTitles: recentByClass.get(classRow.id) ?? [],
    }));
  }

  const initialMode: NoteMode = mode === "voice" || mode === "audio" || mode === "photo-pdf" ? mode : "text";
  const initialClassId = classCandidates.some((candidate) => candidate.id === requestedClassId)
    ? requestedClassId ?? null
    : null;

  return <ScreenDesignViewport className="sd-note-capture-screen diana-current-page" aria-label="Capture a note">
    <style>{NOTE_CAPTURE_STYLES}</style>
    <StudentDesktopNav active="More" displayName={profile?.display_name} photoUrl={profile?.photo_url} photoOffsetX={profile?.photo_offset_x} photoOffsetY={profile?.photo_offset_y} />
    <main id="main-content" className="sd-note-capture-main" tabIndex={-1}>
      <header className="sd-note-capture-heading">
        <p>Notes</p>
        <div className="sd-note-capture-title-row">
          <h1>Capture a note.</h1>
          <span className="sd-note-capture-help">
            <button type="button" aria-label="How note capture works" aria-describedby="note-capture-help-text"><span aria-hidden="true">i</span></button>
            <span id="note-capture-help-text" role="tooltip">Choose a class to save your note there. General notes stay in Think Studio until you are ready to sort them.</span>
          </span>
        </div>
        <p className="sd-note-capture-subcopy">Type, record, or add a photo, PDF, or audio file. Your note stays yours.</p>
      </header>
      <NoteEditor assignmentId={assignment ?? null} initialClassId={initialClassId} initialMode={initialMode} classCandidates={classCandidates} />
    </main>
    <StudentBottomNav />
  </ScreenDesignViewport>;
}

const NOTE_CAPTURE_STYLES = `
  .sd-note-capture-screen .notes-audio-capture{display:grid;gap:14px}.sd-note-capture-screen .notes-audio-recording-control,.sd-note-capture-screen .notes-audio-ready,.sd-note-capture-screen .notes-audio-file-picker{display:grid;gap:10px;border:1px solid rgb(24 33 38 / .22);border-radius:12px 18px 12px 18px;background:rgb(255 255 255 / .42);padding:20px}.sd-note-capture-screen .notes-audio-recording-control p,.sd-note-capture-screen .notes-audio-recording-control span,.sd-note-capture-screen .notes-audio-ready strong,.sd-note-capture-screen .notes-audio-ready span,.sd-note-capture-screen .notes-audio-file-picker span,.sd-note-capture-screen .notes-audio-file-picker small{margin:0}.sd-note-capture-screen .notes-audio-recording-control p,.sd-note-capture-screen .notes-audio-ready strong{color:#182126;font-size:16px;font-weight:620}.sd-note-capture-screen .notes-audio-recording-control span,.sd-note-capture-screen .notes-audio-ready span,.sd-note-capture-screen .notes-audio-file-picker small,.sd-note-capture-screen .notes-audio-message{color:#53615c;font-size:14px;line-height:1.45}.sd-note-capture-screen .notes-audio-file-picker>span{display:flex;align-items:center;gap:8px;color:#182126;font-size:16px;font-weight:620}.sd-note-capture-screen .notes-audio-file-picker input{min-height:44px;color:#182126}.sd-note-capture-screen .notes-audio-waveform{display:grid;gap:7px;max-width:360px}.sd-note-capture-screen .notes-audio-waveform-bars{display:flex;height:36px;align-items:center;gap:3px}.sd-note-capture-screen .notes-audio-waveform-bars i{display:block;width:5px;min-height:5px;height:calc(5px + (var(--voice-level) * (9px + ((var(--wave-index, 1) % 5) * 5px))));border-radius:999px;background:#182126;opacity:calc(.3 + (var(--voice-level) * .7));transition:height 80ms linear,opacity 80ms linear}.sd-note-capture-screen .notes-audio-waveform-bars i:nth-child(2n){--wave-index:2}.sd-note-capture-screen .notes-audio-waveform-bars i:nth-child(3n){--wave-index:3}.sd-note-capture-screen .notes-audio-waveform-bars i:nth-child(5n){--wave-index:4}.sd-note-capture-screen .notes-audio-waveform-bars i:nth-child(7n){--wave-index:5}.sd-note-capture-screen .notes-audio-waveform small{color:#53615c;font-size:13px;line-height:1.4}.sd-note-capture-screen .notes-audio-recording-control>button,.sd-note-capture-screen .notes-audio-ready>button{display:inline-flex;min-height:48px;width:max-content;align-items:center;justify-content:center;gap:8px;border:1px solid #c6d23f;border-radius:8px;background:#e8f56b;padding:0 16px;color:#141d20;font:500 14px/1 var(--font-lexend),Lexend,sans-serif}.sd-note-capture-screen .notes-audio-recording-control>button[data-recording]{border-color:#182126;background:#182126;color:#fff;box-shadow:0 0 0 4px rgb(232 245 107 / .42)}.sd-note-capture-screen .notes-audio-ready audio{width:100%;height:40px}.sd-note-capture-screen .notes-audio-message.is-error{color:#765712}
  .sd-note-capture-screen .notes-doc-capture{display:grid;gap:14px}.sd-note-capture-screen .notes-doc-file-picker{display:grid;gap:10px;border:1px solid rgb(24 33 38 / .22);border-radius:12px 18px 12px 18px;background:rgb(255 255 255 / .42);padding:20px}.sd-note-capture-screen .notes-doc-file-picker>span{display:flex;align-items:center;gap:8px;color:#182126!important;font-size:16px;font-weight:620}.sd-note-capture-screen .notes-doc-file-picker small{color:#53615c;font-size:14px;line-height:1.45}.sd-note-capture-screen .notes-doc-file-input{min-height:44px;color:#182126}.sd-note-capture-screen .notes-doc-message{margin:0;color:#53615c;font-size:14px;line-height:1.45}.sd-note-capture-screen .notes-doc-message.is-warning{border:1px solid rgb(118 87 18 / .3);border-radius:10px;background:rgb(232 245 107 / .28);padding:10px 12px;color:#5d4811}
  .sd-note-capture-screen .notes-tab-control button:not(.is-active){border-color:transparent!important;background:transparent!important;color:#53615c!important}.sd-note-capture-screen .notes-tab-control button.is-active{border-color:rgb(24 33 38 / .26)!important;background:rgb(255 255 255 / .82)!important;color:#182126!important}
  @media (min-width:540px){.sd-note-capture-screen .notes-audio-recording-control{grid-template-columns:minmax(0,1fr) auto;align-items:center}.sd-note-capture-screen .notes-audio-recording-control>p{grid-column:1;grid-row:1}.sd-note-capture-screen .notes-audio-recording-control>span{grid-column:1;grid-row:2}.sd-note-capture-screen .notes-audio-recording-control>.notes-audio-waveform{grid-column:1;grid-row:3}.sd-note-capture-screen .notes-audio-recording-control>button{grid-column:2;grid-row:1 / span 3}}
  .diana-authenticated-field:has(.sd-note-capture-screen){padding-bottom:0!important}.app-command-frame:has(.sd-note-capture-screen){width:100%!important;max-width:none!important;padding:0!important}.diana-app-shell:has(.sd-note-capture-screen) .agent-fab-anchor,.diana-authenticated-field:has(.sd-note-capture-screen) .diana-mobile-command{display:none!important}
  .sd-note-capture-screen{min-height:100dvh;background:#d6dad6;color:#182126;font-family:var(--font-lexend),Lexend,sans-serif}.sd-note-capture-main{width:min(960px,calc(100% - 48px));margin:0 auto;padding:clamp(46px,7vw,92px) 0 96px}.sd-note-capture-heading{max-width:680px;margin-bottom:30px}.sd-note-capture-heading>p:first-child{margin:0 0 8px;color:#53615c;font-size:14px;font-weight:550}.sd-note-capture-title-row{display:flex;align-items:center;gap:12px}.sd-note-capture-heading h1{margin:0;color:#182126;font-size:clamp(30px,4vw,48px);font-weight:620;line-height:1.04}.sd-note-capture-subcopy{max-width:52ch;margin:12px 0 0;color:#53615c;font-size:15px;line-height:1.5}
  .sd-note-capture-help{position:relative;display:inline-flex;flex:none}.sd-note-capture-help>button{display:grid!important;box-sizing:border-box!important;flex:0 0 22px!important;inline-size:22px!important;block-size:22px!important;width:22px!important;min-width:22px!important;height:22px!important;min-height:22px!important;padding:0!important;place-items:center;appearance:none;border:1px solid rgb(24 33 38 / .48)!important;border-radius:50%!important;background:rgb(255 255 255 / .48)!important;color:#182126!important}.sd-note-capture-help>button>span{font-family:Georgia,serif;font-size:15px;font-style:italic;font-weight:700;line-height:1}.sd-note-capture-help>[role=tooltip]{position:absolute;z-index:10;top:calc(100% + 10px);left:50%;width:min(300px,calc(100vw - 40px));transform:translateX(-50%);border:1px solid rgb(255 255 255 / .78);border-radius:10px;background:#182126;padding:12px 14px;color:#fff;font-size:14px;line-height:1.45;opacity:0;pointer-events:none}.sd-note-capture-help:hover>[role=tooltip],.sd-note-capture-help:focus-within>[role=tooltip]{opacity:1}
  .sd-note-capture-screen .notes-editor-shell{display:grid!important;gap:20px!important;border:1px solid rgb(255 255 255 / .72)!important;border-radius:14px 24px 14px 24px!important;background:linear-gradient(135deg,rgb(248 250 247 / .86),rgb(237 244 238 / .68))!important;padding:clamp(22px,4vw,38px)!important;box-shadow:inset 0 1px 0 rgb(255 255 255 / .72),0 18px 42px rgb(24 33 38 / .13)!important;backdrop-filter:blur(24px) saturate(1.04)!important;-webkit-backdrop-filter:blur(24px) saturate(1.04)!important}.sd-note-capture-screen .notes-editor-field{display:grid!important;gap:8px!important;min-width:0!important;color:#394742!important;font-size:14px!important;font-weight:550!important}.sd-note-capture-screen .notes-editor-field>span small{color:#68756f;font-size:12px;font-weight:400}.sd-note-capture-screen :is(.notes-editor-input,.notes-editor-textarea){width:100%!important;min-height:46px!important;border:1px solid rgb(24 33 38 / .25)!important;border-radius:8px!important;background:rgb(255 255 255 / .72)!important;padding:11px 12px!important;color:#182126!important;font:400 15px/1.5 var(--font-lexend),Lexend,sans-serif!important;box-shadow:none!important}.sd-note-capture-screen .notes-editor-textarea{min-height:250px!important;resize:vertical!important}
  .sd-note-capture-screen .notes-tab-control{display:flex!important;gap:8px!important;overflow:auto!important;border-bottom:1px solid rgb(24 33 38 / .18)!important;padding-bottom:18px!important}.sd-note-capture-screen .notes-tab-control button{display:inline-flex!important;min-height:44px!important;flex:0 0 auto!important;align-items:center!important;justify-content:center!important;border:1px solid transparent!important;border-radius:8px!important;background:transparent!important;padding:0 13px!important;color:#53615c!important;font:500 14px/1 var(--font-lexend),Lexend,sans-serif!important}.sd-note-capture-screen .notes-tab-control button.is-active{border-color:rgb(24 33 38 / .26)!important;background:rgb(255 255 255 / .74)!important;color:#182126!important}.sd-note-capture-screen .notes-editor-footer{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:20px!important;border-top:1px solid rgb(24 33 38 / .18)!important;padding-top:20px!important}.sd-note-capture-screen .notes-editor-footer p{margin:0!important;color:#53615c!important;font-size:13px!important;line-height:1.45!important}.sd-note-capture-screen .notes-editor-done{min-height:44px!important;border:1px solid #c6d23f!important;border-radius:8px!important;background:#e8f56b!important;padding:0 16px!important;color:#141d20!important;font:500 14px/1 var(--font-lexend),Lexend,sans-serif!important}.sd-note-capture-screen button:focus-visible,.sd-note-capture-screen :is(input,select,textarea):focus-visible{outline:3px solid rgb(24 33 38 / .42)!important;outline-offset:2px!important}
  @media (min-width:901px){.sd-note-capture-screen>.sd-student-desktop-nav{position:sticky;z-index:20;top:0;display:block;background:#d6dad6}.sd-note-capture-screen>.sd-student-bottom-nav{display:none}}@media (max-width:900px){.sd-note-capture-screen>.sd-student-desktop-nav{display:none}.sd-note-capture-main{width:min(100% - 32px,620px);padding:32px 0 104px}.sd-note-capture-heading{margin-bottom:22px}.sd-note-capture-heading h1{font-size:32px}.sd-note-capture-title-row{align-items:flex-start;gap:10px}.sd-note-capture-screen .notes-editor-shell{padding:20px!important}.sd-note-capture-screen .notes-editor-footer{align-items:stretch!important;flex-direction:column!important}.sd-note-capture-screen .notes-editor-done{width:100%!important}}
`;
