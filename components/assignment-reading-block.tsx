"use client";

import { useState } from "react";
import { AccessibleReadingText, type ReadingPrefs } from "@/components/accessible-reading-text";
import { ReadingAnnotationControl } from "@/components/reading-annotation-control";
import { ReadingLevelAdapter } from "@/components/reading-level-adapter";
import { VocabHoverProvider } from "@/components/vocab-hover-provider";

export function AssignmentReadingBlock({
  assignmentId,
  ownerId,
  text,
  readingPrefs,
  aiMode,
}: {
  assignmentId: string;
  ownerId: string;
  text: string;
  readingPrefs: ReadingPrefs;
  aiMode: "red" | "yellow" | "green";
}) {
  const [selectedText, setSelectedText] = useState("");

  function captureSelection() {
    const selection = window.getSelection()?.toString().trim().replace(/\s+/g, " ") ?? "";
    setSelectedText(selection.length >= 1 ? selection.slice(0, 1200) : "");
  }

  return (
    <div className="space-y-3">
      <VocabHoverProvider ownerId={ownerId} aiMode={aiMode} sourceType="assignment" sourceId={assignmentId}>
        <div
          className="reading-view whitespace-pre-wrap rounded-lg border border-border bg-card p-3"
          onMouseUp={captureSelection}
          onKeyUp={captureSelection}
        >
          <AccessibleReadingText text={text} prefs={readingPrefs} />
        </div>
      </VocabHoverProvider>
      <ReadingLevelAdapter text={text} aiMode={aiMode} />
      <ReadingAnnotationControl selectedText={selectedText} sourceType="assignment" sourceId={assignmentId} />
    </div>
  );
}
