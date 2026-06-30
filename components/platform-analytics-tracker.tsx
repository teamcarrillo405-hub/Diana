"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { WEB_VITAL_BUDGETS, type WebVitalName } from "@/lib/platform/analytics";

export function PlatformAnalyticsTracker() {
  const pathname = usePathname();
  const pathRef = useRef(pathname);

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const start = performance.now();
    let sentDuration = false;
    const feature = routeToFeature(pathname);

    postJson("/api/monitoring/event", {
      eventName: "page_view",
      feature,
      route: pathname,
    });

    function flushDuration() {
      if (sentDuration) return;
      sentDuration = true;
      postJson("/api/monitoring/event", {
        eventName: "route_session",
        feature,
        route: pathname,
        durationMs: Math.max(0, Math.round(performance.now() - start)),
      });
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") flushDuration();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", flushDuration);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", flushDuration);
      flushDuration();
    };
  }, [pathname]);

  useReportWebVitals((metric) => {
    const metricName = metric.name.toUpperCase();
    postJson("/api/monitoring/vitals", {
      route: pathRef.current,
      metricName,
      value: metric.value,
      budgetValue: WEB_VITAL_BUDGETS[metricName as WebVitalName] ?? null,
    });
  });

  return null;
}

function postJson(url: string, body: Record<string, unknown>) {
  const payload = JSON.stringify(body);
  if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon(url, blob);
    return;
  }
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

function routeToFeature(route: string): string {
  if (route.startsWith("/assignments")) return "assignments";
  if (route.startsWith("/notes")) return "notes";
  if (route.startsWith("/flashcards")) return "flashcards";
  if (route.startsWith("/timer")) return "timer";
  if (route.startsWith("/calendar")) return "calendar";
  if (route.startsWith("/classes")) return "classes";
  if (route.startsWith("/portfolio")) return "portfolio";
  if (route.startsWith("/wellness")) return "wellness";
  if (route.startsWith("/ap")) return "ap";
  if (route.startsWith("/sharing")) return "sharing_portal";
  if (route.startsWith("/teacher-share")) return "teacher_portal";
  if (route.startsWith("/parent-share")) return "parent_portal";
  if (route.startsWith("/insights")) return "insights";
  if (route.startsWith("/settings")) return "settings";
  return "dashboard";
}
