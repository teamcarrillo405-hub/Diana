import { NextResponse } from "next/server";

import { renderAssignmentSubmissionPdf } from "@/lib/assignment-submission-pdf";
import { loadAssignmentSubmissionBundle } from "@/lib/assignment-submission-server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const bundle = await loadAssignmentSubmissionBundle({ supabase: supabase as any, ownerId: user.id, assignmentId: id });
  if (!bundle) return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  if (!bundle.preview.textPayload.trim() && bundle.preview.problems.every((problem) => !problem.inkData.trim())) {
    return NextResponse.json({ error: "Add your work before downloading." }, { status: 409 });
  }

  const bytes = await renderAssignmentSubmissionPdf(bundle.preview);
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${bundle.preview.fileName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
