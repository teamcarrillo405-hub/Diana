import { SourceMedia } from "@/components/screen-design/source-media";

// Kept as a narrow compatibility contract for the existing settings picker.
// The source-locked Lobby has one canonical backdrop, so no legacy alternatives
// can replace the stadium composition.
export const LOBBY_BG_STORAGE_KEY = "diana-lobby-bg";
export type LobbyBgKey = "football";
export const LOBBY_BG_OPTIONS = [
  {
    key: "football" as const,
    label: "Stadium",
    thumb: "/screendesign/dashboard/stadium-background.jpg",
  },
];

export function isLobbyBgKey(value: string | null): value is LobbyBgKey {
  return value === "football";
}

export function LobbyBackgroundLayer() {
  return (
    <div className="sd-lobby-background" aria-hidden="true">
      <SourceMedia
        assetId="dashboard-stadium-background"
        width={848}
        height={1264}
        decorative
        priority
        className="sd-lobby-background-image"
        sizes="393px"
      />
      <div className="sd-lobby-background-shade" />
    </div>
  );
}
