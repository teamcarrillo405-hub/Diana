"use client";

import { Pause, Play, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  cancelAssignmentMediaUpload,
  cleanupAssignmentMediaUploads,
  deleteAssignmentMediaFile,
  finalizeAssignmentMediaUpload,
  initiateAssignmentMediaUpload,
} from "@/app/(app)/assignments/[id]/workspace/source-actions";
import { ToolFrame, useBlockAutosave } from "@/components/assignment-native-tools";
import { SpecialistMapRuntime } from "@/components/specialist-map-runtime";
import { SpecialistNotationRuntime } from "@/components/specialist-notation-runtime";
import type { AssignmentArtifactBlockInput } from "@/lib/assignment-artifact";
import type { AssignmentWorkProfile } from "@/lib/assignment-profile";
import { readUploadHeader, validateUpload } from "@/lib/security/upload-validation";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import {
  MUSIC_PITCHES,
  normalizeMediaAnnotations,
  normalizeStroke,
  privacySafeMarker,
  validateStudentMap,
  type DrawingStroke,
  type MapMarker,
  type MediaAnnotation,
  type MusicNote,
} from "@/lib/native-tools/creative";
import {
  MAX_GEOJSON_BYTES,
  parseSchoolGeoJson,
  restoreSchoolGeoJsonImport,
  type SchoolGeoJsonImport,
} from "@/lib/native-tools/map-runtime";
import {
  MAX_MUSIC_XML_BYTES,
  playBoundedMusicSequence,
  restoreMusicXmlImport,
  validateMusicXml,
} from "@/lib/native-tools/music-runtime";
import { activeRuntimeState } from "@/lib/specialist-artifacts/active-state";
import type { SpecialistActiveRuntimeState } from "@/lib/specialist-artifacts/contracts";
import {
  mergeSpecialistEditorContent,
  specialistEditorRuntimeState,
} from "@/lib/specialist-artifacts/editor-state";

type Props = {
  assignmentId: string;
  profile: AssignmentWorkProfile;
  initialBlocks: readonly AssignmentArtifactBlockInput[];
};

const blankMarker = (): MapMarker => ({
  id: crypto.randomUUID(),
  latitude: 0,
  longitude: 0,
  label: "",
  source: "",
});

export function AssignmentCreativeTools({ assignmentId, profile, initialBlocks }: Props) {
  const capabilities = useMemo(() => new Set(profile.capabilities), [profile.capabilities]);
  const initial = (key: string) => initialBlocks.find((block) => block.key === key);
  useEffect(() => {
    if (capabilities.has("audio_review") || capabilities.has("video_review")) {
      void cleanupAssignmentMediaUploads();
    }
  }, [capabilities]);
  return (
    <section className="grid gap-5" aria-label="Creative and spatial tools">
      {capabilities.has("map_workspace") ? <MapTool assignmentId={assignmentId} artifactType={profile.artifactType} initial={initial("map-workspace")} /> : null}
      {capabilities.has("drawing_canvas") ? <DrawingTool assignmentId={assignmentId} artifactType={profile.artifactType} initial={initial("drawing-canvas")} /> : null}
      {capabilities.has("music_notation") ? <MusicTool assignmentId={assignmentId} artifactType={profile.artifactType} initial={initial("music-notation")} /> : null}
      {capabilities.has("audio_review") ? <MediaTool assignmentId={assignmentId} artifactType={profile.artifactType} kind="audio" initial={initial("audio-review")} /> : null}
      {capabilities.has("video_review") ? <MediaTool assignmentId={assignmentId} artifactType={profile.artifactType} kind="video" initial={initial("video-review")} /> : null}
    </section>
  );
}

type ToolProps = {
  assignmentId: string;
  artifactType: string;
  initial?: AssignmentArtifactBlockInput;
};

