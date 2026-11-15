import type { MetadataRoute } from "next";
import { publicAppUrl } from "@/lib/public-site";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = publicAppUrl();
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/student-control", "/trust"],
      disallow: ["/api/", "/dashboard", "/assignments", "/settings"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
