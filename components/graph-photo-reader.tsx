"use client";

import Image from "next/image";
import { useContext, useRef, useState, useTransition, type FormEvent, type MouseEvent } from "react";
import { addAssignmentSourceFile } from "@/app/(app)/assignments/[id]/workspace/source-actions";
import { saveAssignmentArtifactBlock } from "@/app/(app)/assignments/[id]/hm-actions";
import { AssignmentArtifactSavesContext } from "@/components/assignment-artifact-saves";
import { originalMaterialUrl } from "@/lib/learning-engine/material-navigation";
import {
  MAX_PHOTO_READINGS,
  photoPlotViewport,
  pointFromPhoto,
  readGraphSettings,
  readPhotoCalibration,
  suggestPhotoAxisCrossing,
  type GraphPhoto,
  type ImagePoint,
  type PhotoCalibration,
} from "@/lib/native-tools/graph-work";
import styles from "./student-shell/graph-work.module.css";

const GUIDES = ["origin", "xTick", "yTick"] as const;
type Guide = (typeof GUIDES)[number];
const GUIDE_LABELS: Record<Guide, string> = { origin: "Reference point", xTick: "Tick along x", yTick: "Tick along y" };

function initialGuides(calibration?: PhotoCalibration): Partial<Record<Guide, ImagePoint>> {
  return calibration ? { origin: calibration.origin, xTick: calibration.xTick, yTick: calibration.yTick } : {};
}

function readNumber(value: string): number | undefined {
  return value.trim() ? Number(value) : undefined;
}

