"use client";

import {
  ExternalLink,
  Monitor,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  COMPARISON_PAGES,
  comparisonFrameUrl,
  findComparisonPage,
} from "@/lib/design-comparison";

import styles from "./design-comparison.module.css";

type FrameSource = "live" | "design";

const comparisonGroups = ["Primary", "Work flow"] as const;
const DESKTOP_WIDTH = 1280;
const DESKTOP_HEIGHT = 900;
const MOBILE_WIDTH = 393;
const MOBILE_HEIGHT = 852;

function useFrameScale(
  ref: React.RefObject<HTMLDivElement | null>,
  naturalWidth: number,
  initialScale: number,
) {
  const [scale, setScale] = useState(initialScale);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;

    const measure = () => {
      const available = host.getBoundingClientRect().width;
      setScale(Math.min(1, Math.max(0.2, available / naturalWidth)));
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [naturalWidth, ref]);

  return scale;
}

function SourceToggle({
  label,
  value,
  onChange,
  designLabel,
  designAvailable = true,
}: {
  label: string;
  value: FrameSource;
  onChange: (value: FrameSource) => void;
  designLabel: string;
  designAvailable?: boolean;
}) {
  return (
    <div className={styles.sourceControl}>
      <span>{label}</span>
      <div className={styles.segmented} role="group" aria-label={`${label} source`}>
        <button
          type="button"
          data-active={value === "live"}
          onClick={() => onChange("live")}
        >
          Live
        </button>
        <button
          type="button"
          data-active={value === "design"}
          disabled={!designAvailable}
          onClick={() => onChange("design")}
        >
          {designAvailable ? designLabel : "Live only"}
        </button>
      </div>
    </div>
  );
}

function ReviewFrame({
  label,
  icon,
  url,
  width,
  height,
  scale,
  refreshKey,
  hostRef,
}: {
  label: string;
  icon: React.ReactNode;
  url: string;
  width: number;
  height: number;
  scale: number;
  refreshKey: number;
  hostRef: React.RefObject<HTMLDivElement | null>;
}) {
  const frameUrl = url.startsWith("/design/")
    ? url + (url.includes("?") ? "&" : "?") + "preview=" + refreshKey
    : url;

  return (
    <section className={styles.reviewPanel} aria-label={`${label} preview`}>
      <header className={styles.panelHeader}>
        <div>
          {icon}
          <strong>{label}</strong>
          <span>
            {width} × {height}
          </span>
        </div>
        <a href={url} target="_blank" rel="noreferrer" aria-label={`Open ${label}`}>
          <ExternalLink aria-hidden="true" />
        </a>
      </header>
      <div
        ref={hostRef}
        className={styles.frameHost}
        style={{ height: `${height * scale}px` }}
      >
        <div
          className={styles.frameCanvas}
          style={{
            width: `${width}px`,
            height: `${height}px`,
            transform: `scale(${scale})`,
          }}
        >
          <iframe
            key={`${url}-${refreshKey}`}
            src={frameUrl}
            title={`${label} ${url}`}
            style={{ width: `${width}px`, height: `${height}px` }}
          />
        </div>
      </div>
      <footer className={styles.panelFooter}>{url}</footer>
    </section>
  );
}

export function DesignComparisonStudio() {
  const [pageId, setPageId] = useState("today");
  const [desktopSource, setDesktopSource] = useState<FrameSource>("live");
  const [mobileSource, setMobileSource] = useState<FrameSource>("design");
  const [refreshKey, setRefreshKey] = useState(0);
  const desktopHostRef = useRef<HTMLDivElement>(null);
  const mobileHostRef = useRef<HTMLDivElement>(null);
  const desktopScale = useFrameScale(desktopHostRef, DESKTOP_WIDTH, 0.62);
  const mobileScale = useFrameScale(mobileHostRef, MOBILE_WIDTH, 1);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("page");
    if (requested) setPageId(findComparisonPage(requested).id);
  }, []);

  const page = useMemo(() => findComparisonPage(pageId), [pageId]);
  const desktopUrl = comparisonFrameUrl(page, "desktop", desktopSource);
  const mobileUrl = comparisonFrameUrl(page, "mobile", mobileSource);

  const selectPage = (nextId: string) => {
    const nextPage = findComparisonPage(nextId);
    setPageId(nextPage.id);
    if (!nextPage.desktopDesign) setDesktopSource("live");
    if (!nextPage.mobileDesign) setMobileSource("live");
    const url = new URL(window.location.href);
    url.searchParams.set("page", nextPage.id);
    window.history.replaceState(null, "", url);
  };

  return (
    <div className={styles.studio}>
      <header className={styles.toolbar}>
        <div className={styles.identity}>
          <span>D</span>
          <div>
            <strong>Diana Layout Review</strong>
            <small>Page {COMPARISON_PAGES.indexOf(page) + 1} of {COMPARISON_PAGES.length}</small>
          </div>
        </div>

        <label className={styles.pagePicker}>
          <span>Page</span>
          <select
            value={page.id}
            onChange={(event) => selectPage(event.target.value)}
            aria-label="Page under review"
          >
            {comparisonGroups.map((group) => (
              <optgroup key={group} label={group}>
                {COMPARISON_PAGES.filter((item) => item.group === group).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <SourceToggle
          label="Desktop"
          value={desktopSource}
          onChange={setDesktopSource}
          designLabel="Design"
          designAvailable={Boolean(page.desktopDesign)}
        />
        <SourceToggle
          label="Mobile"
          value={mobileSource}
          onChange={setMobileSource}
          designLabel="Phone design"
          designAvailable={Boolean(page.mobileDesign)}
        />

        <button
          type="button"
          className={styles.refresh}
          onClick={() => setRefreshKey((value) => value + 1)}
          aria-label="Refresh both previews"
          title="Refresh both previews"
        >
          <RefreshCw aria-hidden="true" />
        </button>
      </header>

      <main className={styles.comparisonCanvas}>
        <ReviewFrame
          label={`${page.label} desktop`}
          icon={<Monitor aria-hidden="true" />}
          url={desktopUrl}
          width={DESKTOP_WIDTH}
          height={DESKTOP_HEIGHT}
          scale={desktopScale}
          refreshKey={refreshKey}
          hostRef={desktopHostRef}
        />
        <ReviewFrame
          label={`${page.label} mobile`}
          icon={<Smartphone aria-hidden="true" />}
          url={mobileUrl}
          width={MOBILE_WIDTH}
          height={MOBILE_HEIGHT}
          scale={mobileScale}
          refreshKey={refreshKey}
          hostRef={mobileHostRef}
        />
      </main>
    </div>
  );
}