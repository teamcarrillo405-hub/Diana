"use client";

import {
  ChevronLeft,
  ExternalLink,
  ImagePlus,
  Monitor,
  Redo2,
  RotateCcw,
  Save,
  Smartphone,
  Undo2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  publishLandingPage,
  saveLandingPageDraft,
} from "@/app/(app)/design/landing/actions";
import {
  cloneLandingPageConfig,
  DEFAULT_LANDING_PAGE_CONFIG,
  landingNodeStyle,
  type LandingBreakpoint,
  type LandingNodeId,
  type LandingNodeStyle,
  type LandingPageConfig,
} from "@/lib/landing-page/config";
import {
  LANDING_EDITOR_NODE_MAP,
  LANDING_EDITOR_NODES,
  readLandingConfigValue,
  writeLandingConfigValue,
  type LandingConfigPath,
} from "@/lib/landing-page/editor-nodes";

import styles from "./landing-page-editor.module.css";

interface EditorHistory {
  past: LandingPageConfig[];
  present: LandingPageConfig;
  future: LandingPageConfig[];
}

interface LandingPageEditorProps {
  initialDraft: LandingPageConfig;
  initialPublished: LandingPageConfig;
  draftUpdatedAt: string | null;
  publishedAt: string | null;
  storageReady: boolean;
}

const SECTION_TARGETS: Record<string, string> = {
  Welcome: "public-home-welcome",
  Education: "public-home-educational",
  Challenge: "public-home-challenge",
  Schedule: "public-home-schedule",
  Community: "public-home-community",
  Account: "public-home-standard",
};

function updatePath(
  config: LandingPageConfig,
  path: LandingConfigPath,
  value: string,
) {
  return writeLandingConfigValue(config, path, value);
}

