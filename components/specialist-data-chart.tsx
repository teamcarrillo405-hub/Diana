"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { EChartsType } from "echarts";

import {
  chartSeriesForDataset,
  type DataChartConfig,
  type ImportedDataset,
} from "@/lib/native-tools/data-runtime";
import { activeRuntimeState } from "@/lib/specialist-artifacts/active-state";
import type { SpecialistActiveRuntimeState } from "@/lib/specialist-artifacts/contracts";

type Props = {
  dataset: ImportedDataset;
  config: DataChartConfig;
  onRuntimeStateChange(state: SpecialistActiveRuntimeState): void;
};

export function SpecialistDataChart({ dataset, config, onRuntimeStateChange }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState<EChartsType | null>(null);
  const [message, setMessage] = useState("Loading the local chart renderer...");
  const series = useMemo(
    () => chartSeriesForDataset(dataset, config),
    [config, dataset],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let observer: ResizeObserver | null = null;
    let renderer: EChartsType | null = null;
    onRuntimeStateChange(activeRuntimeState("loading", ["Apache ECharts", "Papa Parse"]));
    void import("echarts").then((echarts) => {
      if (disposed) return;
      const chart = echarts.init(host, undefined, { renderer: "canvas" });
      renderer = chart;
      observer = new ResizeObserver(() => chart.resize());
      observer.observe(host);
      setChart(chart);
      const state = activeRuntimeState(
        "ready",
        ["Apache ECharts", "Papa Parse"],
        "Bounded local CSV and chart tools are ready.",
      );
      onRuntimeStateChange(state);
      setMessage(state.detail ?? "Chart ready.");
    }).catch(() => {
      if (disposed) return;
      const state = activeRuntimeState(
        "unavailable",
        ["Apache ECharts", "Papa Parse"],
        "The chart preview could not start. Imported rows remain editable as text or ink.",
      );
      onRuntimeStateChange(state);
      setMessage(state.detail ?? "Chart preview unavailable.");
    });
    return () => {
      disposed = true;
      observer?.disconnect();
      renderer?.dispose();
      host.replaceChildren();
    };
  }, [onRuntimeStateChange]);

  useEffect(() => {
    if (!chart || chart.isDisposed()) return;
    if (!series) {
      chart.clear();
      return;
    }
    chart.setOption({
      animation: false,
      aria: { enabled: true },
      grid: { left: 56, right: 20, top: 30, bottom: 56 },
      tooltip: { trigger: series.type === "scatter" ? "item" : "axis" },
      xAxis: {
        type: series.xAxisType,
        name: series.xLabel,
        nameLocation: "middle",
        nameGap: 36,
        ...(series.xAxisType === "value" ? { scale: true } : { data: series.categories }),
        axisLabel: { hideOverlap: true },
      },
      yAxis: {
        type: "value",
        name: series.yLabel,
      },
      series: [{
        type: series.type,
        data: series.xAxisType === "value" ? series.points : series.values,
        symbolSize: series.type === "scatter" ? 9 : undefined,
        itemStyle: { color: "#0f766e" },
        lineStyle: { color: "#0f766e", width: 3 },
      }],
    }, { notMerge: true });
  }, [chart, series]);

  return (
    <div className="mt-3">
      <div
        ref={hostRef}
        className="h-[320px] w-full border border-slate-300 bg-white"
        role="img"
        data-x-axis-type={series?.xAxisType}
        aria-label={series ? `${series.type} chart of ${series.yLabel} by ${series.xLabel}` : "Data chart preview"}
      />
      <p className="mb-0 mt-2 text-sm text-slate-700" aria-live="polite">
        {series ? message : config.type === "scatter" ? "Choose numeric columns for both scatter plot axes." : "Choose a numeric column to draw a chart."}
      </p>
    </div>
  );
}
