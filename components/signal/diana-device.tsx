import { ArrowRight, AudioLines, BookOpenCheck, CheckCircle2, LockKeyhole, Mic2 } from "lucide-react";

type DianaDeviceProps = {
  compact?: boolean;
  className?: string;
  assignmentTitle?: string;
  nextMove?: string;
  sourceLabel?: string;
};

export function DianaDevice({
  compact = false,
  className = "",
  assignmentTitle = "Bio lab conclusion",
  nextMove = "Turn observations into one claim.",
  sourceLabel = "Lab notes, page 4",
}: DianaDeviceProps) {
  return (
    <div className={`diana-device ${compact ? "diana-device-compact" : ""} ${className}`} data-signal-device>
      <div className="diana-device-topbar">
        <span>Diana Signal</span>
        <span>student controlled</span>
      </div>

      <div className="diana-device-grid">
        <section className="diana-focus-pane">
          <p className="diana-kicker">Right now</p>
          <h2>{assignmentTitle}</h2>
          <div className="diana-focus-orb" aria-hidden="true">
            <span />
          </div>
          <p className="diana-next-move">{nextMove}</p>
          <button className="diana-device-action" type="button">
            Start the first move
            <ArrowRight size={16} />
          </button>
        </section>

        <section className="diana-proof-pane">
          <div className="diana-proof-row">
            <BookOpenCheck size={17} />
            <div>
              <span>Source</span>
              <strong>{sourceLabel}</strong>
            </div>
          </div>
          <div className="diana-proof-row">
            <AudioLines size={17} />
            <div>
              <span>Voice note</span>
              <strong>optional</strong>
            </div>
          </div>
          <div className="diana-proof-row">
            <LockKeyhole size={17} />
            <div>
              <span>Final work</span>
              <strong>student owned</strong>
            </div>
          </div>
        </section>
      </div>

      <div className="diana-wave" aria-hidden="true">
        {[22, 34, 18, 42, 28, 48, 24, 36, 20, 44, 30, 38].map((height, index) => (
          <span key={`${height}-${index}`} style={{ height: `${height}px`, animationDelay: `${index * 70}ms` }} />
        ))}
      </div>

      <div className="diana-device-footer">
        <span><Mic2 size={14} /> Ask what feels stuck</span>
        <span><CheckCircle2 size={14} /> One move ready</span>
      </div>
    </div>
  );
}
