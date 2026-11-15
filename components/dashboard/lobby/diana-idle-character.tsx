"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./diana-idle-character.module.css";
import { DIANA_FLOOR, paintDianaFloor, type DianaFloorMaterial, type DianaPose } from "./diana-ground-plane";

export type DianaMotionStatus = "loading" | "playing" | "paused" | "still" | "performance-still" | "reduced-motion" | "unavailable";
export type DianaCharacterAssets = { poster: string; motion: string; posterPose: DianaPose; motionPose?: DianaPose; pixelWidth?: number; pixelHeight?: number };

const SLOW_FRAME_MS = 12;
const SLOW_FRAME_WINDOW = 10;
const SLOW_FRAME_LIMIT = 4;

export function DianaIdleCharacter({ mobile = false, paused, enabled = true, diagnostics = false, onStatusChange, assets, displayGrade, floorMaterial = "atrium" }: { mobile?: boolean; paused: boolean; enabled?: boolean; diagnostics?: boolean; onStatusChange?: (status: DianaMotionStatus) => void; assets?: DianaCharacterAssets; displayGrade?: CSSProperties["filter"]; floorMaterial?: DianaFloorMaterial }) {
  const holder = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const surface = useRef<HTMLCanvasElement>(null);
  const floor = useRef<HTMLCanvasElement>(null);
  const reflection = useRef<HTMLCanvasElement>(null);
  const floorSource = useRef<{ source: CanvasImageSource; pose: DianaPose } | null>(null);
  const poster = useRef<HTMLImageElement>(null);
  const [paintedFloor, setPaintedFloor] = useState<{ source: CanvasImageSource; pose: DianaPose } | null>(null);
  const floorPainted = useRef(false);
  const painted = useRef(false);
  const frameCount = useRef(0);
  const [activeSize, setActiveSize] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [usable, setUsable] = useState(true);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [staticFloor, setStaticFloor] = useState(false);
  const [adaptiveStill, setAdaptiveStill] = useState(false);
  const previousTime = useRef(0);
  const loops = useRef(0);
  const slowFrames = useRef({ samples: 0, slow: 0 });

  const paintFloor = useCallback((source: CanvasImageSource, pose: DianaPose) => {
    if (!floor.current || staticFloor) return;
    const previous = floorSource.current;
    floorSource.current = { source, pose };
    try {
      const context = floor.current.getContext("2d");
      const reflected = reflection.current?.getContext("2d");
      if (!context || !reflected) return;
      if (context.isContextLost?.() || reflected.isContextLost?.()) throw new Error("Floor context unavailable");
      paintDianaFloor(context, reflected, source, pose, floorMaterial, "separate");
      if (!floorPainted.current || previous?.source !== source || previous.pose !== pose) {
        floorPainted.current = true;
        setPaintedFloor(floorSource.current);
      }
    } catch {
      if (floorPainted.current) { floorPainted.current = false; setPaintedFloor(null); }
    }
  }, [floorMaterial, staticFloor]);

  useEffect(() => {
    if (staticFloor) {
      // Do not retain a pose-dependent floor that can reappear after a pause or restore.
      floorSource.current = null;
      floorPainted.current = false;
      setPaintedFloor(null);
      return;
    }
    if (floorSource.current) paintFloor(floorSource.current.source, floorSource.current.pose);
  }, [paintFloor, staticFloor]);

  useEffect(() => {
    const targets = [floor.current, reflection.current].filter((element): element is HTMLCanvasElement => !!element);
    const lost = () => { floorPainted.current = false; setPaintedFloor(null); };
    const restored = () => { if (floorSource.current) paintFloor(floorSource.current.source, floorSource.current.pose); };
    targets.forEach(element => { element.addEventListener("contextlost", lost); element.addEventListener("contextrestored", restored); });
    return () => targets.forEach(element => { element.removeEventListener("contextlost", lost); element.removeEventListener("contextrestored", restored); });
  }, [assets, mobile, paintFloor]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function" || typeof IntersectionObserver !== "function") return;
    const size = window.matchMedia(mobile ? "(max-width: 760px)" : "(min-width: 761px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { setActiveSize(size.matches); setReducedMotion(reduced.matches); };
    const visibility = () => setPageVisible(document.visibilityState === "visible");
    sync();
    visibility();
    size.addEventListener("change", sync);
    reduced.addEventListener("change", sync);
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    if (holder.current) observer.observe(holder.current);
    return () => {
      size.removeEventListener("change", sync);
      reduced.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", visibility);
      observer.disconnect();
    };
  }, [mobile]);

  const showVideo = activeSize && !reducedMotion && usable && enabled && !adaptiveStill;
  const shouldPlay = showVideo && inView && pageVisible && !paused;
  const motionPose = assets?.motionPose ?? "motion";
  const displayedPose = showVideo && ready ? motionPose : assets?.posterPose ?? "original";
  const floorShift = (DIANA_FLOOR[displayedPose].ground - DIANA_FLOOR.sourceHeight + DIANA_FLOOR.height - DIANA_FLOOR.baseline) / DIANA_FLOOR.height * 100;
  const floorReady = !!paintedFloor && paintedFloor.pose === displayedPose && paintedFloor.source === (showVideo && ready ? surface.current : poster.current);
  const grade = displayGrade ?? (assets ? "var(--diana-display-grade, none)" : undefined);
  const gradeStyle = grade ? { filter: grade } : undefined;
  useEffect(() => {
    if ((!showVideo || !ready) && poster.current?.complete && poster.current.naturalWidth && assets && !mobile) {
      paintFloor(poster.current, assets.posterPose);
    }
  }, [showVideo, ready, assets, mobile, paintFloor]);
  useEffect(() => {
    if (!showVideo) {
      painted.current = false;
      frameCount.current = 0;
      setReady(false);
      setPlaying(false);
      previousTime.current = 0;
      loops.current = 0;
      slowFrames.current = { samples: 0, slow: 0 };
      if (holder.current) {
        holder.current.dataset.loopCount = "0";
        holder.current.dataset.frameCount = "0";
      }
    }
  }, [showVideo]);
  useEffect(() => {
    if (!enabled) {
      setStaticFloor(false);
      setAdaptiveStill(false);
      slowFrames.current = { samples: 0, slow: 0 };
    }
  }, [enabled]);
  const status: DianaMotionStatus = reducedMotion ? "reduced-motion" : !usable ? "unavailable" : adaptiveStill ? "performance-still" : !showVideo ? "still" : !ready ? "loading" : playing && shouldPlay ? "playing" : "paused";
  useEffect(() => {
    if (activeSize) onStatusChange?.(status);
  }, [activeSize, status, onStatusChange]);
  useEffect(() => {
    const canvas = surface.current;
    if (!canvas) return;
    const fallback = () => setUsable(false);
    canvas.addEventListener("contextlost", fallback);
    return () => canvas.removeEventListener("contextlost", fallback);
  }, [showVideo]);
  useEffect(() => {
    const player = video.current;
    const canvas = surface.current;
    if (!player || !canvas) return;
    if (!shouldPlay) { player.pause(); return; }
    if (typeof player.requestVideoFrameCallback !== "function" || typeof player.cancelVideoFrameCallback !== "function") {
      setUsable(false);
      return;
    }
    let cancelled = false;
    let callback: number | undefined;
    let nextAlphaCheck = 0;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) { setUsable(false); return; }
    let frameTimer = setTimeout(fallback, painted.current ? 3000 : 8000);
    function stop() {
      cancelled = true;
      if (callback !== undefined) player!.cancelVideoFrameCallback(callback);
      clearTimeout(frameTimer);
      player!.pause();
    }
    function fallback() {
      if (cancelled) return;
      stop();
      setUsable(false);
    }
    function assessFrameCost(elapsed: number) {
      if (elapsed > SLOW_FRAME_MS) slowFrames.current.slow += 1;
      slowFrames.current.samples += 1;
      if (slowFrames.current.samples < SLOW_FRAME_WINDOW) return false;
      const tooSlow = slowFrames.current.slow >= SLOW_FRAME_LIMIT;
      slowFrames.current = { samples: 0, slow: 0 };
      if (!tooSlow) return false;
      if (assets && !mobile && !staticFloor) {
        setStaticFloor(true);
      } else {
        setAdaptiveStill(true);
      }
      return true;
    }
    function drawFrame(now: DOMHighResTimeStamp) {
      if (cancelled) return;
      const start = performance.now();
      try {
        // Replace transparent pixels too, so movement cannot leave silhouette trails.
        context!.clearRect(0, 0, canvas!.width, canvas!.height);
        context!.drawImage(player!, 0, 0, canvas!.width, canvas!.height);
        if (assets && !mobile && !staticFloor) paintFloor(canvas!, motionPose);
        if (!painted.current) {
          if (context!.getImageData(0, 0, 1, 1).data[3] > 8) throw new Error("Alpha unavailable");
          if (context!.getImageData(Math.round(canvas!.width * 210 / DIANA_FLOOR.sourceWidth), Math.round(canvas!.height * 380 / DIANA_FLOOR.sourceHeight), 1, 1).data[3] < 240) throw new Error("Character unavailable");
          painted.current = true;
          setReady(true);
          nextAlphaCheck = now + 1000;
        } else if (now >= nextAlphaCheck) {
          // Sample the opaque torso, not moving edges, at most once per second.
          const pixels = context!.getImageData(
            Math.round(canvas!.width * 240 / DIANA_FLOOR.sourceWidth),
            Math.round(canvas!.height * 640 / DIANA_FLOOR.sourceHeight),
            Math.max(1, Math.round(canvas!.width * 8 / DIANA_FLOOR.sourceWidth)),
            Math.max(1, Math.round(canvas!.height * 8 / DIANA_FLOOR.sourceHeight)),
          ).data;
          if (!pixels.some((value, index) => index % 4 === 3 && value > 8)) throw new Error("Character unavailable");
          nextAlphaCheck = now + 1000;
        }
        clearTimeout(frameTimer);
        frameTimer = setTimeout(fallback, 3000);
        frameCount.current += 1;
        if (holder.current) holder.current.dataset.frameCount = String(frameCount.current);
        if (painted.current && assessFrameCost(performance.now() - start)) return;
        callback = player!.requestVideoFrameCallback(paintCallback);
      } catch { fallback(); }
    }
    const paintCallback = diagnostics ? (now: DOMHighResTimeStamp) => {
      if (cancelled) return;
      const start = performance.now();
      try { drawFrame(now); } finally {
        try {
          try { performance.measure("diana-frame", { start, end: performance.now() }); }
          finally { performance.clearMeasures("diana-frame"); }
        } catch { /* Optional diagnostics cannot interrupt playback. */ }
      }
    } : drawFrame;
    callback = player.requestVideoFrameCallback(paintCallback);
    void player.play().catch(error => {
      if (!cancelled && error?.name !== "AbortError") fallback();
    });
    return () => {
      stop();
    };
  }, [shouldPlay, showVideo, assets, mobile, paintFloor, diagnostics, staticFloor, motionPose]);

  return <div ref={holder} className={styles.character} style={{ "--diana-floor-shift": `${floorShift}%` } as CSSProperties} data-diana-motion={status} data-motion-floor={staticFloor ? "static" : "live"} data-poster-visible={!showVideo || !ready} data-loop-count="0" data-frame-count="0" data-scene-assets={!!assets} data-floor-ready={floorReady} data-floor-pose={displayedPose} data-floor-material={floorMaterial}>
    <span className={styles.contactPlane} hidden={floorReady && !staticFloor} aria-hidden="true">{DIANA_FLOOR[displayedPose].shoes.map(([x, y, radius], index) => <span key={index} className={styles.contact} data-diana-contact style={{
      left: `${(x - radius) / DIANA_FLOOR.sourceWidth * 100}%`,
      top: `${(y - DIANA_FLOOR.contactRadiusY) / DIANA_FLOOR.sourceHeight * 100}%`,
      width: `${radius * 2 / DIANA_FLOOR.sourceWidth * 100}%`,
      height: `${DIANA_FLOOR.contactRadiusY * 2 / DIANA_FLOOR.sourceHeight * 100}%`,
    }} />)}</span>
    {assets && !mobile && <div className={styles.floor} hidden={staticFloor || !floorReady} aria-hidden="true">
      <canvas ref={reflection} width={DIANA_FLOOR.width} height={DIANA_FLOOR.height} style={gradeStyle} data-diana-reflection-buffer />
      <canvas ref={floor} width={DIANA_FLOOR.width} height={DIANA_FLOOR.height} data-diana-ground />
    </div>}
    <Image ref={poster} src={assets?.poster ?? "/images/today-diana-cutout.png"} alt="" fill sizes={mobile ? "160px" : "340px"} quality={90} unoptimized={!!assets} priority={!mobile} style={gradeStyle} data-motion-poster data-hidden={showVideo && ready} onLoad={event => { if (assets && !mobile && (!showVideo || !ready)) paintFloor(event.currentTarget, assets.posterPose); }} />
    {showVideo && <><canvas ref={surface} className={styles.surface} style={gradeStyle} width={assets?.pixelWidth ?? DIANA_FLOOR.sourceWidth} height={assets?.pixelHeight ?? DIANA_FLOOR.sourceHeight} data-motion-surface data-ready={ready} aria-hidden="true" />
    <video
      ref={video}
      className={styles.decoder}
      src={assets?.motion ?? "/landing-3d/today-motion-review/clip"}
      loop muted playsInline preload="auto" disablePictureInPicture tabIndex={-1} aria-hidden="true"
      onPlaying={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      onWaiting={() => setPlaying(false)}
      onError={() => setUsable(false)}
      onTimeUpdate={event => {
        const time = event.currentTarget.currentTime;
        if (previousTime.current > 6 && time < 2) loops.current += 1;
        previousTime.current = time;
        if (holder.current) holder.current.dataset.loopCount = String(loops.current);
      }}
    /></>}
  </div>;
}