function MapTool({ assignmentId, artifactType, initial }: ToolProps) {
  const persistedContent = initial?.content;
  const [title, setTitle] = useState(() => String(initial?.content.title ?? ""));
  const [legend, setLegend] = useState(() => String(initial?.content.legend ?? ""));
  const [scale, setScale] = useState(() => String(initial?.content.scale ?? ""));
  const [sourceAttribution, setSourceAttribution] = useState(() => String(initial?.content.sourceAttribution ?? ""));
  const [markers, setMarkers] = useState<MapMarker[]>(() => Array.isArray(initial?.content.markers) ? initial!.content.markers as MapMarker[] : [blankMarker()]);
  const [importedMap, setImportedMap] = useState<SchoolGeoJsonImport | null>(() => restoreSchoolGeoJsonImport(initial?.content.importedMap));
  const [importMessage, setImportMessage] = useState("");
  const [runtimeState, setRuntimeState] = useState<SpecialistActiveRuntimeState>(() =>
    specialistEditorRuntimeState(
      persistedContent,
      activeRuntimeState("loading", ["MapLibre GL JS", "Turf"]),
    )
  );
  const safeMarkers = useMemo(
    () => markers.map((marker) => privacySafeMarker(marker, false)),
    [markers],
  );
  const map = useMemo(
    () => ({ title, legend, scale, sourceAttribution, markers: safeMarkers, importedMap, runtimeState }),
    [importedMap, legend, runtimeState, safeMarkers, scale, sourceAttribution, title],
  );
  const issues = validateStudentMap(map);
  const bounds = useMemo<[number, number, number, number] | null>(() => {
    const raw = importedMap?.analysis.bounds ?? (safeMarkers.length > 0
      ? [
          Math.min(...safeMarkers.map((marker) => marker.longitude)),
          Math.min(...safeMarkers.map((marker) => marker.latitude)),
          Math.max(...safeMarkers.map((marker) => marker.longitude)),
          Math.max(...safeMarkers.map((marker) => marker.latitude)),
        ] as [number, number, number, number]
      : null);
    if (!raw) return null;
    const longitudePad = raw[0] === raw[2] ? 1 : 0;
    const latitudePad = raw[1] === raw[3] ? 1 : 0;
    return [raw[0] - longitudePad, raw[1] - latitudePad, raw[2] + longitudePad, raw[3] + latitudePad];
  }, [importedMap, safeMarkers]);
  const block = useMemo<AssignmentArtifactBlockInput>(() => ({
    key: "map-workspace", type: "map", capability: "map_workspace", label: "Map", position: 200,
    content: mergeSpecialistEditorContent(persistedContent, map),
    plainText: [
      title,
      legend,
      scale ? `Scale: ${scale}` : "",
      sourceAttribution,
      importedMap ? `${importedMap.fileName}: ${importedMap.analysis.featureCount} features, ${importedMap.analysis.areaSquareKilometers} square kilometers, ${importedMap.analysis.lineLengthKilometers} line kilometers.` : "",
      ...safeMarkers.map((marker) => `${marker.label}: ${marker.latitude}, ${marker.longitude} (${marker.source})`),
    ].filter(Boolean).join("\n"),
  }), [importedMap, legend, map, persistedContent, safeMarkers, scale, sourceAttribution, title]);
  const status = useBlockAutosave(assignmentId, artifactType, block);
  const update = (index: number, patch: Partial<MapMarker>) => setMarkers((current) => current.map((marker, markerIndex) => markerIndex === index ? { ...marker, ...patch } : marker));
  const importGeoJson = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_GEOJSON_BYTES) {
      setImportMessage("Keep GeoJSON imports under 1 MB for this beta workspace.");
      return;
    }
    setImportMessage("Checking the map data...");
    try {
      const result = parseSchoolGeoJson(await file.text(), file.name);
      if (!result.ok) {
        setImportMessage(result.error);
        return;
      }
      setImportedMap(result.value);
      setRuntimeState(activeRuntimeState("loading", ["MapLibre GL JS", "Turf"]));
      setImportMessage(`${result.value.analysis.featureCount} features analyzed locally.`);
    } catch {
      setImportMessage("This map file could not be read. Coordinate markers remain available.");
    }
  };
  return (
    <ToolFrame title="Map workspace" description="Place privacy-rounded markers or inspect bounded local GeoJSON with school-level distance and area analysis. Basemap tiles, routing, and full GIS editing are not enabled." status={status}>
      <div className="grid gap-2 sm:grid-cols-4">
        <input aria-label="Map title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Map title" className="min-h-10 border border-slate-400 bg-white px-2" />
        <input aria-label="Map legend" value={legend} onChange={(event) => setLegend(event.target.value)} placeholder="Legend" className="min-h-10 border border-slate-400 bg-white px-2" />
        <input aria-label="Map scale" value={scale} onChange={(event) => setScale(event.target.value)} placeholder="Scale" className="min-h-10 border border-slate-400 bg-white px-2" />
        <input aria-label="Map source attribution" value={sourceAttribution} onChange={(event) => setSourceAttribution(event.target.value)} placeholder="Sources" className="min-h-10 border border-slate-400 bg-white px-2" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 bg-slate-950 px-3 font-bold text-white"><Upload size={16} /> Import GeoJSON<input type="file" accept=".geojson,.json,application/geo+json,application/json" className="sr-only" onChange={(event) => { const input = event.currentTarget; void importGeoJson(input.files?.[0]).finally(() => { input.value = ""; }); }} /></label>
        <span className="text-sm font-bold text-slate-700" aria-live="polite">{importMessage}</span>
      </div>
      <SpecialistMapRuntime title={title} markers={safeMarkers} importedData={importedMap?.data ?? null} bounds={bounds} onRuntimeStateChange={setRuntimeState} />
      {importedMap ? <p className="mb-0 mt-2 text-sm text-slate-700">{importedMap.analysis.featureCount} features | {importedMap.analysis.coordinateCount} coordinates | {importedMap.analysis.areaSquareKilometers} km2 area | {importedMap.analysis.lineLengthKilometers} km line length</p> : null}
      <div className="mt-3 grid gap-2">{markers.map((marker, index) => <div key={marker.id} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input aria-label={`Marker ${index + 1} label`} value={marker.label} onChange={(event) => update(index, { label: event.target.value })} placeholder="Label" className="min-h-10 border border-slate-400 bg-white px-2" />
        <input aria-label={`Marker ${index + 1} latitude`} type="number" value={marker.latitude} onChange={(event) => update(index, { latitude: Number(event.target.value) })} placeholder="Latitude" className="min-h-10 border border-slate-400 bg-white px-2" />
        <input aria-label={`Marker ${index + 1} longitude`} type="number" value={marker.longitude} onChange={(event) => update(index, { longitude: Number(event.target.value) })} placeholder="Longitude" className="min-h-10 border border-slate-400 bg-white px-2" />
        <input aria-label={`Marker ${index + 1} source`} value={marker.source} onChange={(event) => update(index, { source: event.target.value })} placeholder="Source" className="min-h-10 border border-slate-400 bg-white px-2" />
      </div>)}</div>
      <button type="button" onClick={() => setMarkers((current) => [...current, blankMarker()])} className="mt-3 inline-flex min-h-10 items-center gap-2 bg-slate-950 px-3 font-bold text-white"><Plus size={16} /> Add marker</button>
      {issues.length > 0 ? <p className="mb-0 mt-3 text-sm font-bold text-amber-800">{issues.join(" ")}</p> : null}
    </ToolFrame>
  );
}

