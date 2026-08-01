// F15 — ICS (.ics URL feed) fetcher using node-ical.
// Returns NormalizedAssignment[] from VEVENTs with a start date.

import ical from "node-ical";
import type { NormalizedAssignment } from "./types";
import { fetchValidatedUrl, validateOutboundUrl } from "@/lib/security/outbound-url";

export async function validateIcsUrl(url: string): Promise<string> {
  return (await validateOutboundUrl(url)).toString();
}

export async function fetchIcsAssignments(
  url: string,
): Promise<{ items: NormalizedAssignment[]; skipped: number }> {
  const response = await fetchValidatedUrl(url, { headers: { Accept: "text/calendar" } });
  if (!response.ok) throw new Error(`Calendar request returned ${response.status}`);
  const data = await ical.async.parseICS(await response.text());

  const items: NormalizedAssignment[] = [];
  let skipped = 0;

  for (const key of Object.keys(data)) {
    const ev = data[key] as {
      type?: string;
      summary?: string;
      description?: string;
      start?: Date | string;
      uid?: string;
    };
    if (ev.type !== "VEVENT") continue;
    if (!ev.start) {
      skipped += 1;
      continue;
    }
    const startDate = ev.start instanceof Date ? ev.start : new Date(ev.start);
    if (Number.isNaN(startDate.getTime())) {
      skipped += 1;
      continue;
    }
    const isoStart = startDate.toISOString();
    const title = ev.summary?.trim() || "Untitled event";
    const externalId = ev.uid?.trim() || `ics:${title}:${isoStart}`;

    items.push({
      external_id: externalId,
      title,
      description: ev.description ?? null,
      due_at: isoStart,
      external_source: "ics",
    });
  }

  return { items, skipped };
}
