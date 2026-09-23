"use client";

import {
  FilePlus2,
  ImagePlus,
  Link2,
  Share2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { SourceMedia } from "@/components/screen-design/source-media";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";

import { addPortfolioItem, createPortfolio, uploadPortfolioFile } from "./actions";

type PortfolioItem = {
  id: string;
  title: string;
  reflection_text: string | null;
  mime_type: string | null;
  hasStoredFile?: boolean;
  created_at?: string;
};

type Portfolio = {
  id: string;
  title: string;
  description: string | null;
  items: PortfolioItem[];
};

type Filter = "all" | "reflection" | "files";

const REFLECTION_PROMPTS = [
  "What did you make?",
  "What changed while you worked?",
  "What do you want someone to notice?",
];

export function PortfolioClient({
  portfolios,
  canvaState,
}: {
  portfolios: Portfolio[];
  canvaState: "connected" | "disconnected" | "unavailable";
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [selectedId, setSelectedId] = useState(portfolios[0]?.id ?? "");
  const [portfolioTitle, setPortfolioTitle] = useState("");
  const [portfolioDescription, setPortfolioDescription] = useState("");
  const [itemTitle, setItemTitle] = useState("");
  const [reflection, setReflection] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const work = useMemo(
    () =>
      portfolios.flatMap((portfolio) =>
        portfolio.items.map((item) => ({ ...item, portfolioTitle: portfolio.title })),
      ),
    [portfolios],
  );
  const visibleWork = work.filter((item) => {
    if (filter === "reflection") return Boolean(item.reflection_text);
    if (filter === "files") return Boolean(item.hasStoredFile || item.mime_type);
    return true;
  });

  function openItem(item: PortfolioItem) {
    setSelectedItem(item);
    router.push(`/portfolio?item=${encodeURIComponent(item.id)}`, { scroll: false });
  }

  function closeItem() {
    setSelectedItem(null);
    router.replace("/portfolio", { scroll: false });
  }

  function createNewPortfolio() {
    setMessage(null);
    startTransition(async () => {
      const result = await createPortfolio({
        title: portfolioTitle,
        description: portfolioDescription,
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setPortfolioTitle("");
      setPortfolioDescription("");
      setSelectedId(result.id);
      setMessage("Portfolio created.");
      router.refresh();
    });
  }

  function addItem() {
    if (!selectedId) {
      setMessage("Create a portfolio first.");
      return;
    }
    setMessage(null);
    startTransition(async () => {
      let storageKey: string | null = null;
      let mimeType: string | null = null;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploaded = await uploadPortfolioFile(formData);
        if (!uploaded.ok) {
          setMessage(uploaded.error);
          return;
        }
        storageKey = uploaded.storageKey;
        mimeType = uploaded.mimeType;
      }
      const result = await addPortfolioItem({
        portfolioId: selectedId,
        title: itemTitle,
        reflectionText: reflection,
        storageKey,
        mimeType,
        metadata: { source: "portfolio-ui" },
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setItemTitle("");
      setReflection("");
      setFile(null);
      setMessage("Work added to your portfolio.");
      router.refresh();
    });
  }

  return (
    <div className="sd-portfolio-shell">
      <main className="sd-portfolio-scroll">
        <header className="sd-portfolio-header">
          <DianaWordmark />
          <Link href="/sharing" className="sd-portfolio-share" aria-label="Open sharing controls">
            <Share2 size={18} aria-hidden="true" />
          </Link>
        </header>

        <h1 className="sd-portfolio-title">
          Best <span>plays</span>
        </h1>

        <div className="sd-portfolio-status">
          <span>{work.length} saved item{work.length === 1 ? "" : "s"}</span>
          <Link href="/settings#canva" className="sd-portfolio-canva">
            <Sparkles size={12} aria-hidden="true" /> Canva {canvaLabel(canvaState)}
          </Link>
        </div>

        <div className="sd-portfolio-filters" aria-label="Portfolio filters">
          {([
            ["all", "All work"],
            ["reflection", "Reflections"],
            ["files", "Files"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="sd-portfolio-filter"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <section className="sd-portfolio-grid" aria-label="Portfolio work">
          {visibleWork.length === 0 ? (
            <div className="sd-portfolio-empty">
              <h2>{work.length === 0 ? "No portfolio work yet." : "No work in this filter."}</h2>
              <p>
                {work.length === 0
                  ? "Add work you chose to keep, then include a reflection when you are ready."
                  : "Choose another filter to see your saved work."}
              </p>
            </div>
          ) : (
            visibleWork.map((item, index) => (
              <article className="sd-portfolio-card" key={item.id}>
                <button
                  type="button"
                  className="sd-portfolio-open"
                  aria-label={index === 0 ? "Open portfolio item" : `Open ${item.title}`}
                  onClick={() => openItem(item)}
                >
                  <SourceMedia
                    assetId={
                      index % 2 === 0
                        ? "portfolio-calculus-project"
                        : "portfolio-biology-project"
                    }
                    width={318}
                    height={424}
                    decorative
                    className="sd-portfolio-thumb"
                    priority={index < 2}
                  />
                  {index === 0 ? (
                    <SourceMedia
                      assetId="academic-championship-ring"
                      width={64}
                      height={64}
                      decorative
                      className="sd-portfolio-ring"
                    />
                  ) : null}
                </button>
                <div className="sd-portfolio-card-copy">
                  <h2>{item.title}</h2>
                  <p>{item.portfolioTitle}</p>
                </div>
              </article>
            ))
          )}
        </section>

        <details className="sd-portfolio-add">
          <summary>Add portfolio work</summary>
          <div className="sd-portfolio-form">
            <h2>New portfolio</h2>
            <label>
              Portfolio title
              <input
                value={portfolioTitle}
                onChange={(event) => setPortfolioTitle(event.target.value)}
              />
            </label>
            <label>
              Project, class, or theme
              <textarea
                value={portfolioDescription}
                onChange={(event) => setPortfolioDescription(event.target.value)}
                rows={2}
              />
            </label>
            <button
              type="button"
              onClick={createNewPortfolio}
              disabled={pending || portfolioTitle.trim().length === 0}
            >
              Create portfolio
            </button>

            <h2>Add work</h2>
            <label>
              Portfolio
              <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
                <option value="">Choose portfolio</option>
                {portfolios.map((portfolio) => (
                  <option key={portfolio.id} value={portfolio.id}>
                    {portfolio.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Work title
              <input value={itemTitle} onChange={(event) => setItemTitle(event.target.value)} />
            </label>
            <label className="sd-portfolio-upload">
              <ImagePlus size={16} aria-hidden="true" />
              {file ? file.name : "Upload image or document"}
              <input
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                className="sr-only"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <p className="sr-only">{REFLECTION_PROMPTS.join(" ")}</p>
            <label>
              Reflection
              <textarea
                value={reflection}
                onChange={(event) => setReflection(event.target.value)}
                rows={3}
              />
            </label>
            <button
              type="button"
              onClick={addItem}
              disabled={pending || !selectedId || itemTitle.trim().length === 0}
            >
              <FilePlus2 size={15} aria-hidden="true" /> Add to portfolio
            </button>
            {message ? (
              <p className="sd-portfolio-message" role="status">
                {message}
              </p>
            ) : null}
          </div>
        </details>
      </main>

      <StudentBottomNav />

      {selectedItem ? (
        <div className="sd-portfolio-dialog-backdrop" onMouseDown={closeItem}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="portfolio-dialog-title"
            className="sd-portfolio-dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <SourceMedia
              assetId="portfolio-calculus-project"
              width={636}
              height={848}
              decorative
              className="sd-portfolio-dialog-media"
            />
            <div className="sd-portfolio-dialog-copy">
              <h2 id="portfolio-dialog-title">{selectedItem.title}</h2>
              <p>{selectedItem.reflection_text || "No reflection has been added yet."}</p>
              <div className="sd-portfolio-dialog-actions">
                <Link href="/sharing" aria-label="Share portfolio">
                  <Link2 size={14} aria-hidden="true" /> Share portfolio
                </Link>
                <button type="button" onClick={closeItem}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function canvaLabel(state: "connected" | "disconnected" | "unavailable"): string {
  if (state === "connected") return "connected";
  if (state === "disconnected") return "not connected";
  return "setup unavailable";
}
