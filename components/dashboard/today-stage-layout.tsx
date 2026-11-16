"use client";

import Image from "next/image";
import { ChartNoAxesColumnIncreasing, ClipboardList, Heart, House } from "lucide-react";
import { Children, cloneElement, isValidElement, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type ReactElement, type ReactNode } from "react";
import styles from "./today-dashboard.module.css";
import shortcuts from "./lobby-mobile-shortcuts.module.css";

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
const LOBBY_ICONS: Partial<Record<TodayMode, typeof House>> = {
  now: House,
  week: ChartNoAxesColumnIncreasing,
  "check-in": Heart,
  milestones: ClipboardList,
};

export function TodayStageLayout({ children, imageSrc = "/images/today-future-academy-4k.webp", imageSizes = "(max-width: 760px) 100vw, 80vw", imageQuality = 75, artwork, railIndicator = false, labels, modes, title = "Today", railHeading, selectedMode, onSelectionChange }: { children: ReactNode; imageSrc?: string; imageSizes?: string; imageQuality?: number; artwork?: ReactNode; railIndicator?: boolean; labels?: Partial<Record<TodayMode, string>>; modes?: readonly TodayMode[]; title?: string; railHeading?: ReactNode; selectedMode?: TodayMode; onSelectionChange?: (mode: TodayMode) => void }) {
  const definitions = useMemo(() => modes ? modes.map(id => PANELS.find(panel => panel.id === id)!) : PANELS, [modes]);
  const [internalId, setInternalId] = useState<TodayMode>("now");
  const activeId = selectedMode ?? internalId;
  const [stageMode, setStageMode] = useState(false);
  const [mobileId, setMobileId] = useState<TodayMode>(definitions[0]?.id ?? "now");
  const idPrefix = useId();
  const tabs = useRef<Partial<Record<TodayMode, HTMLButtonElement>>>({});
  const jumpButtons = useRef<Partial<Record<TodayMode, HTMLButtonElement>>>({});
  const shortcutNav = useRef<HTMLElement>(null);
  const breakpointFocus = useRef<{ from: Element; to: HTMLElement } | null>(null);
  const panels = Children.toArray(children).filter(isValidElement) as PanelElement[];
  const showLobbyShortcuts = title === "Lobby" && definitions.length === 3;

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
          const jumpButton = jumpButtons.current[id];
          const panel = document.getElementById(`${idPrefix}-${id}-panel`);
          const target = !media.matches && tab?.contains(focused)
            ? panel
            : media.matches && (jumpButton?.contains(focused) || (panel?.contains(focused) && panel.dataset.active === "false"))
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

  useEffect(() => {
    const nav = shortcutNav.current;
    if (!showLobbyShortcuts || stageMode || !nav) return;

    const sections = definitions.flatMap(({ id }) => {
      const element = document.getElementById(`${idPrefix}-${id}-panel`);
      return element ? [{ id, element }] : [];
    });
    const last = sections.at(-1);
    if (!last) return;

    let frame: number | null = null;
    const update = () => {
      frame = null;
      const navBounds = nav.getBoundingClientRect();
      if (navBounds.height === 0) return;
      // Sample just beneath the sticky shortcuts, inside the jump's scroll margin.
      const readingLine = navBounds.bottom + 24;
      let current = sections[0].id;
      for (const { id, element } of sections) {
        if (element.getBoundingClientRect().top <= readingLine) current = id;
      }

      // A short final section can be visible without ever reaching the reading line.
      const scrollLimit = (document.scrollingElement ?? document.documentElement).scrollHeight - window.innerHeight;
      if (scrollLimit > 0 && window.scrollY >= scrollLimit - 2) current = last.id;
      setMobileId(current);
    };
    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(update);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    observer?.observe(nav);
    sections.forEach(({ element }) => observer?.observe(element));
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer?.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [definitions, idPrefix, showLobbyShortcuts, stageMode]);

  function selectPanel(id: TodayMode) {
    if (id === activeId) return;
    onSelectionChange?.(id);
    if (selectedMode === undefined) setInternalId(id);
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

  function jumpToPanel(id: TodayMode) {
    const panel = document.getElementById(`${idPrefix}-${id}-panel`);
    if (!panel) return;
    selectPanel(id);
    setMobileId(id);
    // Put keyboard and assistive-technology focus at the destination as well as
    // moving the viewport. Mobile keeps all sections available in the document.
    panel.focus({ preventScroll: true });
    panel.scrollIntoView?.({ block: "start", behavior: "auto" });
  }

  function followPanelFocus(event: FocusEvent<HTMLDivElement>) {
    if (stageMode) return;
    const panel = event.target.closest("[data-today-stage-deck] > [data-active]");
    const definition = definitions.find(({ id }) => panel?.id === `${idPrefix}-${id}-panel`);
    if (definition) setMobileId(definition.id);
  }

  return <div className={`${styles.stageWorkspace}${showLobbyShortcuts ? ` ${shortcuts.workspace}` : ""}`} data-today-stage-workspace onFocusCapture={showLobbyShortcuts ? followPanelFocus : undefined}>
    {showLobbyShortcuts && <nav ref={shortcutNav} className={shortcuts.navigation} aria-label="Jump to Lobby section">
      {definitions.map(panel => <button
        key={panel.id}
        ref={node => { jumpButtons.current[panel.id] = node ?? undefined; }}
        type="button"
        aria-label={`Jump to ${labels?.[panel.id] ?? panel.label}`}
        aria-controls={`${idPrefix}-${panel.id}-panel`}
        aria-current={!stageMode && mobileId === panel.id ? "location" : undefined}
        onClick={() => jumpToPanel(panel.id)}
      >{labels?.[panel.id] ?? panel.label}</button>)}
    </nav>}
    <nav className={styles.stageRail} data-today-stage-rail aria-label={`${title} categories`} role="tablist" aria-orientation="vertical">
      <p className={styles.railKicker}>{railHeading ?? title}</p>
      {railIndicator && <span data-today-rail-indicator aria-hidden="true" style={{ "--selected-index": definitions.findIndex(panel => panel.id === activeId) } as CSSProperties} />}
      {definitions.map((panel, index) => {
        const selected = activeId === panel.id;
        const LobbyIcon = title === "Lobby" ? LOBBY_ICONS[panel.id] : undefined;
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
          {LobbyIcon && <LobbyIcon size={21} strokeWidth={2.2} aria-hidden="true" focusable="false" />}
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
