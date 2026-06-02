"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { addPortfolioItem, createPortfolio, uploadPortfolioFile } from "./actions";

type PortfolioItem = {
  id: string;
  title: string;
  reflection_text: string | null;
  mime_type: string | null;
  signedUrl: string | null;
};

type Portfolio = {
  id: string;
  title: string;
  description: string | null;
  items: PortfolioItem[];
};

const REFLECTION_PROMPTS = [
  "What did you make?",
  "What choices did you make first?",
  "What changed while you worked?",
  "What do you want someone to notice?",
];

export function PortfolioClient({ portfolios: initial }: { portfolios: Portfolio[] }) {
  const router = useRouter();
  const portfolios = initial;
  const [selectedId, setSelectedId] = useState(initial[0]?.id ?? "");
  const [portfolioTitle, setPortfolioTitle] = useState("");
  const [portfolioDescription, setPortfolioDescription] = useState("");
  const [itemTitle, setItemTitle] = useState("");
  const [reflection, setReflection] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted">New portfolio</h2>
        <input
          value={portfolioTitle}
          onChange={(event) => setPortfolioTitle(event.target.value)}
          placeholder="Portfolio title"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <textarea
          value={portfolioDescription}
          onChange={(event) => setPortfolioDescription(event.target.value)}
          placeholder="Project, class, or theme"
          rows={2}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={createNewPortfolio}
          disabled={pending || portfolioTitle.trim().length === 0}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Create portfolio
        </button>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted">Add work</h2>
        <select
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Choose portfolio</option>
          {portfolios.map((portfolio) => (
            <option key={portfolio.id} value={portfolio.id}>{portfolio.title}</option>
          ))}
        </select>
        <input
          value={itemTitle}
          onChange={(event) => setItemTitle(event.target.value)}
          placeholder="Work title"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <label className="block rounded-md border border-dashed border-border bg-background px-3 py-4 text-sm hover:bg-border/30">
          <span className="inline-flex items-center gap-2 text-muted">
            <ImagePlus size={16} />
            {file ? file.name : "Upload image or document"}
          </span>
          <input
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            className="sr-only"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Reflection prompts</p>
          <ul className="mt-2 space-y-1 text-sm">
            {REFLECTION_PROMPTS.map((prompt) => <li key={prompt}>- {prompt}</li>)}
          </ul>
        </div>
        <textarea
          value={reflection}
          onChange={(event) => setReflection(event.target.value)}
          placeholder="Describe your process before adding any polish."
          rows={4}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={addItem}
          disabled={pending || !selectedId || itemTitle.trim().length === 0}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Add to portfolio
        </button>
        {message && <p className="text-sm text-muted">{message}</p>}
      </section>

      <section className="space-y-4">
        {portfolios.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
            <p className="text-sm font-medium">No portfolio yet.</p>
            <p className="mt-1 text-sm text-muted">Create one above, then add work and reflections.</p>
          </div>
        ) : (
          portfolios.map((portfolio) => (
            <article key={portfolio.id} className="space-y-3 rounded-2xl border border-border bg-card p-5">
              <div>
                <h2 className="text-lg font-semibold">{portfolio.title}</h2>
                {portfolio.description && <p className="text-sm text-muted">{portfolio.description}</p>}
              </div>
              {portfolio.items.length === 0 ? (
                <p className="text-sm text-muted">No work added yet.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {portfolio.items.map((item) => (
                    <div key={item.id} className="rounded-xl border border-border bg-background p-3">
                      {item.signedUrl && item.mime_type?.startsWith("image/") && (
                        <img
                          src={item.signedUrl}
                          alt=""
                          className="mb-3 aspect-video w-full rounded-md object-cover"
                        />
                      )}
                      <h3 className="text-sm font-medium">{item.title}</h3>
                      {item.reflection_text && (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{item.reflection_text}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
