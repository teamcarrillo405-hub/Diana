"use client";

import { MapPin, Pause, Play, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  cancelAssignmentMediaUpload,
  cleanupAssignmentMediaUploads,
  deleteAssignmentMediaFile,
  finalizeAssignmentMediaUpload,
  initiateAssignmentMediaUpload,
} from "@/app/(app)/assignments/[id]/workspace/source-actions";
import { ToolFrame, useBlockAutosave } from "@/components/assignment-native-tools";
import type { AssignmentArtifactBlockInput } from "@/lib/assignment-artifact";
import type { AssignmentWorkProfile } from "@/lib/assignment-profile";
import { readUploadHeader, validateUpload } from "@/lib/security/upload-validation";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import {
  MUSIC_PITCHES,
  normalizeMediaAnnotations,
  normalizeStroke,
  pitchFrequency,
  privacySafeMarker,
  validateStudentMap,
  type DrawingStroke,
  type MapMarker,
  type MediaAnnotation,
  type MusicNote,
} from "@/lib/native-tools/creative";

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
  const [title, setTitle] = useState(() => String(initial?.content.title ?? ""));
  const [legend, setLegend] = useState(() => String(initial?.content.legend ?? ""));
  const [sourceAttribution, setSourceAttribution] = useState(() => String(initial?.content.sourceAttribution ?? ""));
  const [markers, setMarkers] = useState<MapMarker[]>(() => Array.isArray(initial?.content.markers) ? initial!.content.markers as MapMarker[] : [blankMarker()]);
  const safeMarkers = markers.map((marker) => privacySafeMarker(marker, false));
  const map = { title, legend, scale: "", sourceAttribution, markers: safeMarkers };
  const issues = validateStudentMap(map);
  const block = useMemo<AssignmentArtifactBlockInput>(() => ({
    key: "map-workspace", type: "map", capability: "map_workspace", label: "Map", position: 200,
    content: map,
    plainText: [title, legend, sourceAttribution, ...safeMarkers.map((marker) => `${marker.label}: ${marker.latitude}, ${marker.longitude} (${marker.source})`)].filter(Boolean).join("\n"),
  }), [legend, safeMarkers, sourceAttribution, title]);
  const status = useBlockAutosave(assignmentId, artifactType, block);
  const update = (index: number, patch: Partial<MapMarker>) => setMarkers((current) => current.map((marker, markerIndex) => markerIndex === index ? { ...marker, ...patch } : marker));
  return (
    <ToolFrame title="Map workspace" description="Coordinates save at coarse precision unless a teacher-authorized task requires more." status={status}>
      <div className="grid gap-2 sm:grid-cols-3">
        <input aria-label="Map title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Map title" className="min-h-10 border border-slate-400 bg-white px-2" />
        <input aria-label="Map legend" value={legend} onChange={(event) => setLegend(event.target.value)} placeholder="Legend" className="min-h-10 border border-slate-400 bg-white px-2" />
        <input aria-label="Map source attribution" value={sourceAttribution} onChange={(event) => setSourceAttribution(event.target.value)} placeholder="Sources" className="min-h-10 border border-slate-400 bg-white px-2" />
      </div>
      <div className="relative mt-3 aspect-[2/1] overflow-hidden border border-slate-300 bg-[linear-gradient(#dbeafe_1px,transparent_1px),linear-gradient(90deg,#dbeafe_1px,transparent_1px)] bg-[size:10%_10%]" role="img" aria-label={title || "Student map"}>
        {safeMarkers.map((marker) => <div key={marker.id} className="absolute -translate-x-1/2 -translate-y-1/2 text-[#db2777]" style={{ left: `${((marker.longitude + 180) / 360) * 100}%`, top: `${((90 - marker.latitude) / 180) * 100}%` }} title={marker.label}><MapPin size={22} fill="currentColor" /></div>)}
      </div>
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
  const [strokes, setStrokes] = useState<DrawingStroke[]>(() => Array.isArray(initial?.content.strokes) ? initial!.content.strokes as DrawingStroke[] : []);
  const activeId = useRef<string | null>(null);
  const block = useMemo<AssignmentArtifactBlockInput>(() => ({
    key: "drawing-canvas", type: "drawing", capability: "drawing_canvas", label: "Drawing", position: 210,
    content: { strokes }, plainText: strokes.length > 0 ? `Student drawing with ${strokes.length} strokes.` : "",
  }), [strokes]);
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
  const [notes, setNotes] = useState<MusicNote[]>(() => Array.isArray(initial?.content.notes) ? initial!.content.notes as MusicNote[] : []);
  const [pitch, setPitch] = useState<(typeof MUSIC_PITCHES)[number]>("C4");
  const [playing, setPlaying] = useState(false);
  const block = useMemo<AssignmentArtifactBlockInput>(() => ({
    key: "music-notation", type: "music_notation", capability: "music_notation", label: "Music notation", position: 220,
    content: { notes }, plainText: notes.map((note) => `${note.pitch} ${note.beats} beat`).join("\n"),
  }), [notes]);
  const status = useBlockAutosave(assignmentId, artifactType, block);
  const play = async () => {
    setPlaying(true);
    const context = new AudioContext();
    let start = context.currentTime;
    for (const note of notes) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = pitchFrequency(note.pitch);
      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + note.beats * 0.45);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start); oscillator.stop(start + note.beats * 0.5);
      start += note.beats * 0.5;
    }
    setTimeout(() => { setPlaying(false); void context.close(); }, Math.max(100, (start - context.currentTime) * 1000));
  };
  return (
    <ToolFrame title="Music notation" description="Build a note sequence, inspect pitch and duration, then play it back." status={status}>
      <div className="min-h-24 overflow-x-auto border border-slate-300 bg-white p-4" role="img" aria-label={`Score with ${notes.length} notes`}>
        <div className="relative mt-6 h-12 min-w-[500px] bg-[repeating-linear-gradient(to_bottom,#64748b_0,#64748b_1px,transparent_1px,transparent_12px)]">{notes.map((note, index) => <span key={`${note.pitch}-${index}`} className="absolute flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-[9px] text-white" style={{ left: `${20 + index * 34}px`, top: `${Math.max(-8, 38 - MUSIC_PITCHES.indexOf(note.pitch) * 3)}px` }}>{note.pitch}</span>)}</div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <select aria-label="Pitch" value={pitch} onChange={(event) => setPitch(event.target.value as typeof pitch)} className="min-h-10 border border-slate-400 bg-white px-2">{MUSIC_PITCHES.map((item) => <option key={item}>{item}</option>)}</select>
        <button type="button" onClick={() => setNotes((current) => [...current, { pitch, beats: 1 }])} className="inline-flex min-h-10 items-center gap-2 bg-slate-950 px-3 font-bold text-white"><Plus size={16} /> Add note</button>
        <button type="button" disabled={playing || notes.length === 0} onClick={() => void play()} className="inline-flex min-h-10 items-center gap-2 bg-[#db2777] px-3 font-bold text-white">{playing ? <Pause size={16} /> : <Play size={16} />} Play</button>
      </div>
    </ToolFrame>
  );
}

