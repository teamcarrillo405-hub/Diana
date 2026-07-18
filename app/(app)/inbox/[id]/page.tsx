import { ArrowLeft, CheckCircle2, FileText, Sparkles } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
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
      "id, raw, capture_mode, status, photo_storage_key, suggested_class_id, suggested_kind, suggested_due_at, suggestion_confidence, assignment_id, created_at",
    )
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();
  if (!item) notFound();

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, color")
    .eq("owner_id", user.id)
    .is("archived_at", null)
    .order("name", { ascending: true });

  let signedPhotoUrl: string | null = null;
  if (item.photo_storage_key) {
    const { data: signed } = await supabase.storage
      .from("inbox-photos")
      .createSignedUrl(item.photo_storage_key, 300);
    signedPhotoUrl = signed?.signedUrl ?? null;
  }

  const hasSuggestion =
    item.suggested_class_id !== null &&
    item.suggestion_confidence !== null &&
    item.suggestion_confidence >= 0.7;

  return (
    <ScreenDesignViewport className="sd-capture-work-screen sd-inbox-review">
      <header className="sd-inbox-review-header">
        <Link href="/inbox" aria-label="Back to inbox">
          <ArrowLeft aria-hidden="true" />
        </Link>
        <DianaWordmark />
        <span aria-hidden="true" />
      </header>

      <main>
        {item.status === "converted" && item.assignment_id ? (
          <section className="sd-inbox-terminal-state">
            <CheckCircle2 aria-hidden="true" />
            <p>Play confirmed</p>
            <h1>This capture is on your work board.</h1>
            <Link href={`/assignments/${item.assignment_id}`}>Open assignment</Link>
          </section>
        ) : item.status === "dismissed" ? (
          <section className="sd-inbox-terminal-state">
            <FileText aria-hidden="true" />
            <p>Capture set aside</p>
            <h1>This item is no longer waiting in triage.</h1>
            <Link href="/inbox">Return to scouts</Link>
          </section>
        ) : (
          <>
            <section className="sd-inbox-capture-copy">
              <span>What you captured</span>
              <h1>{item.raw.replace(/^\[Grayson demo\]\s*/iu, "")}</h1>
              <time dateTime={item.created_at}>
                {new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(item.created_at))}
              </time>
            </section>

            {signedPhotoUrl ? (
              // Captured student media remains owner-scoped through a short signed URL.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="sd-inbox-photo"
                src={signedPhotoUrl}
                alt="Captured schoolwork"
              />
            ) : null}

            <section className="sd-inbox-suggestion">
              <span>
                <Sparkles aria-hidden="true" />
                Diana read
              </span>
              <p>
                {hasSuggestion
                  ? `This looks like ${item.suggested_kind?.replaceAll("_", " ") ?? "schoolwork"}. Check the fields before it moves to your board.`
                  : "Choose the class, work type, and date that fit this capture."}
              </p>
            </section>

            <ConfirmForm
              inboxItemId={item.id}
              classes={classes ?? []}
              suggestedClassId={hasSuggestion ? item.suggested_class_id : null}
              suggestedKind={hasSuggestion ? item.suggested_kind : null}
              suggestedDueAt={hasSuggestion ? item.suggested_due_at : null}
            />
          </>
        )}
      </main>
    </ScreenDesignViewport>
  );
}
