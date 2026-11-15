"use client";

import {
  Check, ChevronDown, Eraser, File, Grid2X2, GripHorizontal,
  Menu, PenLine, Redo2, SlidersHorizontal, Trash2, Undo2,
} from "lucide-react";
import {
  useEffect, useId, useRef, useState,
  type KeyboardEvent, type PointerEvent, type RefObject,
} from "react";

import {
  parseAssignmentInkDocument,
  serializeAssignmentInk,
  type AssignmentInkDocument,
  type AssignmentInkPoint,
  type AssignmentInkStroke,
} from "@/lib/assignment-ink";
import styles from "./preview-work-pad.module.css";

export type PreviewWorkPadProps = {
  work: string;
  ink: string;
  onWorkChange(value: string): void;
  onInkChange(value: string): void;
  onReview(): void;
  editorRef?: RefObject<HTMLTextAreaElement | null>;
  onUndoText(): void;
  canUndoText: boolean;
};

type Paper = "blank" | "lined" | "graph";
type InkTool = "pen" | "eraser";
type InkHistory = { undo: AssignmentInkStroke[][]; redo: AssignmentInkStroke[][] };
type Gesture = {
  pointerId: number;
  kind: "pending" | InkTool;
  origin: AssignmentInkStroke[];
  start: AssignmentInkPoint;
  previous: AssignmentInkPoint;
  clientX: number;
  clientY: number;
};
type ResizeGesture = { pointerId: number; startY: number; startHeight: number };
const MIN_HEIGHT = 250;
const MAX_HEIGHT = 1200;

function distanceToSegment(point: AssignmentInkPoint, start: AssignmentInkPoint, end: AssignmentInkPoint) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const ratio = lengthSquared === 0 ? 0
    : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - start.x - ratio * dx, point.y - start.y - ratio * dy);
}

function strokeTouchesPoint(stroke: AssignmentInkStroke, point: AssignmentInkPoint, radius: number) {
  return stroke.points.some((candidate, index) => distanceToSegment(
    point, stroke.points[Math.max(0, index - 1)], candidate,
  ) <= radius);
}