function DrawingTool({ assignmentId, artifactType, initial }: ToolProps) {
  const persistedContent = initial?.content;
  const [strokes, setStrokes] = useState<DrawingStroke[]>(() => Array.isArray(initial?.content.strokes) ? initial!.content.strokes as DrawingStroke[] : []);
  const activeId = useRef<string | null>(null);
  const block = useMemo<AssignmentArtifactBlockInput>(() => ({
    key: "drawing-canvas", type: "drawing", capability: "drawing_canvas", label: "Drawing", position: 210,
    content: mergeSpecialistEditorContent(persistedContent, {
      logicalWidth: 800,
      logicalHeight: 400,
      strokes,
    }),
    plainText: strokes.length > 0 ? `Student drawing with ${strokes.length} strokes.` : "",
  }), [persistedContent, strokes]);
  const status = useBlockAutosave(assignmentId, artifactType, block);
  const point = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height };
  };
  return (
    <ToolFrame title="Drawing canvas" description="Sketch, diagram, or annotate with student-owned strokes." status={status}>
      <svg viewBox="0 0 800 400" className="w-full touch-none border border-slate-300 bg-white" aria-label="Drawing canvas"
        onPointerDown={(event) => { const id = crypto.randomUUID(); activeId.current = id; event.currentTarget.setPointerCapture(event.pointerId); setStrokes((current) => [...current, normalizeStroke({ id, color: "#0f172a", width: 3, points: [point(event)] })]); }}
        onPointerMove={(event) => { if (!activeId.current || event.buttons === 0) return; const next = point(event); setStrokes((current) => current.map((stroke) => stroke.id === activeId.current ? normalizeStroke({ ...stroke, points: [...stroke.points, next] }) : stroke)); }}
        onPointerUp={() => { activeId.current = null; }}>
        {strokes.map((stroke) => <polyline key={stroke.id} points={stroke.points.map((item) => `${item.x * 800},${item.y * 400}`).join(" ")} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" />)}
      </svg>
      <button type="button" onClick={() => setStrokes([])} className="mt-3 min-h-10 border border-slate-400 bg-white px-3 font-bold">Clear drawing</button>
    </ToolFrame>
  );
}

function MusicTool({ assignmentId, artifactType, initial }: ToolProps) {
  const persistedContent = initial?.content;
  const [notes, setNotes] = useState<MusicNote[]>(() => Array.isArray(initial?.content.notes) ? initial!.content.notes as MusicNote[] : []);
  const [pitch, setPitch] = useState<(typeof MUSIC_PITCHES)[number]>("C4");
  const [beats, setBeats] = useState<MusicNote["beats"]>(1);
  const [musicXml, setMusicXml] = useState(() => restoreMusicXmlImport(initial?.content.musicXml));
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState("");
  const [runtimeState, setRuntimeState] = useState<SpecialistActiveRuntimeState>(() =>
    specialistEditorRuntimeState(
      persistedContent,
      activeRuntimeState("loading", ["VexFlow", "Tone.js"]),
    )
  );
  const block = useMemo<AssignmentArtifactBlockInput>(() => ({
    key: "music-notation", type: "music_notation", capability: "music_notation", label: "Music notation", position: 220,
    content: mergeSpecialistEditorContent(persistedContent, {
      notes,
      musicXml,
      runtimeState,
    }),
    plainText: [
      ...notes.map((note) => `${note.pitch} ${note.beats} beat`),
      musicXml ? `Imported MusicXML: ${musicXml.metadata.title || musicXml.metadata.fileName}, ${musicXml.metadata.partCount} parts, ${musicXml.metadata.measureCount} measures.` : "",
    ].filter(Boolean).join("\n"),
  }), [musicXml, notes, persistedContent, runtimeState]);
  const status = useBlockAutosave(assignmentId, artifactType, block);
  const play = async () => {
    setPlaying(true);
    setRuntimeState(activeRuntimeState("running", ["VexFlow", "Tone.js"], "Playing the bounded note sequence locally."));
    try {
      const result = await playBoundedMusicSequence(notes);
      setMessage(result.ok ? `Playback complete (${result.durationSeconds.toFixed(1)} seconds).` : result.error);
      setRuntimeState(activeRuntimeState(
        result.ok ? "complete" : "limited",
        ["VexFlow", "Tone.js", ...(musicXml ? ["OpenSheetMusicDisplay"] : [])],
        result.ok ? "Local notation playback completed." : result.error,
      ));
    } finally {
      setPlaying(false);
    }
  };
  const importMusicXml = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_MUSIC_XML_BYTES) {
      setMessage("Keep MusicXML imports under 512 KB for this beta viewer.");
      return;
    }
    setMessage("Checking the score...");
    try {
      const result = validateMusicXml(await file.text(), file.name);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMusicXml(result.value);
      setRuntimeState(activeRuntimeState("loading", ["VexFlow", "Tone.js", "OpenSheetMusicDisplay"]));
      setMessage(`${result.value.metadata.measureCount} measures imported for view-only rendering.`);
    } catch {
      setMessage("This score could not be read. The typed note sequence remains available.");
    }
  };
  return (
    <ToolFrame title="Music notation" description="Build and play a bounded note sequence or view uncompressed score-partwise MusicXML. Full engraving, compressed MXL, MIDI devices, and instrument control are not enabled." status={status}>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 bg-slate-950 px-3 font-bold text-white"><Upload size={16} /> Import MusicXML<input type="file" accept=".musicxml,.xml,application/vnd.recordare.musicxml+xml,application/xml,text/xml" className="sr-only" onChange={(event) => { const input = event.currentTarget; void importMusicXml(input.files?.[0]).finally(() => { input.value = ""; }); }} /></label>
        <span className="text-sm font-bold text-slate-700" aria-live="polite">{message}</span>
      </div>
      <SpecialistNotationRuntime notes={notes} musicXml={musicXml} onRuntimeStateChange={setRuntimeState} />
      <div className="mt-3 flex flex-wrap gap-2">
        <select aria-label="Pitch" value={pitch} onChange={(event) => setPitch(event.target.value as typeof pitch)} className="min-h-10 border border-slate-400 bg-white px-2">{MUSIC_PITCHES.map((item) => <option key={item}>{item}</option>)}</select>
        <select aria-label="Note duration" value={beats} onChange={(event) => setBeats(Number(event.target.value) as MusicNote["beats"])} className="min-h-10 border border-slate-400 bg-white px-2"><option value={0.25}>Sixteenth</option><option value={0.5}>Eighth</option><option value={1}>Quarter</option><option value={2}>Half</option><option value={4}>Whole</option></select>
        <button type="button" onClick={() => setNotes((current) => current.length < 256 ? [...current, { pitch, beats }] : current)} className="inline-flex min-h-10 items-center gap-2 bg-slate-950 px-3 font-bold text-white"><Plus size={16} /> Add note</button>
        <button type="button" disabled={playing || notes.length === 0} onClick={() => void play()} className="inline-flex min-h-10 items-center gap-2 bg-[#db2777] px-3 font-bold text-white">{playing ? <Pause size={16} /> : <Play size={16} />} Play</button>
        <button type="button" disabled={notes.length === 0} onClick={() => setNotes((current) => current.slice(0, -1))} className="inline-flex min-h-10 items-center gap-2 border border-slate-400 bg-white px-3 font-bold">Remove last</button>
      </div>
    </ToolFrame>
  );
}