function formatSavedAt(value: string | null): string {
  if (!value) return "Not saved";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function LandingPageEditor({
  initialDraft,
  initialPublished,
  draftUpdatedAt,
  publishedAt,
  storageReady,
}: LandingPageEditorProps) {
  const [history, setHistory] = useState<EditorHistory>({
    past: [],
    present: initialDraft,
    future: [],
  });
  const [savedDraft, setSavedDraft] = useState(initialDraft);
  const [published, setPublished] = useState(initialPublished);
  const [publishedSavedAt, setPublishedSavedAt] = useState(publishedAt);
  const [selectedNodeId, setSelectedNodeId] =
    useState<LandingNodeId>("hero.title");
  const [breakpoint, setBreakpoint] =
    useState<LandingBreakpoint>("desktop");
  const [inspectorTab, setInspectorTab] = useState<
    "content" | "style" | "theme"
  >("content");
  const [status, setStatus] = useState(
    storageReady ? `Draft ${formatSavedAt(draftUpdatedAt)}` : "Storage setup required",
  );
  const [saving, setSaving] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const canvasRef = useRef<HTMLElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

  const config = history.present;
  const selectedDefinition = LANDING_EDITOR_NODE_MAP.get(selectedNodeId);
  const selectedStyle = landingNodeStyle(config, breakpoint, selectedNodeId);
  const isDirty = JSON.stringify(config) !== JSON.stringify(savedDraft);
  const isPublished =
    Boolean(publishedSavedAt)
    && JSON.stringify(config) === JSON.stringify(published);

  const commit = useCallback(
    (
      next:
        | LandingPageConfig
        | ((current: LandingPageConfig) => LandingPageConfig),
    ) => {
      setHistory((current) => {
        const nextConfig =
          typeof next === "function" ? next(current.present) : next;
        if (JSON.stringify(nextConfig) === JSON.stringify(current.present)) {
          return current;
        }
        return {
          past: [...current.past.slice(-49), current.present],
          present: nextConfig,
          future: [],
        };
      });
    },
    [],
  );

  const undo = useCallback(() => {
    setHistory((current) => {
      const previous = current.past.at(-1);
      if (!previous) return current;
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => {
      const next = current.future[0];
      if (!next) return current;
      return {
        past: [...current.past, current.present],
        present: next,
        future: current.future.slice(1),
      };
    });
  }, []);

  const postPreviewState = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage(
      {
        type: "diana:landing-editor:update",
        config,
        selectedNodeId,
        breakpoint,
      },
      window.location.origin,
    );
  }, [breakpoint, config, selectedNodeId]);

  useEffect(() => {
    postPreviewState();
  }, [postPreviewState]);

  useEffect(() => {
    const onMessage = (
      event: MessageEvent<
        | { type: "diana:landing-editor:ready" }
        | {
            type: "diana:landing-editor:select";
            nodeId: LandingNodeId;
          }
        | {
            type: "diana:landing-editor:style";
            nodeId: LandingNodeId;
            breakpoint: LandingBreakpoint;
            style: LandingNodeStyle;
          }
      >,
    ) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type === "diana:landing-editor:ready") {
        postPreviewState();
        return;
      }
      if (event.data.type === "diana:landing-editor:select") {
        setSelectedNodeId(event.data.nodeId);
        setInspectorTab(
          LANDING_EDITOR_NODE_MAP.get(event.data.nodeId)?.fields.length
            ? "content"
            : "style",
        );
        return;
      }
      if (event.data.type === "diana:landing-editor:style") {
        const { breakpoint: styleBreakpoint, nodeId, style } = event.data;
        commit((current) => ({
          ...current,
          nodeStyles: {
            ...current.nodeStyles,
            [styleBreakpoint]: {
              ...current.nodeStyles[styleBreakpoint],
              [nodeId]: style,
            },
          },
        }));
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [commit, postPreviewState]);

  const saveDraft = useCallback(() => {
    if (saving) return;
    setSaving(true);
    setStatus("Saving");
    startTransition(async () => {
      const result = await saveLandingPageDraft(config);
      setSaving(false);
      if (!result.ok) {
        setStatus(result.error);
        return;
      }
      setSavedDraft(config);
      setStatus(`${result.message} ${formatSavedAt(result.savedAt)}`);
    });
  }, [config, saving]);

  const publish = useCallback(() => {
    if (saving) return;
    setSaving(true);
    setStatus("Publishing");
    startTransition(async () => {
      const result = await publishLandingPage(config);
      setSaving(false);
      if (!result.ok) {
        setStatus(result.error);
        return;
      }
      setSavedDraft(config);
      setPublished(config);
      setPublishedSavedAt(result.savedAt);
      setStatus(`${result.message} ${formatSavedAt(result.savedAt)}`);
    });
  }, [config, saving]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveDraft();
      }
      if (event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
      if (
        event.key.toLowerCase() === "y"
        || (event.key.toLowerCase() === "z" && event.shiftKey)
      ) {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redo, saveDraft, undo]);

  useEffect(() => {
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeLeave);
    return () => window.removeEventListener("beforeunload", warnBeforeLeave);
  }, [isDirty]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const updateScale = () => {
      const frameWidth = breakpoint === "desktop" ? 1440 : 393;
      const availableWidth = Math.max(320, canvas.clientWidth - 48);
      setPreviewScale(Math.min(1, availableWidth / frameWidth));
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [breakpoint]);

  const patchSelectedStyle = (patch: Partial<LandingNodeStyle>) => {
    commit((current) => ({
      ...current,
      nodeStyles: {
        ...current.nodeStyles,
        [breakpoint]: {
          ...current.nodeStyles[breakpoint],
          [selectedNodeId]: {
            ...landingNodeStyle(current, breakpoint, selectedNodeId),
            ...patch,
          },
        },
      },
    }));
  };

  const resetSelectedStyle = () => {
    commit((current) => {
      const nextStyles = { ...current.nodeStyles[breakpoint] };
      delete nextStyles[selectedNodeId];
      return {
        ...current,
        nodeStyles: {
          ...current.nodeStyles,
          [breakpoint]: nextStyles,
        },
      };
    });
  };

  const selectFromStructure = (nodeId: LandingNodeId, section: string) => {
    setSelectedNodeId(nodeId);
    frameRef.current?.contentWindow?.postMessage(
      {
        type: "diana:landing-editor:scroll",
        sectionId: SECTION_TARGETS[section],
      },
      window.location.origin,
    );
  };

  const uploadHeroImage = async (file: File) => {
    setStatus("Uploading image");
    const body = new FormData();
    body.set("asset", file);
    const response = await fetch("/api/design/landing-assets", {
      method: "POST",
      body,
    });
    const result = (await response.json()) as { url?: string; error?: string };
    if (!response.ok || !result.url) {
      setStatus(result.error ?? "Image upload could not be completed.");
      return;
    }
    commit((current) =>
      updatePath(
        current,
        selectedDefinition!.imagePath!,
        result.url!,
      ),
    );
    setStatus("Image ready in draft.");
  };

  const groupedNodes = useMemo(() => {
    const groups = new Map<string, typeof LANDING_EDITOR_NODES[number][]>();
    for (const definition of LANDING_EDITOR_NODES) {
      const current = groups.get(definition.section) ?? [];
      current.push(definition);
      groups.set(definition.section, current);
    }
    return [...groups.entries()];
  }, []);

  return (
    <div className={`${styles.editor} landing-page-editor`}>
      <header className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <Link
            href="/"
            className={styles.iconButton}
            aria-label="Back to landing page"
            title="Back to landing page"
          >
            <ChevronLeft aria-hidden="true" />
          </Link>
          <div>
            <h1>Landing page</h1>
            <p data-dirty={isDirty}>{isDirty ? "Unsaved draft" : status}</p>
          </div>
        </div>

        <div className={styles.toolbarGroup}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={undo}
            disabled={history.past.length === 0}
            aria-label="Undo"
            title="Undo"
          >
            <Undo2 aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={redo}
            disabled={history.future.length === 0}
            aria-label="Redo"
            title="Redo"
          >
            <Redo2 aria-hidden="true" />
          </button>
          <div className={styles.segmented} aria-label="Preview size">
            <button
              type="button"
              aria-label="Desktop preview"
              title="Desktop preview"
              data-active={breakpoint === "desktop"}
              onClick={() => setBreakpoint("desktop")}
            >
              <Monitor aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Phone preview"
              title="Phone preview"
              data-active={breakpoint === "mobile"}
              onClick={() => setBreakpoint("mobile")}
            >
              <Smartphone aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className={styles.toolbarGroup}>
          <Link
            href="/"
            target="_blank"
            className={styles.iconButton}
            aria-label="Open published page"
            title="Open published page"
          >
            <ExternalLink aria-hidden="true" />
          </Link>
          <button
            type="button"
            className={styles.commandButton}
            onClick={saveDraft}
            disabled={saving || !isDirty || !storageReady}
          >
            <Save aria-hidden="true" />
            Save
          </button>
          <button
            type="button"
            className={styles.publishButton}
            onClick={publish}
            disabled={saving || isPublished || !storageReady}
          >
            <Upload aria-hidden="true" />
            Publish
          </button>
        </div>
      </header>

      <aside className={styles.structure} aria-label="Page structure">
        {groupedNodes.map(([section, nodes]) => (
          <section key={section}>
            <h2>{section}</h2>
            {nodes.map((definition) => (
              <button
                key={definition.id}
                type="button"
                data-active={definition.id === selectedNodeId}
                onClick={() => selectFromStructure(definition.id, section)}
              >
                {definition.label}
              </button>
            ))}
          </section>
        ))}
      </aside>

      <main ref={canvasRef} className={styles.canvas}>
        <div
          className={styles.frameViewport}
          style={{
            width: `${(breakpoint === "desktop" ? 1440 : 393) * previewScale}px`,
            height: `${(breakpoint === "desktop" ? 1000 : 852) * previewScale}px`,
          }}
        >
          <div
            className={styles.frameShell}
            data-breakpoint={breakpoint}
            style={{
              width: breakpoint === "desktop" ? "1440px" : "393px",
              height: breakpoint === "desktop" ? "1000px" : "852px",
              transform: `scale(${previewScale})`,
            }}
          >
            <iframe
              ref={frameRef}
              src="/landing-editor-preview"
              title="Landing page editor preview"
              onLoad={postPreviewState}
            />
          </div>
        </div>
      </main>

      <aside className={styles.inspector} aria-label="Element inspector">
        <header>
          <span>{selectedDefinition?.section ?? "Element"}</span>
          <h2>{selectedDefinition?.label ?? selectedNodeId}</h2>
        </header>

        <div className={styles.tabs} role="tablist" aria-label="Inspector">
          {(["content", "style", "theme"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={inspectorTab === tab}
              onClick={() => setInspectorTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className={styles.inspectorBody}>
          {inspectorTab === "content" ? (
            <>
              {selectedDefinition?.fields.map((field) => (
                <label key={field.path.join(".")} className={styles.field}>
                  <span>{field.label}</span>
                  {field.multiline ? (
                    <textarea
                      value={readLandingConfigValue(config, field.path)}
                      onChange={(event) =>
                        commit((current) =>
                          updatePath(current, field.path, event.target.value),
                        )
                      }
                      rows={4}
                    />
                  ) : (
                    <input
                      type="text"
                      value={readLandingConfigValue(config, field.path)}
                      onChange={(event) =>
                        commit((current) =>
                          updatePath(current, field.path, event.target.value),
                        )
                      }
                    />
                  )}
                </label>
              ))}

              {selectedDefinition?.imagePath ? (
                <label className={styles.uploadField}>
                  <ImagePlus aria-hidden="true" />
                  Replace image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadHeroImage(file);
                    }}
                  />
                </label>
              ) : null}

              {!selectedDefinition?.fields.length
              && !selectedDefinition?.imagePath ? (
                <p className={styles.emptyState}>No text fields for this element.</p>
              ) : null}
            </>
          ) : null}

          {inspectorTab === "style" ? (
            <>
              <div className={styles.coordinateGrid}>
                <label className={styles.field}>
                  <span>X</span>
                  <input
                    type="number"
                    min={-600}
                    max={600}
                    value={selectedStyle.x}
                    onChange={(event) =>
                      patchSelectedStyle({ x: Number(event.target.value) })
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Y</span>
                  <input
                    type="number"
                    min={-600}
                    max={600}
                    value={selectedStyle.y}
                    onChange={(event) =>
                      patchSelectedStyle({ y: Number(event.target.value) })
                    }
                  />
                </label>
              </div>
              <label className={styles.field}>
                <span>Width {selectedStyle.widthPct}%</span>
                <input
                  type="range"
                  min={15}
                  max={100}
                  step={0.5}
                  value={selectedStyle.widthPct}
                  onChange={(event) =>
                    patchSelectedStyle({
                      widthPct: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label className={styles.field}>
                <span>Font size</span>
                <input
                  type="number"
                  min={8}
                  max={160}
                  placeholder="Automatic"
                  value={selectedStyle.fontSizePx ?? ""}
                  onChange={(event) =>
                    patchSelectedStyle({
                      fontSizePx:
                        event.target.value === ""
                          ? null
                          : Number(event.target.value),
                    })
                  }
                />
              </label>
              <button
                type="button"
                className={styles.resetButton}
                onClick={resetSelectedStyle}
              >
                <RotateCcw aria-hidden="true" />
                Reset element
              </button>
            </>
          ) : null}

          {inspectorTab === "theme" ? (
            <>
              {(
                [
                  ["canvas", "Canvas"],
                  ["surface", "Surface"],
                  ["pink", "Pink"],
                  ["blue", "Blue"],
                  ["teal", "Teal"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className={styles.colorField}>
                  <span
                    className={styles.swatch}
                    style={{ backgroundColor: config.theme[key] }}
                  />
                  <span>{label}</span>
                  <input
                    type="color"
                    value={config.theme[key]}
                    onChange={(event) =>
                      commit((current) => ({
                        ...current,
                        theme: {
                          ...current.theme,
                          [key]: event.target.value,
                        },
                      }))
                    }
                    aria-label={`${label} color`}
                  />
                </label>
              ))}
              <label className={styles.field}>
                <span>
                  Hero image{" "}
                  {Math.round(
                    config.theme.heroImageOpacity[breakpoint] * 100,
                  )}
                  %
                </span>
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={config.theme.heroImageOpacity[breakpoint] * 100}
                  onChange={(event) =>
                    commit((current) => ({
                      ...current,
                      theme: {
                        ...current.theme,
                        heroImageOpacity: {
                          ...current.theme.heroImageOpacity,
                          [breakpoint]: Number(event.target.value) / 100,
                        },
                      },
                    }))
                  }
                />
              </label>
              <button
                type="button"
                className={styles.resetButton}
                onClick={() =>
                  commit(cloneLandingPageConfig(DEFAULT_LANDING_PAGE_CONFIG))
                }
              >
                <RotateCcw aria-hidden="true" />
                Reset page
              </button>
            </>
          ) : null}
        </div>

        <footer className={styles.inspectorFooter}>
          <span>Published {formatSavedAt(publishedSavedAt)}</span>
          <span>{breakpoint === "desktop" ? "Desktop" : "Phone"}</span>
        </footer>
      </aside>
    </div>
  );
}
