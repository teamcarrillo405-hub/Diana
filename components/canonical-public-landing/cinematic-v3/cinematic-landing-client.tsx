"use client";

import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { EarlyAccessForm } from "../early-access-form";
import { landingAnalyticsEvents, trackLandingEvent } from "../analytics";

type CinematicEventDetail = {
  name?: "cta" | "product" | "section";
  location?: "hero" | "header";
  scene?: number;
  section?: string;
};

declare global {
  interface Window {
    __DIANA_ASSET_BASE__?: string;
    __DIANA_ASSET_VERSION__?: string;
    __dianaComposition?: {
      ready?: boolean;
      error?: string;
      progress?: number;
      scrollRange?: number;
      activeSlide?: number;
      goToSlide?: (index: number) => void;
    };
  }
}

const productScenes = ["lobby", "work", "coaching", "practice"] as const;
const dayScenes = ["calendar", "connections", "notes", "life"] as const;

export function CinematicLandingClient({ narrativeHtml, assetBase, assetVersion }: { narrativeHtml: string; assetBase: string; assetVersion: string }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    document.body.classList.add("cinematic-landing");
    window.__DIANA_ASSET_BASE__ = assetBase;
    window.__DIANA_ASSET_VERSION__ = assetVersion;
    const waitlistSlot = root.querySelector<HTMLElement>("#cinematic-waitlist-slot");
    const waitlistRoot = waitlistSlot ? createRoot(waitlistSlot) : null;
    waitlistRoot?.render(<EarlyAccessForm className="cinematic-waitlist-form" />);

    const trackCinematicEvent = (event: Event) => {
      const detail = (event as CustomEvent<CinematicEventDetail>).detail ?? {};
      if (detail.name === "cta" && detail.location) {
        trackLandingEvent(landingAnalyticsEvents.ctaClicked, { location: detail.location });
      } else if (detail.name === "product" && typeof detail.scene === "number") {
        const scene = productScenes[detail.scene];
        if (scene) trackLandingEvent(landingAnalyticsEvents.productMediaEngaged, { scene });
      } else if (detail.name === "section") {
        const scene = detail.section === "your_day" && typeof detail.scene === "number" ? dayScenes[detail.scene] : null;
        if (scene) trackLandingEvent(landingAnalyticsEvents.productMediaEngaged, { scene });
        trackLandingEvent(landingAnalyticsEvents.sectionReached, { section: detail.section === "control" ? "control" : "your_day" });
      }
    };
    window.addEventListener("diana:cinematic-event", trackCinematicEvent);

    const seen = new Set<string>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const section = (entry.target as HTMLElement).dataset.analyticsSection;
        if (!section || seen.has(section)) continue;
        seen.add(section);
        trackLandingEvent(landingAnalyticsEvents.sectionReached, { section });
      }
    }, { threshold: 0.3 });
    const observed = [
      [root.querySelector("#opening"), "hero"],
      [root.querySelector("#questions"), "questions"],
      [root.querySelector("#waitlist"), "early_access"],
    ] as const;
    for (const [element, section] of observed) {
      if (!(element instanceof HTMLElement)) continue;
      element.dataset.analyticsSection = section;
      observer.observe(element);
    }

    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href^='#']");
      if (!anchor || !root.contains(anchor)) return;
      const destination = ({
        "#homework": "product_proof",
        "#your-day": "your_day",
        "#your-control": "control",
        "#questions": "questions",
        "#waitlist": "early_access",
      } as const)[anchor.getAttribute("href") as "#homework"];
      if (destination) trackLandingEvent(landingAnalyticsEvents.storySkipped, { destination });
    };
    root.addEventListener("click", onClick);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onReducedMotionFallbackClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) return;

      const dialog = root.querySelector<HTMLDialogElement>("#work-dialog");
      if (!dialog) return;

      if (target.closest("#close-dialog")) {
        if (dialog.open) dialog.close();
        return;
      }

      if (target.closest("#zoom-screen")) {
        const zoomed = dialog.classList.toggle("zoomed");
        dialog.querySelector<HTMLButtonElement>("#zoom-screen")?.setAttribute("aria-pressed", String(zoomed));
        return;
      }

      const trigger = target.closest<HTMLButtonElement>("button.product");
      if (!trigger || !root.contains(trigger)) return;

      const sourceImage = trigger.querySelector<HTMLImageElement>("img");
      const dialogImage = dialog.querySelector<HTMLImageElement>("picture img");
      const dialogSource = dialog.querySelector<HTMLSourceElement>("picture source");
      const title = trigger.closest<HTMLElement>(".fallback-chapter")?.querySelector("h2")?.textContent?.trim();
      const imageUrl = sourceImage?.currentSrc || sourceImage?.src;
      if (!sourceImage || !dialogImage || !imageUrl) return;

      dialog.classList.remove("zoomed");
      dialog.querySelector<HTMLButtonElement>("#zoom-screen")?.setAttribute("aria-pressed", "false");
      dialog.querySelector("#dialog-heading")!.textContent = title || "Your homework";
      dialogImage.src = imageUrl;
      dialogImage.alt = sourceImage.alt;
      if (dialogSource) dialogSource.srcset = imageUrl;
      if (!dialog.open) dialog.showModal();
    };

    if (reducedMotion.matches) {
      root.addEventListener("click", onReducedMotionFallbackClick);
    }

    const loadCinematic = () => {
      if (document.querySelector('script[data-diana-cinematic="v3"]')) return;
      const script = document.createElement("script");
      script.src = `${assetBase}/main.js?v=${assetVersion}`;
      script.dataset.dianaCinematic = "v3";
      script.async = true;
      document.body.appendChild(script);
    };
    if (!reducedMotion.matches) {
      loadCinematic();
    }

    return () => {
      observer.disconnect();
      root.removeEventListener("click", onClick);
      root.removeEventListener("click", onReducedMotionFallbackClick);
      window.removeEventListener("diana:cinematic-event", trackCinematicEvent);
      waitlistRoot?.unmount();
      document.body.classList.remove("cinematic-landing", "ready", "motion-ready");
    };
  }, [assetBase, assetVersion]);

  return (
    <div ref={rootRef} className="cinematic-landing-root">
      <link rel="preload" href={`${assetBase}/outfit.woff2?v=${assetVersion}`} as="font" type="font/woff2" crossOrigin="anonymous" />
      <link rel="stylesheet" href={`${assetBase}/style.css?v=${assetVersion}`} />
      <div dangerouslySetInnerHTML={{ __html: narrativeHtml }} />
    </div>
  );
}