function MediaTool({ assignmentId, artifactType, kind, initial }: ToolProps & { kind: "audio" | "video" }) {
  const persistedContent = initial?.content;
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [media, setMedia] = useState<Record<string, unknown>>(() => initial?.content.media && typeof initial.content.media === "object" ? initial.content.media as Record<string, unknown> : {});
  const [annotations, setAnnotations] = useState<MediaAnnotation[]>(() => Array.isArray(initial?.content.annotations) ? initial!.content.annotations as MediaAnnotation[] : []);
  const [note, setNote] = useState("");
  const [time, setTime] = useState(0);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const mediaId = typeof (media.id ?? media.assetId) === "string"
    ? String(media.id ?? media.assetId)
    : "";
  const mediaName = typeof (media.file_name ?? media.fileName) === "string"
    ? String(media.file_name ?? media.fileName)
    : "Assignment recording";
  const normalized = normalizeMediaAnnotations(
    annotations,
    Number(media.durationSeconds ?? media.duration_seconds) || 86_400,
  );
  const block = useMemo<AssignmentArtifactBlockInput>(() => ({
    key: `${kind}-review`, type: kind, capability: kind === "audio" ? "audio_review" : "video_review", label: `${kind === "audio" ? "Audio" : "Video"} review`, position: kind === "audio" ? 230 : 240,
    content: mergeSpecialistEditorContent(persistedContent, {
      media,
      annotations: normalized,
    }),
    plainText: [String(media.file_name ?? media.fileName ?? ""), ...normalized.map((item) => `${item.timeSeconds}s: ${item.note}`)].filter(Boolean).join("\n"),
  }), [kind, media, normalized, persistedContent]);
  const status = useBlockAutosave(assignmentId, artifactType, block);
  const upload = () => startTransition(async () => {
    if (!file) return;
    if (!consent) return setMessage("Confirm that this is the recording you want to add.");
    let activeUploadId: string | null = null;
    try {
      setMessage("Checking the recording...");
      const header = await readUploadHeader(file);
      const validation = validateUpload(kind === "audio" ? "assignmentAudio" : "assignmentVideo", {
        name: file.name,
        mimeType: file.type,
        size: file.size,
        bytes: header,
      });
      if (!validation.ok) return setMessage(validation.error);
      const prepared = await initiateAssignmentMediaUpload({
        assignmentId,
        mediaKind: kind,
        consentConfirmed: true,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        headerBytes: Array.from(header),
      });
      if (!prepared.ok) return setMessage(prepared.error);
      activeUploadId = prepared.uploadId;

      setMessage("Uploading the recording privately...");
      const supabase = createBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from("assignment-media")
        .uploadToSignedUrl(prepared.storageKey, prepared.token, file, { contentType: prepared.mimeType });
      if (uploadError) {
        await cancelAssignmentMediaUpload({ assignmentId, uploadId: prepared.uploadId });
        activeUploadId = null;
        return setMessage("The recording stayed with you. Try the upload again.");
      }

      setMessage("Verifying the recording...");
      const result = await finalizeAssignmentMediaUpload({ assignmentId, uploadId: prepared.uploadId });
      activeUploadId = null;
      if (!result.ok) return setMessage(result.error);
      setMedia(result.media);
      setFile(null);
      setConsent(false);
      setMessage("Recording added privately.");
    } catch {
      if (activeUploadId) {
        await cancelAssignmentMediaUpload({ assignmentId, uploadId: activeUploadId }).catch(() => undefined);
      }
      setMessage("The recording stayed with you. Try the upload again.");
    }
  });
  const remove = () => startTransition(async () => {
    if (!mediaId) return;
    const result = await deleteAssignmentMediaFile({
      assignmentId,
      mediaId,
    });
    if (!result.ok) return setMessage(result.error);
    setMedia({});
    setAnnotations([]);
    setFile(null);
    setConsent(false);
    setMessage("Recording removed.");
  });
  return (
    <ToolFrame title={`${kind === "audio" ? "Audio" : "Video"} review`} description="You choose the recording. It stays private for up to 180 days unless you remove it sooner. Feedback uses timestamps and the teacher rubric, not appearance or identity inference." status={status}>
      <input aria-label={`Choose ${kind} file`} type="file" accept={kind === "audio" ? "audio/*" : "video/*"} onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
      <label className="mt-3 flex items-start gap-2 text-sm font-bold"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1" /> This is the recording I want to add to this assignment.</label>
      <button type="button" disabled={!file || !consent || pending} onClick={upload} className="mt-3 inline-flex min-h-10 items-center gap-2 bg-slate-950 px-3 font-bold text-white disabled:opacity-50"><Upload size={16} /> Add recording</button>
      <span className="ml-3 text-sm font-bold" aria-live="polite">{message}</span>
      {mediaId ? (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-slate-300 bg-white p-3">
            <strong className="break-all text-sm">{mediaName}</strong>
            <button type="button" disabled={pending} onClick={remove} className="inline-flex min-h-10 items-center gap-2 border border-slate-950 bg-white px-3 font-bold text-slate-950 disabled:opacity-50"><Trash2 size={16} /> Remove recording</button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-[7rem_1fr_auto]">
            <input aria-label="Timestamp in seconds" type="number" min="0" value={time} onChange={(event) => setTime(Number(event.target.value) || 0)} className="min-h-10 border border-slate-400 bg-white px-2" />
            <input aria-label="Timestamp note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="What do you notice here?" className="min-h-10 border border-slate-400 bg-white px-2" />
            <button type="button" disabled={!note.trim()} onClick={() => { setAnnotations((current) => [...current, { id: crypto.randomUUID(), timeSeconds: time, note, author: "student" }]); setNote(""); }} className="min-h-10 bg-[#db2777] px-3 font-bold text-white">Add note</button>
          </div>
          <ul className="mb-0 mt-3 grid gap-2 p-0">{normalized.map((annotation) => <li key={annotation.id} className="list-none border border-slate-300 bg-white p-2 text-sm"><strong>{annotation.timeSeconds}s</strong> {annotation.note}</li>)}</ul>
        </>
      ) : null}
    </ToolFrame>
  );
}
