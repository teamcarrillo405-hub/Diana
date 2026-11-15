"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { MusicNote } from "@/lib/native-tools/creative";
import type { MusicXmlImport } from "@/lib/native-tools/music-runtime";
import { activeRuntimeState } from "@/lib/specialist-artifacts/active-state";
import type { SpecialistActiveRuntimeState } from "@/lib/specialist-artifacts/contracts";

type RuntimeStatus = "idle" | "loading" | "ready" | "error";

type Props = {
  notes: readonly MusicNote[];
  musicXml: MusicXmlImport | null;
  onRuntimeStateChange(state: SpecialistActiveRuntimeState): void;
};

function vexDuration(beats: MusicNote["beats"]): string {
  if (beats === 4) return "w";
  if (beats === 2) return "h";
  if (beats === 0.5) return "8";
  if (beats === 0.25) return "16";
  return "q";
}

function vexKey(pitch: MusicNote["pitch"]): string {
  return `${pitch[0]!.toLowerCase()}/${pitch.slice(1)}`;
}

export function SpecialistNotationRuntime({ notes, musicXml, onRuntimeStateChange }: Props) {
  const sequenceRef = useRef<HTMLDivElement>(null);
  const musicXmlRef = useRef<HTMLDivElement>(null);
  const [vexStatus, setVexStatus] = useState<RuntimeStatus>("loading");
  const [xmlStatus, setXmlStatus] = useState<RuntimeStatus>(musicXml ? "loading" : "idle");
  const engines = useMemo(
    () => ["VexFlow", "Tone.js", ...(musicXml ? ["OpenSheetMusicDisplay"] : [])],
    [musicXml],
  );

  useEffect(() => {
    const host = sequenceRef.current;
    if (!host) return;
    let disposed = false;
    setVexStatus("loading");
    host.replaceChildren();
    void import("vexflow/bravura").then(({ default: VexFlow }) => {
      if (disposed) return;
      const { Formatter, Renderer, Stave, StaveNote, Voice } = VexFlow;
      const width = Math.max(720, Math.min(2_400, 180 + notes.length * 54));
      const renderer = new Renderer(host, Renderer.Backends.SVG);
      renderer.resize(width, 170);
      const context = renderer.getContext();
      const stave = new Stave(10, 34, width - 20);
      stave.addClef("treble").addTimeSignature("4/4").setContext(context).draw();
      if (notes.length > 0) {
        const renderedNotes = notes.slice(0, 256).map((note) => new StaveNote({
          keys: [vexKey(note.pitch)],
          duration: vexDuration(note.beats),
        }));
        const totalBeats = Math.max(1, notes.reduce((sum, note) => sum + note.beats, 0));
        const voice = new Voice({ numBeats: totalBeats, beatValue: 4 });
        voice.setMode(Voice.Mode.SOFT).addTickables(renderedNotes);
        new Formatter().joinVoices([voice]).format([voice], width - 130);
        voice.draw(context, stave);
      }
      setVexStatus("ready");
    }).catch(() => {
      if (!disposed) setVexStatus("error");
    });
    return () => {
      disposed = true;
      host.replaceChildren();
    };
  }, [notes]);

  useEffect(() => {
    const host = musicXmlRef.current;
    if (!host) return;
    host.replaceChildren();
    if (!musicXml) {
      setXmlStatus("idle");
      return;
    }
    let disposed = false;
    setXmlStatus("loading");
    void import("opensheetmusicdisplay").then(async ({ OpenSheetMusicDisplay }) => {
      if (disposed) return;
      const viewer = new OpenSheetMusicDisplay(host, {
        autoResize: true,
        backend: "svg",
        drawTitle: true,
      });
      await viewer.load(musicXml.xml, musicXml.metadata.title || musicXml.metadata.fileName);
      if (disposed) return;
      viewer.render();
      setXmlStatus("ready");
    }).catch(() => {
      if (!disposed) setXmlStatus("error");
    });
    return () => {
      disposed = true;
      host.replaceChildren();
    };
  }, [musicXml]);

  useEffect(() => {
    if (vexStatus === "loading" || xmlStatus === "loading") {
      onRuntimeStateChange(activeRuntimeState("loading", engines));
      return;
    }
    if (vexStatus === "error" || xmlStatus === "error") {
      onRuntimeStateChange(activeRuntimeState(
        "limited",
        engines,
        "Part of the notation preview could not render. Notes, score metadata, and typed or ink work remain available.",
      ));
      return;
    }
    onRuntimeStateChange(activeRuntimeState(
      "ready",
      engines,
      "Bounded notation rendering is ready. This is not a full engraving editor.",
    ));
  }, [engines, onRuntimeStateChange, vexStatus, xmlStatus]);

  return (
    <div className="grid gap-3">
      <div className="overflow-x-auto border border-slate-300 bg-white">
        <div ref={sequenceRef} className="min-h-[170px]" aria-label={`Score with ${notes.length} student-authored notes`} />
      </div>
      {musicXml ? (
        <section className="border border-slate-300 bg-white p-3" aria-label="Imported MusicXML score">
          <header className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <strong>{musicXml.metadata.title || musicXml.metadata.fileName}</strong>
            <span className="text-slate-600">
              {musicXml.metadata.partCount} part{musicXml.metadata.partCount === 1 ? "" : "s"} | {musicXml.metadata.measureCount} measures
            </span>
          </header>
          <div ref={musicXmlRef} className="max-h-[520px] overflow-auto" />
        </section>
      ) : <div ref={musicXmlRef} className="hidden" />}
    </div>
  );
}
