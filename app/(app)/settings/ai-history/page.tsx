import { FileText, PlayCircle, Search, Trash2 } from "lucide-react";
import Link from "next/link";

import {
  DianaWordmark,
} from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { SourceMedia } from "@/components/screen-design/source-media";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { aiFeatureLabel, type AiHistoryEntry } from "../source-models";
import { deleteAiHistoryEntry, getAiHistory } from "./actions";
import { CsvExportButton } from "./csv-export-button";

const HISTORY_STYLES = `
  .diana-authenticated-field:has(.sd-ai-history) { padding-bottom: 0 !important; }
  .app-command-frame:has(.sd-ai-history) { padding: 0 !important; }
  .app-command-frame:has(.sd-ai-history) .diana-mobile-command,
  .diana-app-shell:has(.sd-ai-history) .agent-fab-anchor { display: none !important; }
  .diana-app:has(.sd-ai-history) nextjs-portal { display: none !important; }
  .diana-app:has(.sd-ai-history) .skip-link { transition: none; }
  .diana-app:has(.sd-ai-history) .skip-link:focus { transform: translateY(0) !important; }
  .sd-ai-history { display: flex; height: max(100dvh, 852px); max-height: max(100dvh, 852px); flex-direction: column; overflow: hidden; background: #0f172a; font-family: ui-sans-serif, system-ui, sans-serif; }
  .sd-ai-history-header { flex: none; border-bottom: 1px solid rgb(255 255 255 / .05); background: rgb(15 23 42 / .94); padding: 52px 24px 16px; backdrop-filter: blur(12px); }
  .sd-ai-history-header .sd-source-wordmark { height: 18px; margin-bottom: 9px; opacity: .92; }
  .sd-ai-history-title { margin: 0; color: #f8fafc; font-size: 28px; font-style: italic; font-weight: 950; letter-spacing: -.055em; line-height: .84; text-transform: uppercase; }
  .sd-ai-history-title span { color: #ff79da; }
  .sd-ai-history-subtitle { margin: 8px 0 16px; color: #64748b; font-size: 9px; font-weight: 900; letter-spacing: .2em; text-transform: uppercase; }
  .sd-ai-history-search { display: grid; grid-template-columns: 18px minmax(0, 1fr) auto; align-items: center; gap: 9px; border: 1px solid rgb(255 255 255 / .1); border-radius: 12px; background: rgb(255 255 255 / .05); padding: 10px 12px; }
  .sd-ai-history-search svg { color: #64748b; }
  .sd-ai-history-search input { min-width: 0; border: 0; outline: 0; background: transparent; color: #f8fafc; font: inherit; font-size: 10px; font-weight: 850; letter-spacing: .08em; text-transform: uppercase; }
  .sd-ai-history-search input::placeholder { color: #475569; }
  .sd-ai-history-search button { border: 0; background: transparent; color: #74c0ff; font: inherit; font-size: 9px; font-weight: 950; text-transform: uppercase; }
  .sd-ai-history-tools { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; }
  .sd-ai-history-tools a, .sd-ai-history-tools button { color: #94a3b8; font-size: 9px; font-weight: 850; text-decoration: none; text-transform: uppercase; }
  .sd-ai-history-scroll { min-height: 0; flex: 1; overflow-y: auto; padding: 20px 24px 32px; scrollbar-width: none; }
  .sd-ai-history-list { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; }
  .sd-ai-history-card { display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 14px; border: 1px solid rgb(255 255 255 / .1); border-radius: 16px; background: rgb(255 255 255 / .05); padding: 14px; backdrop-filter: blur(8px); }
  .sd-ai-history-mascot { display: grid; width: 56px; height: 56px; place-items: center; overflow: hidden; border: 1px solid rgb(255 255 255 / .1); border-radius: 999px; background: rgb(255 255 255 / .04); padding: 4px; }
  .sd-ai-history-mascot .sd-source-media { width: 100%; height: 100%; object-fit: contain; }
  .sd-ai-history-card-main { min-width: 0; }
  .sd-ai-history-card-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .sd-ai-history-card h2 { overflow: hidden; margin: 0; color: #f8fafc; font-size: 13px; font-style: italic; font-weight: 950; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
  .sd-ai-history-time { flex: none; color: #64748b; font-size: 8px; font-weight: 800; text-transform: uppercase; }
  .sd-ai-history-owner { margin: 4px 0 0; color: #74c0ff; font-size: 8px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
  .sd-ai-history-summary { display: -webkit-box; overflow: hidden; margin: 5px 0 0; color: #94a3b8; font-size: 9px; font-weight: 600; line-height: 1.35; text-transform: uppercase; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
  .sd-ai-history-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 10px; }
  .sd-ai-history-review { display: inline-flex; min-height: 27px; align-items: center; gap: 5px; border-radius: 999px; background: linear-gradient(135deg, #74c0ff, #ff79da); padding: 5px 11px; color: #0f172a; font-size: 8px; font-style: italic; font-weight: 950; text-decoration: none; text-transform: uppercase; }
  .sd-ai-history-assignment { display: inline-flex; align-items: center; gap: 4px; color: #74c0ff; font-size: 8px; font-weight: 900; text-decoration: none; text-transform: uppercase; }
  .sd-ai-history-delete { margin-left: auto; border: 0; background: transparent; color: #94a3b8; padding: 4px; }
  .sd-ai-history-empty { border: 1px dashed rgb(116 192 255 / .3); border-radius: 16px; background: rgb(116 192 255 / .05); padding: 22px; color: #94a3b8; font-size: 11px; line-height: 1.5; text-align: center; }
  .sd-ai-history > .sd-student-bottom-nav { position: relative; flex: none; }
  .sd-ai-history a:focus-visible, .sd-ai-history button:focus-visible, .sd-ai-history input:focus-visible { outline: 2px solid #74c0ff; outline-offset: 3px; }
`;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AiHistoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = stringParam(params.q).trim().toLocaleLowerCase();
  const actor = stringParam(params.actor);
  const selected = stringParam(params.entry);
  const rows = await getAiHistory(200);
  const filtered = rows.filter((row) => {
    if (actor === "student" && row.actor !== "student") return false;
    if (actor === "diana" && row.actor !== "diana") return false;
    if (!query) return true;
    return [
      aiFeatureLabel(row.feature),
      row.assignmentTitle,
      row.summary,
      row.workOwnerLabel,
    ]
      .filter(Boolean)
      .some((value) => value!.toLocaleLowerCase().includes(query));
  });

  return (
    <ScreenDesignViewport className="sd-ai-history" aria-label="AI coaching history">
      <style>{HISTORY_STYLES}</style>
      <header className="sd-ai-history-header">
        <DianaWordmark />
        <h1 className="sd-ai-history-title">
          Game <span>film</span>
        </h1>
        <p className="sd-ai-history-subtitle">AI coaching history</p>
        <form className="sd-ai-history-search" action="/settings/ai-history">
          <Search size={17} aria-hidden="true" />
          <input
            name="q"
            defaultValue={stringParam(params.q)}
            aria-label="Search AI activity"
            placeholder="Search sessions..."
          />
          <button type="submit">Search</button>
        </form>
        <div className="sd-ai-history-tools">
          <nav aria-label="AI history filters">
            <Link href="/settings/ai-history">All</Link>
            {" · "}
            <Link href="/settings/ai-history?actor=student">Student</Link>
            {" · "}
            <Link href="/settings/ai-history?actor=diana">Diana</Link>
          </nav>
          <CsvExportButton />
        </div>
      </header>

      <main className="sd-ai-history-scroll">
        {filtered.length === 0 ? (
          <div className="sd-ai-history-empty">
            AI activity will appear here after Diana helps or a student work event is saved.
          </div>
        ) : (
          <ol className="sd-ai-history-list">
            {filtered.map((row) => (
              <HistoryCard key={`${row.kind}:${row.id}`} row={row} selected={selected} />
            ))}
          </ol>
        )}
      </main>
      <StudentBottomNav />
    </ScreenDesignViewport>
  );
}

