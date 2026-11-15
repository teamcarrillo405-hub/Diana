"use client";

import {
  Check,
  CheckCircle2,
  Eraser,
  GripHorizontal,
  MoreHorizontal,
  PenLine,
  Redo2,
  Undo2,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent,
} from "react";

import { saveAssignmentWorkspacePreference } from "@/app/(app)/assignments/[id]/workspace-state-actions";
import {
  parseAssignmentInkDocument,
  parseAssignmentInk,
  serializeAssignmentInk,
  type AssignmentInkDimensions,
  type AssignmentInkPoint,
  type AssignmentInkStroke,
} from "@/lib/assignment-ink";
import { assignmentDraftLabel } from "@/lib/assignment-draft-coordinator";
import type {
  AssignmentDraftState,
  AssignmentWorkspacePreference,
} from "@/lib/assignment-workspace-contracts";

type WorkPaper = "blank" | "lined" | "graph";
type InkTool = "pen" | "eraser";

type InkPoint = AssignmentInkPoint;
type InkStroke = AssignmentInkStroke;
type PendingMouseStroke = { pointerId: number; point: InkPoint };
type WorkResizeSession = { pointerId: number; startY: number; startHeight: number };

function cloneStrokes(strokes: InkStroke[]): InkStroke[] {
  return strokes.map((stroke) => ({ id: stroke.id, points: stroke.points.map((point) => ({ ...point })) }));
}

function distanceToSegment(point: InkPoint, start: InkPoint, end: InkPoint): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const ratio = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.x - (start.x + ratio * dx), point.y - (start.y + ratio * dy));
}

function strokeTouchesPoint(stroke: InkStroke, point: InkPoint, radius = 13): boolean {
  if (stroke.points.some((candidate) => Math.hypot(point.x - candidate.x, point.y - candidate.y) <= radius)) return true;
  return stroke.points.slice(1).some((candidate, index) => distanceToSegment(point, stroke.points[index], candidate) <= radius);
}

export type MathWorkSurfaceProps = {
  assignmentId: string;
  problemId: string;
  work: string;
  workInk: string;
  onWorkChange(value: string): void;
  onInkChange(value: string): void;
  onClear(): void;
  onUndoClear(): void;
  onReview(): void;
  reviewed: boolean;
  done: boolean;
  clearUndoAvailable: boolean;
  saveState: AssignmentDraftState;
  saveError: string;
  onRetrySave(): void;
  initialPreference?: AssignmentWorkspacePreference;
};

