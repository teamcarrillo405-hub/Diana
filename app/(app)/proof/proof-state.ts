export type CompletedProofRow = {
  id: string | number;
  occurred_at: string;
  assignments?:
    | { id?: string | null; title?: string | null; kind?: string | null }
    | Array<{ id?: string | null; title?: string | null; kind?: string | null }>
    | null;
};

export type AuthorshipProofRow = {
  assignment_id?: string | null;
};

export type ProofMilestone = {
  assignmentId: string;
  title: string;
  kind: string;
  occurredAt: string;
  hasAuthorshipReceipt: boolean;
};

export function selectLatestProofMilestone({
  requested,
  completed,
  authorship,
}: {
  requested: boolean;
  completed: CompletedProofRow[];
  authorship: AuthorshipProofRow[];
}): ProofMilestone | null {
  if (!requested) return null;

  for (const row of completed) {
    const assignment = Array.isArray(row.assignments)
      ? row.assignments[0]
      : row.assignments;
    const assignmentId = assignment?.id?.trim();
    const title = assignment?.title?.trim();
    const kind = assignment?.kind?.trim();
    if (!assignmentId || !title) continue;

    return {
      assignmentId,
      title,
      kind: kind || "completed work",
      occurredAt: row.occurred_at,
      hasAuthorshipReceipt: authorship.some(
        (receipt) => receipt.assignment_id === assignmentId,
      ),
    };
  }

  return null;
}
