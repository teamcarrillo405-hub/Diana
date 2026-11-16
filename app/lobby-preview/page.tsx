import type { Metadata } from "next";
import { LobbyPreviewContent } from "./preview-content";

export const metadata: Metadata = {
  title: "Lobby design preview",
  description: "A read-only preview of the Diana Lobby using sample data.",
  robots: { index: false, follow: false },
};

/** A design specimen with no student session or live account actions. */
export default function LobbyPreviewPage() {
  return <LobbyPreviewContent />;
}
