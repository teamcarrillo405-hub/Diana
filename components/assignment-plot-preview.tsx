import {
  ASSIGNMENT_PLOT_COLORS,
  ASSIGNMENT_PLOT_FRAME,
  assignmentPlotPath,
  compactPlotLabel,
  type AssignmentPlot,
} from "@/lib/specialist-artifacts/assignment-plots";

export function AssignmentPlotPreview({ plot }: { plot: AssignmentPlot }) {
  const frame = ASSIGNMENT_PLOT_FRAME;
  const colors = ASSIGNMENT_PLOT_COLORS;
  const kind = plot.kind.charAt(0).toUpperCase() + plot.kind.slice(1);
  return (
    <figure className="m-0 min-w-0">
      <svg
        className="block w-full rounded-sm border border-[#c4d1c9] bg-white"
        viewBox={`0 0 ${frame.width} ${frame.height}`}
        role="img"
        aria-label={`${kind} of ${plot.yLabel} by ${plot.xLabel}`}
      >
        <g fontFamily="sans-serif" fontSize="13" fill={colors.ink}>
          {plot.xTicks.map(({ position, label }) => <g key={position}>
            <line x1={position} x2={position} y1={frame.top} y2={frame.bottom} stroke={colors.grid} />
            <text x={position} y={frame.bottom + 19} textAnchor="middle">{label}</text>
          </g>)}
          {plot.yTicks.map(({ position, label }) => <g key={position}>
            <line x1={frame.left} x2={frame.right} y1={position} y2={position} stroke={colors.grid} />
            <text x={frame.left - 7} y={position + 4} textAnchor="end">{label}</text>
          </g>)}
          {plot.xZero !== null ? <line x1={plot.xZero} x2={plot.xZero} y1={frame.top} y2={frame.bottom} stroke={colors.frame} /> : null}
          {plot.yZero !== null ? <line x1={frame.left} x2={frame.right} y1={plot.yZero} y2={plot.yZero} stroke={colors.frame} /> : null}
          <rect x={frame.left} y={frame.top} width={frame.right - frame.left} height={frame.bottom - frame.top} fill="none" stroke={colors.frame} />
          <text x={frame.left} y={frame.top - 12} fontWeight="bold">{compactPlotLabel(plot.yLabel, 45)}</text>
          <text x={(frame.left + frame.right) / 2} y={frame.bottom + 39} textAnchor="middle" fontWeight="bold">{compactPlotLabel(plot.xLabel, 45)}</text>
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
      </figcaption>
    </figure>
  );
}