export function GraphPhotoReader({ assignmentId, artifactType, initial }: {
  assignmentId: string;
  artifactType: string;
  initial?: unknown;
}) {
  const artifactSaves = useContext(AssignmentArtifactSavesContext);
  const [initialSettings] = useState(() => readGraphSettings(initial));
  const [photo, setPhoto] = useState(initialSettings.photo);
  const [guides, setGuides] = useState(() => initialGuides(initialSettings.photo?.calibration));
  const [calibration, setCalibration] = useState(initialSettings.photo?.calibration);
  const [marks, setMarks] = useState(initialSettings.photo?.marks ?? []);
  const [activeMarker, setActiveMarker] = useState<Guide | "reading">(calibration ? "reading" : "origin");
  const [scale, setScale] = useState(() => ({
    x0: String(calibration?.origin.x ?? 0), y0: String(calibration?.origin.y ?? 0),
    x1: calibration ? String(calibration.xTick.value) : "", y1: calibration ? String(calibration.yTick.value) : "",
  }));
  const [xLabel, setXLabel] = useState(initialSettings.xLabel);
  const [yLabel, setYLabel] = useState(initialSettings.yLabel);
  const [position, setPosition] = useState({ across: "", down: "" });
  const [message, setMessage] = useState("");
  const [imageUnavailable, setImageUnavailable] = useState(false);
  const [pending, startTransition] = useTransition();
  const imageRef = useRef<HTMLImageElement>(null);
  const readingButton = useRef<HTMLButtonElement>(null);
  const acrossField = useRef<HTMLInputElement>(null);
  const points = calibration ? marks.flatMap((mark) => pointFromPhoto(mark, calibration) ?? []) : [];

  async function storePhoto(next: GraphPhoto, confirmed?: PhotoCalibration, readings: typeof points = []) {
    const request = saveAssignmentArtifactBlock({
      assignmentId, artifactType,
      block: {
        key: "graph-photo", type: "graph", capability: "graphing", label: "Graph photo readings", position: 115,
        content: {
          expression: "", points: readings, xLabel, yLabel,
          photo: { sourceId: next.sourceId, title: next.title, marks: confirmed ? marks : [], ...(confirmed ? { calibration: confirmed } : {}) },
          ...(confirmed ? { viewport: photoPlotViewport(confirmed, readings) } : {}),
        },
        plainText: readings.length ? `Photo readings from ${next.title}\n${readings.map((point) => `(${point.x}, ${point.y})`).join("; ")}` : "",
        sourceAnchors: [{ sourceId: next.sourceId, location: "Graph photo" }],
      },
    });
    return artifactSaves ? artifactSaves.track(request) : request;
  }

  function upload(file: File) {
    startTransition(async () => {
      setMessage("Attaching photo…");
      const data = new FormData();
      data.append("file", file);
      data.set("assignmentId", assignmentId);
      data.set("sourceId", crypto.randomUUID());
      data.set("purpose", "graph_photo");
      try {
        const result = await addAssignmentSourceFile(data);
        if (!result.ok) { setMessage(result.error); return; }
        const next: GraphPhoto = { sourceId: result.source.id, title: result.source.title, marks: [] };
        setPhoto(next);
        setGuides({});
        setCalibration(undefined);
        setMarks([]);
        setScale({ x0: "0", y0: "0", x1: "", y1: "" });
        setActiveMarker("origin");
        setImageUnavailable(false);
        const stored = await storePhoto(next);
        setMessage(stored.ok ? "Photo attached. Choose a known point and a tick along each axis." : stored.error);
      } catch {
        setMessage("Diana could not attach the photo right now. Try again.");
      }
    });
  }

  function place(point: ImagePoint) {
    if (activeMarker === "reading") {
      if (!calibration) return;
      if (marks.length >= MAX_PHOTO_READINGS) { setMessage("Remove a reading to add another."); return; }
      if (!pointFromPhoto(point, calibration)) { setMessage("Choose a point closer to the marked axes."); return; }
      setMarks((current) => [...current, point]);
      setMessage("Reading added. Save it to include it in hand-in.");
      return;
    }
    setGuides((current) => ({ ...current, [activeMarker]: point }));
    setCalibration(undefined);
    setActiveMarker(activeMarker === "origin" ? "xTick" : "yTick");
    setMessage(`${GUIDE_LABELS[activeMarker]} placed.`);
  }

  function markPhoto(event: MouseEvent<HTMLButtonElement>) {
    if (event.detail === 0) { acrossField.current?.focus(); return; }
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    place({ u: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), v: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) });
  }

  function placeByPosition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const u = Number(position.across) / 100, v = Number(position.down) / 100;
    if (!position.across || !position.down || !Number.isFinite(u) || !Number.isFinite(v) || u < 0 || v < 0 || u > 1 || v > 1) return;
    place({ u, v });
  }

  function suggestCrossing() {
    const image = imageRef.current;
    if (!image?.naturalWidth || !image.naturalHeight || imageUnavailable) { setMessage("Open the photo before checking the axis crossing."); return; }
    const canvas = document.createElement("canvas");
    const scaleFactor = Math.min(1, 256 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.round(image.naturalWidth * scaleFactor);
    canvas.height = Math.round(image.naturalHeight * scaleFactor);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const suggestion = suggestPhotoAxisCrossing(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
    if (!suggestion) { setMessage("Choose the reference point directly on the photo."); return; }
    setGuides((current) => ({ ...current, origin: suggestion }));
    setCalibration(undefined);
    setActiveMarker("origin");
    setMessage("Suggested axis crossing. Check its position and confirm the scale below.");
  }

  function confirmScale() {
    const confirmed = readPhotoCalibration({
      origin: { ...guides.origin, x: readNumber(scale.x0), y: readNumber(scale.y0) },
      xTick: { ...guides.xTick, value: readNumber(scale.x1) },
      yTick: { ...guides.yTick, value: readNumber(scale.y1) },
    });
    if (!confirmed) { setMessage("Place three separated markers and enter the printed values. Pick a different tick on each axis."); return; }
    setCalibration(confirmed);
    setActiveMarker("reading");
    setMessage("Scale confirmed. Pick a point to read its coordinates.");
    requestAnimationFrame(() => readingButton.current?.focus());
  }

  function saveReadings() {
    if (!photo || !calibration) return;
    startTransition(async () => {
      setMessage("Saving graph readings…");
      const result = await storePhoto(photo, calibration, points).catch(() => ({ ok: false as const, error: "Could not save the readings right now. Try again." }));
      setMessage(result.ok ? "Graph readings saved" : result.error);
    });
  }

  const imageUrl = photo ? originalMaterialUrl(assignmentId, photo.sourceId) : null;
  return (
    <details className={styles.photo} open={photo ? true : undefined}>
      <summary>Read a graph photo</summary>
      <p>Use a straight-on photo with evenly spaced numeric axes. Choose a known point and one tick along each axis, then confirm their printed values.</p>
      <label className={styles.upload}>Upload graph photo<input type="file" disabled={pending} accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) upload(file); event.currentTarget.value = ""; }} /></label>
      {photo && imageUrl ? (
        <fieldset className={styles.photoControls} disabled={pending}>
          <legend className="sr-only">Photo calibration and readings</legend>
          <div className={styles.markerActions} aria-label="Photo markers" role="group">
            {GUIDES.map((guide) => <button key={guide} type="button" aria-pressed={activeMarker === guide} onClick={() => setActiveMarker(guide)}>{GUIDE_LABELS[guide]}</button>)}
            <button ref={readingButton} type="button" aria-pressed={activeMarker === "reading"} disabled={!calibration} onClick={() => setActiveMarker("reading")}>Read a point</button>
          </div>
          <button type="button" className={styles.photoImage} onClick={markPhoto} disabled={imageUnavailable} aria-label={`Place ${activeMarker === "reading" ? "a reading" : GUIDE_LABELS[activeMarker]} on the graph photo`}>
            <Image unoptimized ref={imageRef} src={imageUrl} alt={`Worksheet graph photo: ${photo.title}`} width={900} height={600} onError={() => setImageUnavailable(true)} />
            {GUIDES.map((guide, index) => guides[guide] ? <span key={guide} aria-hidden="true" className={styles.marker} style={{ left: `${guides[guide]!.u * 100}%`, top: `${guides[guide]!.v * 100}%` }}>{["O", "X", "Y"][index]}</span> : null)}
            {marks.map((mark, index) => <span key={`${mark.u}-${mark.v}-${index}`} aria-hidden="true" className={styles.marker} data-reading="true" style={{ left: `${mark.u * 100}%`, top: `${mark.v * 100}%` }}>{index + 1}</span>)}
          </button>
          {imageUnavailable ? <p>The original photo is unavailable. Saved readings remain below.</p> : null}
          <button type="button" className={styles.secondary} onClick={suggestCrossing} disabled={imageUnavailable}>Suggest axis crossing</button>
          <form className={styles.positionFields} onSubmit={placeByPosition}>
            <label>Across photo (%)<input ref={acrossField} type="number" min="0" max="100" step="any" required value={position.across} onChange={(event) => setPosition({ ...position, across: event.target.value })} /></label>
            <label>Down photo (%)<input type="number" min="0" max="100" step="any" required value={position.down} onChange={(event) => setPosition({ ...position, down: event.target.value })} /></label>
            <button type="submit" className={styles.secondary}>Place marker</button>
          </form>
          <div className={styles.axisFields}>
            {([["x0", "Reference x"], ["y0", "Reference y"], ["x1", "X tick value"], ["y1", "Y tick value"]] as const).map(([key, label]) => <label key={key}>{label}<input type="number" step="any" value={scale[key]} onChange={(event) => { setScale({ ...scale, [key]: event.target.value }); setCalibration(undefined); if (activeMarker === "reading") setActiveMarker("origin"); }} /></label>)}
            <label>X label and units<input value={xLabel} maxLength={48} onChange={(event) => setXLabel(event.target.value)} /></label>
            <label>Y label and units<input value={yLabel} maxLength={48} onChange={(event) => setYLabel(event.target.value)} /></label>
          </div>
          <div className={styles.markerActions}>
            <button type="button" onClick={confirmScale}>Confirm scale</button>
            <button type="button" onClick={() => setMarks((current) => current.slice(0, -1))} disabled={!marks.length}>Remove last reading</button>
            <button type="button" className={styles.primary} disabled={!calibration} onClick={saveReadings}>Save readings</button>
          </div>
          {points.length > 0 ? <table className={styles.values}><caption>Approximate photo readings</caption><thead><tr><th scope="col">Point</th><th scope="col">{xLabel || "x"}</th><th scope="col">{yLabel || "y"}</th></tr></thead><tbody>{points.map((point, index) => <tr key={index}><th scope="row">{index + 1}</th><td>{point.x}</td><td>{point.y}</td></tr>)}</tbody></table> : null}
        </fieldset>
      ) : null}
      <p role="status">{message}</p>
    </details>
  );
}
