"use client";

import Moveable from "react-moveable";
import { useEffect, useRef, useState } from "react";

import { PublicHomeFunnel } from "@/app/public-home-funnel";
import {
  parseLandingPageConfig,
  type LandingBreakpoint,
  type LandingNodeId,
  type LandingNodeStyle,
  type LandingPageConfig,
} from "@/lib/landing-page/config";

type ParentMessage =
  | {
      type: "diana:landing-editor:update";
      config: LandingPageConfig;
      selectedNodeId: LandingNodeId | null;
      breakpoint: LandingBreakpoint;
    }
  | {
      type: "diana:landing-editor:scroll";
      sectionId: string;
    };

function notifyParent(message: object) {
  window.parent.postMessage(message, window.location.origin);
}

export function LandingEditorPreview({
  initialConfig,
}: {
  readonly initialConfig: LandingPageConfig;
}) {
  const [config, setConfig] = useState(initialConfig);
  const [selectedNodeId, setSelectedNodeId] = useState<LandingNodeId | null>(
    "hero.title",
  );
  const [breakpoint, setBreakpoint] =
    useState<LandingBreakpoint>("desktop");
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent<ParentMessage>) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type === "diana:landing-editor:update") {
        setConfig(parseLandingPageConfig(event.data.config));
        setSelectedNodeId(event.data.selectedNodeId);
        setBreakpoint(event.data.breakpoint);
        return;
      }
      if (event.data.type === "diana:landing-editor:scroll") {
        document.getElementById(event.data.sectionId)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    };
    window.addEventListener("message", onMessage);
    notifyParent({ type: "diana:landing-editor:ready" });
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const nextTarget = selectedNodeId
      ? rootRef.current?.querySelector<HTMLElement>(
          `[data-landing-node="${selectedNodeId}"]`,
        ) ?? null
      : null;
    if (nextTarget) {
      nextTarget.style.removeProperty("transform");
      nextTarget.style.removeProperty("width");
    }
    setTarget(nextTarget);
  }, [config, selectedNodeId]);

  const selectNode = (nodeId: LandingNodeId) => {
    setSelectedNodeId(nodeId);
    notifyParent({
      type: "diana:landing-editor:select",
      nodeId,
    });
  };

  const onClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    const node = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-landing-node]",
    );
    if (!node) return;
    event.preventDefault();
    event.stopPropagation();
    selectNode(node.dataset.landingNode as LandingNodeId);
  };

  const sendStylePatch = (style: LandingNodeStyle) => {
    if (!selectedNodeId) return;
    notifyParent({
      type: "diana:landing-editor:style",
      nodeId: selectedNodeId,
      breakpoint,
      style,
    });
  };

  const currentStyle: LandingNodeStyle =
    selectedNodeId
      ? config.nodeStyles[breakpoint][selectedNodeId] ?? {
          x: 0,
          y: 0,
          widthPct: 100,
          fontSizePx: null,
        }
      : {
          x: 0,
          y: 0,
          widthPct: 100,
          fontSizePx: null,
        };
  const movable = target?.dataset.landingMovable !== "false";

  return (
    <div
      ref={rootRef}
      className="landing-editor-preview"
      onClickCapture={onClickCapture}
    >
      <style>{`
        .landing-editor-preview [data-landing-node] {
          cursor:pointer;
        }
        .landing-editor-preview [data-landing-node]:hover {
          outline:2px dashed rgb(116 192 255 / .8);
          outline-offset:4px;
        }
        .landing-editor-preview [data-landing-node="${selectedNodeId ?? ""}"] {
          outline:2px solid #ff79da;
          outline-offset:4px;
        }
        .landing-editor-preview .moveable-control-box {
          z-index:200!important;
        }
      `}</style>
      <PublicHomeFunnel config={config} />
      {target ? (
        <Moveable
          target={target}
          draggable={movable}
          resizable={movable}
          origin={false}
          snappable
          snapCenter
          snapThreshold={8}
          bounds={{ left: 0, top: 0, right: 0, bottom: 0, position: "css" }}
          onDrag={({ target: dragTarget, transform }) => {
            dragTarget.style.transform = transform;
          }}
          onDragEnd={({ lastEvent }) => {
            if (!lastEvent) return;
            sendStylePatch({
              ...currentStyle,
              x: Math.round(lastEvent.beforeTranslate[0]),
              y: Math.round(lastEvent.beforeTranslate[1]),
            });
          }}
          onResize={({ target: resizeTarget, width, drag }) => {
            resizeTarget.style.width = `${width}px`;
            resizeTarget.style.transform = drag.transform;
          }}
          onResizeEnd={({ target: resizeTarget, lastEvent }) => {
            if (!lastEvent) return;
            const container =
              resizeTarget.closest<HTMLElement>(".sd-public-home-panel")
              ?? resizeTarget.parentElement;
            const containerWidth =
              container?.getBoundingClientRect().width
              ?? document.documentElement.clientWidth;
            sendStylePatch({
              ...currentStyle,
              x: Math.round(lastEvent.drag.beforeTranslate[0]),
              y: Math.round(lastEvent.drag.beforeTranslate[1]),
              widthPct: Math.max(
                15,
                Math.min(
                  100,
                  Math.round((lastEvent.width / containerWidth) * 1000) / 10,
                ),
              ),
            });
          }}
        />
      ) : null}
    </div>
  );
}
