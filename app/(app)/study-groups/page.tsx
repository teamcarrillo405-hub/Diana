import { redirect } from "next/navigation";

import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { memberScopedGroupRows } from "@/lib/social/collaboration";
import { createClient } from "@/lib/supabase/server";
import { StudyGroupsClient, type StudyGroupWorkspace } from "./study-groups-client";

const STUDY_GROUP_STYLES = `
  .diana-authenticated-field:has(.sd-study-groups) { padding-bottom:0!important; }
  .app-command-frame:has(.sd-study-groups) { padding:0!important; }
  .app-command-frame:has(.sd-study-groups) .diana-mobile-command,
  .diana-app-shell:has(.sd-study-groups) .agent-fab-anchor { display:none!important; }
  .diana-app:has(.sd-study-groups) nextjs-portal { display:none!important; }
  .diana-app:has(.sd-study-groups) .skip-link { transition:none; }
  .diana-app:has(.sd-study-groups) .skip-link:focus { transform:translateY(0)!important; }
  .sd-study-groups { display:flex; height:max(100dvh,852px); max-height:max(100dvh,852px); flex-direction:column; overflow:hidden; background:#0f172a; color:#fff; font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
  .sd-study-groups * { box-sizing:border-box; }
  .sd-study-groups button,.sd-study-groups input,.sd-study-groups textarea { font:inherit; }
  .sd-study-groups button:focus-visible,.sd-study-groups input:focus-visible,.sd-study-groups textarea:focus-visible,.sd-study-groups a:focus-visible { outline:2px solid #74c0ff; outline-offset:3px; }
  .sd-study-header { position:relative; z-index:30; flex:none; border-bottom:1px solid rgb(255 255 255 / .05); background:rgb(15 23 42 / .85); padding:52px 24px 16px; backdrop-filter:blur(12px); }
  .sd-study-header-row { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
  .sd-study-header .sd-source-wordmark { width:auto; height:16px; margin-bottom:8px; opacity:.92; }
  .sd-study-header h1 { margin:0; color:#f8fafc; font-size:25px; font-style:italic; font-weight:950; letter-spacing:-.055em; line-height:.82; text-transform:uppercase; }
  .sd-study-header h1 span { color:#ff79da; }
  .sd-study-header p { margin:10px 0 0; color:#94a3b8; font-size:9px; font-weight:950; letter-spacing:.2em; text-transform:uppercase; }
  .sd-study-timer { display:flex; align-items:center; gap:8px; border:1px solid rgb(255 255 255 / .1); border-radius:14px; background:rgb(255 255 255 / .05); padding:9px 12px; color:#f8fafc; }
  .sd-study-timer svg { color:#ff79da; }
  .sd-study-timer strong { font-size:17px; font-style:italic; font-weight:950; }
  .sd-study-scroll { position:relative; min-height:0; flex:1; overflow-y:auto; padding:16px 24px 120px; scrollbar-width:none; }
  .sd-study-scroll::-webkit-scrollbar { display:none; }
  .sd-study-hero { position:relative; overflow:hidden; aspect-ratio:16/9; border:1px solid rgb(255 255 255 / .06); border-radius:24px; background:#111c32; box-shadow:0 18px 35px rgb(0 0 0 / .28); }
  .sd-study-hero .sd-source-media { width:100%; height:100%; object-fit:cover; }
  .sd-study-hero::after { position:absolute; inset:0; background:linear-gradient(180deg,transparent 25%,rgb(15 23 42 / .9)); content:""; }
  .sd-study-hero-copy { position:absolute; z-index:2; right:15px; bottom:14px; left:15px; display:flex; align-items:center; gap:8px; color:#f8fafc; font-size:9px; font-weight:950; letter-spacing:.11em; text-transform:uppercase; }
  .sd-study-live-dot { width:8px; height:8px; border-radius:999px; background:#2dd4bf; box-shadow:0 0 12px rgb(45 212 191 / .8); }
  .sd-study-roster { display:grid; gap:12px; margin-top:25px; }
  .sd-study-section-head { display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .sd-study-section-head h2 { margin:0; color:#94a3b8; font-size:10px; font-style:italic; font-weight:950; letter-spacing:.18em; text-transform:uppercase; }
  .sd-study-invite { border:0; background:transparent; padding:4px 0; color:#74c0ff; font-size:8px; font-weight:950; letter-spacing:.12em; text-transform:uppercase; }
  .sd-study-members { display:flex; gap:15px; overflow-x:auto; padding:2px 1px 6px; scrollbar-width:none; }
  .sd-study-members::-webkit-scrollbar { display:none; }
  .sd-study-member { display:grid; min-width:66px; justify-items:center; gap:7px; }
  .sd-study-avatar { position:relative; width:59px; height:59px; border:2px solid #74c0ff; border-radius:999px; padding:3px; }
  .sd-study-avatar .sd-source-media { width:100%; height:100%; border-radius:999px; object-fit:cover; }
  .sd-study-avatar-badge { position:absolute; right:-3px; bottom:-3px; display:grid; width:21px; height:21px; place-items:center; border:1px solid rgb(255 255 255 / .12); border-radius:999px; background:#0f172a; color:#ff79da; }
  .sd-study-member strong { max-width:72px; overflow:hidden; color:#f8fafc; font-size:8px; font-style:italic; font-weight:950; text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap; }
  .sd-study-primary { display:grid; gap:9px; margin-top:22px; }
  .sd-study-join { display:flex; min-height:47px; align-items:center; justify-content:center; gap:8px; border:0; border-radius:13px; background:linear-gradient(100deg,#74c0ff,#ff79da); color:#0f172a; font-size:10px; font-style:italic; font-weight:950; letter-spacing:.1em; text-transform:uppercase; box-shadow:0 0 22px rgb(116 192 255 / .18); }
  .sd-study-room-meta { display:flex; align-items:center; justify-content:space-between; gap:10px; color:#94a3b8; font-size:8px; font-weight:800; text-transform:uppercase; }
  .sd-study-room-meta code { color:#74c0ff; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:8px; }
  .sd-study-message { display:flex; align-items:center; gap:9px; margin-top:18px; border:1px solid rgb(255 255 255 / .09); border-radius:999px; background:rgb(255 255 255 / .045); padding:10px 13px; color:#64748b; }
  .sd-study-message span { flex:1; font-size:9px; }
  .sd-study-message svg { color:#74c0ff; }
  .sd-study-status { margin:10px 0 0; border:1px solid rgb(116 192 255 / .2); border-radius:10px; background:rgb(116 192 255 / .06); padding:9px 10px; color:#cbd5e1; font-size:9px; line-height:1.4; }
  .sd-study-tools { display:grid; gap:10px; margin-top:22px; }
  .sd-study-tools details { border:1px solid rgb(255 255 255 / .09); border-radius:14px; background:rgb(255 255 255 / .04); padding:13px; }
  .sd-study-tools summary { cursor:pointer; color:#f8fafc; font-size:9px; font-style:italic; font-weight:950; letter-spacing:.09em; text-transform:uppercase; }
  .sd-study-tool-body { display:grid; gap:9px; padding-top:12px; }
  .sd-study-tool-body label { display:grid; gap:5px; color:#94a3b8; font-size:8px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; }
  .sd-study-tool-body input,.sd-study-tool-body textarea { width:100%; border:1px solid rgb(255 255 255 / .1); border-radius:10px; background:rgb(255 255 255 / .04); padding:10px 11px; color:#f8fafc; font-size:10px; }
  .sd-study-tool-body textarea { min-height:80px; resize:vertical; }
  .sd-study-tool-body button { min-height:39px; border:0; border-radius:10px; background:#74c0ff; color:#0f172a; font-size:8px; font-weight:950; letter-spacing:.08em; text-transform:uppercase; }
  .sd-study-tool-body a { border:1px solid rgb(255 255 255 / .1); border-radius:10px; padding:9px 10px; color:#f8fafc; font-size:9px; text-decoration:none; }
  .sd-study-tool-note { margin:0; color:#94a3b8; font-size:8px; line-height:1.45; }
  .sd-study-community-privacy { display:flex; align-items:center; gap:8px; margin:0 0 16px; border:1px solid rgb(116 192 255 / .2); border-radius:12px; background:rgb(116 192 255 / .05); padding:10px 12px; color:#cbd5e1; font-size:8px; line-height:1.4; }
  .sd-study-community-privacy svg { flex:none; color:#74c0ff; }
  .sd-study-activity-spotlight { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
  .sd-study-activity-card { display:grid; min-height:130px; align-content:end; justify-items:center; gap:7px; border:1px solid rgb(255 255 255 / .1); border-radius:18px; background:linear-gradient(180deg,rgb(116 192 255 / .08),rgb(255 121 218 / .06)); padding:14px 10px; }
  .sd-study-activity-card .sd-source-media { width:53px; height:53px; border:2px solid #74c0ff; border-radius:999px; object-fit:cover; }
  .sd-study-activity-card strong { max-width:100%; overflow:hidden; color:#f8fafc; font-size:9px; font-style:italic; font-weight:950; text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap; }
  .sd-study-activity-card small { color:#94a3b8; font-size:7px; font-weight:900; text-transform:uppercase; }
  .sd-study-groups-list { display:grid; gap:9px; margin-top:24px; }
  .sd-study-group-link { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:12px; border:1px solid rgb(255 255 255 / .1); border-radius:14px; background:rgb(255 255 255 / .05); padding:13px; color:#f8fafc; text-decoration:none; }
  .sd-study-group-link strong { display:block; font-size:10px; font-style:italic; font-weight:950; text-transform:uppercase; }
  .sd-study-group-link small { display:block; margin-top:4px; color:#94a3b8; font-size:8px; text-transform:uppercase; }
  .sd-study-group-link span { color:#74c0ff; font-size:8px; font-weight:950; text-transform:uppercase; }
  .sd-study-empty { border:1px dashed rgb(116 192 255 / .22); border-radius:16px; padding:20px 15px; color:#94a3b8; font-size:10px; line-height:1.5; text-align:center; }
  .sd-study-groups > .sd-student-bottom-nav { position:relative; z-index:60; flex:none; }
  .diana-app .sd-study-groups button { clip-path:none; transform:none; }
  .diana-app .sd-study-join { display:flex; width:100%; min-height:47px; border:0; border-radius:13px; background:linear-gradient(100deg,#74c0ff,#ff79da); padding:0 14px; color:#0f172a; box-shadow:0 0 22px rgb(116 192 255 / .18); }
  .diana-app .sd-study-invite { display:inline-flex; width:auto; min-height:auto; border:0; border-radius:0; background:transparent; padding:4px 0; color:#74c0ff; box-shadow:none; }
  .diana-app .sd-study-tool-body button { display:flex; width:100%; min-height:39px; border:0; border-radius:10px; background:#74c0ff; padding:0 12px; color:#0f172a; box-shadow:none; }
  @media (min-width:700px) { .sd-study-activity-spotlight { grid-template-columns:repeat(4,minmax(0,1fr)); } }
  @media (prefers-reduced-motion:reduce) { .sd-study-groups * { scroll-behavior:auto!important; transition:none!important; } }
`;

