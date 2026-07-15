import { SourceMedia } from "@/components/screen-design/source-media";

export function PlayerPhotoSlot() {
  return (
    <SourceMedia
      assetId="dashboard-athlete-cutout"
      width={848}
      height={1264}
      alt="Young student-athlete ready to begin"
      priority
      className="sd-lobby-athlete"
      sizes="160px"
    />
  );
}
