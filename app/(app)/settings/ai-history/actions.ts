"use server";

import { createClient } from "@/lib/supabase/server";

export interface AiInteractionRow {
  id: string;
  created_at: string;
  feature: string;
  assignment_id: string | null;
  assignment_title: string | null;
  model: string;
  prompt_summary: string | null;
  tokens_used: number;
}

export async function getAiHistory(limit = 100): Promise<AiInteractionRow[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("ai_interactions")
    .select("id, created_at, feature, assignment_id, model, prompt_summary, tokens_used, assignments(title)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  // The join may come back as `assignments: { title: string } | null` (single row)
  // OR `assignments: { title: string }[] | null` (array) depending on Supabase
  // client version. Normalize:
  return (data ?? []).map((row): AiInteractionRow => {
    const j = (row as { assignments?: { title?: string } | { title?: string }[] | null }).assignments;
    const title = Array.isArray(j) ? (j[0]?.title ?? null) : (j?.title ?? null);
    return {
      id: row.id,
      created_at: row.created_at,
      feature: row.feature,
      assignment_id: row.assignment_id,
      assignment_title: title,
      model: row.model,
      prompt_summary: row.prompt_summary,
      tokens_used: row.tokens_used,
    };
  });
}

function csvEscape(v: string | number | null): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function exportAiHistoryCsv(): Promise<string> {
  const rows = await getAiHistory(10_000); // export all (or cap)
  const header = "created_at,feature,assignment_id,assignment_title,model,prompt_summary,tokens_used";
  const lines = rows.map((r) =>
    [
      csvEscape(r.created_at),
      csvEscape(r.feature),
      csvEscape(r.assignment_id),
      csvEscape(r.assignment_title),
      csvEscape(r.model),
      csvEscape(r.prompt_summary),
      csvEscape(r.tokens_used),
    ].join(","),
  );
  return [header, ...lines].join("\n");
}
