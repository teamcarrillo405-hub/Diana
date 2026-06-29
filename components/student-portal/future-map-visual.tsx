import { ArrowRight, GraduationCap, Landmark, ShieldCheck, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import type { FutureMilestone, FuturePathModel } from "@/lib/future-path/derive";
import { SpotlightSurface } from "./spotlight-surface";

export function FutureMapVisual({ model }: { model: FuturePathModel }) {
  const steps = model.milestones.slice(0, 5);

  return (
    <SpotlightSurface className="future-map-visual nexus-panel">
      <div className="future-map-orbit" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="future-map-head">
        <p>{model.stageTitle}</p>
        <h2>{model.weeklyAction}</h2>
        <span>
          <GraduationCap size={15} />
          Personal map
        </span>
      </div>

      <div className="future-map-path" aria-label="Future Path roadmap preview">
        {steps.map((milestone, index) => (
          <FutureMapNode key={milestone.title} milestone={milestone} index={index} />
        ))}
      </div>

      <div className="future-map-footer">
        <span>
          <ShieldCheck size={16} />
          {model.proofCount} proof points
        </span>
        <span>
          <Landmark size={16} />
          Support fit
        </span>
        <span>
          <Sparkles size={16} />
          Student voice first
        </span>
      </div>
    </SpotlightSurface>
  );
}

function FutureMapNode({ milestone, index }: { milestone: FutureMilestone; index: number }) {
  return (
    <div className="future-map-node" style={{ "--node-index": index } as CSSProperties}>
      <div className="future-node-pin">
        <span>{index + 1}</span>
      </div>
      <div>
        <p>{milestone.title}</p>
        <small>{milestone.body}</small>
      </div>
      <ArrowRight size={15} aria-hidden="true" />
    </div>
  );
}
