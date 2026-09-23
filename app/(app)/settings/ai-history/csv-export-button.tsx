"use client";
import { useState } from "react";
import { exportAiHistoryCsv } from "./actions";

export function CsvExportButton() {
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      const csv = await exportAiHistoryCsv();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `diana-ai-history-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label="Download AI history CSV"
      className="border-0 bg-transparent p-0 disabled:opacity-50"
    >
      {busy ? "Preparing\u2026" : "Download CSV"}
    </button>
  );
}
