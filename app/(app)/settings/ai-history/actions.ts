"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import {
  aiFeatureLabel,
  csvCell,
  mergeAiHistoryEntries,
  type AiHistoryEntry,
  type AiHistoryKind,
  type AiInteractionSourceRow,
  type AuthorshipSourceRow,
} from "../source-models";

const EntryIdentity = z.object({
  kind: z.enum(["interaction", "authorship"]),
  id: z.string().uuid(),
});

type AssignmentJoin =
  | { title?: string }
  | readonly { title?: string }[]
  | null
  | undefined;

function assignmentTitle(join: AssignmentJoin): string | null {
  if (Array.isArray(join)) return join[0]?.title ?? null;
  return (join as { title?: string } | null | undefined)?.title ?? null;
}

export async function getAiHistory(limit = 100): Promise<readonly AiHistoryEntry[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const safeLimit = Math.min(10_000, Math.max(1, Math.trunc(limit)));
  const [interactionResult, authorshipResult] = await Promise.all([
    supabase
      .from("ai_interactions")
      .select(
        "id, created_at, feature, assignment_id, model, prompt_summary, tokens_used, assignments(title)",
      )
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(safeLimit),
    supabase
      .from("authorship_log")
      .select("id, created_at, actor, event_type, assignment_id, assignments(title)")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(safeLimit),
  ]);

  if (interactionResult.error || authorshipResult.error) {
    return [];
  }

  const interactions = (interactionResult.data ?? []).map(
    (row): AiInteractionSourceRow => ({
      id: row.id,
      created_at: row.created_at,
      feature: row.feature,
      assignment_id: row.assignment_id,
      assignment_title: assignmentTitle(
        (row as { assignments?: AssignmentJoin }).assignments,
      ),
      model: row.model,
      prompt_summary: row.prompt_summary,
      tokens_used: row.tokens_used,
    }),
  );
  const authorship = (authorshipResult.data ?? []).map(
    (row): AuthorshipSourceRow => ({
      id: row.id,
      created_at: row.created_at,
      actor: row.actor as AuthorshipSourceRow["actor"],
      event_type: row.event_type,
      assignment_id: row.assignment_id,
      assignment_title: assignmentTitle(
        (row as { assignments?: AssignmentJoin }).assignments,
      ),
    }),
  );

  return mergeAiHistoryEntries(interactions, authorship).slice(0, safeLimit);
}

export async function deleteAiHistoryEntry(
  kind: AiHistoryKind,
  id: string,
  _formData: FormData,
): Promise<void> {
  const parsed = EntryIdentity.safeParse({ kind, id });
  if (!parsed.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const table =
    parsed.data.kind === "interaction" ? "ai_interactions" : "authorship_log";
  await supabase
    .from(table)
    .delete()
    .eq("id", parsed.data.id)
    .eq("owner_id", user.id);
  revalidatePath("/settings/ai-history");
}

export async function exportAiHistoryCsv(): Promise<string> {
  const rows = await getAiHistory(10_000);
  const header =
    "created_at,record_type,work_owner,feature,assignment_id,assignment_title,model,summary,tokens_used";
  const lines = rows.map((row) =>
    [
      row.createdAt,
      row.kind,
      row.workOwnerLabel,
      aiFeatureLabel(row.feature),
      row.assignmentId,
      row.assignmentTitle,
      row.model,
      row.summary,
      row.tokensUsed,
    ]
      .map(csvCell)
      .join(","),
  );
  return [header, ...lines].join("\n");
}
