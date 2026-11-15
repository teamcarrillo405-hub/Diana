import type { MetadataRoute } from "next";
import { resolvePublicSiteUrl } from "@/lib/public-site-url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = resolvePublicSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/student-control", "/trust"],
      disallow: ["/api/", "/dashboard", "/assignments", "/settings"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
