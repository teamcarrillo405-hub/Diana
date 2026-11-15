"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import {
  DIANA_VECTOR_PATHS,
  DIANA_VECTOR_VIEW_BOX,
} from "@/app/landing-3d/logo-mask/diana-vector-paths";
import styles from "@/app/landing-3d/logo-mask/logo-mask-hero.module.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type CinematicLogoMaskHeroProps = {
  ctaHref: string;
  ctaLabel: string;
  headline: string;
  id?: string;
  navigation?: ReactNode;
  onCtaClick?: () => void;
  paused?: boolean;
  reducedMotion?: boolean;
  subhead: string;
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function smooth(start: number, end: number, value: number) {
  const amount = clamp((value - start) / Math.max(end - start, 0.001));
  return amount * amount * amount * (amount * (amount * 6 - 15) + 10);
}

export function CinematicLogoMaskHero({
  ctaHref,
  ctaLabel,
  headline,
  id = "top",
  navigation,
  onCtaClick,
  paused = false,
  reducedMotion = false,
  subhead,
}: CinematicLogoMaskHeroProps) {
  const stageRef = useRef<HTMLElement>(null);
  const openingRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  const currentProgressRef = useRef(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const shouldReduce = reducedMotion || prefersReducedMotion;

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReducedMotion(preference.matches);
    sync();
    preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, []);

  const applyProgress = (progress: number) => {
    const stage = stageRef.current;
    if (!stage || pausedRef.current) return;

    const value = shouldReduce ? 0 : clamp(progress);
    currentProgressRef.current = value;
    const opening = shouldReduce ? 1 : 1 - smooth(0.31, 0.43, value);
    const buildingRise = shouldReduce ? 0 : smooth(0.18, 0.5, value);
    const logoMix = shouldReduce ? 0 : smooth(0.4, 0.5, value);
    const taglineMix = shouldReduce ? 0 : smooth(0.45, 0.55, value);
    const traceOpacity = shouldReduce
      ? 0
      : smooth(0.37, 0.385, value) * (1 - smooth(0.48, 0.53, value));
    const taglineTraceProgress = shouldReduce ? 0 : smooth(0.42, 0.55, value);
    const taglineTraceOpacity = shouldReduce
      ? 0
      : smooth(0.42, 0.435, value) * (1 - smooth(0.53, 0.58, value));
    const logoDrop = shouldReduce ? 0 : smooth(0.69, 1, value);
    const cloudLift = shouldReduce ? 0 : smooth(0.74, 0.97, value);
    const whiteOut = shouldReduce ? 0 : smooth(0.42, 0.55, value);

    stage.style.setProperty("--p", value.toFixed(4));
    stage.style.setProperty("--opening", opening.toFixed(4));
    stage.style.setProperty("--building-rise", buildingRise.toFixed(4));
    stage.style.setProperty("--building-opacity", "1");
    stage.style.setProperty("--logo-opacity", logoMix.toFixed(4));
    stage.style.setProperty("--tagline-opacity", taglineMix.toFixed(4));
    stage.style.setProperty("--white-out", whiteOut.toFixed(4));
    stage.style.setProperty("--logo-drop", logoDrop.toFixed(4));
    stage.style.setProperty("--cloud-lift", cloudLift.toFixed(4));
    stage.style.setProperty("--sky-focus", whiteOut.toFixed(4));
    stage.style.setProperty("--trace-opacity", traceOpacity.toFixed(4));
    stage.style.setProperty(
      "--tagline-trace-opacity",
      taglineTraceOpacity.toFixed(4),
    );
    stage.style.setProperty(
      "--tagline-reveal-width",
      `${(taglineTraceProgress * 640).toFixed(2)}px`,
    );
    stage.style.setProperty(
      "--tagline-spark-x",
      `${(taglineTraceProgress * 640).toFixed(2)}px`,
    );
    stage.style.setProperty(
      "--tagline-spark-opacity",
      (1 - smooth(0.59, 0.61, value)).toFixed(4),
    );

    DIANA_VECTOR_PATHS.forEach((_, index) => {
      const pathProgress = shouldReduce
        ? 0
        : smooth(0.37 + index * 0.004, 0.5 + index * 0.004, value);
      stage.style.setProperty(`--trace-${index}`, pathProgress.toFixed(4));
    });

    stage.dataset.progress = value.toFixed(3);
    stage.dataset.reducedMotion = shouldReduce ? "true" : "false";
    const openingElement = openingRef.current;
    if (openingElement) {
      const interactive = shouldReduce || value < 0.43;
      openingElement.inert = !interactive;
      openingElement.setAttribute("aria-hidden", interactive ? "false" : "true");
      openingElement.style.pointerEvents = interactive ? "auto" : "none";
    }
  };

  useGSAP(
    () => {
      const stage = stageRef.current;
      if (!stage) return undefined;

      if (shouldReduce) {
        applyProgress(0);
        return undefined;
      }

      const proxy = { progress: currentProgressRef.current };
      const scrub = gsap.to(proxy, {
        ease: "none",
        paused: true,
        progress: 1,
        onUpdate: () => applyProgress(proxy.progress),
      });
      const trigger = ScrollTrigger.create({
        end: () => `+=${Math.max(stage.offsetHeight - window.innerHeight, 1)}`,
        invalidateOnRefresh: true,
        onRefresh: (self) => applyProgress(self.progress),
        onUpdate: (self) => {
          proxy.progress = self.progress;
          applyProgress(proxy.progress);
        },
        start: "top top",
        trigger: stage,
      });

      applyProgress(trigger.progress);
      return () => {
        trigger.kill();
        scrub.kill();
      };
    },
    { dependencies: [shouldReduce], scope: stageRef },
  );

  const layeredScene = (
    <>
      <img
        alt=""
        aria-hidden="true"
        className={styles.logoSkyMedia}
        src="/landing-3d/logo-mask/layered/sky-v1.webp"
      />
      <img
        alt=""
        aria-hidden="true"
        className={styles.buildingMedia}
        src="/landing-3d/logo-mask/layered/building-v3.webp"
      />
    </>
  );

  return (
    <section
      aria-labelledby={`${id}-cinematic-title`}
      className={styles.stage}
      data-analytics-section="hero"
      data-header-tone="light"
      data-media-source="layered"
      data-motion-paused={paused ? "true" : "false"}
      data-reduced-motion={shouldReduce ? "true" : "false"}
      id={id}
      ref={stageRef}
    >
      <div className={styles.sticky}>
        <img
          alt=""
          aria-hidden="true"
          className={styles.skyLayer}
          src="/landing-3d/logo-mask/layered/sky-v1.webp"
        />
        <div aria-hidden="true" className={styles.buildingLayer}>
          <img
            alt=""
            className={styles.buildingMedia}
            src="/landing-3d/logo-mask/layered/building-v3.webp"
          />
        </div>

        <div aria-hidden="true" className={styles.skyWash} />
        <div aria-hidden="true" className={styles.whiteOut} />

        <div aria-hidden="true" className={styles.logoWindow}>
          {layeredScene}
          <div className={styles.logoTint} />
        </div>

        <div aria-hidden="true" className={styles.taglineWindow}>
          {layeredScene}
          <div className={styles.logoTint} />
        </div>

        <div aria-hidden="true" className={styles.logoTrace}>
          <svg preserveAspectRatio="none" viewBox={DIANA_VECTOR_VIEW_BOX}>
            <defs>
              <linearGradient id="diana-trace-gradient" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="42%" stopColor="#efc8ff" />
                <stop offset="72%" stopColor="#bdeaff" />
                <stop offset="100%" stopColor="#ffffff" />
              </linearGradient>
              <filter id="diana-spark-glow" height="260%" width="260%" x="-80%" y="-80%">
                <feGaussianBlur result="blur" stdDeviation="2.4" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {DIANA_VECTOR_PATHS.map((path, index) => (
              <g key={path} style={{ "--path-progress": `var(--trace-${index})` } as CSSProperties}>
                <path className={styles.tracePath} d={path} pathLength="1" />
                <path className={styles.sparkPath} d={path} pathLength="1" />
              </g>
            ))}
          </svg>
        </div>

        <div aria-hidden="true" className={styles.taglineTrace}>
          <svg preserveAspectRatio="none" viewBox="0 0 640 100">
            <defs>
              <linearGradient id="tagline-trace-gradient" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="42%" stopColor="#efc8ff" />
                <stop offset="72%" stopColor="#bdeaff" />
                <stop offset="100%" stopColor="#ffffff" />
              </linearGradient>
              <filter id="tagline-spark-glow" height="340%" width="340%" x="-120%" y="-120%">
                <feGaussianBlur result="blur" stdDeviation="3" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <clipPath id="tagline-trace-reveal">
                <rect className={styles.taglineReveal} height="100" width="640" x="0" y="0" />
              </clipPath>
            </defs>
            <g clipPath="url(#tagline-trace-reveal)">
              <text
                className={styles.taglineTraceText}
                lengthAdjust="spacingAndGlyphs"
                textAnchor="middle"
                textLength="560"
                x="320"
                y="75"
              >
                YOUR AI TUTOR
              </text>
            </g>
            <g className={styles.taglineSparkHead}>
              <circle cx="0" cy="38" r="4.8" />
              <circle cx="-10" cy="52" r="2.7" />
              <circle cx="7" cy="63" r="2.2" />
              <circle cx="-5" cy="76" r="3.2" />
            </g>
          </svg>
        </div>

        <img
          alt=""
          aria-hidden="true"
          className={styles.cloudLayer}
          src="/landing-3d/logo-mask/layered/clouds-v2.webp"
        />

        {navigation}

        <div className={styles.openingCopy} ref={openingRef}>
          <h1 id={`${id}-cinematic-title`}>{headline}</h1>
          <p>{subhead}</p>
          <a className={styles.introCta} href={ctaHref} onClick={onCtaClick}>
            {ctaLabel}
            <span aria-hidden="true">&#8594;</span>
          </a>
        </div>
      </div>
    </section>
  );
}
