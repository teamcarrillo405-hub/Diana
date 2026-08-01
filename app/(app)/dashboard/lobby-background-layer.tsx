import Image from "next/image";

// Kept as a narrow compatibility contract for the existing settings picker.
// The Lobby has one canonical backdrop, so no legacy alternatives can replace
// the current high school composition.
export const LOBBY_BG_STORAGE_KEY = "diana-lobby-bg";
export type LobbyBgKey = "football";
export const LOBBY_BG_OPTIONS = [
  {
    key: "football" as const,
    label: "High school",
    thumb: "/images/today-high-school-clean.jpg",
  },
];

export function isLobbyBgKey(value: string | null): value is LobbyBgKey {
  return value === "football";
}

export function LobbyBackgroundLayer() {
  return (
    <div className="sd-lobby-background" aria-hidden="true">
      <Image
        src="/images/today-high-school-clean.jpg"
        width={1280}
        height={720}
        alt=""
        aria-hidden="true"
        priority
        className="sd-lobby-background-image"
        sizes="100vw"
      />
      <div className="sd-lobby-background-shade" />
    </div>
  );
}
