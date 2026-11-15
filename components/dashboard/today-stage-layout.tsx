"use client";

import Image from "next/image";
import { Children, cloneElement, isValidElement, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactElement, type ReactNode } from "react";
import styles from "./today-dashboard.module.css";

export type TodayMode = "now" | "week" | "upcoming" | "check-in" | "subjects" | "milestones";
type PanelDefinition = { id: TodayMode; label: string };
type PanelProps = {
  className?: string;
  id?: string;
  role?: string;
  inert?: boolean;
  tabIndex?: number;
  ["aria-label"]?: string;
  ["aria-labelledby"]?: string;
  ["aria-hidden"]?: boolean;
  ["data-active"]?: boolean;
};
type PanelElement = ReactElement<PanelProps>;

const PANELS: readonly PanelDefinition[] = [
  { id: "now", label: "Now" },
  { id: "week", label: "This Week" },
  { id: "upcoming", label: "Upcoming" },
  { id: "check-in", label: "Check-In" },
  { id: "subjects", label: "Subjects" },
  { id: "milestones", label: "Milestones" },
];

export function TodayStageLayout({ children, imageSrc = "/images/today-future-academy-4k.webp", imageSizes = "(max-width: 760px) 100vw, 80vw", imageQuality = 75, artwork, railIndicator = false, labels, modes, title = "Today", onSelectionChange }: { children: ReactNode; imageSrc?: string; imageSizes?: string; imageQuality?: number; artwork?: ReactNode; railIndicator?: boolean; labels?: Partial<Record<TodayMode, string>>; modes?: readonly TodayMode[]; title?: string; onSelectionChange?: (mode: TodayMode) => void }) {
  const definitions = useMemo(() => modes ? modes.map(id => PANELS.find(panel => panel.id === id)!) : PANELS, [modes]);
  const [activeId, setActiveId] = useState<TodayMode>("now");
  const [stageMode, setStageMode] = useState(false);
  const idPrefix = useId();
  const tabs = useRef<Partial<Record<TodayMode, HTMLButtonElement>>>({});
  const breakpointFocus = useRef<{ from: Element; to: HTMLElement } | null>(null);
  const panels = Children.toArray(children).filter(isValidElement) as PanelElement[];

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(min-width: 761px)");
    let wasStageMode = media.matches;
    setStageMode(wasStageMode);
    const sync = () => {
      if (media.matches === wasStageMode) return;
      wasStageMode = media.matches;
      const focused = document.activeElement;
      breakpointFocus.current = null;
      if (focused) {
        for (const { id } of definitions) {
          const tab = tabs.current[id];
          const panel = document.getElementById(`${idPrefix}-${id}-panel`);
          const target = !media.matches && tab?.contains(focused)
            ? panel
            : media.matches && panel?.contains(focused) && panel.dataset.active === "false"
              ? Object.values(tabs.current).find(candidate => candidate?.getAttribute("aria-selected") === "true")
              : null;
          if (target) {
            breakpointFocus.current = { from: focused, to: target };
            break;
          }
        }
      }
      setStageMode(media.matches);
    };
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [idPrefix, definitions]);

  useLayoutEffect(() => {
    const pending = breakpointFocus.current;
    breakpointFocus.current = null;
    // Wait for inert to clear, without overriding focus moved elsewhere meanwhile.
    if (pending?.to.isConnected && (document.activeElement === pending.from || document.activeElement === document.body)) {
      pending.to.focus();
    }
  }, [stageMode]);

  function selectPanel(id: TodayMode) {
    if (id === activeId) return;
    onSelectionChange?.(id);
    setActiveId(id);
  }

  function onRailKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") nextIndex = (currentIndex + 1) % definitions.length;
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + definitions.length) % definitions.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = definitions.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = definitions[nextIndex];
    selectPanel(next.id);
    tabs.current[next.id]?.focus();
  }

  return <div className={styles.stageWorkspace} data-today-stage-workspace>
    <nav className={styles.stageRail} data-today-stage-rail aria-label={`${title} categories`} role="tablist" aria-orientation="vertical">
      <p className={styles.railKicker}>{title}</p>
      {railIndicator && <span data-today-rail-indicator aria-hidden="true" style={{ "--selected-index": definitions.findIndex(panel => panel.id === activeId) } as CSSProperties} />}
      {definitions.map((panel, index) => {
        const selected = activeId === panel.id;
        return <button
          key={panel.id}
          ref={node => { tabs.current[panel.id] = node ?? undefined; }}
          type="button"
          role="tab"
          id={`${idPrefix}-${panel.id}-tab`}
          aria-controls={`${idPrefix}-${panel.id}-panel`}
          aria-selected={selected}
          tabIndex={selected ? 0 : -1}
          onClick={() => selectPanel(panel.id)}
          onKeyDown={event => onRailKeyDown(event, index)}
        >
          <span>{labels?.[panel.id] ?? panel.label}</span>
        </button>;
      })}
    </nav>
    <div className={styles.stage} data-today-stage>
      <div className={styles.stageImage} data-today-stage-image aria-hidden="true">
        {artwork ?? <Image src={imageSrc} alt="" fill priority sizes={imageSizes} quality={imageQuality} />}
      </div>
      <div className={styles.stageVeil} aria-hidden="true" />
      <div className={styles.stageDeck} data-today-stage-deck>
        {panels.map((panel, index) => {
          const definition = definitions[index];
          if (!definition) return panel;
          const selected = activeId === definition.id;
          return cloneElement(panel, {
            key: panel.key ?? definition.id,
            id: `${idPrefix}-${definition.id}-panel`,
            role: stageMode ? "tabpanel" : undefined,
            tabIndex: panel.props.tabIndex ?? -1,
            "aria-labelledby": stageMode ? `${idPrefix}-${definition.id}-tab` : undefined,
            "aria-hidden": stageMode && !selected ? true : undefined,
            ...(stageMode && !selected ? { inert: true } : {}),
            "data-active": selected,
            className: `${panel.props.className ?? ""} ${styles.stagePanel}`,
          });
        })}
      </div>
    </div>
  </div>;
}
