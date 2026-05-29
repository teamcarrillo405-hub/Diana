import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ConfirmForm } from "./confirm-form";

export default async function InboxItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: item } = await supabase
    .from("inbox_items")
    .select(
      "id, raw, capture_mode, status, photo_storage_key, suggested_class_id, suggested_kind, suggested_due_at, suggestion_confidence, assignment_id, created_at"
    )
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (!item) notFound();

  // Fetch user's classes for the confirm form
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, color")
    .eq("owner_id", user.id)
    .order("name", { ascending: true });

  // Generate signed URL for photo preview (valid 5 minutes)
  let signedPhotoUrl: string | null = null;
  if (item.photo_storage_key) {
    const { data: signed } = await supabase.storage
      .from("inbox-photos")
      .createSignedUrl(item.photo_storage_key, 300);
    signedPhotoUrl = signed?.signedUrl ?? null;
  }

  const hasAiSuggestion =
    item.suggested_class_id !== null &&
    item.suggestion_confidence !== null &&
    item.suggestion_confidence >= 0.7;

  // Already converted — show link to the assignment
  if (item.status === "converted" && item.assignment_id) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <Link href="/inbox" className="text-xs text-muted hover:underline">
            ← Inbox
          </Link>
          <h1 className="text-2xl font-bold">Converted</h1>
        </header>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted">This capture became an assignment.</p>
          <Link
            href={`/assignments/${item.assignment_id}`}
            className="mt-3 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            View assignment
          </Link>
        </div>
      </div>
    );
  }

  // Dismissed
  if (item.status === "dismissed") {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <Link href="/inbox" className="text-xs text-muted hover:underline">
            ← Inbox
          </Link>
          <h1 className="text-2xl font-bold">Dismissed</h1>
        </header>
        <p className="text-sm text-muted">This item was dismissed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href="/inbox" className="text-xs text-muted hover:underline">
          ← Inbox
        </Link>
        <h1 className="text-2xl font-bold">Review capture</h1>
        <p className="text-xs text-muted">
          {new Date(item.created_at).toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </header>

      {/* Raw capture */}
      <section className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          What you captured
        </p>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="whitespace-pre-wrap text-sm">{item.raw}</p>
        </div>
      </section>

      {/* Photo preview */}
      {signedPhotoUrl && (
        <section className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Photo</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={signedPhotoUrl}
            alt="Captured assignment sheet"
            className="max-h-64 w-full rounded-xl border border-border object-contain bg-card"
          />
        </section>
      )}

      {/* AI suggestion */}
      <section className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          Diana's suggestion
        </p>
        {hasAiSuggestion ? (
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm">
            <p>
              <span className="font-medium">Kind:</span>{" "}
              {item.suggested_kind ?? "—"}
            </p>
            {item.suggested_due_at && (
              <p className="mt-1">
                <span className="font-medium">Suggested date:</span>{" "}
                {new Date(item.suggested_due_at).toLocaleDateString()}
              </p>
            )}
            <p className="mt-1 text-xs text-muted">
              Confidence: {Math.round((item.suggestion_confidence ?? 0) * 100)}% — you can change
              anything below before confirming.
            </p>
          </div>
        ) : item.status === "classified" ? (
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted">
            Diana couldn't classify this — help her out below.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted">
            Classification is running in the background — fill in the fields below if you'd like to
            convert this now.
          </div>
        )}
      </section>

      {/* Confirm form */}
      <ConfirmForm
        inboxItemId={item.id}
        classes={classes ?? []}
        suggestedClassId={hasAiSuggestion ? item.suggested_class_id : null}
        suggestedKind={hasAiSuggestion ? item.suggested_kind : null}
        suggestedDueAt={hasAiSuggestion ? item.suggested_due_at : null}
      />
    </div>
  );
}
