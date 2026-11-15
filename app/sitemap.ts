import type { MetadataRoute } from "next";
import { publicAppUrl } from "@/lib/public-site";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = publicAppUrl();
  const lastModified = new Date("2026-08-25T00:00:00.000Z");
  return ["", "/student-control", "/trust"].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
