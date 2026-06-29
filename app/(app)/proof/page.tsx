import Link from "next/link";
import { FileText, Images, LockKeyhole, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProofConstellation, ProofReceiptVisual } from "@/components/student-portal/proof-receipt-visual";

type AuthorshipRow = {
  id: string;
  actor: "student" | "diana" | "system";
  event_type: string;
  created_at: string;
};

type WinRow = {
  id: string | number;
  occurred_at: string;
  assignments?: { title?: string | null; kind?: string | null } | Array<{ title?: string | null; kind?: string | null }> | null;
};

type ArtifactRow = {
  id: string;
  title: string;
  artifact_type: string;
  source_anchor_count: number;
  created_at: string;
};

type PortfolioRow = {
  id: string;
  title: string;
  description: string | null;
  portfolio_items?: Array<{ id: string; title: string; reflection_text: string | null; created_at: string }> | null;
};

export default async function ProofPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="diana-page py-10">
        <p className="text-sm text-muted">Sign in to see your proof folder.</p>
      </div>
    );
  }

  const [{ data: authorship }, { data: artifacts }, { data: wins }, { data: portfolios }] = await Promise.all([
    supabase
      .from("authorship_log")
      .select("id, actor, event_type, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("study_artifacts")
      .select("id, title, artifact_type, source_anchor_count, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("task_signals")
      .select("id, occurred_at, assignments(title, kind)")
      .eq("owner_id", user.id)
      .eq("kind", "completed")
      .order("occurred_at", { ascending: false })
      .limit(5),
    supabase
      .from("portfolios")
      .select("id, title, description, portfolio_items(id, title, reflection_text, created_at)")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(3),
  ]);

  const receiptRows = (authorship ?? []) as AuthorshipRow[];
  const artifactRows = (artifacts ?? []) as ArtifactRow[];
  const winRows = (wins ?? []) as WinRow[];
  const portfolioRows = (portfolios ?? []) as PortfolioRow[];
  const portfolioItemCount = portfolioRows.reduce((sum, portfolio) => sum + (portfolio.portfolio_items?.length ?? 0), 0);

  return (
    <div className="diana-page student-portal-page space-y-8">
      <section className="proof-stage grid gap-6 py-2 lg:grid-cols-[0.74fr_1.26fr]">
        <header className="space-y-5">
          <p className="diana-kicker">
            <ShieldCheck size={15} />
            Proof Folder
          </p>
          <h1 className="diana-app-title max-w-xl">Keep track of what is yours.</h1>
          <p className="diana-copy">
            Proof Folder collects rough thoughts, Diana help, source anchors, study artifacts, and wins so
            students can explain their work without giving away their voice.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/portfolio" className="diana-button diana-button-primary">
              Add work sample
              <Images size={17} />
            </Link>
            <Link href="/settings/ai-history" className="diana-button diana-button-secondary">
              View AI receipts
            </Link>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <ProofReceiptVisual
            receipts={receiptRows.length}
            artifacts={artifactRows.length}
            portfolioItems={portfolioItemCount}
          />
          <div className="proof-memory-panel">
            <ProofConstellation points={winRows.length + portfolioItemCount} />
            <h2>Private proof grows quietly.</h2>
            <p>
              Every saved win becomes raw material for essays, teacher conversations, scholarships, and support plans.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="proof-ledger p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Recent authorship trail</h2>
            <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted">
              Student-owned
            </span>
          </div>
          <div className="mt-5 grid gap-3">
            {receiptRows.length === 0 ? (
              <EmptyProofLine body="Use voice, study help, or assignment checks and Diana will start building receipts here." />
            ) : (
              receiptRows.map((row) => (
                <div key={row.id} className="proof-ledger-row grid gap-3 sm:grid-cols-[8rem_1fr]">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-brand-strong dark:text-brand">
                    {row.actor}
                  </span>
                  <div>
                    <p className="text-sm font-black">{formatEvent(row.event_type)}</p>
                    <p className="mt-1 text-xs text-muted">{new Date(row.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <ProofColumn
            icon={FileText}
            title="What Diana can show"
            lines={[
              "Your original notes or voice capture",
              "The structure Diana helped create",
              "Rubric and source checks",
              "The final choices the student confirmed",
            ]}
          />
          <ProofColumn
            icon={LockKeyhole}
            title="What stays protected"
            lines={[
              "Private readiness details",
              "Unshared support notes",
              "Drafts until the student chooses to export",
            ]}
          />
        </aside>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ProofList
          title="Recent wins"
          empty="Completed work will appear here as proof points for essays, conferences, and support conversations."
          items={winRows.map((win) => {
            const assignment = Array.isArray(win.assignments) ? win.assignments[0] : win.assignments;
            return {
              id: String(win.id),
              title: assignment?.title ?? "Completed schoolwork",
              meta: new Date(win.occurred_at).toLocaleDateString(),
            };
          })}
        />
        <ProofList
          title="Source-backed study artifacts"
          empty="Study guides, practice sets, and cards with source anchors will appear here."
          items={artifactRows.map((artifact) => ({
            id: artifact.id,
            title: artifact.title,
            meta: `${artifact.artifact_type.replace(/_/g, " ")} · ${artifact.source_anchor_count} sources`,
          }))}
        />
      </section>
    </div>
  );
}

function ProofColumn({ icon: Icon, title, lines }: { icon: typeof FileText; title: string; lines: string[] }) {
  return (
    <div className="diana-zone p-5">
      <h2 className="flex items-center gap-2 text-lg font-black">
        <Icon size={18} className="text-brand" />
        {title}
      </h2>
      <ul className="mt-4 space-y-2 text-sm leading-6 text-muted">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

function ProofList({
  title,
  items,
  empty,
}: {
  title: string;
  items: Array<{ id: string; title: string; meta: string }>;
  empty: string;
}) {
  return (
    <section className="diana-zone p-5">
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-4 grid gap-3">
        {items.length === 0 ? (
          <EmptyProofLine body={empty} />
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-border bg-surface/70 p-4">
              <p className="text-sm font-black">{item.title}</p>
              <p className="mt-1 text-xs text-muted">{item.meta}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function EmptyProofLine({ body }: { body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-4 text-sm leading-6 text-muted">
      {body}
    </div>
  );
}

function formatEvent(eventType: string) {
  return eventType.replace(/_/g, " ");
}