export default async function StudyGroupsPage({
  searchParams,
}: {
  searchParams?: Promise<{ group?: string; view?: string; sdState?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const [{ data: visibleGroups }, { data: ownMemberships }] = await Promise.all([
    supabase
      .from("study_groups")
      .select("id, owner_id, name, subject, join_code, visibility, created_at")
      .order("updated_at", { ascending: false }),
    supabase
      .from("study_group_members")
      .select("group_id, owner_id")
      .eq("owner_id", user.id),
  ]);

  // RLS is authoritative. This second, explicit scope prevents an accidentally
  // over-broad client or future policy from turning community activity public.
  const groupRows = memberScopedGroupRows(visibleGroups ?? [], ownMemberships ?? [], user.id);
  const selectedGroup =
    groupRows.find((group) => group.id === params?.group) ?? groupRows[0] ?? null;

  let workspace: StudyGroupWorkspace | null = null;
  if (selectedGroup) {
    const membership = ownMemberships?.some((row) => row.group_id === selectedGroup.id);
    if (membership || selectedGroup.owner_id === user.id) {
      const [members, sessions, decks, notes] = await Promise.all([
        supabase
          .from("study_group_members")
          .select("owner_id, display_name, role, joined_at")
          .eq("group_id", selectedGroup.id)
          .order("joined_at", { ascending: true }),
        supabase
          .from("study_group_sessions")
          .select("id, owner_id, title, work_minutes, break_minutes, starts_at, status, created_at")
          .eq("group_id", selectedGroup.id)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("shared_flashcard_decks")
          .select("id, title, source, created_at")
          .eq("group_id", selectedGroup.id)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("collaborative_notes")
          .select("id, title, body_text, version, updated_at")
          .eq("group_id", selectedGroup.id)
          .order("updated_at", { ascending: false })
          .limit(1),
      ]);

      const deckIds = (decks.data ?? []).map((deck) => deck.id);
      const cardsByDeck =
        deckIds.length === 0 ? new Map<string, number>() : await loadDeckCardCounts(supabase, deckIds);
      const sessionRows = sessions.data ?? [];

      workspace = {
        group: selectedGroup,
        currentDisplayName:
          members.data?.find((member) => member.owner_id === user.id)?.display_name ??
          user.email?.split("@")[0] ??
          "Student",
        members: (members.data ?? []).map((member) => ({
          ...member,
          sessionCount: sessionRows.filter((session) => session.owner_id === member.owner_id).length,
        })),
        sessions: sessionRows,
        decks: (decks.data ?? []).map((deck) => ({
          ...deck,
          cardCount: cardsByDeck.get(deck.id) ?? 0,
        })),
        note: notes.data?.[0] ?? null,
      };
    }
  }

  const view =
    params?.view === "community" || params?.sdState === "view=community"
      ? "community"
      : "room";

  return (
    <ScreenDesignViewport className="sd-study-groups" aria-label={view === "community" ? "Community activity" : "Study room"}>
      <style>{STUDY_GROUP_STYLES}</style>
      <StudyGroupsClient
        groups={groupRows}
        selectedGroupId={selectedGroup?.id ?? null}
        workspace={workspace}
        view={view}
      />
    </ScreenDesignViewport>
  );
}

async function loadDeckCardCounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  deckIds: string[],
): Promise<Map<string, number>> {
  const { data } = await supabase
    .from("shared_flashcard_cards")
    .select("deck_id")
    .in("deck_id", deckIds);
  const counts = new Map<string, number>();
  for (const row of data ?? []) counts.set(row.deck_id, (counts.get(row.deck_id) ?? 0) + 1);
  return counts;
}
