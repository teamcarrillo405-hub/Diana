import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Diana",
    short_name: "Diana",
    description: "Quiet, structured help with school.",
    id: "/dashboard",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#122019",
    theme_color: "#122019",
    orientation: "any",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/diana-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/diana-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Quick capture", short_name: "Capture", url: "/quick-add", icons: [{ src: "/icons/diana-icon.svg", sizes: "any" }] },
      { name: "New note", short_name: "Note", url: "/notes/new", icons: [{ src: "/icons/diana-icon.svg", sizes: "any" }] },
    ],
    share_target: {
      action: "/api/share-target",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "title",
        text: "text",
        url: "url",
        files: [
          {
            name: "files",
            accept: ["image/*", "application/pdf", "text/plain"],
          },
        ],
      },
    },
  };
}