export function MathWorkSurface({ assignmentId, problemId, work, workInk, onWorkChange, onInkChange, onClear, onUndoClear, onReview, reviewed, done, clearUndoAvailable, saveState, saveError, onRetrySave, initialPreference }: MathWorkSurfaceProps) {
  const [paper, setPaper] = useState<WorkPaper>(initialPreference?.paperStyle ?? "lined");
  const [workHeight, setWorkHeight] = useState(initialPreference?.workHeight ?? 240);
  const workHeightRef = useRef(initialPreference?.workHeight ?? 240);
  const [inkTool, setInkTool] = useState<InkTool>("pen");
  const [typingActive, setTypingActive] = useState(false);
  const workTextarea = useRef<HTMLTextAreaElement>(null);
  const workBox = useRef<HTMLDivElement>(null);
  const workResizeSession = useRef<WorkResizeSession | null>(null);
  const [resizingWork, setResizingWork] = useState(false);
  const resizeMoved = useRef(false);
  const preferenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preferenceKey = `diana:assignment:${assignmentId}:problem:${problemId}:workspace-preference`;
  const [strokes, setStrokes] = useState<InkStroke[]>(() => parseAssignmentInk(workInk));
  const initialInkDocument = useMemo(() => parseAssignmentInkDocument(workInk), [workInk]);
  const strokesRef = useRef<InkStroke[]>(initialInkDocument.strokes);
  const [inkDimensions, setInkDimensions] = useState<AssignmentInkDimensions>({ logicalWidth: initialInkDocument.logicalWidth, logicalHeight: initialInkDocument.logicalHeight });
  const inkDimensionsRef = useRef<AssignmentInkDimensions>({ logicalWidth: initialInkDocument.logicalWidth, logicalHeight: initialInkDocument.logicalHeight });
  const undoStack = useRef<InkStroke[][]>([]);
  const redoStack = useRef<InkStroke[][]>([]);
  const strokeOrigin = useRef<InkStroke[] | null>(null);
  const activeStroke = useRef<InkStroke | null>(null);
  const pendingMouseStroke = useRef<PendingMouseStroke | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(preferenceKey);
    if (!stored) return;
    try {
      const value = JSON.parse(stored) as Record<string, unknown>;
      if (value.paperStyle === "blank" || value.paperStyle === "lined" || value.paperStyle === "graph") setPaper(value.paperStyle);
      if (typeof value.workHeight === "number") {
        const nextHeight = Math.max(220, Math.min(1_200, Math.round(value.workHeight)));
        workHeightRef.current = nextHeight;
        setWorkHeight(nextHeight);
      }
    } catch {
      window.localStorage.removeItem(preferenceKey);
    }
  }, [preferenceKey]);

  useEffect(() => () => {
    if (preferenceTimer.current) clearTimeout(preferenceTimer.current);
  }, []);

  function persistPreference(nextPaper: WorkPaper, nextHeight: number) {
    const normalizedHeight = Math.max(220, Math.min(1_200, Math.round(nextHeight)));
    window.localStorage.setItem(preferenceKey, JSON.stringify({ paperStyle: nextPaper, workHeight: normalizedHeight }));
    if (preferenceTimer.current) clearTimeout(preferenceTimer.current);
    preferenceTimer.current = setTimeout(() => {
      void saveAssignmentWorkspacePreference({ assignmentId, problemId, paperStyle: nextPaper, workHeight: normalizedHeight });
    }, 500);
  }

  function choosePaper(nextPaper: WorkPaper) {
    setPaper(nextPaper);
    persistPreference(nextPaper, workHeight);
  }

  function changeWorkHeight(nextHeight: number) {
    const normalizedHeight = Math.max(220, Math.min(1_200, Math.round(nextHeight)));
    workHeightRef.current = normalizedHeight;
    setWorkHeight(normalizedHeight);
    persistPreference(paper, normalizedHeight);
  }

  useEffect(() => {
    if (serializeAssignmentInk(strokesRef.current, inkDimensionsRef.current) === workInk) return;
    const next = parseAssignmentInkDocument(workInk);
    strokesRef.current = next.strokes;
    inkDimensionsRef.current = { logicalWidth: next.logicalWidth, logicalHeight: next.logicalHeight };
    setStrokes(next.strokes);
    setInkDimensions(inkDimensionsRef.current);
    undoStack.current = [];
    redoStack.current = [];
  }, [workInk]);

  useEffect(() => {
    const box = workBox.current;
    if (!box || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      const height = entry.contentRect.height;
      if (width <= 0 || height <= 0) return;
      const current = inkDimensionsRef.current;
      const logicalHeight = Math.max(1, Math.round((current.logicalWidth * height) / width));
      if (Math.abs(logicalHeight - current.logicalHeight) < 2) return;
      const next = { logicalWidth: current.logicalWidth, logicalHeight };
      inkDimensionsRef.current = next;
      setInkDimensions(next);
      if (strokesRef.current.length > 0) onInkChange(serializeAssignmentInk(strokesRef.current, next));
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [onInkChange]);

  function shouldDrawImmediately(event: PointerEvent<HTMLDivElement>) {
    return event.pointerType === "pen";
  }

  function pointFromEvent(event: PointerEvent<HTMLDivElement>): InkPoint {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = rect.width || inkDimensionsRef.current.logicalWidth;
    const height = rect.height || inkDimensionsRef.current.logicalHeight;
    const dimensions = inkDimensionsRef.current;
    return {
      x: Math.max(0, Math.min(dimensions.logicalWidth, ((event.clientX - rect.left) / width) * dimensions.logicalWidth)),
      y: Math.max(0, Math.min(dimensions.logicalHeight, ((event.clientY - rect.top) / height) * dimensions.logicalHeight)),
    };
  }

  function commit(next: InkStroke[]) {
    onInkChange(serializeAssignmentInk(next, inkDimensionsRef.current));
  }

  function startStroke(event: PointerEvent<HTMLDivElement>, points: InkPoint[]) {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    strokeOrigin.current = cloneStrokes(strokesRef.current);
    const stroke = { id: globalThis.crypto?.randomUUID?.() ?? `stroke-${Date.now()}`, points };
    activeStroke.current = stroke;
    const next = [...strokesRef.current, stroke];
    strokesRef.current = next;
    setStrokes(next);
  }

  function eraseAt(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    if (!strokeOrigin.current) strokeOrigin.current = cloneStrokes(strokesRef.current);
    const point = pointFromEvent(event);
    const next = strokesRef.current.filter((stroke) => !strokeTouchesPoint(stroke, point));
    if (next.length === strokesRef.current.length) return;
    strokesRef.current = next;
    setStrokes(next);
  }

  function beginStroke(event: PointerEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest(".sd-assignment-work-resize")) return;
    if (inkTool === "eraser") {
      eraseAt(event);
      return;
    }
    if (event.pointerType === "mouse" || event.pointerType === "touch") {
      if (event.pointerType === "touch" && document.activeElement === workTextarea.current) return;
      if (event.button === 0 || event.pointerType === "touch") {
        pendingMouseStroke.current = { pointerId: event.pointerId, point: pointFromEvent(event) };
      }
      return;
    }
    if (!shouldDrawImmediately(event)) return;
    startStroke(event, [pointFromEvent(event)]);
  }

  function moveStroke(event: PointerEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest(".sd-assignment-work-resize")) return;
    if (inkTool === "eraser" && (event.buttons & 1) === 1) {
      eraseAt(event);
      return;
    }
    const pending = pendingMouseStroke.current;
    if (pending && (event.pointerType === "mouse" || event.pointerType === "touch") && pending.pointerId === event.pointerId && ((event.buttons & 1) === 1 || event.pointerType === "touch")) {
      const point = pointFromEvent(event);
      const distance = Math.hypot(point.x - pending.point.x, point.y - pending.point.y);
      if (distance < 5) return;
      pendingMouseStroke.current = null;
      if (event.pointerType === "touch") workTextarea.current?.blur();
      else workTextarea.current?.setSelectionRange(work.length, work.length);
      startStroke(event, [pending.point, point]);
      return;
    }

    const stroke = activeStroke.current;
    if (!stroke) return;
    event.preventDefault();
    stroke.points.push(pointFromEvent(event));
    const next = [...strokesRef.current.slice(0, -1), { ...stroke, points: [...stroke.points] }];
    strokesRef.current = next;
    setStrokes(next);
  }

  function endStroke(event?: PointerEvent<HTMLDivElement>) {
    if (event?.target instanceof Element && event.target.closest(".sd-assignment-work-resize")) return;
    if (event && pendingMouseStroke.current?.pointerId === event.pointerId) {
      pendingMouseStroke.current = null;
    }
    const changed = Boolean(activeStroke.current || strokeOrigin.current);
    if (!changed) return;
    event?.preventDefault();
    event?.currentTarget.releasePointerCapture?.(event.pointerId);
    activeStroke.current = null;
    if (strokeOrigin.current) undoStack.current.push(strokeOrigin.current);
    strokeOrigin.current = null;
    redoStack.current = [];
    commit(strokesRef.current);
  }

  function beginWorkResize(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    const box = workBox.current;
    if (!box) return;
    event.preventDefault();
    event.stopPropagation();
    workResizeSession.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight: box.getBoundingClientRect().height,
    };
    resizeMoved.current = false;
    setResizingWork(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function resizeWorkArea(event: PointerEvent<HTMLButtonElement>) {
    const session = workResizeSession.current;
    const box = workBox.current;
    if (!session || !box || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const nextHeight = Math.max(220, Math.min(1_200, session.startHeight + event.clientY - session.startY));
    if (Math.abs(event.clientY - session.startY) > 3) resizeMoved.current = true;
    workHeightRef.current = nextHeight;
    setWorkHeight(nextHeight);
  }

  function finishWorkResize(event: PointerEvent<HTMLButtonElement>) {
    const session = workResizeSession.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    workResizeSession.current = null;
    setResizingWork(false);
    persistPreference(paper, workHeightRef.current);
  }

  function expandWorkArea() {
    if (resizeMoved.current) {
      resizeMoved.current = false;
      return;
    }
    changeWorkHeight(workHeight >= 720 ? 240 : workHeight + 160);
  }

  function resizeWithKeyboard(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      changeWorkHeight(workHeight + 40);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      changeWorkHeight(workHeight - 40);
    } else if (event.key === "Home") {
      event.preventDefault();
      changeWorkHeight(240);
    } else if (event.key === "End") {
      event.preventDefault();
      changeWorkHeight(720);
    }
  }

  function undoInk() {
    const previous = undoStack.current.pop();
    if (!previous) return;
    redoStack.current.push(cloneStrokes(strokesRef.current));
    strokesRef.current = cloneStrokes(previous);
    setStrokes(strokesRef.current);
    commit(strokesRef.current);
  }

  function redoInk() {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(cloneStrokes(strokesRef.current));
    strokesRef.current = cloneStrokes(next);
    setStrokes(strokesRef.current);
    commit(strokesRef.current);
  }

  const saveLabel = assignmentDraftLabel(saveState);

  return (
    <section id="assignment-work" className="sd-assignment-work-surface" aria-label="Student work" tabIndex={-1}>
      <header className="sd-assignment-work-surface-header">
        <details className="sd-assignment-work-tools">
          <summary>Work tools</summary>
          <div className="sd-assignment-work-tools-panel">
            <div className="sd-assignment-paper-control" role="group" aria-label="Work paper">
              <button type="button" aria-pressed={paper === "blank"} onClick={() => choosePaper("blank")}>Blank</button>
              <button type="button" aria-pressed={paper === "lined"} onClick={() => choosePaper("lined")}>Lined</button>
              <button type="button" aria-pressed={paper === "graph"} onClick={() => choosePaper("graph")}>Graph</button>
            </div>
            <div className="sd-assignment-ink-tools" role="group" aria-label="Handwriting tools">
              <button type="button" aria-pressed={inkTool === "pen"} onClick={() => setInkTool("pen")} title="Pen"><PenLine size={18} aria-hidden="true" /><span>Pen</span></button>
              <button type="button" aria-pressed={inkTool === "eraser"} onClick={() => setInkTool("eraser")} title="Erase handwriting"><Eraser size={18} aria-hidden="true" /><span>Eraser</span></button>
              <button type="button" disabled={undoStack.current.length === 0} onClick={undoInk} aria-label="Undo handwriting" title="Undo handwriting"><Undo2 size={18} aria-hidden="true" /><span>Undo</span></button>
              <button type="button" disabled={redoStack.current.length === 0} onClick={redoInk} aria-label="Redo handwriting" title="Redo handwriting"><Redo2 size={18} aria-hidden="true" /><span>Redo</span></button>
            </div>
          </div>
        </details>
        <div className="sd-assignment-work-actions">
          {saveLabel ? <span className="sd-assignment-inline-save" data-state={saveState} role="status" title={saveError || saveLabel}>{saveState === "synced" ? <CheckCircle2 size={15} aria-hidden="true" /> : null}{saveLabel}</span> : null}
          <button type="button" className="sd-assignment-review-action" data-primary={!reviewed && !done || undefined} onClick={onReview} disabled={!work.trim() && !workInk} aria-describedby={!work.trim() && !workInk ? "assignment-review-help" : undefined}>Review</button>
          {done ? (
            <span className="sd-assignment-done-state"><Check size={16} aria-hidden="true" /> Done</span>
          ) : null}
          <details className="sd-assignment-work-more">
            <summary aria-label="More work options" title="More work options"><MoreHorizontal size={19} aria-hidden="true" /></summary>
            <div>
              <button type="button" onClick={onClear} disabled={!work && !workInk}>Clear work</button>
            </div>
          </details>
        </div>
      </header>
      {!work.trim() && !workInk ? <p id="assignment-review-help" className="sd-assignment-review-help">Add one step in your work to enable Review.</p> : null}
      {saveState === "retryable_error" ? (
        <div className="sd-assignment-workspace-feedback" data-target="save" role="alert">
          <span>{saveError || "This work is still on this device and needs another sync attempt."}</span>
          <button type="button" onClick={onRetrySave}>Retry save</button>
        </div>
      ) : null}
      {clearUndoAvailable ? <div className="sd-assignment-clear-recovery" role="status"><span>Work cleared</span><button type="button" onClick={onUndoClear}>Undo clear</button></div> : null}
      <div
        ref={workBox}
        className="sd-assignment-work-box"
        data-paper={paper}
        data-resizing={resizingWork || undefined}
        data-typing={typingActive || undefined}
        style={{ "--assignment-work-height": `${workHeight}px` } as CSSProperties}
        onPointerDownCapture={beginStroke}
        onPointerMoveCapture={moveStroke}
        onPointerUpCapture={endStroke}
        onPointerCancelCapture={endStroke}
      >
        <textarea
          ref={workTextarea}
          id="assignment-work-entry"
          aria-label="Show your work"
          value={work}
          onChange={(event) => onWorkChange(event.target.value)}
          onFocus={() => setTypingActive(true)}
          onBlur={() => setTypingActive(false)}
          aria-describedby="assignment-work-input-help"
          placeholder="Show your work. Tap to type or drag to write."
          rows={10}
          className="sd-assignment-work-textarea"
        />
        <span id="assignment-work-input-help" className="sr-only">
          Tap to type. Drag with a pen, finger, or mouse to write. While the typing cursor is active, touch gestures scroll normally.
        </span>
        <svg aria-label="Handwriting work pad" role="img" viewBox={`0 0 ${inkDimensions.logicalWidth} ${inkDimensions.logicalHeight}`} preserveAspectRatio="none" className="sd-assignment-ink-layer">
          <rect x="0" y="0" width={inkDimensions.logicalWidth} height={inkDimensions.logicalHeight} rx="10" />
          {strokes.map((stroke) => (
            <polyline key={stroke.id} points={stroke.points.map((point) => `${point.x},${point.y}`).join(" ")} />
          ))}
        </svg>
        <button
          type="button"
          role="slider"
          className="sd-assignment-work-resize"
          aria-label="Make the work area larger"
          title="Drag or click to make the work area larger"
          aria-orientation="vertical"
          aria-valuemin={220}
          aria-valuemax={1200}
          aria-valuenow={Math.round(workHeight)}
          aria-valuetext={`${Math.round(workHeight)} pixels high`}
          onPointerDown={beginWorkResize}
          onPointerMove={resizeWorkArea}
          onPointerUp={finishWorkResize}
          onPointerCancel={finishWorkResize}
          onClick={expandWorkArea}
          onKeyDown={resizeWithKeyboard}
        >
          <GripHorizontal size={19} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