export function PreviewWorkPad({
  work, ink, onWorkChange, onInkChange, onReview, editorRef, onUndoText, canUndoText,
}: PreviewWorkPadProps) {
  const localEditor = useRef<HTMLTextAreaElement>(null);
  const editor = editorRef ?? localEditor;
  const workBox = useRef<HTMLDivElement>(null);
  const toolsId = useId();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [paper, setPaper] = useState<Paper>("lined");
  const [tool, setTool] = useState<InkTool>("pen");
  const [typing, setTyping] = useState(false);
  const [height, setHeight] = useState(300);
  const [document, setDocument] = useState(() => parseAssignmentInkDocument(ink));
  const documentRef = useRef(document);
  const [history, setHistory] = useState<InkHistory>({ undo: [], redo: [] });
  const [cleared, setCleared] = useState<{ work: string; ink: string } | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const resize = useRef<ResizeGesture | null>(null);
  const resized = useRef(false);
  const expected = useRef({ work, ink });

  // Parent-owned drafts may change when the selected unit changes. Local echoes
  // preserve history; external drafts discard unfinished gestures and recovery.
  useEffect(() => {
    if (expected.current.work === work && expected.current.ink === ink) return;
    expected.current = { work, ink };
    gesture.current = null;
    const next = parseAssignmentInkDocument(ink);
    documentRef.current = next;
    setDocument(next);
    setHistory({ undo: [], redo: [] });
    setCleared(null);
  }, [work, ink]);

  useEffect(() => {
    const box = workBox.current;
    if (!box || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height: boxHeight } = entry.contentRect;
      if (width <= 0 || boxHeight <= 0) return;
      const current = documentRef.current;
      const logicalHeight = Math.max(1, Math.round(current.logicalWidth * boxHeight / width));
      if (logicalHeight === current.logicalHeight) return;
      // Extending the paper keeps ink's vertical scale instead of stretching it.
      const next = { ...current, logicalHeight };
      documentRef.current = next;
      setDocument(next);
      // Viewport changes are not student edits. Commit these dimensions with
      // the next ink gesture, without invalidating an existing review now.
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  function display(next: AssignmentInkDocument) {
    documentRef.current = next;
    setDocument(next);
  }

  function publish(next: AssignmentInkDocument) {
    display(next);
    const value = serializeAssignmentInk(next.strokes, next);
    expected.current.ink = value;
    onInkChange(value);
  }

  function pointFromEvent(event: PointerEvent<HTMLDivElement>): AssignmentInkPoint {
    const rect = event.currentTarget.getBoundingClientRect();
    const current = documentRef.current;
    const width = rect.width || current.logicalWidth;
    const boxHeight = rect.height || current.logicalHeight;
    return {
      x: Math.max(0, Math.min(current.logicalWidth, (event.clientX - rect.left) * current.logicalWidth / width)),
      y: Math.max(0, Math.min(current.logicalHeight, (event.clientY - rect.top) * current.logicalHeight / boxHeight)),
    };
  }

  function startInk(event: PointerEvent<HTMLDivElement>, points: AssignmentInkPoint[]) {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    editor.current?.blur();
    const stroke = { id: globalThis.crypto.randomUUID(), points };
    display({ ...documentRef.current, strokes: [...documentRef.current.strokes, stroke] });
  }

  function eraseTo(point: AssignmentInkPoint) {
    const current = gesture.current;
    if (!current) return;
    const width = workBox.current?.getBoundingClientRect().width || documentRef.current.logicalWidth;
    const radius = 13 * documentRef.current.logicalWidth / width;
    const start = current.previous;
    // Sample the swept eraser path so quick drags do not skip thin strokes.
    const steps = Math.max(1, Math.ceil(Math.hypot(point.x - start.x, point.y - start.y) / (radius / 2)));
    const strokes = documentRef.current.strokes.filter((stroke) => {
      for (let step = 0; step <= steps; step++) {
        const sample = { x: start.x + (point.x - start.x) * step / steps, y: start.y + (point.y - start.y) * step / steps };
        if (strokeTouchesPoint(stroke, sample, radius)) return false;
      }
      return true;
    });
    current.previous = point;
    if (strokes.length !== documentRef.current.strokes.length) display({ ...documentRef.current, strokes });
  }

  function beginGesture(event: PointerEvent<HTMLDivElement>) {
    if (gesture.current || event.isPrimary === false || (event.pointerType !== "touch" && event.button !== 0)) return;
    if (tool === "pen" && event.pointerType === "touch" && globalThis.document.activeElement === editor.current) return;
    const point = pointFromEvent(event);
    const kind = tool === "eraser" ? "eraser" : event.pointerType === "pen" ? "pen" : "pending";
    gesture.current = {
      pointerId: event.pointerId, kind, origin: documentRef.current.strokes,
      start: point, previous: point, clientX: event.clientX, clientY: event.clientY,
    };
    if (kind === "pen") startInk(event, [point]);
    if (kind === "eraser") {
      event.preventDefault();
      editor.current?.blur();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      eraseTo(point);
    }
  }

  function moveGesture(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const point = pointFromEvent(event);
    if (current.kind === "pending") {
      if (Math.hypot(event.clientX - current.clientX, event.clientY - current.clientY) < 5) return;
      current.kind = "pen";
      startInk(event, [current.start, point]);
      return;
    }
    event.preventDefault();
    if (current.kind === "eraser") {
      eraseTo(point);
      return;
    }
    const strokes = documentRef.current.strokes;
    const stroke = strokes[strokes.length - 1];
    if (!stroke) return;
    const last = stroke.points[stroke.points.length - 1];
    if (point.x === last.x && point.y === last.y) return;
    display({ ...documentRef.current, strokes: [...strokes.slice(0, -1), { ...stroke, points: [...stroke.points, point] }] });
  }

  function finishGesture(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (current.kind !== "pending" && !cancelled) moveGesture(event);
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (cancelled) {
      display({ ...documentRef.current, strokes: current.origin });
      return;
    }
    if (current.kind === "pending") {
      editor.current?.focus();
      return;
    }
    event.preventDefault();
    if (current.origin === documentRef.current.strokes) return;
    setHistory((previous) => ({ undo: [...previous.undo, current.origin], redo: [] }));
    setCleared(null);
    publish(documentRef.current);
  }

  function travelInk(direction: "undo" | "redo") {
    const stack = history[direction];
    const strokes = stack[stack.length - 1];
    if (!strokes) return;
    const other = direction === "undo" ? "redo" : "undo";
    setHistory({ ...history, [direction]: stack.slice(0, -1), [other]: [...history[other], documentRef.current.strokes] });
    setCleared(null);
    publish({ ...documentRef.current, strokes });
  }

  function clearWork() {
    setCleared({ work, ink });
    setHistory({ undo: [], redo: [] });
    expected.current.work = "";
    onWorkChange("");
    publish({ ...documentRef.current, strokes: [] });
  }

  function undoClear() {
    if (!cleared) return;
    expected.current.work = cleared.work;
    onWorkChange(cleared.work);
    publish(parseAssignmentInkDocument(cleared.ink));
    setCleared(null);
    setTool("pen");
    editor.current?.focus();
  }

  function changeHeight(value: number) {
    setHeight(Math.round(Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, value))));
  }

  function resizeWithKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    const heights: Record<string, number> = { ArrowDown: height + 40, ArrowUp: height - 40, Home: MIN_HEIGHT, End: MAX_HEIGHT };
    const next = heights[event.key];
    if (next === undefined) return;
    event.preventDefault();
    changeHeight(next);
  }

  function finishResize(event: PointerEvent<HTMLButtonElement>) {
    if (resize.current?.pointerId !== event.pointerId) return;
    resize.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  const hasWork = Boolean(work.trim() || document.strokes.length);

  return (
    <section className={styles.pad} aria-label="Student work">
      <header className={styles.header}>
        <button type="button" className={styles.disclosure} aria-expanded={toolsOpen} aria-controls={toolsId} onClick={() => setToolsOpen(!toolsOpen)}>
          <SlidersHorizontal aria-hidden="true" /><span>Work tools</span><ChevronDown aria-hidden="true" data-open={toolsOpen} />
        </button>
        <button type="button" className={styles.review} disabled={!hasWork} onClick={onReview}><Check aria-hidden="true" />Review</button>
      </header>
      <div id={toolsId} className={styles.tools} hidden={!toolsOpen}>
        <div className={styles.toolGroup} role="group" aria-label="Handwriting tools">
          <button type="button" aria-label="Pen" title="Pen" aria-pressed={tool === "pen"} onClick={() => setTool("pen")}><PenLine aria-hidden="true" /></button>
          <button type="button" aria-label="Eraser" title="Erase handwriting" aria-pressed={tool === "eraser"} onClick={() => setTool("eraser")}><Eraser aria-hidden="true" /></button>
          <button type="button" aria-label="Undo handwriting" title="Undo handwriting" disabled={!history.undo.length} onClick={() => travelInk("undo")}><Undo2 aria-hidden="true" /></button>
          <button type="button" aria-label="Redo handwriting" title="Redo handwriting" disabled={!history.redo.length} onClick={() => travelInk("redo")}><Redo2 aria-hidden="true" /></button>
        </div>
        <div className={styles.toolGroup} role="group" aria-label="Work paper">
          {([{ value: "blank", label: "Blank", Icon: File }, { value: "lined", label: "Lined", Icon: Menu }, { value: "graph", label: "Graph", Icon: Grid2X2 }] as const).map(({ value, label, Icon }) => (
            <button type="button" key={value} aria-label={`${label} paper`} title={`${label} paper`} aria-pressed={paper === value} onClick={() => setPaper(value)}><Icon aria-hidden="true" /></button>
          ))}
        </div>
        <div className={styles.toolGroup} role="group" aria-label="Work actions">
          <button type="button" aria-label="Undo last edit" title="Undo last edit" disabled={!canUndoText} onClick={() => { setCleared(null); onUndoText(); setTool("pen"); editor.current?.focus(); }}><Undo2 aria-hidden="true" /></button>
          <button type="button" aria-label="Clear work" title="Clear work" disabled={!work && !document.strokes.length} onClick={clearWork}><Trash2 aria-hidden="true" /></button>
        </div>
      </div>
      {cleared && <div className={styles.recovery}><span role="status">Work cleared</span><button type="button" onClick={undoClear}><Undo2 aria-hidden="true" />Undo clear</button></div>}
      <div ref={workBox} className={styles.paper} data-paper={paper} data-typing={typing || undefined} data-tool={tool} style={{ height }}
        onPointerDownCapture={beginGesture} onPointerMoveCapture={moveGesture}
        onPointerUpCapture={finishGesture} onPointerCancelCapture={(event) => finishGesture(event, true)}
        onLostPointerCapture={(event) => finishGesture(event, true)}
        onPointerLeave={(event) => { if (gesture.current?.kind === "pending") finishGesture(event, true); }}>
        <textarea ref={editor} id="student-work" aria-label="Show your work" className={styles.editor}
          value={work} placeholder="Show your work" spellCheck={false}
          onChange={(event) => { expected.current.work = event.target.value; setCleared(null); onWorkChange(event.target.value); }}
          onFocus={() => setTyping(true)} onBlur={() => setTyping(false)} />
        <svg className={styles.ink} role="img" aria-label="Handwriting work pad" viewBox={`0 0 ${document.logicalWidth} ${document.logicalHeight}`} preserveAspectRatio="none">
          {document.strokes.map((stroke) => stroke.points.length === 1
            ? <circle key={stroke.id} cx={stroke.points[0].x} cy={stroke.points[0].y} r="1.5" />
            : <polyline key={stroke.id} points={stroke.points.map((point) => `${point.x},${point.y}`).join(" ")} />)}
        </svg>
      </div>
      <footer className={styles.footer}>
        <span className={styles.preview}>Preview only</span>
        <button type="button" role="slider" className={styles.resize} aria-label="Work area height" title="Resize work area"
          aria-controls="student-work" aria-orientation="vertical" aria-valuemin={MIN_HEIGHT} aria-valuemax={MAX_HEIGHT}
          aria-valuenow={height} aria-valuetext={`${height} pixels high`} onKeyDown={resizeWithKeyboard}
          onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); event.currentTarget.focus(); resized.current = false; resize.current = { pointerId: event.pointerId, startY: event.clientY, startHeight: height }; event.currentTarget.setPointerCapture?.(event.pointerId); }}
          onPointerMove={(event) => { const current = resize.current; if (!current || current.pointerId !== event.pointerId) return; event.preventDefault(); if (Math.abs(event.clientY - current.startY) > 3) resized.current = true; changeHeight(current.startHeight + event.clientY - current.startY); }}
          onPointerUp={finishResize} onPointerCancel={finishResize} onLostPointerCapture={finishResize}
          onClick={() => { if (!resized.current) changeHeight(height + 120); resized.current = false; }}><GripHorizontal aria-hidden="true" /></button>
      </footer>
    </section>
  );
}
