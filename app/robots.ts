import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://diana.app";
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/student-control", "/trust"],
      disallow: ["/api/", "/dashboard", "/assignments", "/settings"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
