"use client";

import { useEffect, useState, useTransition } from "react";
import { Copy, Link2, Trash2 } from "lucide-react";
import {
  createShareLink,
  revokeShareLink,
  listActiveShareLinks,
} from "@/lib/sharing/actions";
import type { ShareLink, ShareType } from "@/lib/sharing/types";

export function SharingSection() {
  const [links, setLinks] = useState<ShareLink[] | null>(null);
  const [origin, setOrigin] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    void refresh();
  }, []);

  async function refresh() {
    const data = await listActiveShareLinks();
    setLinks(data);
  }

  function handleCreate(shareType: ShareType) {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await createShareLink(shareType);
      if ("error" in res) {
        setErrorMsg(res.error);
        return;
      }
      await refresh();
    });
  }

  function handleRevoke(id: string) {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await revokeShareLink(id);
      if ("error" in res) {
        setErrorMsg(res.error);
        return;
      }
      await refresh();
    });
  }

  async function handleCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Calm degradation — user can still select the URL manually
    }
  }

  const parentLinks = (links ?? []).filter((l) => l.share_type === "parent_summary");
  const teacherLinks = (links ?? []).filter(
    (l) => l.share_type === "teacher_snapshot",
  );

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4">
      <header className="space-y-1">
        <h2 className="text-sm font-semibold">Sharing</h2>
        <p className="text-xs text-muted">
          Generate a read-only link to share a calm weekly summary with a parent,
          or a one-page accommodation snapshot with a teacher. Each link works for
          7 days. You can revoke it any time.
        </p>
      </header>

      <ShareGroup
        heading="Share with parent"
        description="Effort and upcoming work only. No grades, no assignment names, no notes."
        origin={origin}
        links={parentLinks}
        pending={pending}
        onCreate={() => handleCreate("parent_summary")}
        onRevoke={handleRevoke}
        onCopy={handleCopy}
        buttonLabel="Create parent link"
      />

      <ShareGroup
        heading="Share with teacher"
        description="Accommodations and preferences only. No diagnoses, no grades."
        origin={origin}
        links={teacherLinks}
        pending={pending}
        onCreate={() => handleCreate("teacher_snapshot")}
        onRevoke={handleRevoke}
        onCopy={handleCopy}
        buttonLabel="Create teacher link"
      />

      {errorMsg && (
        <p className="rounded border border-amber-500/40 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
          {errorMsg}
        </p>
      )}
    </section>
  );
}

function ShareGroup({
  heading,
  description,
  origin,
  links,
  pending,
  onCreate,
  onRevoke,
  onCopy,
  buttonLabel,
}: {
  heading: string;
  description: string;
  origin: string;
  links: ShareLink[];
  pending: boolean;
  onCreate: () => void;
  onRevoke: (id: string) => void;
  onCopy: (url: string) => void;
  buttonLabel: string;
}) {
  return (
    <div className="space-y-2 border-t border-border pt-3">
      <div className="space-y-1">
        <p className="text-xs font-medium">{heading}</p>
        <p className="text-xs text-muted">{description}</p>
      </div>

      <button
        type="button"
        onClick={onCreate}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        <Link2 size={13} />
        {pending ? "Working\u2026" : buttonLabel}
      </button>

      {links.length > 0 && (
        <ul className="space-y-2 pt-2">
          {links.map((l) => {
            const url = `${origin}/share/${l.token}`;
            const worksUntil = new Date(l.expires_at).toLocaleDateString(
              undefined,
              {
                weekday: "long",
                month: "long",
                day: "numeric",
              },
            );
            return (
              <li
                key={l.id}
                className="space-y-1 rounded-lg border border-border bg-card/60 p-2"
              >
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={url}
                    className="min-w-0 flex-1 rounded border border-border bg-card px-2 py-1 text-xs"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <button
                    type="button"
                    onClick={() => onCopy(url)}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-border/20"
                  >
                    <Copy size={12} /> Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => onRevoke(l.id)}
                    disabled={pending}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-border/20 disabled:opacity-50"
                  >
                    <Trash2 size={12} /> Revoke
                  </button>
                </div>
                <p className="text-xs text-muted">
                  This link works until {worksUntil}.
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
