"use client";
import { useId } from "react";
import { courseDataGraphSchema, type CourseDataGraph } from "@/lib/learning-engine/course-graphs";
import styles from "./learning-material.module.css";

export function CourseDataGraph({ graph: rawGraph }: { graph: CourseDataGraph }) {
  const id = useId(), parsed = courseDataGraphSchema.safeParse(rawGraph);
  if (!parsed.success) return <p role="status" className={styles.notice}>This graph could not be displayed. Reload the question to continue.</p>;
  const graph = parsed.data;
  const xs = graph.points.map(point => point.x), ys = graph.points.map(point => point.y);
  const minX = Math.min(0, ...xs), maxX = Math.max(0, ...xs) || 1;
  const minY = Math.min(0, ...ys), maxY = Math.max(0, ...ys) || (minY === 0 ? 1 : 0);
  const xRange = maxX - minX, yRange = maxY - minY;
  const x = (value: number) => 90 + 280 * (value - minX) / xRange;
  const y = (value: number) => 235 - 210 * (value - minY) / yRange;
  const tick = (value: number) => Number(value.toFixed(2)).toString();
  const ticks = [0, 1, 2, 3, 4];
  return <figure className={styles.section} aria-labelledby={`${id}-caption`}>
    <figcaption id={`${id}-caption`}><strong>{graph.title}</strong></figcaption>
    <p className={styles.label}>Vertical: {graph.yLabel} ({graph.yUnit}). Horizontal: {graph.xLabel} ({graph.xUnit}).</p>
    <svg viewBox="0 0 400 280" width="400" height="280" style={{ width: "100%", height: "auto", maxWidth: 600 }} role="img" aria-labelledby={`${id}-title ${id}-description`}>
      <title id={`${id}-title`}>{graph.title}: plotted observations</title>
      <desc id={`${id}-description`}>{graph.points.length} separate observations. Horizontal axis: {graph.xLabel} in {graph.xUnit}. Vertical axis: {graph.yLabel} in {graph.yUnit}. All coordinates appear in the data table below. No fitted or interpolated line is shown.</desc>
      <g fill="currentColor" fontSize="16" fontFamily="sans-serif">
        {ticks.map(index => {
          const xv = minX + xRange * index / 4, yv = minY + yRange * index / 4;
          return <g key={index}>
            <line x1={90} y1={y(yv)} x2={370} y2={y(yv)} stroke="currentColor" opacity="0.2" />
            <text x={80} y={y(yv) + 5} textAnchor="end">{tick(yv)}</text>
            <line x1={x(xv)} y1={235} x2={x(xv)} y2={240} stroke="currentColor" />
            <text x={x(xv)} y={263} textAnchor={index === 0 ? "start" : index === 4 ? "end" : "middle"}>{tick(xv)}</text>
          </g>;
        })}
        <path d="M90 25 V235 H370" fill="none" stroke="currentColor" />
        {graph.points.map(point => <circle key={point.x} cx={x(point.x)} cy={y(point.y)} r={5} fill="#d5c4fa" stroke="currentColor" strokeWidth={1} />)}
      </g>
    </svg>
    <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: 720, textAlign: "left" }}>
      <caption style={{ textAlign: "left", paddingBlock: 8 }}>Recorded observations</caption>
      <thead><tr><th scope="col" style={{ padding: 8 }}>{graph.xLabel} ({graph.xUnit})</th><th scope="col" style={{ padding: 8 }}>{graph.yLabel} ({graph.yUnit})</th></tr></thead>
      <tbody>{graph.points.map(point => <tr key={point.x}><th scope="row" style={{ padding: 8, fontWeight: 400 }}>{point.x}</th><td style={{ padding: 8 }}>{point.y}</td></tr>)}</tbody>
    </table>
    <p>{graph.context}</p>
    <p className={styles.label}>The check covers the requested number. A causal explanation needs separate evidence and review.</p>
  </figure>;
}
