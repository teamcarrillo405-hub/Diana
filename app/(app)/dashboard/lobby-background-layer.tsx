import Image from "next/image";

// Kept as a narrow compatibility contract for the existing settings picker.
export const LOBBY_BG_STORAGE_KEY = "diana-lobby-bg";
export type LobbyBgKey = "football";
export const LOBBY_BG_OPTIONS = [
  {
    key: "football" as const,
    label: "Gamer high school",
    thumb: "/images/today-gamer-high-school.png",
  },
];

export function isLobbyBgKey(value: string | null): value is LobbyBgKey {
  return value === "football";
}

export function LobbyPageBackground() {
  return (
    <div
      className="today-page-background"
      aria-hidden="true"
      style={{ position: "absolute", inset: 0 }}
    >
      <Image
        src="/images/today-gamer-high-school.png"
        fill
        alt=""
        aria-hidden="true"
        priority
        className="today-page-background-image"
        sizes="(max-width: 900px) 100vw, 1px"
      />
      <div className="today-page-background-wash" />
    </div>
  );
}
