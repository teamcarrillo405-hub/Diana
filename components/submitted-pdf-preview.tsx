"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { PdfSourcePage } from "@/components/learning/pdf-source-page";
import styles from "@/components/student-shell/submission.module.css";

export function SubmittedPdfPreview({ url }: { url: string }) {
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);

  return (
    <section className={styles.pdfPreview} aria-label="Saved PDF">
      {pageCount > 1 ? (
        <nav className={styles.pdfPager} aria-label="PDF pages">
          <button type="button" className={styles.secondary} disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            <ChevronLeft size={17} aria-hidden="true" />Previous
          </button>
          <span role="status">Page {page} of {pageCount}</span>
          <button type="button" className={styles.secondary} disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>
            Next<ChevronRight size={17} aria-hidden="true" />
          </button>
        </nav>
      ) : null}
      <PdfSourcePage url={url} pageNumber={page} onPageCount={setPageCount} />
    </section>
  );
}