function MediaTool({ assignmentId, artifactType, kind, initial }: ToolProps & { kind: "audio" | "video" }) {
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [media, setMedia] = useState<Record<string, unknown>>(() => initial?.content.media && typeof initial.content.media === "object" ? initial.content.media as Record<string, unknown> : {});
  const [annotations, setAnnotations] = useState<MediaAnnotation[]>(() => Array.isArray(initial?.content.annotations) ? initial!.content.annotations as MediaAnnotation[] : []);
  const [note, setNote] = useState("");
  const [time, setTime] = useState(0);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const mediaId = typeof media.id === "string" ? media.id : "";
  const mediaName = typeof media.file_name === "string"
    ? media.file_name
    : "Assignment recording";
  const normalized = normalizeMediaAnnotations(annotations, Number(media.durationSeconds) || 86_400);
  const block = useMemo<AssignmentArtifactBlockInput>(() => ({
    key: `${kind}-review`, type: kind, capability: kind === "audio" ? "audio_review" : "video_review", label: `${kind === "audio" ? "Audio" : "Video"} review`, position: kind === "audio" ? 230 : 240,
    content: { media, annotations: normalized }, plainText: [String(media.file_name ?? ""), ...normalized.map((item) => `${item.timeSeconds}s: ${item.note}`)].filter(Boolean).join("\n"),
  }), [kind, media, normalized]);
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