function HistoryCard({ row, selected }: { row: AiHistoryEntry; selected: string }) {
  const entryKey = `${row.kind}:${row.id}`;
  const reviewHref = `/settings/ai-history?entry=${encodeURIComponent(entryKey)}`;
  const deleteAction = deleteAiHistoryEntry.bind(null, row.kind, row.id);
  return (
    <li className="sd-ai-history-card" data-selected={selected === entryKey || undefined}>
      <div className="sd-ai-history-mascot">
        <SourceMedia
          assetId="diana-mascot"
          width={64}
          height={64}
          alt="Diana assistant"
        />
      </div>
      <div className="sd-ai-history-card-main">
        <div className="sd-ai-history-card-heading">
          <h2>{aiFeatureLabel(row.feature)}</h2>
          <time className="sd-ai-history-time" dateTime={row.createdAt}>
            {historyTime(row.createdAt)}
          </time>
        </div>
        <p className="sd-ai-history-owner">{row.workOwnerLabel}</p>
        <p className="sd-ai-history-summary">
          {row.summary ??
            (row.assignmentTitle
              ? `Evidence saved for ${row.assignmentTitle}.`
              : "Account activity evidence saved.")}
        </p>
        <div className="sd-ai-history-actions">
          <Link href={reviewHref} className="sd-ai-history-review">
            <PlayCircle size={13} aria-hidden="true" /> Review AI activity
          </Link>
          {row.assignmentId ? (
            <Link
              href={`/assignments/${row.assignmentId}`}
              className="sd-ai-history-assignment"
            >
              <FileText size={12} aria-hidden="true" /> Assignment
            </Link>
          ) : null}
          <form action={deleteAction}>
            <button
              type="submit"
              className="sd-ai-history-delete"
              aria-label={`Delete ${aiFeatureLabel(row.feature)} record`}
            >
              <Trash2 size={13} aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>
    </li>
  );
}

function stringParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function historyTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  }).format(new Date(value));
}
