"use client";

import type { Feature, FeatureCollection, GeoJsonProperties, Geometry, Point } from "geojson";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";

import styles from "@/components/specialist-map-runtime.module.css";
import type { MapMarker } from "@/lib/native-tools/creative";
import { activeRuntimeState } from "@/lib/specialist-artifacts/active-state";
import type { SpecialistActiveRuntimeState } from "@/lib/specialist-artifacts/contracts";

type Props = {
  title: string;
  markers: readonly MapMarker[];
  importedData: FeatureCollection<Geometry, GeoJsonProperties> | null;
  bounds: [number, number, number, number] | null;
  onRuntimeStateChange(state: SpecialistActiveRuntimeState): void;
};

const SOURCE_ID = "student-map-data";

function displayCollection(
  importedData: FeatureCollection<Geometry, GeoJsonProperties> | null,
  markers: readonly MapMarker[],
): FeatureCollection<Geometry, GeoJsonProperties> {
  const markerFeatures: Array<Feature<Point, GeoJsonProperties>> = markers.map((marker) => ({
    type: "Feature",
    id: marker.id,
    properties: { label: marker.label, source: marker.source, kind: "student-marker" },
    geometry: { type: "Point", coordinates: [marker.longitude, marker.latitude] },
  }));
  return {
    type: "FeatureCollection",
    features: [...(importedData?.features ?? []), ...markerFeatures],
  };
}

export function SpecialistMapRuntime({
  title,
  markers,
  importedData,
  bounds,
  onRuntimeStateChange,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const dataRef = useRef<FeatureCollection<Geometry, GeoJsonProperties>>({
    type: "FeatureCollection",
    features: [],
  });
  const [message, setMessage] = useState("Loading the local map renderer...");
  const data = useMemo(
    () => displayCollection(importedData, markers),
    [importedData, markers],
  );
  dataRef.current = data;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const probe = document.createElement("canvas");
    if (!probe.getContext("webgl2") && !probe.getContext("webgl")) {
      const state = activeRuntimeState(
        "unavailable",
        ["MapLibre GL JS", "Turf"],
        "WebGL is not available. Coordinates and imported analysis remain saved.",
      );
      onRuntimeStateChange(state);
      setMessage(state.detail ?? "Map preview unavailable.");
      return;
    }
    let disposed = false;
    onRuntimeStateChange(activeRuntimeState("loading", ["MapLibre GL JS", "Turf"]));
    void import("maplibre-gl").then(({ Map }) => {
      if (disposed) return;
      const map = new Map({
        container: host,
        center: [0, 15],
        zoom: 0.75,
        attributionControl: false,
        renderWorldCopies: false,
        style: {
          version: 8,
          sources: {},
          layers: [{
            id: "background",
            type: "background",
            paint: { "background-color": "#e7eef2" },
          }],
        },
      });
      mapRef.current = map;
      map.on("load", () => {
        if (disposed) return;
        map.addSource(SOURCE_ID, { type: "geojson", data: dataRef.current });
        map.addLayer({
          id: "student-polygons",
          type: "fill",
          source: SOURCE_ID,
          filter: ["==", ["geometry-type"], "Polygon"],
          paint: { "fill-color": "#74c0ff", "fill-opacity": 0.3 },
        });
        map.addLayer({
          id: "student-lines",
          type: "line",
          source: SOURCE_ID,
          filter: ["==", ["geometry-type"], "LineString"],
          paint: { "line-color": "#0f766e", "line-width": 3 },
        });
        map.addLayer({
          id: "student-points",
          type: "circle",
          source: SOURCE_ID,
          filter: ["==", ["geometry-type"], "Point"],
          paint: {
            "circle-color": ["case", ["==", ["get", "kind"], "student-marker"], "#db2777", "#0f172a"],
            "circle-radius": ["case", ["==", ["get", "kind"], "student-marker"], 7, 5],
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          },
        });
        const state = activeRuntimeState(
          "ready",
          ["MapLibre GL JS", "Turf"],
          "Local GeoJSON rendering is ready. Online basemap tiles are not used.",
        );
        onRuntimeStateChange(state);
        setMessage(state.detail ?? "Map ready.");
      });
      map.on("error", () => {
        if (disposed) return;
        const state = activeRuntimeState(
          "limited",
          ["MapLibre GL JS", "Turf"],
          "The interactive preview stopped. Coordinates and analysis remain available.",
        );
        onRuntimeStateChange(state);
        setMessage(state.detail ?? "Map preview limited.");
      });
    }).catch(() => {
      if (disposed) return;
      const state = activeRuntimeState(
        "unavailable",
        ["MapLibre GL JS", "Turf"],
        "The local map renderer could not start. Coordinates and analysis remain saved.",
      );
      onRuntimeStateChange(state);
      setMessage(state.detail ?? "Map preview unavailable.");
    });
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      host.replaceChildren();
    };
  }, [onRuntimeStateChange]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    const source = map.getSource<GeoJSONSource>(SOURCE_ID);
    void source?.setData(data);
    if (bounds) {
      map.fitBounds(
        [[bounds[0], bounds[1]], [bounds[2], bounds[3]]],
        { duration: 0, maxZoom: 13, padding: 42 },
      );
    }
  }, [bounds, data]);

  return (
    <div>
      <div
        ref={hostRef}
        className={`${styles.map} mt-3 h-[320px] border border-slate-300 bg-slate-100`}
        role="img"
        aria-label={title ? `Interactive map: ${title}` : "Interactive student map"}
      />
      <p className="mb-0 mt-2 text-sm text-slate-700" aria-live="polite">{message}</p>
    </div>
  );
}
