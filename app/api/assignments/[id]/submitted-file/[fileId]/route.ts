import { loadSubmittedFileBinding } from "@/lib/assignment-submitted-work";
import { verifyStoredSubmissionFile } from "@/lib/security/submission-file-integrity";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

function attachment(filename: string) {
  const safeName = filename.replace(/[^a-zA-Z0-9 ._-]/gu, "_");
  const encoded = encodeURIComponent(filename).replace(/['()*]/gu, (char) => `%${char.charCodeAt(0).toString(16)}`);
  return `attachment; filename="${safeName}"; filename*=UTF-8''${encoded}`;
}

function unavailable(status: 404 | 503) {
  return Response.json({ error: "The submitted file is unavailable." }, { status, headers: privateHeaders });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string; fileId: string }> }) {
  const { id, fileId } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in to view the submitted file." }, { status: 401, headers: privateHeaders });
  try {
    const file = await loadSubmittedFileBinding({ supabase, ownerId: user.id, assignmentId: id }, fileId);
    if (!file) return unavailable(404);
    const { data, error } = await supabase.storage.from(file.storageBucket).download(file.storageKey);
    if (error || !data || data.size !== file.byteSize) return unavailable(503);
    const verified = await verifyStoredSubmissionFile(data, file);
    if (!verified.ok) return unavailable(503);
    return new Response(Buffer.from(verified.value.bytes), {
      headers: {
        ...privateHeaders,
        "Content-Type": verified.value.canonicalMimeType,
        "Content-Disposition": attachment(verified.value.filename),
      },
    });
  } catch {
    return unavailable(503);
  }
}
