"use client";

import { useEffect, useRef, useState } from "react";
import type { EditorView as EditorViewType } from "@codemirror/view";

import { MAX_CODE_BYTES } from "@/lib/computer-science/pyodide-runner";
import { activeRuntimeState } from "@/lib/specialist-artifacts/active-state";
import type { SpecialistActiveRuntimeState } from "@/lib/specialist-artifacts/contracts";

type Props = {
  language: "python" | "javascript";
  value: string;
  onChange(value: string): void;
  onRuntimeStateChange(state: SpecialistActiveRuntimeState): void;
};

function sourceBytes(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function SpecialistCodeEditor({
  language,
  value,
  onChange,
  onRuntimeStateChange,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorViewType | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const [fallback, setFallback] = useState(false);
  valueRef.current = value;
  onChangeRef.current = onChange;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    setFallback(false);
    onRuntimeStateChange(activeRuntimeState("loading", ["CodeMirror 6"]));
    void Promise.all([
      import("codemirror"),
      import("@codemirror/state"),
      import("@codemirror/view"),
      language === "python"
        ? import("@codemirror/lang-python")
        : import("@codemirror/lang-javascript"),
    ]).then(([codemirror, stateModule, viewModule, languageModule]) => {
      if (disposed) return;
      const languageExtension = language === "python"
        ? (languageModule as typeof import("@codemirror/lang-python")).python()
        : (languageModule as typeof import("@codemirror/lang-javascript")).javascript();
      const state = stateModule.EditorState.create({
        doc: valueRef.current,
        extensions: [
          codemirror.minimalSetup,
          languageExtension,
          stateModule.EditorState.changeFilter.of((transaction) =>
            sourceBytes(transaction.newDoc.toString()) <= MAX_CODE_BYTES
          ),
          viewModule.EditorView.lineWrapping,
          viewModule.EditorView.contentAttributes.of({
            "aria-label": `${language === "python" ? "Python" : "JavaScript"} code`,
            spellcheck: "false",
          }),
          viewModule.EditorView.theme({
            "&": { minHeight: "260px", backgroundColor: "#0f172a", color: "#f8fafc" },
            ".cm-content": { minHeight: "260px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "14px" },
            ".cm-gutters": { backgroundColor: "#111827", color: "#94a3b8", border: "0" },
            ".cm-activeLine": { backgroundColor: "#1e293b" },
            ".cm-cursor": { borderLeftColor: "#f8fafc" },
          }, { dark: true }),
          viewModule.EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString());
          }),
        ],
      });
      viewRef.current = new viewModule.EditorView({ state, parent: host });
      onRuntimeStateChange(activeRuntimeState(
        "ready",
        ["CodeMirror 6"],
        "Browser code editing is ready. This is a bounded editor, not a full IDE.",
      ));
    }).catch(() => {
      if (disposed) return;
      setFallback(true);
      onRuntimeStateChange(activeRuntimeState(
        "limited",
        ["CodeMirror 6"],
        "The enhanced editor could not start. The standard typed editor remains available.",
      ));
    });
    return () => {
      disposed = true;
      viewRef.current?.destroy();
      viewRef.current = null;
      host.replaceChildren();
    };
  }, [language, onRuntimeStateChange]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === value) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
    });
  }, [value]);

  return (
    <div>
      <div ref={hostRef} className={fallback ? "hidden" : "overflow-hidden border border-slate-400"} />
      {fallback ? (
        <textarea
          aria-label={`${language === "python" ? "Python" : "JavaScript"} code`}
          value={value}
          onChange={(event) => {
            if (sourceBytes(event.target.value) <= MAX_CODE_BYTES) onChange(event.target.value);
          }}
          rows={12}
          spellCheck={false}
          className="w-full border border-slate-400 bg-slate-950 p-3 font-mono text-sm text-white"
        />
      ) : null}
    </div>
  );
}
