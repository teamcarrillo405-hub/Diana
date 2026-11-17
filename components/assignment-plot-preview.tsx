import {
  ASSIGNMENT_PLOT_COLORS,
  ASSIGNMENT_PLOT_FRAME,
  assignmentPlotPath,
  type AssignmentPlot,
} from "@/lib/specialist-artifacts/assignment-plots";
import styles from "./student-shell/plot-preview.module.css";

export function AssignmentPlotPreview({ plot }: { plot: AssignmentPlot }) {
  const frame = ASSIGNMENT_PLOT_FRAME;
  const colors = ASSIGNMENT_PLOT_COLORS;
  const kind = plot.kind.charAt(0).toUpperCase() + plot.kind.slice(1);
  const width = frame.right - frame.left;
  const height = frame.bottom - frame.top;
  const lastTick = plot.xTicks.length - 1;
  return (
    <figure className={styles.figure}>
      <div className={styles.plotFrame}>
      <svg
        className={styles.plot}
        width={width}
        height={height}
        viewBox={`${frame.left} ${frame.top} ${width} ${height}`}
        role="img"
        aria-label={`${kind} of ${plot.yLabel} by ${plot.xLabel}`}
      >
        <g stroke={colors.grid}>
          {plot.xTicks.map(({ position }) => <line key={position} x1={position} x2={position} y1={frame.top} y2={frame.bottom} />)}
          {plot.yTicks.map(({ position }) => <line key={position} x1={frame.left} x2={frame.right} y1={position} y2={position} />)}
          {plot.xZero !== null ? <line x1={plot.xZero} x2={plot.xZero} y1={frame.top} y2={frame.bottom} stroke={colors.frame} /> : null}
          {plot.yZero !== null ? <line x1={frame.left} x2={frame.right} y1={plot.yZero} y2={plot.yZero} stroke={colors.frame} /> : null}
        </g>
        {plot.marks.map((mark, index) => {
          if (mark.kind === "line") return (
            <path key={index} data-plot-series={mark.label} d={assignmentPlotPath(mark.paths)} fill="none" stroke={mark.color} strokeWidth="2.7" strokeDasharray={mark.dash.join(" ") || undefined} />
          );
          if (mark.kind === "points") return (
            <g key={index} data-plot-series={mark.label} fill={mark.color}>
              {mark.points.map(({ x, y }, pointIndex) => <circle key={pointIndex} cx={x} cy={y} r="4.4" />)}
            </g>
          );
          return <g key={index} data-plot-series={mark.label} fill={mark.color}>
            {mark.bars.map((bar, barIndex) => <rect key={barIndex} {...bar} />)}
          </g>;
        })}
      </svg>
        <div className={styles.tickLabels} aria-hidden="true">
          {plot.yTicks.map(({ position, label }) => (
            <span className={styles.yTick} key={position} style={{ top: `${100 * (position - frame.top) / height}%` }}>{label}</span>
          ))}
          {plot.xTicks.map(({ position, label }, index) => (
            <span className={styles.xTick} key={position} style={{ left: `${100 * (position - frame.left) / width}%` }}
              data-edge={position === frame.left ? "start" : position === frame.right ? "end" : undefined}
              data-secondary={index !== 0 && index !== lastTick && index !== Math.floor(lastTick / 2) || undefined}>{label}</span>
          ))}
        </div>
      </div>
      <figcaption className="mt-2 space-y-1 text-sm [overflow-wrap:anywhere]">
        <div>Horizontal axis: {plot.xLabel}. Vertical axis: {plot.yLabel}.</div>
        <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
          {plot.marks.map((mark, index) => <li key={index} className="flex min-w-0 items-start gap-2">
            <svg className="mt-1 shrink-0" width="22" height="13" viewBox="0 0 22 13" aria-hidden="true">
              {mark.kind === "line" ? <line x1="1" x2="21" y1="7" y2="7" stroke={mark.color} strokeWidth="3" strokeDasharray={mark.dash.join(" ") || undefined} />
                : mark.kind === "points" ? <circle cx="11" cy="7" r="4" fill={mark.color} />
                  : <rect x="6" y="2" width="10" height="10" fill={mark.color} />}
            </svg>
            <span>{mark.label}</span>
          </li>)}
        </ul>
        {plot.note ? <div>{plot.note}</div> : null}
        <details className={styles.axisValues}>
          <summary>Axis tick values</summary>
          <dl>
            <div><dt>Horizontal</dt><dd>{plot.xTicks.map((tick) => tick.label).join(", ")}</dd></div>
            <div><dt>Vertical</dt><dd>{[...plot.yTicks].reverse().map((tick) => tick.label).join(", ")}</dd></div>
          </dl>
        </details>
      </figcaption>
    </figure>
  );
}
