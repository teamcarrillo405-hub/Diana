import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudyGroupsClient, type StudyGroupWorkspace } from "./study-groups-client";

export default async function StudyGroupsPage({
  searchParams,
}: {
  searchParams?: Promise<{ group?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const { data: groups } = await supabase
    .from("study_groups")
    .select("id, name, subject, join_code, visibility, created_at")
    .order("updated_at", { ascending: false });

  const groupRows = groups ?? [];
  const selectedGroup =
    groupRows.find((group) => group.id === params?.group) ?? groupRows[0] ?? null;

  let workspace: StudyGroupWorkspace | null = null;
  if (selectedGroup) {
    const [
      members,
      sessions,
      decks,
      notes,
      explanations,
      tasks,
    ] = await Promise.all([
      supabase
        .from("study_group_members")
        .select("owner_id, display_name, role, joined_at")
        .eq("group_id", selectedGroup.id)
        .order("joined_at", { ascending: true }),
      supabase
        .from("study_group_sessions")
        .select("id, title, work_minutes, break_minutes, starts_at, status, created_at")
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
      supabase
        .from("peer_explanations")
        .select("id, concept, explanation, created_at")
        .eq("group_id", selectedGroup.id)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("group_project_tasks")
        .select("id, title, assignee_name, status, due_at, created_at")
        .eq("group_id", selectedGroup.id)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    const deckIds = (decks.data ?? []).map((deck) => deck.id);
    const cardsByDeck =
      deckIds.length === 0
        ? new Map<string, number>()
        : await loadDeckCardCounts(supabase, deckIds);

    workspace = {
      group: selectedGroup,
      memberCount: members.data?.length ?? 0,
      sessions: sessions.data ?? [],
      decks: (decks.data ?? []).map((deck) => ({
        ...deck,
        cardCount: cardsByDeck.get(deck.id) ?? 0,
      })),
      note: notes.data?.[0] ?? null,
      explanations: explanations.data ?? [],
      tasks: tasks.data ?? [],
    };
  }

  return (
    <div className="diana-page">
      <StudyGroupsClient
        groups={groupRows}
        selectedGroupId={selectedGroup?.id ?? null}
        workspace={workspace}
      />
    </div>
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
  for (const row of data ?? []) {
    counts.set(row.deck_id, (counts.get(row.deck_id) ?? 0) + 1);
  }
  return counts;
}
