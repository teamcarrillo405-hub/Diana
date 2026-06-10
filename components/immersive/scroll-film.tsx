"use client";

// The scroll film engine — Apple-technique frame scrubbing, dependency-free.
// A tall scroll container pins a full-viewport canvas; scroll progress picks
// the frame. Overlays declare their scroll range and fade/settle in. The
// whole engine respects prefers-reduced-motion by simply not being rendered
// (the page falls back to the standard landing sections).

import { useEffect, useMemo, useRef, useState } from "react";

const FRAME_COUNT = 160;
const EAGER_FRAMES = 24;

function frameSrc(index: number): string {
  return `/landing-3d/frame_${String(index + 1).padStart(4, "0")}.webp`;
}

export type Chapter = {
  /** scroll progress range 0..1 */
  from: number;
  to: number;
  eyebrow: string;
  title: string;
  body: string;
  /** horizontal anchor for the text card */
  side: "left" | "right" | "center";
};

export function ScrollFilm({
  chapters,
  heightVh = 700,
  children,
}: {
  chapters: Chapter[];
  /** total scroll length of the film in viewport-heights */
  heightVh?: number;
  /** end-cap content revealed after the film completes */
  children?: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<(HTMLImageElement | null)[]>(Array(FRAME_COUNT).fill(null));
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  // progressive frame loading: first chunk eagerly, the rest in idle order
  useEffect(() => {
    let alive = true;
    let loadedEager = 0;
    const load = (i: number, onload?: () => void) => {
      const img = new Image();
      img.src = frameSrc(i);
      img.onload = () => {
        if (!alive) return;
        framesRef.current[i] = img;
        onload?.();
      };
    };
    for (let i = 0; i < EAGER_FRAMES; i += 1) {
      load(i, () => {
        loadedEager += 1;
        if (loadedEager >= Math.min(8, EAGER_FRAMES)) setReady(true);
      });
    }
    let next = EAGER_FRAMES;
    const idle = () => {
      if (!alive || next >= FRAME_COUNT) return;
      for (let n = 0; n < 6 && next < FRAME_COUNT; n += 1, next += 1) load(next);
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(idle);
      } else {
        window.setTimeout(idle, 60);
      }
    };
    idle();
    return () => {
      alive = false;
    };
  }, []);

  // scroll → progress (rAF-throttled)
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
        setProgress(p);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // progress → draw nearest loaded frame
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const want = Math.min(FRAME_COUNT - 1, Math.round(progress * (FRAME_COUNT - 1)));
    let img = framesRef.current[want];
    if (!img) {
      for (let d = 1; d < FRAME_COUNT && !img; d += 1) {
        img = framesRef.current[want - d] ?? framesRef.current[want + d] ?? null;
      }
    }
    if (!img) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth * dpr;
    const h = canvas.clientHeight * dpr;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    // cover-fit
    const scale = Math.max(w / img.width, h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.fillStyle = "#030712";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }, [progress, ready]);

  const activeChapterIndex = useMemo(
    () => chapters.findIndex((c) => progress >= c.from && progress < c.to),
    [chapters, progress],
  );

  return (
    <div ref={containerRef} style={{ height: `${heightVh}vh` }} className="relative bg-[#030712]">
      <div className="sticky top-0 h-dvh w-full overflow-hidden">
        <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />

        {/* chapter overlays */}
        {chapters.map((chapter, i) => {
          const active = i === activeChapterIndex;
          const anchor =
            chapter.side === "left"
              ? "left-6 sm:left-16 items-start text-left"
              : chapter.side === "right"
                ? "right-6 sm:right-16 items-end text-right"
                : "left-1/2 -translate-x-1/2 items-center text-center";
          return (
            <div
              key={chapter.title}
              className={`absolute top-1/2 flex max-w-md -translate-y-1/2 flex-col gap-3 px-2 transition-all duration-500 ${anchor} ${
                active ? "translate-y-[-50%] opacity-100" : "pointer-events-none translate-y-[-46%] opacity-0"
              }`}
            >
              <p className="text-sm font-semibold uppercase tracking-widest text-teal-300">{chapter.eyebrow}</p>
              <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {chapter.title}
              </h2>
              <p className="text-base leading-7 text-slate-300">{chapter.body}</p>
            </div>
          );
        })}

        {/* chapter spine */}
        <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 flex-col gap-2 sm:flex" aria-hidden="true">
          {chapters.map((c, i) => (
            <span
              key={c.title}
              className={`h-6 w-0.5 rounded-full transition-colors ${
                i === activeChapterIndex ? "bg-violet-400" : "bg-white/15"
              }`}
            />
          ))}
        </div>

        {/* scroll hint */}
        <div
          className={`absolute bottom-6 left-1/2 -translate-x-1/2 text-xs uppercase tracking-widest text-slate-400 transition-opacity ${
            progress > 0.02 ? "opacity-0" : "opacity-100"
          }`}
        >
          Scroll
        </div>

        {/* end-cap reveal */}
        {children && (
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${
              progress > 0.96 ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
